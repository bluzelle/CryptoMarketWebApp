const phin = require('phin');
const retry = require('async-retry');
const { bluzelle } = require('bluzelle');
const { BLUZELLE_ERROR_MSG } = require('./constants');

const phinGet = phin.defaults({
  method: 'GET',
  parse: 'json',
  timeout: 2000
});

const pageSize = 250;

let bz;

const bluzelleApi = {
  saveData: async (key, data) => {
    bz =
      bz ||
      (await bluzelle({
        public_pem:
          'MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEYCOXjHoBZT25L1GDGHZQ2FtHv/xonzyQvPwV9NUdyCtKImkQXCyG6E1HX/TGV0X9ZNc5L475QsdxYGgjQBUPuQ==',
        private_pem:
          'MHQCAQEEIEbjGWLVopU4v3P1FZOr+VBxXFvXyCO2Y35oXR7APQHGoAcGBSuBBAAKoUQDQgAEYCOXjHoBZT25L1GDGHZQ2FtHv/xonzyQvPwV9NUdyCtKImkQXCyG6E1HX/TGV0X9ZNc5L475QsdxYGgjQBUPuQ=='
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
  getTotalPageNum: async () =>
    await retry(
      async () => {
        const result = await phinGet('https://api.coingecko.com/api/v3/global');
        return Math.ceil(result.body.data.active_cryptocurrencies / pageSize);
      },
      {
        retries: 3
      }
    ),
  getCoinDataPerPage: async pageIndex =>
    (await retry(
      async () => {
        const result = await phinGet(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${pageSize}&page=${pageIndex}&sparkline=false`
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
      current_price: coin.current_price,
      market_cap: coin.market_cap,
      price_change_percentage_24h: coin.price_change_percentage_24h,
      market_cap_change_percentage_24h: coin.market_cap_change_percentage_24h
    }))
};

module.exports = {
  bluzelleApi,
  coingeckoApi
};
