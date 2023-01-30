# Governance Automation

This Autotask will check for proposal events that have been emitted by an [OpenZepplin Governance](https://docs.openzeppelin.com/contracts/4.x/api/governance) contract.

If a proposal has been passed (has a state of Succeeded), then the Autotask will queue it in a Timelock (if a Timelock exists) or execute it directly (if no Timelock exists). If the proposal is already queued in a Timelock, the Autotask will check when the proposal can be executed (by checking the ETA value) and execute it if possible. 

## Setting up
- Install all packages in the `defender` folder using `npm install`
- Modify line `custom.governance-contract-address` in the `serverless.yml` file
- Configure and rename `../secret.example.yml` to `../secrets.dev.yml`
- Deploy serverless configuration with `serverless deploy`
- Log in to Defender and add funds to your newly deployed Relay

## Optimizations

During the first run of the Autotask, it will scan from block zero to the latest block. It will then track the earliest block that still has an Active, Pending, Queued proposal. This block number will be stored in the `startingBlock` variable using the Defender KVStore. Future scans will from `startingBlock` to `latest` to reduce the number of blockchain calls.