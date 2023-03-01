const stackName = 'gasless_nft_minting';
const forwarderAddressSecretName = `${stackName}_FORWARDER_ADDRESS`;

const { ethers } = require('ethers');
const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');

const forwarderAbi = [
  'function execute(tuple(address from, address to, uint256 value, uint256 gas, uint256 nonce, bytes data) req, bytes signature) payable returns (bool, bytes)',
  'function getNonce(address from) view returns (uint256)',
  'function verify(tuple(address from, address to, uint256 value, uint256 gas, uint256 nonce, bytes data) req, bytes signature) view returns (bool)',
];

async function relay(forwarder, request, signature) {
  // Validate request on the forwarder contract
  const valid = await forwarder.verify(request, signature);
  if (!valid) throw new Error(`Invalid request`);

  // Send meta-tx through relayer to the forwarder contract
  const gasLimit = (parseInt(request.gas) + 50000).toString();
  return await forwarder.execute(request, signature, { gasLimit });
}

async function handler(event) {
  // Parse webhook payload
  if (!event?.request?.body?.request) throw new Error(`request missing`);
  if (!event?.request?.body?.signature) throw new Error(`signature missing`);
  const { request, signature } = event.request.body;

  // Get address
  if (!event?.secrets) {
    throw new Error('secrets undefined');
  }
  const forwarderAddress = event.secrets[forwarderAddressSecretName];
  ethers.utils.getAddress(forwarderAddress);

  // Initialize Relayer provider and signer, and forwarder contract
  const credentials = { ...event };
  const provider = new DefenderRelayProvider(credentials);
  const signer = new DefenderRelaySigner(credentials, provider, { speed: 'fast' });
  const forwarder = new ethers.Contract(forwarderAddress, forwarderAbi, signer);

  // Test relay
  try {
    await signer.getAddress();
  } catch (error) {
    console.error('Relay is not working, check if it is connected : ', error);
    throw error;
  }

  // Relay transaction!
  console.log(`Relaying`, request);
  const tx = await relay(forwarder, request, signature);
  console.log(`Sent meta-tx: ${tx.hash}`);
  return { txHash: tx.hash };
}

module.exports = {
  handler,
  relay,
};
