function sleep(ms = 0, cb) {
    if (cb) {
        return new Promise(() => {
            setTimeout(cb, ms);
        });
    } else {
        return new Promise((r) => setTimeout(r, ms));
    }
}

async function scheduleLoopTask(task, stopFunc) {
    const _loop = async () => {
        await task();
        if (stopFunc && stopFunc()) {
            return;
        }
        _loop();
    };
    _loop();
}

async function scheduleLoopTaskWithArgs(task, taskArgs, stopFunc) {
    const _loop = async (args) => {
        await task(...args); // 在这里调用task函数并传递参数
        if (stopFunc && stopFunc()) {
            return;
        }
        _loop(args);
    };
    _loop(taskArgs); // 调用闭包并传递taskArgs
}

module.exports = {
    sleep,
    scheduleLoopTask,
    scheduleLoopTaskWithArgs,
};
