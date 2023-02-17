const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');
const ethers = require('ethers');
// const tokenAddress = ethers.constants.AddressZero;
const recipientTopUpBalance = '1';
// const recipientAddress = ethers.constants.AddressZero;
const recipientTopUpAmount = new ethers.BigNumber.from('3');

import {
  tokenType, nftId,
  'token-address' as tokenAddress,
  'recipient-address' as recipientAddress
} from '../../config.dev.yml';
const erc1155StandardAbi = ['function mint(address account, uint256 id, uint256 amount, bytes data)'];
// ERC1155Mock uses a slightly modified mint function
const erc1155Abi = require('../../../../abi/contracts/ERC1155Mock.sol/ERC1155Mock.json');
const erc721Abi = require('../../../../abi/contracts/ERC721Mock.sol/ERC721Mock.json');
const erc20Abi = require('../../../../abi/contracts/ERC20Mock.sol/ERC20Mock.json');

exports.handler = async function (event) {
  if (tokenAddress == ethers.constants.AddressZero) throw new Error('Token address not specified');
  if (recipientAddress == ethers.constants.AddressZero) throw new Error('Refill address not specified');

  const provider = new DefenderRelayProvider(event);
  const signer = new DefenderRelaySigner(event, provider, {
    speed: 'fast',
  });
  console.log('Required balance is:', recipientTopUpAmount.toString());
  let tx;
  if (tokenType == TokenTypeEnum.ERC20) {
    const abi = erc20Abi;
    const contract = new ethers.Contract(tokenAddress, abi, signer);
    const balance = await contract.balanceOf(recipientAddress);
    console.log('Current balance is:', balance.toString());
    if (balance.lt(recipientTopUpAmount)) {
      tx = await contract.mint(recipientAddress, recipientTopUpBalance);
      console.log('Minted ERC20 tokens with tx:', tx.hash);
    } else {
      console.log('Already full. Do nothing.');
    }
  }
  if (tokenType == TokenTypeEnum.ERC1155) {
    const abi = erc1155Abi;
    const contract = new ethers.Contract(tokenAddress, abi, signer);
    const balance = await contract.balanceOf(recipientAddress, nftId);
    console.log('Current balance is:', balance.toString());
    if (balance.lt(recipientTopUpAmount)) {
      tx = await contract.mint(recipientAddress, nftId, recipientTopUpBalance);
      console.log('Minted ERC1155 tokens with tx:', tx.hash);
    } else {
      console.log('Already full. Do nothing.');
    }
  }
  if (tokenType == TokenTypeEnum.ERC721) {
    const abi = erc721Abi;
    const contract = new ethers.Contract(tokenAddress, abi, signer);
    const balance = await contract.balanceOf(recipientAddress);
    console.log('Current balance is:', balance.toString());
    if (balance.lt(recipientTopUpAmount)) {
      for (let i = 0; i < Number(recipientTopUpBalance); i++) {
        tx = await contract.safeMint(recipientAddress);
        console.log('Minted ERC721 token with tx:', tx.hash);
      }
    } else {
      console.log('Already full. Do nothing.');
    }
  }
};
