const { ethers, upgrades, network } = require("hardhat");
const { networkConfig } = require("./helper-hardhat-config");

/**
 * Upgrades MyUpgradableToken to V2 verion.
 * Upgrading emits the Upgraded() event, which should trigger
 * Defender Sentinel if it's running on the same network.
 */
async function main() {
    console.log("Upgrading UpgradableToken contract...");
    const { proxyAddress } = networkConfig[network.config.chainId];
    const TokenV2 = await ethers.getContractFactory("MyUpgradableTokenV2");
    await upgrades.upgradeProxy(proxyAddress, TokenV2);
    console.log("Token upgraded!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
