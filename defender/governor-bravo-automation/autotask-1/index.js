const stackName = 'governor_bravo_automation';
const governanceAddressSecretName = `${stackName}_GOVERNANCE_CONTRACT_ADDRESS`;

const ethers = require('ethers');

const { KeyValueStoreClient } = require('defender-kvstore-client');
const { DefenderRelayProvider, DefenderRelaySigner } = require('defender-relay-client/lib/ethers');

const governorBravoAbi = [
  'function execute(uint proposalId)',
  'function initialProposalId() view returns (uint256)',
  'function proposalCount() view returns (uint256)',
  'function proposals(uint256) view returns (uint256 id, address proposer, uint256 eta, uint256 startBlock, uint256 endBlock, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, bool canceled, bool executed)',
  'function queue(uint proposalId)',
  'function state(uint256 proposalId) view returns (uint8)',
];

async function readyToExecute(contract, proposalId) {
  const block = await contract.provider.getBlock('latest');
  const proposal = await contract.proposals(ethers.BigNumber.from(proposalId));
  return (block.timestamp > (proposal.eta).toNumber());
}

exports.handler = async function handler(autotaskEvent) {
  // ensure that the autotaskEvent Object exists
  if (autotaskEvent === undefined) {
    throw new Error('autotaskEvent undefined');
  }

  // ensure that the secrets Object exists
  const { autotaskId, secrets } = autotaskEvent;
  if (secrets === undefined) {
    throw new Error('secrets undefined');
  }

  // ensure that the autotaskId exists
  if (autotaskId === undefined) {
    throw new Error('autotaskId undefined');
  }

  // Governance address is defined in the serverless.yml file
  const governorBravoAddress = secrets[governanceAddressSecretName];

  // create a Provider and Signer from the connected Relay
  console.debug('Creating DefenderRelayProvider');
  const provider = new DefenderRelayProvider(autotaskEvent);
  console.debug('Creating DefenderRelaySigner');
  const signer = new DefenderRelaySigner(autotaskEvent, provider, { speed: 'fast' });

  // Test relay
  try {
    await signer.getAddress();
  } catch (error) {
    console.error('Relay is not working, check if it is connected : ', error);
    throw error;
  }

  // create an ethers.js Contract Object to interact with the on-chain smart contract
  console.debug('Creating governanceContract');
  const governanceContract = new ethers.Contract(
    governorBravoAddress,
    governorBravoAbi,
    signer,
  );

  // create the client to interact with the key-value store
  console.debug('Creating KeyValueStoreClient');
  const store = new KeyValueStoreClient(autotaskEvent);

  // get the value from the key-value store
  // expect a comma separated list of integers
  console.debug('Retrieving proposalIdsToIgnore');
  let proposalIdsToIgnore = await store.get('proposalIdsToIgnore');
  console.debug(`proposalIdsToIgnore retrieved: ${proposalIdsToIgnore}`);

  // is this the first time the Autotask has been executed
  if (proposalIdsToIgnore === undefined || proposalIdsToIgnore === null) {
    proposalIdsToIgnore = [];
  } else if (proposalIdsToIgnore.length === 0) {
    // handle the empty string case
    proposalIdsToIgnore = [];
  } else {
    // non-empty string case
    proposalIdsToIgnore = proposalIdsToIgnore.split(',').map((value) => parseInt(value, 10));
  }
  console.debug(`proposalIdsToIgnore formatted: ${proposalIdsToIgnore}`);

  // check the initialized value of the proposal ID
  // NOTE: the first proposal ID is this value PLUS 1
  const initialProposalId = (await governanceContract.initialProposalId()).toNumber();
  const startProposalId = initialProposalId + 1;
  console.debug(`first proposal value: ${startProposalId}`);

  // check the value of the latest proposal ID
  const currentProposalId = (await governanceContract.proposalCount()).toNumber();
  console.debug(`currentProposalId: ${currentProposalId}`);

  // create the Array of proposal IDs to check
  const proposalsToCheck = [];
  for (let proposalId = startProposalId; proposalId <= currentProposalId; proposalId++) {
    if (proposalIdsToIgnore.includes(proposalId) === false) {
      proposalsToCheck.push(proposalId);
    }
  }
  console.debug(`proposalsToCheck: ${proposalsToCheck}`);

  const promises = proposalsToCheck.map(async (proposalId) => {
    const state = await governanceContract.state(proposalId);
    let callExecute;
    switch (state) {
      case 0: // Pending
      case 1: // Active
        // nothing to do
        break;
      case 2: // Canceled
      case 3: // Defeated
      case 6: // Expired
      case 7: // Executed
        // add to ignore Array for next time
        console.debug(`Adding proposal ID ${proposalId} to proposalIdsToIgnore`);
        proposalIdsToIgnore.push(proposalId);
        break;
      case 4: // Successful
        // execute transaction with Relay to call queue()
        console.debug(`Calling queue for proposal ID ${proposalId}`);
        await governanceContract.queue(ethers.BigNumber.from(proposalId));
        // intentionally allow fall-through so that a successfully queued proposal has the
        // opportunity to be executed as soon as possible
        // eslint-disable-next-line no-fallthrough
      case 5: // Queued
        // check for the ability to call execute()
        console.debug(`Checking if proposal ID ${proposalId} is ready to execute`);
        callExecute = await readyToExecute(governanceContract, proposalId);
        if (callExecute === true) {
          // if the correct amount of time has passed, execute
          // execute transaction with Relay to call execute()
          console.debug(`Calling execute for proposal ID ${proposalId}`);
          await governanceContract.execute(ethers.BigNumber.from(proposalId));
        } else {
          console.debug(`proposal ID ${proposalId} NOT ready to execute`);
        }
        break;
      default:
        console.error(`Unexpected proposal state: ${state}`);
    }
  });

  console.debug('Awaiting all promises');
  await Promise.all(promises);

  // write the Array of proposal IDs to ignore back to the key-value store
  console.debug(`Storing proposalIdsToIgnore in key-value store: ${proposalIdsToIgnore}`);
  await store.put('proposalIdsToIgnore', proposalIdsToIgnore.toString());

  return true;
};
