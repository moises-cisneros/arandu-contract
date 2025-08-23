import * as dotenv from "dotenv";
dotenv.config();
import { Wallet } from "ethers";
import password from "@inquirer/password";
import { spawn } from "child_process";
import { config } from "hardhat";
import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main deployment script that handles wallet decryption and network deployment
 */
async function main() {
    console.log(chalk.blue("🚀 Starting deployment process..."));

    // Parse network argument
    const networkIndex = process.argv.indexOf("--network");
    const networkName = networkIndex !== -1 ? process.argv[networkIndex + 1] : config.defaultNetwork;

    console.log(chalk.cyan(`📡 Target Network: ${networkName}`));

    // Handle localhost/hardhat deployment (no encryption needed)
    if (networkName === "localhost" || networkName === "hardhat") {
        console.log(chalk.yellow("🏠 Deploying to local network..."));
        await runHardhatDeploy(process.argv.slice(2));
        return;
    }

    // Check for encrypted deployer key
    const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;

    if (!encryptedKey) {
        console.log(chalk.red("🚫 You don't have a deployer account configured."));
        console.log(chalk.yellow("💡 Run 'yarn generate' to create a new wallet"));
        console.log(chalk.yellow("💡 Or run 'yarn account' to check your current setup"));
        return;
    }

    // Decrypt the private key
    const pass = await password({
        message: "Enter password to decrypt deployer private key:"
    });

    try {
        console.log(chalk.yellow("🔓 Decrypting wallet..."));
        const wallet = await Wallet.fromEncryptedJson(encryptedKey, pass);

        console.log(chalk.green("✅ Wallet decrypted successfully!"));
        console.log(chalk.cyan("📋 Deployer:"), chalk.white(wallet.address));

        // Set the runtime private key for hardhat
        process.env.__RUNTIME_DEPLOYER_PRIVATE_KEY = wallet.privateKey;

        // Run deployment process
        await runDeploymentProcess(networkName);

    } catch (error) {
        if (error.message && error.message.includes("invalid password")) {
            console.error(chalk.red("❌ Invalid password. Please try again."));
        } else {
            console.error(chalk.red("❌ Failed to decrypt private key:"), error.message);
        }
        process.exit(1);
    }
}

/**
 * Run the complete deployment process
 */
async function runDeploymentProcess(networkName) {
    try {
        // Step 1: Compile contracts
        console.log(chalk.yellow("🔨 Step 1: Compiling contracts..."));
        await runCommand("hardhat", ["compile"]);
        console.log(chalk.green("✅ Contracts compiled successfully!"));

        // Step 2: Deploy contracts
        console.log(chalk.yellow(`🌐 Step 2: Deploying to ${networkName}...`));
        await runHardhatDeploy(process.argv.slice(2));

        // Step 3: Generate ABIs
        console.log(chalk.yellow("📋 Step 3: Generating ABIs for frontend..."));
        await runCommand("node", ["scripts/generateABIs.js", networkName]);

        // Step 4: Post-deployment summary
        await showDeploymentSummary(networkName);

        console.log(chalk.green(`\n🎉 Complete deployment to ${networkName} finished successfully!`));

    } catch (error) {
        console.error(chalk.red("❌ Deployment process failed:"), error.message);
        process.exit(1);
    }
}

/**
 * Run hardhat deploy command
 */
async function runHardhatDeploy(args) {
    return new Promise((resolve, reject) => {
        const hardhat = spawn("hardhat", ["deploy", ...args], {
            stdio: "inherit",
            env: process.env,
            shell: process.platform === "win32",
        });

        hardhat.on("exit", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Hardhat deploy exited with code ${code}`));
            }
        });

        hardhat.on("error", reject);
    });
}

/**
 * Run a generic command
 */
async function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        const process = spawn(command, args, {
            stdio: "inherit",
            env: process.env,
            shell: process.platform === "win32",
            cwd: __dirname
        });

        process.on("exit", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`${command} exited with code ${code}`));
            }
        });

        process.on("error", reject);
    });
}

/**
 * Show deployment summary
 */
async function showDeploymentSummary(networkName) {
    try {
        const deploymentsPath = path.join(__dirname, `../deployments/${networkName}`);

        if (!fs.existsSync(deploymentsPath)) {
            console.log(chalk.yellow("⚠️  No deployment files found for summary"));
            return;
        }

        const deploymentFiles = fs.readdirSync(deploymentsPath)
            .filter(file => file.endsWith('.json') && !file.includes('latest-') && !file.includes('deployment'));

        console.log(chalk.blue("\n📋 Deployment Summary:"));
        console.log(chalk.cyan("├── Network:"), chalk.white(networkName));
        console.log(chalk.cyan("├── Chain ID:"), chalk.white(getChainId(networkName)));
        console.log(chalk.cyan("├── Timestamp:"), chalk.white(new Date().toISOString()));

        if (deploymentFiles.length > 0) {
            console.log(chalk.cyan("├── Deployed Contracts:"));

            for (let i = 0; i < deploymentFiles.length; i++) {
                const file = deploymentFiles[i];
                const contractName = path.parse(file).name;
                const isLast = i === deploymentFiles.length - 1;

                try {
                    const deploymentData = JSON.parse(fs.readFileSync(path.join(deploymentsPath, file), "utf8"));
                    const prefix = isLast ? "└──" : "├──";
                    console.log(chalk.cyan(`│   ${prefix} ${contractName}:`), chalk.white(deploymentData.address));
                } catch (error) {
                    const prefix = isLast ? "└──" : "├──";
                    console.log(chalk.cyan(`│   ${prefix} ${contractName}:`), chalk.red("Error reading deployment"));
                }
            }
        }

        console.log(chalk.cyan("└── Status:"), chalk.green("✅ Success"));

        // Show next steps
        console.log(chalk.yellow("\n💡 Next steps:"));
        console.log(chalk.white("   1. Verify contracts: Run verification commands"));
        console.log(chalk.white("   2. Test deployment: yarn faucet"));
        console.log(chalk.white("   3. Update frontend: Check contracts/ directory"));
        console.log(chalk.white(`   4. Explorer: ${getBlockExplorer(networkName)}`));

    } catch (error) {
        console.log(chalk.yellow("⚠️  Could not generate deployment summary:", error.message));
    }
}

/**
 * Get chain ID for network
 */
function getChainId(networkName) {
    const chainIds = {
        localhost: 31337,
        hardhat: 31337,
        sepolia: 11155111,
        fuji: 43113,
        avalanche: 43114
    };
    return chainIds[networkName] || 31337;
}

/**
 * Get block explorer URL for network
 */
function getBlockExplorer(networkName) {
    const explorers = {
        localhost: "http://localhost:8545",
        hardhat: "http://localhost:8545",
        sepolia: "https://sepolia.etherscan.io",
        fuji: "https://testnet.snowtrace.io",
        avalanche: "https://snowtrace.io"
    };
    return explorers[networkName] || "";
}

main().catch(console.error);