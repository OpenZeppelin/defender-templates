# Monitor upgradable tokens

This template deploys a Defender Sentinel and other necessary Defender resources to monitor for upgrades and trigger a Slack alert  
It interacts with the following resources:  
- [Contracts](../../contracts/underlying-upgradable-token/)  
- [Scripts](../../scripts/underlying-upgradable-token/)  

Config files:  
- **addresses.{env}.yml**: Once deployed configure your proxy address [here](./addresses.dev.yml)
- **helper-hardhat-config.ts**: Configure your proxy address [here](../../scripts/underlying-upgradable-token/helper-hardhat-config.ts)

## Deployment :rocket:
:construction:  **Make sure to run all the commands from the root of the repo, unless otherwise specified.**  


1. If you want to deploy an upgradable token.

```sh
$ yarn hardhat run scripts/underlying-upgradable-token/deploy-upgradable-token.ts
```
2. **From inside this folder**. Deploy serverless stack.

```sh
$ serverless deploy
```

3. Upgrade token to V2. This should trigger the alert :rotating_light:

```sh
$ yarn hardhat run scripts/underlying-upgradable-token/upgrade-token.ts
```