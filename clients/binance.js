const Binance = require("node-binance-api");
const { sleep } = require("../utils/run");

class BinanceClient {
    constructor() {
        let default_options = {
            family: 4,
            useServerTime: true,
            recvWindow: 10000,
        };
        this.client = new Binance().options(default_options);
    }

    async getSpotInstrument() {
        const exchangeInfo = await this.client.exchangeInfo();
        const symbols = exchangeInfo.symbols
            .filter(
                (symbol) =>
                    symbol.status === "TRADING" && symbol.quoteAsset === "USDT"
            )
            .map((symbol) => symbol.symbol);
        return symbols;
    }

    async getFuturesInstrument() {
        const exchangeInfo = await this.client.futuresExchangeInfo();
        const symbols = exchangeInfo.symbols
            .filter(
                (symbol) =>
                    symbol.status === "TRADING" &&
                    symbol.contractType === "PERPETUAL" &&
                    symbol.quoteAsset === "USDT"
            )
            .map((symbol) => symbol.symbol);
        return symbols;
    }

    async getFuturesTickers() {
        return await this.client.futuresQuote();
    }

    async getOpenInterestHist(symbol, period, limit) {
        return await this.client.futuresOpenInterestHist(symbol, period, limit);
    }

    async getKlines(symbol, period, limit) {
        return await this.client.futuresCandles(symbol, period, {
            limit,
        });
    }
}
module.exports = BinanceClient;
