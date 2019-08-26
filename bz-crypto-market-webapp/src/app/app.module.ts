import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { IndexComponent } from './index/index.component';
import { NavigationComponent } from './navigation/navigation.component';
import { CoinRowComponent } from './coin-row/coin-row.component';

import { TrendModule } from 'ngx-trend';
import { OrderModule } from 'ngx-order-pipe';
import { BluzelleService } from './bluzelle.service';
import { MarketcapPipe, BtcDominancePipe } from './coinfilter.pipe';

@NgModule({
  declarations: [
    AppComponent,
    IndexComponent,
    NavigationComponent,
    CoinRowComponent,
    MarketcapPipe,
    BtcDominancePipe
  ],
  imports: [
    BrowserAnimationsModule,
    FormsModule,
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    TrendModule,
    OrderModule
  ], 
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(private bluzelle: BluzelleService){
    this.init();
  }

  async init(){
    try{
      await this.bluzelle.init();
    }catch(error){
      console.log(error);
    }
  }
}
