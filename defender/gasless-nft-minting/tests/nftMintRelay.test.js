const { expect } = require("chai").use(require('chai-as-promised'));
const { ethers } = require("hardhat");
const { signMetaTxRequest } = require("../src/signer");
const { relay } = require('../autotasks/relay');

async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then(f => f.deployed());
}

describe("autotasks/relay", function () {
  beforeEach(async function () {
    this.forwarder = await deploy('MinimalForwarder');
    this.nft = await deploy("DemoNFT", this.forwarder.address);
    this.accounts = await ethers.getSigners();
    this.deployer = this.accounts[0];
    this.relayer = this.accounts[1];
    this.user = this.accounts[2];
    this.id = 1;
    this.qty = 1;
    this.data = 0x0;
  });

  it("mints an NFT via a standard tx", async function () {
    const { nft, deployer, user, id, qty, data } = this;

    await nft.mint(user.address, id, qty, data);
    expect(await nft.owner()).to.equal(deployer.address);
    expect(await nft.balanceOf(user.address, id)).to.equal(qty);
  });


  it("mints an NFT via a meta-tx", async function () {
    const { forwarder, nft, deployer, relayer, user, id, qty, data } = this;

    const { request, signature } = await signMetaTxRequest(deployer.provider, forwarder, {
      from: deployer.address,
      to: nft.address,
      data: nft.interface.encodeFunctionData('mint', [user.address, id, qty, data]),
    });

    const whitelist = [nft.address]
    await relay(forwarder.connect(relayer), request, signature, whitelist);

    expect(await nft.owner()).to.equal(deployer.address);
    expect(await nft.balanceOf(user.address, id)).to.equal(qty);
  });

  it("refuses to send to non-whitelisted address", async function () {
    const { forwarder, nft, deployer, relayer, user, id, qty, data } = this;

    const { request, signature } = await signMetaTxRequest(deployer.provider, forwarder, {
      from: deployer.address,
      to: nft.address,
      data: nft.interface.encodeFunctionData('mint', [user.address, id, qty, data]),
    });

    const whitelist = [];
    await expect(
      relay(forwarder.connect(relayer), request, signature, whitelist)
    ).to.be.rejectedWith(/rejected/i);
  });

  it("refuses to send incorrect signature", async function () {
    const { forwarder, nft, deployer, relayer, user, id, qty, data } = this;

    const { request, signature } = await signMetaTxRequest(deployer.provider, forwarder, {
      from: deployer.address,
      to: nft.address,
      data: nft.interface.encodeFunctionData('mint', [user.address, id, qty, data]),
      nonce: 5,
    });

    const whitelist = [nft.address]
    await expect(
      relay(forwarder.connect(relayer), request, signature, whitelist)
    ).to.be.rejectedWith(/invalid/i);
  });
});
