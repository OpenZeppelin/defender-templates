const { ethers, upgrades, network } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
const { verify } = require("../verify");

/**
 * Deploys MyUpradableToken to the selected network
 * using OZ upgradables plugin
 */
async function main() {
    const Token = await ethers.getContractFactory("MyUpgradableToken");
    const blockConfirmations = network.config.blockConfirmations || 1;
    console.log(`Will wait for ${blockConfirmations} blocks`);

    console.log("Deploying MyUpgradableToken...");
    const token = await upgrades.deployProxy(Token, []);
    // In public networks we need to wait in order to be able to verify the contract
    await token.deployTransaction.wait(blockConfirmations);
    console.log("MyUpgradableToken deployed to:", token.address);

    // Verify if running on public network
    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY
    ) {
        console.log("Verifying contract...");
        await verify(token.address, [], "MyUpgradableToken");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
