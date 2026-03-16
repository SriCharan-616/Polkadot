require("dotenv").config();
const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Configuration
const RPC_URL = process.env.RPC_URL || "wss://asset-hub-paseo-rpc.polkadot.io";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const KEYHOLDER_PRIVATE_KEY = process.env.KEYHOLDER_PRIVATE_KEY;
const KEYHOLDER_INDEX = parseInt(process.env.KEYHOLDER_INDEX) || 0;

// Constants
const FIELD_MODULUS = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const GENERATOR_G = BigInt(5);
const KEY_SHARE_FILE = path.join(__dirname, `.keyshare_${KEYHOLDER_INDEX}.enc`);

// ABI (minimal for event listening)
const CONTRACT_ABI = [
    "event ProposalCreated(uint256 indexed proposalId, address indexed creator, string description)",
    "event VotingEnded(uint256 indexed proposalId, uint256 voteCount)",
    "function submitPublicKey(uint256 proposalId, uint256[2] memory publicKey, uint256[2] memory publicKeyShare)",
    "function submitPartialDecryption(uint256 proposalId, uint256[2][] memory partialDecryption, uint256[2] memory commitmentA, uint256[2] memory commitmentB, uint256 challenge, uint256 response)",
    "function getProposal(uint256 proposalId) view returns (tuple(uint256,address,string,string[],uint8,uint256,uint256,uint256,uint256,uint8,uint256[2],uint256[3][2],bool[3],tuple(uint256,uint256)[],uint256,uint256[2][],bool[3],uint256,uint256[],uint256,uint256))",
    "function getEncryptedTally(uint256 proposalId) view returns (tuple(uint256,uint256)[])"
];

// Provider and signer setup
const provider = new ethers.WebSocketProvider(RPC_URL);
const signer = new ethers.Wallet(KEYHOLDER_PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

// Store key share in memory (in production, use encrypted storage)
let keyShare = null;
let publicKeyShare = null;
let publicKey = null;

/**
 * Initialize keyholder with key share
 * For hackathon: generate random key share
 * In production: load from encrypted storage
 */
async function initializeKeyholder() {
    console.log(`Initializing keyholder ${KEYHOLDER_INDEX}...`);

    // Generate random key share
    keyShare = BigInt(Math.floor(Math.random() * Number(FIELD_MODULUS)));

    // Compute public key share: g^keyShare mod FIELD_MODULUS
    publicKeyShare = modExp(GENERATOR_G, keyShare, FIELD_MODULUS);

    // For DKG, we'll use simplified approach: public key is the product of shares
    // This would normally be coordinated off-chain
    publicKey = [GENERATOR_G, publicKeyShare]; // Placeholder

    console.log(`Key share initialized`);
    console.log(`Public key share: ${publicKeyShare.toString()}`);
}

/**
 * Watch for ProposalCreated events and initiate DKG
 */
function watchForProposals() {
    console.log("Watching for new proposals...");

    contract.on("ProposalCreated", async (proposalId, creator, description) => {
        console.log(`\nNew proposal created: ${proposalId}`);
        console.log(`Description: ${description}`);

        try {
            await handleDKG(proposalId);
        } catch (error) {
            console.error(`Error handling DKG for proposal ${proposalId}:`, error);
        }
    });
}

/**
 * Handle DKG (Distributed Key Generation)
 * For hackathon: simplified version without actual distributed coordination
 */
async function handleDKG(proposalId) {
    console.log(`\nHandling DKG for proposal ${proposalId}...`);

    try {
        // Fetch proposal to check status
        const proposal = await contract.getProposal(proposalId);

        if (proposal.status !== 0) {
            // 0 = PENDING_DKG
            console.log(`Proposal not in DKG phase, status: ${proposal.status}`);
            return;
        }

        // Submit public key and public key share
        // In a real system, keyholders would communicate off-chain to coordinate public key
        const publicKeyArray = [publicKey[0].toString(), publicKey[1].toString()];
        const publicKeyShareArray = [publicKeyShare.toString(), "0"]; // Placeholder for second component

        console.log(`Submitting public key for proposal ${proposalId}...`);

        const tx = await contract.submitPublicKey(
            proposalId,
            publicKeyArray,
            publicKeyShareArray,
            { gasLimit: 500000 }
        );

        const receipt = await tx.wait();
        console.log(`Public key submitted. Transaction: ${receipt.transactionHash}`);
    } catch (error) {
        console.error(`Error in handleDKG:`, error);
    }
}

/**
 * Watch for VotingEnded events and decrypt
 */
function watchForVotingEnded() {
    console.log("Watching for voting ended events...");

    contract.on("VotingEnded", async (proposalId, voteCount) => {
        console.log(`\nVoting ended for proposal ${proposalId}, vote count: ${voteCount}`);

        try {
            await handleDecryption(proposalId);
        } catch (error) {
            console.error(`Error handling decryption for proposal ${proposalId}:`, error);
        }
    });
}

/**
 * Handle partial decryption
 */
async function handleDecryption(proposalId) {
    console.log(`\nHandling decryption for proposal ${proposalId}...`);

    try {
        // Fetch encrypted tally
        const encryptedTally = await contract.getEncryptedTally(proposalId);
        console.log(`Encrypted tally length: ${encryptedTally.length}`);

        // Compute partial decryptions
        const partialDecryptions = [];
        for (let i = 0; i < encryptedTally.length; i++) {
            const c1 = BigInt(encryptedTally[i][0]);
            // partialDecryption[i] = c1^keyShare mod FIELD_MODULUS
            const partial = modExp(c1, keyShare, FIELD_MODULUS);
            partialDecryptions.push([partial.toString(), "0"]); // Placeholder for second component
        }

        // Compute Chaum-Pedersen proof
        const { commitmentA, commitmentB, challenge, response } = computeChaumPedersenProof();

        console.log(`Submitting partial decryption for proposal ${proposalId}...`);

        const tx = await contract.submitPartialDecryption(
            proposalId,
            partialDecryptions,
            [commitmentA.toString(), "0"],
            [commitmentB.toString(), "0"],
            challenge.toString(),
            response.toString(),
            { gasLimit: 1000000 }
        );

        const receipt = await tx.wait();
        console.log(`Partial decryption submitted. Transaction: ${receipt.transactionHash}`);
    } catch (error) {
        console.error(`Error in handleDecryption:`, error);
    }
}

/**
 * Compute Chaum-Pedersen zero-knowledge proof
 * Proves correct partial decryption without revealing key share
 */
function computeChaumPedersenProof() {
    // Generate random nonce k
    const k = BigInt(Math.floor(Math.random() * Number(FIELD_MODULUS)));

    // commitmentA = g^k mod FIELD_MODULUS
    const commitmentA = modExp(GENERATOR_G, k, FIELD_MODULUS);

    // commitmentB = c1^k mod FIELD_MODULUS
    // For simplification, using generator as placeholder
    const commitmentB = modExp(GENERATOR_G, k, FIELD_MODULUS);

    // challenge = hash(g, c1, publicKeyShare, partialDecryption, A, B) mod FIELD_MODULUS
    const challenge =
        BigInt(
            "0x" +
                require("crypto")
                    .createHash("sha256")
                    .update(GENERATOR_G.toString() + commitmentA.toString())
                    .digest("hex")
        ) % FIELD_MODULUS;

    // response = (k - keyShare * challenge) mod FIELD_MODULUS
    let response = k - keyShare * challenge;
    if (response < 0n) {
        response = (response % FIELD_MODULUS + FIELD_MODULUS) % FIELD_MODULUS;
    }

    return { commitmentA, commitmentB, challenge, response };
}

/**
 * Modular exponentiation: base^exp mod modulus
 */
function modExp(base, exp, mod) {
    let result = 1n;
    base = base % mod;

    while (exp > 0n) {
        if (exp % 2n === 1n) {
            result = (result * base) % mod;
        }
        exp = exp >> 1n;
        base = (base * base) % mod;
    }

    return result;
}

/**
 * Main entry point
 */
async function main() {
    console.log("=================================================");
    console.log("Polkadot Private Voting - Keyholder Service");
    console.log("=================================================");
    console.log(`Keyholder Index: ${KEYHOLDER_INDEX}`);
    console.log(`Signer Address: ${signer.address}`);
    console.log(`Contract Address: ${CONTRACT_ADDRESS}`);

    // Initialize keyholder
    await initializeKeyholder();

    // Watch for events
    watchForProposals();
    watchForVotingEnded();

    console.log("\nKeyholder service running. Waiting for events...");
}

// Handle graceful shutdown
process.on("SIGINT", () => {
    console.log("\nShutting down...");
    provider.destroy();
    process.exit(0);
});

// Start the service
main().catch(console.error);
