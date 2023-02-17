# Governance Summary Template

This Defender Autotask will periodically check and display the status of active proposals on an [OpenZepplin Governor](https://docs.openzeppelin.com/contracts/4.x/api/governance) contract.

## Optimizations

During the first run of the Autotask, it will scan from block zero to the latest block.  It will then search for new `ProposalCreated` events starting from the last block searched. The current status of all active proposals will then be displayed in the Autotask logs.

## Defender Account Setup

- In your [Defender account](https://defender.openzeppelin.com/), select the Hamburger icon in the upper right corner and click on **Team API Keys**
- In the Team API Keys screen, click **Create API Key**
- Make sure that the options for **Manage Relayers**, **Manage Autotasks**, and **Manage Sentinels** are selected (we do not make use of the **Manage Proposals and Contracts** option)
- Click **Save**
- Copy your API key and Secret key to a local file (you will **NOT** be able to view your Secret key again after this message box goes away)
- Make sure that you really did copy your API key and Secret key to a local file
- Check the box for **I’ve written down the secret key** and select **Close**

## Local Code Setup

In the `defender` directory, perform the following steps:

- Run `yarn install` to install the necessary Node packages
- A secrets file can be created for each stage of production. We will create one for development
  - Copy and rename the `sample.secrets.yml` to `.secrets/dev.yml`
  - Modify the two lines in the `.secrets/dev.yml` file, replacing the portion in the angle brackets `<>` with your Defender API key and Secret key, as indicated:
  - `defender-api-key: <API Key goes here>`
  - `defender-api-secret: <Secret Key goes here>`
- Change directories to the stack that will be deployed
  - `cd governance_summary`
- A config file can be created for each stage of production. We will create one for development
  - Copy and rename `sample.config.yml` to `config.dev.yml`
  - Open the file and modify the following values:
    - `governance_address` 
    - `autotask_run_frequency`
- Run `serverless deploy --stage dev` to deploy the stack to Defender
- Watch for logs to appear in your Defender account.  Log into your Defender account and click on the `Governance Summary` Autotask.
