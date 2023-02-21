# Governance Alert Template

This Defender Sentinel and Autotask will monitor and display proposal events emitted by [OpenZepplin Governor](https://docs.openzeppelin.com/contracts/4.x/api/governance) and [OpenZepplin GovernorCompatibilityBravo](https://docs.openzeppelin.com/contracts/4.x/api/governance#GovernorCompatibilityBravo) contracts.  This Autotask will display alerts for the following events:
* ProposalCanceled
* ProposalCreated
* ProposalExecuted
* ProposalQueued
* VoteCast

The following additional events are emitted by the Governor and can be monitored by modifying `serverless.yml` and `autotask-1/index.js`:
* ProposalThresholdSet
* QuorumNumeratorUpdated
* TimelockChange
* VoteCastWithParams
* VotingDelaySet
* VotingPeriodSet

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
  - `cd governance_alert`
- A config file can be created for each stage of production. We will create one for development
  - Copy and rename `sample.config.yml` to `config.dev.yml`
  - Open the file and modify the following values:
    - `block_explorer_base_url`
    - `monitored-addresses`
    - `monitored-network`
- Run `serverless deploy --stage dev` to deploy the stack to Defender
- Watch for logs to appear in your Defender account.  Log into your Defender account, click on the `Governance Alert` Autotask.
