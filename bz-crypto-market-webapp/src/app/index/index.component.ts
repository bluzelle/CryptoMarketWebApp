import { Component, OnInit, OnDestroy } from '@angular/core';
import { StocksService } from '../stocks.service';
import { BluzelleService, BluzelleStatus } from '../bluzelle.service';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subscription, of } from 'rxjs';
import { Coin, IStocksDocument } from '../classes';

@Component({
  selector: 'app-index',
  templateUrl: './index.component.html',
  styleUrls: ['./index.component.scss'],
  animations: [
    trigger('valueAnimation', [
      transition(':increment', [style({ background: 'green',  }), animate('1.5s ease', style({ background: 'white' }))]),
      transition(':decrement', [style({ background: 'red' }), animate('1.5s ease', style({ background: 'white' }))]),
    ])
  ]
})
export class IndexComponent implements OnInit, OnDestroy {

  page = 1;
  itemsPerPage = 100;
  allcoins = this.stocksService.coins.asObservable();
  coins = this.stocksService.coins.asObservable();

  document: IStocksDocument;

  bzStatusEnum = BluzelleStatus;
  bzStatus: BluzelleStatus = this.blz.status.value;
  bzError: string = "";

  subDoc: Subscription;
  subFilter: Subscription;

  marketCap: number;

  constructor(private stocksService: StocksService, private blz: BluzelleService) { 

  }

  ngOnInit() {
    const rthis = this;
    // Wait for bluzelle to be ready
    this.blz.status.subscribe((status)=>{
      this.bzStatus = status;
      if(this.bzStatus == BluzelleStatus.Error){
        this.bzError = this.blz.statusError;
        console.log(this.bzError);
      }else{
        this.bzError = "";
      }
    });

    this.stocksService.currentClientPage.next(this.page);
    this.stocksService.currentClientPageSize.next(this.itemsPerPage);

    this.subDoc = this.stocksService.document.subscribe(doc => {
      this.document = doc;
    });

    this.subFilter = this.stocksService.filter.subscribe(filter => {
      if(filter.length > 0){
        this.coins = of(this.stocksService.coins.value.filter(x=>x.masterData.name.toLocaleLowerCase().indexOf(filter) !== -1));
      }else{
        this.coins = this.allcoins;
      }
    });
  }

  ngOnDestroy(): void {
    this.subDoc.unsubscribe();
    this.subFilter.unsubscribe();
  }

  prevPage(){
    this.page--;
    this.stocksService.currentClientPage.next(this.page);
  }

  nextPage(){
    this.page++;
    this.stocksService.currentClientPage.next(this.page);
  }

  coinChangeTracker(index, item: Coin){
    if(!item || !item.masterData){
      return null;
    }
    return item.masterData.id;
  }

}
