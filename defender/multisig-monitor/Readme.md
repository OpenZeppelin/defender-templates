# Multisig Monitor

This template deploys a Defender Sentinel and other necessary Defender resources to monitor for all events on a Safe multisig.

- ChangedThreshold(uint256)
- AddedOwner(address)
- RemovedOwner(address)
- ApproveHash(bytes32,address)
- DisabledModule(address)
- EnabledModule(address)
- ExecutionFailure(bytes32,uint256)
- ExecutionFromModuleFailure(address)
- ExecutionFromModuleSuccess(address)
- ExecutionSuccess(bytes32,uint256)
- SignMsg(bytes32)
- ChangedFallbackHandler(address)
- ChangedGuard(address)
- SafeMultiSigTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes,bytes)
- SafeReceived(address,uint256)
- SafeSetup(address,address[],uint256,address,address)
- SafeModuleTransaction(address,address,uint256,bytes,uint8)

If there are events you don't want to be notified on just comment/remove them from [serverless.yml](./serverless.yml)
### Deploy and test

To test this part [spin up a new multisig](https://help.gnosis-safe.io/en/articles/3876461-creating-a-safe-on-a-web-browser) or use an existing one that you control.

1. Paste your multisig address in the _addresses.dev.yml_ file. This will indicate the sentinel the address that should be monitored. Now deploy the sentinel by deploying the serverless template

    ````sh
        $ serverless deploy
        ```
    ````

2. Go to the [Safe Portal](https://app.safe.global/) and add a new owner to your multisig. This will trigger the alert :rotating_light: