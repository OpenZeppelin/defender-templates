const stackName = 'bridge_automation';
const layer2RelayerAddressSecretName = `${stackName}_LAYER2_RELAYER_ADDRESS`;
const layer2ContractAddressSecretName = `${stackName}_LAYER2_CONTRACT_ADDRESS`;
const layer2RelayerApiKeySecretName = `${stackName}_LAYER2_RELAYER_API_KEY`;
const layer2RelayerApiSecretSecretName = `${stackName}_LAYER2_RELAYER_API_SECRET`;
const layer1RelayerApiKeySecretName = `${stackName}_LAYER1_RELAYER_API_KEY`;
const layer1RelayerApiSecretSecretName = `${stackName}_LAYER1_RELAYER_API_SECRET`;
const thresholdSecretName = `${stackName}_THRESHOLD`;

const { ethers } = require('ethers');

const { DefenderRelayProvider, DefenderRelaySigner } = require('defender-relay-client/lib/ethers');

const arbitrumBridgeAbi = [
    'function depositEth(uint256 maxSubmissionCost) external payable returns (uint256)'
];
const arbitrumBridgeAddress = '0x6BEbC4925716945D46F0Ec336D5C2564F419682C';

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

  // layer2ContractAddress is defined in the serverless.yml file
  // this is the address of the balance we want to monitor (most likely a dao treasury/multisig)
  const layer2ContractAddress = secrets[layer2ContractAddressSecretName];

  // layer2RelayerAddress is defined in the serverless.yml file
  // this is the address of the L2 relayer used to send funds to the layer2ContractAddress
  const layer2RelayerAddress = secrets[layer2RelayerAddressSecretName];

  // ensure that the layer2ContractAddress exists
  if (layer2ContractAddress === undefined) {
    throw new Error('LAYER2_CONTRACT_ADDRESS must be defined in .secret/<stage>.yml file or Defender->AutoTask->Secrets');
  }
  
  // ensure that the layer2RelayerAddress exists
  if (layer2RelayerAddress === undefined) {
    throw new Error('LAYER2_RELAYER_ADDRESS must be defined in .secret/<stage>.yml file or Defender->AutoTask->Secrets');
  }

  // relayer secrets are defined in the .secrets/dev.yml file
  const layer2RelayerApiKey = secrets[layer2RelayerApiKeySecretName];
  const layer2RelayerApiSecret = secrets[layer2RelayerApiSecretSecretName];
  const layer1RelayerApiKey = secrets[layer1RelayerApiKeySecretName];
  const layer1RelayerApiSecret = secrets[layer1RelayerApiSecretSecretName];

  // ensure that the layer2RelayerApiKey exists
  if (layer2RelayerApiKey === undefined) {
    throw new Error('LAYER2_RELAYER_API_KEY must be defined in .secret/<stage>.yml file or Defender->AutoTask->Secrets');
  }
    
  // ensure that the layer2RelayerApiSecret exists
  if (layer2RelayerApiSecret === undefined) {
    throw new Error('LAYER2_RELAYER_API_SECRET must be defined in .secret/<stage>.yml file or Defender->AutoTask->Secrets');
  }

  // ensure that the layer1RelayerApiKey exists
  if (layer1RelayerApiKey === undefined) {
    throw new Error('LAYER1_RELAYER_API_KEY must be defined in .secret/<stage>.yml file or Defender->AutoTask->Secrets');
  }
    
  // ensure that the layer1RelayerApiSecret exists
  if (layer1RelayerApiSecret === undefined) {
    throw new Error('LAYER1_RELAYER_API_SECRET must be defined in .secret/<stage>.yml file or Defender->AutoTask->Secrets');
  }

  // minimum threshold is defined in the serverless.yml file
  // TODO does this value come in as a big number from defender??
  let threshold = secrets[thresholdSecretName];

  // ensure that the threshold exists
  if (threshold === undefined) {
    threshold = ethers.BigNumber.from('1000000000000000000');
    console.debug('no threshold specified, setting threshold to 1 ether');
  }

  // create new provider and signer on the L2 side
  // manually inject api key and secret because we need to connect 2 relayers
  console.debug('Creating DefenderRelayProvider for L2');
  const providerL2 = new DefenderRelayProvider({ apiKey: layer2RelayerApiKey, apiSecret: layer2RelayerApiSecret });
  console.debug('Creating DefenderRelaySigner for L2');
  const signerL2 = new DefenderRelaySigner({ apiKey: layer2RelayerApiKey, apiSecret: layer2RelayerApiSecret }, providerL2, { speed: 'fast' });

  // create new provider and signer on the L1 side
  // manually inject api key and secret because we need to connect 2 relayers
  console.debug('Creating DefenderRelayProvider for L1');
  const providerL1 = new DefenderRelayProvider({ apiKey: layer1RelayerApiKey, apiSecret: layer1RelayerApiSecret });
  console.debug('Creating DefenderRelaySigner for L1');
  const signerL1 = new DefenderRelaySigner({ apiKey: layer1RelayerApiKey, apiSecret: layer1RelayerApiSecret }, providerL1, { speed: 'fast' });

  // get the balance of contract address to monitor on the L2
  // if below threshold, bridge funds from L1 => L2
  const layer2ContractBalance = await providerL2.getBalance(layer2ContractAddress)

  // create instance of Arbitrum bridge contract to bridge funds
  const bridgeContract = new ethers.Contract(
    arbitrumBridgeAddress,
    arbitrumBridgeAbi,
    signerL1,
  );

  // bridge funds if below threshold
  // max submission cost set to .001 ether
  if (layer2ContractBalance.lte(threshold)) {
    console.debug('Bridging funds to Arbitrum');
    await bridgeContract.depositEth(1000000000000000, {value: ethers.utils.parseEther('.02')}); // TODO change to config, also require that relayer 1 balance > what we want to send
  }

  // get balance of relayer - returns a big number
  const relayerBalance = await providerL2.getBalance(layer2RelayerAddress)

  // auto sweep funds from relayer on L2 to target layer2 contract address
  if (relayerBalance.gt(0)) {
    // total amount of eth required to send a transaction = gasLimit * gasPrice + value
    // gasForTransaction should be 21000 because only transfering ether
    const gasPrice = await providerL2.getGasPrice();
    const gasForTranasction = await providerL2.estimateGas({
        to: layer2ContractAddress,
        data: '',
    })
    const totalGas = gasPrice * gasForTranasction;
    const amountToSend = relayerBalance.sub(totalGas)
    const tx = {
        to: layer2ContractAddress,
        value: amountToSend,
        gasPrice: gasPrice,
        gasLimit: gasForTranasction,
      }
    // send all funds from relayer on L2 to contract address
    console.debug(`Funds detected in the L2 Relayer, sweeping funds to: ${tx.to}`);
    await signerL2.sendTransaction(tx);
  }

  return true;
}