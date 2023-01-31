# Governance summary template

A Defender Autotask to periodically check and display the status of active proposals on an OpenZeppelin GovernorCompatibilityBravo contract.

## Setting up
1. Setup secrets in `../secrets.dev.yml`, required keys:
```yaml 
keys:
  api: <DEFENDER_API_KEY>
  secret: <DEFENDER_SECRET>
```
2. Update `serverless.yml` with the address of the Governor Bravo contract:
```yaml
  .
  .
  defenderSecrets:
    # Public Variables
    # Governance Address
    governanceAddress: "<CONTRACT_ADDRESS>"
  .
  .
```
3. Deploy the Autotask to your Defender account:
```console
$ serverless deploy
```
4. Watch for logs to appear in your Defender account.  Log into your Defender account, click on the Governance Summary Autotask.