const stackName = 'bridge_automation';
const layer2RelayerAddressSecretName = `${stackName}_layer2-relayer-address`;
const layer2ContractAddressSecretName = `${stackName}_layer2-contract-address`;

const { ethers } = require('ethers');

const { DefenderRelayProvider, DefenderRelaySigner } = require('defender-relay-client/lib/ethers');

const arbitrumBridgeAbi = [
    'function depositEth(uint256 maxSubmissionCost) external payable virtual override returns (uint256)'
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

  // Layer 2 contract address is defined in the serverless.yml file
  // this is the address of the balance we want to monitor (most likely a dao treasury/multisig)
  const layer2ContractAddress = secrets[layer2ContractAddressSecretName];
  const layer2RelayerAddress = secrets[layer2RelayerAddressSecretName];

  // ensure that the layer2ContractAddress exists
  if (layer2ContractAddress === undefined) {
    throw new Error('LAYER2_CONTRACT_ADDRESS must be defined in .secret/<stage>.yml file or Defender->AutoTask->Secrets');
  }
  
  // ensure that the layer2RelayerAddress exists
  if (layer2RelayerAddress === undefined) {
    throw new Error('LAYER2_RELAYER_ADDRESS must be defined in .secret/<stage>.yml file or Defender->AutoTask->Secrets');
  }

  // create new provider and signer on the L2 side
  // manually inject api key and secret because we need to connect 2 relayers
  console.debug('Creating DefenderRelayProvider for L2');
  const providerL2 = new DefenderRelayProvider({ apiKey: API_KEY_L2, apiSecret: API_SECRET_L2 });
  console.debug('Creating DefenderRelaySigner for L2');
  const signerL2 = new DefenderRelaySigner({ apiKey: API_KEY_L2, apiSecret: API_SECRET_L2 }, providerL2, { speed: 'fast' });

  // create new provider and signer on the L1 side
  // manually inject api key and secret because we need to connect 2 relayers
  console.debug('Creating DefenderRelayProvider for L1');
  const providerL1 = new DefenderRelayProvider({ apiKey: API_KEY_L1, apiSecret: API_SECRET_L1 });
  console.debug('Creating DefenderRelaySigner for L1');
  const signerL1 = new DefenderRelaySigner({ apiKey: API_KEY_L1, apiSecret: API_SECRET_L }, providerL1, { speed: 'fast' });

  // get the balance of the multisig/DAO contract on the L2
  // if below threshold, bridge funds from L1 => L2
  const daoBalance = await providerL2.getBalance(layer2ContractAddress)

  // create Arbitrum bridge contract to bridge funds
  const bridgeContract = new ethers.Contract(
    arbitrumBridgeAddress,
    arbitrumBridgeAbi,
    signerL1,
  );

  // get balance of relayer - returns a big number
  const relayerBalance = await provider.getBalance(layer2RelayerAddress)

  if (relayerBalance.gt(0)) {
    // total amount of eth required to send a transaction = gasLimit * gasPrice + value
    // gasForTransaction should be 21000 because only transfering ether
    const gasPrice = await provider.getGasPrice();
    const gasForTranasction = await provider.estimateGas({
        to: layer2ContractAddress,
        data: "",
    })
    const totalGas = gasPrice * gasForTranasction;
    const amountToSend = relayerBalance.sub(totalGas)
    const tx = {
        to: layer2ContractAddress,
        value: amountToSend,
        gasPrice: gasPrice,
        gasLimit: gasForTranasction,
      }
    // send all funds from relayer to contract address
    await signer.sendTransaction(tx);
  }
}