const { bluzelleApi, coingeckoApi } = require('./api');
const { PAGE_SIZE } = require('./constants');

const savePageData = async (pageIndex, data) => {
  await bluzelleApi.saveData(`coin-stats-page-${pageIndex}`, JSON.stringify(data));
};

const saveTotalCoinsCount = async totalCoinsCount => {
  await bluzelleApi.saveData(`coin-stats-total-coins-count`, totalCoinsCount.toString());
};

const main = async () => {
  console.time('time cost');
  console.log('data fetching start:');

  const totalCoinsCount = await coingeckoApi.getTotalCoinsCount();
  const totalPagesNum = Math.ceil(totalCoinsCount / PAGE_SIZE);

  for (let pageIndex = 1; pageIndex <= totalPagesNum; pageIndex++) {
    process.stdout.write(`fetching data for page ${pageIndex}...`);
    try {
      const data = await coingeckoApi.getCoinDataPerPage(pageIndex);
      await savePageData(pageIndex, data);
      process.stdout.write('success\n');
    } catch (e) {
      process.stdout.write('fail\n');
      console.log(e);
      throw e;
    }
  }
  await saveTotalCoinsCount(totalCoinsCount);

  console.log(`data fetching done.`);
  console.timeEnd('time cost');
};

main()
  .catch(e => console.error(e.message))
  .finally(() => bluzelleApi.close());
