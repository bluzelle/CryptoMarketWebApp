import { ISparkline } from "./coingeckowatcher";
import { BluzelleWriter } from "./bluzelle";
import { MarketWatcher } from "./marketwatcher";

export class Coincache {

    private _blz = new BluzelleWriter();

    private _document: IStocksDocument;
    private _tickerPrices = {} as ITickerPriceMapper;

    constructor() {

    }

    public async init() {
        return await this._blz.init();
    }

    public async saveTickers(tickers: Ticker[]){
        try{
            console.log("Saving tickers...");
            await this._blz.writeObject("tickers", tickers);
        }catch(error){
            console.log(`Cound not write tickers: ${error}`);
        }
    }

    public async updateCoinGecko(document: IStocksDocument, coinData: ICoinMasterData[], coinSparkline: ISparkline[], coinPrice: ICoinGeckoPriceData[]) {
        console.log("CoinGecko update requested");
        // Check if document has changed
        if (!this._document || this.distinctDocument(this._document, document)) {
            // Update master data
            this._document = document;

            // Write Document
            await this._blz.writeObject("document", document);
            // Write coin master data
            var promiseWriteMaster = [];
            for (let page = 1; page <= document.totalPages; page++) {
                var currentMasterDataPage: ICoinMasterData[];

                if (page == document.totalPages) {
                    currentMasterDataPage = coinData.slice((page - 1) * document.pageSize, coinData.length);
                } else {
                    currentMasterDataPage = coinData.slice((page - 1) * document.pageSize, page * document.pageSize);
                }

                var p = this._blz.writeObject(`coin-master-${page}`, currentMasterDataPage).then(function () {
                    console.log(`Wrote master data page (${page}/${document.totalPages})`);
                }, function (error) {
                    console.log(`Error writing page ${page}. ${error}`);
                });

                promiseWriteMaster.push(p);

                if (promiseWriteMaster.length >= 50 || page == document.totalPages) {
                    await Promise.all(promiseWriteMaster);
                    promiseWriteMaster.length = 0;
                }
            }

            console.log(`Wrote all master data`);
        }

        var promiseWritePrice = [];
        for (let page = 1; page <= document.totalPages; page++) {
            var currentCoingeckoPricePage: ICoinGeckoPriceData[];

            if (page == document.totalPages) {
                currentCoingeckoPricePage = coinPrice.slice((page - 1) * document.pageSize, coinPrice.length);
            } else {
                currentCoingeckoPricePage = coinPrice.slice((page - 1) * document.pageSize, page * document.pageSize);
            }

            currentCoingeckoPricePage.forEach(geckoPrice => {
                var tickers = Object.keys(this._tickerPrices);

                tickers.forEach(ticker => {
                    var tickerPrice = this._tickerPrices[ticker][geckoPrice.symbol.toLowerCase()];

                    if (tickerPrice) {
                        var differencePctg = Math.abs(((tickerPrice.pt - geckoPrice.pt) / geckoPrice.pt) * 100);
                        // We skip setting this ticker on coin if the price difference is more than 5%
                        if (differencePctg <= 5) {
                            geckoPrice.tickers = geckoPrice.tickers | Number(ticker);
                        }
                    }
                });
            });

            var p = this._blz.writeObject(`coin-gecko-price-${page}`, currentCoingeckoPricePage).then(function () {
                console.log(`Wrote gecko price data page (${page}/${document.totalPages})`);
            }, function (error) {
                console.log(`Error writing gecko price page ${page}. ${error}`);
            });

            promiseWritePrice.push(p);

            if (promiseWritePrice.length >= 50 || page == document.totalPages) {
                await Promise.all(promiseWritePrice);
                promiseWritePrice.length = 0;
            }
        }

        // Update sparklines if needed

        if (coinSparkline.length > 0) {

            var promiseWriteSpark = []
            for (let page = 1; page <= document.totalPages; page++) {
                var spark;

                if (page == document.totalPages) {
                    spark = coinSparkline.slice((page - 1) * document.pageSize, coinSparkline.length);
                } else {
                    spark = coinSparkline.slice((page - 1) * document.pageSize, page * document.pageSize);
                }

                var sparkPromiseData = this._blz.writeObject(`spark-data-${page}`, spark).then(function () {
                    console.log(`Wrote spark page (${page}/${document.totalPages})`);
                }, function (error) {
                    console.log(`Error writing spark page (${page}/${document.totalPages}). ${error}`);
                });

                promiseWriteSpark.push(sparkPromiseData);

                if (promiseWriteSpark.length >= 5 || page == document.totalPages) {
                    await Promise.all(promiseWriteSpark);
                    promiseWriteSpark.length = 0;
                }
            }
        }
    }

    async updateTickerPrices(coinPrice: IPriceData[], ticker: MarketWatcher) {
        console.log(`Ticker ${ticker.tickerId} (${ticker.tickerName}) update requested`);

        // Create ticker slot if not available
        if (!this._tickerPrices[ticker.tickerId]) {
            this._tickerPrices[ticker.tickerId] = {} as IPricePair;
        }

        coinPrice.forEach(x => {
            this._tickerPrices[ticker.tickerId][x.symbol] = x;
        });

        await this._blz.writeObject(`ticker-${ticker.tickerId}-prices`, coinPrice);

        console.log(`Wrote all ticker ${ticker.tickerName} data.`);
    }

    private distinctDocument(doc1: IStocksDocument, doc2: IStocksDocument) {
        return doc1.pageSize != doc2.pageSize || doc1.totalItems != doc2.totalItems || doc1.totalPages != doc2.totalPages;
    }
}

export class Ticker{
    id: number;
    name: string;
    img: string;
    constructor(id: number, name:string, img: string){
      this.id = id;
      this.name = name;
      this.img = img;
    }
  }

export interface IStocksDocument {
    pageSize: number;
    totalPages: number;
    totalItems: number;
}

export interface ICoinMasterData {
    id: string;
    name: string;
    image: string;
    symbol: string;
    total_supply: number;
}

export interface ICoinGeckoPriceData {
    id: string;
    symbol: string;
    // Circulating Supply
    cs: number;
    // Price-Today
    pt: number;
    // Price-Yesterday
    py: number;
    // Available tickers for this coin
    tickers: number;
}

export interface IPriceData {
    symbol: string;
    pt: number;
    py: number;
}

interface ITickerPriceMapper {
    [tickerId: string]: IPricePair
}

interface IPricePair {
    [symbol: string]: IPriceData
}