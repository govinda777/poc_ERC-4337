require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Get environment variables - some might not be defined in CI, use with defaults
const INFURA_API_KEY = process.env.INFURA_API_KEY || "";
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [];
const SEPOLIA_URL = process.env.SEPOLIA_URL || `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 1337,
      gasPrice: 20000000000,
      blockGasLimit: 30000000
    },
    localhost: {
      url: "http://127.0.0.1:8545/",
      chainId: 31337
    },
    sepolia: {
      url: SEPOLIA_URL,
      accounts: PRIVATE_KEY,
      gasPrice: 20000000000
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY
  },
  mocha: {
    timeout: 60000 // 60 seconds for tests
  },
  // Add this to avoid TypeScript warnings in CI
  typechain: {
    outDir: "typechain",
    target: "ethers-v5"
  }
}; 