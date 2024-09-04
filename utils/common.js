const fs = require("fs");
const path = require("path");

function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

function getDecimals(numString) {
    numString = numString.replace(/\.?0+$/, "");
    if (numString.includes(".")) {
        let decimalIndex = numString.indexOf(".");
        let decimals = numString.length - decimalIndex - 1;
        return decimals;
    } else {
        return 0;
    }
}

function convertScientificToString(scientificNumber) {
    const floatValue = parseFloat(scientificNumber);
    let stringValue = String(floatValue);
    if (stringValue.indexOf("-") >= 0) {
        stringValue = "0" + String(Number(stringValue) + 1).slice(1);
    }
    return stringValue;
}

function fileExists(filePath) {
    try {
        // 使用 fs.accessSync() 方法来检查文件是否存在
        fs.accessSync(filePath, fs.constants.F_OK);
        return true; // 文件存在
    } catch (error) {
        console.error(error);
        return false; // 文件不存在或无法访问
    }
}

function deleteFilesInDirectory(directory) {
    fs.readdir(directory, (err, files) => {
        if (err) {
            console.error("Error reading directory:", err);
            return;
        }

        // 遍历目录中的所有文件
        files.forEach((file) => {
            const filePath = path.join(directory, file);

            // 删除文件
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error("Error deleting file:", err);
                    return;
                }
                console.log("Deleted file:", filePath);
            });
        });
    });
}

// 将字符串写入文件
function writeStringToFile(filePath, content) {
    fs.writeFileSync(filePath, content, (err) => {
        if (err) {
            console.error("Error writing to file:", err);
            return;
        }
        console.log("Content has been written to", filePath);
    });
}

function getCurr15MinBarStartTs() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    let targetMinutes;

    if (minutes >= 0 && minutes <= 14) {
        targetMinutes = 0;
    } else if (minutes >= 15 && minutes <= 29) {
        targetMinutes = 15;
    } else if (minutes >= 30 && minutes <= 44) {
        targetMinutes = 30;
    } else if (minutes >= 45 && minutes <= 59) {
        targetMinutes = 45;
    }

    // 创建目标时间的 Date 对象
    const targetTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        targetMinutes,
        0
    );

    // 返回目标时间的毫秒时间戳
    return targetTime.getTime();
}

// 根据时间戳过滤出前num根bar
function getPreviousItems(dataArray, tskey, targetTimestamp, num = 2) {
    // 过滤出目标时间戳之前的所有项
    const filteredItems = dataArray.filter(
        (item) => item[tskey] < targetTimestamp
    );

    // 返回最后两项
    return filteredItems.slice(-num);
}

module.exports = {
    chunkArray,
    getDecimals,
    convertScientificToString,
    fileExists,
    deleteFilesInDirectory,
    writeStringToFile,
    getCurr15MinBarStartTs,
    getPreviousItems,
};
