// import { ethers } from "ethers";
import { ethers } from "hardhat";
import { Wallet, BigNumber } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export function getInterfaceID(contractInterface: any) {
  let interfaceID: BigNumber = ethers.constants.Zero;
  const functions: string[] = Object.keys(contractInterface.functions);
  for (let i = 0; i < functions.length; i++) {
    interfaceID = interfaceID.xor(contractInterface.getSighash(functions[i]));
  }

  return interfaceID;
}

export async function transferOwnership(
  signer: Wallet | SignerWithAddress,
  newOwner: string,
  contractAddress: string
) {
  const ownable = await ethers.getContractAt(
    "Ownable",
    contractAddress
  );
  const tx = await ownable
    .connect(signer)
    .transferOwnership(newOwner);

  const receipt = await tx.wait();
  if (!receipt.status) {
    throw Error(`Transfer ownership failed: ${tx.hash}`);
  }
  else {
    console.log(`Transfer ownership succeeded: ${tx.hash}`)
  }
}