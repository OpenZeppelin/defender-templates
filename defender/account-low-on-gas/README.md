# Account Low on gas monitor

This Defender Sentinel will send a notification alert whenever any monitored account balance is below the minimum threshold value after a transaction.

Setup:

Use `config.dev.yml` for development or rename it to `config.<stage>.yml` for the stage you choose.

You can specify accounts to monitor as well as threshold values per network. In the template there are two networks supported; however, you can easily extend this monitoring to more networks by:

1. Extending configuration file with new network: <Config_Network_Name>
2. Creating new resources within `serverless.yml`:
    - <Config_Network_Name>-Reader relayer
    - <Config_Network_Name>_LOW_GAS_THRESHOLD stack secret
    - account-low-on-gas-<Config_Network_Name> sentinel
Note that it is important to keep consistent with the resource naming convention since this will allow an autotask to correctly determine the monitored network to retrieve the configured LOW_GAS_THRESHOLD value.
