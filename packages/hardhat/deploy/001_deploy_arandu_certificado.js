import { ethers } from "hardhat";

/**
 * Hardhat Deploy script for AranduCertificado contract
 * This script is automatically called by hardhat-deploy
 */
const deployAranduCertificado = async (hre) => {
    const { getNamedAccounts, deployments } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    console.log("🚀 Deploying AranduCertificado contract...");
    console.log("📋 Deployer:", deployer);

    // Deploy the main contract
    const aranduCertificado = await deploy("AranduCertificado", {
        from: deployer,
        args: [], // Add constructor arguments here if needed
        log: true,
        waitConfirmations: hre.network.live ? 5 : 1, // Wait for confirmations on live networks
    });

    console.log("✅ AranduCertificado deployed to:", aranduCertificado.address);

    // Deploy a test ERC20 token for development/testing
    if (hre.network.name !== "avalanche") { // Don't deploy test tokens on mainnet
        const testToken = await deploy("SimpleERC20", {
            from: deployer,
            args: [
                "Test Token", // name
                "TEST",       // symbol
                ethers.parseEther("1000000"), // initial supply (1M tokens)
                ethers.parseEther("100")      // faucet amount (100 tokens per claim)
            ],
            log: true,
            waitConfirmations: hre.network.live ? 5 : 1,
        });

        console.log("✅ Test ERC20 deployed to:", testToken.address);
    }

    // Verify contracts on live networks
    if (hre.network.live && process.env.ETHERSCAN_V2_API_KEY) {
        console.log("🔍 Verifying contracts on explorer...");

        try {
            await hre.run("verify:verify", {
                address: aranduCertificado.address,
                constructorArguments: [],
            });
            console.log("✅ AranduCertificado verified");
        } catch (error) {
            console.log("❌ Verification failed:", error.message);
        }

        // Verify test token if deployed
        if (hre.network.name !== "avalanche") {
            try {
                await hre.run("verify:verify", {
                    address: testToken.address,
                    constructorArguments: [
                        "Test Token",
                        "TEST",
                        ethers.parseEther("1000000"),
                        ethers.parseEther("100")
                    ],
                });
                console.log("✅ Test ERC20 verified");
            } catch (error) {
                console.log("❌ Test token verification failed:", error.message);
            }
        }
    }

    // Post-deployment setup
    console.log("🔧 Running post-deployment setup...");

    // Get contract instance
    const contract = await ethers.getContractAt("AranduCertificado", aranduCertificado.address);

    // Example: Set up initial configuration
    // await contract.setInitialConfig(...);

    console.log("✅ Post-deployment setup completed");

    // Log deployment summary
    console.log("\n📋 Deployment Summary:");
    console.log("├── Network:", hre.network.name);
    console.log("├── Chain ID:", hre.network.config.chainId);
    console.log("├── Deployer:", deployer);
    console.log("├── AranduCertificado:", aranduCertificado.address);
    if (hre.network.name !== "avalanche") {
        console.log("├── Test ERC20:", testToken.address);
    }
    console.log("└── Gas used: Check transaction receipts");

    // Return deployment info for further processing
    return {
        aranduCertificado,
        testToken: hre.network.name !== "avalanche" ? testToken : null
    };
};

// Tags for selective deployment
deployAranduCertificado.tags = ["AranduCertificado", "main"];

// Dependencies (if any)
deployAranduCertificado.dependencies = [];

export default deployAranduCertificado;