import React from 'react';
import Numeral from 'numeraljs';
import PropTypes from 'prop-types';
import { TableRow, TableCell, TableBody, Avatar, makeStyles } from '@material-ui/core';
// current_price: 11613
// id: "bitcoin"
// image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png?1547033579"
// market_cap: 207406502749
// market_cap_change_percentage_24h: 8.51545
// name: "Bitcoin"
// price_change_percentage_24h: 8.51564

const tableContentStyles = makeStyles(theme => ({
  avatar: {
    margin: theme.spacing(1),
    width: 30,
    height: 30
  },
  nameCell: {
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
          <TableCell className={classes.nameCell}>
            {Boolean(coin.image) ? (
              <Avatar className={classes.avatar} component={'span'} src={coin.image} />
            ) : (
              <Avatar className={classes.avatar} component={'span'}>
                {coin.name[0].toUpperCase()}
              </Avatar>
            )}
            {coin.name}
          </TableCell>
          <TableCell>{Numeral(coin.market_cap).format('$ 0,0[.]00')}</TableCell>
          <TableCell>{Numeral(coin.current_price).format('$ 0,0[.]00')}</TableCell>
          <TableCell
            className={
              coin.price_change_percentage_24h > 0 ? classes.priceRising : classes.priceDropping
            }
          >
            {Numeral(coin.price_change_percentage_24h / 100).format('0.000%')}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
};

TableContent.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      id: PropTypes.string,
      image: PropTypes.string,
      market_cap: PropTypes.number,
      market_cap_change_percentage_24h: PropTypes.number,
      current_price: PropTypes.number,
      price_change_percentage_24h: PropTypes.number
    })
  ).isRequired
};

export default TableContent;
