import * as dotenv from "dotenv";
dotenv.config();
import { Wallet } from "ethers";
import * as fs from "fs";
import password from "@inquirer/password";
import input from "@inquirer/input";
import confirm from "@inquirer/confirm";
import chalk from "chalk";

/**
 * Generates a new wallet and encrypts the private key with a password
 */
async function main() {
    console.log(chalk.blue("🔐 Generating new wallet..."));

    // Check if there's already an encrypted key
    if (process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED) {
        const overwrite = await confirm({
            message: "A deployer account already exists. Do you want to overwrite it?",
            default: false
        });

        if (!overwrite) {
            console.log(chalk.yellow("Operation cancelled."));
            return;
        }
    }

    // Generate a new random wallet
    const wallet = Wallet.createRandom();

    console.log(chalk.green("✅ New wallet generated!"));
    console.log(chalk.cyan("📋 Wallet Details:"));
    console.log(`   Address: ${chalk.white(wallet.address)}`);
    console.log(`   Private Key: ${chalk.red(wallet.privateKey)} ${chalk.yellow("(Keep this secret!)")}`);

    // Ask for password to encrypt the private key
    const pass = await password({
        message: "Enter a password to encrypt your private key:",
        validate: (input) => {
            if (input.length < 8) {
                return "Password must be at least 8 characters long";
            }
            return true;
        }
    });

    const confirmPass = await password({
        message: "Confirm your password:"
    });

    if (pass !== confirmPass) {
        console.error(chalk.red("❌ Passwords don't match!"));
        process.exit(1);
    }

    console.log(chalk.yellow("🔒 Encrypting private key..."));

    try {
        // Encrypt the private key
        const encryptedJson = await wallet.encrypt(pass);

        // Read current .env file
        const envPath = ".env";
        let envContent = "";

        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, "utf8");
        }

        // Update or add the encrypted private key
        const lines = envContent.split('\n');
        let found = false;

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('DEPLOYER_PRIVATE_KEY_ENCRYPTED=')) {
                lines[i] = `DEPLOYER_PRIVATE_KEY_ENCRYPTED=${encryptedJson}`;
                found = true;
                break;
            }
        }

        if (!found) {
            lines.push(`DEPLOYER_PRIVATE_KEY_ENCRYPTED=${encryptedJson}`);
        }

        // Write back to .env file
        fs.writeFileSync(envPath, lines.join('\n'));

        console.log(chalk.green("✅ Private key encrypted and saved to .env file!"));
        console.log(chalk.blue("💡 Your wallet address:"), chalk.white(wallet.address));
        console.log(chalk.yellow("⚠️  Make sure to:"));
        console.log(chalk.yellow("   1. Keep your password safe"));
        console.log(chalk.yellow("   2. Add .env to your .gitignore"));
        console.log(chalk.yellow("   3. Fund your wallet with test tokens"));
        console.log(chalk.cyan("🚀 Run 'yarn account' to check your wallet balance"));

    } catch (error) {
        console.error(chalk.red("❌ Error encrypting private key:"), error.message);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});