import { ethers } from 'ethers';
import { DefenderRelayProvider } from 'defender-relay-client/lib/ethers';
import { vrfCoordinatorAddress, subscriptionId, threshold } from '../../config.dev.yml';
import ABI from '../../../../abi/vrfCoordinator.json';

// gets called when a transaction occurs on the Chainlink vrfCoordinatorV2 contract
export async function handler(event) {
  console.log('Starting autotask...');
  const thresholdInWei = ethers.utils.parseEther(threshold);
  const provider = new DefenderRelayProvider(event);
  const payload = event.request.body;
  console.log(`Threshold is ${threshold} LINK`);

  const vrfCoordinator = new ethers.Contract(vrfCoordinatorAddress, ABI, provider);
  const { balance } = await vrfCoordinator.getSubscription(subscriptionId);
  console.log(`Your subscription balance is ${ethers.utils.formatEther(balance)} LINK`);

  const matches = [];
  if (balance.lt(thresholdInWei)) {
    console.log(`Balance is below threshold, emitting alert...`);
    const match = {
      hash: payload.events[0].transaction.transactionHash, // the actual hash is not important. We won't need it in the autotask notification
      metadata: {},
    };
    matches.push(match);
  }
  return { matches };
}
