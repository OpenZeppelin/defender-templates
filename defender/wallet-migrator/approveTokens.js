require('dotenv').config();
const yaml = require('js-yaml');
const fs = require('fs');
const axios = require('axios');
const { ethers } = require('ethers');
const { RelayClient } = require('defender-relay-client');
// grab secrets from .env file
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL;
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
// grab Defender API Key, Secret Key and Covalent API Key from .secrets/dev.yml file
// we need to replace the "-" from yaml files, or it throws an error when importing
let secretsFile = yaml.load(fs.readFileSync('defender/.secrets/dev.yml', 'utf8', { schema: 'JSON_SCHEMA' }));
secretsFile = JSON.parse(JSON.stringify(secretsFile).replace(/-/g, ''));
const DEFENDER_API_KEY = secretsFile.keys.defenderapikey;
const DEFENDER_API_SECRET = secretsFile.keys.defenderapisecret;
const COVALENT_API_KEY = secretsFile.keys.covalentapikey;

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

async function main() {
  // initiate a Defender Relay Client to get address of Relayer
  const relayClient = new RelayClient({ apiKey: DEFENDER_API_KEY, apiSecret: DEFENDER_API_SECRET });
  const relayerInfo = await relayClient.list();
  let relayerAddress;
  // a user might have more than 1 relayer in their account, so we need to get the one for this stack
  relayerInfo.items.forEach(relayer => {
    if (relayer.name === 'Migrator Relay' && relayer.stackResourceId === 'wallet_migrator.relayer-1') {
      relayerAddress = relayer.address;
    }
  });

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

    // ignore if token value is less than $0.1
    if (balance > 0 && !isNft && !isDust && !isEther) {
      const specificErc20Contract = erc20Contract.attach(item.contract_address);
      // check if relayer already has allowances to avoid duplicate approvals
      // only need to approve if allowance is less than balance
      const allowance = await specificErc20Contract.allowance(walletAddress, relayerAddress);
      if (allowance.lt(balance)) {
        let tx = await specificErc20Contract.approve(relayerAddress, balance);
        await tx.wait(); // wait till tx is mined to avoid problem with nonces
        let scaledBalance = balance / Math.pow(10, decimals);
        scaledBalance = scaledBalance.toFixed(2);
        console.log(`Approved allowance of ${scaledBalance} for ${symbol}`);
      }
    } else if (balance > 0 && isNft) {
      const specificErc721Contract = erc721Contract.attach(item.contract_address);
      // check if relayer already has approval to avoid duplicate approvals
      // only need to approve if relayer is not approved yet
      const isApprovedForAll = await specificErc721Contract.isApprovedForAll(walletAddress, relayerAddress);
      if (!isApprovedForAll) {
        // set approval for all token ids (a user may have more than 1 nft in a collection)
        let tx = await specificErc721Contract.setApprovalForAll(relayerAddress, true);
        await tx.wait(); // wait till tx is mined to avoid problem with nonces
        console.log(`Approved allowance for all tokens in NFT collection ${symbol}`);
      }
    }
  }
}

main();
