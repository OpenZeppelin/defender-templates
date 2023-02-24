const stackName = 'wallet_migrator';
const senderWalletAddressSecretName = `${stackName}_SENDER_WALLET_ADDRESS`;
const receiverWalletAddressSecretName = `${stackName}_RECEIVER_WALLET_ADDRESS`;
const covalentApiKeySecretName = `${stackName}_COVALENT_API_KEY`;
const networkSecretName = `${stackName}_NETWORK`;

const axios = require('axios');
const { ethers } = require('ethers');

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

  const receiverWalletAddress = secrets[receiverWalletAddressSecretName]

  // ensure that the receiverWalletAddress exists
  if (receiverWalletAddress === undefined) {
    throw new Error('receiver-wallet-address must be defined in config.dev.yml file or Defender->AutoTask->Secrets');
  }

  const senderWalletAddress = secrets[senderWalletAddressSecretName]

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
    chainId = '5'
  } else if (network === 'mainnet') {
    chainId = '1'
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
    console.log("got data", responseData)
  } catch (error) {
    console.log('error retrieving wallet balance: ');
    console.log(error);
  }
};
