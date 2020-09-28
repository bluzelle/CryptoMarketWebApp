import "../sass/styles.scss";

// Require Bluzelle
const BluzelleHelper = require('./bluzelle-helper');

// Require SortableTable
const TableHelper = require('./table-helper');

const PCancelable = require('p-cancelable');

let blzClient;
let currentRequest;

// Match currency with its symbol
const currencySymbol = {
  usd: '$',
  btc: 'BTC'
}

const status = {
  // Current page
  page: 0,
  // Current currency
  currency: 'usd',
  // It's a view all?
  viewAll: false
}

let currentPageElements = document.querySelectorAll('.pagination .current-page');

/**
 * Update the page with the new coin info
 *
 * @param {object} rowsWrapper
 * @param {object} data
 * @param {object} status
 */
const updatePage = (rowsWrapper, data, status) => {
  console.log('updatePage status', status);
  // Adjust number of rows in table based on response
  TableHelper.adjustRows(rowsWrapper, data.length, status.viewAll);

  // Handle UI adjustments based on page and results total
  if (!status.viewAll) {
    if (status.page === 1) {
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
      if (data.length < 50) {
        document.querySelectorAll('.next-page-btn').forEach((element) => {
          element.classList.add('hide-btn');
        });
      }
    }
  }

  // Fill row with content
  data.forEach((item) => {
    if (status.page === item.page && status.currency === item.currency) {
      const row = rowsWrapper.querySelector(`tr:nth-child(${item.index})`);
      TableHelper.fillRow(row, item.position, item.coin, item.currencySymbol);
    }
  });
}

/**
 * Loads the page from the given page and currency from Bluzelle DB
 *
 * @param {object} status
 */
const loadPage = (status) => {
  console.log('loadPage', status);
  return new PCancelable(async (resolve, reject, onCancel) => {
    currentPageElements.forEach((item) => item.textContent = status.page);

    // Load coin list
    let coinListPage = await BluzelleHelper.read(blzClient, `coin-list:${status.currency}:page:${status.page}`);
    coinListPage = JSON.parse(coinListPage);
    // Create an object with index and page info
    coinListPage = coinListPage.map((coin, index) => ({
      coin: coin,
      index: status.viewAll ? 50 * (status.page - 1) + index + 1 : index + 1,
      position: 50 * (status.page - 1) + index + 1,
      page: status.page,
      currency: status.currency,
      currencySymbol: currencySymbol[status.currency]
    }));

    currentRequest = null;
    resolve(coinListPage);
  });
}

/* Methods to load pages */

/**
 * Handler to load the first page
 *
 * @param {object} rowsWrapper
 * @param {object} status
 */
const loadFirstPage = async(rowsWrapper, status) => {
  // Reset page
  status.page = 0;

  // Hide and show pagination buttons for first page
  document.querySelectorAll('.back-50-btn, .prev-page-btn').forEach((element) => {
    element.classList.add('hide-btn');
  });
  document.querySelectorAll('.view-all-btn, .next-page-btn').forEach((element) => {
    element.classList.remove('hide-btn');
  });

  // Load page
  await nextPage(rowsWrapper, status);
}

/**
 * Handler to load previous page
 *
 * @param {object} rowsWrapper
 * @param {number} currency
 */
const previousPage = async (rowsWrapper, status) => {
  if (status.page >= 2) {
    status.page = status.page - 1;

    // Cancel a pending request, if any
    if (currentRequest) {
      currentRequest.cancel();
    }

    try {
      const pageContent = await loadPage(status);
      updatePage(rowsWrapper, pageContent, status);
    } catch (error) {
      if (currentRequest && currentRequest.isCanceled) {
        console.log('Another page requested, abort this');
      } else {
        throw error;
      }
    }
  }
}

/**
 * Handler to load next page
 *
 * @param {object} rowsWrapper
 * @param {number} currency
 */
const nextPage = async (rowsWrapper, status) => {
  status.page = status.page + 1;

  // Cancel a pending request, if any
  if (currentRequest) {
    currentRequest.cancel();
  }

  try {
    const pageContent = await loadPage(status);
    updatePage(rowsWrapper, pageContent, status);
  } catch (error) {
    if (currentRequest && currentRequest.isCanceled) {
      console.log('Another page requested, abort this');
    } else {
      throw error;
    }
  }
}

/**
 * Handler to start loading all pages
 *
 * @param {object} rowsWrapper
 * @param {object} status
 */
const loadAllPages = async (rowsWrapper, status) => {
  TableHelper.adjustRows(rowsWrapper, 0, status.viewAll);

  // Hide and show pagination buttons for first page
  document.querySelectorAll('.back-50-btn').forEach((element) => {
    element.classList.remove('hide-btn');
  });
  document.querySelectorAll('.view-all-btn, .prev-page-btn, .next-page-btn').forEach((element) => {
    element.classList.add('hide-btn');
  });

  // Reset page and load pages
  status.page = 0;
  let result = [];
  try {
    while (result = await nextPage(rowsWrapper, status), result && result.length === 50, status.viewAll) {
      console.log('loading next page');
    }
  } catch (error) {
    console.error(error);
  }
}

// Handler fired at page load
document.addEventListener('DOMContentLoaded', async () => {
  // Get starting currency
  status.currency = document.querySelector('.currency-selector').value;

  // Get DOM elements
  const coinsTable = document.querySelector('#coins-list-table');
  const rowsWrapper = coinsTable.querySelector('tbody');
  const paginationWrappers = document.querySelectorAll('.pagination');
  currentPageElements = document.querySelectorAll('.pagination .current-page');
  const totalNumberOfPages = document.querySelectorAll('.pagination .total-pages');

  // Setup table (mostly for UI reasons)
  TableHelper.adjustRows(rowsWrapper, 50, false);

  // Init Bluzelle
  try {
    blzClient = await BluzelleHelper.init({
      mnemonic: "humor symbol donate time vibrant candy worth amateur acid brother traffic retire apple label maid someone solution plug escape nest reunion permit pulp helmet",
      chain_id: "bluzelleTestNetPublic-6",
      uuid: "74a6f157-ee57-470e-b8ca-e62b56b924b1",
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

  const existingKeys = await blzClient.keys();
  const numberOfPages = existingKeys
    .filter((key) => {
      return key.includes(`coin-list:${status.currency}:page:`)
    })
    .length;

  currentPageElements.forEach((item) => item.textContent = 1);
  totalNumberOfPages.forEach((item) => item.textContent = numberOfPages);
  paginationWrappers.forEach((item) => item.classList.remove('hide'));

  // Bind prev, next and view all buttons
  document.querySelectorAll('.prev-page-btn').forEach((element) => {
    element.addEventListener('click', async() => {
      console.log('prev');
      status.viewAll = false;

      // Empty table
      TableHelper.emptyRows(rowsWrapper);
      await previousPage(rowsWrapper, status);
    })
  });
  document.querySelectorAll('.next-page-btn').forEach((element) => {
    element.addEventListener('click', async() => {
      console.log('next');
      status.viewAll = false;

      // Empty table
      TableHelper.emptyRows(rowsWrapper);
      await nextPage(rowsWrapper, status);
    });
  });
  document.querySelectorAll('.view-all-btn').forEach((element) => {
    element.addEventListener('click', async() => {
      console.log('view all');
      status.viewAll = true;

      // Empty table
      TableHelper.emptyRows(rowsWrapper);
      paginationWrappers.forEach((item) => item.classList.add('hide'));
      await loadAllPages(rowsWrapper, status);
    });
  });
  document.querySelectorAll('.back-50-btn').forEach((element) => {
    element.addEventListener('click', async() => {
      console.log('back');
      status.viewAll = false;
      paginationWrappers.forEach((item) => item.classList.remove('hide'));
      loadFirstPage(rowsWrapper, status);
    });
  });
  // Bind currency select
  document.querySelectorAll('.currency-selector').forEach((element) => {
    element.addEventListener('change', async(event) => {
      status.currency = event.currentTarget.value;
      if (status.viewAll) {
        // Reload al pages with updated currency
        loadAllPages(rowsWrapper, status);
      } else {
        // Empty table
        TableHelper.emptyRows(rowsWrapper);
        status.page = status.page - 1;
        await nextPage(rowsWrapper, status);
      }
    });
  });

  // Get list for page 1 in given currency
  loadFirstPage(rowsWrapper, status);
});
