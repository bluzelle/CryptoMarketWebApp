'use strict';

// Import external dependencies
const aws = require('aws-sdk');
const axios = require('axios');
const pRetry = require('p-retry');
const pMap = require('p-map');
const sharp = require('sharp');

// Import internal dependencies
const coingeckoLib = require('./lib/coingecko');
const bluzelleLib = require('./lib/bluzelle');

let bluzelleClient;

module.exports.list = async (event)=> {
  // Get Bluzelle client

  const bzConfig = {
    mnemonic: process.env.mnemonic,
    uuid: process.env.uuid,
    endpoint: process.env.endpoint
  }

  try {
    bluzelleClient = bluzelleClient || await bluzelleLib.init(bzConfig);
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
      // Get the currency from the event and proceed
      currency = event.currency;
    }
    console.log(`Starting with currency ${currency}`);

    const marketData = await getMarketData(currency);
    if (!marketData) {
      return;
    }

    await saveMarketData(marketData, currency);

    // Check if all logos are present and download them in case
    let icons = marketData.map((page) => {
      return page.map((coinInfo) => ({
        id: coinInfo.id,
        image: coinInfo.image
      }));
    });
    icons = icons.reduce((acc, curr) => acc.concat(curr), []);
    icons = await getAllMissingIcons(icons);
    if (icons && icons.length) {
      await saveAllIcons(icons);
    }

    if ('Lambda Event' !== event['detail-type']) {
      console.log('Update completed, now update BTC currency');

      const lambda = new aws.Lambda();
      const invocation = lambda.invoke({
        FunctionName: 'cma-list-update',
        InvocationType: 'Event',
        Payload: JSON.stringify({currency: 'BTC', "detail-type": 'Lambda Event'})
      });

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

  let bnt = await bluzelleClient.getBNT();
  console.log('BNT', bnt);
  bnt = bnt * 1000000; // Convert bnt to ubnt

  if (bnt < bluzelleLib.maxGas * 0.002 * totalNuberOfPages) {
    console.log('Notice: insufficient funds');
    return;
  }

  // Setup concurrent execution
  let executions = Array.from(Array(totalNuberOfPages));
  executions = executions.map((_, index) => ({
    currency,
    page: index + 1
  }));
  const mapper = async (setupData) =>  await pRetry(() => coingeckoLib.getMarketsPage(setupData.currency, setupData.page), {
    onFailedAttempt: async (error) => {
      console.log(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
      if (error.response) {
        console.log(`${error.response.status}: ${error.response.statusText}`);
      }
		},
    retries: 5
  });

  let marketData = await pMap(executions, mapper, { concurrency : 5});
  console.log('All pages retrieved!');

  return marketData;
}

const saveMarketData = async(marketData, currency) => {
  const preparedMarkedData = marketData.map((data, index) => ({
    key: `coin-list:${currency}:page:${index + 1}`,
    data: data.map((coin) => prepareDataForInsert(coin))
  }));

  // Need to batch 3 pages for transaction, to avoid hitting the size limit
  const batchSize = 3;
  const batches = Math.ceil(marketData.length / batchSize);
  console.log(`Need to save ${batches} batches`);

  let batch = 0;
  while(batch < batches) {
    const batchStart = batch * batchSize;
    const batchEnd = Math.min(batchStart + batchSize, preparedMarkedData.length);
    console.log(`Saving batch #${batch}, from index ${batchStart} to index ${batchEnd}`);
    await bluzelleLib.saveData(preparedMarkedData.slice(batchStart, batchEnd));
    console.log(`Batch #${batch} saved`);
    batch++;
  }

  // Look for Bluzelle Coin Info
  let bluzelleCoinInfo = preparedMarkedData.find((page) => page.data.find((coin) => coin.id === 'bluzelle'));
  if (bluzelleCoinInfo) {
    bluzelleCoinInfo = bluzelleCoinInfo.data.find((coin) => coin.id === 'bluzelle');
    await bluzelleLib.upsert(`coin-details:${currency}:bluzelle`, bluzelleCoinInfo);
  }

  //return await bluzelleLib.saveData(preparedMarkedData);
  return;
}

const getAllMissingIcons = async(icons) => {
  console.log('Start retrieving icons');

  const allKeys = await bluzelleClient.keys();
  const iconKeys = allKeys.filter((key) => key.includes('coin-icon:'));
  const missingIcons = [];
  icons.forEach((icon) => {
    if (!iconKeys.includes(`coin-icon:${icon.id}`) && icon.image.indexOf('http') === 0) {
      missingIcons.push(icon);
    }
  });
  console.log('Number of missing icons', missingIcons.length);

  if (missingIcons.length) {
    const mapper = async(iconInfo) => await pRetry(async () => {
      console.log(`Downloading icon ${iconInfo.image}`);
      let image = await axios.get(iconInfo.image, { responseType: 'arraybuffer' });
      let imageB64 = await sharp(Buffer.from(image.data))
                      .resize(120, 120)
                      .toBuffer();

      return {
        id: iconInfo.id,
        data: imageB64.toString('base64')
      };
    }, {
      onFailedAttempt: async (error) => {
        console.log(error);
        console.log(`Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
        if (error.response) {
          console.log(`${error.response.status}: ${error.response.statusText}`);
        }
      },
      retries: 5
    });

    let b64Images = await pMap(missingIcons, mapper, { concurrency : 5});
    console.log('All icons retrieved!');

    return b64Images;
  }
}

const saveAllIcons = async(icons) => {
  const preparedIicons = icons.map((icon) => ({
    key: `coin-icon:${icon.id}`,
    data: icon.data
  }));

  // Try to batch 20 icons for transaction, to avoid hitting the size limit
  const batchSize = 20;
  const batches = Math.ceil(preparedIicons.length / batchSize);
  console.log(`Need to save ${batches} batches`);

  let batch = 0;
  while(batch < batches) {
    const batchStart = batch * batchSize;
    const batchEnd = batchStart + batchSize;
    console.log(`Saving batch #${batch}, from index ${batchStart} to index ${batchEnd}`);

    // Don't stop execution for an error with images
    try {
      await bluzelleLib.saveData(preparedIicons.slice(batchStart, batchEnd));
      console.log(`Batch #${batch} saved`);
    } catch (error) {
      console.log(error);
      console.log(`Batch #${batch} not saved`);
    }

    batch++;
  }

  /* for (let i=0; i<preparedIicons.length; i++) {
    // Don't stop execution for an error with images
    try {
      await bluzelleLib.upsert(preparedIicons[i].key, preparedIicons[i].data);
      console.log(`Icon #${preparedIicons[i].key} saved`);
    } catch (error) {
      console.log(error);
      console.log(`Batch #${preparedIicons[i].key} not saved`);
    }
  } */

  return;
}

const prepareDataForInsert = (coin) => {
  return {
    id: coin.id,
    symbol: coin.symbol,
    name: coin.name,
    last_updated: coin.last_updated,
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
