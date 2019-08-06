import React from 'react';
import Numeral from 'numeraljs';
import PropTypes from 'prop-types';
import { TableRow, TableCell, TableBody, Avatar, makeStyles } from '@material-ui/core';
import { Sparklines, SparklinesLine } from 'react-sparklines';

const tableContentStyles = makeStyles(theme => ({
  avatar: {
    margin: theme.spacing(1),
    width: 30,
    height: 30
  },
  cell: {
    display: 'flex',
    alignItems: 'center'
  },
  priceRising: {
    color: '#009E73'
  },
  priceDropping: {
    color: '#D94040'
  }
}));

const TableContent = ({ data }) => {
  const classes = tableContentStyles();
  return (
    <TableBody>
      {data.map(coin => (
        <TableRow key={coin.id}>
          <TableCell>
            <span className={classes.cell}>
              {Boolean(coin.image) ? (
                <Avatar className={classes.avatar} component={'span'} src={coin.image} />
              ) : (
                <Avatar className={classes.avatar} component={'span'}>
                  {coin.name[0].toUpperCase()}
                </Avatar>
              )}
              {coin.name}
            </span>
          </TableCell>
          <TableCell>{Numeral(coin.marketCap).format('$ 0,0[.]00')}</TableCell>
          <TableCell>
            {coin.currentPrice > 1
              ? Numeral(coin.currentPrice).format('$ 0,0.00')
              : Numeral(coin.currentPrice).format('$ 0.00000')}
          </TableCell>
          <TableCell>{Numeral(coin.totalVolume).format('$ 0,0.00')}</TableCell>
          <TableCell>
            {Numeral(coin.circulatingSupply).format('0,0.00')} {coin.symbol.toUpperCase()}
          </TableCell>
          <TableCell
            className={
              coin.marketCapChangePercentage24h > 0 ? classes.priceRising : classes.priceDropping
            }
          >
            {Numeral(coin.marketCapChangePercentage24h / 100).format('0.000%')}
          </TableCell>
          <TableCell
            className={
              coin.priceChangePercentage24h > 0 ? classes.priceRising : classes.priceDropping
            }
          >
            {Numeral(coin.priceChangePercentage24h / 100).format('0.000%')}
          </TableCell>
          <TableCell>
            <Sparklines data={coin.priceSparkLine7d}>
              <SparklinesLine style={{ fill: 'none' }} />
            </Sparklines>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
};

TableContent.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      symbol: PropTypes.string,
      image: PropTypes.string,
      totalVolume: PropTypes.number,
      marketCap: PropTypes.number,
      marketCapChangePercentage24h: PropTypes.number,
      currentPrice: PropTypes.number,
      priceChangePercentage24h: PropTypes.number,
      circulatingSupply: PropTypes.number,
      priceSparkLine7d: PropTypes.arrayOf(PropTypes.number)
    })
  ).isRequired
};

export default TableContent;
