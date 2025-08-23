import { ethers, formatEther, formatUnits } from "ethers";
import { getWallet, getProvider, connectWalletToNetwork, loadDeploymentData } from "../utils/utils.js";
import chalk from "chalk";
import input from "@inquirer/input";
import confirm from "@inquirer/confirm";
import * as fs from "fs";
import * as path from "path";

/**
 * Faucet script to fund test wallets and interact with deployed faucet contracts
 */
async function main() {
    console.log(chalk.blue("🚰 Token Faucet Script"));

    // Check if test wallets exist
    const walletsPath = path.join(process.cwd(), "wallets", "test-wallets.json");
    if (!fs.existsSync(walletsPath)) {
        console.log(chalk.red("❌ No test wallets found. Run 'yarn wallets -2' first"));
        return;
    }

    const walletsData = JSON.parse(fs.readFileSync(walletsPath, "utf8"));
    console.log(chalk.cyan(`📊 Found ${walletsData.wallets.length} test wallets`));

    // Ask user which wallet to use
    const walletNumber = await input({
        message: "Which wallet number to use for faucet claim? (1-" + walletsData.wallets.length + "):",
        default: "1",
        validate: (input) => {
            const num = parseInt(input);
            if (isNaN(num) || num < 1 || num > walletsData.wallets.length) {
                return `Please enter a number between 1 and ${walletsData.wallets.length}`;
            }
            return true;
        }
    });

    // Ask for network
    const network = await input({
        message: "Which network? (sepolia/fuji/localhost):",
        default: "sepolia",
        validate: (input) => {
            if (!['sepolia', 'fuji', 'localhost'].includes(input.toLowerCase())) {
                return "Please enter: sepolia, fuji, or localhost";
            }
            return true;
        }
    });

    const networkName = network.toLowerCase();
    const walletNum = parseInt(walletNumber);

    try {
        console.log(chalk.yellow("🔧 Setting up wallet and network connection..."));

        // Get the wallet
        const wallet = await getWallet(walletNum);
        const connectedWallet = connectWalletToNetwork(wallet, networkName);
        const userAddress = await connectedWallet.getAddress();

        console.log(chalk.green("✅ Wallet connected successfully!"));
        console.log(chalk.cyan("📋 Wallet Details:"));
        console.log(`   Wallet #${walletNum}: ${chalk.white(userAddress)}`);
        console.log(`   Network: ${chalk.white(networkName)}`);

        // Check native token balance first
        const provider = getProvider(networkName);
        const balance = await provider.getBalance(userAddress);
        const formattedBalance = formatEther(balance);
        const symbol = networkName === 'sepolia' ? 'ETH' : 'AVAX';

        console.log(chalk.cyan(`💰 Current ${symbol} balance: ${chalk.white(formattedBalance)} ${symbol}`));

        // If using localhost or no deployment exists, show native faucet options
        let deploymentData = null;
        try {
            deploymentData = loadDeploymentData(networkName);
        } catch (error) {
            console.log(chalk.yellow("⚠️  No deployment data found for this network"));
        }

        if (!deploymentData || networkName === 'localhost') {
            console.log(chalk.blue("\n🌐 Native Token Faucets:"));

            if (networkName === 'sepolia') {
                console.log(chalk.cyan("   Ethereum Sepolia Faucets:"));
                console.log(chalk.white("   • https://sepoliafaucet.com/"));
                console.log(chalk.white("   • https://www.alchemy.com/faucets/ethereum-sepolia"));
                console.log(chalk.white("   • https://faucet.quicknode.com/ethereum/sepolia"));
            } else if (networkName === 'fuji') {
                console.log(chalk.cyan("   Avalanche Fuji Faucet:"));
                console.log(chalk.white("   • https://faucet.avax.network/"));
                console.log(chalk.white("   • Get 2 AVAX every 24 hours"));
            } else if (networkName === 'localhost') {
                console.log(chalk.cyan("   Local Network:"));
                console.log(chalk.white("   • Your local node should have pre-funded accounts"));
                console.log(chalk.white("   • Check hardhat.config.js for default accounts"));
            }

            const openFaucet = await confirm({
                message: "Would you like to copy the wallet address to clipboard for manual faucet use?",
                default: true
            });

            if (openFaucet) {
                console.log(chalk.green("📋 Wallet address copied to clipboard (manually copy from above):"));
                console.log(chalk.white(userAddress));
            }

            return;
        }

        // If we have deployment data, try to interact with deployed faucet contracts
        console.log(chalk.blue("\n🚰 Checking deployed faucet contracts..."));

        if (deploymentData.contracts) {
            const contracts = Object.entries(deploymentData.contracts);

            for (const [contractName, contractAddress] of contracts) {
                if (contractName.toLowerCase().includes('faucet') ||
                    contractName.toLowerCase().includes('testerc20') ||
                    contractName.toLowerCase().includes('token')) {

                    console.log(chalk.cyan(`\n🎯 Found potential faucet contract: ${contractName}`));
                    console.log(`   Address: ${chalk.white(contractAddress)}`);

                    try {
                        await handleFaucetContract(connectedWallet, contractAddress, contractName);
                    } catch (error) {
                        console.log(chalk.red(`❌ Error with ${contractName}:`), error.message);
                        continue;
                    }
                }
            }
        }

        console.log(chalk.green("\n✅ Faucet operations completed!"));

    } catch (error) {
        console.error(chalk.red("❌ Error during faucet operations:"));
        console.error(error);
        process.exitCode = 1;
    }
}

/**
 * Handle interaction with a faucet contract
 */
async function handleFaucetContract(wallet, contractAddress, contractName) {
    console.log(chalk.yellow(`🔍 Analyzing ${contractName}...`));

    try {
        // Try to connect as a generic ERC20 with faucet functionality
        const contract = await ethers.getContractAt("SimpleERC20", contractAddress, wallet);
        const userAddress = await wallet.getAddress();

        // Get token details
        const name = await contract.name();
        const symbol = await contract.symbol();
        const decimals = await contract.decimals();

        console.log(chalk.cyan("📋 Token Details:"));
        console.log(`   Name: ${name}`);
        console.log(`   Symbol: ${symbol}`);
        console.log(`   Decimals: ${decimals.toString()}`);

        // Check if it has faucet functionality
        try {
            const faucetAmount = await contract.FAUCET_AMOUNT();
            console.log(`   Faucet Amount: ${formatUnits(faucetAmount, decimals)} ${symbol}`);

            // Check current balance
            const currentBalance = await contract.balanceOf(userAddress);
            console.log(`💰 Current ${symbol} balance: ${formatUnits(currentBalance, decimals)} ${symbol}`);

            // Check if user can claim
            const canClaim = await contract.canClaimFromFaucet(userAddress);
            console.log(`🚰 Can claim from faucet: ${canClaim ? chalk.green('Yes') : chalk.red('No')}`);

            if (!canClaim) {
                try {
                    const nextClaimTime = await contract.getNextFaucetClaimTime(userAddress);
                    const now = Math.floor(Date.now() / 1000);
                    const waitTime = Number(nextClaimTime) - now;

                    if (waitTime > 0) {
                        const hours = Math.floor(waitTime / 3600);
                        const minutes = Math.floor((waitTime % 3600) / 60);
                        console.log(chalk.yellow(`⏰ Next claim available in: ${hours}h ${minutes}m`));
                    }
                } catch (error) {
                    console.log(chalk.gray("ℹ️  Could not get next claim time"));
                }
            }

            if (canClaim) {
                const shouldClaim = await confirm({
                    message: `Claim ${formatUnits(faucetAmount, decimals)} ${symbol} tokens?`,
                    default: true
                });

                if (shouldClaim) {
                    console.log(chalk.yellow("🚰 Claiming tokens from faucet..."));

                    const claimTx = await contract.claimFromFaucet();
                    console.log(`📝 Transaction sent: ${chalk.blue(claimTx.hash)}`);

                    const receipt = await claimTx.wait();
                    console.log(`✅ Transaction confirmed in block: ${receipt?.blockNumber}`);

                    // Check new balance
                    const newBalance = await contract.balanceOf(userAddress);
                    const received = newBalance - currentBalance;

                    console.log(chalk.green("🎉 Faucet claim successful!"));
                    console.log(`💰 Previous balance: ${formatUnits(currentBalance, decimals)} ${symbol}`);
                    console.log(`💰 New balance: ${formatUnits(newBalance, decimals)} ${symbol}`);
                    console.log(`🎁 Tokens received: ${formatUnits(received, decimals)} ${symbol}`);
                }
            }

        } catch (error) {
            if (error.message.includes("FAUCET_AMOUNT")) {
                console.log(chalk.gray("ℹ️  This contract doesn't appear to have faucet functionality"));
            } else {
                throw error;
            }
        }

    } catch (error) {
        if (error.message.includes("SimpleERC20")) {
            console.log(chalk.gray("ℹ️  Could not connect as SimpleERC20 contract"));
        } else {
            throw error;
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});