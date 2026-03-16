/**
 * Deployment Script for Private Voting System
 */

require("dotenv").config();

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {

    console.log("🚀 Deploying Private Voting System...\n");

    const { ethers } = hre;

    const [deployer] = await ethers.getSigners();

    console.log(`📍 Deploying from: ${deployer.address}`);

    // -------------------------------------------------
    // Load keyholders from .env
    // -------------------------------------------------

    const keyholder0 = process.env.KEYHOLDER_0;
    const keyholder1 = process.env.KEYHOLDER_1;
    const keyholder2 = process.env.KEYHOLDER_2;

    if (!keyholder0 || !keyholder1 || !keyholder2) {
        throw new Error("❌ Missing KEYHOLDER addresses in .env");
    }

    // Validate addresses
    if (
        !ethers.isAddress(keyholder0) ||
        !ethers.isAddress(keyholder1) ||
        !ethers.isAddress(keyholder2)
    ) {
        throw new Error("❌ Invalid keyholder address format in .env");
    }

    console.log("\n🔑 Keyholders:");
    console.log("   0:", keyholder0);
    console.log("   1:", keyholder1);
    console.log("   2:", keyholder2);

    const deployments = {};

    // -------------------------------------------------
    // 1️⃣ Deploy ChaumPedersen
    // -------------------------------------------------

    console.log("\n1️⃣ Deploying ChaumPedersen...");

    const ChaumPedersen = await ethers.getContractFactory("ChaumPedersen");

    const chaumPedersen = await ChaumPedersen.deploy();

    await chaumPedersen.waitForDeployment();

    const chaumPedersenAddress = await chaumPedersen.getAddress();

    deployments.chaumPedersen = chaumPedersenAddress;

    console.log(`   ✅ ChaumPedersen deployed: ${chaumPedersenAddress}`);

    // -------------------------------------------------
    // 2️⃣ Deploy Mock Verifier
    // -------------------------------------------------

    console.log("\n2️⃣ Deploying MockVerifier...");

    const MockVerifier = await ethers.getContractFactory("MockVerifier");

    const verifier = await MockVerifier.deploy();

    await verifier.waitForDeployment();

    const verifierAddress = await verifier.getAddress();

    deployments.verifier = verifierAddress;

    console.log(`   ✅ Verifier deployed: ${verifierAddress}`);

    // -------------------------------------------------
    // 3️⃣ Deploy PrivateVoting
    // -------------------------------------------------

    console.log("\n3️⃣ Deploying PrivateVoting...");

    const PrivateVoting = await ethers.getContractFactory("PrivateVoting");

    const privateVoting = await PrivateVoting.deploy(
        keyholder0,
        keyholder1,
        keyholder2,
        verifierAddress,
        chaumPedersenAddress
    );

    await privateVoting.waitForDeployment();

    const privateVotingAddress = await privateVoting.getAddress();

    deployments.privateVoting = privateVotingAddress;

    console.log(`   ✅ PrivateVoting deployed: ${privateVotingAddress}`);

    // -------------------------------------------------
    // Save deployment addresses
    // -------------------------------------------------

    const deploymentsPath = path.join(__dirname, "..", "deployments.json");

    fs.writeFileSync(
        deploymentsPath,
        JSON.stringify(deployments, null, 2)
    );

    console.log("\n📋 Saved addresses to deployments.json");

    Object.entries(deployments).forEach(([name, address]) => {
        console.log(`   ${name}: ${address}`);
    });

    // -------------------------------------------------
    // Create .env automatically if missing
    // -------------------------------------------------

    const envPath = path.join(__dirname, "..", ".env");

    if (!fs.existsSync(envPath)) {

        const envContent = `REACT_APP_CONTRACT_ADDRESS=${privateVotingAddress}
REACT_APP_RPC_URL=wss://asset-hub-paseo-rpc.polkadot.io
REACT_APP_CHAIN_ID=420420421

KEYHOLDER_0=${keyholder0}
KEYHOLDER_1=${keyholder1}
KEYHOLDER_2=${keyholder2}
`;

        fs.writeFileSync(envPath, envContent);

        console.log("\n📝 Created .env file automatically");
    }

    console.log("\n🎉 Deployment Successful!");
}

main().catch((error) => {
    console.error("❌ Deployment Failed:");
    console.error(error);
    process.exit(1);
});