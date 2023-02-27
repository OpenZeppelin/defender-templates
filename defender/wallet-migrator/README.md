# Wallet Migrator

This Defender Autotask will automatically transfer all ERC20 and ERC721 tokens from a user's wallet address to another specified wallet address. The transfer happens in a two step 
process: the first step is to approve an allowance to your Defender Relayer using the approval script found in `defender/wallet-migrator/approveTokens.js`, and the second step is 
the execution of the Autotask, where the transferring transactions take place.

This template can serve as an emergency mechanism if your wallet is ever compromised and you need to quickly move all your funds into a different and secure wallet. It can also be used 
as a convenient tool to avoid manually transferring every ERC20 and ERC721 token that you own.

## Defender Account Setup

- In your [Defender account](https://defender.openzeppelin.com/), select the Hamburger icon in the upper right corner and click on **Team API Keys**
- In the Team API Keys screen, click **Create API Key**
- Make sure that the options for **Manage Relayers**, **Manage Autotasks**, and **Manage Sentinels** are selected (we do not make use of the **Manage Proposals and Contracts** option)
- Click **Save**
- Copy your API key and Secret key to a local file (you will **NOT** be able to view your API secret again after this message box goes away)
- Make sure that you really did copy your API key and Secret key to a local file
- Check the box for **I’ve written down the secret key** and select **Close**

### Covalent API Key Setup

This template will make use of [Covalent's API](https://www.covalenthq.com/docs/api/balances/get-token-balances-for-address/) to query for all 
all balances of ERC20 and ERC721 tokens of the sender's specified wallet address. To get an API key, navigate to [Covalent's website](https://www.covalenthq.com/)
and select **Get an API key**. Follow the instructions to sign up for an account, or login to your existing account if you already have one. 
Once you are logged in and have created an API Key, you can navigate to your home platform [page](https://www.covalenthq.com/platform/#/) where the API key is shown. 
Write down your API Key is a safe place, as you will need it for later steps.

## Local Code Setup

In the `defender` directory, perform the following steps:

- Run `yarn install` to install the necessary Node packages
- A secrets file can be created for each stage of production. We will create one for development
  - Copy and rename `sample.secrets.yml` to `.secrets/dev.yml`
  - Modify the following lines in the `.secrets/dev.yml` file, replacing the portion in the angle brackets `<>` with your Defender API key, Secret key, and Covalent API key, as indicated:
    - `defender-api-key: <API Key goes here>`
    - `defender-api-secret: <API Secret goes here>`
    - `covalent-api-key: <Covalent API Key goes here>`
- Change directories to the stack that will be deployed
  - `cd wallet-migrator`
- A config file can be created for each stage of production. We will create one for development
  - Copy and rename `sample.config.yml` to `config.dev.yml`
  - Open the file and modify the following values:
    - `sender-wallet-address` 
    - `receiver-wallet-address`
    - `network`
- Run `serverless deploy --stage dev` to deploy the stack to Defender

## Token Approval Script Setup

In order to have all ERC20 and ERC721 tokens automatically transferred, you must first approve an allowance to the Relayer that is deployed with your Defender Stack.

From the root of this repo, follow these steps to run the approval script:

- Create/modify the `.env` file
- Add your RPC URL to perform on-chain transactions
  - `GOERLI_RPC_URL: <Your Goerli RPC URL here>` add this field if you are using the Goerli Testnet, otherwise leave empty.
  - `MAINNET_RPC_URL: <Your Goerli RPC URL here>` add this field if you are using Mainnet, otherwise leave empty.
  - `COVALENT_API_KEY: <Your Covalent API Key goes here>`

Make sure that your Defender Serverless stack is deployed BEFORE you run the following script. The following script will approve all ERC20 and ERC721 tokens 
from your wallet address to the deployed Relayer's address. From the root of this repo, run 
`yarn node defender/wallet-migrator/approveTokens.js`.

## Running the Autotask

Now, your Autotask is ready for execution in case of any emergencies that may occur with your wallet. To execute the Autotask and sweep all your ERC20 and ERC721 tokens 
to another wallet, ensure that your deployed Relayer has enough funds to pay for gas fees and follow these steps: 
**Be aware that following these steps below will result in the Autotask executing and transfering all ERC20 and ERC721 to your other specified receiver wallet!**

- In your [Defender account](https://defender.openzeppelin.com/), select the Autotask tab on the left panel.
- Click on the Autotask named **Wallet Migrator Autotask** that you just deployed with this stack.
- In the upper right corner, click on **Run Autotask now** to manually trigger the Autotask.