const { expect } = require('chai').use(require('chai-as-promised'));
const { ethers } = require('hardhat');
const { signMetaTxRequest } = require('../autotasks/signer/signer');
const req = require('require-yml');
const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');

async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then(f => f.deployed());
}

const secrets = req(`../.secrets/dev.yml`);
const { 'relay-api-key': relayApiKey, 'relay-api-secret': relaySecretKey } = secrets.keys;

const config = req(`./config.dev.yml`);
const { 'forwarder-address': forwarderAddress, 'nft-address': nftAddress } = config;
ethers.utils.getAddress(forwarderAddress);
ethers.utils.getAddress(nftAddress);

if (!relayApiKey === undefined) {
  throw new Error('Could not find Relay API key in defender/.secrets/<stage>.yml');
}
if (relaySecretKey === undefined) {
  throw new Error('Could not find Relay Secret key in defender/.secrets/<stage>.yml');
}
const credentials = { apiKey: relayApiKey, apiSecret: relaySecretKey };

const liveProvider = new DefenderRelayProvider(credentials);
const liveSigner = new DefenderRelaySigner(credentials, liveProvider, {
  speed: 'fast',
});

describe('signing and verifying', function () {
  let liveSignerAddress;
  let forwarderContract;
  let nftContract;
  let deployerSigner;
  let deployerAddress;
  let userAddress;
  let liveNftContract;
  let liveForwarderContract;

  // ERC 1155 Params
  const id = ethers.BigNumber.from(1);
  const qty = ethers.BigNumber.from(1);
  const callData = 0x00;

  before(async function () {
    try {
      liveSignerAddress = ethers.utils.getAddress(await liveSigner.getAddress());
    } catch (error) {
      throw new Error(`Could not get address from Defender Signer ${liveSignerAddress}`);
    }
  });

  beforeEach(async function () {
    // Generic accounts
    const accounts = await ethers.getSigners();
    deployerSigner = accounts[0];
    deployerAddress = accounts[0].address;
    userAddress = accounts[1].address;

    // Hardhat
    forwarderContract = await deploy('MinimalForwarder');
    nftContract = await deploy('DemoNFT', forwarderContract.address);

    // Live Network
    liveNftContract = new ethers.Contract(
      nftAddress,
      nftContract.interface,
      liveSigner,
    );
    liveForwarderContract = new ethers.Contract(
      forwarderAddress,
      forwarderContract.interface,
      liveSigner,
    );

  });

  it('signs and verifies an NFT mint request on hardhat network using RPC call', async function () {
    // Deployer should be NFT contract owner
    expect(await nftContract.owner()).to.equal(deployerAddress);

    // Sign the request from deployer account to the NFT contract
    const { request, signature } = await signMetaTxRequest(deployerSigner.provider, forwarderContract, {
      from: deployerAddress,
      to: nftContract.address,
      data: nftContract.interface.encodeFunctionData('mint', [userAddress, id, qty, callData]),
    });

    // Verify it
    expect(await forwarderContract.verify(request, signature)).to.equal(true);
  });

  it('signs and verifies an NFT mint request on live network using Defender Relayer', async function () {
    // Sign the request from deployer account to the NFT contract
    const input = {
      from: liveSignerAddress,
      to: liveNftContract.address,
      data: liveNftContract.interface.encodeFunctionData('mint', [userAddress, id, qty, callData]),
    }
    const { request, signature } = await signMetaTxRequest(liveSigner, liveForwarderContract, input);

    // Verify it
    expect(await liveForwarderContract.verify(request, signature)).to.equal(true);
  });


  it('OZ Relayer can sign a message with EIP-151 standard', async function () {
    // Sign a with the relayer
    const message = 'Funds are safu!';
    const signature = await liveSigner.signMessage(message);

    // Derive the address from the message and signature
    const signatureAddress = ethers.utils.verifyMessage(message, signature);

    // Check it against the relayer address
    expect(signatureAddress).to.equal(liveSignerAddress);
  });

  it('OZ Relayer can sign a message with EIP-712 - simple version', async function () {
    // ref: https://forum.openzeppelin.com/t/cant-get-the-minimalforwarder-contract-to-successfully-verify-my-eip712-signature/34809/3
    const request = {
      value: 0,
      gas: 300000,
      nonce: 0,
      from: "0x32a7914b011e1dd6b58980080cb525bc546bc164",
      to: "0x46f4cd7c9c6aca27becf45cc5d836dddac204d32",
      data: "0x7a7f274ddbf166cf3a3757674f041fbd4ccc1cd6444a3ccebd526e196b6d24f1283aaf0000000000000000000000000000000000000000000000000000000000000000a01f5e482a2b11c7a811a5abe748024b24814656ca1d1f6c3d9a27d49ff75e54ff2cea6183837101e37145bacb145089ccd294e3ab1c1a5cdb98bcf5a6a675e59e000000000000000000000000000000000000000000000000000000000000001b0000000000000000000000000000000000000000000000000000000000000035697066733a2f2f516d6652376235706441435750515767534a6648726639467771677739726634474e505958394a794a5036566b380000000000000000000000",
    };

    const ForwardRequestType = [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "gas", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "data", type: "bytes" },
    ];

    const typedData = {
      domain: {
        name: "MinimalForwarder",
        version: "0.0.1",
        chainId: 80001,
        verifyingContract: "0x2db308bbecc75649a37e166680986044dbab483d",
      },
      primaryType: "ForwardRequest",
      types: {
        ForwardRequest: ForwardRequestType,
      },
      message: request,
    };

    const signature = await liveSigner._signTypedData(
      typedData.domain,
      typedData.types,
      typedData.message
    );

    const verifiedAddress = ethers.utils.verifyTypedData(
      typedData.domain,
      typedData.types,
      typedData.message,
      signature
    );

    expect(verifiedAddress).to.equal(liveSignerAddress);
  });
});
