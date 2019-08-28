import { MarketWatcher } from "./marketwatcher";
import { setInterval, clearInterval } from "timers";
import { IPriceData } from "./coincache";
const binanceapi = require('node-binance-api');

export class BinanceWatcher extends MarketWatcher {
    api = binanceapi().options({
        APIKEY: '<key>',
        APISECRET: '<secret>',
        useServerTime: true
    });

    private _interval: NodeJS.Timeout = null;

    constructor() {
        super("binance", 2);
    }

    start(ms: number): void {
        if (!this._interval) {
            const rthis = this;

            this.updateData();

            this._interval = setInterval(function () {
                rthis.updateData();
            }, ms);
        }
        
    }

    private updateData() {
        const rthis = this;

        this.api.prevDay(false, (error, prevDayTicker) => {

            if (!error) {
                var btc = prevDayTicker.find(x => x.symbol == "BTCUSDT");
                var btcPriceNow = Number(btc.lastPrice);
                var btcPrice24h = btcPriceNow + Number(btc.priceChange);

                var btcPairs = prevDayTicker.filter(x => x.symbol.endsWith("BTC")).map((y): IPriceData => { return { symbol: y.symbol.slice(0, -3).toLowerCase(), pt: Number(y.lastPrice) * btcPriceNow, py: (Number(y.lastPrice) + Number(y.priceChange)) * btcPrice24h } }) as IPriceData[];
                var usdtPairs = prevDayTicker.filter(x => x.symbol.endsWith("USDT")).map((y): IPriceData => { return { symbol: y.symbol.slice(0, -4).toLowerCase(), pt: Number(y.lastPrice), py: Number(y.lastPrice) + Number(y.priceChange) } }) as IPriceData[];
                var btcPairsNotInUsdt = btcPairs.filter(x => !usdtPairs.some(y => y.symbol == x.symbol));
                var allPairsInUsdt = usdtPairs.concat(btcPairsNotInUsdt).map(x => ({ symbol: x.symbol, pt: x.pt, py: x.py } as IPriceData));

                rthis.emit("pricesUpdate", allPairsInUsdt, rthis);
            }
        });
    }

    stop(): void {
        if (this._interval) {
            clearInterval(this._interval);
            this._interval = null;
        }
    }
}