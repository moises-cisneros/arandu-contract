import * as dotenv from "dotenv";
dotenv.config();
import { Wallet, JsonRpcProvider } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Gets a wallet from the test wallets file
 * @param {number} walletNumber - The wallet number to retrieve (1-based)
 * @returns {Promise<Wallet>} The wallet instance
 */
export async function getWallet(walletNumber = 1) {
    const walletsPath = path.join(__dirname, "../wallets/test-wallets.json");

    if (!fs.existsSync(walletsPath)) {
        throw new Error(`❌ Test wallets file not found. Run 'yarn wallets -${walletNumber}' to generate test wallets`);
    }

    const walletsData = JSON.parse(fs.readFileSync(walletsPath, "utf8"));

    if (!walletsData.wallets || walletsData.wallets.length < walletNumber) {
        throw new Error(`❌ Wallet ${walletNumber} not found. Available wallets: ${walletsData.wallets?.length || 0}`);
    }

    const walletData = walletsData.wallets[walletNumber - 1];
    const wallet = new Wallet(walletData.privateKey);

    return wallet;
}

/**
 * Gets the deployer wallet
 * @param {string} password - Password to decrypt the wallet
 * @returns {Promise<Wallet>} The deployer wallet instance
 */
export async function getDeployerWallet(password) {
    const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;

    if (!encryptedKey) {
        throw new Error("❌ No deployer wallet found. Run 'yarn generate' first");
    }

    try {
        const wallet = await Wallet.fromEncryptedJson(encryptedKey, password);
        return wallet;
    } catch (error) {
        throw new Error("❌ Failed to decrypt deployer wallet. Wrong password?");
    }
}

/**
 * Gets a provider for the specified network
 * @param {string} networkName - Network name (sepolia, fuji, avalanche, localhost)
 * @returns {JsonRpcProvider} The provider instance
 */
export function getProvider(networkName) {
    const networks = {
        sepolia: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        fuji: "https://api.avax-test.network/ext/bc/C/rpc",
        avalanche: "https://api.avax.network/ext/bc/C/rpc",
        localhost: "http://127.0.0.1:8545"
    };

    const rpcUrl = networks[networkName];
    if (!rpcUrl) {
        throw new Error(`❌ Unknown network: ${networkName}`);
    }

    if (networkName === "sepolia" && !process.env.ALCHEMY_API_KEY) {
        throw new Error("❌ ALCHEMY_API_KEY required for Sepolia network");
    }

    return new JsonRpcProvider(rpcUrl);
}

/**
 * Connects a wallet to a specific network
 * @param {Wallet} wallet - The wallet instance
 * @param {string} networkName - Network name
 * @returns {Wallet} Wallet connected to the provider
 */
export function connectWalletToNetwork(wallet, networkName) {
    const provider = getProvider(networkName);
    return wallet.connect(provider);
}

/**
 * Saves deployment data to JSON file
 * @param {string} networkName - Network name
 * @param {Object} deploymentData - Deployment information
 */
export function saveDeploymentData(networkName, deploymentData) {
    const deploymentsDir = path.join(__dirname, "../deployments");
    const networkDir = path.join(deploymentsDir, networkName);

    // Create directories if they don't exist
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
    }

    if (!fs.existsSync(networkDir)) {
        fs.mkdirSync(networkDir, { recursive: true });
    }

    // Save deployment data
    const deploymentPath = path.join(networkDir, "deployment.json");
    const dataWithTimestamp = {
        ...deploymentData,
        timestamp: new Date().toISOString(),
        network: networkName
    };

    fs.writeFileSync(deploymentPath, JSON.stringify(dataWithTimestamp, null, 2));

    // Also save as latest deployment
    const latestPath = path.join(networkDir, `latest-${networkName}.json`);
    fs.writeFileSync(latestPath, JSON.stringify(dataWithTimestamp, null, 2));

    console.log(`📁 Deployment data saved to: ${deploymentPath}`);
}

/**
 * Loads deployment data from JSON file
 * @param {string} networkName - Network name
 * @returns {Object} Deployment data
 */
export function loadDeploymentData(networkName) {
    const deploymentPath = path.join(__dirname, `../deployments/${networkName}/latest-${networkName}.json`);

    if (!fs.existsSync(deploymentPath)) {
        throw new Error(`❌ No deployment found for network: ${networkName}`);
    }

    return JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
}

/**
 * Generates ABIs for the frontend
 * @param {string} networkName - Network name
 * @param {Object} contracts - Contract instances with their addresses
 */
export function generateABIs(networkName, contracts) {
    const outputDir = path.join(__dirname, "../../react-app/contracts", networkName);

    // Create output directory
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const deployedContracts = {};

    // Process each contract
    for (const [contractName, contractInfo] of Object.entries(contracts)) {
        deployedContracts[contractName] = {
            address: contractInfo.address,
            abi: contractInfo.abi
        };
    }

    // Write deployedContracts.js file
    const outputPath = path.join(outputDir, "deployedContracts.js");
    const content = `// Auto-generated file - Do not edit manually
// Generated on: ${new Date().toISOString()}
// Network: ${networkName}

export const deployedContracts = ${JSON.stringify(deployedContracts, null, 2)};

export default deployedContracts;
`;

    fs.writeFileSync(outputPath, content);
    console.log(`📝 ABIs generated for frontend: ${outputPath}`);
}

/**
 * Wait for a specified number of milliseconds
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after the wait
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format address for display (shows first and last 4 characters)
 * @param {string} address - Ethereum address
 * @returns {string} Formatted address
 */
export function formatAddress(address) {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}