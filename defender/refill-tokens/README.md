# Refill Tokens Template

Monitors an address for the balance of a specific token, checking on a pre-defined schedule. If the balance is below a value defined as maximum, the Autotask will attempt to top-up the address by minting that token.

## Contract Deployment

The deployment of a contract is not covered by this template, but the [Contract Wizard Deployer](../contract-wizard-deployer/README.md) may be able to help. After your ERC20, ERC712, or ERC1155 is deployed, come back to this page.

## Deployment Setup :rocket:

In the `defender` directory, perform the following steps:

- Run `yarn install` to install the necessary Node packages
- A secrets file can be created for each stage of production. We will create one for development
  - Copy and rename the `sample.secrets.yml` to `.secrets/dev.yml`
  - Modify the lines in the `.secrets/dev.yml` file, replacing the portion in the angle brackets `<>` with your Defender API key and Secret key, as indicated:
    - `defender-api-key: <API Key goes here>`
    - `defender-api-secret: <Secret Key goes here>`
- Change directories to the stack that will be deployed
  - `cd refill-tokens`
- A config file can be created for each stage of production. We will create one for development
  - Copy and rename `sample.config.yml` to `config.dev.yml`
  - Open the file and modify the following values:
    - `token-type`
    - `nft-id`
    - `token-address`
    - `network`
    - `recipient-address`
    - `recipient-minimum-balance`
    - `recipient-top-up-amount`
    - `autotask-run-frequency`
- Run `serverless deploy --stage dev` to deploy the stack to Defender

## Relays, Ownership, and Autotasks

### Contract Was Deployed with Defender

If the contract was deployed with Defender, then we can simply use the same Relayer (current owner of the contract) to handle the minting of the NFTs. The Relayer must be reconnected after each deployment.

- In your [Defender account](https://defender.openzeppelin.com/)
- Click on the **Autotask** link on the left side
- Click on **Refill address with tokens** Autotask
- Click on the settings **gear/cog** at the top middle, and select **Edit Settings**
- In the **Connect a Relayer** section, choose the Relayer that was used to deploy the contract

### Contract Was Deployed without Defender

If the contract was not deployed with Defender, then the contract ownership or minting role will need to be assigned to the Defender Relay.

- In your [Defender account](https://defender.openzeppelin.com/)
- Click on the **Relay** link on the left side
- In the **Refiller Relayer** box, click on the **copy address** button
- Use any tool to transfer ownership or minting roles to the Refiller Relayer. Tools to transfer ownership include:
  - Defender Admin
  - Etherscan
  - A simple script

### Add Funds to the Relay

- In your [Defender account](https://defender.openzeppelin.com/)
- Click on the **Relay** link on the left side
- Find the Relay that currently has ownership of the contract, click on the **copy address** button
- Transfer funds to that address to cover the minting costs

## Typical Usage

If the `recipient-address` account balance is below the specified `recipient-minimum-balance` when the Autotask runs, then the Autotask will mint `recipient-top-up-amount` number of tokens to that address.
