'use strict';

/**
 * These are helpers methods to use Bluzelle DB
 * It adds an init method, and a most useful upsert method combaining update and create
 */

const pRetry = require('p-retry');

const {
  bluzelle
} = require('bluzelle');

/**
 * Init bluzelle client
 *
 * @param {string} publicKey
 * @param {string} privateKey
 * @param {object} options
 */
const init = async (publicKey, privateKey, options = { log: false }) => {
  try {
    const bluzelleClient = await bluzelle({
      public_pem: publicKey,
      private_pem: privateKey,
      ...options
    });
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
  console.log(`[${key}] Start upserting`);

  return await pRetry(() => {
    return new Promise(async (resolve, reject) => {
      // Assuming that most of the times we will be updating a record (except for the first run ever),
      // in this way we save ~50% of requests compared with the implementation commented below using has(key)
      try {
        await client.update(key, value);
        console.log(`[${key}] Correctly saved`);
        resolve();
      } catch (error) {
        if (error && error.toString().includes('RECORD_NOT_FOUND')) {
          console.log('Record not found, creating a new one');
          await pRetry(async () => {
            console.log(`[${key}] Start creating`);
            return await client.create(key, value), {
              retries: 5,
              onFailedAttempt: (error) => {
                console.log(`[${key}] Creation failed! Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
              }
            }
          })
          resolve();
        } else {
          // console.error(`Key ${key} got error `, error);
          reject(error);
        }
      }

      /* const has = await client.has(key);
      if (await client.has(key)) {
        return await client.update(key, value);
      } else {
        return await client.insert(key, value);
      } */
    });
  }, { retries: 5});
}

module.exports = {
  init,
  upsert
}
