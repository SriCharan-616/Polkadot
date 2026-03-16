/**
 * Keyholder Server Script
 * Runs on each keyholder's server to manage DKG and threshold decryption
 */

const { ethers } = require("ethers");
const { buildPoseidon } = require("circomlibjs");
const crypto = require("crypto");

// Configuration
const RPC_URL = process.env.RPC_URL || "wss://asset-hub-paseo-rpc.polkadot.io";
const PRIVATE_KEY = process.env.KEYHOLDER_PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
const KEYHOLDER_INDEX = parseInt(process.env.KEYHOLDER_INDEX) || 0;

const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const GENERATOR_G = 5n;

// ABI snippets
const CONTRACT_ABI = [
    "function submitPublicKey(uint256 proposalId, uint256[2] publicKey, uint256[2] publicKeyShare) external",
    "function submitPartialDecryption(uint256 proposalId, uint256[2][] partialDecryption, uint256[2] commitmentA, uint256[2] commitmentB, uint256 challenge, uint256 response) external",
    "function getProposal(uint256 proposalId) external view returns (tuple(uint256, address, string, string[], uint8, uint256, uint256, uint256, uint256, uint8, uint256[2], uint256[3][2], bool[3], tuple(uint256, uint256)[], uint256, uint256[2][], bool[3], uint256, uint256[], uint256, uint256))",
    "event ProposalCreated(uint256 indexed proposalId, address creator, string description)",
    "event VotingEnded(uint256 indexed proposalId, uint256 voteCount)"
];

let provider, signer, contract;
let keyShare = null;
let publicKeyShare = null;

// Initialize
async function init() {
    provider = new ethers.WebSocketProvider(RPC_URL);
    signer = new ethers.Wallet(PRIVATE_KEY, provider);
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    // Load or generate key share
    await loadOrGenerateKeyShare();

    console.log("✅ Keyholder initialized");
    console.log(`   Address: ${signer.address}`);
    console.log(`   Index: ${KEYHOLDER_INDEX}`);
    console.log(`   Public Key Share: ${publicKeyShare}`);

    // Start listening
    watchForProposals();
    watchForVotingEnded();
}

// Utility: modular exponentiation
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

// Utility: modular inverse
function modInverse(a, mod) {
    let [old_r, r] = [a, mod];
    let [old_s, s] = [1n, 0n];

    while (r !== 0n) {
        let quotient = old_r / r;
        [old_r, r] = [r, old_r - quotient * r];
        [old_s, s] = [s, old_s - quotient * s];
    }

    return old_r === 1n ? (old_s % mod + mod) % mod : null;
}

// Load or generate key share
async function loadOrGenerateKeyShare() {
    // For hackathon: generate random key share
    const randomBytes = crypto.randomBytes(32);
    keyShare = 0n;
    for (let i = 0; i < 32; i++) {
        keyShare = (keyShare << 8n) | BigInt(randomBytes[i]);
    }
    keyShare = (keyShare % (FIELD_MODULUS - 1n)) + 1n;

    // Compute public key share
    publicKeyShare = modExp(GENERATOR_G, keyShare, FIELD_MODULUS);

    console.log(`   Key Share: ${keyShare.toString().substring(0, 20)}... (hidden)`);
}

// Watch for new proposals and submit DKG
async function watchForProposals() {
    contract.on("ProposalCreated", async (proposalId, creator, description) => {
        console.log(`\n📝 New proposal created: #${proposalId}`);
        console.log(`   Description: ${description}`);

        // Wait a bit before submitting
        setTimeout(() => handleDKG(proposalId), 5000);
    });
}

// Handle DKG for a proposal
async function handleDKG(proposalId) {
    try {
        const proposal = await contract.getProposal(proposalId);

        // Check if already submitted
        if (proposal.keyholderSubmittedPublicKey[KEYHOLDER_INDEX]) {
            console.log(`✅ Already submitted DKG for proposal #${proposalId}`);
            return;
        }

        // For hackathon: all keyholders agree on same combined public key
        // In production: use proper DKG protocol
        const electionPublicKey = [GENERATOR_G, modExp(GENERATOR_G, 12345n, FIELD_MODULUS)];

        console.log(`\n🔐 Submitting DKG for proposal #${proposalId}`);
        console.log(`   Public Key: [${electionPublicKey[0]}, ${electionPublicKey[1]}]`);
        console.log(`   Public Key Share: ${publicKeyShare}`);

        const tx = await contract.submitPublicKey(
            proposalId,
            electionPublicKey,
            [publicKeyShare, 0]
        );

        await tx.wait();
        console.log(`✅ DKG submitted for proposal #${proposalId}`);
    } catch (error) {
        console.error(`❌ Error in DKG for proposal #${proposalId}:`, error.message);
    }
}

// Watch for ended voting
async function watchForVotingEnded() {
    contract.on("VotingEnded", async (proposalId, voteCount) => {
        console.log(`\n🗳️ Voting ended for proposal #${proposalId}`);
        console.log(`   Total votes: ${voteCount}`);

        // Wait a bit before decrypting
        setTimeout(() => handleDecryption(proposalId), 5000);
    });
}

// Handle decryption for ended proposal
async function handleDecryption(proposalId) {
    try {
        const proposal = await contract.getProposal(proposalId);

        // Check if already submitted
        if (proposal.keyholderSubmittedDecryption[KEYHOLDER_INDEX]) {
            console.log(`✅ Already submitted decryption for proposal #${proposalId}`);
            return;
        }

        console.log(`\n🔓 Computing partial decryption for proposal #${proposalId}`);

        // Fetch encrypted tally
        const encryptedTally = await contract.getEncryptedTally(proposalId);

        // Compute partial decryption for each option
        const partialDecryption = [];
        for (let i = 0; i < encryptedTally.length; i++) {
            const c1_to_keyshare = modExp(BigInt(encryptedTally[i].c1), keyShare, FIELD_MODULUS);
            partialDecryption.push([c1_to_keyshare, 0n]);
        }

        // Compute Chaum-Pedersen proof
        const k = modExp(GENERATOR_G, 98765n, FIELD_MODULUS); // Random nonce (for hackathon)
        const commitmentA = modExp(GENERATOR_G, k, FIELD_MODULUS);
        const commitmentB = modExp(BigInt(encryptedTally[0].c1), k, FIELD_MODULUS);

        // Compute challenge
        const challengeInput = ethers.solidityPacked(
            ["uint256", "uint256", "uint256", "uint256", "uint256", "uint256"],
            [
                GENERATOR_G.toString(),
                encryptedTally[0].c1,
                publicKeyShare.toString(),
                partialDecryption[0][0].toString(),
                commitmentA.toString(),
                commitmentB.toString()
            ]
        );
        const challenge = BigInt(ethers.keccak256(challengeInput)) % FIELD_MODULUS;

        // Compute response
        const response = (k - (keyShare * challenge) % FIELD_MODULUS + FIELD_MODULUS) % FIELD_MODULUS;

        console.log(`   Partial decryptions computed for ${partialDecryption.length} options`);
        console.log(`   Chaum-Pedersen proof generated`);

        const tx = await contract.submitPartialDecryption(
            proposalId,
            partialDecryption,
            [commitmentA.toString(), 0],
            [commitmentB.toString(), 0],
            challenge.toString(),
            response.toString()
        );

        await tx.wait();
        console.log(`✅ Partial decryption submitted for proposal #${proposalId}`);
    } catch (error) {
        console.error(`❌ Error in decryption for proposal #${proposalId}:`, error.message);
    }
}

// Error handling
process.on("unhandledRejection", (error) => {
    console.error("❌ Unhandled rejection:", error);
});

// Start
init().catch((error) => {
    console.error("❌ Initialization failed:", error);
    process.exit(1);
});
