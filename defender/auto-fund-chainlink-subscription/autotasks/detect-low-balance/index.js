const { ethers } = require("ethers");
const { DefenderRelayProvider } = require("defender-relay-client/lib/ethers");
const vrfCoordinatorAddress = "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D";
const ABI = `[
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

const subscriptionId = 8417;
const minLink = "5"; //Minimum balance before funding with extra link

//gets called once per block
exports.handler = async function (event) {
  console.log("Starting autotask...");
  const threshold = ethers.utils.parseEther(minLink);
  const provider = new DefenderRelayProvider(event);
  const payload = event.request.body;

  const vrfCoordinator = new ethers.Contract(vrfCoordinatorAddress, ABI, provider);
  const { balance } = await vrfCoordinator.getSubscription(subscriptionId);
  console.log(`Your balance is ${balance}`);

  const matches = [];
  if (balance < threshold) {
    const match = {
      hash: payload.events[0].transaction.transactionHash, //The actual hash is not important. We won't need it in the autotask notification
      metadata: {},
    };
    matches.push(match);
  }
  return { matches };
};
