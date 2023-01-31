require('dotenv').config();

const stackName = 'governance_summary';
const governanceAddressSecretName = `${stackName}_governanceAddress`;

const { ethers } = require('ethers');

const { DefenderRelayProvider } = require('defender-relay-client/lib/ethers');

const governanceAbi = [
  'event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)',
  'function state(uint256 proposalId) view returns (uint8)',
  'function proposals(uint256) view returns (uint256 id, address proposer, uint256 eta, uint256 startBlock, uint256 endBlock, uint256 forVotes, uint256 againstVotes, uint256 abstainVotes, bool canceled, bool executed)',
  'function token() view returns (address)',
  'function quorumVotes() view returns (uint256)',
];

const tokenAbi = [
  'function decimals() view returns (uint8 decimals)',
];

exports.handler = async function handler(autotaskEvent) {
  // ensure that the autotaskEvent Object exists
  if (autotaskEvent === undefined) {
    throw new Error('autotaskEvent undefined');
  }

  const { secrets } = autotaskEvent;
  if (secrets === undefined) {
    throw new Error('secrets undefined');
  }

  // ensure that there is a governanceAddress secret
  const governanceAddress = secrets[governanceAddressSecretName];
  if (governanceAddress === undefined) {
    throw new Error('governanceAddress undefined');
  }

  // create a Provider from the connected Relay
  console.debug('Creating DefenderRelayProvider');
  const provider = new DefenderRelayProvider(autotaskEvent);

  try {
    await provider.getBlock('latest');
  } catch (error) {
    console.error('Error attempting to use Relay provider');
    throw error;
  }

  const currentBlock = await provider.getBlock('latest');

  // Get topic hash of the ProposalCreated event
  const iface = new ethers.utils.Interface(governanceAbi);
  const eventTopic = iface.getEventTopic('ProposalCreated'); 
  const logs = await provider.getLogs({
    address: governanceAddress,
    fromBlock: 1,
    toBlock: currentBlock.number,
    topics: [eventTopic],
  });

  // TODO: save current block to kvstore

  console.debug(`Proposals Found: ${logs.length}`);
  // create the Array of proposal IDs to check
  const proposalsToCheck = [];
  for (const singleLog of logs) {
    try {
      proposalsToCheck.push(iface.parseLog(singleLog)?.args?.[0]);
    }
    catch {}
  }

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
        // nothing to do
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

  // Find how many votes are need to pass
  const quorumVotes = await governanceContract.quorumVotes();

  // Get proposal info
  const proposalInfo = await Promise.all(pendingProposals
    .map(async (proposalId) => governanceContract.proposals(proposalId)));

  await Promise.all(proposalInfo.map(async (proposal) => {
    const forVotes = proposal.forVotes.div(tokenScale).toString();
    const againstVotes = proposal.againstVotes.div(tokenScale).toString();
    const abstainVotes = proposal.abstainVotes.div(tokenScale).toString();
    const vsQuorum = proposal.forVotes.mul(100).div(quorumVotes).toString();

    const blocksLeft = proposal.endBlock - currentBlock.number;
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

    const outputMessage = `Governance: Proposal ID ${proposal.id} is active with:\n\t`
      + `FOR votes vs quorum threshold: ${vsQuorum}%\n\t`
      + `👍 (for) votes:     ${forVotes}\n\t`
      + `👎 (against) votes: ${againstVotes}\n\t`
      + `🙊 (abstain) votes: ${abstainVotes}\n\t`
      + `Time left to vote: ${days} day(s) ${hours} hour(s) ${minutes} minutes(s) ${seconds} seconds(s) `;
    console.log(outputMessage);
  }));
  return true;
};

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
  const { RELAYER_API_KEY: apiKey, RELAYER_SECRET_KEY: apiSecret } = process.env;
  const secrets = {};

  exports.handler({ apiKey, apiSecret, secrets })
    .then(() => process.exit(0))
    .catch((error) => { console.error(error); process.exit(1); });
}
