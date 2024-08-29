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

module.exports = {
    chunkArray,
    getDecimals,
    convertScientificToString,
    fileExists,
    deleteFilesInDirectory,
    writeStringToFile,
};