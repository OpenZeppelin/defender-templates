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

async function mineBlocks(numberOfBlocks = 1, secondsPerBlock = 2) {
  for (let blocks = 0; blocks < numberOfBlocks; blocks++) {
    await provider.send('evm_increaseTime', [secondsPerBlock]);
    await provider.send('evm_mine');
  }
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
      governance_automation_GOVERNANCE_CONTRACT_ADDRESS: governanceAddress,
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
  const queuedBlock = 16320784;

  // Define proposal states
  const pendingState = 0; // Proposal was created but voting has not started yet
  const activeState = 1; // Voting has started
  const succeededState = 4; // Voting ended and the proposal was passed
  const queuedState = 5; // Proposal was passed, and currently waiting in the timelock
  const executedState = 7; // Proposal has already been executed

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

  it('does nothing if proposal is in a pending state (0)', async () => {
    // Jump to the block where the proposal was created
    await setBlockNumber(proposedBlock);

    // Pre-check: Ensure that the proposal exists and is in a pending state (0)
    expect(await governanceContract.state(proposalId)).toStrictEqual(pendingState);

    // Run the autotask
    const results = await handler(autotaskEvent);

    // Autotask exits successfully
    expect(results).toStrictEqual(true);

    // Proposal is still in a pending state (0)
    expect(await governanceContract.state(proposalId)).toStrictEqual(pendingState);

    // KVStore is updated to the earliest Active or queued proposal
    expect(mockKeyValueStore).toStrictEqual({ '123-startBlock': '16212076' });
  }, 120000); // 120 Second timeout

  it('does nothing if proposal is in an active state (1)', async () => {
    // Jump to the block that the proposal voting started
    await setBlockNumber(startVoteBlock);

    // Pre-check: Ensure that the proposal exists and is in an active state (1)
    expect(await governanceContract.state(proposalId)).toStrictEqual(activeState);

    // Run the autotask
    const results = await handler(autotaskEvent);

    // Autotask exits successfully
    expect(results).toStrictEqual(true);

    // Proposal is still in an active state (1)
    expect(await governanceContract.state(proposalId)).toStrictEqual(activeState);

    // KVStore is updated to the earliest Active or queued proposal
    expect(mockKeyValueStore).toStrictEqual({ '123-startBlock': '16212076' });
  }, 120000); // 120 Second timeout

  it('queues the proposal if it is in a succeeded state (4)', async () => {
    // Jump to the block that the proposal voting ended
    await setBlockNumber(endVoteBlock);

    // Pre-check: Ensure that the proposal exists and is in a succeeded state (4)
    expect(await governanceContract.state(proposalId)).toStrictEqual(succeededState);

    // Run the autotask
    const results = await handler(autotaskEvent);

    // Autotask exits successfully
    expect(results).toStrictEqual(true);

    // Proposal is now in a queued state (5)
    expect(await governanceContract.state(proposalId)).toStrictEqual(queuedState);

    // KVStore is updated to the earliest Active or queued proposal
    expect(mockKeyValueStore).toStrictEqual({ '123-startBlock': '16221304' });
  }, 120000); // 120 Second timeout

  it('does nothing if the proposal has not reached the ETA in the queued state (5)', async () => {
    // Jump to the block that the proposal was queued
    await setBlockNumber(queuedBlock);

    // Pre-check: Ensure that the proposal exists and is in a queued state (5)
    expect(await governanceContract.state(proposalId)).toStrictEqual(queuedState);
    // Ensure that the block timestamp is less than the proposal ETA
    const { timestamp } = await provider.getBlock();
    let proposalEta = await governanceContract.proposalEta(proposalId);
    proposalEta = proposalEta.toNumber();
    expect(timestamp).toBeLessThan(proposalEta);

    // Run the autotask
    const results = await handler(autotaskEvent);

    // Autotask exits successfully
    expect(results).toStrictEqual(true);

    // Proposal is still in a queued state (5)
    expect(await governanceContract.state(proposalId)).toStrictEqual(queuedState);

    // KVStore is updated to the earliest Active or queued proposal
    expect(mockKeyValueStore).toStrictEqual({ '123-startBlock': '16245486' });
  }, 120000); // 120 Second timeout

  it('executes the proposal if it has reached the ETA in the queued state (5)', async () => {
    // Jump to the block that the proposal was queued
    await setBlockNumber(queuedBlock);

    // Pre-check: Ensure that the proposal exists and is in a queued state (5)
    expect(await governanceContract.state(proposalId)).toStrictEqual(queuedState);
    // Ensure that the block timestamp is less than the proposal ETA
    let { timestamp } = await provider.getBlock();
    let proposalEta = await governanceContract.proposalEta(proposalId);
    proposalEta = proposalEta.toNumber();
    expect(timestamp).toBeLessThan(proposalEta);

    // Mine 1 block so that the current timestamp is one second after the ETA
    const timeToEta = proposalEta - timestamp + 1;
    mineBlocks(1, timeToEta);
    [{ timestamp } = await provider.getBlock()];
    expect(timestamp).toStrictEqual(proposalEta + 1);

    // Run the autotask
    const results = await handler(autotaskEvent);

    // Autotask exits successfully
    expect(results).toStrictEqual(true);

    // Proposal is now in an executed state (7)
    expect(await governanceContract.state(proposalId)).toStrictEqual(executedState);

    // KVStore is updated to the earliest Active or queued proposal
    expect(mockKeyValueStore).toStrictEqual({ '123-startBlock': '16245486' });
  }, 120000); // 120 Second timeout
});