'use strict';

// Import external dependencies
const aws = require('aws-sdk');
const pRetry = require('p-retry');

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
      await getAndSaveAllMarkets(currency, bluzelleClient);
    } else {
      // This execution round has been invoked by AWS, default to currency = USD and proceed
      await getAndSaveAllMarkets('USD', bluzelleClient);

      const lambda = new aws.Lambda();
      lambda.invoke({
        FunctionName: 'cma-list-update',
        InvocationType: 'Event',
        Payload: JSON.stringify({currency: 'BTC', "detail-type": 'Lambda Event'})
      })
    }
  } catch (error) {
    console.error(error);
  }

  return;
}

/**
 * Main method to get and save all markets
 *
 * @param {string} currency
 * @param {object} bluzelleClient
 */
const getAndSaveAllMarkets = async(currency, bluzelleClient) => {
  return await getAndSaveMarkets(currency, 1, bluzelleClient);
}

/**
 * Recursively get the page and save it to db
 *
 * @param {string} currency
 * @param {number} page
 * @param {object} bluzelleClient
 */
const getAndSaveMarkets = async(currency, page = 1, bluzelleClient) => {
  console.log('getAndSaveMarkets:  ', currency, page);

  // Get the page
  const response = await pRetry(() => coingeckoLib.getMarketsPage(currency, page), { retries: 5 });

  // Process content if present, otherwise we're done
  if (response.length > 0) {
    // Save list
    await saveMarketPage(response, currency, page, bluzelleClient);
    // Recursively process next page
    return await getAndSaveMarkets(currency, page + 1, bluzelleClient);
  }
  return;
}

/**
 * Save the page (list of coins) to Bluzelle
 * In case of errors (i.e. timeout, network errors), retry max 5 times
 *
 * @param {array} coins
 * @param {string} currency
 * @param {number} page
 * @param {object} bluzelleClient
 */
const saveMarketPage = async (coins, currency, page, bluzelleClient) => {
  return await bluzelleLib.upsert(bluzelleClient, `coin-list:${currency}:page:${page}`, coins.map((coin) => prepareDataForInsert(coin)));
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
