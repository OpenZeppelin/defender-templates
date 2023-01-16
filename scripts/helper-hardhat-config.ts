type NetworkConfigItem = {
  name: string;
  proxyAddress: string;
  blockConfirmations: number;
};

type NetworkConfigMap = {
  [chainId: string]: NetworkConfigItem;
};

export const networkConfig: NetworkConfigMap = {
  default: {
    name: "hardhat",
    proxyAddress: "",
    blockConfirmations: 1,
  },
  31337: {
    name: "localhost",
    proxyAddress: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    blockConfirmations: 1,
  },
  5: {
    name: "goerli",
    proxyAddress: "0xC6c4FA835d705D596ec01Ac06FCDE089a5F282dc",
    blockConfirmations: 5,
  },
};

export const developmentChains = ["hardhat", "localhost"];
