# Gasless NFT Minter

This code will allow users to deploy an [ERC-2771-compatible](https://docs.openzeppelin.com/contracts/4.x/api/metatx#ERC2771Context) [ERC-1155 NFT](https://docs.openzeppelin.com/contracts/4.x/erc1155) contract and then use one Autotask to sign mint requests, and another Autotask to relay the request to a [trusted forwarder](https://docs.openzeppelin.com/contracts/4.x/api/metatx#MinimalForwarder) which will send the request to the NFT contract to mint an NFT for the user.

## Setup

This section will help you set up the following:
- Acquire Defender and Relay keys
- Add funds to the Relay
- Deploy contracts
  - `yarn deploy contract --contract-name MinimalForwarder`
  - `yarn deploy contract --contract-name DemoNFT "0xMINIMAL_FORWARDER_ADDRESS"`
- Update `config.dev.yml` with the 2 deployed contract addresses
- Deploy the Autotasks with `serverless deploy`
- Connect Relays to deployed Autotasks
  - Contract Deployer Relay must be connected to the signing Autotask
  - Any Relayer with funds can be connected to the Relay Autotask
- Copy the 2 Autotask webhooks into the `config.dev.yml` file

### Defender Account Setup

- In your [Defender account](https://defender.openzeppelin.com/), select the Hamburger icon in the upper right corner and click on **Team API Keys**
- In the Team API Keys screen, click **Create API Key**
- Make sure that all Capabilities are selected
- Click **Save**
- Copy your API key and Secret key to a local file (you will **NOT** be able to view your Secret key again after this message box goes away)
- Make sure that you really did copy your API key and Secret key to a local file
- Check the box for **I’ve written down the Secret key** and select **Close**

### Relay API Keys

- In your [Defender account](https://defender.openzeppelin.com/), select the **◎ Relay** link on the upper left side to get to the Relay Dashboard
- If you do not have a Relay on the network that you want to deploy to, create one:
  - In the Relay Dashboard screen, click **Create Relayer** in the upper right corner
  - Pick a meaningful name, choose the network that you want to deploy to, and click **Create**
- Click on the existing Relay that you would like to use for deployments
- Click on the settings gear/cog **⚙** at the top middle and choose **+ Create new API key**
- Copy your Ethereum Address, API key, and Secret key to a local file (you will **NOT** be able to view your Secret key again after this message box goes away)
- Make sure that you really did copy your API key and Secret key to a local file
- Check the box for **I’ve written down the secret key** and select **Close**

### Add Funds to the Relay

- In your [Defender account](https://defender.openzeppelin.com/)
- Click on the **Relay** link on the left side
- Find the Relay that deployed the NFT contract, click on the **copy address** button
- Transfer funds to that address to cover the deployment and NFT minting costs

### Local Code Setup

In the `defender` directory, perform the following steps:

- A secrets file can be created for each stage of production. We will create one for development:
  - Copy and rename the `sample.secrets.yml` to `.secrets/dev.yml`
  - Modify the four lines in the `.secrets/dev.yml` file, replacing the portion in the angle brackets `<>` with your Defender and Relay API keys and Secret keys, as indicated:
    - `defender-api-key: <API Key goes here>`
    - `defender-api-secret: <Secret key goes here>`
    - `relay-api-key: <Relay API Key goes here>`
    - `relay-api-secret: <Relay Secret key goes here>`
- Change directories to the Contract Wizard Deployer
  - `cd gasless-nft-minter`
- Run `yarn install` to install the necessary Node packages

### Solidity Files

The `DemoNFT` contract in the `gasless-nft-minting/contracts` directory is a custom contract that was made with OpenZeppelin's [Contracts Wizard](https://wizard.openzeppelin.com/). Modifications were made to make it [ERC2771-compatible](https://docs.openzeppelin.com/contracts/4.x/api/metatx#ERC2771Context) (support gasless / meta transactions).

### Deploying Contracts

Contracts will be deployed using the Defender Relay that you configured earlier.

- The `MinimalForwarder` contract must be deployed first
  - `yarn deploy contract --contract-name MinimalForwarder`
- Take the address of the `MinimalForwarder` and provide it as a constructor for the NFT contract
  - `yarn deploy contract --contract-name DemoNFT "0xMINIMAL_FORWARDER_ADDRESS"`
- Make a note of both newly deployed contract addresses. They will need to be added to the config file mentioned below

### Serverless Deployment Setup :rocket:

Now that the contracts are deployed, they can be added to the config file so that the Autotasks know which contracts they are signing for and forwarding to. In the `gasless-nft-minting` directory, perform the following steps:

- A config file can be created for each stage of production. We will create one for development
  - Copy and rename `sample.config.yml` to `config.dev.yml`
  - Open the file and modify the following values with the :
    - `forwarder-address`
    - `nft-address`
- Run `serverless deploy --stage dev` to deploy the stack to Defender

### Connecting Relays to Deployed Autotasks

Since the contracts were deployed with Defender, we can simply use the same Relayer (current owner of the contract) to handle the signing of the NFT mint requests. The Relayer must be reconnected after each deployment.

- In your [Defender account](https://defender.openzeppelin.com/)
- Click on the **Autotask** link on the left side
- Click on **Gasless NFT Minting Signer Autotask** Autotask
- Click on the settings **gear/cog** at the top middle, and select **Edit Settings**
- In the **Connect a Relayer** section, choose the Relayer that was used to deploy the contract

The same thing must be done for the Autotask that will relay the request:

- Click on the **Autotask** link on the left side
- Click on **Gasless NFT Minting Relayer Autotask** Autotask
- Click on the settings **gear/cog** at the top middle, and select **Edit Settings**
- In the **Connect a Relayer** section, choose ANY Relayer that has enough funds to execute the minting requests that are submitted to it

### Get the Autotask webhook URLs

Interactions with the Autotasks will be done via webhook URLs. Add the URLs to your config file:

- In your [Defender account](https://defender.openzeppelin.com/)
- Click on the **Autotask** link on the left side
- Save the Signer webhook
  - In the **Gasless NFT Minting Signer Autotask** Autotask box, click on the **Copy** button to copy the Autotask Webhook URL to your clipboard
  - Save the Autotask URL as the value `signer-webhook` in your `config.dev.yml` file
- Save the Relayer webhook
  - In the **Gasless NFT Minting Relayer Autotask** Autotask box, click on the **Copy** button to copy the Autotask Webhook URL to your clipboard
  - Save the Autotask URL as the value `relayer-webhook` in your `config.dev.yml` file


## Typical Usage

The Signer Autotask can now authorize the minting of Tokens without needing to spend any gas. This is done by signing a minting request and sending it back to the user via HTTP.

A user with a signed request can send the request to the Relayer Autotask via HTTP and also not spend gas.

The Relayer Autotask verifies the request and signature and executes the transaction on-chain if they are valid.

Upon receiving this request, the Relayer Autotask will verify both the request and signature's validity before executing the desired transaction on the blockchain.
### Signing and Relaying with scripts

The `sign` and `relay` scripts included in this template use the deployed Autotasks. 

In the `gasless-nft-minting` directory, perform the following steps:
- `yarn sign <address>` - to have the Signer Autotask sign a mint request
- `yarn relay '<stringified JSON>'` - to relay the request and mint the NFT to the user

### Submitting Requests with Curl

Signature requests can be submitted with curl. Replace the URL with your Signer Autotask webhook URL and the address with the recipient address:
```shell
curl -X POST https://api.defender.openzeppelin.com/autotasks/xxxx/runs/webhook/xxxx \
   -H 'Content-Type: application/json' \
   -d '{"address": "0xRECIPIENT_ADDRESS"}'
```
Relay requests can also be submitted with curl. Replace the URL with your Relay Autotask webhook URL and the curl data fields (signature, to, from, and data) with appropriate values.
```shell
curl -X POST https://api.defender.openzeppelin.com/autotasks/xxxx/runs/webhook/xxxx \
   -H 'Content-Type: application/json' \
   -d '{
    "signature":"0xVERY_LONG_SIGNATURE_STRING",
    "request":{
      "value":0,
      "gas":1000000,
      "nonce":"0",
      "to":"0xNFT_ADDRESS",
      "from":"0xRELAY_ADDRESS","data":"0x731133e9000000000000000000000000USER_ADDRESS00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000"
    }
  }'
```

## Tests

Check that the contract can mint with both standard and gasless transactions
- `yarn test tests/nftContract.test.js`
Check that the configured Defender Relay can sign and verify meta transactions
- `yarn test tests/eip712sig.online.test.js`

## Notes
This is a proof of concept template. The Autotask currently allows for unlimited mints of NFTs and can be easily abused until the Relay runs out of funds.
