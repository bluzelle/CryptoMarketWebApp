import "../sass/styles.scss";

const Chart = require('chart.js');

// Require promise utilities
const pAll = require('p-all');
const pMap = require('p-map');

// Require Bluzelle
const BluzelleHelper = require('./bluzelle-helper');

// Require SortableTable
const TableHelper = require('./table-helper');

// Bluzelle keys
const blzPublicKey = 'MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEn1zESCHd7tLD0OQ8SQz1bqlhGdbo1/XtwE4eNIwzMEE25YLSMzc7zh306e4+mXpK+j10Sozqx0V9VUEuW+kaJw==';
const blzPrivateKey = 'MHQCAQEEIMQCcNKBybe6Swz/MJuDQe7HpvMbGP8qjx555I5BBnytoAcGBSuBBAAKoUQDQgAEn1zESCHd7tLD0OQ8SQz1bqlhGdbo1/XtwE4eNIwzMEE25YLSMzc7zh306e4+mXpK+j10Sozqx0V9VUEuW+kaJw==';
let blzClient;

// Keep all the generic info "cached". In this way when a coin is shown more than once
// (i.e. back and forth in the pagination, change from pagination to view all and back)
// we don't request its generic info every time
const coinGenericInfo = {};

// Config for sparkline chart
const sparklineOptions = {
  legend: {
    display: false
  },
  elements: {
    line: {
      backgroundColor: 'rgba(0,0,0,0)',
      borderColor: '#EEC64F',
      borderWidth: 1
    },
    point: {
      radius: 0
    }
  },
  tooltips: {
    enabled: false
  },
  scales: {
    yAxes: [
      {
        display: false
      }
    ],
    xAxes: [
      {
        display: false
      }
    ]
  }
}

// Formatter for numbers
const numberFormatter = new Intl.NumberFormat('en-US', {
  style: 'decimal'
});

let page = 0;
let currency;
let currencySymbol = {
  usd: '$',
  btc: 'BTC'
}
let viewAll = false;

const loadPage = async(rowsWrapper, selectedPage, selectedCurrency) => {
  // Empty table
  TableHelper.emptyRows(rowsWrapper);

  // Load coin list
  let coinListPage = await BluzelleHelper.read(blzClient, `coin-list:${selectedCurrency}:page:${selectedPage}`);
  coinListPage = JSON.parse(coinListPage);
  coinListPage = coinListPage.map((coin, index) => ({
    coinId: coin,
    index: viewAll ? 100 * (selectedPage - 1) + index + 1 : index + 1,
    page: selectedPage,
    currency: selectedCurrency,
    currencySymbol: currencySymbol[selectedCurrency]
  }));
  // Adjust number of rows in table based on response
  TableHelper.adjustRows(rowsWrapper, coinListPage.length, viewAll);

  if (selectedPage === 1) {
    document.querySelectorAll('.prev-page-btn').forEach((element) => {
      element.classList.add('hide-btn');
    });
  } else {
    document.querySelectorAll('.prev-page-btn').forEach((element) => {
      element.classList.remove('hide-btn');
    });

    if (coinListPage.length < 100) {
      document.querySelectorAll('.next-page-btn').forEach((element) => {
        element.classList.add('hide-btn');
      });
    }
  }

  // Limit concurrency based on network speed (when available)
  let concurrency = getConcurrencyForNetworkSpeed() || 3;

  return await pMap(coinListPage, async(item) => {
    // Wait for both requests (market info and generic info) to complete before updating the table row
    const content = await pAll([
      // Get generic coin info
      async () => {
        if (page !== item.page || currency !== item.currency) {
          // If page or currency is changed, short circuit this with a no-op
          // If page or currency is different, it means that the user has either changed the page or the currency while this was loading
          // We don't need to do anything else as the content would be discarded anyway, or worst overwrite the correct one
          return;
        }

        console.log(`Reading coin-details:${item.coinId}`);
        // Used "cached" version for the generic info if available
        if (coinGenericInfo[item.coinId]) {
          return coinGenericInfo[item.coinId];
        } else {
          try {
            let genericInfo = await BluzelleHelper.read(blzClient, `coin-details:${item.coinId}`);
            genericInfo = JSON.parse(genericInfo);
            // Save info so we don't need to load it multiple times
            coinGenericInfo[item.coinId] = genericInfo;
            return genericInfo;
          } catch (error) {
            console.error(`Error reading coin-details:${item.coinId}`, error);
          }
        }
      },
      // Get market coin info
      async () => {
        if (page !== item.page || currency !== item.currency) {
          // If page or currency is changed, short circuit this with a no-op
          // If page or currency is different, it means that the user has either changed the page or the currency while this was loading
          // We don't need to do anything else as the content would be discarded anyway, or worst overwrite the correct one
          return;
        }

        console.log(`Reading coin-market-details:${item.coinId}:${selectedCurrency}`);
        try {
          let marketInfo = await BluzelleHelper.read(blzClient, `coin-market-details:${item.coinId}:${selectedCurrency}`);
          return JSON.parse(marketInfo);
        } catch (error) {
          console.error(`Error reading coin-details:${item.coinId}`, error);
        }
      }
    ]);

    // Fill row with content
    const [genericInfo, marketInfo] = content;
    if (genericInfo && marketInfo && page === item.page && currency === item.currency) {
      const row = rowsWrapper.querySelector(`tr:nth-child(${item.index})`);
      fillRow(row, genericInfo, marketInfo, item.currencySymbol);
    }
  }, { concurrency: concurrency });
}

const fillRow = (row, genericInfo, marketInfo, currencySymbol) => {
  row.children[1].innerHTML = `<img src="${genericInfo.image}" alt="${genericInfo.name}" width="16" height="16" class="coin-image"/> ${genericInfo.name}`;
  row.children[2].textContent = `${currencySymbol}${numberFormatter.format(marketInfo.market_cap)}`;
  row.children[3].textContent = `${currencySymbol}${numberFormatter.format(marketInfo.current_price)}`;
  row.children[4].textContent = `${currencySymbol}${numberFormatter.format(marketInfo.total_volume)}`;
  row.children[5].textContent = `${numberFormatter.format(genericInfo.circulating_supply)} ${genericInfo.symbol.toUpperCase()}`;
  row.children[6].textContent = `${numberFormatter.format(marketInfo.price_change_percentage_24h.toFixed(2))}%`;
  row.children[6].classList.add(marketInfo.price_change_percentage_24h >= 0 ? 'positive-change' : 'negative-change');

  const graphCanvas = document.createElement('canvas');
  graphCanvas.id = `sparkline-${genericInfo.id}`;
  graphCanvas.width = 166;
  graphCanvas.height = 50;
  graphCanvas.classList.add('sparkline');
  row.children[7].innerHTML = '';
  row.children[7].appendChild(graphCanvas);

  const ctx = graphCanvas.getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: marketInfo.sparkline.price.map(() => ''),
      datasets: [{
        data: marketInfo.sparkline.price
      }]
    },
    options: sparklineOptions
  });
}

const getConcurrencyForNetworkSpeed = () => {
  let concurrency;
  if (navigator && navigator.connection && navigator.connection.rtt) {
    if (navigator.connection.rtt < 50) {
      concurrency = 20;
    } else if (navigator.connection.rtt < 100) {
      concurrency = 15;
    } else if (navigator.connection.rtt >= 100 && navigator.connection.rtt < 300) {
      concurrency = 5;
    } else if (navigator.connection.rtt >= 300 && navigator.connection.rtt < 600) {
      concurrency = 2;
    } else {
      concurrency = 1;
    }
  }

  return concurrency;
}

const loadFirstPage = async(rowsWrapper, currency) => {
  page = 0;
  document.querySelectorAll('.paginate-btn, .prev-page-btn').forEach((element) => {
    element.classList.add('hide-btn');
  });
  document.querySelectorAll('.view-all-btn, .next-page-btn').forEach((element) => {
    element.classList.remove('hide-btn');
  });

  await nextPage(rowsWrapper, currency);
}

const previousPage = async (rowsWrapper, currency) => {
  if (page >= 2) {
    page = page - 1;
    viewAll = false;
    await loadPage(rowsWrapper, page, currency);
  }
}

const nextPage = async (rowsWrapper, currency) => {
  page = page + 1;
  viewAll = false;
  await loadPage(rowsWrapper, page, currency);
}

const loadAllPages = async (rowsWrapper, currency) => {
  viewAll = true;
  TableHelper.adjustRows(rowsWrapper, 0, viewAll);
  document.querySelectorAll('.paginate-btn').forEach((element) => {
    element.classList.remove('hide-btn');
  });
  document.querySelectorAll('.view-all-btn, .prev-page-btn, .next-page-btn').forEach((element) => {
    element.classList.add('hide-btn');
  });

  page = 0;
  try {
    while (result = await nextPage(rowsWrapper, currency), result.length === 100, viewAll, currency === currency) {
      console.log('loading next page');
    }
  } catch (error) {
    console.error(error);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  const coinsTable = document.querySelector('#coins-list-table');
  const rowsWrapper = coinsTable.querySelector('tbody');

  // Setup table (mostly for UI reasons)
  TableHelper.adjustRows(rowsWrapper, 100, false);

  // Init Bluzelle
  try {
    blzClient = await BluzelleHelper.init(blzPublicKey, blzPrivateKey, {});
  } catch (error) {
    if (error.toString().includes('legacy access request rate exceeded')) {
      alert('Bluzelle returned error: legacy access request rate exceeded. Please wait some seconds then reload the page.');
    }
    if (error.toString().includes('UUID')) {
      alert('Bluzelle returned error: ', error);
    }
  }

  if (!blzClient) {
    return;
  }

  // Bind prev, next and view all buttons
  document.querySelectorAll('.prev-page-btn').forEach((element) => {
    element.addEventListener('click', async() => {
      previousPage(rowsWrapper, currency);
    })
  });
  document.querySelectorAll('.next-page-btn').forEach((element) => {
    element.addEventListener('click', async() => {
      nextPage(rowsWrapper, currency);
    })
  });
  document.querySelectorAll('.view-all-btn').forEach((element) => {
    element.addEventListener('click', async() => {
      loadAllPages(rowsWrapper, currency);
    });
  });
  document.querySelectorAll('.paginate-btn').forEach((element) => {
    element.addEventListener('click', async() => {
      loadFirstPage(rowsWrapper, currency);
    });
  });
  document.querySelectorAll('.currency-selector').forEach((element) => {
    element.addEventListener('change', async(event) => {
      currency = event.currentTarget.value;
      if (viewAll) {
        // Reload al pages with updated currency
        loadAllPages(rowsWrapper, currency);
      } else {
        // Reload current page with updated currency
        loadPage(rowsWrapper, page, currency);
      }
    });
  });

  // Get starting currency
  currency = document.querySelector('.currency-selector').value;

  // Get list for page 1 in given currency
  nextPage(rowsWrapper, currency);
});
