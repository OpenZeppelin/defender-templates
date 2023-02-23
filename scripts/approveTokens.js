// grab all token balances and then approve allowance to the relayer
// have them paste in the private key to approve?
// then if something happens, you can go manually click on run autotask, which will transfer out all tokens for you
const axios = require('axios');
const { ethers } = require('ethers');
const yargs = require('yargs');
dotenv.config({ path: __dirname + '/.env' });
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const COVALENT_API_KEY = process.COVALENT_API_KEY;

const erc20Abi = ['function approve(address _spender, uint256 _value) external'];

const erc721Abi = ['function approve(address spender, uint256 amount) external returns (bool)'];

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
  const method = 'get';
  const headers = {
    'Content-Type': 'application/json',
  };
  // @todo replace chain id and address with args from the command line
  const url =
    'https://api.covalenthq.com/v1/5/address/0x7CCc699cb7F361Aa1b982E7954cF65E531cdEc94/balances_v2/?no-nft-fetch=true&nft=true';
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
  const provider = new ethers.providers.JsonRpcProvider(GOERLI_RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
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
      // approve all tokens to relayer address
      // @todo replace relayer-address with args from command line
      // @todo check if relayer already has allowances to avoid duplicate approvals
      await specificErc20Contract.approve('relayer-address', balance);
      console.log('approving token address...', item.contract_address);
      let scaledBalance = balance / Math.pow(10, decimals);
      scaledBalance = scaledBalance.toFixed(2);
      console.log(`You have ${scaledBalance} of ${symbol}`);
    } else if (balance > 0 && isNft) {
      // @todo replace relayer-address with args from command line
      let specificErc721Contract = erc721Contract.attach(item.contract_address);
      await specificErc721Contract.approve('relayer-address', balance);
      console.log(`You have ${balance} of nft ${symbol}`);
    }
    // include edge case for ether? Because it's not an erc20
  });

  await Promise.all(promises);
}

main();
