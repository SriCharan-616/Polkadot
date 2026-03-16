/**
 * ZK Proof Generation for Private Voting
 * Uses snarkjs for Groth16 proof generation
 */

import * as snarkjs from "snarkjs";

/**
 * Generate a Groth16 ZK proof for vote eligibility
 * 
 * @param {Object} inputs - Proof inputs
 * @param {string} inputs.walletPrivateKey - Voter's private key
 * @param {number} inputs.tokenBalance - Voter's token balance
 * @param {number} inputs.voteWeight - Computed vote weight
 * @param {number} inputs.voteOption - Chosen option index (0-based)
 * @param {number} inputs.votingMode - 0 for normal, 1 for quadratic
 * @param {string} inputs.walletPublicKey - Derived public key
 * @param {number} inputs.eligibilityThreshold - Minimum required balance
 * @param {string} inputs.proposalID - Proposal identifier
 * @param {string} inputs.nullifier - Computed nullifier
 * @param {number} inputs.optionCount - Number of voting options
 * @param {number} inputs.maxWeight - Maximum vote weight cap
 * @returns {Promise<Object>} { proof, publicSignals } formatted for Solidity
 */
async function generateVoteProof(inputs) {
    try {
        // Call snarkjs to generate proof
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            inputs,
            "/circuits/vote.wasm",
            "/circuits/vote_final.zkey"
        );

        // Format proof components for Solidity
        const proofFormatted = {
            a: [proof.pi_a[0], proof.pi_a[1]],
            b: [
                [proof.pi_b[0][1], proof.pi_b[0][0]],
                [proof.pi_b[1][1], proof.pi_b[1][0]]
            ],
            c: [proof.pi_c[0], proof.pi_c[1]]
        };

        return {
            proof: proofFormatted,
            publicSignals: publicSignals
        };
    } catch (error) {
        console.error("Error generating ZK proof:", error);
        throw error;
    }
}

export { generateVoteProof };
