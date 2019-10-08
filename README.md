**Bounty Description**:

Decentralized version of coinmarketcap.com. All data stored only on Bluzelle. End product should be similar to **CoinMarketCap.com**.

**Part 1**.

As Bluzelle is the database for serverless applications, the backend is a Lambda function hosted on AWS.
It runs every 30 minutes, but its fully configurable.

The function retrieves the USD market first, then it calls itself to retrieves the BTC market. In this way it avoids timeout issues and is ready to support more markets as needed.

As one of the goal is to also demonstrate and prove out Bluzelle's ability to handle heavy batch updates in short timespans, the content to save is split into several objects.
Instead of saving to Bluzelle the entire page as one, thus saving only ~60 pages in some minutes, the content is split in this way;
- each object containing the info of a specific coin is divided into generic info (name, symbol, total supply, ...) and market info (price, 24hour change, ...)
- the page list contains only the symbol of the coins

This creates ~100 * 2 + 1 = 201 requests for each page, which are saved at a concurrency rate of **100 concurrent requests**, and a total of 60 * 201 requests = **12060** in a few minutes.
**Talk about performance!**
Moreover, having separate market and generic coin info helps with optimizations on the frontend, as generic info are only requested once for each coin, also when switching currencies.

Coin details are saved before the page list, so on the frontend it's impossibile to get a page without complete coin info.

Naming used for keys:
- coin-list:${currency}:page:${page} => list page, i.e. coin-list:usd:page:1
- coin-details:${coin.id} => coin generic info, i.e. coin-details:bluzelle
- coin-market-details:${coin.id}:${currency} => coin market info for given currency, i.e. coin-market-details:bluzelle:usd

To deploy the project, just run npm install inside the backend directory, and then npx sls deploy to deploy.
This will deploy the stack to the AWS account, with the lambda function scheduled to run every 30 minutes (at :00 and at :30).
To manually run the lambda locally run npx sls invoke local -f updateList, to manually run the lambda on AWS after deploy run npx sls invoke -f updateList.

**Part 2**.

The web app is a simple HTML5 page with JS and SASS, compiled using webpack. I've decided to avoid using libraries or frameworks like Angular to keep things simple and focused on Bluzelle.

When the application is loaded page 1 of USD market is loaded from Bluzelle DB. After that 2 requests for each coin are made to load coin market info and generic info (just like the backend saves them). Generic info are then saved locally in an object, so are not requested again when switching currency or going back and forth with pagination.

Having separate coin info for market and generic info will allow an easier development of a "single detail page".

To run the frontend, run npm install and then npm run start.

**Additional info**
Eth address: 0x367a53039D61Ff93849937E5Be78563F8e43c3F0

Demo: http://ds-blz-crypto-market-app.s3-website.eu-west-1.amazonaws.com/index.html
Video backend: https://youtu.be/9tdimPuCA9A
Video frontend: https://youtu.be/mwp6jnrwd1E
