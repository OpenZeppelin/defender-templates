# Governance Bravo Summary Template

This Defender Autotask will periodically check and display the status of active proposals on an [OpenZepplin GovernorCompatibilityBravo](https://docs.openzeppelin.com/contracts/4.x/api/governance#GovernorCompatibilityBravo) contract.

## Optimizations

During the first run of the Autotask, it will scan from block zero to the latest block.  It will then search for new `ProposalCreated` events starting from the last block searched.  The current status of all active proposals will then be displayed in the Autotask logs.


## Defender Account Setup

- In your [Defender account](https://defender.openzeppelin.com/), select the Hamburger icon in the upper right corner and click on **Team API Keys**
- In the Team API Keys screen, click **Create API Key**
- Make sure that the options for **Manage Relayers**, **Manage Autotasks**, and **Manage Sentinels** are selected (we do not make use of the **Manage Proposals and Contracts** option)
- Click **Save**
- Copy your API key and Secret key to a local file (you will **NOT** be able to view your API secret again after this message box goes away)
- Make sure that you really did copy your API key and Secret key to a local file
- Check the box for **I’ve written down the secret key** and select **Close**

## Local Code Setup

In the `defender` directory, perform the following steps:

- Run `yarn install` to install the necessary Node packages
- A secrets file can be created for each stage of production. We will create one for development
  - Copy and rename the `sample.secrets.yml` to `.secrets/dev.yml`
  - Modify the two lines in the `.secrets/dev.yml` file, replacing the portion in the angle brackets `<>` with your Defender API key and secret key, as indicated:
  - `defender-api-key: <API Key goes here>`
  - `defender-api-secret: <API Secret goes here>`
- Change directories to the stack that will be deployed
  - `cd governance_bravo_summary`
- Modify the following values in the `config.yml` file:
  - `governance_address` 
  - `autotask_run_frequency`
- Run `serverless deploy` to deploy the stack to Defender
- Watch for logs to appear in your Defender account.  Log into your Defender account, click on the `Governance Bravo Summary` Autotask.
