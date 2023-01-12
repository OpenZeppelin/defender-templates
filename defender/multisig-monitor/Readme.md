# Multisig Monitor

This template deploys a Defender Sentinel and other necessary Defender resources to monitor for the following events on a Safe multisig.

-   ChangedThreshold(uint256 threshold)
-   AddedOwner(address owner)
-   RemovedOwner(address owner)

### Deploy and test

To test this part [spin up a new multisig](https://help.gnosis-safe.io/en/articles/3876461-creating-a-safe-on-a-web-browser) or use an exsiting one that you control.

1. Paste your multisig address in the _addresses.dev.yml_ file. This will indicate the sentinel the address that should be monitored. Now deploy the sentinel by deploying the serverless template

    ````sh
        $ serverless deploy
        ```
    ````

2. Go to the [Safe Portal](https://app.safe.global/) and add a new onwer to your multisig. This will trigger the alert :rotating_light: