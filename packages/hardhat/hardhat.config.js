require("@nomiclabs/hardhat-ethers");
require("hardhat-deploy");
const dotenv = require("dotenv");
dotenv.config();

// Get private key from environment variable
const deployerPrivateKey = process.env.PRIVATE_KEY ||
  "0x0000000000000000000000000000000000000000000000000000000000000000";

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    // Local development network
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },

    // Hardhat built-in network
    hardhat: {
      chainId: 31337,
      // Pre-funded accounts for local development
      accounts: {
        count: 20,
        accountsBalance: "10000000000000000000000", // 10,000 ETH
      },
    },

    // Ethereum Sepolia Testnet
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      accounts: [deployerPrivateKey],
      chainId: 11155111,
      gasPrice: 20000000000, // 20 gwei
      gas: 6000000,
    },

    // Avalanche Fuji Testnet
    fuji: {
      url: "https://api.avax-test.network/ext/bc/C/rpc",
      accounts: [deployerPrivateKey],
      chainId: 43113,
      gasPrice: 25000000000, // 25 gwei
      gas: 8000000,
    },

    // Avalanche Mainnet
    avalanche: {
      url: "https://api.avax.network/ext/bc/C/rpc",
      accounts: [deployerPrivateKey],
      chainId: 43114,
      gasPrice: 25000000000, // 25 gwei
      gas: 8000000,
    },
  },

  // Network verification settings
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_V2_API_KEY,
      avalanche: process.env.SNOWTRACE_API_KEY,
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY,
    },
    customChains: [
      {
        network: "avalanche",
        chainId: 43114,
        urls: {
          apiURL: "https://api.snowtrace.io/api",
          browserURL: "https://snowtrace.io/"
        }
      },
      {
        network: "avalancheFujiTestnet",
        chainId: 43113,
        urls: {
          apiURL: "https://api-testnet.snowtrace.io/api",
          browserURL: "https://testnet.snowtrace.io/"
        }
      }
    ]
  },

  // Hardhat Deploy configuration
  namedAccounts: {
    deployer: {
      default: 0, // Use the first account as deployer
    },
    user1: 1,
    user2: 2,
  },

  // Gas reporter settings
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },

  // Default network
  defaultNetwork: "hardhat",

  // Paths configuration
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
    deploy: "./deploy", // For hardhat-deploy
    deployments: "./deployments", // For hardhat-deploy
  },

  // Mocha test configuration
  mocha: {
    timeout: 40000,
  },
};

module.exports = config;