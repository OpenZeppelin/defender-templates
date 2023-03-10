require('@nomiclabs/hardhat-waffle');

const req = require('require-yml');
const axios = require('axios');
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
    args = inputArgs.map(arg => {
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
        signer,
        signerAddress,
        signerNetwork,
        adminClient,
        credentials,
      };
    }

    // If simulate flag is enabled
    const [signer] = await hre.ethers.getSigners();
    const signerAddress = await signer.getAddress();
    return { signer, signerAddress, signerNetwork: 'hardhat' };
  });

// eslint-disable-next-line no-undef
task('contract', 'Deploys contract using Defender Relay')
  .addParam('contractName', 'Contract name')
  .addOptionalParam('stage', 'Deployment stage (uses dev by default)')
  .addFlag('simulate', 'Only simulates the blockchain effects')
  .addOptionalVariadicPositionalParam('constructorArgs', 'Constructor arguments')
  .setAction(async (taskArgs, hre) => {
    // Validate secrets and retrieve a provider and signer
    const { adminClient, signer, signerNetwork } = await hre.run('verifySecrets', taskArgs);

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
task('sign', 'Signs a request using a Defender Autotask and Relay')
  .addOptionalParam('stage', 'Deployment stage (uses dev by default)')
  .addPositionalParam('address', 'Recipient address')
  .setAction(async taskArgs => {
    // Set default stage
    const { stage = 'dev' } = taskArgs;

    // Validate address
    const address = ethers.utils.getAddress(taskArgs.address);
    if (!address) {
      throw new Error('Invalid address provided');
    }

    // Retrieve webhooks from config
    const config = req(`./config.${stage}.yml`);
    const { 'signer-webhook': signerWebhook } = config;

    const response = await axios.post(signerWebhook, { address });
    if (response.data?.message){
      console.error('Signer failed with error', response.data?.message);
      return false;
    }

    const result = JSON.parse(response.data?.result);
    console.log('Autotask response:\n\n', result, '\n\nStringified:\n\n', JSON.stringify(result), '\n');
  });

// eslint-disable-next-line no-undef
task('relay', 'Sends a signed request to a trusted forwarder using a Defender Autotask and Relay')
  .addOptionalParam('stage', 'Deployment stage (uses dev by default)')
  .addPositionalParam('signedRequest', 'Stringified JSON containing a request and signature')
  .setAction(async taskArgs => {
    // Set default stage
    const { stage = 'dev' } = taskArgs;

    // Validate address
    const signedRequest = JSON.parse(taskArgs.signedRequest);
    if (!signedRequest) { throw new Error('Unable to parse signed request') };
    const { signature, request } = signedRequest;
    if (!signature) { throw new Error('signature not found in signed request') };
    if (!request) { throw new Error('request not found in signed request') };

    // Retrieve webhooks from config
    const config = req(`./config.${stage}.yml`);
    const { 'relayer-webhook': relayerWebhook } = config;

    const response = await axios.post(relayerWebhook, { signature, request });
    if (response.data?.message){
      console.error('Relay failed with error', response.data?.message);
      return false;
    }
    const result = JSON.parse(response.data?.result);
    
    console.log('Autotask response:\n\n', result, '\n\nStringified:\n\n', JSON.stringify(result), '\n');
  });

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
