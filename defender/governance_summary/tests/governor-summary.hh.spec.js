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

  const governanceAddress = '0xed8bdb5895b8b7f9fdb3c087628fd8410e853d48';
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

  // Forked mainnet tests against HOP Governor proposal ID:
  // '15047264382260247435111313341285366942697273281643720348399446119392159992381'

  // HOP Governor https://etherscan.io/address/0xed8bdb5895b8b7f9fdb3c087628fd8410e853d48

  // Proposal transaction:
  // https://etherscan.io/tx/0x8b10e11802ed8f690b9f3342b301bda2af4ec90895ca32e3b00889c402d725e6
  const proposalId = ethers.BigNumber.from('15047264382260247435111313341285366942697273281643720348399446119392159992381');
  const proposedBlock = 16019933;

  // Snapshot is the the proposal creation block + voting delay
  // uint64 snapshot = block.number.toUint64() + votingDelay().toUint64();
  // ref: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.8.1/contracts/governance/Governor.sol#L265

  // Snapshot is emitted as the startBlock
  // ref: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.8.1/contracts/governance/Governor.sol#L278

  // But the logic here states that on startBlock it will still return pending. 
  // For the proposal to be in active state it will need to be startBlock + 1
  // if (snapshot >= block.number) { return ProposalState.Pending;}
  // ref: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.8.1/contracts/governance/Governor.sol#L162
  const startVoteBlock = 16019934 + 1;
  const endVoteBlock = 16065752 + 1;
  const queuedBlock = 16124520;


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
    const expectedMessage = true; // When no proposals are pending, the autotask returns true
    const expectedCurrentProposals = '';

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
      'Governance: Proposal ID 15047264382260247435111313341285366942697273281643720348399446119392159992381 is active with:'
      + '\n\tFOR votes vs quorum threshold: 0%'
      + '\n\t👍 (for) votes:     0'
      + '\n\t👎 (against) votes: 0'
      + '\n\t🙊 (abstain) votes: 0'
      + '\n\tTime left to vote: 6 day(s) 9 hour(s) 10 minutes(s) 53 seconds(s) '];
    const expectedCurrentProposals = '15047264382260247435111313341285366942697273281643720348399446119392159992381';

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
      'Governance: Proposal ID 15047264382260247435111313341285366942697273281643720348399446119392159992381 is active with:'
      + '\n\tFOR votes vs quorum threshold: 264%'
      + '\n\t👍 (for) votes:     7948512'
      + '\n\t👎 (against) votes: 896'
      + '\n\t🙊 (abstain) votes: 0'
      + '\n\tTime left to vote: 0 day(s) 0 hour(s) 0 minutes(s) 0 seconds(s) '];
    const expectedCurrentProposals = '15047264382260247435111313341285366942697273281643720348399446119392159992381';

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