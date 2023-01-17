const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');
const ethers = require('ethers');
const TokenTypeEnum = { ERC20: 0, ERC721: 1, ERC1155: 2 };
const TOKEN_TYPE = TokenTypeEnum.ERC20;
const ERC1155ID = '1';
const TOKEN_ADDRESS = ethers.constants.AddressZero;
const REFILL_VALUE = '1';
const REFILL_ADDRESS = ethers.constants.AddressZero;
const FILLED_VALUE = new ethers.BigNumber.from('3');
const ERC1155Abi = require('../../../../abi/contracts/ERC1155Mock.sol/ERC1155Mock.json');
const ERC721Abi = require('../../../../abi/contracts/ERC721Mock.sol/ERC721Mock.json');
const ERC20Abi = require('../../../../abi/contracts/ERC20Mock.sol/ERC20Mock.json');

exports.handler = async function (event) {
  if (TOKEN_ADDRESS == ethers.constants.AddressZero) throw new Error('Token address not specified');
  if (REFILL_ADDRESS == ethers.constants.AddressZero) throw new Error('Refill address not speficied');

  const provider = new DefenderRelayProvider(event);
  const signer = new DefenderRelaySigner(event, provider, {
    speed: 'fast',
  });
  console.log('Required balance is:', FILLED_VALUE.toString());
  let tx;
  if (TOKEN_TYPE == TokenTypeEnum.ERC20) {
    const abi = ERC20Abi;
    const contract = new ethers.Contract(TOKEN_ADDRESS, abi, signer);
    const balance = await contract.balanceOf(REFILL_ADDRESS);
    console.log('Current balance is:', balance.toString());
    if (balance.lt(FILLED_VALUE)) {
      tx = await contract.mint(REFILL_ADDRESS, REFILL_VALUE);
      console.log('Minted ERC20 tokens with tx:', tx.hash);
    } else {
      console.log('Already full. Do nothing.');
    }
  }
  if (TOKEN_TYPE == TokenTypeEnum.ERC1155) {
    const abi = ERC1155Abi;
    const contract = new ethers.Contract(TOKEN_ADDRESS, abi, signer);
    const balance = await contract.balanceOf(REFILL_ADDRESS, ERC1155ID);
    console.log('Current balance is:', balance.toString());
    if (balance.lt(FILLED_VALUE)) {
      tx = await contract.mint(REFILL_ADDRESS, ERC1155ID, REFILL_VALUE);
      console.log('Minted ERC1155 tokens with tx:', tx.hash);
    } else {
      console.log('Already full. Do nothing.');
    }
  }
  if (TOKEN_TYPE == TokenTypeEnum.ERC721) {
    const abi = ERC721Abi;
    const contract = new ethers.Contract(TOKEN_ADDRESS, abi, signer);
    const balance = await contract.balanceOf(REFILL_ADDRESS);
    console.log('Current balance is:', balance.toString());
    if (balance.lt(FILLED_VALUE)) {
      for (let i = 0; i < Number(REFILL_VALUE); i++) {
        tx = await contract.safeMint(REFILL_ADDRESS);
        console.log('Minted ERC721 token with tx:', tx.hash);
      }
    } else {
      console.log('Already full. Do nothing.');
    }
  }
};
