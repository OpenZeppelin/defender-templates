# Deploy and upgrade token
Scripts in this folder deploy an ERC20 and upgrade it later. This way you can test alerts going through Defender.

1. Deploy MyUpgradableToken.

    ```sh
    $ yarn hardhat run scripts/deploy-upgradable-token
    ```
2. Take the proxy address and add it in _helper-hardhat-config_. Make sure your sentinel is also deployed and watching for that address.
3. Upgrade the token to V2.
    ```sh
    $ yarn hardhat run scripts/upgrade-token
    ```
