/* eslint-disable import/no-extraneous-dependencies */
require('@nomicfoundation/hardhat-toolbox');

const req = require('require-yml');
const { ethers } = require('ethers');
const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');
const { AdminClient } = require('defender-admin-client');
const { task } = require('hardhat/config');

// eslint-disable-next-line object-curly-newline
async function addContractToDefenderAdmin({ contract, name, client, network, address }) {
  let result;
  const contractInfo = {
    abi: JSON.stringify(contract.interface.format(ethers.utils.FormatTypes.json)),
    name,
    network,
    address,
  };
  try {
    result = await client.addContract(contractInfo);
  } catch (error) {
    console.error(`Error adding contract ${name} to Defender Admin: ${error}`);
    throw error;
  }
  return result;
}

function formatArgs(inputArgs) {
  let args = [];
  if (inputArgs) {
    args = inputArgs.map((arg) => {
      try {
        // Parse numbers and arrays from inputs. Double quoted inputs will be treated as strings
        // 1 = number 1
        // '1' = number 1
        // "1" = string '1'
        // '[ 123, "0x0000" ]' will be passed as an array containing a number and a string.
        return JSON.parse(arg);
      } catch (error) {
        return arg;
      }
    });
  }
  return args;
}

// eslint-disable-next-line no-undef
subtask('verifySecrets', 'Validates all stored secrets and returns signer')
  .addOptionalVariadicPositionalParam('taskArgs', 'task arguments')
  .setAction(async (taskArgs, hre) => {
    // Set default stage
    const { stage = 'dev' } = taskArgs;

    // Deployment requires Defender Admin and Relay
    if (taskArgs.simulate !== true) {
      const secrets = req(`../.secrets/${stage}.yml`);
      const {
        'defender-api-key': defenderApiKey,
        'defender-api-secret': defenderSecretKey,
        'relay-api-key': relayApiKey,
        'relay-api-secret': relaySecretKey,
      } = secrets.keys;

      if (defenderApiKey === undefined) {
        throw new Error('Could not find Defender API key in defender/.secrets/<stage>.yml');
      }
      if (defenderSecretKey === undefined) {
        throw new Error('Could not find Defender Secret key in defender/.secrets/<stage>.yml');
      }
      if (relayApiKey === undefined) {
        throw new Error('Could not find Relay API key in defender/.secrets/<stage>.yml');
      }
      if (relaySecretKey === undefined) {
        throw new Error('Could not find Relay Secret key in defender/.secrets/<stage>.yml');
      }

      // Test Defender Admin
      const adminClient = new AdminClient({
        apiKey: defenderApiKey,
        apiSecret: defenderSecretKey,
      });

      try {
        await adminClient.listContracts();
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

      return {
        signer, signerAddress, signerNetwork, adminClient,
      };
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
      adminClient,
      signer,
      signerNetwork,
    } = await hre.run('verifySecrets', taskArgs);

    // Compile all contracts
    await hre.run('compile');

    const args = formatArgs(taskArgs.constructorArgs);

    const contractFactory = await hre.ethers.getContractFactory(taskArgs.contractName);
    console.log(`Deploying ${taskArgs.contractName} to ${signerNetwork} network`);
    if (args.length > 0) {
      console.log(`with arguments ${JSON.stringify(args)}`);
    }
    const contract = await contractFactory.connect(signer).deploy(...args);
    console.log(`Deployed contract to ${contract.address} on ${signerNetwork} network`);

    if (taskArgs.simulate === false) {
      // Add contract to Defender
      const contractObject = {
        contract,
        name: taskArgs.contractName,
        client: adminClient,
        network: signerNetwork,
        address: contract.address,
      };
      await addContractToDefenderAdmin(contractObject);
      console.log(`Added ${contractObject.name} to Defender`);
    }
  });

// eslint-disable-next-line no-undef
task('governance', 'Deploys Token, Timelock and Governor contracts with Defender Relay as the admin and owner')
  .addParam('tokenName', 'Token contract name')
  .addParam('timelockName', 'Timelock contract name')
  .addParam('governorName', 'Governor contract name')
  .addOptionalParam('stage', 'Deployment stage (uses dev by default)')
  .addFlag('simulate', 'Only simulates the blockchain effects')
  .addOptionalVariadicPositionalParam('constructorArgs', 'Constructor arguments')
  .setAction(async (taskArgs, hre) => {
    // Validate secrets and retrieve a provider and signer
    const {
      adminClient,
      signer,
      signerNetwork,
      signerAddress,
    } = await hre.run('verifySecrets', taskArgs);

    // Compile all contracts
    await hre.run('compile');

    const tokenFactory = await hre.ethers.getContractFactory(taskArgs.tokenName);
    const timelockFactory = await hre.ethers.getContractFactory(taskArgs.timelockName);
    const governorFactory = await hre.ethers.getContractFactory(taskArgs.governorName);

    // --------
    // Token contract deployment
    // --------
    const tokenArgs = [];

    console.log(`Deploying ${taskArgs.tokenName} to ${signerNetwork} network`);
    if (tokenArgs.length > 0) {
      console.log(`with arguments ${JSON.stringify(tokenArgs)}`);
    }
    const token = await tokenFactory.connect(signer).deploy(...tokenArgs);
    await token.deployed();
    console.log(`Successfully deployed token to ${token.address} on ${signerNetwork} network`);

    if (taskArgs.simulate === false) {
      // Add token to Defender
      const tokenObject = {
        contract: token,
        name: taskArgs.tokenName,
        client: adminClient,
        network: signerNetwork,
        address: token.address,
      };
      await addContractToDefenderAdmin(tokenObject);
      console.log(`Added ${tokenObject.name} to Defender`);
    }

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
    const timelockArgs = [minDelay, proposers, executors, admin];

    console.log(`Deploying ${taskArgs.timelockName} to ${signerNetwork} network`);
    if (timelockArgs.length > 0) {
      console.log(`with arguments ${JSON.stringify(timelockArgs)}`);
    }
    const timelock = await timelockFactory.connect(signer).deploy(...timelockArgs);
    await timelock.deployed();
    console.log(`Successfully deployed timelock to ${timelock.address} on ${signerNetwork} network`);

    if (taskArgs.simulate === false) {
      // Add timelock to Defender
      const timelockObject = {
        contract: timelock,
        name: taskArgs.timelockName,
        client: adminClient,
        network: signerNetwork,
        address: timelock.address,
      };
      await addContractToDefenderAdmin(timelockObject);
      console.log(`Added ${timelockObject.name} to Defender`);
    }
    // --------
    // Governor contract deployment
    // expects arguments: address token, address timelock
    // --------
    const governorArgs = [token.address, timelock.address];

    console.log(`Deploying ${taskArgs.governorName} to ${signerNetwork} network`);
    if (governorArgs.length > 0) {
      console.log(`with arguments ${JSON.stringify(governorArgs)}`);
    }
    const governor = await governorFactory.connect(signer).deploy(...governorArgs);
    await governor.deployed();
    console.log(`Successfully deployed governor to ${governor.address} on ${signerNetwork} network`);

    if (taskArgs.simulate === false) {
      // Add governor to Defender
      const governorObject = {
        contract: governor,
        name: taskArgs.governorName,
        client: adminClient,
        network: signerNetwork,
        address: governor.address,
      };
      await addContractToDefenderAdmin(governorObject);
      console.log(`Added ${governorObject.name} to Defender`);
    }
  });

// eslint-disable-next-line no-undef
task('to-defender', 'Adds specified contract to Defender and verifies it on Etherscan')
  .addParam('contractName', 'Contract name')
  .addParam('contractAddress', 'Address of deployed contract')
  .addParam('contractNetwork', 'Network that contract is deployed to')
  .addOptionalParam('stage', 'Deployment stage (uses dev by default)')
  .addOptionalVariadicPositionalParam('constructorArgs', 'Constructor arguments')
  .setAction(async (taskArgs, hre) => {
    // Validate secrets and retrieve a provider and signer
    const {
      adminClient: client,
    } = await hre.run('verifySecrets', taskArgs);
    const signerNetwork = 'hardhat';

    // Compile all contracts first
    await hre.run('compile');

    const args = formatArgs(taskArgs.constructorArgs);

    const contractFactory = await hre.ethers.getContractFactory(taskArgs.contractName);
    console.log('Testing deployment arguments');
    console.log(`Deploying ${taskArgs.contractName} to ${signerNetwork} network`);
    if (args.length > 0) {
      console.log(`with arguments ${JSON.stringify(args)}`);
    }
    const contract = await contractFactory.deploy(...args);
    console.log(`Deployed contract to ${contract.address} on ${signerNetwork} network`);

    const {
      contractName,
      contractAddress,
      contractNetwork,
    } = taskArgs;

    const result = await addContractToDefenderAdmin({
      contract,
      name: contractName,
      client,
      network: contractNetwork,
      address: contractAddress,
    });
    console.log(`Successfully added ${contractName} to Defender with contract ID: ${result.contractId}`);
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
};
