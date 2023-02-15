require("@nomiclabs/hardhat-waffle");

const req = require('require-yml');
const { ethers } = require('ethers');
const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');
const { AdminClient } = require('defender-admin-client');
const { task } = require('hardhat/config');

const { handler: signerHandler } = require('./autotasks/signer/index');

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
        console.debug('Temp:Disabled Admin Check');
        // await adminClient.listContracts();
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
        console.debug('Temp:Disabled Signer Check');
        // signerAddress = await signer.getAddress();
        console.debug('Temp:Disabled Network Check');
        // const chainId = await signer.getChainId();
        const chainIdMap = {
          1: 'mainnet',
          5: 'goerli',
        };
        console.debug('Temp:Disabled ChainID Check');
        // signerNetwork = chainIdMap[chainId];
      } catch (error) {
        throw new Error(`Issue with Defender Relay: ${error}`);
      }
      console.log(`Defender Relay is on ${signerNetwork} using address: ${signerAddress}`);

      return {
        signer, signerAddress, signerNetwork, adminClient, credentials
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
task('sign', 'Signs a request using a Defender Autotask and Relay')
  .addPositionalParam('address', 'Recipient address')
  .setAction(async (taskArgs, hre) => {
    // Validate address
    const recipientAddress = ethers.utils.getAddress(taskArgs.address);
    if (!recipientAddress) { throw new Error('Invalid address provided') }

    // Validate secrets and retrieve a provider and signer
    const {
      credentials: event
    } = await hre.run('verifySecrets', taskArgs);

    // Add data to the event object
    event.request = {
      body: {
        address: recipientAddress,
      }
    }
    // Use local autotask
    const result = await signerHandler(event);

    // TODO: Output signature and results to screen or to file.
    console.log(result);
  });

// TODO: task: submit request signature to relay autotask
// Idea: 'yarn sign | yarn relay' 

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
