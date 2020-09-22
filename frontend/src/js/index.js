import "../sass/styles.scss";

const Chart = require('chart.js');

// Require promise utilities
const pAll = require('p-all');
const pMap = require('p-map');

// Require Bluzelle
const BluzelleHelper = require('./bluzelle-helper');

// Require SortableTable
const TableHelper = require('./table-helper');

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
  if (!viewAll) {
    TableHelper.emptyRows(rowsWrapper);
  }

  // Load coin list
  let coinListPage = await BluzelleHelper.read(blzClient, `coin-list:${selectedCurrency}:page:${selectedPage}`);
  coinListPage = JSON.parse(coinListPage);
  // Create an object with index and page info
  coinListPage = coinListPage.map((coin, index) => ({
    coin: coin,
    index: viewAll ? 50 * (selectedPage - 1) + index + 1 : index + 1,
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
    if (coinListPage.length < 50) {
      document.querySelectorAll('.next-page-btn').forEach((element) => {
        element.classList.add('hide-btn');
      });
    }
  }

  // Fill row with content
  coinListPage.forEach((item) => {
    if (page === item.page && currency === item.currency) {
      const row = rowsWrapper.querySelector(`tr:nth-child(${item.index})`);
      fillRow(row, item.coin, item.currencySymbol);
    }
  });
}

/**
 * Fill the given row with the data of a coin
 *
 * @param {object} row
 * @param {object} coinInfo
 * @param {string} currencySymbol
 */
const fillRow = (row, coinInfo, currencySymbol) => {
  // Image and name
  row.children[1].innerHTML = `<img src="${coinInfo.image}" alt="${coinInfo.name}" width="16" height="16" class="coin-image"/> ${coinInfo.name}`;
  // Market cap
  if (coinInfo.market_cap || coinInfo.market_cap === 0) {
    row.children[2].textContent = `${currencySymbol}${numberFormatter.format(coinInfo.market_cap)}`;
  } else {
    row.children[2].textContent = '?';
  }

  // Current price
  if (coinInfo.current_price || coinInfo.current_price === 0) {
    row.children[3].textContent = `${currencySymbol}${numberFormatter.format(coinInfo.current_price)}`;
  } else {
    row.children[3].textContent = '?';
  }

  // Total volume
  if (coinInfo.total_volume || coinInfo.total_volume === 0) {
    row.children[4].textContent = `${currencySymbol}${numberFormatter.format(coinInfo.total_volume)}`;
  } else {
    row.children[4].textContent = '?';
  }

  // Circulating supply
  if (coinInfo.circulating_supply || coinInfo.circulating_supply === 0) {
    row.children[5].textContent = `${numberFormatter.format(coinInfo.circulating_supply)} ${coinInfo.symbol.toUpperCase()}`;
  } else {
    row.children[5].textContent = '?';
  }

  // 24h % change
  if (coinInfo.price_change_percentage_24h || coinInfo.price_change_percentage_24h === 0) {
    row.children[6].textContent = `${numberFormatter.format(coinInfo.price_change_percentage_24h.toFixed(2))}%`;
  } else {
    row.children[6].textContent = '?';
  }

  // Set green or red color to 24h change
  row.children[6].classList.add(coinInfo.price_change_percentage_24h >= 0 ? 'positive-change' : 'negative-change');

  // Create the spark line graph
  const graphCanvas = document.createElement('canvas');
  graphCanvas.id = `sparkline-${coinInfo.id}`;
  graphCanvas.width = 166;
  graphCanvas.height = 50;
  graphCanvas.classList.add('sparkline');
  row.children[7].innerHTML = '';
  row.children[7].appendChild(graphCanvas);

  const ctx = graphCanvas.getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: coinInfo.sparkline.price.map(() => ''),
      datasets: [{
        data: coinInfo.sparkline.price
      }]
    },
    options: sparklineOptions
  });
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
  let result = [];
  try {
    while (result = await nextPage(rowsWrapper, currency), result && result.length === 50, viewAll, currency === currency) {
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
  TableHelper.adjustRows(rowsWrapper, 50, false);

  // Init Bluzelle
  try {
    blzClient = await BluzelleHelper.init({
      mnemonic: "dish film auto bundle nest hospital arctic giraffe surface afford tribe toe swing flavor outdoor hand slice diesel awesome excess liar impulse trumpet rare",
      chain_id: "bluzelleTestNetPublic-6",
      uuid: "0616d181-bdea-46db-aaba-4b02db6a7285",
      endpoint: "https://client.sentry.testnet.public.bluzelle.com:1319"
    });
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
      viewAll = false;
      previousPage(rowsWrapper, currency);
    })
  });
  document.querySelectorAll('.next-page-btn').forEach((element) => {
    element.addEventListener('click', async() => {
      viewAll = false;
      nextPage(rowsWrapper, currency);
    })
  });
  document.querySelectorAll('.view-all-btn').forEach((element) => {
    element.addEventListener('click', async() => {
      viewAll = true;
      loadAllPages(rowsWrapper, currency);
    });
  });
  document.querySelectorAll('.paginate-btn').forEach((element) => {
    element.addEventListener('click', async() => {
      viewAll = false;
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
