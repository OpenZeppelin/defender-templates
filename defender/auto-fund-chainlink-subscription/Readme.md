# Auto fund Chainlink Subscription when funds are low

[Chainlink VRF](https://docs.chain.link/vrf/v2/introduction) is one of the most popular options for achieving provable randomness in a blockchain. It can be used for raffles, gaming, and other use cases.  
In order to fulfill randomness requests from your smart contracts, you need to have LINK in your subscription.
We use Defender to observe when funds are low on a Chainlink subscription and use an Autotask to take ETH from a Relayer, swap it for LINK on UniswapV3, and fund the subscription. This process is all done automatically.

## Prerequisites

In order to set up this template, you need a Chainlink subscription and some ETH in your relayer.
1. If you don't have a Chainlink subscription, create one following this [guide](https://docs.chain.link/vrf/v2/subscription/).
2. Get some Goerli ETH from a faucet such as [this](https://goerlifaucet.com/). After deploying your relayer, you will need to send it some ETH so that it can be later swapped for LINK and fund the subscription.

## Defender Account Setup

- In your [Defender account](https://defender.openzeppelin.com/), select the Hamburger icon in the upper right corner and click on **Team API Keys**
- In the Team API Keys screen, click **Create API Key**
- Make sure that the options for **Manage Relayers**, **Manage Autotasks**, and **Manage Sentinels** are selected (we do not make use of the **Manage Proposals and Contracts** option)
- Click **Save**
- Copy your API key and Secret key to a local file (you will **NOT** be able to view your Secret key again after this message box goes away)
- Make sure that you really did copy your API key and Secret key to a local file
- Check the box for **I’ve written down the secret key** and select **Close**

## Deployment Setup :rocket:

This template uses external dependencies, so we will use [Rollup](https://rollupjs.org/guide/en/#introduction) to bundle those dependencies inside of our Javascript Autotasks. We also leverage the [yaml plugin](https://github.com/rollup/plugins/tree/master/packages/yaml) to define parameters in a central location and reuse them in our serverless template and both Autotasks.

In the `defender` directory, perform the following steps:

- Run `yarn install` to install the necessary Node packages
- Run `yarn build` to bundle the Autotasks using Rollup
- A secrets file can be created for each stage of production. We will create one for development
  - Copy and rename the `sample.secrets.yml` to `.secrets/dev.yml`
  - Modify the lines in the `.secrets/dev.yml` file, replacing the portion in the angle brackets `<>` as indicated:
  - `defender-api-key: <API Key goes here>`
  - `defender-api-secret: <Secret Key goes here>`
  - `slack-webhook: <SLACK webhook goes here>`
  - `email-address: <EMAIL address goes here>`
- Change directories to the stack that will be deployed
  - `cd auto-fund-chainlink-subscription`
- A config file can be created for each stage of production. We will create one for development
  - Copy and rename `sample.config.yml` to `config.dev.yml`
  - Open the file and modify the following values:
    - `subscriptionId`
    - `threshold`
    - `fundAmount`
    - `network`
- Run `serverless deploy --stage dev` to deploy the stack to Defender