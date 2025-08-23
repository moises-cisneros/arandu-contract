import { Wallet, formatEther } from "ethers";
import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import { fileURLToPath } from 'url';
import { getProvider } from "../utils/utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates test wallets for development and testing
 */
async function main() {
    console.log(chalk.blue("🎲 Generating test wallets..."));

    // Parse number of wallets to generate
    let numWallets = 2; // default
    const args = process.argv.slice(2);

    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('-')) {
            const num = parseInt(args[i].substring(1));
            if (!isNaN(num) && num > 0) {
                numWallets = num;
                break;
            }
        }
    }

    console.log(chalk.cyan(`📊 Generating ${numWallets} test wallets...`));

    const wallets = [];
    const walletsDir = path.join(__dirname, "../wallets");

    // Create wallets directory if it doesn't exist
    if (!fs.existsSync(walletsDir)) {
        fs.mkdirSync(walletsDir, { recursive: true });
    }

    // Generate wallets
    for (let i = 1; i <= numWallets; i++) {
        const wallet = Wallet.createRandom();

        wallets.push({
            index: i,
            address: wallet.address,
            privateKey: wallet.privateKey,
            mnemonic: wallet.mnemonic?.phrase || "Generated without mnemonic"
        });

        console.log(chalk.green(`✅ Wallet ${i} generated:`));
        console.log(`   Address: ${chalk.white(wallet.address)}`);
        console.log(`   Private Key: ${chalk.red(wallet.privateKey)}`);
        if (wallet.mnemonic?.phrase) {
            console.log(`   Mnemonic: ${chalk.yellow(wallet.mnemonic.phrase)}`);
        }
    }

    // Save wallets to file
    const walletsData = {
        generated: new Date().toISOString(),
        count: numWallets,
        wallets: wallets
    };

    const walletsPath = path.join(walletsDir, "test-wallets.json");
    fs.writeFileSync(walletsPath, JSON.stringify(walletsData, null, 2));

    console.log(chalk.green(`✅ ${numWallets} test wallets generated and saved!`));
    console.log(chalk.cyan("📁 Saved to:"), chalk.white(walletsPath));

    // Show wallet balances across networks
    console.log(chalk.blue("\n💰 Checking wallet balances across networks..."));

    const networks = [
        { name: "sepolia", displayName: "Ethereum Sepolia", symbol: "ETH" },
        { name: "fuji", displayName: "Avalanche Fuji", symbol: "AVAX" },
        { name: "avalanche", displayName: "Avalanche Mainnet", symbol: "AVAX" }
    ];

    for (const network of networks) {
        console.log(chalk.cyan(`\n🌐 ${network.displayName}:`));

        try {
            const provider = getProvider(network.name);

            for (let i = 0; i < wallets.length; i++) {
                const wallet = wallets[i];
                try {
                    const balance = await provider.getBalance(wallet.address);
                    const formattedBalance = formatEther(balance);
                    const balanceColor = parseFloat(formattedBalance) > 0 ? 'green' : 'gray';

                    console.log(`   Wallet ${wallet.index}: ${chalk[balanceColor](formattedBalance)} ${network.symbol}`);
                } catch (error) {
                    console.log(`   Wallet ${wallet.index}: ${chalk.red("Error fetching balance")}`);
                }
            }
        } catch (error) {
            console.log(`   ${chalk.red("Network unavailable:")} ${error.message}`);
        }
    }

    // Create .gitignore entry for wallets if it doesn't exist
    const gitignorePath = path.join(__dirname, "../.gitignore");
    let gitignoreContent = "";

    if (fs.existsSync(gitignorePath)) {
        gitignoreContent = fs.readFileSync(gitignorePath, "utf8");
    }

    if (!gitignoreContent.includes("wallets/")) {
        const newGitignoreContent = gitignoreContent + (gitignoreContent ? "\n" : "") +
            "# Test wallets (contains private keys)\nwallets/\n";
        fs.writeFileSync(gitignorePath, newGitignoreContent);
        console.log(chalk.yellow("📝 Added wallets/ to .gitignore"));
    }

    console.log(chalk.cyan("\n🔗 Next Steps:"));
    console.log(chalk.white("   yarn faucet              ") + chalk.gray("- Fund wallets with testnet tokens"));
    console.log(chalk.white("   yarn account             ") + chalk.gray("- Check deployer wallet"));
    console.log(chalk.white("   yarn deploy --sepolia    ") + chalk.gray("- Deploy to testnet"));

    console.log(chalk.yellow("\n⚠️  Security Notice:"));
    console.log(chalk.red("   • These are TEST wallets only"));
    console.log(chalk.red("   • Never use these private keys on mainnet"));
    console.log(chalk.red("   • The wallets/ directory is added to .gitignore"));
    console.log(chalk.red("   • Keep your real private keys secure"));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});