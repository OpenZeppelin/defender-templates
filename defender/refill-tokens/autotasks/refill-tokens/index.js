const stackName = 'poap_minter';
const tokenTypeSecretName = `${stackName}_TOKEN_TYPE`;
const nftIdSecretName = `${stackName}_NFT_ID`;
const tokenAddressSecretName = `${stackName}_TOKEN_ADDRESS`;
const recipientAddressSecretName = `${stackName}_RECIPIENT_ADDRESS`;
const recipientMinimumBalanceSecretName = `${stackName}_RECIPIENT_MINIMUM_BALANCE`;
const recipientTopUpAmountSecretName = `${stackName}_RECIPIENT_TOP_UP_AMOUNT`;

const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');
const ethers = require('ethers');

const ERC1155AbiStandard = ['function mint(address account, uint256 id, uint256 amount, bytes data)'];
const ERC1155AbiMock = ['function mint(address to, uint256 id, uint256 amount)'];
const ERC721Abi = ['function safeMint(address to)'];
const ERC20Abi = ['function mint(address to, uint256 amount)'];

// eslint-disable-next-line func-names
exports.handler = async function (event) {
  if (!event) { throw new Error('event undefined'); }
  const { secrets } = event;
  if (!secrets) { throw new Error('secrets undefined'); }

  const tokenType = secrets[tokenTypeSecretName];
  const nftId = ethers.BigNumber
    .from(secrets[nftIdSecretName] ?? 0);
  const tokenAddress = ethers.utils
    .getAddress(secrets[tokenAddressSecretName]);
  const recipientAddress = ethers.utils
    .getAddress(secrets[recipientAddressSecretName]);
  const recipientMinimumBalance = ethers.BigNumber
    .from(secrets[recipientMinimumBalanceSecretName]);
  const recipientTopUpAmount = ethers.BigNumber
    .from(secrets[recipientTopUpAmountSecretName]);

  // ERC1155 Specific data
  const nftData = 0x00;

  if (tokenAddress === ethers.constants.AddressZero) throw new Error('Token address not specified');
  if (recipientAddress === ethers.constants.AddressZero) throw new Error('Refill address not specified');

  const provider = new DefenderRelayProvider(event);
  const signer = new DefenderRelaySigner(event, provider, {
    speed: 'fast',
  });
  console.log('Required balance is:', recipientMinimumBalance.toString());
  let tx;

  // Case insensitive matching of ERC20 or ERC-20 etc.
  const erc20 = /erc-?20/gi;
  const erc721 = /erc-?721/gi;
  const erc1155 = /erc-?1155/gi;

  if (tokenType.match(erc20)) {
    const abi = ERC20Abi;
    const contract = new ethers.Contract(tokenAddress, abi, signer);
    const balance = await contract.balanceOf(recipientAddress);
    console.log('Current balance is:', balance.toString());
    if (balance.lt(recipientMinimumBalance)) {
      tx = await contract.mint(recipientAddress, recipientTopUpAmount);
      console.log('Minted ERC20 tokens with tx:', tx.hash);
    } else {
      console.log('Already full. Do nothing.');
    }
  } else if (tokenType.match(erc1155)) {
    const contract = new ethers.Contract(tokenAddress, ERC1155AbiStandard, signer);
    const contractV2 = new ethers.Contract(tokenAddress, ERC1155AbiMock, signer);
    const balance = await contract.balanceOf(recipientAddress, nftId);
    console.log('Current balance is:', balance.toString());
    if (balance.lt(recipientMinimumBalance)) {
      try {
        tx = await contract.mint(recipientAddress, nftId, recipientTopUpAmount, nftData);
      } catch (error) {
        console.log(`First attempt failed with error: ${error}`);
        tx = await contractV2.mint(recipientAddress, nftId, recipientTopUpAmount);
      }
      console.log('Minted ERC1155 tokens with tx:', tx.hash);
    } else {
      console.log('Already full. Do nothing.');
    }
  } else if (tokenType.match(erc721)) {
    const abi = ERC721Abi;
    const contract = new ethers.Contract(tokenAddress, abi, signer);
    const balance = await contract.balanceOf(recipientAddress);
    console.log('Current balance is:', balance.toString());
    if (balance.lt(recipientMinimumBalance)) {
      for (let i = 0; i < Number(recipientTopUpAmount); i++) {
        // eslint-disable-next-line no-await-in-loop
        tx = await contract.safeMint(recipientAddress);
        console.log('Minted ERC721 token with tx:', tx.hash);
      }
    } else {
      console.log('Already full. Do nothing.');
    }
  } else {
    throw new Error('Token Type is not erc20, erc721, nor erc1155');
  }
};
