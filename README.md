**Bounty Description**:

Decentralized version of coinmarketcap.com. All data stored only on Bluzelle. End product should be similar to **CoinMarketCap.com**.

**Part 1**. 

A cron job or recurring process running on some server, that needs to pull order book data from CoinGecko.com's API (feel free to use some other service if you prefer). Use the free API, that allows access to read the currency pairs. Store this data directly to the edge on Bluzelle DB. 

CoinGecko: https://www.coingecko.com/en/api

Example: https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd

Whenever a new bunch of currency pair updates come in, update these all to Bluzelle immediately. We would like this to update to Bluzelle as frequently as possible, in terms of how frequently the order book API allows and is possible, with the goal to also demonstrate and prove out Bluzelle's ability to handle heavy batch updates in short timespans.

**Part 2**. 

Web app (much like CoinMarketCap.com) pulls this data directly from Bluzelle using the Bluzelle JS libraries. The web app itself is simply static JS + HTML5 that can be hosted on S3 (or elsewhere). 

**Important points**:

- Your submission will be a pull request.
- Update the README to reflect your submission including description, notes, and other pertinent details.
- You can participate in any of Bluzelle bounty, or even multiple ones, as you desire. You can be an individual or a team -- it is upto you. 
- The code you submit will be under the MIT license, with you being credited as the author. When you submit this code, you agree to give all publishing and intellectual rights of the video freely over to community via the terms of the MIT license.
- Ensure the code is written by you or your team. It is imperative that you own the rights to the code and are writing code that an be fully licensed under MIT.
- Please submit your code to Github with the proper MIT license file included in it, to be considered. If your submission includes a front end and back end, put these into separate FOLDERS and include them both in the same pull request with your submission.
- Be sure your submission is in a ready and demo-able state. We will not evaluate incomplete projects nor will code alone be an acceptable submission. Include all necessary details so we can try out your app.
- Record a screencast showing us how your submission works. Include a link to your video in the README.
- You should use the Bluzelle 0.6 (or later) testnet. The testnet reflects the most recent stable build of Bluzelle, and the latest testnet is running the MEIER release.
- The Bluzelle team will be solely responsible for choosing the winners, and if warranted, multiple winners are possible for each bounty. 
- The Bluzelle team will make the final decision, and reserves the right to not award a bounty for a challenge if no acceptable submissions are made. 
- Include your Ethereum address with your submission, in case you win the bounty
- Once you have made your pull request, send an email about your project to neeraj@bluzelle.com. Include information on the link to your pull request.
- If you have questions, please email neeraj@bluzelle.com.
