# CryptoMarketWebApp with Bluzelle

### **Description**

This is a crypto market web app build with [Bluzelle](https://bluzelle.com/)

### **1. Backend**

This part is using `pm2` and `node-cron` to running the fetching script, data are fetched from CoinGecko.com's API.

When environment variable `PROD` set to `true`, The cron schedule is set to runing `at every 5th minute`, but you can change it by set the environment variable `CRON_SCHEDULE`.

### **2. Frontend**

This part is build with ReactJS, just simple material designed table, it's getting data from [Bluzelle](https://bluzelle.com/) and then populate it.

You can easily run it by `npm start`

### **Bluzelle key setting**

So before you run backend or frontend, you need to set the key first. Follow the [tutorial here](https://docs.bluzelle.com/bluzelle-js/quickstart) to get your bluzelle setup.

Then there are two place you need to put your keys

1. `backend/api.js`
2. `frontend/App.jsx`

Search for `bluzelle` in the code, you will see the place to put the key.

### **Live Demo**

The live demo here is fetching data at every 5th minute, and the website is static hosting with s3.

### [Demo](http://crypto-market-web-app.s3-website-ap-southeast-2.amazonaws.com)

### **Screen record demo**

### [Video](http://youtu.be/hhTt3DhvsB8?hd=1)

**My Ethereum address**: 0x642Bf2b93DCab8e3FDbF9bFE2382a968F4a1785c
