# Monitor Upgradable Tokens

This template deploys a Defender Sentinel and other necessary Defender resources to monitor for upgrades. It will trigger a Slack alert
if the monitored proxy address is upgraded. This template interacts with the following resources: 
- [Contracts](../../contracts/underlying-upgradable-token/)
- [Scripts](../../scripts/underlying-upgradable-token/)

### Environment Variables Setup For Goerli Testnet

- In the root directory, create an `.env` file with the following fields:
  - `GOERLI_RPC_URL: <RPC URL goes here>`
  - `PRIVATE_KEY: <Private Key of deployer address goes here>`

## Defender Account Setup

- In your [Defender account](https://defender.openzeppelin.com/), select the Hamburger icon in the upper right corner and click on **Team API Keys**
- In the Team API Keys screen, click **Create API Key**
- Make sure that the option for **Manage Sentinels** is selected (we do not make use of the **Manage Proposals and Contracts, Manage Relayers, and Manage Autotasks** options)
- Click **Save**
- Copy your API key and Secret key to a local file (you will **NOT** be able to view your Secret key again after this message box goes away)
- Make sure that you really did copy your API key and Secret key to a local file
- Check the box for **I’ve written down the secret key** and select **Close**

## Deployment and Testing :rocket:

In the `defender` directory, perform the following steps:

- A secrets file can be created for each stage of production. We will create one for development:
  - Copy and rename the `sample.secrets.yml` to `.secrets/dev.yml`
  - Modify the lines in the `.secrets/dev.yml` file, replacing the portion in the angle brackets `<>` with your API and Secret keys, as indicated:
    - `defender-api-key: <API Key goes here>`
    - `defender-api-secret: <Secret key goes here>`
    - `slack-webhook: <SLACK webhook goes here>`
    - `email-address: <EMAIL address goes here>`
  - Note that by default we are sending notifications in Slack, but you are free to use your custom webhook as well
- Change directories to the stack that will be deployed
  - `cd underlying-upgradable-token`
- A configuration file can be created for each stage of production. We will create one for development:
  - Copy and rename `sample.config.yml` to `config.dev.yml`
  - Open the file and modify the following value:
    - `proxy-address` (fill in your proxy address here once your upgradable proxy is upgraded following the steps below)
    - `network`
- In your `helper-hardhat-config.ts` [file](../../scripts/helper-hardhat-config.ts), configure your proxy address (this will be done after deploying the proxy contract).
  - We will be using Goerli Testnet to test, so make sure the `proxyAddress` field under Goerli is filled in with your proxy address (after the proxy is deployed).


:construction:  **Make sure to run all the commands from the root of the repo, unless otherwise specified.**  

1. Deploy an upgradable token on Goerli (run the command from the root of the repo):
```sh
$ yarn hardhat run scripts/underlying-upgradable-token/deploy-upgradable-token.ts --network goerli
```
- The terminal will now print out the address of your deployed proxy contract.
  - Paste this address into the `proxy-address` field of the `config.dev.yml` file
  - Paste this address into the `proxyAddress` field of your `helper-hardhat-config.ts` [file](../../scripts/helper-hardhat-config.ts)

2. **From inside this directory (`underlying-upgradable-token`)**. Deploy the serverless stack:
```sh
$ serverless deploy
```

3. Upgrade token to V2 (run the command from the root of the repo). This should trigger the alert :rotating_light:
```sh
$ yarn hardhat run scripts/underlying-upgradable-token/upgrade-token.ts --network goerli
```