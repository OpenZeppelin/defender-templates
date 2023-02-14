const { ethers } = require('ethers');
const { signMetaTxRequest } = require('./signer');
const { Relayer } = require('defender-relay-client');

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
  if (!event.request?.body?.address) throw new Error(`Missing payload`);
  const { address: recipientAddress } = event.request.body;

  const forwarderAddress = '0x4866e460Aa5e999b6146B9D9Aaa6d758306B49a3';
  const nftAddress = '0xBa72B6572dEDaaA3a9e9b9E9E9601528418bCFcA';

  const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');

  const provider = new DefenderRelayProvider(event);
  const signer = new DefenderRelaySigner(event, provider, { speed: 'fast' });

  const relayer = new Relayer(event);
  const { address: from } = await relayer.getRelayer();
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

  console.log(`Signature: `, result.signature);
  console.log(`Request: `, result.request);

  // // Initialize Relayer provider and signer, and forwarder contract
  // const credentials = { ...event };
  // const provider = new DefenderRelayProvider(credentials);
  // const signer = new DefenderRelaySigner(credentials, provider, { speed: 'fast' });
  // const forwarder = new ethers.Contract(ForwarderAddress, forwarderAbi, signer);

  // Relay transaction!
  // const tx = await relay(forwarder, request, signature);
  // console.log(`Sent meta-tx: ${tx.hash}`);
  // return { txHash: tx.hash };
}

module.exports = {
  handler,
}