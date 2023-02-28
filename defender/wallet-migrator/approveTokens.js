require('dotenv').config();
const yaml = require('js-yaml');
const fs = require('fs');
const axios = require('axios');
const { ethers } = require('ethers');
const { RelayClient } = require('defender-relay-client');
const hre = require('hardhat');
// grab chain id, and rpc endpoint from hardhat config
const { chainId, url: rpcEndpoint } = hre.network.config;
// grab private key from .env file
const PRIVATE_KEY = process.env.PRIVATE_KEY;
// grab Defender API Key, Secret Key and Covalent API Key from .secrets/dev.yml file
let secretsFile = yaml.load(fs.readFileSync('defender/.secrets/dev.yml', 'utf8', { schema: 'JSON_SCHEMA' }));
const DEFENDER_API_KEY = secretsFile.keys['defender-api-key'];
const DEFENDER_API_SECRET = secretsFile.keys['defender-api-secret'];
const COVALENT_API_KEY = secretsFile.keys['covalent-api-key'];

const erc20Abi = [
  'function approve(address _spender, uint256 _value) external',
  'function allowance(address owner, address spender) external view returns (uint256)',
];

const erc721Abi = [
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
  const relayer = relayerInfo.items.find(
    item => item.name === 'Migrator Relay' && item.stackResourceId === 'wallet_migrator.relayer-1',
  );

  const relayerAddress = relayer?.address;

  if (relayerAddress === undefined) {
    throw new Error('Relayer address not found');
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

  for (var i = 0; i < responseData.length; i++) {
    const {
      balance,
      type,
      contract_decimals: decimals,
      contract_ticker_symbol: symbol,
      contract_address: contractAddress,
    } = responseData[i];
    const isNft = type === 'nft';
    const isDust = type === 'dust'; // tokens with less than $0.1 in spot fiat value get classified as dust (ignore unless it's eth)
    const isEther = contractAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

    // convert balance to ethers BigNumber to compare
    // ignore if token value is less than $0.1
    const balanceBigNumber = ethers.BigNumber.from(balance);
    if (balanceBigNumber.gt(0) && !isNft && !isDust && !isEther) {
      const specificErc20Contract = new ethers.Contract(contractAddress, erc20Abi, signer);
      // check if relayer already has allowances to avoid duplicate approvals
      // only need to approve if allowance is less than balance
      const allowance = await specificErc20Contract.allowance(walletAddress, relayerAddress);
      if (allowance.lt(balance)) {
        let tx = await specificErc20Contract.approve(relayerAddress, balance);
        await tx.wait(); // wait till tx is mined to avoid problem with nonces
        const scaledBalance = ethers.utils.formatUnits(balance, decimals);
        console.log(`Approved allowance of ${scaledBalance} for ${symbol}`);
      }
    } else if (balanceBigNumber.gt(0) && isNft) {
      const specificErc721Contract = new ethers.Contract(contractAddress, erc721Abi, signer);
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
