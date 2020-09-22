**Bounty Description**:

Decentralized version of coinmarketcap.com. All data stored only on Bluzelle. End product should be similar to **CoinMarketCap.com**.

**Part 1**.

As Bluzelle is the database for serverless applications, the backend is a Lambda function hosted on AWS.
It runs every 30 minutes, but its fully configurable.

The function retrieves the USD market first, then it calls itself to retrieves the BTC market. In this way it avoids timeout issues and is ready to support more markets as needed.

Every page retrieved from Coingecko is saved as JSON in Bluzelle.

Naming used for keys:
- coin-list:${currency}:page:${page} => list page, i.e. coin-list:usd:page:1

To deploy the project
    npm install inside the backend directory
    npx sls deploy`
This will deploy the stack to the AWS account, with the lambda function scheduled to run every 30 minutes (at :00 and at :30).

To manually run the lambda locally
    npx sls invoke local -f updateList

**Part 2**.

The web app is a simple HTML5 page with JS and SASS, compiled using webpack. I've decided to avoid using libraries or frameworks like Angular to keep things simple and focused on Bluzelle.

When the application is loaded page 1 of USD market is loaded from Bluzelle DB. Generic info are then saved locally in an object, so are not requested again when switching currency or going back and forth with pagination.

To run the frontend
    npm install
    npm run start

**Additional info**
Eth address: 0x367a53039D61Ff93849937E5Be78563F8e43c3F0

Demo: http://ds-blz-crypto-market-app.s3-website.eu-west-1.amazonaws.com/index.html
Video backend: https://youtu.be/9tdimPuCA9A
Video frontend: https://youtu.be/mwp6jnrwd1E
