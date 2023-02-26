# Bridge Automation

This Defender Autotask will periodically check for the balance of a specific address to monitor on Arbitrum Mainnet. 
The Autotask can be used to monitor any address, but some useful examples include a Multisig wallet, a DAO treasury, or an EOA.

If the balance of the monitored address falls below a specified threshold, then the Autotask will automatically bridge
Ether from the L1 side (Ethereum Mainnet) to the L2 side (Arbitrum Mainnet).

There are two Defender Relays set up, one on the L1 side and another on 
the L2 side, both with the same address. Because of [address aliasing](https://developer.arbitrum.io/arbos/l1-to-l2-messaging#eth-deposits), 
deposits from an L1 EOA will result in no issues, the Ether will be deposited into the same address on the L2. However, deposits originating from an L1 
contract WILL result in an issue, as the Ether will be deposited into an aliased address on the L2. To account for address aliasing, we are
forcing the transfer to originate from an L1 EOA to be received by the L2 EOA, both of which we control. Once our L2 EOA has received the Ether, 
we can then safely transfer it to any address the user has specified, hence why two Defender Relays are needed.

Once funds are safely bridged onto Arbitrum, the Autotask will also act as a "sweeper" to automatically transfer all funds from the L2 Relay to the 
specified monitored address. Because it may take a few minutes for the transaction to finalize when bridging funds, it will likely be one of the 
subsequent executions of the Autotask that will sweep the funds. Again, this extra step is necessary because of address aliasing, as the entire "sweeping" 
transaction occurs on the L2 side, we can safely transfer from our L2 EOA to any address specified by the user. 

Please note that a caveat here is that although unlikely, a misbehaving [Sequencer](https://developer.offchainlabs.com/inside-arbitrum-nitro#inboxes-fast-and-slow) 
could result in the submitted transaction sitting in the Delayed Inbox for 24 hours before someone else can force it through. Ideally, a well-behaved Sequencer 
will result in the initial bridging transaction being confirmed within 10 minutes.

## Defender Account Setup

- In your [Defender account](https://defender.openzeppelin.com/), select the Hamburger icon in the upper right corner and click on **Team API Keys**
- In the Team API Keys screen, click **Create API Key**
- Make sure that the options for **Manage Relayers**, **Manage Sentinels**, and **Manage Autotasks** are selected (we do not make use of the **Manage Proposals and Contracts** option)
- Click **Save**
- Copy your API key and Secret key to a local file (you will **NOT** be able to view your Secret key again after this message box goes away)
- Make sure that you really did copy your API key and Secret key to a local file
- Check the box for **I’ve written down the secret key** and select **Close**

### Relayer Setup
- In your [Defender account](https://defender.openzeppelin.com/), select the Relay tab on the left-hand side and click on **Create Relayer**
- Specify a name for your Relayer, connect to the Arbitrum network, and then click on **Create**
- Click on your newly created Relayer, select the settings gear icon and click on **Clone to another network** and select **Mainnet** as the network
- You should now have two Relayers in your Defender account with the same address, but different networks (one on Arbitrum Mainnet and one on Ethereum Mainnet)
- Click on your Arbitrum Relayer and select the settings gear icon and click on **Create new API key**
- Copy your API key and Secret key to a local file (you will **NOT** be able to view your Secret key again after this message box goes away)
- Follow the same instructions for the Mainnet Relayer to get the API and Secret key
- Make sure to have these API and Secret keys saved, as you will need to use them for the steps below

## Local Code Setup

In the `defender` directory, perform the following steps:

- Run `yarn install` to install the necessary Node packages
- A secrets file can be created for each stage of production. We will create one for development:
  - Copy and rename the `sample.secrets.yml` to `.secrets/dev.yml`
  - Modify the lines in the `.secrets/dev.yml` file, replacing the portion in the angle brackets `<>` with your API and Secret keys, as indicated:
    - `defender-api-key: <API Key goes here>`
    - `defender-api-secret: <Secret key goes here>`
    - `layer2-relayer-api-key: <YOUR_ARBITRUM_RELAYER_API_KEY>`
    - `layer2-relayer-api-secret: <YOUR_ARBITRUM_RELAYER_SECRET_KEY>`
    - `layer1-relayer-api-key: <YOUR_MAINNET_RELAYER_API_KEY>`
    - `layer1-relayer-api-secret: <YOUR_MAINNET_RELAYER_SECRET_KEY>`
- Change directories to the stack that will be deployed
  - `cd bridge-automation`
- A configuration file can be created for each stage of production. We will create one for development:
  - Copy and rename `sample.config.yml` to `config.dev.yml`
  - Open the file and modify the following values:
    - `layer2-wallet-address`
    - `threshold`
    - `amount`
    - `autotask-frequency`
    - `arbitrum-bridge-address`
- Run `serverless deploy --stage dev` to deploy the stack to Defender