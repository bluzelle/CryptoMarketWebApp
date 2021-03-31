'use strict';

/**
 * These are helpers methods to use Coingecko API
 * It adds a very simple abstraction to get the page
 */

const axios = require('axios');
const axiosRetry = require('axios-retry');
axiosRetry(axios, {
  retries: 5,
  retryDelay: (retryCount, error) => {
    if (error && error.response && error.response.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      console.log('retryAfter', retryAfter);
      if (retryAfter) {
        return retryAfter * 1000;
      }
    }
    return axiosRetry.exponentialDelay(retryCount, error);
  },
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.response.status === 429
  },
  shouldResetTimeout: true
});

const delay = require('delay');


const coingeckoBaseUrl = 'https://api.coingecko.com/api/v3';
const coinsPerPage = 50;

/**
 * Calls the /coins/markets endpoint using the provided currency and page
 *
 * @param {string} currency
 * @param {number} page
 */
const getMarketsPage = async (currency = 'USD', page = 1) => {
  await delay.range(3000, 6000);
  console.log(`Requesting page ${page}`);
  const { data } = await axios.get(`${coingeckoBaseUrl}/coins/markets?vs_currency=${currency}&order=market_cap_desc&per_page=${coinsPerPage}&page=${page}&sparkline=true`);
  console.log(`Request for page ${page} completed`);
  return data;
}

/**
 * Calls the /coins/list endpoint
 */
const getCoinListPage = async () => {
  const { data } = await axios.get(`${coingeckoBaseUrl}/coins/list`);
  return data;
}

module.exports = {
  coinsPerPage,
  getCoinListPage,
  getMarketsPage
}
