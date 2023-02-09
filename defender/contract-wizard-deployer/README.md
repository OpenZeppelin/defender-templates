# Contract Wizard Deployer

This Hardhat script enables developers to take Solidity files that are downloaded from Open Zepplin's Contract Wizard and deploy them, upload them to Defender Admin, and verify them on Etherscan.

## Setup

### Accounts

- Config file
  - Defender API
  - Relay API
  - Etherscan API
  - JSON RPC Server

### Solidity files

- Naming consistency
- Folder Structure

## General usage

- `yarn run deploy --` is an alias for `yarn hardhat --config hardhat.config.js`, either one can be used but this guide will use `yarn run deploy --` from this point on.
- `yarn run deploy -- <task> <arguments>`

Defender Specific tasks

- contract
- governance
- to-defender

To get CLI help for any of the tasks, run `yarn run deploy -- help <task>` and it will provide a list of required and optional arguments.

Notes on constructor arguments: 
- Arrays must be single quoted. (`'[1,2]'`)
- Strings must be double quoted (`"token"`)
- Addresses should treated as strings (`"0x0000"`)
- Strings in an array will use both quotes (`'[1,"token"]'`)
- Example of passing 3 arguments `1 "token" '[1,"token"]'`

### Deploying an individual contract

- `yarn run deploy -- contract <arguments>`
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

`0x5FbDB2315678afecb367f032d93F642f64180aa3`