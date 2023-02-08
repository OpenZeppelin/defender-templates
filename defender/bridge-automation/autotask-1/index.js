const stackName = 'bridge_automation';
const layer2WalletAddressSecretName = `${stackName}_LAYER2_WALLET_ADDRESS`;
const layer2RelayerApiKeySecretName = `${stackName}_LAYER2_RELAYER_API_KEY`;
const layer2RelayerApiSecretSecretName = `${stackName}_LAYER2_RELAYER_API_SECRET`;
const layer1RelayerApiKeySecretName = `${stackName}_LAYER1_RELAYER_API_KEY`;
const layer1RelayerApiSecretSecretName = `${stackName}_LAYER1_RELAYER_API_SECRET`;
const thresholdSecretName = `${stackName}_THRESHOLD`;
const amountSecretName = `${stackName}_AMOUNT`;
const arbitrumBridgeAddressSecretName = `${stackName}_ARBITRUM_BRIDGE_ADDRESS`;

const { ethers } = require('ethers');

const { DefenderRelayProvider, DefenderRelaySigner } = require('defender-relay-client/lib/ethers');

const arbitrumBridgeAbi = ['function depositEth(uint256 maxSubmissionCost) external payable returns (uint256)'];

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

  const arbitrumBridgeAddress = secrets[arbitrumBridgeAddressSecretName];

  // ensure that the arbitrumBridgeAddress exists
  if (arbitrumBridgeAddress === undefined) {
    throw new Error('arbitrum-bridge-address must be defined in config.dev.yml file or Defender->AutoTask->Secrets');
  }

  // layer2WalletAddress is defined in the serverless.yml file
  // this is the address of the balance we want to monitor (most likely a dao treasury/multisig)
  const layer2WalletAddress = secrets[layer2WalletAddressSecretName];

  // ensure that the layer2WalletAddress exists
  if (layer2WalletAddress === undefined) {
    throw new Error('layer2-wallet-address must be defined in config.dev.yml file or Defender->AutoTask->Secrets');
  }

  // relayer secrets are defined in the .secrets/dev.yml file
  const layer2RelayerApiKey = secrets[layer2RelayerApiKeySecretName];
  const layer2RelayerApiSecret = secrets[layer2RelayerApiSecretSecretName];
  const layer1RelayerApiKey = secrets[layer1RelayerApiKeySecretName];
  const layer1RelayerApiSecret = secrets[layer1RelayerApiSecretSecretName];

  // ensure that the layer2RelayerApiKey exists
  if (layer2RelayerApiKey === undefined) {
    throw new Error(
      'LAYER2_RELAYER_API_KEY must be defined in .secret/<stage>.yml file or Defender->AutoTask->Secrets',
    );
  }

  // ensure that the layer2RelayerApiSecret exists
  if (layer2RelayerApiSecret === undefined) {
    throw new Error(
      'LAYER2_RELAYER_API_SECRET must be defined in .secret/<stage>.yml file or Defender->AutoTask->Secrets',
    );
  }

  // ensure that the layer1RelayerApiKey exists
  if (layer1RelayerApiKey === undefined) {
    throw new Error(
      'LAYER1_RELAYER_API_KEY must be defined in .secret/<stage>.yml file or Defender->AutoTask->Secrets',
    );
  }

  // ensure that the layer1RelayerApiSecret exists
  if (layer1RelayerApiSecret === undefined) {
    throw new Error(
      'LAYER1_RELAYER_API_SECRET must be defined in .secret/<stage>.yml file or Defender->AutoTask->Secrets',
    );
  }

  // minimum threshold is defined in the serverless.yml file
  // convert to BigNumber because the value is in wei
  let threshold = ethers.BigNumber.from(secrets[thresholdSecretName]);

  // ensure that the threshold exists
  if (threshold === undefined) {
    threshold = ethers.BigNumber.from('1000000000000000000');
    console.debug('no threshold specified, setting threshold to 1 ether');
  }

  const amount = secrets[amountSecretName];

  // ensure that the amount exists
  if (amount === undefined) {
    throw new Error('amount must be defined in config.dev.yml file or Defender->AutoTask->Secrets');
  }

  // create new provider and signer on the L2 side
  // manually inject api key and secret because we need to connect 2 relayers
  console.debug('Creating DefenderRelayProvider for L2');
  const providerL2 = new DefenderRelayProvider({ apiKey: layer2RelayerApiKey, apiSecret: layer2RelayerApiSecret });
  console.debug('Creating DefenderRelaySigner for L2');
  const signerL2 = new DefenderRelaySigner(
    { apiKey: layer2RelayerApiKey, apiSecret: layer2RelayerApiSecret },
    providerL2,
    { speed: 'fast' },
  );

  // create new provider and signer on the L1 side
  // manually inject api key and secret because we need to connect 2 relayers
  console.debug('Creating DefenderRelayProvider for L1');
  const providerL1 = new DefenderRelayProvider({ apiKey: layer1RelayerApiKey, apiSecret: layer1RelayerApiSecret });
  console.debug('Creating DefenderRelaySigner for L1');
  const signerL1 = new DefenderRelaySigner(
    { apiKey: layer1RelayerApiKey, apiSecret: layer1RelayerApiSecret },
    providerL1,
    { speed: 'fast' },
  );

  const layer2RelayerAddress = await signerL2.getAddress();

  // get the balance of the address to monitor on the L2 - returns BigNumber
  // if below threshold, bridge funds from L1 => L2
  const layer2WalletBalance = await providerL2.getBalance(layer2WalletAddress);

  // create instance of Arbitrum bridge contract to bridge funds
  const bridgeContract = new ethers.Contract(arbitrumBridgeAddress, arbitrumBridgeAbi, signerL1);

  // bridge funds if below or at threshold
  if (layer2WalletBalance.lte(threshold)) {
    console.debug('Bridging funds to Arbitrum');
    const layer1RelayerAddress = await signerL1.getAddress();
    const layer1RelayerBalance = await providerL1.getBalance(layer1RelayerAddress);
    if (layer1RelayerBalance.lt(amount)) {
      console.debug('Relayer balance is too low to bridge specified amount, please load funds');
    } else {
      // max submission cost set to .001 ether as first parameter
      await bridgeContract.depositEth(1000000000000000, { value: ethers.BigNumber.from(amount) });
    }
  }

  // get balance of relayer - return BigNumber
  const relayerBalance = await providerL2.getBalance(layer2RelayerAddress);

  // auto sweep funds from relayer on L2 to target layer2 wallet address
  if (relayerBalance.gt(0)) {
    // total amount of eth required to send a transaction = (gasLimit * gasPrice) + value
    // gasForTransaction should be close to 21000 because only transferring ether
    const gasPrice = await providerL2.getGasPrice();
    const gasForTranasction = await providerL2.estimateGas({
      to: layer2WalletAddress,
      data: '',
      value: relayerBalance,
    });
    const totalGas = gasPrice * gasForTranasction;
    const amountToSend = relayerBalance.sub(totalGas); // ensure gas cost is covered
    if (amountToSend.isNegative()) {
      return 'Funds detected, but not enough to cover gas cost';
    }
    const tx = {
      to: layer2WalletAddress,
      value: amountToSend,
      gasPrice: gasPrice,
      gasLimit: gasForTranasction,
    };
    // send all funds from relayer on L2 to contract address
    console.debug(`Funds detected in the L2 Relayer, sweeping funds to: ${tx.to}`);
    await signerL2.sendTransaction(tx);
  }

  return true;
};
