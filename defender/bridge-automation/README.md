# Bridge Automation

This Defender Autotask will periodically check for the balance of a specific address to monitor on Arbitrum.

If the balance of the address falls below a specified threshold, then the Autotask will automatically bridge
from the L1 side to the L2 side.

There is a Defender Relayer setup on the L1 side (Ethereum) and another Defender Relayer that is setup on
the L2 side (Arbitrum), both with the same address. Because of [address aliasing](https://developer.arbitrum.io/arbos/l1-to-l2-messaging#eth-deposits), 
the two Defender Relayers are needed to bridge from EOA to EOA.

## Defender Account Setup

- In your [Defender account](https://defender.openzeppelin.com/), select the Hamburger icon in the upper right corner and click on **Team API Keys**
- In the Team API Keys screen, click **Create API Key**
- Make sure that the options for **Manage Relayers** and **Manage Autotasks** are selected (we do not make use of the **Manage Proposals, Manage Sentinels and Contracts** option)
- Click **Save**
- Copy your API key and Secret key to a local file (you will **NOT** be able to view your API secret again after this message box goes away)
- Make sure that you really did copy your API key and Secret key to a local file
- Check the box for **I’ve written down the secret key** and select **Close**

### Relayer Setup
