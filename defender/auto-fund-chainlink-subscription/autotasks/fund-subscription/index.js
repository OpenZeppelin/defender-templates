const { ethers } = require("ethers");
const { DefenderRelaySigner, DefenderRelayProvider } = require("defender-relay-client/lib/ethers");

const linkAbi = `[{
    "constant": false,
    "inputs": [
      { "name": "_to", "type": "address" },
      { "name": "_value", "type": "uint256" },
      { "name": "_data", "type": "bytes" }
    ],
    "name": "transferAndCall",
    "outputs": [{ "name": "success", "type": "bool" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }]`;

const vrfCoordinatorAbi = `[
  {
      "inputs": [
        {
          "internalType": "uint64",
          "name": "subId",
          "type": "uint64"
        }
      ],
      "name": "getSubscription",
      "outputs": [
        {
          "internalType": "uint96",
          "name": "balance",
          "type": "uint96"
        },
        {
          "internalType": "uint64",
          "name": "reqCount",
          "type": "uint64"
        },
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "internalType": "address[]",
          "name": "consumers",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
]`;

const linkAddress = "0x326C977E6efc84E512bB9C30f76E30c160eD06FB";
const vrfCoordinatorAddress = "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D";
const fundAmount = "0.1";
const subscriptionId = 8417;

exports.handler = async function (event) {
  const provider = new DefenderRelayProvider(event);
  const signer = new DefenderRelaySigner(event, provider, { speed: "fast" });

  // swap eth for link on uniswap - common function
  // first check if enough ETH is available

  // fund subscription by calling link transferAndCall() on LINK token
  const linkContract = new ethers.Contract(linkAddress, linkAbi, signer);
  const vrfCoordinator = new ethers.Contract(vrfCoordinatorAddress, vrfCoordinatorAbi, signer);
  const fundAmountInWei = ethers.utils.parseEther(fundAmount);
  const encoder = ethers.utils.defaultAbiCoder;
  const subscriptionIdEncoded = encoder.encode(["uint256"], [subscriptionId]);

  let { balance } = await vrfCoordinator.getSubscription(subscriptionId);
  console.log(`Subscription balance before funding: ${ethers.utils.formatEther(balance)}`);

  const tx = await linkContract.transferAndCall(vrfCoordinatorAddress, fundAmountInWei, subscriptionIdEncoded);
  await tx.wait(1);

  ({ balance } = await vrfCoordinator.getSubscription(subscriptionId));
  console.log(`Subscription balance after funding: ${ethers.utils.formatEther(balance)}`);
};
