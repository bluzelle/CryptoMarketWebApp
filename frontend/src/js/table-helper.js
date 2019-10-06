
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
      // Last page might have less then 100 rows
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
      positionColumn.textContent = currentRows.length + index + 1;
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

const emptyRows = (contentParent) => {
  contentParent.querySelectorAll('tr').forEach((row) => {
    Array.from(row.querySelectorAll('td'))
      .filter((_, index) => {
        return index > 0;
      })
      .forEach((column) => {
        column.innerHTML = '';
        column.classList.remove('positive-change', 'negative-change')
      });
  });
}

module.exports = {
  adjustRows,
  emptyRows
}
