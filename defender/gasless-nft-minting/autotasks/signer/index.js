const stackName = 'gasless_nft_minting';
const forwarderAddressSecretName = `${stackName}_FORWARDER_ADDRESS`;
const nftAddressSecretName = `${stackName}_NFT_ADDRESS`;

const { ethers } = require('ethers');
const { signMetaTxRequest } = require('./signer');
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
  // Validate addresses getAddress() will throw an error if they are not valid
  ethers.utils.getAddress(forwarderAddress);
  ethers.utils.getAddress(nftAddress);

  const provider = new DefenderRelayProvider(event);
  const signer = new DefenderRelaySigner(event, provider, { speed: 'fast' });

  let signerAddress;
  try {
    signerAddress = ethers.utils.getAddress(await signer.getAddress());
  } catch (error) {
    throw new Error('relayer not connected: ' + error)
  }
  const forwarderContract = new ethers.Contract(forwarderAddress, forwarderAbi, signer);
  const nftContract = new ethers.Contract(nftAddress, nftMinimalAbi, signer);

  console.log(`Signing mint request for ${recipientAddress}`);
  const id = ethers.BigNumber.from(1);;
  const qty = ethers.BigNumber.from(1);;
  const bytes = 0x0;
  const data = nftContract.interface.encodeFunctionData('mint', [recipientAddress, id, qty, bytes]);
  const result = await signMetaTxRequest(signer, forwarderContract, {
    to: nftAddress, from: signerAddress, data
  });

  console.log(`Signature: ${result.signature}`);
  console.log(`Request: ${result.request}\n`);
  return result;
}

module.exports = {
  handler,
}
