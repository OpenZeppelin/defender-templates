# Monitor ERC721 Transfers

This template deploys a Defender Sentinel and other necessary Defender resources to monitor for all ERC721 token transfers of a specified token address.

## Defender Account Setup

- In your [Defender account](https://defender.openzeppelin.com/), select the Hamburger icon in the upper right corner and click on **Team API Keys**
- In the Team API Keys screen, click **Create API Key**
- Make sure that the option for **Manage Sentinels** is selected (we do not make use of the **Manage Proposals and Contracts, Manage Relayers, and Manage Autotasks** options)
- Click **Save**
- Copy your API key and Secret key to a local file (you will **NOT** be able to view your Secret key again after this message box goes away)
- Make sure that you really did copy your API key and Secret key to a local file
- Check the box for **I’ve written down the secret key** and select **Close**

## Deployment Setup

In the `defender` directory, perform the following steps:

- A secrets file can be created for each stage of production. We will create one for development:
  - Copy and rename the `sample.secrets.yml` to `.secrets/dev.yml`
  - Modify the lines in the `.secrets/dev.yml` file, replacing the portion in the angle brackets `<>` with your API and Secret keys, as indicated:
    - `defender-api-key: <API Key goes here>`
    - `defender-api-secret: <Secret key goes here>`
    - `slack-webhook: <SLACK webhook goes here>`
    - Note that by default, we are sending notifications in slack, however, you are free to use your custom webhook as well.
- Change directories to the stack that will be deployed
  - `cd monitor-erc721-transfers`
- A configuration file can be created for each stage of production. We will create one for development:
  - Copy and rename `sample.config.yml` to `config.dev.yml`
  - Open the file and modify the following values:
    - `token-address`
    - `network`
- Run `serverless deploy --stage dev` to deploy the stack to Defender
