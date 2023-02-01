# Governor Automation

This Autotask will check for proposal events that have been emitted by an [OpenZepplin Governor](https://docs.openzeppelin.com/contracts/4.x/api/governance) or [OpenZepplin GovernorCompatibilityBravo](https://docs.openzeppelin.com/contracts/4.x/api/governance#GovernorCompatibilityBravo) contract.

If a proposal has been passed (has a state of Succeeded), then the Autotask will queue it in a Timelock (if a Timelock exists) or execute it directly (if no Timelock exists). If the proposal is already queued in a Timelock, the Autotask will check when the proposal can be executed (by checking the ETA value) and execute it if possible.

## Optimizations

During the first run of the Autotask, it will scan from block zero to the latest block. It will then track the earliest block that still has an Active, Pending, Queued proposal. This block number will be stored in the `startingBlock` variable using the Defender KVStore. Future scans will from `startingBlock` to `latest` to reduce the number of blockchain calls.

## Defender Account Setup

- In your [Defender account](https://defender.openzeppelin.com/), select the Hamburger icon in the upper right corner and click on **Team API Keys**
- In the Team API Keys screen, click **Create API Key**
- Make sure that the options for **Manage Relayers**, **Manage Autotasks**, and **Manage Sentinels** are selected (we do not make use of the **Create Admin proposals and contracts** option)
- Click **Save**
- Copy your API key and Secret key to a local file (you will **NOT** be able to view your API secret again after this message box goes away)
- Make sure that you really did copy your API key and Secret key to a local file
- Check the box for **I’ve written down the secret key** and select **Close**

## Local Code Setup

In the `defender` directory, perform the following steps:

- Run `npm i` to install the necessary Node packages
- Copy and rename the `secret-example.yml` to `secrets.dev.yml`
- Modify the two lines in the `secrets.dev.yml` file, replacing the portion in the angle brackets `<>` with your Defender API key and secret key, as indicated:
  - `api: <API Key goes here>`
  - `secret: <API Secret goes here>`
- Change directories to the stack that will be deployed
  - `cd governance-automation`
- Modify the line with `custom.governance-contract-address` in the `serverless.yml` file
- Run `serverless deploy` to deploy the stack to Defender

## Local testing with Hardhat

In order to run tests against a forked version of the mainnet, you will need a JSON RPC server with access to an archive node. Both Alchemy's and Infura's free plans will suffice.

### Running the Hardhat node

In the `defender` directory, perform the following steps:

- Run `npm i` to install the necessary Node packages
- Run `npx hardhat node` to start the node

In another terminal, navigate to the `defender` directory and then:

- Create or modify an `.env` file in this directory
  - Add `ETHEREUM_MAINNET_JSON_RPC_URL=<JSON RPC URL>` to `.env` file, replacing the angle brackets `<>` with your actual RPC URL (ex. https://eth-mainnet.g.alchemy.com/v2/xxxx or https://mainnet.infura.io/v3/xxxx)
- To test the Autotask against a generic Governor contract, run:
  - `npx jest governor-automation/tests/generic-governor-automation.hh.spec.js`
- To test the Autotask against a Governor Compatibility Bravo contract, run:
- `npx jest governor-automation/tests/governor-bravo-automation.hh.spec.js`

To stop the Hardhat node, switch back the first terminal and press `CTRL-C` or `Command-C` (for Mac OS).
