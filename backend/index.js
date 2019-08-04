const { bluzelleApi, coingeckoApi } = require('./api');

const savePageData = async (pageIndex, data) => {
  await bluzelleApi.saveData(`coin-stats-page-${pageIndex}`, JSON.stringify(data));
};

const saveTotalPageNum = async totalPageNum => {
  await bluzelleApi.saveData(`coin-stats-total-page-num`, totalPageNum.toString());
};

const main = async () => {
  console.time('time cost');
  console.log('data fetching start:');

  const totalPageNum = await coingeckoApi.getTotalPageNum();

  for (let pageIndex = 1; pageIndex <= totalPageNum; pageIndex++) {
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
  await saveTotalPageNum(totalPageNum);

  console.log(`data fetching done.`);
  console.timeEnd('time cost');
};

main()
  .catch(e => console.error(e.message))
  .finally(() => bluzelleApi.close());
