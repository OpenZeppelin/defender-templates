const stackName = 'governance_summary';
const governanceAddressSecretName = `${stackName}_governance_address`;

const { ethers } = require('ethers');

const { KeyValueStoreClient } = require('defender-kvstore-client');
const { DefenderRelayProvider } = require('defender-relay-client/lib/ethers');

const governanceAbi = [
  'event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)',
  'function state(uint256 proposalId) view returns (uint8)',
  'function proposalVotes(uint256) view returns (uint256 againstVotes, uint256 forVotes, uint256 abstainVotes)',
  'function proposalSnapshot(uint256 proposalId) view returns (uint256 proposalSnapshot)',
  'function proposalDeadline(uint256 proposalId) view returns (uint256 proposalDeadline)',
  'function token() view returns (address)',
  'function quorum(uint256 blockNumber) view returns (uint256 quorum)',
];

const tokenAbi = [
  'function decimals() view returns (uint8 decimals)',
];

exports.handler = async function handler(autotaskEvent) {
  // ensure that the autotaskEvent Object exists
  if (autotaskEvent === undefined) {
    throw new Error('autotaskEvent undefined');
  }

  const { autotaskId, secrets } = autotaskEvent;
  if (secrets === undefined) {
    throw new Error('secrets undefined');
  }

  if (autotaskId === undefined) {
    throw new Error('autotaskId undefined');
  }

  // ensure that there is a governanceAddress secret
  const governanceAddress = secrets[governanceAddressSecretName];
  if (governanceAddress === undefined) {
    throw new Error('governanceAddress undefined');
  }

  // create a Provider from the connected Relay
  console.debug('Creating DefenderRelayProvider');
  const provider = new DefenderRelayProvider(autotaskEvent);

  // create the client to interact with the key-value store
  console.debug('Creating KeyValueStoreClient');
  const store = new KeyValueStoreClient(autotaskEvent);

  // retrieving kvstore values
  const nameLastBlockSearched = `${autotaskId}_lastBlockSearched`;
  const nameCurrentProposals = `${autotaskId}_currentProposals`;
  let lastBlockSearched = await store.get(nameLastBlockSearched);
  let currentProposals = await store.get(nameCurrentProposals);

  // initialize lastBlockSearched
  if (lastBlockSearched === undefined || lastBlockSearched === null) {
    lastBlockSearched = 0;
  } else if (lastBlockSearched.length === 0) {
    lastBlockSearched = 0;
  } else {
    lastBlockSearched = parseInt(lastBlockSearched, 10);
  }

  // initialize currentProposals list
  if (currentProposals === undefined || currentProposals === null) {
    currentProposals = [];
  } else if (currentProposals.length === 0) {
    currentProposals = [];
  } else {
    currentProposals = currentProposals.split(',').map((value) => value);
  }

  let currentBlock;
  try {
    currentBlock = await provider.getBlock('latest');
  } catch (error) {
    console.error('Error attempting to use Relay provider');
    throw error;
  }

  // Get topic hash of the ProposalCreated event
  const iface = new ethers.utils.Interface(governanceAbi);
  const eventTopic = iface.getEventTopic('ProposalCreated'); 
  const logs = await provider.getLogs({
    address: governanceAddress,
    fromBlock: lastBlockSearched,
    toBlock: currentBlock.number,
    topics: [eventTopic],
  });

  console.debug(`New Proposals Found: ${logs.length}`);
  // create the Array of proposal IDs to check
  let proposalsToCheck = [...currentProposals];
  for (const singleLog of logs) {
    try {
      const bnProposalId = iface.parseLog(singleLog)?.args?.[0];
      proposalsToCheck.push(bnProposalId.toString());
    }
    // eslint-disable-next-line no-empty
    catch {}
  }

  // remove duplicates
  proposalsToCheck = [...new Set(proposalsToCheck)];

  // create an ethers.js Contract Object to interact with the on-chain smart contract
  console.debug('Creating governanceContract');
  console.log(`governanceAddress: ${governanceAddress}`);
  const governanceContract = new ethers.Contract(
    governanceAddress,
    governanceAbi,
    provider,
  );
  
  console.debug(`proposalsToCheck: ${proposalsToCheck}`);

  const results = await Promise.all(proposalsToCheck.map(async (proposalId) => {
    const state = await governanceContract.state(proposalId);
    switch (state) {
      case 1: // Active
        console.debug(`Proposal ${proposalId} is active!`);
        return proposalId;
      case 0: // Pending
      case 2: // Canceled
      case 3: // Defeated
      case 4: // Successful
      case 5: // Queued
      case 6: // Expired
      case 7: // Executed
        break;
      default:
        console.error(`Unexpected proposal state: ${state}`);
    }
    return null;
  }));

  const pendingProposals = results.filter(Boolean);

  // End early if there is nothing to process
  if (pendingProposals.length === 0) {
    console.debug('No pending proposals found');
    // saving kvstore values
    await store.put(nameLastBlockSearched, currentBlock.number.toString());
    await store.put(nameCurrentProposals, pendingProposals.toString());
    return true;
  }

  // Get timing info
  const blockGap = 1000;
  const oldBlock = await provider.getBlock(currentBlock.number - blockGap);
  const timePerBlock = (currentBlock.timestamp - oldBlock.timestamp) / blockGap;

  // Get vote info for each pending proposal
  console.debug('Gathering vote information');

  // Get TOKEN's address to query for decimals.
  const tokenAddress = await governanceContract.token();
  const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
  const tokenDecimals = await tokenContract.decimals();
  const tokenScale = ethers.BigNumber.from(10).pow(tokenDecimals);

  // Get proposal info
  await Promise.all(pendingProposals.map(async (proposalId) => {
    const proposal = await governanceContract.proposalVotes(proposalId);
    const forVotes = proposal.forVotes.div(tokenScale).toString();
    const againstVotes = proposal.againstVotes.div(tokenScale).toString();
    const abstainVotes = proposal.abstainVotes.div(tokenScale).toString();
    // Find how many votes are need to pass
    const snapshotBlock = await governanceContract.proposalSnapshot(proposalId);
    const quorumVotes = await governanceContract.quorum(snapshotBlock);
    const vsQuorum = proposal.forVotes.mul(100).div(quorumVotes).toString();

    const proposalDeadline = await governanceContract.proposalDeadline(proposalId);
    const blocksLeft = proposalDeadline - currentBlock.number;
    let timeLeft = blocksLeft * timePerBlock;
    // 86400 seconds in a day. 60 * 60 * 24 = 86400
    const days = Math.trunc(timeLeft / 86400);
    timeLeft %= 86400;
    // 3600 seconds in an hour 60 * 60 = 3600
    const hours = Math.trunc(timeLeft / 3600);
    timeLeft %= 3600;
    // 60 seconds in a minute
    const minutes = Math.trunc(timeLeft / 60);
    timeLeft %= 60;
    const seconds = Math.trunc(timeLeft);

    const outputMessage = `Governance: Proposal ID ${proposalId} is active with:\n\t`
      + `FOR votes vs quorum threshold: ${vsQuorum}%\n\t`
      + `👍 (for) votes:     ${forVotes}\n\t`
      + `👎 (against) votes: ${againstVotes}\n\t`
      + `🙊 (abstain) votes: ${abstainVotes}\n\t`
      + `Time left to vote: ${days} day(s) ${hours} hour(s) ${minutes} minutes(s) ${seconds} seconds(s) `;
    console.log(outputMessage);
  }));

  // saving kvstore values
  await store.put(nameLastBlockSearched, currentBlock.number.toString());
  await store.put(nameCurrentProposals, pendingProposals.toString());

  return true;
};
