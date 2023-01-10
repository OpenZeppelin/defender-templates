const networkConfig = {
  default: {
    name: "hardhat",
  },
  31337: {
    name: "localhost",
    proxyAddress: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  },
  5: {
    name: "goerli",
    proxyAddress: "0xC6c4FA835d705D596ec01Ac06FCDE089a5F282dc",
  },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
  networkConfig,
  developmentChains,
};
