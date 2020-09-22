'use strict';

/**
 * These are helpers methods to use Bluzelle DB
 * It adds an init method, and a most useful upsert method combaining update and create
 */

const pRetry = require('p-retry');
const { bluzelle } = require('bluzelle');

let existingKeys;

/**
 * Init bluzelle client
 *
 * @param {object} options
 */
const init = async (config) => {
  try {
    const bluzelleClient = await bluzelle(config);
    existingKeys = await bluzelleClient.keys();
    console.log('existingKeys', existingKeys);
    return bluzelleClient;
  } catch (error) {
    // This might happen if the database is not created yet from http://studio.bluzelle.com/
    console.error('Error creating Bluzelle client', error);
    throw error;
  }
}

/**
 * Upsert value into db
 *
 * The methods first tries to update the value, and if RECORD_NOT_FOUND is returned,
 * then it creates it
 *
 * To avoid connection uses, retry is supported with exponential backoff up 5 retries
 *
 * @param {object} client
 * @param {string} key
 * @param {any} value
 */
const upsert = async (client, key, value) => {
  key = key.toLowerCase();
  value = Array.isArray(value) || typeof value === 'object' ? JSON.stringify(value) : value.toString();
  // console.log(`[${key}] Start upserting`);

  return await pRetry(() => {
    console.log(`[${key}] Starting...`);
    return new Promise(async (resolve, reject) => {
      try {
        if (existingKeys.indexOf(key) > -1) {
          await client.update(key, value, {'max_gas': 25000000, 'gas_price': 10});
          console.log(`[${key}] Correctly upserted`);
          resolve();
        } else {
          await client.create(key, value, {'max_gas': 25000000, 'gas_price': 10});
          console.log(`[${key}] Correctly created`);
          resolve();
        }
      } catch (error) {
        console.log(`[${key}] Got error`, error);
        reject(error);
      }
    });
  }, {
    retries: 5,
    onFailedAttempt: (error) => {
      console.log(`[${key}] Creation failed! Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
    }
  });
}

module.exports = {
  init,
  upsert
}
