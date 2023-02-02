const stackName = 'governance_automation';
const governanceAddressSecretName = `${stackName}_GOVERNANCE_CONTRACT_ADDRESS`;

const { ethers } = require('ethers');

const { KeyValueStoreClient } = require('defender-kvstore-client');
const { DefenderRelayProvider, DefenderRelaySigner } = require('defender-relay-client/lib/ethers');

const governanceAbi = [
  'event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 startBlock, uint256 endBlock, string description)',
  'function execute(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash) public payable returns (uint256)',
  'function hashProposal(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash) public pure returns (uint256)',
  'function proposalEta(uint256 proposalId) public view returns (uint256)', // will not be present if there is no timelock on the contract
  'function queue(address[] memory targets, uint256[] memory values, bytes[] memory calldatas, bytes32 descriptionHash) public returns (uint256)', // will not be present if there is no timelock on the contract
  'function state(uint256 proposalId) public view returns (uint8)',
  'function timelock() public view returns (address)', // will not be present if there is no timelock on the contract
];

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
  const governanceAddress = secrets[governanceAddressSecretName];

  // ensure that the governanceAddress exists
  if (governanceAddress === undefined) {
    throw new Error('GOVERNANCE_CONTRACT_ADDRESS must be defined in serverless.yml or Defender->AutoTask->Secrets');
  }

  // create the client to interact with the key-value store
  console.debug('Creating KeyValueStoreClient');
  const store = new KeyValueStoreClient(autotaskEvent);

  // Define kvstore name
  const kvStoreName = `${autotaskId}-startBlock`;

  // get the block number where we should start retrieving logs
  let startBlock = await store.get(kvStoreName);
  if (startBlock === undefined || startBlock === null || startBlock.length === 0) {
    startBlock = 0;
  } else {
    startBlock = parseInt(startBlock, 10);
  }
  console.debug(`startBlock retrieved: ${startBlock}`);

  // create a Provider and Signer from the connected Relay
  console.debug('Creating DefenderRelayProvider');
  const provider = new DefenderRelayProvider(autotaskEvent);
  console.debug('Creating DefenderRelaySigner');
  const signer = new DefenderRelaySigner(autotaskEvent, provider, { speed: 'fast' });

  // Test relay
  try {
    await signer.getAddress();
  } catch (error) {
    console.error('Relay is not working, check if it is connected: ', error);
    throw error;
  }

  // create an ethers.js Contract Object to interact with the on-chain smart contract
  console.debug('Creating governanceContract');
  const governanceContract = new ethers.Contract(
    governanceAddress,
    governanceAbi,
    signer,
  );

  const iface = new ethers.utils.Interface(governanceAbi);
  const topicHash = iface.getEventTopic('ProposalCreated');

  const block = await provider.getBlock('latest');
  const { timestamp, number } = block;
  console.debug(`Current block number: ${number}`);
  console.debug(`Current block timestamp: ${timestamp}`);

  // use getLogs to retrieve logs for all proposals created
  // although the default toBlock value is 'latest',
  // be explicit about the toBlock to make it the current block
  const filter = {
    address: governanceAddress,
    topics: [topicHash],
    fromBlock: startBlock,
    toBlock: number,
  };
  const logs = await provider.getLogs(filter);

  // check whether or not the contract has a timelock method
  // if so, we will assume that it also has a queue method
  let hasTimelock;
  try {
    console.debug('Calling timelock() on Governor contract to check for Timelock');
    await governanceContract.timelock();
    hasTimelock = true;
    console.debug('Timelock successfully called and returned address');
  } catch (err) {
    console.error(`Call to timelock method failed, assuming Governor has no Timelock: ${err}`);
    hasTimelock = false;
  }

  const promises = logs.map(async (log) => {
    // extract information about when the log was emitted
    const { blockNumber } = log;

    const logDescription = iface.parseLog(log);

    const {
      args: {
        proposalId,
        targets,
        calldatas,
        description,
      },
    } = logDescription;

    // the 'values' argument has to be extracted separately because ethers.js will not create a
    // a named entry in the 'args' Object
    // JavaScript Objects have a 'values' method already and ethers.js will not create Object keys
    // that collide with existing Object attribute or method names
    // other examples that would not work are 'entries', 'keys', etc.
    const values = logDescription.args[3];

    const descriptionHash = ethers.utils.id(description);

    const state = await governanceContract.state(proposalId);
    console.debug(`proposalId state: ${state}`);

    let eta;
    switch (state) {
      case 0: // Pending
      case 1: // Active
        return blockNumber;
      case 2: // Canceled
      case 3: // Defeated
      case 6: // Expired
      case 7: // Executed
        return undefined;
      case 4: // Succeeded
        if (hasTimelock) {
          // Governor has a Timelock
          // Use Relay to call queue()
          console.debug(`Governor has a Timelock, calling queue() for proposal ID: ${proposalId}`);
          await governanceContract.queue(targets, values, calldatas, descriptionHash);
          console.debug('Done');
          return blockNumber;
        }
      // intentional fall-through for the no TimeLock case
      // eslint-disable-next-line no-fallthrough
      case 5: // Queued
        // try...catch for Governor contracts that don't have the proposalEta method
        try {
          // check for the ability to call execute()
          console.debug(`Checking if proposal ID ${proposalId} is ready to execute`);
          eta = await governanceContract.proposalEta(proposalId);
          console.debug(`proposalEta: ${eta}`);
          // eslint-disable-next-line no-empty
        } catch { }

        if (!hasTimelock || eta === 0 || eta < timestamp) {
          // if the correct amount of time has passed, execute
          // execute transaction with Relay to call execute()
          console.debug(`Calling execute for proposal ID ${proposalId}`);
          await governanceContract.execute(targets, values, calldatas, descriptionHash);
        } else {
          console.debug(`proposal ID ${proposalId} NOT ready to execute`);
        }
        return blockNumber;
      default:
        console.error(`Unexpected proposal state: ${state}`);
    }
    return undefined;
  });

  // wait for the promises to settle
  console.debug('Awaiting all promises');
  let blockNumbers = await Promise.all(promises);
  blockNumbers = blockNumbers.filter((value) => value !== undefined);

  // if all of the proposals were in a terminal state,
  // update the start block value to the current block number
  if (blockNumbers.length > 0) {
    // get the oldest block with a proposalId that is not in a terminal state yet
    startBlock = Math.min(...blockNumbers);

    // write the Array of proposal IDs to ignore back to the key-value store
    console.debug(`Storing startBlock for next Autotask execution in key-value store: ${startBlock}`);
    await store.put(kvStoreName, startBlock.toString());
  } else {
    console.debug(`All proposals are in a terminal state, updating startBlock in key-value store: ${number}`);
    await store.put(kvStoreName, number.toString());
  }

  return true;
};
