import { ethers } from "ethers";
import { getWallet, getProvider, connectWalletToNetwork } from "../utils/utils.js";
import chalk from "chalk";
import * as fs from "fs";
import * as path from "path";

/**
 * Script para transferir ETH de las cuentas pre-financiadas de Hardhat 
 * a las wallets de prueba generadas
 */
async function main() {
    console.log(chalk.blue("💸 ETH Transfer Script - Funding Test Wallets"));

    // Verificar que existe el archivo de wallets de prueba
    const walletsPath = path.join(process.cwd(), "wallets", "test-wallets.json");
    if (!fs.existsSync(walletsPath)) {
        console.log(chalk.red("❌ No test wallets found. Run 'yarn wallets -2' first"));
        return;
    }

    const walletsData = JSON.parse(fs.readFileSync(walletsPath, "utf8"));
    console.log(chalk.cyan(`📊 Found ${walletsData.wallets.length} test wallets`));

    try {
        // Conectar con la red localhost
        const provider = getProvider("localhost");

        // Usar la primera cuenta pre-financiada de Hardhat como financiador
        const funderPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
        const funderWallet = new ethers.Wallet(funderPrivateKey, provider);

        console.log(chalk.green("💰 Financiador configurado:"));
        console.log(`   Dirección: ${await funderWallet.getAddress()}`);

        const funderBalance = await provider.getBalance(funderWallet.address);
        console.log(`   Balance: ${ethers.formatEther(funderBalance)} ETH`);

        // Transferir 10 ETH a cada wallet de prueba
        const transferAmount = ethers.parseEther("10");

        for (let i = 0; i < walletsData.wallets.length; i++) {
            const wallet = walletsData.wallets[i];
            console.log(chalk.yellow(`\n🎯 Transfiriendo ETH a Wallet ${i + 1}:`));
            console.log(`   Dirección: ${wallet.address}`);

            // Verificar balance actual
            const currentBalance = await provider.getBalance(wallet.address);
            console.log(`   Balance actual: ${ethers.formatEther(currentBalance)} ETH`);

            if (currentBalance < ethers.parseEther("1")) {
                // Transferir ETH
                const tx = await funderWallet.sendTransaction({
                    to: wallet.address,
                    value: transferAmount
                });

                console.log(`   📝 Transacción enviada: ${tx.hash}`);

                const receipt = await tx.wait();
                console.log(`   ✅ Transacción confirmada en bloque: ${receipt.blockNumber}`);

                const newBalance = await provider.getBalance(wallet.address);
                console.log(`   💰 Nuevo balance: ${ethers.formatEther(newBalance)} ETH`);
            } else {
                console.log(`   ℹ️  Wallet ya tiene suficiente ETH`);
            }
        }

        console.log(chalk.green("\n🎉 ¡Todas las wallets han sido financiadas exitosamente!"));

        console.log(chalk.blue("\n📋 Resumen de wallets:"));
        for (let i = 0; i < walletsData.wallets.length; i++) {
            const wallet = walletsData.wallets[i];
            const balance = await provider.getBalance(wallet.address);
            console.log(`   Wallet ${i + 1}: ${wallet.address} - ${ethers.formatEther(balance)} ETH`);
        }

    } catch (error) {
        console.error(chalk.red("❌ Error durante la transferencia:"));
        console.error(error);
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
