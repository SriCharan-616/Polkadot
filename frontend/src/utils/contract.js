/**
 * Smart Contract Interaction Utilities
 * Uses ethers.js v6 for blockchain interaction
 */

import { ethers } from "ethers";

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
const RPC_URL = process.env.REACT_APP_RPC_URL;

// ABI will be imported from compiled artifacts
import PrivateVotingABI from "../contracts/PrivateVoting.json";
import ChaumPedersenABI from "../contracts/ChaumPedersen.json";
import VerifierABI from "../contracts/Verifier.json";

/**
 * Get ethers provider
 */
function getProvider() {
    if (typeof window !== "undefined" && window.ethereum) {
        return new ethers.BrowserProvider(window.ethereum);
    }
    return new ethers.JsonRpcProvider(RPC_URL);
}

/**
 * Get signer (requires connected wallet)
 */
async function getSigner() {
    const provider = getProvider();
    return await provider.getSigner();
}

/**
 * Get contract instance
 */
function getContract(signerOrProvider) {
    return new ethers.Contract(CONTRACT_ADDRESS, PrivateVotingABI, signerOrProvider);
}

/**
 * Create a new proposal
 */
async function createProposal(
    description,
    options,
    votingMode,
    startBlock,
    endBlock,
    eligibilityThreshold,
    minVoterThreshold
) {
    const signer = await getSigner();
    const contract = getContract(signer);

    const tx = await contract.createProposal(
        description,
        options,
        votingMode,
        startBlock,
        endBlock,
        eligibilityThreshold,
        minVoterThreshold
    );

    const receipt = await tx.wait();
    return receipt;
}

/**
 * Cast a vote on a proposal
 */
async function castVote(
    proposalId,
    encryptedVote,
    proof,
    publicSignals,
    nullifier
) {
    const signer = await getSigner();
    const contract = getContract(signer);

    // Format encryptedVote array as [c1, c2] BigInt pairs
    const formattedEncryptedVote = encryptedVote.map((vote) => [
        BigInt(vote.c1.toString()),
        BigInt(vote.c2.toString())
    ]);

    // Format proof components
    const proofA = [proof.a[0], proof.a[1]];
    const proofB = [
        [proof.b[0][0], proof.b[0][1]],
        [proof.b[1][0], proof.b[1][1]]
    ];
    const proofC = [proof.c[0], proof.c[1]];

    // Convert public signals to proper format
    const signals = publicSignals.map((sig) => sig.toString());

    const tx = await contract.castVote(
        proposalId,
        formattedEncryptedVote,
        proofA,
        proofB,
        proofC,
        signals,
        BigInt(nullifier)
    );

    const receipt = await tx.wait();
    return receipt;
}

/**
 * Fetch a proposal
 */
async function getProposal(proposalId) {
    const provider = getProvider();
    const contract = getContract(provider);
    return await contract.getProposal(proposalId);
}

/**
 * Fetch all proposals
 */
async function getAllProposals() {
    const provider = getProvider();
    const contract = getContract(provider);

    const proposalCount = await contract.proposalCount();
    const proposals = [];

    for (let i = 0; i < proposalCount; i++) {
        const proposal = await contract.getProposal(i);
        proposals.push(proposal);
    }

    return proposals;
}

/**
 * Get voting result (only available if REVEALED)
 */
async function getResult(proposalId) {
    const provider = getProvider();
    const contract = getContract(provider);
    const [finalResult, winningOption] = await contract.getResult(proposalId);
    return { finalResult, winningOption };
}

/**
 * End voting for a proposal
 */
async function endVoting(proposalId) {
    const signer = await getSigner();
    const contract = getContract(signer);

    const tx = await contract.endVoting(proposalId);
    const receipt = await tx.wait();
    return receipt;
}

/**
 * Listen for events on a proposal
 */
function listenForEvents(proposalId, callbacks) {
    const provider = getProvider();
    const contract = getContract(provider);

    // Listen for VoteCast events
    contract.on("VoteCast", (pId, voteCount) => {
        if (pId.toString() === proposalId.toString()) {
            callbacks.onVoteCast?.(voteCount);
        }
    });

    // Listen for ResultRevealed events
    contract.on("ResultRevealed", (pId, result, winner) => {
        if (pId.toString() === proposalId.toString()) {
            callbacks.onResult?.(result, winner);
        }
    });

    // Listen for ProposalCancelled events
    contract.on("ProposalCancelled", (pId, reason) => {
        if (pId.toString() === proposalId.toString()) {
            callbacks.onCancelled?.(reason);
        }
    });
}

export {
    getProvider,
    getSigner,
    getContract,
    createProposal,
    castVote,
    getProposal,
    getAllProposals,
    getResult,
    endVoting,
    listenForEvents
};
