import { ethers } from 'ethers';
import { DefenderRelayProvider } from 'defender-relay-client/lib/ethers';
import { vrfCoordinatorAddress, subscriptionId, threshold } from '../../subscription-config.dev.yml';
import ABI from '../../abis/vrfCoordinator.json';

//gets called once per block
export async function handler(event) {
  console.log('Starting autotask...');
  const thresholdInWei = ethers.utils.parseEther(threshold);
  const provider = new DefenderRelayProvider(event);
  const payload = event.request.body;

  const vrfCoordinator = new ethers.Contract(vrfCoordinatorAddress, ABI, provider);
  const { balance } = await vrfCoordinator.getSubscription(subscriptionId);
  console.log(`Your balance is ${balance}`);

  const matches = [];
  if (balance < thresholdInWei) {
    const match = {
      hash: payload.events[0].transaction.transactionHash, //The actual hash is not important. We won't need it in the autotask notification
      metadata: {},
    };
    matches.push(match);
  }
  return { matches };
}