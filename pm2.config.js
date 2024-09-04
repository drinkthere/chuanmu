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
        {
            name: "strategy15MinVolOIDelta",
            script: "strategy15MinVolOIDelta.js",
            args: "",
            out_file: "logs/15min-out.log",
            error_file: "logs/15min-error.log",
        },
    ],
};
