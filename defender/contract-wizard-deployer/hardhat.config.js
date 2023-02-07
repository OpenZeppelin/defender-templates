/* eslint-disable import/no-extraneous-dependencies */
require('@nomicfoundation/hardhat-toolbox');
require('@nomiclabs/hardhat-etherscan');

const etherscanApi = require('etherscan-api');
const req = require('require-yml');
const { ethers } = require('ethers');
const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');
const { AdminClient } = require('defender-admin-client');
require('dotenv').config();

// eslint-disable-next-line no-undef
subtask('verifySecrets', 'Validates all stored secrets and returns a provider and signer')
  .addOptionalVariadicPositionalParam('taskArgs', 'task arguments')
  .setAction(async (taskArgs) => {
    // Set default stage
    const { stage = 'dev' } = taskArgs;
    // Deployment requires Defender Admin and Relay
    if (taskArgs.simulate === false) {
      const secrets = req(`../.secrets/${stage}.yml`);
      const {
        'defender-api-key': defenderApiKey,
        'defender-api-secret': defenderSecretKey,
        'relay-api-key': relayApiKey,
        'relay-api-secret': relaySecretKey,
        'etherscan-api-key': etherscanApiKey,
      } = secrets.keys;

      if (defenderApiKey === undefined) {
        throw new Error('Could not find Defender API key in defender/.secrets/<stage>.yml');
      }
      if (defenderSecretKey === undefined) {
        throw new Error('Could not find Defender Secret Key in defender/.secrets/<stage>.yml');
      }
      if (relayApiKey === undefined) {
        throw new Error('Could not find Defender API key in defender/.secrets/<stage>.yml');
      }
      if (relaySecretKey === undefined) {
        throw new Error('Could not find Defender Secret Key in defender/.secrets/<stage>.yml');
      }
      if (etherscanApiKey === undefined) {
        throw new Error('Could not find Etherscan API Key in defender/.secrets/<stage>.yml');
      }

      // Test Defender Admin
      const client = new AdminClient({
        apiKey: defenderApiKey,
        apiSecret: defenderSecretKey,
      });

      try {
        await client.listContracts();
      } catch (error) {
        throw new Error(`Issue with Defender Admin: ${error}`);
      }
      console.log('Defender Admin is successfully connected');

      // Test Defender Relay
      const credentials = { apiKey: relayApiKey, apiSecret: relaySecretKey };
      const provider = new DefenderRelayProvider(credentials);
      const signer = new DefenderRelaySigner(credentials, provider, {
        speed: 'fast',
      });
      let relayAddress;
      let relayNetwork;
      try {
        relayAddress = await signer.getAddress();
        const chainId = await signer.getChainId();
        const chainIdMap = {
          1: 'mainnet',
          5: 'goerli',
        };
        relayNetwork = chainIdMap[chainId];
      } catch (error) {
        throw new Error(`Issue with Defender Relay: ${error}`);
      }
      console.log(`Defender Relay is on ${relayNetwork} using address: ${relayAddress}`);

      // Test Etherscan
      let relayBalance;
      const api = etherscanApi.init(etherscanApiKey, relayNetwork);
      try {
        ({ result: relayBalance } = await api.account.balance(relayAddress));
      } catch (error) {
        throw new Error(`Issue with Etherscan: ${error}`);
      }
      console.log('Etherscan is working');
      relayBalance = ethers.BigNumber.from(relayBalance);
      if (relayBalance.eq(0)) {
        throw new Error('Relay balance is zero, add some funds and try again');
      }

      return { provider, signer, relayNetwork };
    }
    return {};
  });

// eslint-disable-next-line no-undef
task('contract', 'Deploys contract')
  .addParam('contractName', 'Contract name')
  .addOptionalParam('stage', 'Deployment stage (uses dev by default)')
  .addFlag('simulate', 'Only simulates the blockchain effects')
  .addFlag('verify', 'Verifies contract on Etherscan')
  .addOptionalVariadicPositionalParam('constructorArgs', 'Constructor arguments')
  .setAction(async (taskArgs, hre) => {
    // Validate secrets and retrieve a provider and signer
    const {
      provider = hre.provider,
      // signer = (await hre.ethers.getsigners),
      network = 'hardhat',
    } = await hre.run('verifySecrets', taskArgs);


    console.log(hre.ethers.getSigners());
    const contractFactory = await hre.ethers.getContractFactory(taskArgs.contractName);
    console.log(`Deploying ${taskArgs.contractName} to ${network} network`);

    // let contract;
    // if (taskArgs.simulate === true) {
    //   const contract = await contractFactory.deploy();
    // } else {
    const contract = await contractFactory.connect(signer).deploy();
    // }
    console.log(`Deployed contract to ${contract.address} on ${network} network`);

    // const contract = await contractFactory.deploy();
    // await contract.deployed();
    // console.log(contract.address);
    console.log('Done');
  });

// eslint-disable-next-line no-undef
task('verify-etherscan', 'Verify deployed contract on Etherscan')
  .addParam('contractAddress', 'Contract address deployed')
  .setAction(async (contractAddress, hre) => {
    try {
      await hre.run('verify:verify', {
        address: contractAddress,
        contract: 'contracts/NFT.sol:NFT' // <path-to-contract>:<contract-name>
      });
    } catch ({ message }) {
      console.error(message);
    }
  });

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
