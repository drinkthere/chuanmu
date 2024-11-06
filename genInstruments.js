const { scheduleLoopTask, sleep } = require("./utils/run");
const { writeStringToFile } = require("./utils/common");
const { log } = require("./utils/log");
const BinanceClient = require("./clients/binance");
const OkxClient = require("./clients/okx");

const binanceClient = new BinanceClient();
const okxClient = new OkxClient();

const schedulingGenerateInstrumentsFile = async () => {
    scheduleLoopTask(async () => {
        try {
            log("开始更新configs/instrument.json文件");
            // 获取币安的现货交易对
            const bnSpotInsts = await binanceClient.getSpotInstrument();
            // 获取币安的U本位合约交易对
            const bnFuturesInsts = await binanceClient.getFuturesInstrument();
            const bnFuturesMap = bnFuturesInsts.reduce((map, symbol) => {
                const key = symbol.replace(/^1000/, "");
                map[key] = symbol;
                return map;
            }, {});

            // 获取币安现货和U本位永续合约的交集
            const bnInstrumentMap = bnSpotInsts.reduce((map, symbol) => {
                if (bnFuturesMap[symbol]) {
                    map[symbol] = bnFuturesMap[symbol];
                }
                return map;
            }, {});
            // console.log(bnInstrumentMap);

            // 获取OKX的现货交易对
            const okxSpotInsts = await okxClient.getInstruments("SPOT");

            // 获取OKX的U本位合约交易对
            const okxSwapInsts = await okxClient.getInstruments("SWAP");
            const okxSwapMap = okxSwapInsts.reduce((map, symbol) => {
                const key = symbol.replace("-SWAP", "");
                map[key] = symbol;
                return map;
            }, {});

            // 获取OKX现货和U本位合约的交集
            const okxInstrumentsMap = okxSpotInsts.reduce((map, symbol) => {
                if (okxSwapMap[symbol]) {
                    map[symbol] = true;
                }
                return map;
            }, {});
            // console.log(okxInstrumentsMap);

            // 获取币安和OKX的交集
            const finalInstMap = Object.keys(bnInstrumentMap).reduce(
                (map, symbol) => {
                    const key = symbol.replace("USDT", "-USDT");
                    if (okxInstrumentsMap[key]) {
                        map[symbol] = bnInstrumentMap[symbol];
                    }
                    return map;
                },
                {}
            );

            // console.log(finalInstMap);

            // 将 JSON 数据写入文件
            const jsonData = JSON.stringify(finalInstMap, null, 2);
            writeStringToFile("configs/instrument.json", jsonData);
        } catch (e) {
            console.error(e);
        }

        // 1 天更新一次
        await sleep(86400 * 1000);
    });
};
const main = async () => {
    schedulingGenerateInstrumentsFile();
};

main();
