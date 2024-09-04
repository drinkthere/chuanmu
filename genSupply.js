const { fileExists, writeStringToFile } = require("./utils/common");
const { sleep, scheduleLoopTask } = require("./utils/run");
const { log } = require("./utils/log");
const CoinMarketCapClient = require("./clients/coinmarketcap");
const cmcClient = new CoinMarketCapClient();

let allInstruments = {};
let symbolIdMap = {};

const main = async () => {
    await init();

    await schedulingGenSymbolTotalSupply();
};

const init = async () => {
    allInstruments = require("./configs/instrument.json");
    initSymbolIdMap();
};

const initSymbolIdMap = async () => {
    // 通过coinmarketcap的api获取token对应的id
    const symbolIdMapFile = "./configs/symbolIdMap.json";
    if (fileExists(symbolIdMapFile)) {
        symbolIdMap = require(symbolIdMapFile);
    } else {
        const idList = await cmcClient.listCmcIds();
        for (token of idList) {
            // 跳过没有意义的纯数字token
            if (
                ["7", "42", "369", "777", "2049", "2192"].includes(token.symbol)
            ) {
                continue;
            }

            if (
                symbolIdMap[token.symbol] == null ||
                (symbolIdMap[token.symbol] != null &&
                    symbolIdMap[token.symbol]["rank"] > token.rank)
            ) {
                // 如果symbol不存在就添加，如果symbol存在，就留rank靠前的数据
                symbolIdMap[token.symbol] = {
                    id: token.id,
                    rank: token.rank,
                    symbol: token.symbol,
                    name: token.name,
                };
            }
        }

        const jsonData = JSON.stringify(symbolIdMap, null, 2);
        writeStringToFile(symbolIdMapFile, jsonData);
    }
};

const schedulingGenSymbolTotalSupply = async () => {
    scheduleLoopTask(async () => {
        try {
            const configFile = "./configs/instrumentSupply.json";
            log(`开始更新${configFile}文件`);
            const cmcIdArr = [];
            const totalSupplyMap = {};
            for (instrument of Object.keys(allInstruments)) {
                const symbol = instrument.replace("USDT", "");
                if (symbolIdMap[symbol]) {
                    const token = symbolIdMap[symbol];
                    cmcIdArr.push(token.id);
                } else {
                    console.error(
                        `${instrument} is not exist in coinmarketcap`
                    );
                }
            }

            const cmcMarketDataMap = await cmcClient.getAllMarketData(cmcIdArr);
            Object.keys(cmcMarketDataMap).map((id) => {
                const tokenInfo = cmcMarketDataMap[id];
                const instrument = `${tokenInfo.symbol}USDT`;
                totalSupplyMap[instrument] = {
                    futuresInstrument: allInstruments[instrument],
                    maxSupply: tokenInfo["max_supply"],
                    totalSupply: tokenInfo["total_supply"],
                };
            });

            const jsonData = JSON.stringify(totalSupplyMap, null, 2);
            writeStringToFile(configFile, jsonData);
            log(`${configFile}更新完成`);
        } catch (e) {
            console.error(e);
        }

        // 1 天更新一次
        await sleep(86400 * 1000);
    });
};

main();
