const { EMA, OBV } = require("technicalindicators");
const { sleep } = require("./utils/run");
const BinanceClient = require("./clients/binance");
const TgClient = require("./clients/tg");

const binanceClient = new BinanceClient();
const tgClient = new TgClient();

// 计算 DMI
function calculateDMI(highPrices, lowPrices, closePrices, period = 14) {
    const plusDM = [];
    const minusDM = [];
    const tr = [];

    for (let i = 1; i < highPrices.length; i++) {
        const highDiff = highPrices[i] - highPrices[i - 1];
        const lowDiff = lowPrices[i - 1] - lowPrices[i];

        const plusDMValue = highDiff > 0 && highDiff > lowDiff ? highDiff : 0;
        const minusDMValue = lowDiff > 0 && lowDiff > highDiff ? lowDiff : 0;

        plusDM.push(plusDMValue);
        minusDM.push(minusDMValue);

        // 计算 TR
        const trValue = Math.max(
            highPrices[i] - lowPrices[i],
            Math.abs(highPrices[i] - closePrices[i - 1]),
            Math.abs(lowPrices[i] - closePrices[i - 1])
        );
        tr.push(trValue);
    }

    // 计算平滑的 +DM 和 -DM
    const avgPlusDM = plusDM.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgMinusDM =
        minusDM.slice(-period).reduce((a, b) => a + b, 0) / period;
    const avgTR = tr.slice(-period).reduce((a, b) => a + b, 0) / period;

    const plusDI = (avgPlusDM / avgTR) * 100;
    const minusDI = (avgMinusDM / avgTR) * 100;

    return { plusDI, minusDI };
}

// 计算指标
async function calculateIndicators(symbol) {
    const response = await binanceClient.getKlines(symbol, "1d", 500);
    const kLines = response.map((kline) => ({
        openTime: new Date(kline[0]),
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
    }));
    // 提取收盘价和成交量
    const closePrices = kLines.map((k) => k.close);
    const volumes = kLines.map((k) => k.volume);
    const highPrices = kLines.map((k) => k.high);
    const lowPrices = kLines.map((k) => k.low);

    // 计算 EMA200
    const ema200 = EMA.calculate({ period: 200, values: closePrices });

    // 计算 DMI
    const dmi = calculateDMI(highPrices, lowPrices, closePrices);

    // 计算 OBV
    const obvValues = OBV.calculate({ close: closePrices, volume: volumes });

    // 计算 OBV 的 EMA30
    const obvEma30 = EMA.calculate({ period: 30, values: obvValues });

    // 获取最后一根 K 线的收盘价
    //const lastClosePrice = kLines[kLines.length - 1].close;

    return {
        ema200,
        dmi,
        obv: obvValues,
        obvEma30,
        kLines, // 返回最后一根 K 线的收盘价
    };
}

const main = async () => {
    // 获取futures全部的symbols
    const symbols = require("./configs/instrument.json");
    for (let symbol of Object.values(symbols)) {
        calculateIndicators(symbol)
            .then((indicators) => {
                const ema200Prev =
                    indicators.ema200[indicators.ema200.length - 2];
                const ema200 = indicators.ema200[indicators.ema200.length - 1];
                const pdmi = indicators.dmi.plusDI;
                const mdmi = indicators.dmi.minusDI;
                const obv = indicators.obv[indicators.obv.length - 1];
                const obvema30 =
                    indicators.obvEma30[indicators.obvEma30.length - 1];
                const closePrice =
                    indicators.kLines[indicators.kLines.length - 1].close;
                const closePricePrev =
                    indicators.kLines[indicators.kLines.length - 1].close;
                // console.log("Prev EMA200:", ema200Prev);
                // console.log("EMA200:", ema200);
                // console.log("PDMI:", pdmi);
                // console.log("MDMI:", mdmi);
                // console.log("OBV:", obv);
                // console.log("OBV EMA30:", obvema30);
                // console.log("Close Price:", closePrice);
                // console.log("Prev Close Price:", closePrice);
                // console.log(
                //     symbol,
                //     closePricePrev,
                //     closePrice,
                //     ema200Prev,
                //     ema200,
                //     obv,
                //     obvema30
                // );
                if (closePricePrev > ema200Prev && closePrice < ema200) {
                    // 下穿ema200均线
                    if (obv < obvema30) {
                        //if (pdmi < mdmi && obv < obvema30) {
                        // obv在ema30 下方
                        // dmi下降中
                        const msg = `${symbol} ready to short`;
                        tgClient.sendMsg(msg);
                        console.log(msg);
                    } else {
                        console.log(symbol, "no ready to short signal");
                    }
                } else if (closePricePrev < ema200Prev && closePrice > ema200) {
                    // 上穿ema200均线
                    if (obv > obvema30) {
                        //if (pdmi > mdmi && obv > obvema30) {
                        // obv 在ema30 上方
                        // dmi在上升中
                        const msg = `${symbol} ready to long`;
                        tgClient.sendMsg(msg);
                        console.log(msg);
                    } else {
                        console.log(symbol, "no ready to long signal");
                    }
                } else {
                    if (Math.abs(closePrice - ema200) / closePrice < 0.01) {
                        // 收盘价距离ema200 < 1%的标的
                        if (closePrice < ema200) {
                            // 在ema200下，等待上升突破
                            if (obv > obvema30) {
                                //if (pdmi > mdmi && obv > obvema30) {
                                const msg = `${symbol} prepare to long`;
                                tgClient.sendMsg(msg);
                                console.log(msg);
                            } else {
                                console.log(
                                    symbol,
                                    "no prepare to long signal"
                                );
                            }
                        } else if (closePrice > ema200) {
                            // 在ema200上，等待下降突破
                            if (obv < obvema30) {
                                //if (pdmi < mdmi && obv < obvema30) {
                                const msg = `${symbol} prepare to short`;
                                tgClient.sendMsg(msg);
                                console.log(msg);
                            } else {
                                console.log(
                                    symbol,
                                    "no prepare to short signal"
                                );
                            }
                        }
                    } else {
                        console.log(symbol, "no signal");
                    }
                }
            })
            .catch((err) => {
                console.error(
                    "Error fetching data or calculating indicators:",
                    err
                );
            });
        await sleep(1000);
    }
};
main();
