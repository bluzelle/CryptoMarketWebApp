import "../sass/styles.scss";

// Require Bluzelle
const BluzelleHelper = require('./bluzelle-helper');

// Require SortableTable
const TableHelper = require('./table-helper');

const PCancelable = require('p-cancelable');
const localForage = require('localforage');

let blzClient;

// Match currency with its symbol
const currencySymbol = {
  usd: '$',
  btc: 'BTC'
}

const status = {
  // Current page
  page: 0,
  // Total pages
  numberOfPages: null,
  // Current currency
  currency: 'usd',
  // It's a view all?
  viewAll: false,
  // Request in progress
  requestInProgress: null
}

const store = localForage.createInstance({
  name: 'coinzelle',
  storeName: 'coinzelle_db'
})

let currentPageElements = document.querySelectorAll('.pagination .current-page');

/**
 * Update the page with the new coin info
 *
 * @param {object} rowsWrapper
 * @param {object} data
 * @param {object} status
 */
const updatePageContent = (rowsWrapper, data, status) => {
  console.log('updatePage status', status);
  // Adjust number of rows in table based on response
  TableHelper.adjustRows(rowsWrapper, data.length, status.viewAll);

  updateUiControls();

  // Fill row with content
  data.forEach((item) => {
    if (status.page === item.page && status.currency === item.currency) {
      const row = rowsWrapper.querySelector(`tr:nth-child(${item.index})`);
      TableHelper.fillRow(row, item.position, item.coin, item.currencySymbol);
    }
  });
}

/**
 * Update the Bluzelle coin info area with the new coin info
 *
 * @param {object} rowWrapper
 * @param {object} data
 * @param {object} status
 */
const updateBluzelleCoinContent = (rowWrapper, data, status) => {
  console.log('updatePage status', status);
  // Adjust number of rows in table based on response
  TableHelper.adjustRows(rowWrapper, 1);

  // Fill row with content
  const row = rowWrapper.querySelector('tr');
  TableHelper.fillRow(row, '', data.coin, data.currencySymbol);
}


/**
 * Update the UI controls based on status
 */
const updateUiControls = () => {
  if (!status.viewAll) {
    document.body.classList.remove('view-all-active');

    if (status.page === 1) {
      document.querySelectorAll('.back-50-btn, .first-page-btn, .prev-page-btn').forEach((element) => {
        element.classList.add('hide-btn');
      });
      document.querySelectorAll('.next-page-btn, .last-page-btn').forEach((element) => {
        element.classList.remove('hide-btn');
      });
    } else {
      document.querySelectorAll('.first-page-btn, .prev-page-btn, .next-page-btn').forEach((element) => {
        element.classList.remove('hide-btn');
      });

      if (status.page === status.numberOfPages) {
        document.querySelectorAll('.next-page-btn, .last-page-btn').forEach((element) => {
          element.classList.add('hide-btn');
        });
      }
    }

    document.querySelectorAll('.page-selector').forEach((select) => {
      select.querySelector(`option[value='${status.page}']`).selected = true;
    });
  } else {
    document.body.classList.add('view-all-active');
  }
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

    for (let index = 0; index < coinListPage.length; index++) {
      const coin = coinListPage[index];
      const id = coin.id;
      const icon = await store.getItem(`icon-${id}`);
      if (icon) {
        coinListPage[index].image = icon;
      } else {
        // Trigger request to get icon from db
        getIconFromDb(coin.id); // Don't use await, so it doesn't stop the rendering and will be 100% async
      }
    }

    // Create an object with index and page info
    coinListPage = coinListPage.map((coin, index) => ({
      coin: coin,
      index: status.viewAll ? 50 * (status.page - 1) + index + 1 : index + 1,
      position: 50 * (status.page - 1) + index + 1,
      page: status.page,
      currency: status.currency,
      currencySymbol: currencySymbol[status.currency]
    }));

    status.requestInProgress = null;

    resolve(coinListPage);
  });
}

const getIconFromDb = async(id) => {
  const iconFromDb = await await BluzelleHelper.read(blzClient, `coin-icon:${id}`);
  await store.setItem(`icon-${id}`, iconFromDb);

  TableHelper.addIcon(id, iconFromDb);
}


const loadBluzelleCoinInfo = async(rowWrapper, status) => {
  console.log('loadBluzelleCoinInfo');
  // Load coin info
  try {
    let coinInfo = await BluzelleHelper.read(blzClient, `coin-details:${status.currency}:bluzelle`);
    coinInfo = JSON.parse(coinInfo);
    console.log('coinInfo', coinInfo);
    const id = coinInfo.id;
    const icon = await store.getItem(`icon-${id}`);
    if (icon) {
      coinInfo.image = icon;
    } else {
      // Trigger request to get icon from db
      getIconFromDb(coinInfo.id); // Don't use await, so it doesn't stop the rendering and will be 100% async
    }

    const bluzelleCoinInfo = {
      coin: coinInfo,
      currency: status.currency,
      currencySymbol: currencySymbol[status.currency]
    }
    updateBluzelleCoinContent(rowWrapper, bluzelleCoinInfo, status);
  } catch(e) {
    TableHelper.emptyRows(rowWrapper.querySelector('tbody'));
  }
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
  status.page = 1;

  updateUiControls();

  // Hide and show pagination buttons for first page
  document.querySelectorAll('.back-50-btn, .prev-page-btn').forEach((element) => {
    element.classList.add('hide-btn');
  });
  document.querySelectorAll('.view-all-btn, .next-page-btn').forEach((element) => {
    element.classList.remove('hide-btn');
  });

  // Load page
  await getPage(rowsWrapper, status);
}

/**
 * Handler to go to a page
 *
 * @param {object} rowsWrapper
 * @param {number} currency
 */
const getPage = async (rowsWrapper, status) => {
  // Cancel a pending request, if any
  if (status.requestInProgress) {
    status.requestInProgress.cancel();
    status.requestInProgress = null;
  }

  try {
    const pageContent = await loadPage(status);
    if (!status.requestInProgress) {
      updatePageContent(rowsWrapper, pageContent, status);
      return pageContent;
    }
  } catch (error) {
    if (status.requestInProgress && status.requestInProgress.isCanceled) {
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

  updateUiControls();

  // Reset page and load pages
  status.page = 1;
  let result = [];
  try {
    while (result = await getPage(rowsWrapper, status), result && result.length === 50 && status.viewAll && status.page <= status.numberOfPages) {
      console.log('loading next page');
      status.page++
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
  const bluzelleInfoTable = document.querySelector('#coin-bluzelle-table tbody');
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
      uuid: process.env.uuid,
      endpoint: process.env.endpoint
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
  status.numberOfPages = existingKeys
    .filter((key) => {
      return key.includes(`coin-list:${status.currency}:page:`)
    })
    .length;

  currentPageElements.forEach((item) => item.textContent = 1);
  totalNumberOfPages.forEach((item) => item.textContent = status.numberOfPages);
  paginationWrappers.forEach((item) => item.classList.remove('hide'));

  // Bind prev, next and view all buttons
  document.querySelectorAll('.prev-page-btn').forEach((element) => {
    element.addEventListener('click', async() => {
      console.log('prev');
      if (status.page >= 2) {
        status.viewAll = false;
        status.page = status.page - 1;
        history.replaceState({}, document.title, `/page/${status.page}/currency/${status.currency}/`);

        // Empty table
        TableHelper.emptyRows(rowsWrapper);
        await getPage(rowsWrapper, status);
      }
    })
  });
  document.querySelectorAll('.next-page-btn').forEach((element) => {
    element.addEventListener('click', async() => {
      console.log('next');
      if (status.page < status.numberOfPages) {
        status.page = status.page + 1;
        history.replaceState({}, document.title, `/page/${status.page}/currency/${status.currency}/`);
        status.viewAll = false;

        // Empty table
        TableHelper.emptyRows(rowsWrapper);
        await getPage(rowsWrapper, status);
      }
    });
  });
  document.querySelectorAll('.first-page-btn, #home-link').forEach((element) => {
    element.addEventListener('click', async(event) => {
      console.log('first');
      event.preventDefault();
      status.viewAll = false;
      status.page = 1;
      history.replaceState({}, document.title, `/page/${status.page}/currency/${status.currency}/`);

      // Empty table
      TableHelper.emptyRows(rowsWrapper);
      await getPage(rowsWrapper, status);
    })
  });
  document.querySelectorAll('.last-page-btn').forEach((element) => {
    element.addEventListener('click', async() => {
      console.log('last');
      status.page = status.numberOfPages;
      history.replaceState({}, document.title, `/page/${status.page}/currency/${status.currency}/`);
      status.viewAll = false;

      // Empty table
      TableHelper.emptyRows(rowsWrapper);
      await getPage(rowsWrapper, status);
    });
  });
  document.querySelectorAll('.view-all-btn').forEach((element) => {
    element.addEventListener('click', async() => {
      console.log('view all');
      status.viewAll = true;
      history.replaceState({}, document.title, `/page/all/currency/${status.currency}/`);

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
      status.page = 1;

      history.replaceState({}, document.title, `/page/${status.page}/currency/${status.currency}/`);
      paginationWrappers.forEach((item) => item.classList.remove('hide'));
      loadFirstPage(rowsWrapper, status);
    });
  });
  // Bind currency select
  document.querySelectorAll('.currency-selector').forEach((element) => {
    element.addEventListener('change', async(event) => {
      status.currency = event.currentTarget.value;
      loadBluzelleCoinInfo(bluzelleInfoTable, status);
      if (status.viewAll) {
        // Reload all pages with updated currency
        loadAllPages(rowsWrapper, status);
      } else {
        // Empty table
        TableHelper.emptyRows(rowsWrapper);
        history.replaceState({}, document.title, `/page/${status.page}/currency/${status.currency}/`);
        await getPage(rowsWrapper, status);
      }
    });
  });

  // Bind jump to
  document.querySelectorAll('.page-selector').forEach((select) => {
    for (let i=1; i<=status.numberOfPages; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = i;
      select.appendChild(option);
    }

    select.addEventListener('change', async(event) => {
      TableHelper.emptyRows(rowsWrapper);
      status.page = event.currentTarget.value;
      history.replaceState({}, document.title, `/page/${status.page}/currency/${status.currency}/`);
      await getPage(rowsWrapper, status);
    });
  });

  // Check what is the page in the URL, or load the first if any
  const url = window.location.pathname;
  const urlParts = url.split('/');
  const pageInUrl = urlParts[urlParts.findIndex((el) => el === 'page') + 1];
  const currencyInUrl = urlParts[urlParts.findIndex((el) => el === 'currency') + 1];

  if (pageInUrl && currencyInUrl) {
    if (pageInUrl === 'all') {
      status.page = 1;
      status.viewAll = true;
    } else {
      status.page = +pageInUrl;
      status.viewAll = false;
    }
    status.currency = currencyInUrl;
    loadBluzelleCoinInfo(bluzelleInfoTable, status);

    document.querySelectorAll('.currency-selector').forEach((select) => {
      select.querySelector(`option[value="${status.currency}"]`).selected = true;
    });

    if (status.viewAll) {
      await loadAllPages(rowsWrapper, status);
    } else {
      await getPage(rowsWrapper, status);
    }
  } else {
    await loadFirstPage(rowsWrapper, status);
  }
});
