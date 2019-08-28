import { Pipe, PipeTransform } from '@angular/core';
import { Coin } from './classes';

@Pipe({
  name: 'marketCap'
})
export class MarketcapPipe implements PipeTransform {

  transform(value: Coin[]): any {
    if(value.length > 0){
      var marketCap = value.filter(x=>x.coingeckoPrice && x.coingeckoPrice.cs <= x.masterData.total_supply && x.coingeckoPrice.pt > 0 && x.coingeckoPrice.cs > 0).map(x=> x.coingeckoPrice.pt * x.coingeckoPrice.cs).reduce((prev,curr) => prev + curr);
      return marketCap;
    }else{
      return "";
    }
  }

}

@Pipe({
  name: 'btcDominance'
})
export class BtcDominancePipe implements PipeTransform {

  transform(value: Coin[]): any {
    if(value.length > 0){
      var btc = value.find(x=>x.masterData.symbol == "btc");
      var btcCap = btc.coingeckoPrice.cs * btc.coingeckoPrice.pt;
      var marketCap = value.filter(x=>x.coingeckoPrice && x.coingeckoPrice.cs <= x.masterData.total_supply && x.coingeckoPrice.pt > 0 && x.coingeckoPrice.cs > 0).map(x=> x.coingeckoPrice.pt * x.coingeckoPrice.cs).reduce((prev,curr) => prev + curr);
      return btcCap * 100 / marketCap;
    }else{
      return "";
    }
  }

}
