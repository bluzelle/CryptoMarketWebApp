'use strict';

/**
 * These are helpers methods to use Bluzelle DB
 */

const { bluzelle } = require('bluzelle');
const {memoize} = require('lodash');
const maxGas = 20000000; // 10.000.000

/**
 * Init bluzelle client
 *
 * @param {object} options
 */
const getBlzClient =  memoize((config) => bluzelle(config))

/**
 * Insert data to Bluzelle using transaction
 *
 * @param {object} data
 */
const insertData = async(client, data) => {
  return await client.withTransaction(() => Promise.all(
    data.map((element) => client.create(element.key, element.data, {'max_gas': maxGas, 'gas_price': 0.002}))
  ));
}

/**
 * Save data to Bluzelle using transaction
 *
 * @param {object} data
 */
const saveData = async(client, data) => {
  return Promise.all(data)
    .then((dataMap) => {
        client.withTransaction(() => Promise.all(
          dataMap.map((element) => upsert(client, element.key, element.data))
        ))
    })
}

/**
 * Upsert value into db
 *
 * @param {string} key
 * @param {any} value
 */
const upsert = async(client, key, value) => {
  value = (Array.isArray(value) || typeof value === 'object') ? JSON.stringify(value) : value.toString();
  key = key.toLowerCase();
  //console.log(`[${key}] Start upserting with value ${value}`);
  // console.log(`[${key}] Start upserting`);
  return client.upsert(key, value, {'max_gas': maxGas, 'gas_price': 0.002})
    .then((txHash) => {
      console.log(`[${key}] Correctly upserted`)
    })
}

module.exports = {
  getBlzClient,
  insertData,
  saveData,
  upsert,
  maxGas
}
