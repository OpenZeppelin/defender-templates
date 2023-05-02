# Account Low on gas monitor

This Defender Sentinel will send notification alert whenever any of monitored accounts balance after transaction is below the minimum threshold value.

Setup:

Use `config.dev.yml` for development staging or rename it to `config.<stage>.yml`

You can set up list of accounts to monitor for as well as theshold value specifically per blockchain. In template there are two networks supported, however you can easily extend this monitoring to more networks by:

1. Extending configuration file with new network: <Config_Network_Name>
2. Creating new resources within `serverless.yml`:
    -  <Config_Network_Name>-Reader relayer
    - <Config_Network_Name>_LOW_GAS_THRESHOLD stack secret
    - account-low-on-gas-<Config_Network_Name> sentinel
Note that it is important to keep consistency of resource namings since this will allow an autotask to correctly detect network it is on and look up an apropriate LOG_GAS_THRESHOLD configuration.
