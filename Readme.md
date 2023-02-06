# ETHDenver - OpenZeppelin Defender Integration

This repository contains templates for all tracks of the 2023 BUIDLathon. They are meant to be a place to get inspiration and kickstart your project. 

-   DeFi
-   NFTs, Gaming & the Metaverse
-   Infrastructure & Scalability
-   Impact + Public Goods
-   DAOs + Community

The templates are structured by use case, which matches to one or more tracks.

---
## What is defender serverless? 

Defender serverless is a way to have infra as code. With these templates you can build complex monitoring and automation workflow and perhaps even escape need of building any backend at all! 


## Usage

We have three basic building primitives:
 - **Relayers**: Send transactions via a regular HTTP API, and takes care of private key secure storage, transaction signing, nonce management, gas pricing estimation, and resubmissions. 
 - **Sentinels**: Monitor transactions to a contract by defining conditions on events, functions, transaction parameters.
 - **Autotasks**: Run code snippets on a regular basis, via webhooks, or in response to a transaction

As well as auxuallary resources such as 
 - **contracts**: Information about your smart contract and it's methods 
 - **policies**: Rules for Relayers on how to submit transactions
 - **secrets**: Key value pairs that you can store safely in Defender platform
 - **notifications**: Configuration on how you want to receive notifications 

### Working with smart contracts

In order to orchistrate and monitor contracts defender will need to know addresses, chain and ABI's. 
Best way to get ABI's compatible with serverless: First copy `sample.env`, fill it with required secrets and source it. Have your contracts in `/contracts` directory and run `yarn compile`. This will populate `./abi` directory 

You can also run `yarn deploy` to deploy to various networks. We reccomend to store deployed addresses in JSON such as `./deployments/mainnet.json` such way you can import those in to autotasks or serverless configurations. 


### Setup Defender
In order to use these templates you first need to register on https://defender.openzeppelin.com . Starter account is quite powerful enough to get you running for a while. 

Once you have your account, generate API key and secret from https://defender.openzeppelin.com/#/api-keys

You can invite your teammates to collaborate at [user management dashboard](https://defender.openzeppelin.com/#/user-roles). Take note that for this to work invitee email shall be not yet registered at Defender. WIP! 

In `./defender` directory you will find `sample.secrets.yaml`! copy it to `./defender/.secrets/dev.yml` and fill it with API key and secret. Webhooks that you are going to use to post notifications to are to be added there as well! 

### Structure of serverless plugin 101

Each serverless file must have `provider` and `defender` properties defined:
```yml
provider:
  stage: ${opt:stage, 'dev'} # this will default your stage to dev
  stackName: 'my-name' # this is basically your project name 
  ssot: false # if this is enabled, than this serverless file is only SingleSourceOfTruth and will override any other resources in account
defender:
  key: <API key>
  secret: <API Secret>
```
Everything rest is optional. 

Autotasks are defined under `functions` property:
```yml
functions:
  my-awesome-autotask:
    path: ${file(<file_path_to_the_script>)}
    relayer: <relayer_object> #if you are using Relayer in Resources you can import it here, see /defender/poap/serverless.yml for example

```
Other resources defined in resources.Resources:
```yml
resources:
  Resources:
    contracts:
    policies:
    sentinels:
    relayers:
    notifications:
```
To understand more how to define your Defender infrastructure resources - best place is to refer to [types definition](https://github.com/OpenZeppelin/defender-serverless/blob/main/src/types/index.ts).
Types used in serverless are prefixed by `Y`: `YSentinel` type describes how to define sentinel.  

### Building an autotask
Autotasks are small code snippets that you can upload to Defender platform. You can call them from sentinel, via schedule, or via webhook. You can refer to those in serverless plugin as objects passed to sentinels. 

Autotasks are executed in a node 16 runtime with 256mb RAM and a 5-minute timeout. Code snippets are restricted to be smaller than 5mb in size.

For ease-of-use, a set of common dependencies are pre-installed in the environment:
```
"@datadog/datadog-api-client": "^1.0.0-beta.5",
"@gnosis.pm/safe-core-sdk": "^0.3.1",
"@gnosis.pm/safe-ethers-adapters": "^0.1.0-alpha.3",
"axios": "0.21.2",
"axios-retry": "3.1.9",
"defender-admin-client": "1.37.0-rc.2",
"defender-autotask-client": "1.37.0-rc.2",
"defender-autotask-utils": "1.34.0",
"defender-kvstore-client": "1.37.0-rc.2",
"defender-relay-client": "1.37.0-rc.2",
"defender-sentinel-client": "1.37.0-rc.2",
"ethers": "5.5.3",
"fireblocks-sdk": "^2.3.2",
"graphql": "^15.5.1",
"graphql-request": "3.4.0",
"web3": "1.3.6"
```

If you need to use any dependency not listed above, you can either use a javascript module bundler such as rollup. Refer to `./defender/poap/` for an example of how to build rollup autotask and deploy it. 

To understand more how to use autotask refer to [docs](https://docs.openzeppelin.com/defender/autotasks). To understand what kind of arguments you are getting in to autotask main function read [autotask type definitions](https://github.com/OpenZeppelin/defender-client/blob/ebfb74c29a3cb6509d32919c7a9ff6bfba6f24eb/packages/autotask-utils/src/types.ts)


### Deploying 

Once your project is well defined you can deploy your infra to Defender by hitting `sls deploy` or in some of the templates: `yarn defender` (will compile autotasks and deploy)


## Templates
### [Underlying asset monitor](defender/underlying-upgradable-token/Readme.md)

Most DeFi protocols face risks when integrating with upgradable tokens that are outside of the protocol's reach.  
This section shows how to monitor upgradable tokens and emit an alert :rotating_light: if they get updated.

### [Multisig Monitor](defender/multisig-monitor/Readme.md)
Most protocols have some dependency on a multisig that has special powers granted by the community. It is good practice to monitor events on that multisig.  
This template shows how to monitor for administrative events in the multisig, such as changes in the owners and threshold.

### [Auto fund chainlink subscription when funds are low](defender/auto-fund-chainlink-subscription/Readme.md)
[Chainlink VRF](https://docs.chain.link/vrf/v2/introduction) is one of the most popular options for achieving provable randomness in a blockchain. It can be used for raffles, gaming and other use cases. Wouldn't it be great if you can monitor when funds are running low and automatically fund the subscription?  

### [Gasless POAP minting](defender/poap/README.md)
Lightweight and effective Proof of Attendance Protocol implementation with Defender. The POAP can be ERC721/1555/20 depending on configuration.

In This POAP user (client) first needs to sign a message through his wallet such as metamask, that contains his address and some other typed message fields that developer can specify - name, email etc. 
Then client can POST to autotask webhook with his message and signature in request body. 

In autotask script, developer can verify that data and perhaps send it to CMS, and mint token with use of Relayer.  

### [Governor Automation](defender/governor-automation/README.md)

This Autotask will check for proposal events that have been emitted by an [OpenZepplin Governor](https://docs.openzeppelin.com/contracts/4.x/api/governance) or [OpenZepplin GovernorCompatibilityBravo](https://docs.openzeppelin.com/contracts/4.x/api/governance#GovernorCompatibilityBravo) contract.

If a proposal has been passed (has a state of Succeeded), then the Autotask will queue it in a Timelock (if a Timelock exists) or execute it directly (if no Timelock exists). If the proposal is already queued in a Timelock, the Autotask will check when the proposal can be executed (by checking the ETA value) and execute it if possible.

### [Monitor ERC721 transfers](defender/monitor-erc721-transfers/README.md)
This simple template adds ability to monitor for ERC721 token transfers and send notifications.
BY Default we send notifications in slack, however you are free to use your custom webhook as well 



---
## Additional Resources

-   [Defender Docs](https://docs.openzeppelin.com/defender/)
-   [Defender Serverless Docs](https://docs.openzeppelin.com/defender/serverless-plugin)
-   [Defender Serverless Repo](https://github.com/OpenZeppelin/defender-serverless)
-   [Defender Playlist](https://www.youtube.com/playlist?list=PLdJRkA9gCKOMdqVKrkYKT6ulDwDVG6_Ya)
-   [Autotask type definitions](https://github.com/OpenZeppelin/defender-client/blob/ebfb74c29a3cb6509d32919c7a9ff6bfba6f24eb/packages/autotask-utils/src/types.ts)
-   [Serverless types definition](https://github.com/OpenZeppelin/defender-serverless/blob/main/src/types/index.ts)
