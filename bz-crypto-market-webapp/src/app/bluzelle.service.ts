import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
const { bluzelle } = require('bluzelle');

@Injectable({
  providedIn: 'root'
})
export class BluzelleService {

  // Service configuration
  private_pem = "MHQCAQEEIAPRzz0mKdq7JHUn23zdt/c7UxH4vecAKrkKv09c/VwloAcGBSuBBAAKoUQDQgAE4TL9Wu4CZ9qmFyRqYL1L7Ryj6vzavXRPTc6xnHsDl5B+mUm7OOjKb3HaxsasPgjDE9mI8eVFflwSd16nHpq1qQ==";
  public_pem = "MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAE4TL9Wu4CZ9qmFyRqYL1L7Ryj6vzavXRPTc6xnHsDl5B+mUm7OOjKb3HaxsasPgjDE9mI8eVFflwSd16nHpq1qQ==";
  uuid = "MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEax3onSBx9x9QXpSnmSLNnK1YFudT5PnY/AnfwLNRkprEGLT9gHNy1WP+BEG4g9K79frIM1Y68uMTW1ZiBPI5zw==";
  // End of service configuration

  bz: any;
  status = new BehaviorSubject<BluzelleStatus>(BluzelleStatus.NotInitialized);
  statusError: string = "";

  constructor() { 
  } 
  
  public async readObject<T>(key: string): Promise<T>{
    if(this.status.value){
      try{
        var strValue = await this.bz.quickread(key);
        return Promise.resolve(JSON.parse(strValue) as T);
      } catch(error){
        return Promise.reject(`Error reading key ${key}. Error: ${error}`);
      }
    }else{
      return Promise.reject("Bluzelle not ready yet.");
    }
  }

  public async readString(key: string): Promise<string>{
    if(this.status.value){
      var strValue = await this.bz.read(key);
      return Promise.resolve(strValue);
    }else{
      return Promise.reject("Bluzelle not ready yet.");
    }
  }

  async init(){
    console.log("[BZ] Initializing...");
    try{
      this.bz = await bluzelle({
        private_pem: this.private_pem,
        public_pem: this.public_pem,
        uuid: this.uuid
      });
      this.status.next(BluzelleStatus.Ready);
      console.log("[BZ] Initialized");
    }catch(error){
      this.statusError = error;
      this.status.next(BluzelleStatus.Error);
      console.log("[BZ] Failed to initialize");
    }    
  }
}

export enum BluzelleStatus { NotInitialized = 0, Error = 1, Ready = 2};
