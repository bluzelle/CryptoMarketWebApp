export abstract class MarketWatcher {
    clientId: string;

    constructor(clientId: string) {
        this.clientId = clientId;
    }
}

export class Coin {
    id: string;
    symbol: string;
    name: string;
}