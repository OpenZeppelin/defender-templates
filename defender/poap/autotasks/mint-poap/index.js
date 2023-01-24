const ethers = require('ethers');
const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');
const ERC1155Abi = require('../../../../abi/contracts/ERC1155Mock.sol/ERC1155Mock.json');
const ERC721Abi = require('../../../../abi/contracts/ERC721Mock.sol/ERC721Mock.json');
const ERC20Abi = require('../../../../abi/contracts/ERC20Mock.sol/ERC20Mock.json');
import { TokenTypeEnum, TOKEN_TYPE, ERC1155ID, TOKEN_ADDRESS, domain, types } from '../../constants';

exports.handler = async function (event) {
  if (TOKEN_ADDRESS == ethers.constants.AddressZero) throw new Error('Token address not specified');
  const provider = new DefenderRelayProvider(event);
  const signer = new DefenderRelaySigner(event, provider, {
    speed: 'fast',
  });
  const { address, signature, message } = event.request.body;

  const messageSigner = ethers.utils.verifyTypedData(domain, types, message, signature);

  if (messageSigner == address) {
    let tx;
    if (TOKEN_TYPE == TokenTypeEnum.ERC20) {
      const abi = ERC20Abi;
      const contract = new ethers.Contract(TOKEN_ADDRESS, abi, signer);
      tx = await contract.mint(address, '1');
      console.log('Minted ERC20 token with tx:', tx.hash);
    }
    if (TOKEN_TYPE == TokenTypeEnum.ERC1155) {
      const abi = ERC1155Abi;
      const contract = new ethers.Contract(TOKEN_ADDRESS, abi, signer);
      tx = await contract.mint(address, ERC1155ID, '1');
      console.log('Minted ERC1155 token with tx:', tx.hash);
    }
    if (TOKEN_TYPE == TokenTypeEnum.ERC721) {
      const abi = ERC721Abi;
      const contract = new ethers.Contract(TOKEN_ADDRESS, abi, signer);
      tx = await contract.safeMint(address);
      console.log('Minted ERC721 token with tx:', tx.hash);
    }
    if (tx?.hash) return tx.hash;
  } else {
    return 'Signature missmatch';
  }
};
