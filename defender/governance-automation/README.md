# Governance Automation

This Autotask will check for proposal events that have been emitted by the Governance contract. If a proposal has been passed, then the Autotask will queue it a Timelock or Execute it directly. If the proposal is already queued in the Timelock, the Autotask will check the ETA and execute it if possible. 

## Setting up
- Install all packages in the `defender` folder `npm install`
- Modify line `custom.governance-contract-address` in the `serverless.yml` file
- Configure and rename `../secret.example.yml` to `../secrets.dev.yml`
- Deploy serverless configuration with `serverless deploy`
- Log in to Defender and add funds to your newly deployed Relayer

## Optimizations

During the first run of the Autotask, it will scan from block zero to the latest block. It will then track the earliest block that still has an Active, Pending, Queued proposal. This block number will be stored in the `startingBlock`variable using the Defender KVStore. Future scans will from `startingBlock` to `latest` to reduce the number of blockchain calls.