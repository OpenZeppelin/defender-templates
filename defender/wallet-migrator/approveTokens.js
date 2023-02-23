// grab all token balances and then approve allowance to the relayer
// have them paste in the private key to approve?
// then if something happens, you can go manually click on run autotask, which will transfer out all tokens for you
require('dotenv').config();
const axios = require('axios');
const { ethers } = require('ethers');
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL;
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const COVALENT_API_KEY = process.env.COVALENT_API_KEY;
const yargs = require('yargs');

const options = {
  network: {
    type: 'string',
    required: true,
    description: 'network',
    alias: 'n',
  },
};

const cliOptions = yargs.options(options).parseSync();

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
  const network = cliOptions.network;
  let rpcEndpoint;
  let chainId;

  // using arguments from command line to avoid importing values from yaml file (requires rollup.js)
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
  // @todo replace chain id and address with args from the command line
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
      // @todo replace relayer-address with address of defender relayer in your account
      let allowance = await specificErc20Contract.allowance(
        walletAddress,
        '0x7CCc699cb7F361Aa1b982E7954cF65E531cdEc94',
      );
      // only need to approve if allowance is less than balance
      if (allowance.lt(balance)) {
        // @todo replace relayer-address with address of defender relayer in your account
        await specificErc20Contract.approve('0x7CCc699cb7F361Aa1b982E7954cF65E531cdEc94', balance);
      }
      let scaledBalance = balance / Math.pow(10, decimals);
      scaledBalance = scaledBalance.toFixed(2);
      console.log(`Approved allowance of ${scaledBalance} for ${symbol}`);
    } else if (balance > 0 && isNft) {
      // set approval for all token ids
      // a user may have more than 1 nft in a collection
      let specificErc721Contract = erc721Contract.attach(item.contract_address);
      // @todo replace relayer-address with address of defender relayer in your account
      await specificErc721Contract.setApprovalForAll('0x7CCc699cb7F361Aa1b982E7954cF65E531cdEc94', true);
      console.log(`Approved allowance for all tokens in NFT collection ${symbol}`);
    }
  });

  await Promise.all(promises);
}

main();
