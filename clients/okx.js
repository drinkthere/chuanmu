const { RestClient, WebsocketClient } = require("okx-api");
const { sleep, convertScientificToString } = require("../utils/run");

class OkxClient {
    constructor(options = {}) {
        const logger = {
            silly: (...params) => {},
            debug: (...params) => {},
            notice: (...params) => {},
            info: (...params) => {},
            warning: (...params) => {},
            error: (...params) => {},
            // silly: (...params) => console.log('silly', ...params),
        };

        this.client = new RestClient();
    }

    async getInstruments(instType) {
        try {
            const result = await this.client.getInstruments(instType);
            if (result != null && result.length > 0) {
                return result
                    .filter(
                        (item) =>
                            item.state == "live" &&
                            item.instId.indexOf("USDT") != -1
                    )
                    .map((item) => item.instId);
            }
        } catch (e) {
            console.error("getInstruments", e);
        }
        return [];
    }
}
module.exports = OkxClient;
