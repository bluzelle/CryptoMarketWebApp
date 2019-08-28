import { BinanceWatcher } from "./binancewatcher";
import { Coincache, IStocksDocument, ICoinGeckoPriceData, ICoinMasterData, IPriceData, Ticker } from "./coincache";
import { CoinGeckoWatcher, ICoinGeckoMarketsResult, ISparkline } from "./coingeckowatcher";
import { MarketWatcher } from "./marketwatcher";

//enum Tickers { Coingecko = 1, Binance = 2 };
var TickerArray = [new Ticker(1, "Coingecko", "/assets/gecko256.png"), new Ticker(2, "Binance", "/assets/binance.png")];

const coincache = new Coincache();

var onCoinGeckoPriceUpdate = async (results: ICoinGeckoMarketsResult[]) => {
    const pageSize = 50;
    const pages = Math.ceil(results.length / pageSize);

    // Checking the first one is enough, all will have the property set
    var hasSparklineData = results.some(x => x.sparkline_in_7d != undefined);

    const stocksDocument: IStocksDocument = {
        pageSize: pageSize,
        totalPages: pages,
        totalItems: results.length
    }

    const masterData: ICoinMasterData[] = results.map((coin): ICoinMasterData => {
        return {
            id: coin.id,
            name: coin.name,
            symbol: coin.symbol,
            image: coin.image,
            total_supply: coin.total_supply
        }
    });

    const sparklines: ISparkline[] = (hasSparklineData ? results.map((coin) => { return { id: coin.id, sparkline: coin.sparkline_in_7d } }) : []);

    const prices: ICoinGeckoPriceData[] = results.map((coin): ICoinGeckoPriceData => {
        return {
            id: coin.id,
            symbol: coin.symbol,
            cs: coin.circulating_supply,
            pt: coin.current_price,
            py: coin.current_price + coin.price_change_24h,
            tickers: TickerArray[0].id // Default ticker
        }
    });

    // Update cache with coingecko data
    coincache.updateCoinGecko(stocksDocument, masterData, sparklines, prices);
}

var onBinancePriceUpdate = (prices: IPriceData[], ticker: MarketWatcher) => {
    // Update cache with binance data
    coincache.updateTickerPrices(prices, ticker);
}

var runtime = async () => {

    await coincache.init();
    await coincache.saveTickers(TickerArray);

    // 50 Requests per minute, update sparklines every 5 minutes
    var gecko = new CoinGeckoWatcher(50, 60000*5);
    gecko.on("pricesUpdate", onCoinGeckoPriceUpdate);

    var binance = new BinanceWatcher();
    binance.on("pricesUpdate", onBinancePriceUpdate);
    binance.start(3500);
};

runtime();