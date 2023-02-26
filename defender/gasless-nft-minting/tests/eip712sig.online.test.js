const { expect } = require('chai').use(require('chai-as-promised'));
const { ethers } = require('hardhat');
const { signMetaTxRequest } = require('../autotasks/signer/signer');
const req = require('require-yml');
const { Relayer } = require('defender-relay-client');
const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');


async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then(f => f.deployed());
}

const secrets = req(`../.secrets/dev.yml`);
const { 'relay-api-key': relayApiKey, 'relay-api-secret': relaySecretKey } = secrets.keys;

const config = req(`./config.dev.yml`);
const { 'forwarder-address': forwarderAddress, 'nft-address': nftAddress } = config;

if (!relayApiKey === undefined) {
  throw new Error('Could not find Relay API key in defender/.secrets/<stage>.yml');
}
if (relaySecretKey === undefined) {
  throw new Error('Could not find Relay Secret key in defender/.secrets/<stage>.yml');
}
const credentials = { apiKey: relayApiKey, apiSecret: relaySecretKey };

const liveRelayer = new Relayer(credentials);
const lveProvider = new DefenderRelayProvider(credentials);
const liveSigner = new DefenderRelaySigner(credentials, lveProvider, {
  speed: 'fast',
});

describe('signing and verifying', function () {
  let liveSignerAddress;
  let liveRelayerAddress;
  before(async function () {
    try {
      liveSignerAddress = await liveSigner.getAddress();
      ({ address: liveRelayerAddress } = await liveRelayer.getRelayer());
    } catch (error) {
      throw new Error(`Issue with Defender Relay: ${error}`);
    }
  });

  beforeEach(async function () {
    this.forwarderContract = await deploy('MinimalForwarder');
    this.nftContract = await deploy('DemoNFT', this.forwarderContract.address);
    this.liveForwarderContract = new ethers.Contract(
      forwarderAddress,
      this.forwarderContract.interface.format(ethers.utils.FormatTypes.full),
      liveSigner,
    );
    this.liveNftContract = new ethers.Contract(
      nftAddress,
      this.nftContract.interface.format(ethers.utils.FormatTypes.full),
      liveSigner,
    );
    this.accounts = await ethers.getSigners();
    this.deployerAccount = this.accounts[0];
    this.relayerAccount = this.accounts[1];
    this.userAccount = this.accounts[2];
    this.id = ethers.BigNumber.from(1);
    this.qty = ethers.BigNumber.from(0);
    this.bnZero = ethers.BigNumber.from(0);
    this.callData = 0x00;
  });

  it('signs and verifies an NFT mint request on hardhat network', async function () {
    const { forwarderContract, nftContract, deployerAccount, userAccount, id, qty, callData } = this;

    // Deployer should be NFT contract owner
    expect(await nftContract.owner()).to.equal(deployerAccount.address);

    // Sign the request from deployer account to the NFT contract
    const { request, signature } = await signMetaTxRequest(deployerAccount.provider, forwarderContract, {
      from: deployerAccount.address,
      to: nftContract.address,
      data: nftContract.interface.encodeFunctionData('mint', [userAccount.address, id, qty, callData]),
    });

    // Verify it
    expect(await forwarderContract.verify(request, signature)).to.equal(true);
  });

  it('signs and verifies an NFT mint request on live network', async function () {
    const { liveForwarderContract, liveNftContract, signerAddress, liveSignerAddress, userAccount, id, qty, callData, bnZero } = this;

    // Deployer should be NFT contract owner
    expect(await liveNftContract.owner()).to.equal(liveSignerAddress.address);

    // Sign the request from deployer account to the NFT contract
    const { request, signature } = await signMetaTxRequest(liveSigner, liveForwarderContract, {
      from: signerAddress.address,
      to: liveNftContract.address,
      data: liveNftContract.interface.encodeFunctionData('mint', [userAccount.address, id, qty, callData]),
    });

    // Verify it
    expect(await liveForwarderContract.verify(request, signature)).to.equal(true);

    // Execute it from relayer account
    // const previousBalance = await nftContract.balanceOf(userAccount.address, id);
    // await forwarderContract.connect(relayerAccount).execute(request, signature);

    // Check results
    // expect(await nftContract.balanceOf(userAccount.address, id)).to.equal(previousBalance + 1);
  });
});
