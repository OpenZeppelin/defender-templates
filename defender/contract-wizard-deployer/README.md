# Contract Wizard Deployer

This Hardhat script enables developers to take Solidity files that are downloaded from Open Zeppelin's [Contract Wizard](https://wizard.openzeppelin.com/) and deploy using a [Defender Relay](https://defender.openzeppelin.com/#/relay) and then upload them to [Defender Admin](https://defender.openzeppelin.com/#/admin).

## Setup

### Defender API Keys

- In your [Defender account](https://defender.openzeppelin.com/), select the Hamburger icon in the upper right corner and click on **Team API Keys**
- In the Team API Keys screen, click **Create API Key**
- Make sure that the options for **Manage Proposals and Contracts** is selected (we do not make use of the **Manage Relayers**, **Manage Autotasks**, and **Manage Sentinels** options with this template)
- Click **Save**
- Copy your API key and Secret key to a local file (you will **NOT** be able to view your API secret again after this message box goes away)
- Make sure that you really did copy your API key and Secret key to a local file
- Check the box for **I’ve written down the secret key** and select **Close**

### Relay API Keys

(Currently, only Ethereum Mainnet and Goerli networks are supported by this script)

- In your [Defender account](https://defender.openzeppelin.com/), select the **◎ Relay** link on the upper left side to get to the Relay Dashboard
- If you do not have a Relay on the network that you want to deploy to, create one:
  - In the Relay Dashboard screen, click **Create Relayer** in the upper right corner
  - Pick a meaningful name, choose the network that you want to deploy to, and click **Create**
- Click on the the existing Relay that you would like to use for deployments
- Click on the gear/cog **⚙** at the top middle and choose **+ Create new API key**
- Copy your Ethereum Address, API key, and Secret key to a local file (you will **NOT** be able to view your API secret again after this message box goes away)
- Make sure that you really did copy your API key and Secret key to a local file
- Check the box for **I’ve written down the secret key** and select **Close**

### Local Code Setup

In the `defender/contract-wizard-deployer` directory, perform the following steps:

- A secrets file can be created for each stage of production. We will create one for development
  - Copy and rename the `sample.secrets.yml` to `.secrets/dev.yml`
  - Modify the two lines in the `.secrets/dev.yml` file, replacing the portion in the angle brackets `<>` with your Defender API key and secret key, as indicated:
  - `defender-api-key: <API Key goes here>`
  - `defender-api-secret: <API Secret goes here>`
  - `relay-api-key: <API Key goes here>`
  - `relay-api-secret: <API Secret goes here>`
- Change directories to the Contract Wizard Deployer
  - `cd contract-wizard-deployer`
- Run `yarn install` to install the necessary Node packages

### Solidity files

Contracts can be created, modified and downloaded from OpenZeppelin's [Contracts Wizard](https://wizard.openzeppelin.com/)

- Naming consistency
- Folder Structure

## General usage

These scripts utilizes Hardhat tasks. The custom `yarn run deploy --` is an alias for `yarn hardhat --config defender.hh.config.js`, either one can be used, but this guide will use `yarn run deploy --` from this point on.

- `yarn run deploy -- <task> <arguments>`

Defender Specific Hardhat tasks:

- contract
- governance
- to-defender

To get CLI help for any of the tasks, run `yarn run deploy -- help <task>` and it will provide a list of required and optional arguments.

Notes on constructor arguments:

- Arrays must be single-quoted. (`'[1,2]'`)
- Strings must be double-quoted (`"token"`)
- Addresses should be treated as strings (`"0x0000"`)
- Strings in an array will use both quotes (`'[1,"token"]'`)
- Example of passing 3 arguments (`1 "token" '[1,"token"]'`)

## Limitations

- Only supports Ethereum Mainnet and Goerli networks
- Structs are not supported as a constructor argument

### Deploying an individual contract

Deploy any individual contract to Ethereum mainnet or Goerli network and add the deployed contracts to Defender Admin.

- `yarn run deploy -- contract <arguments>` - General usage
- `yarn run deploy -- help contract` - View help information in CLI

  Required Arguments:

- `--contract-name <name>` - Contract name (MyToken)
  Optional Arguments:
- `--stage <stage>` - Deployment stage `dev` unless otherwise specified (dev)
- `--simulate` - Deploys locally to a Hardhat network. Useful for testing constructor arguments
- `<constructor argument1> <constructor argument2>...` - Arguments to pass to the constructor

Examples:

- `npm run deploy -- contract --contract-name DemoToken --stage dev --simulate`
- `npm run deploy -- contract --contract-name DemoToken`
- `npm run deploy -- contract --contract-name DemoTimelock --simulate 0 '["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"]' '["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"]' "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"`

Timelock on HH `0x5FbDB2315678afecb367f032d93F642f64180aa3`

### Deploying an Governance suite (Token, Timelock and Governor)

Deploy the OpenZeppelin Governance Suite with the deployer (Defender Relay) set as proposer, executor, admin and owner of the deployed contracts. After deployment, tokens can manually be minted and roles reassigned as desired. All contracts are also added to Defender Admin.

- `yarn run deploy -- governance <arguments>` - General usage
- `yarn run deploy -- help governance` - View help information in CLI

  Required Arguments:

- `--token-name <name>` - Token contract name (DemoToken)
- `--timelock-name <name>` - Timelock contract name (DemoTimelock)
- `--governor-name <name>` - Governor contract name (DemoGovernor)
  Optional Arguments:
- `--stage <stage>` - Deployment stage `dev` unless otherwise specified (dev)
- `--simulate` - Deploys locally to a Hardhat network. Useful for testing constructor arguments
- `<constructor argument1> <constructor argument2>...` - Arguments to pass to the constructor

Examples:

- `npm run deploy -- contract --contract-name DemoToken --stage dev --simulate`
- `npm run deploy -- contract --contract-name DemoToken`
- `npm run deploy -- contract --contract-name DemoTimelock --simulate 0 '["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"]' '["0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"]' "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"`

Timelock on HH `0x5FbDB2315678afecb367f032d93F642f64180aa3`

### Adding previously deployed contracts to Defender Admin

Examples:

- `npm run deploy -- to-defender --contract-network goerli --contract-name DemoToken --contract-address 0x685f8FA73B0702Ca3C7DC65A955a2045C678600A`

### TODO:

- Test and enable Etherscan-Verify
