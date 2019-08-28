import { Injectable } from '@angular/core';
import { BluzelleService, BluzelleStatus } from './bluzelle.service';
import { BehaviorSubject } from 'rxjs';
import { IAlternativePriceData, ICoinGeckoPriceData, ISparkline, Coin, ICoinMasterData, IStocksDocument, Ticker, IAlternativePriceDataDictionary } from './classes';

@Injectable({
  providedIn: 'root'
})
export class StocksService {
  document = new BehaviorSubject<IStocksDocument>(null);
  masterData: ICoinMasterData[];
  sparklines: ISparkline[];
  coingeckoPrices: ICoinGeckoPriceData[];
  alternativePrices: IAlternativePriceDataStorage = {}
  coins: BehaviorSubject<Coin[]> = new BehaviorSubject<Coin[]>([]);
  filter = new BehaviorSubject<string>("");

  tickers: Ticker[] = [new Ticker(1, "Coingecko", "/assets/gecko256.png")];
  selectedTicker: BehaviorSubject<Ticker> = new BehaviorSubject(this.tickers[0]);

  loadedClientPage = 0;
  currentClientPage = new BehaviorSubject<number>(1);
  loadedClientPageSize = 100;
  currentClientPageSize = new BehaviorSubject<number>(100);

  constructor(private blz: BluzelleService) {


    const rthis = this;

    // Wait for bluzelle to be ready
    this.blz.status.subscribe((status)=>{
      if(status == BluzelleStatus.Ready){
        rthis.init();
      }
    });

    this.currentClientPage.subscribe(page => { 
      if(page != this.loadedClientPage){
        this.loadedClientPage = page;

        var requestedIndexStart = (this.loadedClientPage - 1) * this.currentClientPageSize.value;
        var requestedIndexEnd = requestedIndexStart + this.currentClientPageSize.value;

        if(this.document.value){
          var transformedIndexStart = requestedIndexStart/this.document.value.pageSize + 1;
          var transformedIndexEnd = (requestedIndexEnd/this.document.value.pageSize);
          this.getSparklines(transformedIndexStart, transformedIndexEnd);
        }
      }
    });

    this.currentClientPageSize.subscribe(pageSize => { 
      if(pageSize != this.loadedClientPageSize){
        this.loadedClientPageSize = pageSize;
      }
    });

    this.document.subscribe(async (document) => {
      if(document){
        var requestedIndexStart = (this.loadedClientPage - 1) * this.currentClientPageSize.value;
        var requestedIndexEnd = requestedIndexStart + this.currentClientPageSize.value;

        var transformedIndexStart = requestedIndexStart/document.pageSize + 1;
        var transformedIndexEnd = (requestedIndexEnd/document.pageSize);

        this.getSparklines(transformedIndexStart, transformedIndexEnd);
      }
    });
  }

  private async getTickers(){
    try{
      var tickers = await this.blz.readObject<Ticker[]>("tickers");
      
      this.tickers.length = 0;
      tickers.map(x=>this.tickers.push(x));
      this.selectedTicker.next(this.tickers[this.tickers.length - 1]);
    }catch(err){
      console.log(err);
    }
  }

  private async getDocumentDescription(){
    var docs = await this.blz.readObject<IStocksDocument>("document");
    console.log(docs);
    this.document.next(docs);
  }

  private async getMasterData(){
    var fetchPages: Promise<ICoinMasterData[]>[] = [];

    for(var page = 1; page <= this.document.value.totalPages; page++){
      fetchPages.push(this.blz.readObject<ICoinMasterData[]>(`coin-master-${page}`));
    }

    var results = await Promise.all(fetchPages);
    var flattenedResults = [].concat(...results) as ICoinMasterData[];

    var coins = flattenedResults.map(coinMasterData => {
      var coin = new Coin();
      coin.masterData = coinMasterData;
      coin.coingeckoPrice = this.memoryCoingeckoPrice(coinMasterData.id);
      
      for(var tickers = 1; tickers < this.tickers.length; tickers++){
        var ticker = this.tickers[tickers];
        var tickerName = `ticker-${ticker.id}-prices`;
        coin.alternativePrice[tickerName] = (coin.coingeckoPrice && (coin.coingeckoPrice.tickers & ticker.id) ? this.alternativePrice(coin.masterData.symbol) : undefined);
      }
      

      var spark = this.memorySparkline(coin.masterData.id);
      if(spark){
        coin.sparkline = spark;
      }

      return coin;
    });

    console.log(coins);

    this.coins.next(coins);
  }

  private async getSparklines(start: number, end: number){
    var fetchPages: Promise<ISparkline[]>[] = [];

    var buffer = [];
    for(var page = start; page <= end; page++){
      fetchPages.push(this.blz.readObject<ISparkline[]>(`spark-data-${page}`));
      // Avoid timeout in case we tweaked some values
      if(fetchPages.length >= 8 || page == end){
        var partial = await Promise.all(fetchPages);
        buffer = buffer.concat(...partial);
        fetchPages.length = 0;
      }
    }

    var flattenedResults = buffer;

    this.sparklines = flattenedResults;

    const rthis = this;

    this.coins.value.forEach(coin=>{
      var spark = rthis.memorySparkline(coin.masterData.id);
      if(spark){
        coin.sparkline = spark;
      }
    });
  }

  private async getCoingeckoPrices(){
    var fetchPages: Promise<ICoinGeckoPriceData[]>[] = [];
    // Get all prices
    for(var page = 1; page <= this.document.value.totalPages; page++){
      fetchPages.push(this.blz.readObject<ICoinGeckoPriceData[]>(`coin-gecko-price-${page}`));
    }

    var results = await Promise.all(fetchPages);
    var flattenedResults = [].concat(...results) as ICoinGeckoPriceData[];

    this.coingeckoPrices = flattenedResults;

    const rthis = this;

    this.coins.value.forEach(coin=>{
      coin.coingeckoPrice = rthis.memoryCoingeckoPrice(coin.masterData.id);
    });
  }

  private async getAlternativeTickerPrices(){
    try{
      if(this.selectedTicker.value.id > 1){
        var currentTickerName = `ticker-${this.selectedTicker.value.id}-prices`;
        var ticker = this.selectedTicker.value;
        var alternativePrices = await this.blz.readObject<IAlternativePriceData[]>(currentTickerName);
        this.alternativePrices[currentTickerName] = alternativePrices;

        this.coins.value.forEach(coin=>{
          coin.alternativePrice[currentTickerName] = (coin.coingeckoPrice && (coin.coingeckoPrice.tickers | ticker.id) ? this.alternativePrice(coin.masterData.symbol) : undefined);
        });
      }
    }catch(error){
      console.log(error);
    }
  }

  private memoryCoingeckoPrice(id: string): ICoinGeckoPriceData{
    var price = this.coingeckoPrices ? this.coingeckoPrices.find(price => price.id == id) : undefined;
    if(price){
      price.change24 = (1 - (price.pt / price.py))*100;
    }
    return price;
  }

  private alternativePrice(symbol: string): IAlternativePriceData{
    var tickerName = `ticker-${this.selectedTicker.value.id}-prices`;
    var price = this.alternativePrices ? this.alternativePrices[tickerName].find(price => price.symbol == symbol) : undefined;
    if(price){
      price.change24 = (1 - (price.pt / price.py))*100;
    }
    return price;
  }

  private memorySparkline(id: string): ISparkline{
    return this.sparklines ? this.sparklines.find(sparkline => sparkline.id == id) : undefined;
  }

  async init(){
    // Get tickers
    await this.getTickers();
    // Get total stocks description
    await this.getDocumentDescription();
    await this.getCoingeckoPrices();
    await this.getAlternativeTickerPrices();
    await this.getMasterData();

    // Refresh master data every 5 minutes
    setInterval(async ()=>{
      await this.getDocumentDescription();
      await this.getMasterData();

      if(this.document.value){
        var requestedIndexStart = (this.loadedClientPage - 1) * this.currentClientPageSize.value;
        var requestedIndexEnd = requestedIndexStart + this.currentClientPageSize.value;
        var transformedIndexStart = requestedIndexStart/this.document.value.pageSize + 1;
        var transformedIndexEnd = (requestedIndexEnd/this.document.value.pageSize);

        await this.getSparklines(transformedIndexStart,transformedIndexEnd);
      }
    }, 60000*5);

    // Refresh coingecko data according to rate limit
    setInterval(async()=>{
      await this.getCoingeckoPrices();
    }, 5000);
    // Refresh alternative ticker every 2s
    setInterval(async()=>{
      await this.getAlternativeTickerPrices();
    }, 2000);
  }
}

interface IAlternativePriceDataStorage{
  [key: string]: IAlternativePriceData[]
}