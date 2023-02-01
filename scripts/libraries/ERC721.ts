// import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { ethers } from 'ethers';
import { ERC721Mock } from '../../types/typechain';
import Erc721Abi from '../../abi/contracts/ERC721Mock.sol/ERC721Mock.json';
export const transferToken = async ({
  tokenAddress,
  tokenId,
  to,
  from,
  privateKey,
  rpcUrl,
}: {
  tokenAddress: string;
  tokenId: string;
  from: string;
  to: string;
  //   hre: HardhatRuntimeEnvironment;
  privateKey: string;
  rpcUrl: string;
}) => {
  if (!ethers.utils.isAddress(tokenAddress)) throw new Error('tokenAddress is not address');
  if (!ethers.utils.isAddress(to)) throw new Error('to is not address');
  if (!ethers.utils.isAddress(from)) throw new Error('from is not address');
  const signer = new ethers.Wallet(privateKey, new ethers.providers.JsonRpcProvider(rpcUrl));

  const contract = new ethers.Contract(tokenAddress, Erc721Abi, signer) as ERC721Mock;

  const tx = await contract.connect(signer).transferFrom(from, to, tokenId);
  tx.wait(1);

  if (require.main === module) {
    console.log('Tx hash :', tx.hash);
  }
  return tx?.hash;
};

exports.transferToken = transferToken;
export default { transferToken };
