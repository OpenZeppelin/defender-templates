const stackName = 'poap_minter';
const tokenTypeSecretName = `${stackName}_TOKEN_TYPE`;
const nftIdSecretName = `${stackName}_NFT_ID`;
const tokenAddressSecretName = `${stackName}_TOKEN_ADDRESS`;

const ethers = require('ethers');
const { DefenderRelaySigner, DefenderRelayProvider } = require('defender-relay-client/lib/ethers');
const ERC1155AbiStandard = ['function mint(address account, uint256 id, uint256 amount, bytes data)'];
const ERC1155AbiMock = ['function mint(address to, uint256 id, uint256 amount)'];
const ERC721Abi = ['function safeMint(address to)'];
const ERC20Abi = ['function mint(address to, uint256 amount)'];

const domain = { name: 'OpenZeppelin POAP Autotask', version: '1', chainId: '5' };
const types = {
  attendee: [
    { name: 'name', type: 'string' },
    { name: 'wallet', type: 'address' },
  ],
};

exports.handler = async function (event) {
  if (!event) { throw new Error('event undefined'); }
  const { secrets } = event;
  if (!secrets) { throw new Error('secrets undefined'); }

  const tokenType = secrets[tokenTypeSecretName];
  const tokenAddress = secrets[tokenAddressSecretName];
  const nftQty = ethers.BigNumber.from(1);
  // ERC1155 Specific data
  const nftId = ethers.BigNumber.from(secrets[nftIdSecretName]);
  const nftData = 0x00;

  if (typeof tokenType !== 'string') { throw new Error('Token type not specified') }
  if (!ethers.utils.getAddress(tokenAddress)) { throw new Error('Valid token address not specified') };
  if (!tokenType) { throw new Error('Token address not specified') };
  if (!event.request?.body) { throw new Error('body undefined') }

  const { address, signature, message } = event.request.body;
  if (!address) { throw new Error('Address not specified in request') };
  if (!signature) { throw new Error('Signature not specified in request') };
  if (!message) { throw new Error('Message not specified in request') };

  const formattedAddress = ethers.utils.getAddress(address);
  const provider = new DefenderRelayProvider(event);
  const signer = new DefenderRelaySigner(event, provider, {
    speed: 'fast',
  });

  // Update Chain ID from relay
  const chainId = await signer.getChainId();
  domain.chainId = chainId;

  const messageSigner = ethers.utils.verifyTypedData(domain, types, message, signature);

  // Case insensitive matching of ERC20 or ERC-20 etc.
  const erc20 = /erc-?20/gi;
  const erc721 = /erc-?721/gi;
  const erc1155 = /erc-?1155/gi;

  if (messageSigner == address) {
    let tx;
    if (tokenType.match(erc20)) {
      const abi = ERC20Abi;
      const contract = new ethers.Contract(tokenAddress, abi, signer);
      tx = await contract.mint(formattedAddress, '1');
      console.log('Minted ERC20 token with tx:', tx.hash);
    } else if (tokenType.match(erc1155)) {
      const contract = new ethers.Contract(tokenAddress, ERC1155AbiStandard, signer);
      const contractV2 = new ethers.Contract(tokenAddress, ERC1155AbiMock, signer);
      let tx;
      try {
        // Depending on which contract was used, the mint function might require 3 or 4 parameters
        tx = await contract.mint(formattedAddress, nftId, nftQty, nftData);
      } catch (error) {
        console.log(`First attempt failed with error: ${error}`)
        tx = await contractV2.mint(formattedAddress, nftId, nftQty);
      }
      console.log('Minted ERC1155 token with tx:', tx.hash);
    } else if (tokenType.match(erc721)) {
      const abi = ERC721Abi;
      const contract = new ethers.Contract(tokenAddress, abi, signer);
      tx = await contract.safeMint(formattedAddress);
      console.log('Minted ERC721 token with tx:', tx.hash);
    } else {
      throw new Error('Token Type is not erc20, erc721, nor erc1155')
    }
    
    if (tx?.hash) return tx.hash;
  } else {
    return 'Signature mismatch';
  }
};
