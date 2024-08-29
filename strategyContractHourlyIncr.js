const { fileExists } = require("./utils/common");
const { sleep, scheduleLoopTask } = require("./utils/run");
const { log } = require("./utils/log");
const BinanceClient = require("./clients/binance");
const binanceClient = new BinanceClient();

const fdvMinThreshold = 10000000; // 10m
const fdvMaxThreshold = 200000000; // 0.2b
const hourlyOpenInterestIncrThreshold = 2000000; // 2m

let instrumentSupplyMap = {};

const main = async () => {
    await init();
    await schedulingCheckSignal();
};

const init = async () => {
    // 加载交易币种的流通数量
    supplyFile = "./configs/instrumentSupply.json";
    if (!fileExists(supplyFile)) {
        console.error("instrument supply 文件不存在");
        process.exit();
    }
    instrumentSupplyMap = require(supplyFile);
};

const schedulingCheckSignal = async () => {
    scheduleLoopTask(async () => {
        try {
            log("开始检查山寨币合约持仓量异动信号");
            // 根据市值过滤出要检查的币
            const fdvFilteredInsts = await filterInstsByFDV();

            // 遍历市值符合要求的山寨币，获取小时级别合约持仓增量，并检查是否满足发送信号的要求
            await checkContractHourlyIncr(fdvFilteredInsts);
            log("结束山寨币合约持仓量异动信号检查");
        } catch (e) {
            console.error(e);
        }

        // 1 小时一次
        await sleep(3600 * 1000);
    });
};

const filterInstsByFDV = async () => {
    // 获取币安所有symbol的tickers
    const tickers = await binanceClient.getFuturesTickers();

    let filteredInstruments = [];
    Object.keys(instrumentSupplyMap).map((instument) => {
        const supplyInfo = instrumentSupplyMap[instument];
        const futuresInstrument = supplyInfo.futuresInstrument;
        if (tickers[futuresInstrument] == null) {
            console.error(`${futuresInstrument}'s ticker does not exist.`);
        } else {
            const ticker = tickers[futuresInstrument];
            const price =
                (parseFloat(ticker.bidPrice) + parseFloat(ticker.askPrice)) / 2;
            const amount =
                supplyInfo.maxSupply != null
                    ? supplyInfo.maxSupply
                    : supplyInfo.totalSupply;

            const fdv = price * amount;
            if (fdv >= fdvMinThreshold && fdv <= fdvMaxThreshold) {
                filteredInstruments.push(futuresInstrument);
            }
        }
    });
    return filteredInstruments;
};

const checkContractHourlyIncr = async (fdvFilteredInsts) => {
    for (let i = 0; i < fdvFilteredInsts.length; i++) {
        const inst = fdvFilteredInsts[i];
        const openInterests = await binanceClient.getOpenInterestHist(
            inst,
            "1h",
            2
        );
        if (openInterests.length == 2) {
            currHourOpenInterest = parseFloat(
                openInterests[1].sumOpenInterestValue
            );
            lastHourOpenInterest = parseFloat(
                openInterests[0].sumOpenInterestValue
            );
            if (
                currHourOpenInterest - lastHourOpenInterest >
                hourlyOpenInterestIncrThreshold
            ) {
                const msg = `${inst} hourly open interest hourly incr exceed ${hourlyOpenInterestIncrThreshold}`;
                console.log(msg);
                // @todo 发送电报
            } else {
                const msg = `${inst} ${
                    currHourOpenInterest - lastHourOpenInterest
                }`;
                console.log(msg);
            }
        }
        await sleep(100);
    }
};

main();
