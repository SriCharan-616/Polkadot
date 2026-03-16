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
        paseoAssetHub: {
            url: process.env.RPC_URL || "wss://asset-hub-paseo-rpc.polkadot.io",
            chainId: 420420421,
            accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
        },
        hardhat: {
            chainId: 1337
        }
    },
    defaultNetwork: "hardhat",
    paths: {
        sources: "./contracts",
        tests: "./test",
        artifacts: "./artifacts",
        cache: "./cache"
    }
};
