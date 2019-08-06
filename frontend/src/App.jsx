import React, { useState, useEffect, useRef } from 'react';
import { bluzelle } from 'bluzelle';
import { makeStyles } from '@material-ui/core/styles';
import {
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TablePagination,
  LinearProgress,
  Typography,
  Toolbar,
  AppBar
} from '@material-ui/core';
import TableContent from './TableContent';

const appStyles = makeStyles(theme => ({
  table: {
    margin: theme.spacing(2),
    marginTop: 80
  },
  loadingBar: {
    flexGrow: 1
  },
  header: {
    position: 'fixed',
    top: 0
  }
}));

const App = () => {
  const classes = appStyles();
  const pageSize = 250;
  const bz = useRef(null);
  const totalCoinsCount = useRef(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [coinDataForCurrentPage, setCoinDataForCurrentPage] = useState([]);

  useEffect(() => {
    const fetchCoinDataFromBluzellePerPage = async () => {
      setIsLoading(true);
      bz.current =
        bz.current ||
        (await bluzelle({
          public_pem:
            'MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEe6YKttmeSYmGA98SFp7pXfgNu1upuLkpkt0Eig1Qx9aoZIJMbY/TZDkuhbRmH11sZzsZfozDrqSu23Gl9jSiiA==',
          private_pem: ''
        }));

      if (!totalCoinsCount.current) {
        totalCoinsCount.current = Number(
          await bz.current.quickread('coin-stats-total-coins-count')
        );
      }
      const coinDataPerPage = await bz.current.quickread(`coin-stats-page-${pageIndex + 1}`);
      setCoinDataForCurrentPage(JSON.parse(coinDataPerPage));
      console.log(JSON.parse(coinDataPerPage));
      setIsLoading(false);
    };
    fetchCoinDataFromBluzellePerPage();
  }, [pageIndex]);

  return (
    <div className="App">
      <AppBar className={classes.header} position="static">
        <Toolbar>
          <Typography variant="h6" color="inherit">
            CyptoMarketWebApp with Bluzelle
          </Typography>
        </Toolbar>
      </AppBar>
      <Paper className={classes.table}>
        <TablePagination
          component="div"
          rowsPerPageOptions={[pageSize]}
          rowsPerPage={pageSize}
          count={totalCoinsCount.current}
          page={pageIndex}
          backIconButtonProps={{
            'aria-label': 'previous page'
          }}
          nextIconButtonProps={{
            'aria-label': 'next page'
          }}
          onChangePage={(event, newPage) => isLoading || setPageIndex(newPage)}
        />
        {isLoading ? (
          <LinearProgress />
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Market Cap</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Volume</TableCell>
                <TableCell>Circulating Supply</TableCell>
                <TableCell>Market Cap Change(24h)</TableCell>
                <TableCell>Price Change(24h)</TableCell>
                <TableCell>Price Trend(7d)</TableCell>
              </TableRow>
            </TableHead>
            <TableContent data={coinDataForCurrentPage} />
          </Table>
        )}
      </Paper>
    </div>
  );
};

export default App;
