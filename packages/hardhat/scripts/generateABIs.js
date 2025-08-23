import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generates ABI files for the frontend from Hardhat artifacts and deployments
 */
async function main() {
    const networkName = process.argv[2] || "localhost";

    console.log(chalk.blue("🔧 Generating ABIs for frontend..."));
    console.log(chalk.cyan(`📡 Network: ${networkName}`));

    try {
        // Paths
        const artifactsPath = path.join(__dirname, "../artifacts/contracts");
        const deploymentsPath = path.join(__dirname, `../deployments/${networkName}`);
        const outputDir = path.join(__dirname, "../../react-app/contracts", networkName);
        const backupDir = path.join(__dirname, `../deployments/${networkName}/generated`);

        // Create output directories
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        const deployedContracts = {};
        let contractCount = 0;

        // Check if deployment directory exists
        if (!fs.existsSync(deploymentsPath)) {
            console.log(chalk.yellow(`⚠️  No deployments found for network: ${networkName}`));
            console.log(chalk.yellow("💡 Run 'yarn deploy --<network>' first"));
            return;
        }

        // Read deployment files
        const deploymentFiles = fs.readdirSync(deploymentsPath).filter(file => file.endsWith('.json'));

        if (deploymentFiles.length === 0) {
            console.log(chalk.yellow("⚠️  No deployment files found"));
            return;
        }

        console.log(chalk.cyan(`📄 Found ${deploymentFiles.length} deployment files`));

        // Process each deployment file
        for (const deploymentFile of deploymentFiles) {
            const contractName = path.parse(deploymentFile).name;

            // Skip non-contract files
            if (contractName.includes('latest-') || contractName.includes('deployment')) {
                continue;
            }

            const deploymentPath = path.join(deploymentsPath, deploymentFile);
            const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

            console.log(chalk.green(`✅ Processing ${contractName}...`));

            // Extract contract information
            deployedContracts[contractName] = {
                address: deploymentData.address,
                abi: deploymentData.abi,
                bytecode: deploymentData.bytecode,
                deployedBytecode: deploymentData.deployedBytecode,
                transactionHash: deploymentData.transactionHash,
                receipt: deploymentData.receipt,
                args: deploymentData.args || [],
                numDeployments: deploymentData.numDeployments || 1,
                solcInput: deploymentData.solcInput,
                metadata: deploymentData.metadata,
                deploymentInfo: {
                    deployer: deploymentData.receipt?.from,
                    blockNumber: deploymentData.receipt?.blockNumber,
                    blockHash: deploymentData.receipt?.blockHash,
                    gasUsed: deploymentData.receipt?.gasUsed,
                    timestamp: new Date().toISOString()
                }
            };

            contractCount++;
            console.log(`   Address: ${chalk.white(deploymentData.address)}`);
            console.log(`   ABI methods: ${chalk.cyan(deploymentData.abi?.length || 0)}`);
        }

        if (contractCount === 0) {
            console.log(chalk.yellow("⚠️  No contracts found to process"));
            return;
        }

        // Generate deployedContracts.js for React app
        const deployedContractsContent = `// Auto-generated file - Do not edit manually
// Generated on: ${new Date().toISOString()}
// Network: ${networkName}
// Contracts: ${contractCount}

export const deployedContracts = ${JSON.stringify(deployedContracts, null, 2)};

// Helper functions for easier access
export const getContractAddress = (contractName) => {
  return deployedContracts[contractName]?.address;
};

export const getContractABI = (contractName) => {
  return deployedContracts[contractName]?.abi;
};

export const getContractInfo = (contractName) => {
  return deployedContracts[contractName];
};

// Network information
export const networkInfo = {
  name: "${networkName}",
  chainId: ${getChainId(networkName)},
  contracts: Object.keys(deployedContracts),
  generatedAt: "${new Date().toISOString()}"
};

export default deployedContracts;
`;

        // Write to React app directory
        const outputPath = path.join(outputDir, "deployedContracts.js");
        fs.writeFileSync(outputPath, deployedContractsContent);

        // Create backup in hardhat deployments
        const backupPath = path.join(backupDir, "deployedContracts.js");
        fs.writeFileSync(backupPath, deployedContractsContent);

        // Generate individual contract files for easier imports
        for (const [contractName, contractInfo] of Object.entries(deployedContracts)) {
            const individualContractContent = `// ${contractName} contract information
// Generated on: ${new Date().toISOString()}

export const ${contractName} = {
  address: "${contractInfo.address}",
  abi: ${JSON.stringify(contractInfo.abi, null, 2)}
};

export const ${contractName.toUpperCase()}_ADDRESS = "${contractInfo.address}";
export const ${contractName.toUpperCase()}_ABI = ${JSON.stringify(contractInfo.abi, null, 2)};

export default ${contractName};
`;

            const individualPath = path.join(outputDir, `${contractName}.js`);
            fs.writeFileSync(individualPath, individualContractContent);

            const individualBackupPath = path.join(backupDir, `${contractName}.js`);
            fs.writeFileSync(individualBackupPath, individualContractContent);
        }

        // Generate network configuration file
        const networkConfigContent = `// Network configuration for ${networkName}
// Generated on: ${new Date().toISOString()}

export const networkConfig = {
  name: "${networkName}",
  chainId: ${getChainId(networkName)},
  rpcUrl: "${getRpcUrl(networkName)}",
  blockExplorer: "${getBlockExplorer(networkName)}",
  nativeCurrency: {
    name: "${getNativeCurrency(networkName).name}",
    symbol: "${getNativeCurrency(networkName).symbol}",
    decimals: 18
  },
  contracts: {
    ${Object.entries(deployedContracts).map(([name, info]) => `${name}: "${info.address}"`).join(',\n    ')}
  }
};

export default networkConfig;
`;

        const networkConfigPath = path.join(outputDir, "networkConfig.js");
        fs.writeFileSync(networkConfigPath, networkConfigContent);

        console.log(chalk.green(`\n✅ ABIs generated successfully for ${contractCount} contracts!`));
        console.log(chalk.cyan("📁 Files created:"));
        console.log(`   Frontend: ${chalk.white(outputPath)}`);
        console.log(`   Backup: ${chalk.white(backupPath)}`);
        console.log(`   Network config: ${chalk.white(networkConfigPath)}`);
        console.log(`   Individual contracts: ${chalk.white(contractCount)} files`);

        console.log(chalk.blue("\n📋 Usage in React app:"));
        console.log(chalk.white(`   import { deployedContracts } from './contracts/${networkName}/deployedContracts.js';`));
        console.log(chalk.white(`   import { networkConfig } from './contracts/${networkName}/networkConfig.js';`));

        console.log(chalk.cyan("\n🎉 Frontend files are ready!"));

    } catch (error) {
        console.error(chalk.red("❌ Error generating ABIs:"), error.message);
        if (error.stack) {
            console.error(chalk.gray("Stack trace:"), error.stack);
        }
        process.exitCode = 1;
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
 * Get RPC URL for network
 */
function getRpcUrl(networkName) {
    const rpcUrls = {
        localhost: "http://127.0.0.1:8545",
        hardhat: "http://127.0.0.1:8545",
        sepolia: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || 'your-api-key'}`,
        fuji: "https://api.avax-test.network/ext/bc/C/rpc",
        avalanche: "https://api.avax.network/ext/bc/C/rpc"
    };
    return rpcUrls[networkName] || "http://127.0.0.1:8545";
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

/**
 * Get native currency info for network
 */
function getNativeCurrency(networkName) {
    const currencies = {
        localhost: { name: "Ether", symbol: "ETH" },
        hardhat: { name: "Ether", symbol: "ETH" },
        sepolia: { name: "Ether", symbol: "ETH" },
        fuji: { name: "Avalanche", symbol: "AVAX" },
        avalanche: { name: "Avalanche", symbol: "AVAX" }
    };
    return currencies[networkName] || { name: "Ether", symbol: "ETH" };
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});