'use strict';

const Chart = require('chart.js');

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
  style: 'decimal',
  maximumSignificantDigits: 8
});

/**
 * These are helpers methods to manage table rows
 * It adds a method to adjust rows number and to empty them
 */

/**
 * Manages the number for rows present in the table
 * It adds or substracts them as needed (e.g. view all needs to add rows, going back to paginated needs to remove)
 *
 * @param {object} contentParent
 * @param {number} totalNumberOfRows
 * @param {boolean} viewAll
 */
const adjustRows = (contentParent, totalNumberOfRows, viewAll) => {
  const currentRows = contentParent.querySelectorAll('tr');
  let rowsToAdd = totalNumberOfRows;

  if (!viewAll) {
    if (currentRows.length > totalNumberOfRows) {
      // Going from view all to paginated
      // Remove the row in excess
      Array.from(currentRows)
        .slice(totalNumberOfRows)
        .forEach((row) => {
          contentParent.removeChild(row);
        })
      rowsToAdd = 0;
    } else if(currentRows.length < totalNumberOfRows) {
      // Last page might have less then 50 rows
      // Add the missing row when going back to a full page
      rowsToAdd = totalNumberOfRows - currentRows.length;
    } else {
      // Most of the times this will be the case, because every page, except for the last one,
      // has the same amount of rows
      rowsToAdd = 0;
    }
    // Remove the content from the rows
    emptyRows(contentParent);
  }

  if (rowsToAdd > 0) {
    // Use a DocumentFragment to increase performance
    const newTableContent = document.createDocumentFragment();
    (Array.from(Array(rowsToAdd).keys())).forEach((_, index) => {
      // Row
      const newRow = document.createElement('tr');

      // Column #1
      const positionColumn = document.createElement('td');
      positionColumn.classList.add('col-align-center');
      newRow.appendChild(positionColumn);

      // Column #2
      const nameColumn = document.createElement('td');
      nameColumn.classList.add('col-align-left');
      nameColumn.setAttribute('data-column', 'name');
      newRow.appendChild(nameColumn);

      // Column #3
      const marketCapColumn = document.createElement('td');
      marketCapColumn.classList.add('col-align-right');
      marketCapColumn.setAttribute('data-column', 'market-cap');
      newRow.appendChild(marketCapColumn);

      // Column #4
      const priceColumn = document.createElement('td');
      priceColumn.classList.add('col-align-right');
      priceColumn.setAttribute('data-column', 'price');
      newRow.appendChild(priceColumn);

      // Column #5
      const volume24hColumn = document.createElement('td');
      volume24hColumn.classList.add('col-align-right');
      volume24hColumn.setAttribute('data-column', 'volume');
      newRow.appendChild(volume24hColumn);

      // Column #6
      const supplyColumn = document.createElement('td');
      supplyColumn.classList.add('col-align-right');
      supplyColumn.setAttribute('data-column', 'supply');
      newRow.appendChild(supplyColumn);

      // Column #7
      const change24Column = document.createElement('td');
      change24Column.classList.add('col-align-right');
      change24Column.setAttribute('data-column', 'change-24h');
      newRow.appendChild(change24Column);

      // Column #8
      const priceGraphColumn = document.createElement('td');
      priceGraphColumn.classList.add('col-align-right');
      priceGraphColumn.setAttribute('data-column', 'price-graph-change');
      newRow.appendChild(priceGraphColumn);

      newTableContent.appendChild(newRow);
    });
    contentParent.appendChild(newTableContent);
  }
}

/**
 * Empties rows and clear css classes as needed
 *
 * @param {object} contentParent
 */
const emptyRows = (contentParent) => {
  contentParent.querySelectorAll('tr').forEach((row) => {
    Array.from(row.querySelectorAll('td'))
      /* .filter((_, index) => {
        return index > 0;
      }) */
      .forEach((column) => {
        column.innerHTML = '';
        column.classList.remove('positive-change', 'negative-change')
      });
  });
}

/**
 * Fill the given row with the data of a coin
 *
 * @param {object} row
 * @param {object} coinInfo
 * @param {string} currencySymbol
 */
const fillRow = (row, position, coinInfo, currencySymbol) => {
  // Row number
  row.children[0].innerHTML = position;

  // Image and name
  row.children[1].innerHTML = `<img src="${coinInfo.image}" alt="${coinInfo.name}" width="16" height="16" class="coin-image"/> ${coinInfo.name}`;
  // Market cap
  if (coinInfo.market_cap || coinInfo.market_cap === 0) {
    row.children[2].textContent = `${currencySymbol} ${numberFormatter.format(coinInfo.market_cap)}`;
  } else {
    row.children[2].textContent = '?';
  }

  // Current price
  if (coinInfo.current_price || coinInfo.current_price === 0) {
    row.children[3].textContent = `${currencySymbol} ${numberFormatter.format(coinInfo.current_price)}`;
  } else {
    row.children[3].textContent = '?';
  }

  // Total volume
  if (coinInfo.total_volume || coinInfo.total_volume === 0) {
    row.children[4].textContent = `${currencySymbol} ${numberFormatter.format(coinInfo.total_volume)}`;
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

module.exports = {
  adjustRows,
  emptyRows,
  fillRow
}
