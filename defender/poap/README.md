## POAP Minting with Autotask Defender

This code is a template for creating a POAP (Proof of Attendance Protocol) NFT (ERC20, ERC721, or ERC115) minting application. The client must sign a message to prove their ownership of an address. The client can provide additional information such as their name, secret code, GPS location, or other unique identifiers in the request for the POAP mint. This data can then be used to verify that the requestor is an attendee at a particular event. After the request is validated, a POAP NFT can be minted by the Defender Relayer.

## POAP NFT Contract Deployment

The deployment of a contract is not covered by this template, but the [Contract Wizard Deployer](../contract-wizard-deployer/README.md) may be able to help. After your ERC20, ERC712, or ERC1155 is deployed, come back to this page.

## Defender Account Setup

- In your [Defender account](https://defender.openzeppelin.com/), select the Hamburger icon in the upper right corner and click on **Team API Keys**
- In the Team API Keys screen, click **Create API Key**
- Make sure that the options for **Manage Relayers**, **Manage Autotasks**, and **Manage Sentinels** are selected (we do not make use of the **Manage Proposals and Contracts** option)
- Click **Save**
- Copy your API key and Secret key to a local file (you will **NOT** be able to view your Secret key again after this message box goes away)
- Make sure that you really did copy your API key and Secret key to a local file
- Check the box for **I’ve written down the secret key** and select **Close**

## Deployment Setup :rocket:

In the `defender` directory, perform the following steps:

- Run `yarn install` to install the necessary Node packages
- A secrets file can be created for each stage of production. We will create one for development
  - Copy and rename the `sample.secrets.yml` to `.secrets/dev.yml`
  - Modify the lines in the `.secrets/dev.yml` file, replacing the portion in the angle brackets `<>` with your Defender API key and Secret key, as indicated:
    - `defender-api-key: <API Key goes here>`
    - `defender-api-secret: <Secret Key goes here>`
- Change directories to the stack that will be deployed
  - `cd poap`
- A config file can be created for each stage of production. We will create one for development
  - Copy and rename `sample.config.yml` to `config.dev.yml`
  - Open the file and modify the following values:
    - `tokenType`
    - `nftId`
    - `tokenAddress`
    - `network`
- Run `serverless deploy --stage dev` to deploy the stack to Defender

## Relays, Ownership, and Autotasks

### Contract Was Deployed with Defender

If the contract was deployed with Defender, then we can simply use the same Relayer (current owner of the contract) to handle the minting of the NFTs. The Relayer must be reconnected after each deployment.

- In your [Defender account](https://defender.openzeppelin.com/)
- Click on the **Autotask** link on the left side
- Click on **POAP Minter** Autotask
- Click on the settings **gear/cog** at the top middle, and select **Edit Settings**
- In the **Connect a Relayer** section, choose the Relayer that was used to deploy the contract

### Contract Was Deployed without Defender

If the contract was not deployed with Defender, then the contract ownership or minting role will need to be assigned to the Defender Relay.

- In your [Defender account](https://defender.openzeppelin.com/)
- Click on the **Relay** link on the left side
- In the **POAP Minter Relay** box, click on the **copy address** button
- Use any tool to transfer ownership or minting roles to the POAP Minter Relay. Tools to transfer ownership include:
  - Defender Admin
  - Etherscan
  - A simple script

### Add Funds to the Relay

- In your [Defender account](https://defender.openzeppelin.com/)
- Click on the **Relay** link on the left side
- Find the Relay that currently has ownership of the NFT contract, click on the **copy address** button
- Transfer funds to that address to cover the NFT minting costs

### Get the Autotask webhook URL

- In your [Defender account](https://defender.openzeppelin.com/)
- Click on the **Autotask** link on the left side
- In the **POAP Minter** Autotask box, click on the **Copy** button to copy the Autotask Webhook URL to your clipboard
- Save the Autotask URL to a local file

## Typical Usage

A participant will be required to sign a message using the private key associated with their account. In this template, the message only contains an address and a name. 

### Signing the Message

From the root of this repo:

- Create/modify the `.env` file
- Add `PRIVATE_KEY=<YOUR_PRIVATE_KEY>` to the file. Replacing the `<>` text with the private key of the account that will be receiving the POAP NFT
- Run `yarn ts-node scripts/signPOAPMessage.ts --name <AttendeeName> --chainId 5` to generate a signature for Goerli Testnet (chain id 5)

### Submitting the request
The JSON that you created above will need to be POSTed to the Autotask webhook URL. This can be done with a simple script or with curl. Replace the URL with your Autotask webhook URL
```shell
curl -X POST https://api.defender.openzeppelin.com/autotasks/xxxx/runs/webhook/xxxx \
   -H 'Content-Type: application/json' \
   -d '{
  "address": "0xRECIPIENT_ADDRESS",
  "signature": "0xVERY_LONG_SIGNATURE_STRING",
  "message": { "name": "MyName", "wallet": "0xRECIPIENT_ADDRESS" }
}'
```

## Notes
It is best to add additional fields that can be used to verify a participant's attendance at an event. Moreover, some anti-spam measures should be in place to prevent users from submitting the same request repeatedly and minting NFTs until your Relay runs out of gas.