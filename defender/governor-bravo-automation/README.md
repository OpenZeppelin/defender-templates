# Governor Bravo Automation

This Autotask will query all proposals that have been created by a [Governor Bravo](https://docs.compound.finance/v2/governance/) contract. If a proposal has been passed, then the Autotask will queue it. If the proposal is already queued, then Autotask will check the ETA and execute it, if possible. 

## Setting up
- Install all packages in the `defender` folder `npm install`
- Modify line `custom.governance-contract-address` in the `serverless.yml` file
- Configure and rename `../secret.example.yml` to `../secrets.dev.yml`
- Deploy serverless configuration with `serverless deploy`
- Log in to Defender and add funds to your newly deployed Relay

## Optimizations

During the first run of the Autotask, it will scan from proposal zero to `proposalCount`. It will then check the status of each. Proposals in a terminal state (canceled, defeated, executed, or expired) will be stored in the `proposalIdsToIgnore` variable using the Defender KVStore. Future scans will skip over these proposals to reduce the number of blockchain calls.