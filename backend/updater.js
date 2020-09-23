'use strict';

// Import external dependencies
const aws = require('aws-sdk');
const pRetry = require('p-retry');
const pMap = require('p-map');

// Import internal dependencies
const coingeckoLib = require('./lib/coingecko');
const bluzelleLib = require('./lib/bluzelle');

module.exports.list = async (event)=> {
  // Get Bluzelle client
  let bluzelleClient;
  try {
    bluzelleClient = await bluzelleLib.init({
      mnemonic: "dish film auto bundle nest hospital arctic giraffe surface afford tribe toe swing flavor outdoor hand slice diesel awesome excess liar impulse trumpet rare",
      chain_id: "bluzelleTestNetPublic-6",
      uuid: "0616d181-bdea-46db-aaba-4b02db6a7285",
      endpoint: "https://client.sentry.testnet.public.bluzelle.com:1319"
    });
  } catch (error) {
    console.error('Error creating Bluzelle client', error);
  }
  if (!bluzelleClient) {
    return;
  }

  // Try to fetch and save all pages
  try {
    // When the lambda is first invocated by AWS, USD market is requested
    // When USD is finished, it calls again this lambda by passing the currency = BTC value
    // This allows the lambda to be executed without incurring in timeouts
    // As many currencies as needed can be added with this method: USD and BTC are only examples
    let currency = 'USD';
    if ('Lambda Event' === event['detail-type']) {
      // This execution round has been invoked by a previous lambda execution
      // Get the currenct from the event and proceed
      currency = event.currency;
      const marketData = await getMarketData(currency);
      await saveMarketData(marketData, currency);
    } else {
      // This execution round has been invoked by AWS, default to currency = USD and proceed
      const marketData = await getMarketData(currency);
      await saveMarketData(marketData, currency);

      const lambda = new aws.Lambda();
      const invocation = lambda.invoke({
        FunctionName: 'cma-list-update',
        InvocationType: 'Event',
        Payload: JSON.stringify({currency: 'BTC', "detail-type": 'Lambda Event'})
      })
      invocation.send();
    }
  } catch (error) {
    console.error(error);
  }

  return;
}

/**
 * Concurrently request all coins data
 *
 * @param {string} currency
 */
const getMarketData = async(currency) => {
  console.log('Start retrieving pages');

  // Get generic coin list
  const genericCoinList = await coingeckoLib.getCoinListPage();

  // Calculate total number of pages needed, based on the amount of coins retrieved for each page
  const totalNumberOfCoins = genericCoinList.length;
  const totalNuberOfPages = Math.ceil(totalNumberOfCoins / coingeckoLib.coinsPerPage);
  console.log(`Found ${totalNumberOfCoins} coins, for a total of ${totalNuberOfPages} pages`);

  // Setup concurrent execution
  let executions = Array.from(Array(totalNuberOfPages));
  executions = executions.map((_, index) => ({
    currency,
    page: index
  }));
  const mapper = async (setupData) =>  await pRetry(() => coingeckoLib.getMarketsPage(setupData.currency, setupData.page), {
    onFailedAttempt: async (error) => {
      console.log(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
      console.log(`${error.response.status}: ${error.response.statusText}`);
		},
    retries: 5
  });

  const marketData = await pMap(executions, mapper, { concurrency : 5});

  console.log('All pages retrieved!');

  return marketData;
}

const saveMarketData = async(marketData, currency) => {
  const preparedMarkedData = marketData.map((data, index) => ({
    key: `coin-list:${currency}:page:${index}`,
    data: prepareDataForInsert(data)
  }));

  return await bluzelleLib.saveData(preparedMarkedData);
}

const prepareDataForInsert = (coin) => {
  return {
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    last_updated: coin.last_updated,
    image: coin.image,
    circulating_supply: coin.circulating_supply,
    total_supply: coin.total_supply,
    market_cap: coin.market_cap,
    current_price: coin.current_price,
    circulating_supply: coin.circulating_supply,
    price_change_percentage_24h: coin.price_change_percentage_24h,
    total_volume: coin.total_volume,
    high_24h: coin.high_24h,
    low_24h: coin.low_24h,
    price_change_24h: coin.price_change_24h,
    price_change_percentage_24h: coin.price_change_percentage_24h,
    market_cap_change_24h: coin.market_cap_change_24h,
    market_cap_change_percentage_24h: coin.market_cap_change_percentage_24h,
    ath: coin.ath,
    ath_change_percentage: coin.ath_change_percentage,
    ath_date: coin.ath_date,
    roi: coin.roi,
    sparkline: coin.sparkline_in_7d
  };
}
