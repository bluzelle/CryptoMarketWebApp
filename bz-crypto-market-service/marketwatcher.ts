import { EventEmitter } from "events";

export abstract class MarketWatcher extends EventEmitter {
    tickerName: string;
    tickerId: number;

    constructor(tickerName: string, tickerId: number) {
        super();
        this.tickerName = tickerName;
        this.tickerId = tickerId;
    }
}

export class Coin {
    id: string;
    symbol: string;
    name: string;
}