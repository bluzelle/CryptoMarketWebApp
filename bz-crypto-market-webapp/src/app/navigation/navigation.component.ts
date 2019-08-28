import { Component, OnInit } from '@angular/core';
import { StocksService } from '../stocks.service';
import { BehaviorSubject } from 'rxjs';
import { Ticker } from '../classes';

@Component({
  selector: 'app-navigation',
  templateUrl: './navigation.component.html',
  styleUrls: ['./navigation.component.scss']
})
export class NavigationComponent implements OnInit {

  tickers: Ticker[] = this.stocksService.tickers;
  selectedTicker: BehaviorSubject<Ticker> = this.stocksService.selectedTicker;
  filter:string = "";
  
  constructor(private stocksService: StocksService) {

  }

  ngOnInit() {
    
  }

  onFilterChanged(){
    console.log("Filter changed: " + this.filter);
    this.stocksService.filter.next(this.filter);
  }

  setTicker(ticker:Ticker){
    this.selectedTicker.next(ticker);
  }

}
