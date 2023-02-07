# Bridge Automation

This Defender Autotask will periodically check for the balance of a specific address to monitor on Arbitrum. 
The Autotask can be used to monitor a multisig address, a DAO treasury, or just an EOA.

If the balance of the specified address falls below a specified threshold, then the Autotask will automatically bridge
Ether from the L1 side (Mainnet) to the L2 side (Arbitrum).

There is a Defender Relayer setup on the L1 side (Mainnet) and another Defender Relayer that is setup on
the L2 side (Arbitrum), both with the same address. Because of [address aliasing](https://developer.arbitrum.io/arbos/l1-to-l2-messaging#eth-deposits), 
the two Defender Relayers are needed to bridge from EOA to EOA.

Once funds are bridged onto Arbitrum, the Autotask will also act as a "sweeper" and automatically transfer all funds from the L2 Relayer to the 
specified monitored address. This extra step is necessary because of address aliasing.

## Defender Account Setup

- In your [Defender account](https://defender.openzeppelin.com/), select the Hamburger icon in the upper right corner and click on **Team API Keys**
- In the Team API Keys screen, click **Create API Key**
- Make sure that the options for **Manage Relayers**, **Manage Sentinels**, and **Manage Autotasks** are selected (we do not make use of the **Manage Proposals and Contracts** option)
- Click **Save**
- Copy your API key and Secret key to a local file (you will **NOT** be able to view your API secret again after this message box goes away)
- Make sure that you really did copy your API key and Secret key to a local file
- Check the box for **I’ve written down the secret key** and select **Close**

### Relayer Setup
- In your [Defender account](https://defender.openzeppelin.com/), select the Relay tab on the left hand side and click on **Create Relayer**
- Specify a name for your Relayer, connect to the Arbitrum network, and then click on **create**
- Click on your newly created Relayer, select the settings gear icon and click on **Clone to another network** and select **Mainnet** as the network
- You should now have two Relayers in your Defender account with the same address, but different networks (one on Arbitrum and one on Mainnet)
- Click on your Arbitrum Relayer and, select the settings gear icon and click on **Create new API key**
- Copy your API key and Secret key to a local file (you will **NOT** be able to view your API secret again after this message box goes away)
- Follow the same instructions for the Mainnet Relayer to get the API and Secret key
- Make sure to have these API and Secret keys saved, as you will need to use them for the steps below

## Local Code Setup

In the `defender` directory, perform the following steps:

- Run `yarn install` to install the necessary Node packages
- A secrets file can be created for each stage of production. We will create one for development
  - Copy and rename the `sample.secrets.yml` to `.secrets/dev.yml`
  - Modify the lines in the `.secrets/dev.yml` file, replacing the portion in the angle brackets `<>` with your API and Secret keys, as indicated:
  - `defender-api-key: <API Key goes here>`
  - `defender-api-secret: <API Secret goes here>`
  - `layer2-relayer-api-key: <YOUR_ARBITRUM_RELAYER_API_KEY>`
  - `layer2-relayer-api-secret: <YOUR_ARBITRUM_RELAYER_API_SECRET>`
  - `layer1-relayer-api-key: <YOUR_MAINNET_RELAYER_API_KEY>`
  - `layer1-relayer-api-secret: YOUR_MAINNET_RELAYER_API_SECRET`
- Change directories to the stack that will be deployed
  - `cd bridge-automation`
- A config file can be created for each stage of production. We will create one for development
  - Copy and rename `sample.config.yml` to `config.dev.yml`
  - Open the file and modify the following values:
    - `layer2-wallet-address`
    - `threshold`
    - `amount`
    - `autotask-frequency`
    - `arbitrum-bridge-address`
- Run `serverless deploy --stage dev` to deploy the stack to Defender