'use strict';

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
const init = async(publicKey, privateKey, options = { log: false }) => {
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
