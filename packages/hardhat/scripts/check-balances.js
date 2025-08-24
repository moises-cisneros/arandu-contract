import { ethers } from "ethers";
import { getProvider } from "../utils/utils.js";
import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";

/**
 * Script simple para verificar balances de wallets de prueba
 */
async function main() {
    console.log(chalk.blue("💰 Wallet Balance Checker"));

    // Verificar que existe el archivo de wallets de prueba
    const walletsPath = path.join(process.cwd(), "wallets", "test-wallets.json");
    if (!fs.existsSync(walletsPath)) {
        console.log(chalk.red("❌ No test wallets found. Run 'yarn wallets -2' first"));
        return;
    }

    const walletsData = JSON.parse(fs.readFileSync(walletsPath, "utf8"));
    console.log(chalk.cyan(`📊 Checking ${walletsData.wallets.length} test wallets`));

    try {
        // Conectar con la red localhost
        const provider = getProvider("localhost");

        console.log(chalk.blue("\n🌐 Localhost Network (Hardhat):"));

        for (let i = 0; i < walletsData.wallets.length; i++) {
            const wallet = walletsData.wallets[i];
            console.log(chalk.yellow(`\n📋 Wallet ${i + 1}:`));
            console.log(`   Address: ${wallet.address}`);

            try {
                const balance = await provider.getBalance(wallet.address);
                const balanceETH = ethers.formatEther(balance);

                if (balance > 0n) {
                    console.log(chalk.green(`   Balance: ${balanceETH} ETH ✅`));
                } else {
                    console.log(chalk.red(`   Balance: ${balanceETH} ETH ❌`));
                }
            } catch (error) {
                console.log(chalk.red(`   Error: ${error.message}`));
            }
        }

        // Mostrar también las cuentas pre-financiadas de Hardhat
        console.log(chalk.blue("\n🎯 Hardhat Pre-funded Accounts:"));
        const hardhatAccounts = [
            "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
            "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
            "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
        ];

        for (let i = 0; i < hardhatAccounts.length; i++) {
            const address = hardhatAccounts[i];
            try {
                const balance = await provider.getBalance(address);
                const balanceETH = ethers.formatEther(balance);
                console.log(`   Account ${i}: ${address} - ${balanceETH} ETH`);
            } catch (error) {
                console.log(`   Account ${i}: Error - ${error.message}`);
            }
        }

    } catch (error) {
        console.error(chalk.red("❌ Error checking balances:"));
        console.error(error);
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
