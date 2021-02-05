'use strict';

/**
 * These are helpers methods to use Bluzelle DB
 */

const { bluzelle } = require('bluzelle');

const maxGas = 20000000; // 10.000.000

let client;

/**
 * Init bluzelle client
 *
 * @param {object} options
 */
const init = async (config) => {
  try {
    client = await bluzelle(config);
    return client;
  } catch (error) {
    // This might happen if the database is not created yet from http://studio.bluzelle.com/
    console.error('Error creating Bluzelle client', error);
    throw error;
  }
}

/**
 * Insert data to Bluzelle using transaction
 *
 * @param {object} data
 */
const insertData = async(data) => {
  return await client.withTransaction(() => Promise.all(
    data.map((element) => client.create(element.key, element.data, {'max_gas': maxGas, 'gas_price': 0.002}))
  ));
}

/**
 * Save data to Bluzelle using transaction
 *
 * @param {object} data
 */
const saveData = async(data) => {
  return await client.withTransaction(() => Promise.all(
    data.map((element) => upsert(element.key, element.data))
  ));
}

/**
 * Upsert value into db
 *
 * @param {string} key
 * @param {any} value
 */
const upsert = async (key, value) => {
  value = Array.isArray(value) || typeof value === 'object' ? JSON.stringify(value) : value.toString();
  key = key.toLowerCase();
  //console.log(`[${key}] Start upserting with value ${value}`);
  console.log(`[${key}] Start upserting`);
  await client.upsert(key, value, {'max_gas': maxGas, 'gas_price': 0.002});
  console.log(`[${key}] Correctly upserted`);
}

module.exports = {
  init,
  insertData,
  saveData,
  upsert,
  maxGas
}
