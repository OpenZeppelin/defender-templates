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
  const { secrets } = autotaskEvent;
  if (secrets === undefined) {
    throw new Error('secrets undefined');
  }

  const arbitrumBridgeAddress = secrets[arbitrumBridgeAddressSecretName];

  // ensure that the arbitrumBridgeAddress exists
  if (arbitrumBridgeAddress === undefined) {
    throw new Error('arbitrum-bridge-address must be defined in config.dev.yml file or Defender->AutoTask->Secrets');
  }

  if (ethers.utils.isAddress(arbitrumBridgeAddress) === false) {
    throw new Error(`Invalid value provided for arbitrum-bridge-address: ${arbitrumBridgeAddress}`);
  }

  // layer2WalletAddress is defined in the serverless.yml file
  // this is the address of the balance we want to monitor (most likely a dao treasury/multisig)
  const layer2WalletAddress = secrets[layer2WalletAddressSecretName];

  // ensure that the layer2WalletAddress exists
  if (layer2WalletAddress === undefined) {
    throw new Error('layer2-wallet-address must be defined in config.dev.yml file or Defender->AutoTask->Secrets');
  }

  if (ethers.utils.isAddress(layer2WalletAddress) === false) {
    throw new Error(`Invalid value provided for layer2-wallet-address: ${layer2WalletAddress}`);
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
  let threshold = secrets[thresholdSecretName];

  // ensure that the threshold exists
  if (threshold === undefined) {
    throw new Error('threshold must be defined in .secret/<stage>.yml file or Defender->AutoTask->Secrets');
  } else {
    // if threshold is defined, we can safely convert it to a BigNumber
    threshold = ethers.BigNumber.from(threshold);
  }

  let amount = secrets[amountSecretName];

  // ensure that the amount exists
  if (amount === undefined) {
    throw new Error('amount must be defined in config.dev.yml file or Defender->AutoTask->Secrets');
  } else {
    // if amount is defined, we can safely convert it to a BigNumber
    amount = ethers.BigNumber.from(amount);
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

  // bridge funds if below threshold
  if (layer2WalletBalance.lt(threshold)) {
    console.debug('Bridging funds to Arbitrum');
    const layer1RelayerAddress = await signerL1.getAddress();
    const layer1RelayerBalance = await providerL1.getBalance(layer1RelayerAddress);
    // calculate allowance for gas costs
    // depositEth() consumes about 92,000 units of gas, using 100,000 units as a conservative estimate
    const gasPrice = await providerL1.getGasPrice();
    const transactionGasUnits = ethers.BigNumber.from('100000');
    const totalGas = gasPrice.mul(transactionGasUnits);
    const fundsNeededToSend = amount.add(totalGas);

    if (layer1RelayerBalance.lt(fundsNeededToSend)) {
      throw new Error('L1 Relayer balance is too low to bridge specified amount, please load funds');
    } else {
      // maxSubmissionCost set to .001 ether as first parameter
      const maxSubmissionCost = ethers.utils.parseUnits('0.001', 'ether');
      await bridgeContract.depositEth(maxSubmissionCost, { value: amount });
    }
  }

  /* 
    Automatically sweep funds from the L2 Relayer to the target L2 wallet address.
    Note that the sweeping is expected to happen in a different transaction than the initial bridging/transfer.
    It takes ~10 minutes for the initial bridge transfer from L1 EOA -> L2 EOA to confirm, 
    so we must run this Autotask again to execute the sweep functionality.
  */

  // get balance of Relayer - returns ethers.BigNumber
  const relayerBalance = await providerL2.getBalance(layer2RelayerAddress);

  if (relayerBalance.gt(0)) {
    // calculate allowance for gas costs
    // total amount of eth required to send a transaction = (gasLimit * gasPrice) + value
    // Ether transfer consumes ~21,000 uints of gas, using 200,000 units as a conservative estimate
    const gasPrice = await providerL2.getGasPrice();
    const transactionGasUnits = ethers.BigNumber.from('200000');
    const totalGas = gasPrice.mul(transactionGasUnits);
    const amountToSend = relayerBalance.sub(totalGas);
    if (amountToSend.isNegative()) {
      return 'Funds detected on L2 Relayer, but not enough to cover gas cost';
    }
    const tx = {
      to: layer2WalletAddress,
      value: amountToSend,
      gasPrice: gasPrice,
      gasLimit: transactionGasUnits,
    };
    // send all funds from relayer on L2 to contract address
    console.debug(`Funds detected in the L2 Relayer, sweeping funds to: ${tx.to}`);
    await signerL2.sendTransaction(tx);
  }

  return true;
};
