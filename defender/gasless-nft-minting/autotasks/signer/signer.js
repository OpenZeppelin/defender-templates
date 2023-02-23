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
    /* Solidity Reference:

      bytes32 private constant _TYPEHASH =
        keccak256("ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)");

      function verify(ForwardRequest calldata req, bytes calldata signature) public view returns (bool) {
        address signer = _hashTypedDataV4(
            keccak256(abi.encode(_TYPEHASH, req.from, req.to, req.value, req.gas, req.nonce, keccak256(req.data)))
        ).recover(signature);
        return _nonces[req.from] == req.nonce && signer == req.from;
      }

      function _hashTypedDataV4(bytes32 structHash) internal view virtual returns (bytes32) {
        return ECDSA.toTypedDataHash(_domainSeparatorV4(), structHash);
      }

      function toTypedDataHash(bytes32 domainSeparator, bytes32 structHash) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
      }

      function _domainSeparatorV4() internal view returns (bytes32) {
        if (address(this) == _CACHED_THIS && block.chainid == _CACHED_CHAIN_ID) {
            return _CACHED_DOMAIN_SEPARATOR;
        } else {
            return _buildDomainSeparator(_TYPE_HASH, _HASHED_NAME, _HASHED_VERSION);
        }
      }

      function _buildDomainSeparator(
        bytes32 typeHash,
        bytes32 nameHash,
        bytes32 versionHash
      ) private view returns (bytes32) {
        return keccak256(abi.encode(typeHash, nameHash, versionHash, block.chainid, address(this)));
      }
    */

    const domainEncoded = abiCoder.encode([
      'string',
      'string',
      'uint256',
      'address'
    ], [
      domain.name,
      domain.version,
      domain.chainId,
      domain.verifyingContract,
    ]);
    const domainHash = ethers.utils.keccak256(domainEncoded);
    console.debug('domainHash', domainHash);

    const functionString = 'ForwardRequest(address from,address to,uint256 value,uint256 gas,uint256 nonce,bytes data)';
    const functionEncoded = abiCoder.encode(['string'],[functionString]);
    const functionHash = ethers.utils.keccak256(functionEncoded);

    const dataHash = ethers.utils.keccak256(message.data)
    const requestEncoded = abiCoder.encode([
      'bytes',
      'address',
      'address',
      'uint256',
      'uint256',
      'uint256',
      'bytes',
    ], [
      functionHash,
      message.from,
      message.to,
      message.value,
      message.gas,
      message.nonce,
      dataHash,
    ]);
    const requestHash = ethers.utils.keccak256(requestEncoded);
    console.debug('requestHash', requestHash);

    // ref: https://docs.openzeppelin.com/defender/relay#signing-typed-data
    const signTypedDataResponse = await signer.signTypedData({
      domainSeparator: domainHash,
      hashStructMessage: requestHash,
    });
    return signTypedDataResponse.sig;
  }

  // Otherwise, send the signTypedData RPC call (Metamask/Hardhat)
  // Only Available for JsonRpcSigners
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
  console.debug('signature', signature);
  return { signature, request };
}

module.exports = {
  signMetaTxRequest,
  buildRequest,
  buildTypedData,
};
