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
    // 等待到下一个执行时间
    const delay = getDelay();
    await sleep(delay);

    scheduleLoopTask(async () => {
        try {
            log("开始检查山寨币合约交易量及未平仓量异动信号");
            // 根据市值过滤出要检查的币
            const fdvFilteredInsts = await filterInstsByFDV();

            // 遍历市值符合要求的山寨币，获取小时级别合约持仓增量，并检查是否满足发送信号的要求
            await check15MinDelta(fdvFilteredInsts);
            log("结束检查山寨币合约交易量及未平仓量异动信号");
        } catch (e) {
            console.error(e);
        }

        // 15 分一次
        const delay = getDelay();
        await sleep(delay);
    });
};

const getDelay = () => {
    const now = new Date();
    let nextExecution = new Date(now);

    // 计算下一个执行时间
    const sec = 3;
    if (
        now.getMinutes() < 15 ||
        (now.getMinutes() === 15 && now.getSeconds() < sec)
    ) {
        nextExecution.setMinutes(15, sec); // 下一个15分03秒
    } else if (
        now.getMinutes() < 30 ||
        (now.getMinutes() === 30 && now.getSeconds() < sec)
    ) {
        nextExecution.setMinutes(30, sec); // 下一个30分03秒
    } else if (
        now.getMinutes() < 45 ||
        (now.getMinutes() === 45 && now.getSeconds() < sec)
    ) {
        nextExecution.setMinutes(45, sec); // 下一个45分03秒
    } else {
        // 超过45分，设置为下一个小时的03秒
        nextExecution.setMinutes(0, sec);
        nextExecution.setHours(now.getHours() + 1);
    }

    return nextExecution - now;
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

const check15MinDelta = async (fdvFilteredInsts) => {
    let msg = "";
    let ratios = [];
    for (let i = 0; i < fdvFilteredInsts.length; i++) {
        const inst = fdvFilteredInsts[i];
        const currBarTs = getCurr15MinBarStartTs();

        // 多取几根K线，根据当前时间戳过滤出前两根
        const openInterests = await binanceClient.getOpenInterestHist(
            inst,
            "15m",
            4
        );
        const lastTwoOiBars = getPreviousItems(
            openInterests,
            "timestamp",
            currBarTs,
            2
        );

        const volumes = await binanceClient.getKlines(inst, "15m", 4);
        const lastTwoVolBars = getPreviousItems(volumes, 0, currBarTs, 2);
        if (lastTwoOiBars.length == 2 && lastTwoVolBars.length == 2) {
            currHourOpenInterest = parseFloat(
                lastTwoOiBars[1].sumOpenInterestValue
            );
            lastHourOpenInterest = parseFloat(
                lastTwoOiBars[0].sumOpenInterestValue
            );

            const oiRatio = Math.abs(
                currHourOpenInterest / lastHourOpenInterest
            ); // 计算比率

            currBarVol = parseFloat(lastTwoVolBars[1][5]);
            lastBarVol = parseFloat(lastTwoVolBars[0][5]);

            const volRatio = Math.abs(currBarVol / lastBarVol); // 计算比率
            ratios.push({ inst, oiRatio, volRatio });
        }
        await sleep(100);
    }
    // 排序并打印前五条记录
    instRatios = ratios.filter((r) => r.oiRatio > 1);

    instRatios.sort((a, b) => {
        const bRatio = (b.oiRatio + b.volRatio) / 2;
        const aRatio = (a.oiRatio + a.volRatio) / 2;
        return bRatio - aRatio;
    });

    let ratioMsg = "";
    for (let i = 0; i < Math.min(5, instRatios.length); i++) {
        ratioMsg += `${instRatios[i].inst} - oiRatio: ${instRatios[i].oiRatio}, volRatio: ${instRatios[i].volRatio}\n`;
    }
    if (ratioMsg != "") {
        console.log(ratioMsg);
        tgClient.sendMsg(ratioMsg);
    }
};

main();
