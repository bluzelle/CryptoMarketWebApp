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

// Match currency with its symbol
const currencySymbol = {
  usd: '$',
  btc: 'BTC'
}

// Current page
let page = 0;
// Current currency
let currency;
// It's a view all?
let viewAll = false;

/**
 * Loads the page from the given page and currency from Bluzelle DB
 * Then retrieves all the coin info and, after receiving both, fill the row with info
 *
 * @param {object} rowsWrapper
 * @param {number} selectedPage
 * @param {string} selectedCurrency
 */
const loadPage = async(rowsWrapper, selectedPage, selectedCurrency) => {
  // Empty table
  TableHelper.emptyRows(rowsWrapper);

  // Load coin list
  let coinListPage = await BluzelleHelper.read(blzClient, `coin-list:${selectedCurrency}:page:${selectedPage}`);
  coinListPage = JSON.parse(coinListPage);
  // Create an object with index and page info
  coinListPage = coinListPage.map((coin, index) => ({
    coinId: coin,
    index: viewAll ? 100 * (selectedPage - 1) + index + 1 : index + 1,
    page: selectedPage,
    currency: selectedCurrency,
    currencySymbol: currencySymbol[selectedCurrency]
  }));
  // Adjust number of rows in table based on response
  TableHelper.adjustRows(rowsWrapper, coinListPage.length, viewAll);

  // Handle UI adjustments based on page and results total
  if (selectedPage === 1) {
    // Hide prev button if this is the first page
    document.querySelectorAll('.prev-page-btn').forEach((element) => {
      element.classList.add('hide-btn');
    });
  } else {
    // Show prev button when page is the second or more
    document.querySelectorAll('.prev-page-btn').forEach((element) => {
      element.classList.remove('hide-btn');
    });

    // Hide the next button at the end of the coins list
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

/**
 * Fill the given row with the data of a coin
 *
 * @param {object} row
 * @param {object} genericInfo
 * @param {object} marketInfo
 * @param {string} currencySymbol
 */
const fillRow = (row, genericInfo, marketInfo, currencySymbol) => {
  // Image and name
  row.children[1].innerHTML = `<img src="${genericInfo.image}" alt="${genericInfo.name}" width="16" height="16" class="coin-image"/> ${genericInfo.name}`;
  // Market cap
  row.children[2].textContent = `${currencySymbol}${numberFormatter.format(marketInfo.market_cap)}`;
  // Current price
  row.children[3].textContent = `${currencySymbol}${numberFormatter.format(marketInfo.current_price)}`;
  // Total volume
  row.children[4].textContent = `${currencySymbol}${numberFormatter.format(marketInfo.total_volume)}`;
  // Circulating supply
  row.children[5].textContent = `${numberFormatter.format(genericInfo.circulating_supply)} ${genericInfo.symbol.toUpperCase()}`;
  // 24h % change
  row.children[6].textContent = `${numberFormatter.format(marketInfo.price_change_percentage_24h.toFixed(2))}%`;
  // Set green or red color to 24h change
  row.children[6].classList.add(marketInfo.price_change_percentage_24h >= 0 ? 'positive-change' : 'negative-change');

  // Create the spark line graph
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

/**
 * Tries a network optimization based on the rtt (which seems more reliable than downlink)
 * Based on the rtt, set the concurrency accordingly
 */
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

/* Methods to load pages */

/**
 * Handler to load the first page
 *
 * @param {object} rowsWrapper
 * @param {number} currency
 */
const loadFirstPage = async(rowsWrapper, currency) => {
  // Reset page
  page = 0;

  // Hide and show pagination buttons for first page
  document.querySelectorAll('.paginate-btn, .prev-page-btn').forEach((element) => {
    element.classList.add('hide-btn');
  });
  document.querySelectorAll('.view-all-btn, .next-page-btn').forEach((element) => {
    element.classList.remove('hide-btn');
  });

  // Load page
  await nextPage(rowsWrapper, currency);
}

/**
 * Handler to load previous page
 *
 * @param {object} rowsWrapper
 * @param {number} currency
 */
const previousPage = async (rowsWrapper, currency) => {
  if (page >= 2) {
    page = page - 1;
    viewAll = false;
    await loadPage(rowsWrapper, page, currency);
  }
}

/**
 * Handler to load next page
 *
 * @param {object} rowsWrapper
 * @param {number} currency
 */
const nextPage = async (rowsWrapper, currency) => {
  page = page + 1;
  viewAll = false;
  await loadPage(rowsWrapper, page, currency);
}

/**
 * Handler to start loading all pages
 *
 * @param {object} rowsWrapper
 * @param {string} currency
 */
const loadAllPages = async (rowsWrapper, currency) => {
  viewAll = true;
  TableHelper.adjustRows(rowsWrapper, 0, viewAll);

  // Hide and show pagination buttons for first page
  document.querySelectorAll('.paginate-btn').forEach((element) => {
    element.classList.remove('hide-btn');
  });
  document.querySelectorAll('.view-all-btn, .prev-page-btn, .next-page-btn').forEach((element) => {
    element.classList.add('hide-btn');
  });

  // Reset page and load pages
  // If viewAll or currency are updated, this will stop loading further pages
  page = 0;
  try {
    while (result = await nextPage(rowsWrapper, currency), result && result.length === 100, viewAll, currency === currency) {
      console.log('loading next page');
    }
  } catch (error) {
    console.error(error);
  }
}

// Handler fired at page load
document.addEventListener('DOMContentLoaded', async () => {
  // Get DOM elements
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
    } else if (error.toString().includes('UUID does not exist in the Bluzelle swarm')) {
      alert('Bluzelle returned error: UUID does not exist in the Bluzelle swarm, but it should. Please recreate it with the given keys');
    } else {
      alert(error.toString());
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
  // Bind currency select
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
