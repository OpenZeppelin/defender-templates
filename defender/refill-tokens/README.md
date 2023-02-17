# Refill tokens template

Takes some address that is being monitored for some particular token balance on a scheduled time basis. If the balance is below a value defined as maximum, the Autotask will attempt to top-up the address with that token.

## Setting up
1. Setup secrets in `../.secrets/dev.yml`
2. Compile initial autotask version and deploy configuration to Defender:
```
cd autotasks/refill-tokens/
yarn build
cd ../../
sls deploy
```
4. Log in to your defender account, fund relayer, copy relayer address and use it to deploy contracts:
This template supports ERC20, ERC721 and ERC1155 use case. Deploy one of these:
```
yarn hardhat --network <network> deployContract --contract-name ERC1155Mock constructorArgs <tokenURI> <relayerAddress>
yarn hardhat --network <network> deployContract --contract-name ERC721Mock constructorArgs <relayerAddress>
yarn hardhat --network <network> deployContract --contract-name ERC20Mock constructorArgs <tokenName> <symbol> <relayerAddress>
```
5. Once deployed write down your contract address to `/autotasks/refill-tokens/index.js` in `TOKEN_ADDRESS`
6. Fill `REFILL_ADDRESS` in `/autotasks/refill-tokens/index.js` and configure `TOKEN_TYPE`, `ERC1155ID`, `REFILL_VALUE` `FILLED_VALUE` to needed values. 
10. run `sls deploy` once again (you can change in `serverless.yml` autotask to `paused: false` and/or frequency parameter) or go to web UI and change those manually. 

Done! 

Now once `REFILL_ADDRESS` account balance is below `FILLED_VALUE` each time autotask runs it will add `REFILL_VALUE` number of tokens to that address. 
