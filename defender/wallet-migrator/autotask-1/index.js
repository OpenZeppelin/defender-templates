const stackName = 'wallet_migrator';
const senderWalletAddressSecretName = `${stackName}_SENDER_WALLET_ADDRESS`;
const receiverWalletAddressSecretName = `${stackName}_RECEIVER_WALLET_ADDRESS`;
const covalentApiKeySecretName = `${stackName}_COVALENT_API_KEY`;
const networkSecretName = `${stackName}_NETWORK`;

const axios = require('axios');
const { ethers } = require('ethers');
const { DefenderRelayProvider, DefenderRelaySigner } = require('defender-relay-client/lib/ethers');

const erc20Abi = [
  'function transferFrom(address from, address to, uint256 amount) public returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
];

const erc721Abi = [
  'function transferFrom(address from, address to, uint256 tokenId) public',
  'function isApprovedForAll(address owner, address operator) public view returns (bool)',
];

// returns axios get request to retrieve wallet balance of erc20 and erc721 tokens
async function get(url, method, headers, auth) {
  return axios({
    url,
    method,
    headers,
    auth,
  });
}

exports.handler = async function handler(autotaskEvent) {
  // ensure that the autotaskEvent Object exists
  if (autotaskEvent === undefined) {
    throw new Error('autotaskEvent undefined');
  }

  // ensure that the secrets Object exists
  const { secrets } = autotaskEvent;
  if (secrets === undefined) {
    throw new Error('secrets undefined');
  }

  const receiverWalletAddress = secrets[receiverWalletAddressSecretName];

  // ensure that the receiverWalletAddress exists
  if (receiverWalletAddress === undefined) {
    throw new Error('receiver-wallet-address must be defined in config.dev.yml file or Defender->AutoTask->Secrets');
  }

  const senderWalletAddress = secrets[senderWalletAddressSecretName];

  // ensure that the senderWalletAddress exists
  if (senderWalletAddress === undefined) {
    throw new Error('sender-wallet-address must be defined in config.dev.yml file or Defender->AutoTask->Secrets');
  }

  const covalentApiKey = secrets[covalentApiKeySecretName];

  // ensure that the covalentApiKey exists
  if (covalentApiKey === undefined) {
    throw new Error('covalent-ap-key must be defined in config.dev.yml file or Defender->AutoTask->Secrets');
  }

  const network = secrets[networkSecretName];

  // ensure that the network exists
  if (network === undefined) {
    throw new Error('network must be defined in config.dev.yml file or Defender->AutoTask->Secrets');
  }

  // get chain id depending on network
  let chainId;
  if (network === 'goerli') {
    chainId = '5';
  } else if (network === 'mainnet') {
    chainId = '1';
  }

  // query senders wallet balance for all erc20 and erc721 tokens
  const method = 'get';
  const headers = {
    'Content-Type': 'application/json',
  };
  const url = `https://api.covalenthq.com/v1/${chainId}/address/${senderWalletAddress}/balances_v2/?no-nft-fetch=true&nft=true`;
  const auth = {
    username: covalentApiKey,
  };

  let responseData;

  // get balance of all tokens sender address owns
  try {
    let response = await get(url, method, headers, auth);
    responseData = response.data.data.items;
  } catch (error) {
    console.log('error retrieving wallet balance:');
    console.log(error);
  }

  // create new provider and signer to perform on-chain transfers
  console.debug('Creating DefenderRelayProvider');
  const provider = new DefenderRelayProvider(autotaskEvent);
  console.debug('Creating DefenderRelaySigner');
  const signer = new DefenderRelaySigner(autotaskEvent, provider, { speed: 'fast' });
  const relayerAddress = await signer.getAddress();

  let erc20Contract;
  let erc721Contract;

  // these initial contract addresses are just placeholders - they will be replaced by each erc20 and erc721 contract address the user holds
  // it can cause an error with ethers.js if the contract address is invalid, so we are passing in known valid contract addresses
  // as place holders for erc20 and erc721 tokens on both goerli and mainnet
  if (network === 'goerli') {
    erc20Contract = new ethers.Contract('0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6', erc20Abi, signer);
    erc721Contract = new ethers.Contract('0xCfD7cEF761A60dFBA0D240ee4fF82f7f51242675', erc721Abi, signer);
  } else if (network === 'mainnet') {
    erc20Contract = new ethers.Contract('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', erc20Abi, signer);
    erc721Contract = new ethers.Contract('0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D', erc721Abi, signer);
  }

  for (var i = 0; i < responseData.length; i++) {
    const item = responseData[i];
    const balance = item.balance;
    const isNft = item.type === 'nft';
    const isDust = item.type === 'dust'; // tokens with less than $0.1 in spot fiat value get classified as dust (ignore unless it's eth)
    const decimals = item.contract_decimals;
    const symbol = item.contract_ticker_symbol;
    const isEther = item.contract_address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

    // ignore if token value is less than $0.1 or is Ether
    // address 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee is used to represent Ether
    // we cannot call allowance() or transferFrom() on Ether because it is not an erc20 token
    // there isn't a way to approve an allowance of Ether ahead of time like we can or erc20 tokens
    if (balance > 0 && !isNft && !isDust && !isEther) {
      const specificErc20Contract = erc20Contract.attach(item.contract_address);
      // check if relayer has allowance before sending
      const allowance = await specificErc20Contract.allowance(senderWalletAddress, relayerAddress);
      if (allowance > 0) {
        const tx = await specificErc20Contract.transferFrom(senderWalletAddress, receiverWalletAddress, allowance);
        await tx.wait();
        // scale allowances for logging
        let scaledAllowance = allowance / Math.pow(10, decimals);
        scaledAllowance = scaledAllowance.toFixed(2);
        // scale balances for logging
        let scaledBalance = balance / Math.pow(10, decimals);
        scaledBalance = scaledBalance.toFixed(2);
        // balance and allowance should be the same because the total balance should have been previously approved
        console.log(
          `Out of ${scaledBalance} ${symbol} tokens in wallet ${senderWalletAddress}, ${scaledAllowance} was sent to wallet ${receiverWalletAddress}`,
        );
      }
    } else if (balance > 0 && isNft) {
      const specificErc721Contract = erc721Contract.attach(item.contract_address);
      // check if relayer is approved as an operator before transferring
      // transfer all nfts one by one if relayer is approved as an operator
      // we need to do this because there is no transfer all method for erc721 and a sender may have more than 1 nft in a collection
      const isApprovedForAll = await specificErc721Contract.isApprovedForAll(senderWalletAddress, relayerAddress);
      if (isApprovedForAll) {
        const nftCollectionData = item.nft_data;
        nftCollectionData.map(async individualNft => {
          const tokenId = individualNft.token_id;
          const tx = await specificErc721Contract.transferFrom(senderWalletAddress, receiverWalletAddress, tokenId);
          await tx.wait();
          console.log(
            `Transfered NFT ${symbol} with token id ${tokenId} from ${senderWalletAddress} to ${receiverWalletAddress}`,
          );
        });
      }
    }
  }

  return true;
};
