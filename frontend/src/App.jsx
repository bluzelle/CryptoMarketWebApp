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
            'MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEYCOXjHoBZT25L1GDGHZQ2FtHv/xonzyQvPwV9NUdyCtKImkQXCyG6E1HX/TGV0X9ZNc5L475QsdxYGgjQBUPuQ==',
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
          rowsPerPageOptions={[250]}
          rowsPerPage={250}
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
                <TableCell>Change(24h)</TableCell>
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
