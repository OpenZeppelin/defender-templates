/* eslint-disable no-undef */
require('dotenv').config();
const { ethers } = require('ethers');
const { handler } = require('../autotask-1/index');


// Point at the local node
const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545/');

async function setBlockNumber(blockNumber) {
  console.log(`Forking chain at block ${blockNumber}`);
  const resetParams = [
    {
      forking: {
        jsonRpcUrl: process.env.ETHEREUM_MAINNET_JSON_RPC_URL,
        blockNumber,
      },
    },
  ];
  await provider.send('hardhat_reset', resetParams);
}

async function resetHardhat() {
  console.log('Resetting Hardhat');
  await provider.send('hardhat_reset');
}

// mock the defender-kvstore-client package
const mockKeyValueStoreClient = {
  get: jest.fn(),
  put: jest.fn(),
};

jest.mock('defender-kvstore-client', () => ({
  KeyValueStoreClient: jest.fn().mockImplementation(() => { return mockKeyValueStoreClient }),
}));

// combine the mocked provider and contracts into the ethers import mock
const mockProvider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545/');
const mockSigner = mockProvider.getSigner();
jest.mock('defender-relay-client/lib/ethers', () => ({
  ...jest.requireActual('defender-relay-client/lib/ethers'),
  DefenderRelayProvider: jest.fn().mockImplementation(() => { return mockProvider }),
  DefenderRelaySigner: jest.fn().mockImplementation(() => { return mockSigner }),
}));

describe('check autotask against forked mainnet', () => {
  let mockKeyValueStore;

  const governanceAddress = '0xDBd38F7e739709fe5bFaE6cc8eF67C3820830E0C';
  const autotaskEvent = {
    autotaskId: 123,
    secrets: {
      governance_summary_governanceAddress: governanceAddress,
    }
  }

  governanceAbi = [
    'function proposalEta(uint256 proposalId) view returns (uint256)',
    'function state(uint256 proposalId) view returns (uint8)',
  ];
  const governanceContract = new ethers.Contract(governanceAddress, governanceAbi, provider);

  // Forked mainnet tests against DopeDAO proposal ID:
  // '30548761488336017076913132844890548744842974272591293976782121047955082099721'

  // DopeDAO https://etherscan.io/address/0xDBd38F7e739709fe5bFaE6cc8eF67C3820830E0C

  // Proposal transaction:
  // https://etherscan.io/tx/0x164a4a59f176bc0faa7f9f2f8b846240cc15ae9ca8f23b47e9108fe14938016c
  const proposalId = ethers.BigNumber.from('30548761488336017076913132844890548744842974272591293976782121047955082099721');
  const proposedBlock = 16245486;
  const startVoteBlock = 16258577;
  const endVoteBlock = 16304395;

  // Define proposal states
  const pendingState = 0; // Proposal was created but voting has not started yet
  const activeState = 1; // Voting has started
  const succeededState = 4; // Voting ended and the proposal was passed

  beforeAll(async () => {
    // Check for RPC_URL
    if (process.env.ETHEREUM_MAINNET_JSON_RPC_URL === undefined) {
      throw new Error('ETHEREUM_MAINNET_JSON_RPC_URL is not defined in the .env file ');
    }

    // Ensure that Hardhat is running
    try {
      await provider.send('hardhat_metadata');
    } catch (error) {
      throw new Error('Hardhat node is not responsive, restart hardhat or open new terminal and type "npx hardhat node"');
    }

    await resetHardhat();
  });

  beforeEach(() => {
    // reset the Object that mocks the key value store before each test case
    mockKeyValueStore = {};
    mockKeyValueStoreClient.get = jest.fn((key) => mockKeyValueStore[key]);
    mockKeyValueStoreClient.put = jest.fn((key, value) => {
      mockKeyValueStore[key] = value;
    });
  });

  afterAll(() => {
    // Reset hardhat?
  });

  it('proposal is in a pending state (0)', async () => {
    const expectedMessage = [
      'Governance: Proposal ID 55762817791754168765552678355023904624381926322421134743858337467676020782044 is active with:'
      + '\n\tFOR votes vs quorum threshold: 24%'
      + '\n\t👍 (for) votes:     124'
      + '\n\t👎 (against) votes: 0'
      + '\n\t🙊 (abstain) votes: 0'
      + '\n\tTime left to vote: 3 day(s) 13 hour(s) 20 minutes(s) 11 seconds(s) ',
      'Governance: Proposal ID 43213436820610997532127661574404181302334166126907254457875855844882300126842 is active with:'
      + '\n\tFOR votes vs quorum threshold: 127%'
      + '\n\t👍 (for) votes:     636'
      + '\n\t👎 (against) votes: 0'
      + '\n\t🙊 (abstain) votes: 0'
      + '\n\tTime left to vote: 4 day(s) 20 hour(s) 13 minutes(s) 10 seconds(s) '];
    const expectedCurrentProposals = '55762817791754168765552678355023904624381926322421134743858337467676020782044,43213436820610997532127661574404181302334166126907254457875855844882300126842';

    // Jump to the block where the proposal was created
    await setBlockNumber(proposedBlock);

    // Pre-check: Ensure that the proposal exists and is in a pending state (0)
    expect(await governanceContract.state(proposalId)).toStrictEqual(pendingState);

    // Run the autotask
    const results = await handler(autotaskEvent);

    // Check autotask results
    expect(results).toStrictEqual(expectedMessage);

    // KVStore is updated to the earliest Active or queued proposal
    expect(mockKeyValueStore).toStrictEqual({
      '123_currentProposals': expectedCurrentProposals,
      '123_lastBlockSearched': proposedBlock.toString(),
    });
  }, 120000); // 120 Second timeout

  it('proposal is in an active state (1) first block of voting', async () => {
    const expectedMessage = [
      'Governance: Proposal ID 55762817791754168765552678355023904624381926322421134743858337467676020782044 is active with:'
      + '\n\tFOR votes vs quorum threshold: 24%'
      + '\n\t👍 (for) votes:     124'
      + '\n\t👎 (against) votes: 455'
      + '\n\t🙊 (abstain) votes: 0'
      + '\n\tTime left to vote: 1 day(s) 17 hour(s) 24 minutes(s) 4 seconds(s) ',
      'Governance: Proposal ID 43213436820610997532127661574404181302334166126907254457875855844882300126842 is active with:'
      + '\n\tFOR votes vs quorum threshold: 205%'
      + '\n\t👍 (for) votes:     1026'
      + '\n\t👎 (against) votes: 0'
      + '\n\t🙊 (abstain) votes: 0'
      + '\n\tTime left to vote: 3 day(s) 0 hour(s) 11 minutes(s) 31 seconds(s) ',
      'Governance: Proposal ID 30548761488336017076913132844890548744842974272591293976782121047955082099721 is active with:'
      + '\n\tFOR votes vs quorum threshold: 0%'
      + '\n\t👍 (for) votes:     0'
      + '\n\t👎 (against) votes: 0'
      + '\n\t🙊 (abstain) votes: 0'
      + '\n\tTime left to vote: 6 day(s) 8 hour(s) 52 minutes(s) 45 seconds(s) '];
    const expectedCurrentProposals = '55762817791754168765552678355023904624381926322421134743858337467676020782044,43213436820610997532127661574404181302334166126907254457875855844882300126842,30548761488336017076913132844890548744842974272591293976782121047955082099721';


    // Jump to the block that the proposal voting started
    await setBlockNumber(startVoteBlock);

    // Pre-check: Ensure that the proposal exists and is in an active state (1)
    expect(await governanceContract.state(proposalId)).toStrictEqual(activeState);

    // Run the autotask
    const results = await handler(autotaskEvent);

    // Check autotask results
    expect(results).toStrictEqual(expectedMessage);

    // KVStore is updated to the earliest Active or queued proposal
    expect(mockKeyValueStore).toStrictEqual({
      '123_currentProposals': expectedCurrentProposals,
      '123_lastBlockSearched': startVoteBlock.toString(),
    });
  }, 120000); // 120 Second timeout

  it('proposal is in an active state (1) last block of voting', async () => {
    const expectedMessage = [
      'Governance: Proposal ID 30548761488336017076913132844890548744842974272591293976782121047955082099721 is active with:'
      + '\n\tFOR votes vs quorum threshold: 149%'
      + '\n\t👍 (for) votes:     745'
      + '\n\t👎 (against) votes: 0'
      + '\n\t🙊 (abstain) votes: 0'
      + '\n\tTime left to vote: 0 day(s) 0 hour(s) 0 minutes(s) 12 seconds(s) '];
    const expectedCurrentProposals = '30548761488336017076913132844890548744842974272591293976782121047955082099721';

    // Jump to the block before the proposal voting ended
    await setBlockNumber(endVoteBlock - 1);

    // Pre-check: Ensure that the proposal exists and is in an active state (1)
    expect(await governanceContract.state(proposalId)).toStrictEqual(activeState);

    // Run the autotask
    const results = await handler(autotaskEvent);

    // Check autotask results
    expect(results).toStrictEqual(expectedMessage);

    // KVStore is updated to the earliest Active or queued proposal
    expect(mockKeyValueStore).toStrictEqual({
      '123_currentProposals': expectedCurrentProposals,
      '123_lastBlockSearched': (endVoteBlock - 1).toString(),
    });
  }, 120000); // 120 Second timeout

  it('proposal is in a succeeded state (4)', async () => {
    const expectedMessage = true; // All proposals have finished, should just return true
    const expectedCurrentProposals = '';

    // Jump to the block that the proposal voting ended
    await setBlockNumber(endVoteBlock);

    // Pre-check: Ensure that the proposal exists and is in a succeeded state (4)
    expect(await governanceContract.state(proposalId)).toStrictEqual(succeededState);

    // Run the autotask
    const results = await handler(autotaskEvent);

    // Check autotask results
    expect(results).toStrictEqual(expectedMessage);

    // KVStore is updated to the earliest Active or queued proposal
    expect(mockKeyValueStore).toStrictEqual({
      '123_currentProposals': expectedCurrentProposals,
      '123_lastBlockSearched': endVoteBlock.toString(),
    });
  }, 120000); // 120 Second timeout
});