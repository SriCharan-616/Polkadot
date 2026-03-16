import { ethers } from "ethers";

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
const RPC_URL = process.env.REACT_APP_RPC_URL || "wss://asset-hub-paseo-rpc.polkadot.io";

// ABI needs to be imported from compiled artifact
// For now, we'll create a minimal ABI that should be expanded based on actual contract
const MINIMAL_ABI = [
    "function createProposal(string description, string[] options, uint8 votingMode, uint256 startBlock, uint256 endBlock, uint256 eligibilityThreshold, uint256 minVoterThreshold) returns (uint256)",
    "function castVote(uint256 proposalId, tuple(uint256,uint256)[] encryptedVote, uint256[2] proofA, uint256[2][2] proofB, uint256[2] proofC, uint256[] publicSignals, uint256 nullifier)",
    "function getProposal(uint256 proposalId) view returns (tuple(uint256,address,string,string[],uint8,uint256,uint256,uint256,uint256,uint8,uint256[2],uint256[3][2],bool[3],tuple(uint256,uint256)[],uint256,uint256[2][],bool[3],uint256,uint256[],uint256,uint256))",
    "function getEncryptedTally(uint256 proposalId) view returns (tuple(uint256,uint256)[])",
    "function getResult(uint256 proposalId) view returns (uint256[], uint256)",
    "function endVoting(uint256 proposalId)",
    "function proposalCount() view returns (uint256)",
    "event ProposalCreated(uint256 indexed proposalId, address indexed creator, string description)",
    "event VoteCast(uint256 indexed proposalId, uint256 voteCount)",
    "event ResultRevealed(uint256 indexed proposalId, uint256[] result, uint256 winningOption)",
    "event VotingEnded(uint256 indexed proposalId, uint256 voteCount)",
    "event ProposalCancelled(uint256 indexed proposalId, string reason)"
];

/**
 * Get ethers provider for Polkadot network
 */
function getProvider() {
    if (typeof window !== "undefined" && window.ethereum) {
        return new ethers.BrowserProvider(window.ethereum);
    }
    // Fallback to JSON-RPC provider
    return new ethers.JsonRpcProvider(RPC_URL);
}

/**
 * Get signer from connected wallet
 */
async function getSigner() {
    const provider = getProvider();
    if (provider instanceof ethers.BrowserProvider) {
        return await provider.getSigner();
    }
    throw new Error("No wallet connected");
}

/**
 * Get contract instance with signer or provider
 */
function getContract(signerOrProvider) {
    return new ethers.Contract(CONTRACT_ADDRESS, MINIMAL_ABI, signerOrProvider);
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
 * Cast a vote with encrypted vote vector and ZK proof
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

    // Format encryptedVote for contract
    const formattedVote = encryptedVote.map((v) => [
        "0x" + v.c1.toString(16),
        "0x" + v.c2.toString(16)
    ]);

    // Format proof for contract
    const formattedProof = {
        a: ["0x" + proof.a[0].toString(16), "0x" + proof.a[1].toString(16)],
        b: [
            ["0x" + proof.b[0][0].toString(16), "0x" + proof.b[0][1].toString(16)],
            ["0x" + proof.b[1][0].toString(16), "0x" + proof.b[1][1].toString(16)]
        ],
        c: ["0x" + proof.c[0].toString(16), "0x" + proof.c[1].toString(16)]
    };

    // Format public signals
    const formattedSignals = publicSignals.map((s) => "0x" + s.toString(16));

    const tx = await contract.castVote(
        proposalId,
        formattedVote,
        formattedProof.a,
        formattedProof.b,
        formattedProof.c,
        formattedSignals,
        "0x" + nullifier.toString(16)
    );

    const receipt = await tx.wait();
    return receipt;
}

/**
 * Get proposal details
 */
async function getProposal(proposalId) {
    const provider = getProvider();
    const contract = getContract(provider);

    const proposal = await contract.getProposal(proposalId);
    return proposal;
}

/**
 * Get all proposals
 */
async function getAllProposals() {
    const provider = getProvider();
    const contract = getContract(provider);

    const count = await contract.proposalCount();
    const proposals = [];

    for (let i = 0; i < count; i++) {
        try {
            const proposal = await getProposal(i);
            proposals.push(proposal);
        } catch (error) {
            console.warn(`Failed to fetch proposal ${i}:`, error);
        }
    }

    return proposals;
}

/**
 * Get voting result (only if revealed)
 */
async function getResult(proposalId) {
    const provider = getProvider();
    const contract = getContract(provider);

    const [finalResult, winningOption] = await contract.getResult(proposalId);
    return { finalResult, winningOption };
}

/**
 * End voting period for a proposal
 */
async function endVoting(proposalId) {
    const signer = await getSigner();
    const contract = getContract(signer);

    const tx = await contract.endVoting(proposalId);
    const receipt = await tx.wait();
    return receipt;
}

/**
 * Listen for contract events
 */
function listenForEvents(proposalId, callbacks) {
    const provider = getProvider();
    const contract = getContract(provider);

    if (callbacks.onVoteCast) {
        contract.on("VoteCast", (id, voteCount) => {
            if (id.toString() === proposalId.toString()) {
                callbacks.onVoteCast(voteCount);
            }
        });
    }

    if (callbacks.onResult) {
        contract.on("ResultRevealed", (id, result, winner) => {
            if (id.toString() === proposalId.toString()) {
                callbacks.onResult(result, winner);
            }
        });
    }

    if (callbacks.onCancelled) {
        contract.on("ProposalCancelled", (id, reason) => {
            if (id.toString() === proposalId.toString()) {
                callbacks.onCancelled(reason);
            }
        });
    }

    if (callbacks.onVotingEnded) {
        contract.on("VotingEnded", (id, voteCount) => {
            if (id.toString() === proposalId.toString()) {
                callbacks.onVotingEnded(voteCount);
            }
        });
    }

    // Return unsubscribe function
    return () => {
        contract.removeAllListeners("VoteCast");
        contract.removeAllListeners("ResultRevealed");
        contract.removeAllListeners("ProposalCancelled");
        contract.removeAllListeners("VotingEnded");
    };
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
    listenForEvents,
    CONTRACT_ADDRESS,
    RPC_URL
};
