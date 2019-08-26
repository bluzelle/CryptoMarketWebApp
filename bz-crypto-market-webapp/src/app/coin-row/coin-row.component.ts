import { Component, OnInit, Input, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { BluzelleService } from '../bluzelle.service';
import { StocksService } from '../stocks.service';
import { Subscription } from 'rxjs';
import { Ticker, Coin } from '../classes';

@Component({
  selector: 'tr[app-coin-row]',
  templateUrl: './coin-row.component.html',
  styleUrls: ['./coin-row.component.scss'],
  animations: [
    trigger('valueAnimation', [
      transition(':increment', [style({ color: 'darkgreen' }), animate('1.5s ease', style({ color: 'green' })), animate('1.5s ease', style({ color: 'black'}))]),
      transition(':decrement', [style({ color: 'darkred' }), animate('1.5s ease', style({ color: 'red' })), animate('1.5s ease', style({ color: 'black'}))])
    ])
  ]
})
export class CoinRowComponent implements OnInit, OnDestroy {

@Input()
coin: Coin;
@Input()
index: number;
@Input()
page: number;
@Input()
itemsPerPage: number;

private subTicker: Subscription;
selectedTicker: Ticker;

private _interval;

  constructor(private stocksService: StocksService, private bluzelle: BluzelleService) {
    this.subTicker = this.stocksService.selectedTicker.subscribe(ticker => {
      this.selectedTicker = ticker;
    });
  }
 
  ngOnInit() {
    this.subTicker = this.stocksService.selectedTicker.subscribe(ticker => {
      this.selectedTicker = ticker;
    });
  }

  ngOnDestroy() {
    clearInterval(this._interval);
    this.subTicker.unsubscribe();
  }

}