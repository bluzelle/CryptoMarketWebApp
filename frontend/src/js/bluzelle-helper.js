'use strict';

/**
 * These are helpers methods to use Bluzelle DB
 * It adds an init method, and a read method with retry support
 */

const pRetry = require('p-retry');

const {
  bluzelle
} = require('bluzelle');

/**
 * Init bluzelle client
 *
 * @param {object} config
 */
const init = async(config) => {
  try {
    const bluzelleClient = await bluzelle(config);
    return bluzelleClient;
  } catch (error) {
    // This might happen if the database is not created yet from http://studio.bluzelle.com/
    console.error('Error creating Bluzelle client', error);
    throw error;
  }
}

/**
 * Read value from db
 *
 * @param {object} client
 * @param {string} key
 */
const read = async (client, key) => {
  key = key.toLowerCase();
  console.log(`[${key}] Start reading`);

  return await pRetry(
    async () => {
      let response;
      // Retry up to 5 times, to avoid network issues, and issues like "5000ms timeout"
      // If the error is a RECORD_NOT_FOUND, stop retrying as this is not a recoverable issue
      try {
        response = await client.read(key);
        return response;
      } catch (error) {
        if (error.toString().includes('RECORD_NOT_FOUND')) {
          throw new pRetry.AbortError(error);
        }
        throw error;
      }
    } , {
      retries: 5,
      onFailedAttempt: (error) => {
        console.log(`[${key}] Read failed! Attempt ${error.attemptNumber} failed. There are ${error.retriesLeft} retries left.`);
      }
    });
};

module.exports = {
  init,
  read
}
