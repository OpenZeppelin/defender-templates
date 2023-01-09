# DeFi Templates

**Tools and monitoring for common DeFi operations and activity**

## Underlying asset monitor

Most DeFi protocols face risks when integrating with upgradable tokens that are outside of the protocol's reach. This section shows how to monitor upgradable tokens and emit a Slack alert if they get updated.

### Deploy and test

1. Deploy MyUpgradableToken

    ```sh
    $ yarn hardhat run scripts/deploy-upgradable-token
    ```

2. Take the proxy address and add it in _helper-hardhat-config_ and _secrets.dev.yml_. This is necessary so that the Sentinel can monitor that address and the upgrade script that you will run later uses the same proxy.
3. Deploy Defender resources

    ```sh
    $ cd defender
    $ serverless deploy
    ```

4. Now that the sentinel is up and running, you will upgrade the token to trigger the alert :rotating_light:
    ```sh
    $ yarn hardhat run scripts/upgrade-token
    ```
