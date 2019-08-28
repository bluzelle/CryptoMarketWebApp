
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
    // Price-Coingecko
    pt: number;
    // Yesterday price-Coingecko
    py: number;
  
    change24: number;
    // Tickers available
    tickers: number;
  }
  
  export interface IAlternativePriceData {
    symbol: string;
    pt: number;
    py: number;
    change24: number;
  }

  export interface IAlternativePriceDataDictionary{
    [key: string]: IAlternativePriceData
  }
  
  export interface ICurve{
    price: number[];
  }
  
  export interface ISparkline {
    id: string;
    sparkline: ICurve;
  }
  
  export class Coin {
    masterData: ICoinMasterData;
    coingeckoPrice: ICoinGeckoPriceData;
    alternativePrice: IAlternativePriceDataDictionary = {};
    sparkline: ISparkline;
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