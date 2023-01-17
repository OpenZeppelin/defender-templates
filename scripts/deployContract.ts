import { HardhatRuntimeEnvironment } from 'hardhat/types';
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

  const cArgs: any[] =
    constructorArgs && constructorArgs?.length > 0 ?  constructorArgs.slice(1, constructorArgs.length)  : [];

  console.log('deploying with args', cArgs);

  const contract = await Contract.deploy(... cArgs);

  await contract.deployed();
  if (require.main === module) {
    console.log('Deploy ', contractName, ' hash:', contract.deployTransaction.hash);
  }
  return contract.address;
};

exports.deploy = deploy;
export default { deploy };