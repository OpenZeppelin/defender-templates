require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-etherscan");

require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  // networks: {
  //   goerli: {
  //     url: process.env.GOERLI_JSON_RPC_URL,
  //     from: process.env.GOERLI_REPLAY_ADDRESS,
  //     // accounts: [process.env.GOERLI_PRIVATE_KEY],
  //   },
  // },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
