
# Description

Decentralized version of coinmarketcap.com. All data stored only on Bluzelle. End product similar to **CoinMarketCap.com**.

## Requirements
Node.js v10.16.* (tested on v10.16.3)

## Part 1 - node.js service

Service is located inside the "bz-crypto-market-service" folder. Installation and configuration steps:

    cd bz-crypto-market-service
    npm install
    
Edit keys.json your private key:

    {
	    "private_pem": "WRITE_HERE"
    }
Build the service and run it:

    npm run build
    npm run start

The service will pull coin data for all the coins using CoinGecko as suggested by the initial problem, and it will save it into Bluzelle cache as a document split in pages.
- CoinGecko: https://www.coingecko.com/en/api

Coin data will include:

 - Name and image
 - Today and yesterday price
 - Circulating supply
 - Total supply
 - 7d sparkline

Additionally, Binance ticker was implemented with higher frequency and will be selected by default as shown in the picture:

![Tickers](https://i.imgur.com/wV2CTFQ.jpg "Tickers")

### Part 2 - application frontend
Frontend is located inside "bz-crypto-market-webapp" folder. It was developed using Angular 8. First make sure you have configured the bluzelle service by editing file "src/bluzelle.service.ts".
In order to simplify the tests, the following default data is provided to be able to read the already running service:

      // Service configuration
      private_pem:"MHQCAQEEIAPRzz0mKdq7JHUn23zdt/c7UxH4vecAKrkKv09c/VwloAcGBSuBBAAKoUQDQgAE4TL9Wu4CZ9qmFyRqYL1L7Ryj6vzavXRPTc6xnHsDl5B+mUm7OOjKb3HaxsasPgjDE9mI8eVFflwSd16nHpq1qQ==";
      public_pem:"MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAE4TL9Wu4CZ9qmFyRqYL1L7Ryj6vzavXRPTc6xnHsDl5B+mUm7OOjKb3HaxsasPgjDE9mI8eVFflwSd16nHpq1qQ==";
      uuid: "MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEax3onSBx9x9QXpSnmSLNnK1YFudT5PnY/AnfwLNRkprEGLT9gHNy1WP+BEG4g9K79frIM1Y68uMTW1ZiBPI5zw==";
      // End of service configuration

Next, install the application:

    npm install
And finally serve it:

    ng serve --open

### Sample video
https://www.youtube.com/watch?v=gci1SxDVxoM


##### ETH Address
0xAAEBFcC2927beF1ecb4ed83519D23A30681c67DF
