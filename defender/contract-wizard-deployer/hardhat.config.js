require('@nomicfoundation/hardhat-toolbox');
require('@nomiclabs/hardhat-etherscan');

const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');
const { AdminClient } = require('defender-admin-client');
require('dotenv').config();

task('contract', 'Deploys contract')
  .addParam('contractName', 'contract name')
  .addFlag('simulate', 'only simulates the blockchain effects')
  .addFlag('verify', 'Verifies contract on Etherscan')
  .addOptionalVariadicPositionalParam('constructorArgs', 'Constructor arguments')
  .setAction(async (taskArgs, hre) => {
    const contractFactory = await hre.ethers.getContractFactory(taskArgs.contractName);
    if (!taskArgs.simulate) {
      const relayerApiKey = process.env.RELAYER_API_KEY;
      if (relayerApiKey === undefined) {
        throw new Error('Could not find Relay API key in the environment secrets');
      }
      const relayerApiSecret = process.env.RELAYER_SECRET_KEY;
      if (relayerApiSecret === undefined) {
        throw new Error('Could not find Relay Secret Key in the environment secrets');
      }

      const credentials = { apiKey: relayerApiKey, apiSecret: relayerApiSecret };
      const provider = new DefenderRelayProvider(credentials);
      const signer = new DefenderRelaySigner(credentials, provider, {
        speed: 'fast',
      });

      await contractFactory.connect(signer);
    }
    const contract = await contractFactory.deploy();
    await contract.deployed();
    console.log(contract.address);
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
