// Much of signer.js was sourced from here: 
// ref: https://github.com/OpenZeppelin/workshops/blob/master/01-defender-meta-txs/src/signer.js
const EIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];

const ForwardRequest = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'gas', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'data', type: 'bytes' },
];

function getMetaTxTypeData(chainId, verifyingContract) {
  return {
    types: {
      EIP712Domain,
      ForwardRequest,
    },
    domain: {
      name: 'MinimalForwarder',
      version: '0.0.1',
      chainId,
      verifyingContract,
    },
    primaryType: 'ForwardRequest',
  };
}

async function signTypedData(signer, from, data) {
  // Check the class of the signer
  console.log(`Signer is a ${signer.constructor.name}`);

  if (signer.constructor.name === 'String') {
    throw new Error('private key signing is not implemented');
    // It could be implemented with minor changes but requires more dependencies. See below:
    // const ethSigUtil = require('eth-sig-util');
    // const privateKey = Buffer.from(signer.replace(/^0x/, ''), 'hex');
    // return ethSigUtil.signTypedMessage(privateKey, { data });
  }

  if (signer.constructor.name === 'Relayer') {
    throw new Error('Relayer is not a supported EIP712 signer, please use DefenderRelaySigner instead');
  }   

  // If signer is a DefenderRelaySigner, then use '_signTypedData'
  if (signer.constructor.name === 'DefenderRelaySigner') {
    const { domain, types, message: value } = data;
    
    // Remove unused type
    delete types.EIP712Domain;
    const typedSig = await signer._signTypedData(domain, types, value);
    return typedSig
  }

  // Otherwise, use 'eth_signTypedData_v4' RPC call (Metamask/Hardhat)
  // Only Available for JsonRpcSigners
  return await signer.send('eth_signTypedData_v4', [from, JSON.stringify(data)]);
}

async function buildRequest(forwarder, input) {
  const nonce = await forwarder.getNonce(input.from).then(nonce => nonce.toString());
  return { value: 0, gas: 1e6, nonce, ...input };
}

async function buildTypedData(forwarder, request) {
  const chainId = await forwarder.provider.getNetwork().then(n => n.chainId);
  const typeData = getMetaTxTypeData(chainId, forwarder.address);
  return { ...typeData, message: request };
}

async function signMetaTxRequest(signer, forwarder, input) {
  const request = await buildRequest(forwarder, input);
  const toSign = await buildTypedData(forwarder, request);
  const signature = await signTypedData(signer, input.from, toSign);
  return { signature, request };
}

module.exports = {
  signMetaTxRequest,
  buildRequest,
  buildTypedData,
};
