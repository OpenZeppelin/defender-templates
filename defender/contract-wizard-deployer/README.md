# Contract Wizard Deployer

This Hardhat script enables developers to take Solidity files that are downloaded from Open Zepplin's Contract Wizard and deploy using a Defender Relay and then upload them to Defender Admin

## Setup

### Accounts

TODO
- Config file
  - Defender API
  - Relay API
  - Etherscan API
  - JSON RPC Server

### Solidity files

TODO
- Naming consistency
- Folder Structure

## General usage

These scripts utilizes Hardhat tasks. The custom `yarn run deploy --` is an alias for `yarn hardhat --config defender.hh.config.js`, either one can be used but this guide will use `yarn run deploy --` from this point on.
- `yarn run deploy -- <task> <arguments>`

Defender Specific Hardhat tasks:
- contract
- governance
- to-defender

To get CLI help for any of the tasks, run `yarn run deploy -- help <task>` and it will provide a list of required and optional arguments.

Notes on constructor arguments: 
- Arrays must be single quoted. (`'[1,2]'`)
- Strings must be double quoted (`"token"`)
- Addresses should treated as strings (`"0x0000"`)
- Strings in an array will use both quotes (`'[1,"token"]'`)
- Example of passing 3 arguments (`1 "token" '[1,"token"]'`)

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

Deploy the OpenZepplin Governance Suite with the deployer (Defender Relay) set as proposer, executor, admin and owner of the deployed contracts. After deployment, tokens can manually be minted and roles reassigned as desired. All contracts are also added to Defender Admin.

- `yarn run deploy -- contract <arguments>` - General usage
- `yarn run deploy -- help contract` - View help information in CLI

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


### Adding previously deployed contracts to Defender and verifying them on Etherscan

Examples:
- `npm run deploy -- to-defender --contract-network goerli --contract-name DemoToken --contract-address 0x685f8FA73B0702Ca3C7DC65A955a2045C678600A`

## Limitations
- Only supports Ethereum Mainnet and Goerli networks
- Structs are not supported as a constructor argument

TODO:
- Test and enable Etherscan-Verify