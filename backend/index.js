const { bluzelle } = require('bluzelle');
const phin = require('phin');
const phinGet = phin.defaults({
  method: 'GET',
  parse: 'json',
  timeout: 2000
});

const pageSize = 250;

let bz;

const getTotalPageNum = async () => {
  const result = await phinGet('https://api.coingecko.com/api/v3/global');
  return Math.ceil(result.body.data.active_cryptocurrencies / pageSize);
};

const fetchCoinsData = async pageIndex => {
  try {
    const result = await phinGet(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${pageSize}&page=${pageIndex}&sparkline=false`
    );
    console.log(
      result.body.map(coin => ({
        id: coin.id,
        name: coin.name,
        image: coin.image,
        current_price: coin.current_price,
        market_cap: coin.market_cap,
        price_change_percentage_24h: coin.price_change_percentage_24h,
        market_cap_change_percentage_24h: coin.market_cap_change_percentage_24h
      }))
    );
  } catch (e) {
    console.log(e);
  }
};

const saveToBluzelle = async () => {
  bz = await bluzelle({});

  // await bz.create('myKey', 'myValue');
  //
  console.log('The value of myKey is: ', await bz.read('myKey'));
  //
  // await bz.delete('myKey');
  //
  // console.log('Deleting my* ');
  // await bz.read('myKey');
  //
  // console.log('Deleting my* ');

  bz.close();
};

const main = async () => {
  await saveToBluzelle();

  console.log(await getTotalPageNum());
  // await fetchCoinsData(22);
};

main()
  .catch(e => console.error(e.message))
  .finally(() => bz && bz.close());
