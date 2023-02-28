const stackName = 'wallet_migrator';
const senderWalletAddressSecretName = `${stackName}_SENDER_WALLET_ADDRESS`;
const receiverWalletAddressSecretName = `${stackName}_RECEIVER_WALLET_ADDRESS`;
const covalentApiKeySecretName = `${stackName}_COVALENT_API_KEY`;

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

  // create new provider and signer to perform on-chain transfers
  console.debug('Creating DefenderRelayProvider');
  const provider = new DefenderRelayProvider(autotaskEvent);
  console.debug('Creating DefenderRelaySigner');
  const signer = new DefenderRelaySigner(autotaskEvent, provider, { speed: 'fast' });

  // get address and chain id
  const relayerAddress = await signer.getAddress();
  const chainId = await signer.getChainId();

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

  for (var i = 0; i < responseData.length; i++) {
    const {
      balance,
      type,
      contract_decimals: decimals,
      contract_ticker_symbol: symbol,
      contract_address: contractAddress,
      nft_data: nftCollectionData,
    } = responseData[i];
    const isNft = type === 'nft';
    const isDust = type === 'dust'; // tokens with less than $0.1 in spot fiat value get classified as dust (ignore unless it's eth)
    const isEther = contractAddress === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

    // ignore if token value is less than $0.1 or is Ether
    // address 0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee is used to represent Ether
    // we cannot call allowance() or transferFrom() on Ether because it is not an erc20 token
    // there isn't a way to approve an allowance of Ether ahead of time like we can or erc20 tokens
    const balanceBigNumber = ethers.BigNumber.from(balance);
    if (balanceBigNumber.gt(0) && !isNft && !isDust && !isEther) {
      const specificErc20Contract = new ethers.Contract(contractAddress, erc20Abi, signer);
      // check if relayer has allowance before sending
      const allowance = await specificErc20Contract.allowance(senderWalletAddress, relayerAddress);
      if (allowance.gt(0)) {
        // send the minimum of either allowance or balance
        // its possible to approve an allowance for more than your balance
        let amountToTransfer;
        if (allowance.gt(balanceBigNumber)) {
          amountToTransfer = balanceBigNumber;
        } else {
          amountToTransfer = allowance;
        }
        const tx = await specificErc20Contract.transferFrom(
          senderWalletAddress,
          receiverWalletAddress,
          amountToTransfer,
        );
        await tx.wait();
        // scale amount sent for logging
        const scaledAmount = ethers.utils.formatUnits(amountToTransfer, decimals);
        // scale balances for logging
        const scaledBalance = ethers.utils.formatUnits(balance, decimals);
        // balance and allowance should be the same because the total balance should have been previously approved
        console.log(
          `Out of ${scaledBalance} ${symbol} tokens in wallet ${senderWalletAddress}, ${scaledAmount} was sent to wallet ${receiverWalletAddress}`,
        );
      } else {
        // ensure there is an allowance for all tokens
        // otherwise, alert user of error and re-run Autotask after allowances are approved
        throw new Error(
          `Relayer address ${relayerAddress} has no allowance for erc20 token at contract address: ${contractAddress}). Approve allowance and re-run Autotask`,
        );
      }
    } else if (balanceBigNumber.gt(0) && isNft) {
      const specificErc721Contract = new ethers.Contract(contractAddress, erc721Abi, signer);
      // check if relayer is approved as an operator before transferring
      // transfer all nfts one by one if relayer is approved as an operator
      // we need to do this because there is no transfer all method for erc721 and a sender may have more than 1 nft in a collection
      const isApprovedForAll = await specificErc721Contract.isApprovedForAll(senderWalletAddress, relayerAddress);
      if (isApprovedForAll) {
        nftCollectionData.map(async individualNft => {
          const tokenId = individualNft.token_id;
          const tx = await specificErc721Contract.transferFrom(senderWalletAddress, receiverWalletAddress, tokenId);
          await tx.wait();
          console.log(
            `Transfered NFT ${symbol} with token id ${tokenId} from ${senderWalletAddress} to ${receiverWalletAddress}`,
          );
        });
      } else {
        throw new Error(
          `Relayer address ${relayerAddress} has no allowance for erc721 token at contract address: ${contractAddress}). Approve allowance and re-run Autotask`,
        );
      }
    }
  }

  return true;
};
