const stackName = 'gasless_nft_minting';
const forwarderAddressSecretName = `${stackName}_FORWARDER_ADDRESS`;
const nftAddressSecretName = `${stackName}_NFT_ADDRESS`;

const { ethers } = require('ethers');
const { signMetaTxRequest } = require('./signer');
const { Relayer } = require('defender-relay-client');
const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');

const nftMinimalAbi = [
  'function mint(address account, uint256 id, uint256 amount, bytes data)',
];

const forwarderAbi = [
  'function execute(tuple(address from, address to, uint256 value, uint256 gas, uint256 nonce, bytes data) req, bytes signature) payable returns (bool, bytes)',
  'function getNonce(address from) view returns (uint256)',
  'function verify(tuple(address from, address to, uint256 value, uint256 gas, uint256 nonce, bytes data) req, bytes signature) view returns (bool)'
];

async function handler(event) {
  // Parse webhook payload
  if (!event?.request?.body?.address) throw new Error(`address missing`);
  const { address: recipientAddress } = event.request.body;
  ethers.utils.getAddress(recipientAddress);

  // Get addresses
  if (!event?.secrets) { throw new Error('secrets undefined'); }
  const forwarderAddress = event.secrets[forwarderAddressSecretName];
  const nftAddress = event.secrets[nftAddressSecretName];
  ethers.utils.getAddress(forwarderAddress);
  ethers.utils.getAddress(nftAddress);

  const provider = new DefenderRelayProvider(event);
  const signer = new DefenderRelaySigner(event, provider, { speed: 'fast' });
  const relayer = new Relayer(event);

  let from;
  try {
    ({ address: from } = await relayer.getRelayer());
  } catch (error) {
    throw new Error('relayer not connected: ' + error)
  }
  const forwarder = new ethers.Contract(forwarderAddress, forwarderAbi, signer);
  const nft = new ethers.Contract(nftAddress, nftMinimalAbi, signer);

  console.log(`Signing mint request for ${recipientAddress}`);
  const id = 1;
  const qty = 1;
  const bytes = 0x0;
  const data = nft.interface.encodeFunctionData('mint', [recipientAddress, id, qty, bytes]);
  const result = await signMetaTxRequest(relayer, forwarder, {
    to: recipientAddress, from, data
  });

  console.log(`Signature: ${result.signature}`);
  console.log(`Request: ${result.request}\n`);
  return JSON.stringify(result);
}

module.exports = {
  handler,
}