var cron = require('node-cron');

const { bluzelleApi, coingeckoApi } = require('./api');
const { PAGE_SIZE } = require('./constants');

const savePageData = async (pageIndex, data) => {
  await bluzelleApi.saveData(`coin-stats-page-${pageIndex}`, JSON.stringify(data));
};

const saveTotalCoinsCount = async totalCoinsCount => {
  await bluzelleApi.saveData(`coin-stats-total-coins-count`, totalCoinsCount.toString());
};

const main = async () => {
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
};

const isProd = process.env.PROD || false;
const cronSchedule = process.env.CRON_SCHEDULE || '*/5 * * * *';

if (isProd) {
  cron.schedule(cronSchedule, () => {
    console.time('time cost');
    console.log(`[${new Date().toString()}] data fetching start:`);
    main()
      .catch(e => console.error(e.message))
      .finally(() => {
        console.log(`data fetching done.`);
        console.timeEnd('time cost');
      });
  });
} else {
  main()
    .catch(e => console.error(e.message))
    .finally(() => {
      bluzelleApi.close();
    });
}
