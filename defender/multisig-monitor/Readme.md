# Multisig Monitor

This template deploys a Defender Sentinel and other necessary Defender resources to monitor for all events on a Safe multisig.

- ChangedThreshold(uint256)
- AddedOwner(address)
- RemovedOwner(address)
- ApproveHash(bytes32,address)
- DisabledModule(address)
- EnabledModule(address)
- ExecutionFailure(bytes32,uint256)
- ExecutionFromModuleFailure(address)
- ExecutionFromModuleSuccess(address)
- ExecutionSuccess(bytes32,uint256)
- SignMsg(bytes32)
- ChangedFallbackHandler(address)
- ChangedGuard(address)
- SafeMultiSigTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes,bytes)
- SafeReceived(address,uint256)
- SafeSetup(address,address[],uint256,address,address)
- SafeModuleTransaction(address,address,uint256,bytes,uint8)

If there are events you don't want to be notified on, just comment/remove them from [serverless.yml](./serverless.yml)

## Defender Account Setup

- In your [Defender account](https://defender.openzeppelin.com/), select the Hamburger icon in the upper right corner and click on **Team API Keys**
- In the Team API Keys screen, click **Create API Key**
- Make sure that the option for **Manage Sentinels** is selected (we do not make use of the **Manage Proposals and Contracts, Manage Relayers, and Manage Autotasks** options)
- Click **Save**
- Copy your API key and Secret key to a local file (you will **NOT** be able to view your Secret key again after this message box goes away)
- Make sure that you really did copy your API key and Secret key to a local file
- Check the box for **I’ve written down the secret key** and select **Close**

### Deploy and Test

In the `defender` directory, perform the following steps:

- A secrets file can be created for each stage of production. We will create one for development
  - Copy and rename the `sample.secrets.yml` to `.secrets/dev.yml`
  - Modify the lines in the `.secrets/dev.yml` file, replacing the portion in the angle brackets `<>` as indicated:
  - `defender-api-key: <API Key goes here>`
  - `defender-api-secret: <Secret Key goes here>`
  - `slack-webhook: <SLACK webhook goes here>`
  - Note that by default, we are sending notifications in slack, however you are free to use your own custom webhooks as well.
- Change directories to the stack that will be deployed
  - `cd multisig-monitor`
- A config file can be created for each stage of production. We will create one for development
  - Copy and rename `sample.config.yml` to `config.dev.yml`
  - Open the file and modify the following values:
    - `multisig-address` (instructions below on how to setup a multisig)
    - `network`

To test this part, [spin up a new multisig](https://help.gnosis-safe.io/en/articles/3876461-creating-a-safe-on-a-web-browser) or use an existing one that you control.

1. Paste your multisig address in the `config.dev.yml` file. This will indicate to the Sentinel the address that should be monitored. Now deploy the Sentinel by deploying the serverless template:

    ````sh
        $ serverless deploy
    ````

2. Go to the [Safe Portal](https://app.safe.global/) and add a new owner to your multisig. This will trigger the alert :rotating_light:.