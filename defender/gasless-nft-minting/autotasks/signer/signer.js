const { ethers } = require('ethers');

const EIP712Domain = [
  { name: 'name', type: 'string' },
  { name: 'version', type: 'string' },
  { name: 'chainId', type: 'uint256' },
  { name: 'verifyingContract', type: 'address' },
];
const EIP712DomainTypes = EIP712Domain.map(x => x.type);

const ForwardRequest = [
  { name: 'from', type: 'address' },
  { name: 'to', type: 'address' },
  { name: 'value', type: 'uint256' },
  { name: 'gas', type: 'uint256' },
  { name: 'nonce', type: 'uint256' },
  { name: 'data', type: 'bytes' },
];
const requestTypes = ForwardRequest.map(x => x.type);

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
  // If signer is a relay, then use Defender
  if (signer.relayer) {
    const { domain, message } = data;
    const abiCoder = new ethers.utils.AbiCoder();

    // Domain and request need to encoded and keccak256 hashed before sending to relay
    const domainEncoded = abiCoder.encode(EIP712DomainTypes, [
      domain.name,
      domain.version,
      domain.chainId,
      domain.verifyingContract,
    ]);
    const domainHash = ethers.utils.keccak256(domainEncoded);

    const requestEncoded = abiCoder.encode(requestTypes, [
      message.from,
      message.to,
      message.value,
      message.gas,
      message.nonce,
      message.data,
    ]);
    const requestHash = ethers.utils.keccak256(requestEncoded);

    // ref: https://docs.openzeppelin.com/defender/relay#signing-typed-data
    const signTypedDataResponse = await signer.signTypedData({
      domainSeparator: domainHash,
      hashStructMessage: requestHash,
    });
    return signTypedDataResponse.sig;
  }

  // Otherwise, send the signTypedData RPC call (Metamask/Hardhat)
  const [method, argData] = ['eth_signTypedData_v4', JSON.stringify(data)];
  return await signer.send(method, [from, argData]);
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
