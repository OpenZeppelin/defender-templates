# OpenZeppelin Defender Templates

This repository contains Defender templates built in preparation for the ETHDenver hackathon to be used for projects participating in the OpenZeppelin Defender Bounty. These templates are meant to be a place to get inspiration and kickstart your project. 

---
## What is Defender Serverless? 

Defender Serverless is a way to build your off-chain infrastructure as code. With these templates you can build complex monitoring and automation workflows and perhaps even escape the need of building a stand-alone backend at all! 


## Usage

We have three basic building primitives:
 - **Relayers**: Send transactions via a regular HTTP API with secure private key storage, transaction signing, nonce management, gas pricing estimation, and resubmissions. 
 - **Sentinels**: Monitor transactions to a contract by defining conditions on events, functions, and transaction parameters.
 - **Autotasks**: Run serverless JS code on a regular basis, via webhooks, or in response to a transaction

As well as auxiliary resources such as:
 - **contracts**: Information about your smart contract and its methods 
 - **policies**: Rules for Relayers on how to submit transactions
 - **secrets**: Key value pairs that you can store safely in Defender platform
 - **notifications**: Configuration on how you want to receive notifications 

### Working with smart contracts

In order to orchestrate and monitor smart contracts, Defender will need to know addresses, chain IDs, and ABIs. 
The best way to get ABIs compatible with Serverless is to:
1. `mv sample.env .env`, fill it with required secrets
2. Place your contracts in the `/contracts` directory 
3. Run `yarn compile`. This will populate the `./abi` directory 

You can also run `yarn deploy` to deploy to various networks. We recommend storing deployed addresses in a JSON file such as `./deployments/mainnet.json`so that you can import those into Autotasks or Serverless configurations. 


### Setup Defender
In order to use these templates you must first [create a Defender account](https://defender.openzeppelin.com). A free trial account is powerful enough to get you running for a hackathon or PoC. *Note: Each unique email address can only be associated with one Defender account.* 

Once you have created a Defender account, [generate an API key and and a Secret key](https://defender.openzeppelin.com/#/api-keys) so that you can programmatically interact with the Defender API without having to use the Web UI. *Note: Ensure that you have copied both keys to a local file on your development machine. The Secret key will only be visible ONCE and will not be accessible again.*

You can invite your teammates to collaborate through the [user management dashboard](https://defender.openzeppelin.com/#/user-roles).  A single Defender account may have multiple unique email addresses added as collaborators. *Note: The invitee email cannot yet be registered to another Defender account in order to be invited.*

In the `./defender` directory you will find `sample.secrets.yaml`. Copy it to `./defender/.secrets/dev.yml` and add your API key and Secret key to it. Any webhooks that you are going to use to post notifications should be added there as well (e.g. Discord, Telegram).

### Serverless Plugin Structure 101

Each Serverless file must have the `provider` and `defender` properties defined:
```yml
provider:
  stage: ${opt:stage, 'dev'} # if no stage is specified, this will use the default value of 'dev'
  stackName: 'my-name' # Serverless organizes deployed resources into 'stacks' so use this as a descriptive name for what your resources will do, such as 'governor-monitor' or 'token-balance-refiller'
  ssot: false # if this is enabled, then this Serverless file acts as the "SingleSourceOfTruth" and will override any other resources in account
defender:
  key: <API key>
  secret: <Secret key>
```
Everything else is optional. 

Autotasks are defined under the `functions` property:
```yml
functions:
  my-awesome-autotask:
    path: '<relative_path_to_the_dirctory_containing_an_index.js>'
    relayer: <relayer_object> #if you are using a Relayer from the Resources section, you can import it here, see /defender/poap/serverless.yml for an example

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
To better understand how to define your Defender infrastructure resources, a good reference is the [types definition](https://github.com/OpenZeppelin/defender-serverless/blob/main/src/types/index.ts) code.
The types used by the Defender Serverless Plugin are prefixed by `Y`. For example, the `YSentinel` type describes how to define a Sentinel.  

### Building an Autotask
[Autotasks](https://docs.openzeppelin.com/defender/autotasks) are small JS code snippets that you can upload to the Defender platform. Autotasks can be executed in the following ways:
- Sentinel Condition - If all of the transaction, event, and function conditions within a Sentinel are met, the Autotask code will be executed and its return value to the Sentinel will determine whether or not that Sentinel "triggers," thereby sending notifications to the configured channels (email, chat application, etc.)
- Sentinel Trigger - After a Sentinel has triggered, an Autotask can be executed, perhaps for the purpose of sending data to an external API or creating an on-chain transaction to be executed by a Relay
- Scheduled - Execute an Autotask on a specific schedule, effectively set up as a `cron` job.
- Webhook - Executed whenever an external HTTP request is sent to the Autotask URL. This URL is created when the "webhook" option is selected.
- Manual - Executed when a button is clicked in the Defender Web UI.

You can refer to the Serverless Plugin documentation, code, and example configuration files to see how these values are specified for Sentinels.

Autotasks are executed in a node 16 runtime with 256mb RAM and a 5-minute timeout. Code snippets are restricted to be smaller than 5mb in size.

For ease of use, a [set of common dependencies are pre-installed in the environment](https://docs.openzeppelin.com/defender/autotasks#environment):
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

If you need to use any dependency not listed above, you can use a JavaScript module bundler such as [rollup](https://www.npmjs.com/package/rollup). Refer to `./defender/poap/` for an example of how to build a rollup for an Autotask and deploy it. 

To learn more about how to use Autotasks, refer to the [Defender Autotask documentation](https://docs.openzeppelin.com/defender/autotasks). To understand what arguments are passed to the main Autotask function, refer to the [Autotask type definitions](https://github.com/OpenZeppelin/defender-client/blob/ebfb74c29a3cb6509d32919c7a9ff6bfba6f24eb/packages/autotask-utils/src/types.ts)


### Deploying with the Serverless Plugin

Once your project is well defined you can deploy your infrastructure to your Defender account with the following approaches:
- All templates: `sls deploy`
- Some of the templates: `yarn defender` (will compile Autotasks and deploy)


## Templates
### [Underlying Asset Monitor](defender/underlying-upgradable-token/Readme.md)

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

### [Governance Alert](defender/governance_alert/README.md)
This Autotask will monitor and alert on events emitted by a Governance contract.

### [Governance Summary](defender/governance_summary/README.md)
This Autotask will periodically check a Governance contract for active proposals and display the current vote count, quorum threshold status, and remaining time to vote.

### [Governance(GovernorCompatibilityBravo) Summary](defender/governance_bravo_summary/README.md)
This Autotask will periodically check a GovernanceCompatibilityBravo contract for active proposals and display the current vote count, quorum threshold status, and remaining time to vote.

### [Bridge Automation for Arbitrum Wallet Addresses](defender/bridge-automation/README.md)
This Autotask will monitor for low funds on a specified address on Arbitrum and will automatically bridge funds from a wallet address on the L1 side (Ethereum Mainnet) to the L2 side (Arbitrum).

### [Contract Wizard Deployer](defender/contract-wizard-deployer/README.md)
This Hardhat script enables developers to take Solidity files that are downloaded from Open Zeppelin's [Contract Wizard](https://wizard.openzeppelin.com/), deploy them using a [Defender Relay](https://defender.openzeppelin.com/#/relay), and upload them to [Defender Admin](https://defender.openzeppelin.com/#/admin).

---
## Additional Resources

-   [Defender Docs](https://docs.openzeppelin.com/defender/)
-   [Defender Serverless Docs](https://docs.openzeppelin.com/defender/serverless-plugin)
-   [Defender Serverless Repo](https://github.com/OpenZeppelin/defender-serverless)
-   [Defender Playlist](https://www.youtube.com/playlist?list=PLdJRkA9gCKOMdqVKrkYKT6ulDwDVG6_Ya)
-   [Autotask type definitions](https://github.com/OpenZeppelin/defender-client/blob/ebfb74c29a3cb6509d32919c7a9ff6bfba6f24eb/packages/autotask-utils/src/types.ts)
-   [Serverless types definition](https://github.com/OpenZeppelin/defender-serverless/blob/main/src/types/index.ts)
