// grab all token balances and then approve allowance to the relayer
// have them paste in the private key to approve?
// then if something happens, you can go manually click on run autotask, which will transfer out all tokens for you
require('dotenv').config();
const yaml = require('js-yaml');
const fs   = require('fs');
const axios = require('axios');
const { ethers } = require('ethers');
// grab secrets from .env file
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL;
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const COVALENT_API_KEY = process.env.COVALENT_API_KEY;
// grab Defender API Key and Secret Key from yaml file
// we need to replace the "-" from yaml files, or it throws and error
let secretsFile = yaml.load(fs.readFileSync('defender/.secrets/dev.yml', 'utf8', {schema: 'JSON_SCHEMA'}));
secretsFile = JSON.parse(JSON.stringify(secretsFile).replace(/-/g, ''))
const DEFENDER_API_KEY = secretsFile.keys.defenderapikey
const DEFENDER_API_SECRET = secretsFile.keys.defenderapisecret
// grab network from config file
const configFile = yaml.load(fs.readFileSync('defender/wallet-migrator/config.dev.yml', 'utf8'));
const network = configFile.network;

const erc20Abi = [
  'function approve(address _spender, uint256 _value) external',
  'function allowance(address owner, address spender) external view returns (uint256)',
];

const erc721Abi = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function setApprovalForAll(address operator, bool approved) public',
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

async function main() {
  // initiate a Defender Relay Client to get address of Relayer
  const { RelayClient } = require('defender-relay-client');
  const relayClient = new RelayClient({ apiKey: DEFENDER_API_KEY, apiSecret: DEFENDER_API_SECRET });
  const relayerInfo = await relayClient.list()
  let relayerAddress;
  // a user might have more than 1 relayer in their account, so we need to get the one for this stack
  relayerInfo.items.forEach((relayer) => {
    if (relayer.name === 'Refiller Relayer') {
      relayerAddress = relayer.address
    }
  })

  let rpcEndpoint;
  let chainId;

  if (network === 'goerli') {
    rpcEndpoint = GOERLI_RPC_URL;
    chainId = '5';
  } else if (network === 'mainnet') {
    rpcEndpoint = MAINNET_RPC_URL;
    chainId = '1';
  }

  // get wallet address from private key
  const provider = new ethers.providers.JsonRpcProvider(rpcEndpoint);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const walletAddress = await signer.getAddress();

  const method = 'get';
  const headers = {
    'Content-Type': 'application/json',
  };
  const url = `https://api.covalenthq.com/v1/${chainId}/address/${walletAddress}/balances_v2/?no-nft-fetch=true&nft=true`;
  const auth = {
    username: COVALENT_API_KEY,
  };

  let responseData;

  // get balance of all tokens that you own
  try {
    let response = await get(url, method, headers, auth);
    responseData = response.data.data.items;
  } catch (error) {
    console.log('error retrieving wallet balance: ');
    console.log(error);
  }

  let erc20Contract = new ethers.Contract('0x', erc20Abi, signer); // first address doesn't matter, will be replaced with the address of the token
  let erc721Contract = new ethers.Contract('0x', erc721Abi, signer); // first address doesn't matter, will be replaced with the address of the token

  const promises = responseData.map(async item => {
    let balance = item.balance;
    let isNft = item.type === 'nft';
    let isDust = item.type === 'dust'; // tokens with less than $0.1 in spot fiat value get classified as dust (ignore unless it's eth)
    let decimals = item.contract_decimals;
    let symbol = item.contract_ticker_symbol;

    // ignore if token value is less than $0.1
    if (balance > 0 && !isNft && !isDust) {
      let specificErc20Contract = erc20Contract.attach(item.contract_address);
      // check if relayer already has allowances to avoid duplicate approvals
      let allowance = await specificErc20Contract.allowance(
        walletAddress,
        relayerAddress,
      );
      // only need to approve if allowance is less than balance
      if (allowance.lt(balance)) {
        await specificErc20Contract.approve(relayerAddress, balance);
      }
      let scaledBalance = balance / Math.pow(10, decimals);
      scaledBalance = scaledBalance.toFixed(2);
      console.log(`Approved allowance of ${scaledBalance} for ${symbol}`);
    } else if (balance > 0 && isNft) {
      // set approval for all token ids
      // a user may have more than 1 nft in a collection
      let specificErc721Contract = erc721Contract.attach(item.contract_address);
      // @todo check allowance to avoid approving twice
      await specificErc721Contract.setApprovalForAll(relayerAddress, true);
      console.log(`Approved allowance for all tokens in NFT collection ${symbol}`);
    }
  });

  await Promise.all(promises);
}

main();
