'use strict';

// Import external dependencies
const aws = require('aws-sdk');
const pAll = require('p-all');
const pRetry = require('p-retry');

// Import internal dependencies
const coingeckoLib = require('./lib/coingecko');
const bluzelleLib = require('./lib/bluzelle');

module.exports.list = async (event)=> {

  // Get Bluzelle client
  let bluzelleClient;
  try {
    bluzelleClient = await bluzelleLib.init(process.env.PUBLIC_PEM, process.env.PRIVATE_PEM, { log: false });
  } catch (error) {
    // This might happen if the database is not created yet from http://studio.bluzelle.com/, or if the testnest has issues
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

  // Gracefully close and exit
  bluzelleClient.close();
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
    // First save coin info, then save the list, so at frontend we can't get a page without info
    // Save coin info
    await saveCoins(response, currency, bluzelleClient);
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
  return await bluzelleLib.upsert(bluzelleClient, `coin-list:${currency}:page:${page}`, createSummaryList(coins))
}

const saveCoins = async (coins, currency, bluzelleClient) => {
  // Use a Promise.all with concurrency support.
  // Bluzelle seems to be able to handle 50 concurrent requests without issues

  let saveCoin = [];
  coins.forEach((coin) => {
    saveCoin = [
      ...saveCoin,
      // Save both generic coin info and specific market info
      async() => bluzelleLib.upsert(bluzelleClient, `coin-details:${coin.id}`, createGenericInfo(coin)),
      async() => bluzelleLib.upsert(bluzelleClient, `coin-market-details:${coin.id}:${currency}`, createMarketInfo(coin))
    ]
  });

  return await pAll(saveCoin, { concurrency: 100 });
}

/**
 * Create a list leaving only the id
 *
 * @param {array} coinsList
 */
const createSummaryList = (coinsList) => {
  return coinsList.map((coin) => coin.id);
}

/**
 * Create a list leaving only the id
 *
 * @param {array} coinsList
 */
const createMarketInfo = (coin) => {
  return {
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

/**
 * Create a coin leaving only the generic info of a coin, i.e. not related to a specific market
 *
 * @param {object} coin
 */
const createGenericInfo = (coin) => {
  return {
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    last_updated: coin.last_updated,
    image: coin.image,
    circulating_supply: coin.circulating_supply,
    total_supply: coin.total_supply
  };
}
