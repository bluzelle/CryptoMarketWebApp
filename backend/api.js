const phin = require('phin');
const retry = require('async-retry');
const { bluzelle } = require('bluzelle');
const { BLUZELLE_ERROR_MSG, PAGE_SIZE } = require('./constants');

const phinGet = phin.defaults({
  method: 'GET',
  parse: 'json',
  timeout: 2000
});

let bz;

const bluzelleApi = {
  saveData: async (key, data) => {
    bz =
      bz ||
      (await bluzelle({
        public_pem:
          'MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEe6YKttmeSYmGA98SFp7pXfgNu1upuLkpkt0Eig1Qx9aoZIJMbY/TZDkuhbRmH11sZzsZfozDrqSu23Gl9jSiiA==',
        private_pem: ''
      }));
    return await retry(
      async () => {
        try {
          return await bz.create(key, data);
        } catch (e) {
          if (e.message === BLUZELLE_ERROR_MSG.RECORD_EXISTS) {
            return await bz.update(key, data);
          } else {
            throw e;
          }
        }
      },
      {
        retries: 3
      }
    );
  },
  close: async () => bz && (await bz.close())
};

const coingeckoApi = {
  getTotalCoinsCount: async () =>
    await retry(
      async () => {
        const result = await phinGet('https://api.coingecko.com/api/v3/global');
        return result.body.data.active_cryptocurrencies;
      },
      {
        retries: 3
      }
    ),
  getCoinDataPerPage: async pageIndex =>
    (await retry(
      async () => {
        const result = await phinGet(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${PAGE_SIZE}&page=${pageIndex}&sparkline=true`
        );
        return result;
      },
      {
        retries: 3
      }
    )).body.map(coin => ({
      id: coin.id,
      name: coin.name,
      image: coin.image,
      symbol: coin.symbol,
      totalVolume: coin.total_volume,
      currentPrice: coin.current_price,
      marketCap: coin.market_cap,
      priceChangePercentage24h: coin.price_change_percentage_24h,
      marketCapChangePercentage24h: coin.market_cap_change_percentage_24h,
      circulatingSupply: coin.circulating_supply,
      priceSparkLine7d: coin.sparkline_in_7d.price.filter((price, index) => index % 24 === 0)
    }))
};

module.exports = {
  bluzelleApi,
  coingeckoApi
};
