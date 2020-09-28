'use strict';

/**
 * These are helpers methods to use Bluzelle DB
 * It adds an init method, and a most useful upsert method combaining update and create
 */

const pRetry = require('p-retry');
const { bluzelle } = require('bluzelle');

const maxGas = 10000000; // 10.000.000

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
 * Save data to Bluzelle using transaction
 *
 * @param {object} data
 */
const saveData = async(data) => {
  const existingKeys = await client.keys();
  return await client.withTransaction(() => Promise.all(
    data.map((element) => upsert(existingKeys, element.key, element.data))
  ));
}

/**
 * Upsert value into db
 *
 * Create or update are used based on the existence of the key in the db
 * To avoid connection issues, retry is supported with exponential backoff up 5 retries
 *
 * @param {string} key
 * @param {any} value
 */
const upsert = async (existingKeys, key, value) => {
  key = key.toLowerCase();
  value = Array.isArray(value) || typeof value === 'object' ? JSON.stringify(value) : value.toString();
  //console.log(`[${key}] Start upserting with value ${value}`);
  console.log(`[${key}] Start upserting`);

  return new Promise(async (resolve, reject) => {
    try {
      if (existingKeys.indexOf(key) > -1) {
        await client.update(key, value, {'max_gas': maxGas, 'gas_price': 10});
        console.log(`[${key}] Correctly upserted`);
        resolve();
      } else {
        await client.create(key, value, {'max_gas': maxGas, 'gas_price': 10});
        console.log(`[${key}] Correctly created`);
        resolve();
      }
    } catch (error) {
      console.log(`[${key}] Got error`, error);
      reject(error);
    }
  });
}

module.exports = {
  init,
  saveData,
  maxGas
}
