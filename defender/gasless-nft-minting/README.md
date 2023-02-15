# Gasless NFT Minter

This code will allow users to deploy an ERC-2771-compatible ERC-1155 NFT contract and then use one autotask to sign a mint request, and another Autotask to relay the request to a trusted forwarder which will send the request to the NFT contract to mint an NFT for the user.

## Setup TODO
- Acquire Defender and Relay keys
- Add funds to the Relay
- Deploy contracts
  - `yarn deploy contract --contract-name MinimalForwarder`
  - `yarn deploy contract --contract-name DemoNFT "0xMINIMAL_FORWARDER_ADDRESS"`
- Update `config.dev.yml` with the 2 deployed contract addresses
- Deploy the Autotasks with `serverless deploy`
- Connect Relays to deployed Autotasks
  - Contract Deployer relay must be connected to the signing Autotask
  - Any Relayer with funds can be connected to the Relay Autotask
- Copy the 2 Autotask webhooks into the `config.dev.yml` file

## Usage
- `yarn sign <address>` - to have the Relayer sign a mint request
- `yarn relay <request file or stringified JSON> - to relay the request and mint the NFT to the user
- `yarn sign <address> | xargs yarn relay ` - to combine both steps

## Notes
This is a proof of concept template, the Autotask currently allow for unlimited mints of NFTs and can be easily abused until the Relay runs out of funds.
