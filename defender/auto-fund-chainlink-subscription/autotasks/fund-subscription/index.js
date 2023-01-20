import { ethers } from 'ethers';
import { DefenderRelaySigner, DefenderRelayProvider } from 'defender-relay-client/lib/ethers';
import {
  vrfCoordinatorAddress,
  subscriptionId,
  linkAddress,
  wethAddress,
  fundAmount,
} from '../../subscription-config.dev.yml';
import { FeeAmount } from '@uniswap/v3-sdk';
import Quoter from '@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json';
import Router from '@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json';
import linkAbi from '../../abis/Link.json';
import vrfCoordinatorAbi from '../../abis/vrfCoordinator.json';
import erc20Abi from '../../abis/erc20.json';

//These are the same across all networks - https://docs.uniswap.org/contracts/v3/reference/deployments
const quoterAddress = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';
const swapRouterAddress = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

export async function handler(event) {
  const provider = new DefenderRelayProvider(event);
  const signer = new DefenderRelaySigner(event, provider, { speed: 'fast' });
  const fundAmountInWei = ethers.utils.parseEther(fundAmount);
  const signerAddress = await signer.getAddress();

  // Do a quote for LINK->WETH to calculate amount of ETH we need to send to get approximately fundAmount of LINK
  const weiNeeded = await getOutputQuote(linkAddress, wethAddress, fundAmountInWei, FeeAmount.MEDIUM, provider);
  console.log(
    `In order to get approximately ${fundAmount} of LINK you will need ${ethers.utils.formatEther(weiNeeded)} ETH`,
  );

  // Do the actual swap WETH->LINK. We send ETH with the tx to avoid wrapping first - the router does that for us.
  const swapRouterContract = new ethers.Contract(swapRouterAddress, Router.abi, signer);
  const params = {
    tokenIn: wethAddress,
    tokenOut: linkAddress,
    fee: FeeAmount.MEDIUM,
    recipient: signerAddress,
    deadline: Math.floor(Date.now() / 1000) + 60 * 1, // 1 minutes from the current Unix time
    amountIn: weiNeeded,
    amountOutMinimum: fundAmountInWei.sub(fundAmountInWei.div(10)), // Ensures we don't get less than 90% our expected fundAmount
    sqrtPriceLimitX96: 0, // Ensures we swap our exact input amount. We don't need to worry about our swap pushing the pool price
  };

  console.log(`Swapping ${ethers.utils.formatEther(weiNeeded)} ETH for LINK on UniswapV3`);
  const swapTx = await swapRouterContract.exactInputSingle(params, { value: weiNeeded }); // we need to send wei with it
  const swapReceipt = await swapTx.wait(1);

  // We grab the amount out from the transaction receipt
  const erc20iface = new ethers.utils.Interface(erc20Abi);
  const matchingEvent = swapReceipt.logs.find(log => {
    const parsedLog = erc20iface.parseLog(log, 'Transfer');
    if (parsedLog != null && parsedLog.args.to.toLowerCase() == signerAddress.toLowerCase()) {
      return parsedLog;
    }
  });
  if (!matchingEvent) {
    throw new Error('Cannot parse swap logs');
  }
  const swapAmountOut = erc20iface.parseLog(matchingEvent, 'Transfer').args.value;
  console.log(`Swap completed. You received ${ethers.utils.formatEther(swapAmountOut)} LINK from the swap`);

  // fund subscription by calling link transferAndCall() on LINK token
  const linkContract = new ethers.Contract(linkAddress, linkAbi, signer);
  const vrfCoordinator = new ethers.Contract(vrfCoordinatorAddress, vrfCoordinatorAbi, signer);
  const encoder = ethers.utils.defaultAbiCoder;
  const subscriptionIdEncoded = encoder.encode(['uint256'], [subscriptionId]);

  let { balance } = await vrfCoordinator.getSubscription(subscriptionId);
  console.log(`Subscription balance before funding: ${ethers.utils.formatEther(balance)}`);

  console.log(`Funding with ${ethers.utils.formatEther(swapAmountOut)} LINK...`);
  const tx = await linkContract.transferAndCall(vrfCoordinatorAddress, swapAmountOut, subscriptionIdEncoded);
  await tx.wait(1);

  ({ balance } = await vrfCoordinator.getSubscription(subscriptionId));
  console.log(`Subscription Funded. Balance after funding: ${ethers.utils.formatEther(balance)}`);
}

const getOutputQuote = async (tokenInAddress, tokenOutAddress, amountInWei, fee, provider) => {
  const quoterContract = new ethers.Contract(quoterAddress, Quoter.abi, provider);
  const quotedAmountOut = await quoterContract.callStatic.quoteExactInputSingle(
    tokenInAddress,
    tokenOutAddress,
    fee,
    amountInWei,
    0,
  );
  return quotedAmountOut;
};

// To run locally (this code will not be executed in Autotasks)
if (require.main === module) {
  require('dotenv').config();
  const { API_KEY: apiKey, API_SECRET: apiSecret } = process.env;
  handler({ apiKey, apiSecret })
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}
