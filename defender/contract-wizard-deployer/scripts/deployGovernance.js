const { ethers } = require('hardhat');

const {
  DefenderRelaySigner,
  DefenderRelayProvider,
} = require('defender-relay-client/lib/ethers');
const { AdminClient } = require('defender-admin-client');
require('dotenv').config();

const relayerApiKey = process.env.RELAYER_API_KEY;
if (relayerApiKey === undefined) {
  throw new Error('Could not find Relay API key in the environment secrets');
}
const relayerApiSecret = process.env.RELAYER_SECRET_KEY;
if (relayerApiSecret === undefined) {
  throw new Error('Could not find Relay Secret Key in the environment secrets');
}
const adminApiKey = process.env.DEFENDER_API_KEY;
if (adminApiKey === undefined) {
  throw new Error('Could not find Defender API Key in the environment secrets');
}
const adminApiSecret = process.env.DEFENDER_SECRET_KEY;
if (adminApiSecret === undefined) {
  throw new Error(
    'Could not find Defender Secret Key in the environment secrets',
  );
}

const credentials = { apiKey: relayerApiKey, apiSecret: relayerApiSecret };
const provider = new DefenderRelayProvider(credentials);
const signer = new DefenderRelaySigner(credentials, provider, {
  speed: 'fast',
});
const client = new AdminClient({
  apiKey: adminApiKey,
  apiSecret: adminApiSecret,
});

async function main() {
  console.log('Looking up Relay address');
  let relayAddress = await signer.getAddress();
  relayAddress = ethers.utils.getAddress(relayAddress);
  console.log(`Deploying contracts with ${relayAddress}. Please wait...`);

  // --------
  // Token contract deployment
  // --------
  // deploy the DemoToken contract
  const DemoToken = await ethers.getContractFactory("DemoToken");
  const demoToken = await DemoToken.connect(signer).deploy();
  await demoToken.deployed();

  console.log(`DemoToken deployed to: ${demoToken.address}`);

  // --------
  // Timelock contract deployment
  // expect arguments: uint256 minDelay, address[] proposers, address[] executors
  // --------
  const minDelay = ethers.BigNumber.from(0);
  // Proposers and executors can be an array of addresses
  // use the same addresses used for the proposers, executors and admin
  const proposers = [relayAddress];
  const executors = [relayAddress];
  const admin = relayAddress;

  // deploy the DemoTimelock contract
  const DemoTimelock = await ethers.getContractFactory("DemoTimelock");
  await DemoTimelock.connect(signer);
  const demoTimelock = await DemoTimelock.connect(signer).deploy(minDelay, proposers, executors, admin);
  await demoTimelock.deployed();

  console.log(`DemoTimelock deployed to: ${demoTimelock.address}`);

  // --------
  // Governor contract deployment
  // expects arguments: address token, address timelock
  // --------
  const DemoGovernor = await ethers.getContractFactory("DemoGovernor");
  const demoGovernor = await DemoGovernor.connect(signer).deploy(demoToken.address, demoTimelock.address);
  await demoGovernor.deployed();

  console.log(`DemoGovernor deployed to: ${demoGovernor.address}`);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
