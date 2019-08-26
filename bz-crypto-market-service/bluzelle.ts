const { bluzelle } = require('bluzelle');
const loadJsonFile = require('load-json-file');

export class BluzelleWriter {
    private bz: any;

    constructor() {

    }

    async init() {
        var keys = await loadJsonFile(__dirname + '\\keys.json'); 

        this.bz = await bluzelle({
            private_pem: keys.private_pem
        });
    }

    async clearAll() {
        try {
            const rthis = this;
            var keys = await this.bz.keys();

            var removalPromises = [];

            keys.forEach(key => {
                var p = rthis.bz.delete(key);
                removalPromises.push(p);
            });

            await Promise.all(removalPromises);
            console.log("Database cleared");
        } catch (error) {
            console.log(`Could not get all keys. Error: ${error}`);
        }
    }

    async writeObject(key: string, obj: any) {

        try {
            if (await this.bz.has(key)) {
                try {
                    await this.bz.update(key, JSON.stringify(obj));
                    return Promise.resolve();
                } catch (error_update) {
                    console.log(`Failed to update ${key} Trying to insert. ${error_update}`);
                    return Promise.reject(error_update);
                }
            } else {
                try {
                    await this.bz.create(key, JSON.stringify(obj));
                    return Promise.resolve();
                } catch (error_create) {
                    console.log(`Failed to create ${key}. ${error_create}`);
                    return Promise.reject(error_create);
                }
            }
        } catch (error) {
            return Promise.reject(error);
        }
    }
}