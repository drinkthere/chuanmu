# requirements

-   coinmarketcap api key
-   telegram bot key and channel id

mv .env.bak .env
change to your coinmarketcap api key
change to your telegram bot token and channel id

# chuanmu

following chuanmu's strategy

# scripts

**genInstruments.js**
generate instruments in both Binance and Okx futures(swap) and spot.

scheduling run this script daily.

**genTotalSupply.js**
generate instruments' max supply and total supply configuration file for calculating FDV later.

scheduling run this script daily.

# strategy

**FDV AND OpenInterest Hourly Incr**
check instrument between fdvmin and fdvmax with hourly open interest incr exceed specific amount (such as 2m)

> node strategyContractHourlyIncr.js
