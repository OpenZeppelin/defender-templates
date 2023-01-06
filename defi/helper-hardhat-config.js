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
        proxyAddress: "0x2afECEC517eFFA181Bd38c6FEC5582a9D692c264",
    },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
    networkConfig,
    developmentChains,
};
