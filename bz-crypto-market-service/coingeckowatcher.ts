import { MarketWatcher, Coin } from "./marketwatcher";
const request = require('request');

export class CoinGeckoWatcher extends MarketWatcher {

    public availabelCoins: Coin[];
    private _pages: number = 0;

    // Limit of requests per minute (determined by Coingecko API)
    private _maxRequestsPerMinute: number = 100;
    // Max results per page (determined by Coingecko API)
    private _maxResultsPerPage: number = 250.0;
    // Interval to udpate the sparklines
    private _sparkLineUpdateIntervalMs: number = 0;
    // Last sparkline fetch date
    private _lastSparklines: Date;
    // Last coin list fetch date
    
    constructor(requestsPerMinute: number, sparkLineUpdateIntervalMs: number) {
        super("coingecko", 1);
        this._maxRequestsPerMinute = requestsPerMinute;
        this._sparkLineUpdateIntervalMs = sparkLineUpdateIntervalMs;
        this.initialize();
    }

    async initialize() {
        const rthis = this;

        // We need to know how much coins we have to schedule the interval and not exceed request limit
        var initResult = await this.getAllCoins();

        if (initResult) {
            const rthis = this;

            // Start ticker
            setInterval(async () => {
                rthis.getMasterData();
            }, 60000 / (this._maxRequestsPerMinute / (this.availabelCoins.length / this._maxResultsPerPage)));

            rthis.getMasterData();

        } else {
            setTimeout(function () {
                rthis.initialize();
            }, 5000);
        }
    }

    private async getMasterData() {
        var results = await this.getAllMarketPages();
        var updated = [].concat.apply([], results.map(x => x.result)) as ICoinGeckoMarketsResult[];

        this.emit("pricesUpdate", updated);
    }

    private async getAllCoins(): Promise<boolean> {



        const url = "https://api.coingecko.com/api/v3/coins/list";
        const rthis = this;

        var retVal = new Promise<boolean>(function (accept) {

            request({ url: url, json: true }, function (err, response, body) {
                if (err || response.statusCode != 200) {
                    console.log(err);
                    accept(false);
                    return;
                }

                rthis.availabelCoins = body as Coin[];
                rthis._pages = Math.ceil(rthis.availabelCoins.length / rthis._maxResultsPerPage);

                console.log(`Got ${rthis.availabelCoins.length} coins. Pages = ${rthis._pages}`);

                accept(true);
            });

        });

        return retVal;
    }

    private async getAllMarketPages(): Promise<IPageResult[]> {
        const promises = [];

        const now = new Date();
        var includeSparklines = (!this._lastSparklines || (now.getTime() - this._lastSparklines.getTime()) > this._sparkLineUpdateIntervalMs);
        if (includeSparklines) {
            // Update data
            this._lastSparklines = now;
        }

        for (let page = 1; page <= this._pages; page++) {
            promises.push(this.getMarketPage(page, includeSparklines));
        }
        const results = await Promise.all(promises) as IPageResult[];

        return Promise.resolve(results);
    }

    private async getMarketPage(page: number, inlcludeSparklines: boolean): Promise<IPageResult> {

        const url = "https://api.coingecko.com/api/v3/coins/markets";

        const qsObject = {
            vs_currency: "usd",
            order: "COIN_NAME_DESC",
            per_page: this._maxResultsPerPage,
            page: page,
            sparkline: inlcludeSparklines,
            price_change_percentage: "24h"
        }

        var retVal = new Promise<IPageResult>(function (accept, reject) {

            request({ url: url, qs: qsObject, json: true }, function (err, response, body) {
                if (err || response.statusCode != 200) {
                    console.log(err);
                    accept({ page: page, success: false, result: null } as IPageResult);
                    return;
                }

                accept({ page: page, success: true, result: body as ICoinGeckoMarketsResult[] } as IPageResult);
            });

        });

        return retVal;
    }
}

interface IPageResult {
    page: number;
    success: boolean;
    result: ICoinGeckoMarketsResult[];
}

export interface ICoinGeckoMarketsResult {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
    market_cap: number;
    market_cap_rank: number;
    total_volume: number;
    high_24h: number;
    low_24h: number;
    price_change_24h: number;
    price_change_percentage_24h: number;
    market_cap_change_24h: number;
    market_cap_change_percentage_24h: number;
    circulating_supply: number;
    total_supply: number;
    ath: number;
    ath_change_percentage: number;
    ath_date: string;
    roi: number;
    last_updated: string;
    sparkline_in_7d: IMarketSparkline,
    price_change_percentage_1h_in_currency: number;
    price_change_percentage_24h_in_currency: number;
    price_change_percentage_7d_in_currency: number;
    price_change_percentage_14d_in_currency: number;
    price_change_percentage_30d_in_currency: number;
    price_change_percentage_200d_in_currency: number;
    price_change_percentage_1y_in_currency: number;
}

interface IMarketSparkline {
    price: number[];
}

export interface ISparkline {
    id: string;
    sparkline: IMarketSparkline;
}