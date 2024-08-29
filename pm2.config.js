module.exports = {
    apps: [
        {
            name: "genInstrument",
            script: "genInstruments.js",
            args: "",
            out_file: "logs/inst-out.log",
            error_file: "logs/inst-error.log",
        },
        {
            name: "genSupply",
            script: "genSupply.js",
            args: "",
            out_file: "logs/supply-out.log",
            error_file: "logs/supply-error.log",
        },
        {
            name: "strategyContractHourlyIncr",
            script: "strategyContractHourlyIncr.js",
            args: "",
            out_file: "logs/incr-out.log",
            error_file: "logs/incr-error.log",
        },
    ],
};
