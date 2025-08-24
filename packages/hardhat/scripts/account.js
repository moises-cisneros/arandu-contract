const dotenv = require("dotenv");
dotenv.config();
const { Wallet, providers, utils } = require("ethers");
const password = require("@inquirer/password").default;
const chalk = require("chalk");

/**
 * Shows the deployer account information and balances across networks
 */
async function main() {
    console.log(chalk.blue("👤 Checking deployer account..."));

    const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;

    if (!encryptedKey) {
        console.log(chalk.red("🚫 You don't have a deployer account configured."));
        console.log(chalk.yellow("💡 Run 'yarn generate' to create a new wallet"));
        return;
    }

    try {
        const pass = await password({
            message: "Enter password to decrypt your wallet:"
        });

        console.log(chalk.yellow("🔓 Decrypting wallet..."));
        const wallet = await Wallet.fromEncryptedJson(encryptedKey, pass);

        console.log(chalk.green("✅ Wallet decrypted successfully!"));
        console.log(chalk.cyan("📋 Wallet Information:"));
        console.log(`   Address: ${chalk.white(wallet.address)}`);
        console.log(`   Private Key: ${chalk.red(wallet.privateKey)} ${chalk.yellow("(Keep this secret!)")}`);

        // Network configurations
        const networks = [
            {
                name: "Ethereum Sepolia (Testnet)",
                rpcUrl: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
                symbol: "ETH",
                explorer: `https://sepolia.etherscan.io/address/${wallet.address}`
            },
            {
                name: "Avalanche Fuji (Testnet)",
                rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
                symbol: "AVAX",
                explorer: `https://testnet.snowtrace.io/address/${wallet.address}`
            },
            {
                name: "Avalanche Mainnet",
                rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
                symbol: "AVAX",
                explorer: `https://snowtrace.io/address/${wallet.address}`
            }
        ];

        console.log(chalk.cyan("\n💰 Network Balances:"));

        for (const network of networks) {
            try {
                if (network.name.includes("Sepolia") && !process.env.ALCHEMY_API_KEY) {
                    console.log(`   ${network.name}: ${chalk.yellow("Skipped (no ALCHEMY_API_KEY)")}`);
                    continue;
                }

                const provider = new providers.JsonRpcProvider(network.rpcUrl);
                const balance = await provider.getBalance(wallet.address);
                const formattedBalance = utils.formatEther(balance);

                const balanceColor = parseFloat(formattedBalance) > 0 ? 'green' : 'red';
                console.log(`   ${network.name}: ${chalk[balanceColor](formattedBalance)} ${network.symbol}`);
                console.log(`   Explorer: ${chalk.blue(network.explorer)}`);

            } catch (error) {
                console.log(`   ${network.name}: ${chalk.red("Error fetching balance")}`);
                console.log(`   ${chalk.gray("Error:")} ${error.message}`);
            }
        }

        console.log(chalk.cyan("\n🔗 Useful Commands:"));
        console.log(chalk.white("   yarn deploy --sepolia    ") + chalk.gray("- Deploy to Ethereum Sepolia"));
        console.log(chalk.white("   yarn deploy --fuji       ") + chalk.gray("- Deploy to Avalanche Fuji"));
        console.log(chalk.white("   yarn deploy --avalanche  ") + chalk.gray("- Deploy to Avalanche Mainnet"));
        console.log(chalk.white("   yarn faucet              ") + chalk.gray("- Get testnet tokens"));

        if (networks.some(n => {
            // Check if any testnet balance is low (less than 0.01)
            return n.name.includes("Testnet") && parseFloat(utils.formatEther(0)) < 0.01;
        })) {
            console.log(chalk.yellow("\n⚠️  Your testnet balances are low. Consider using faucets:"));
            console.log(chalk.blue("   Sepolia ETH: https://sepoliafaucet.com/"));
            console.log(chalk.blue("   Fuji AVAX: https://faucet.avax.network/"));
        }

    } catch (error) {
        if (error.message.includes("invalid password")) {
            console.error(chalk.red("❌ Invalid password"));
        } else {
            console.error(chalk.red("❌ Error:"), error.message);
        }
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});