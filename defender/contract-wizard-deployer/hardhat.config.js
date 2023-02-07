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
subtask('verifySecrets', 'Validates all stored secrets and returns signer')
  .addOptionalVariadicPositionalParam('taskArgs', 'task arguments')
  .setAction(async (taskArgs, hre) => {
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
      let signerAddress;
      let signerNetwork;
      try {
        signerAddress = await signer.getAddress();
        const chainId = await signer.getChainId();
        const chainIdMap = {
          1: 'mainnet',
          5: 'goerli',
        };
        signerNetwork = chainIdMap[chainId];
      } catch (error) {
        throw new Error(`Issue with Defender Relay: ${error}`);
      }
      console.log(`Defender Relay is on ${signerNetwork} using address: ${signerAddress}`);

      // Test Etherscan
      let relayBalance;
      const api = etherscanApi.init(etherscanApiKey, signerNetwork);
      try {
        ({ result: relayBalance } = await api.account.balance(signerAddress));
      } catch (error) {
        throw new Error(`Issue with Etherscan: ${error}`);
      }
      console.log('Etherscan is working');
      relayBalance = ethers.BigNumber.from(relayBalance);
      if (relayBalance.eq(0)) {
        throw new Error('Relay balance is zero, add some funds and try again');
      }

      return { signer, signerAddress, signerNetwork };
    }

    // If simulate flag is enabled
    const [signer] = await hre.ethers.getSigners();
    const signerAddress = await signer.getAddress();
    return { signer, signerAddress, signerNetwork: 'hardhat' };
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
      signer,
      signerNetwork,
    } = await hre.run('verifySecrets', taskArgs);

    const contractFactory = await hre.ethers.getContractFactory(taskArgs.contractName);
    console.log(`Deploying ${taskArgs.contractName} to ${signerNetwork} network`);
    const contract = await contractFactory.connect(signer).deploy();
    console.log(`Deployed contract to ${contract.address} on ${signerNetwork} network`);
    console.log('Done');
    return contract;
  });

// eslint-disable-next-line no-undef
task('governance', 'Deploys Token, Timelock and Governor contracts with Defender Relay as the admin and owner')
  .addParam('tokenName', 'Token contract name')
  .addParam('timelockName', 'Timelock contract name')
  .addParam('governorName', 'Governor contract name')
  .addOptionalParam('stage', 'Deployment stage (uses dev by default)')
  .addFlag('simulate', 'Only simulates the blockchain effects')
  .addFlag('verify', 'Verifies contract on Etherscan')
  .addOptionalVariadicPositionalParam('constructorArgs', 'Constructor arguments')
  .setAction(async (taskArgs, hre) => {
    // Validate secrets and retrieve a provider and signer
    const {
      signer,
      signerNetwork,
      signerAddress,
    } = await hre.run('verifySecrets', taskArgs);

    // Compile contracts
    const tokenFactory = await hre.ethers.getContractFactory(taskArgs.tokenName);
    const timelockFactory = await hre.ethers.getContractFactory(taskArgs.timelockName);
    const governorFactory = await hre.ethers.getContractFactory(taskArgs.governorName);

    // --------
    // Token contract deployment
    // --------
    console.log(`Deploying ${taskArgs.tokenName} to ${signerNetwork} network`);
    const token = await tokenFactory.connect(signer).deploy();
    await token.deployed();
    console.log(`Deployed token to ${token.address} on ${signerNetwork} network`);

    // --------
    // Timelock contract deployment
    // expect arguments: uint256 minDelay, address[] proposers, address[] executors, address admin
    // --------
    const minDelay = ethers.BigNumber.from(0);
    // Proposers and executors must be an array of addresses
    // use the same addresses used for the proposers, executors and admin
    const proposers = [signerAddress];
    const executors = [signerAddress];
    const admin = signerAddress;

    // deploy the DemoTimelock contract
    console.log(`Deploying ${taskArgs.timelockName} to ${signerNetwork} network`);
    const timelock = await timelockFactory.connect(signer)
      .deploy(minDelay, proposers, executors, admin);
    await timelock.deployed();
    console.log(`Deployed timelock to ${timelock.address} on ${signerNetwork} network`);

    // --------
    // Governor contract deployment
    // expects arguments: address token, address timelock
    // --------
    console.log(`Deploying ${taskArgs.governorName} to ${signerNetwork} network`);
    const governor = await governorFactory.connect(signer)
      .deploy(token.address, timelock.address);
    await governor.deployed();
    console.log(`Deployed governor to ${governor.address} on ${signerNetwork} network`);
  });

// eslint-disable-next-line no-undef
task('verify-etherscan', 'Verify deployed contract on Etherscan')
  .addParam('contractAddress', 'Contract address deployed')
  .setAction(async (contractAddress, hre) => {
    try {
      await hre.run('verify:verify', {
        address: contractAddress,
        contract: 'contracts/NFT.sol:NFT', // <path-to-contract>:<contract-name>
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
