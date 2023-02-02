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

## Local testing with Hardhat

In order to run tests against a forked version of the mainnet, you will need a JSON RPC server with access to an archive node. Both Alchemy's and Infura's free plans will suffice.

### Running the Hardhat node

In the `defender` directory, perform the following steps:

- Run `npm i` to install the necessary Node packages
- Run `npx hardhat node` to start the node

In another terminal, navigate to the `defender` directory and then:

- Create or modify an `.env` file in this directory
  - Add `ETHEREUM_MAINNET_JSON_RPC_URL=<JSON RPC URL>` to `.env` file, replacing the angle brackets `<>` with your actual RPC URL (ex. https://eth-mainnet.g.alchemy.com/v2/xxxx or https://mainnet.infura.io/v3/xxxx)
- To test the Autotask against a generic Governor contract, run:
  - `npx jest governance_summary/tests/governor-summary.hh.spec.js`
- To test the Autotask against a Governor Compatibility Bravo contract, run:
- `npx jest governance_bravo_summary/tests/governor-bravo-summary.hh.spec.js`

To stop the Hardhat node, switch back the first terminal and press `CTRL-C` or `Command-C` (for Mac OS).

Note: The first time that the test is run, it can take up to 2 minutes to cache the archived blocks. Subsequent runs should around 15 seconds to complete.