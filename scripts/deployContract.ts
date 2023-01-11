import { HardhatRuntimeEnvironment } from "hardhat/types";
export const deploy = async ({
  contractName,
  constructorArgs,
  hre,
}: {
  contractName: string;
  constructorArgs?: any[];
  hre: HardhatRuntimeEnvironment;
}) => {
  const Contract = await hre.ethers.getContractFactory(contractName);

  console.log(
    "deploying with args",
    constructorArgs && constructorArgs.length > 0
      ? { ...constructorArgs.slice(1, constructorArgs.length) }
      : ""
  );

  const contract = await Contract.deploy(
    constructorArgs && constructorArgs?.length > 0
      ? { ...constructorArgs.slice(1, constructorArgs.length) }
      : null
  );

  await contract.deployed();
  if (require.main === module) {
    console.log(
      "Deploy ",
      contractName,
      " hash:",
      contract.deployTransaction.hash
    );
  }
  return contract.address;
};


exports.deploy = deploy;
export default { deploy };
