const axios = require("axios");
const { chunkArray } = require("../utils/common");

// 加载.env文件
const dotenv = require("dotenv");
dotenv.config();

const cmcApiKey = process.env.CMC_API_KEY;

class CoinMarketCapClient {
    constructor() {}

    async listCmcIds() {
        try {
            const response = await axios.get(
                "https://pro-api.coinmarketcap.com/v1/cryptocurrency/map",
                {
                    params: {
                        sort: "cmc_rank",
                    },
                    headers: {
                        "X-CMC_PRO_API_KEY": cmcApiKey,
                    },
                }
            );

            return response.data.data;
        } catch (error) {
            console.error("Error fetching ID Map:", error);
        }
    }

    async getAllMarketData(cmcIdArr) {
        const chunks = chunkArray(cmcIdArr, 100);
        const results = {};

        for (const chunk of chunks) {
            const data = await this.fetchMarketData(chunk);
            Object.assign(results, data);
        }

        return results;
    }

    async fetchMarketData(ids) {
        try {
            const response = await axios.get(
                "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest",
                {
                    params: {
                        id: ids.join(","),
                    },
                    headers: {
                        "X-CMC_PRO_API_KEY": cmcApiKey,
                    },
                }
            );
            return response.data.data;
        } catch (error) {
            console.error("Error fetching market data:", error);
            return [];
        }
    }
}

module.exports = CoinMarketCapClient;
