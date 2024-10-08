const {
    fileExists,
    getCurr15MinBarStartTs,
    getPreviousItems,
} = require("./utils/common");
const { sleep, scheduleLoopTask } = require("./utils/run");
const { log } = require("./utils/log");
const BinanceClient = require("./clients/binance");
const TgClient = require("./clients/tg");

const binanceClient = new BinanceClient();
const tgClient = new TgClient();

const fdvMinThreshold = 10000000; // 10m
const fdvMaxThreshold = 500000000; // 0.2b
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
    // 确保第一次执行的时候是一小时的开始，这里设置在第2秒
    const now = new Date();
    const nextTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        0,
        5
    );
    if (now.getSeconds() >= 2) {
        nextTime.setHours(nextTime.getHours() + 1);
    }

    // 等待到下一次执行时间
    const delay = nextTime.getTime() - now.getTime();
    await sleep(delay);

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
    let msg = "";
    for (let i = 0; i < fdvFilteredInsts.length; i++) {
        const inst = fdvFilteredInsts[i];
        const currBarTs = getCurr15MinBarStartTs();
        const openInterests = await binanceClient.getOpenInterestHist(
            inst,
            "1h",
            4
        );
        const lastTwoOiBars = getPreviousItems(
            openInterests,
            "timestamp",
            currBarTs,
            2
        );

        if (lastTwoOiBars.length == 2) {
            currHourOpenInterest = parseFloat(
                lastTwoOiBars[1].sumOpenInterestValue
            );
            lastHourOpenInterest = parseFloat(
                lastTwoOiBars[0].sumOpenInterestValue
            );

            if (
                currHourOpenInterest - lastHourOpenInterest >
                hourlyOpenInterestIncrThreshold
            ) {
                msg += `${inst} hourly open interest hourly incr exceed ${hourlyOpenInterestIncrThreshold}\n`;
            }
        }
        await sleep(100);
    }
    if (msg != "") {
        console.log(msg);
        tgClient.sendMsg(msg);
    } else {
        log("no signal");
    }
};

main();
