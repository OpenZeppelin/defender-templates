const { ethers } = require('ethers');
const { signMetaTxRequest } = require('./signer');
const { readFileSync, writeFileSync } = require('fs');

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

  const signer = new DefenderRelaySigner(credentials, provider, { speed: 'fast' });

  const forwarder = new ethers.utils.Interface(forwarderAbi);
  const nft = new ethers.utils.Interface(nftMinimalAbi);

  const id = 1;
  const qty = 1;
  const bytes = 0x0;


  // const { NAME: name, PRIVATE_KEY: signer } = process.env;
  const from = new ethers.Wallet(signer).address;
  console.log(`Signing mint request for ${recipientAddress}`);
  const data = nft.interface.encodeFunctionData('mint', [recipientAddress, id, qty, bytes] );
  const result = await signMetaTxRequest(signer, forwarder, {
    to: recipientAddress, from, data
  });



  writeFileSync('tmp/request.json', JSON.stringify(result, null, 2));
  console.log(`Signature: `, result.signature);
  console.log(`Request: `, result.request);


  console.log(`Signing`, request);

  // // Initialize Relayer provider and signer, and forwarder contract
  // const credentials = { ...event };
  // const provider = new DefenderRelayProvider(credentials);
  // const signer = new DefenderRelaySigner(credentials, provider, { speed: 'fast' });
  // const forwarder = new ethers.Contract(ForwarderAddress, forwarderAbi, signer);

  // Relay transaction!
  const tx = await relay(forwarder, request, signature);
  console.log(`Sent meta-tx: ${tx.hash}`);
  return { txHash: tx.hash };
}

module.exports = {
  handler,
}