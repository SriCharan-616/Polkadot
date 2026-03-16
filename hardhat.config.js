require("@nomicfoundation/hardhat-ethers");
require("dotenv").config();

module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    },

    networks: {
        "paseo-asset-hub": {
            url: process.env.RPC_URL || "wss://asset-hub-paseo-rpc.polkadot.io",
            accounts: process.env.DEPLOYER_PRIVATE_KEY
                ? [process.env.DEPLOYER_PRIVATE_KEY]
                : [],
            chainId: 420420421
        },

        hardhat: {
            // Local hardhat network for testing
        },

        localhost: {
            url: "http://127.0.0.1:8545"
        }
    },

    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts"
    },

    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY || ""
    },

    // For Polkadot PVM: use resolc compiler plugin
    // Note: When deploying to PVM, you may need to use resolc instead of solc
    // Install: npm install --save-dev @parity/resolc
    // Then configure compiler here if needed
};
