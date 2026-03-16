import * as snarkjs from "snarkjs";

/**
 * Generate a Groth16 ZK proof for vote eligibility and validity
 * Takes voter input signals and generates a proof that can be verified on-chain
 */
async function generateVoteProof(inputs) {
    /*
    inputs = {
        walletPrivateKey: string,
        tokenBalance: number,
        voteWeight: number,
        voteOption: number,
        votingMode: number,        // 0 or 1
        walletPublicKey: string,
        eligibilityThreshold: number,
        proposalID: string,
        nullifier: string,
        optionCount: number,
        maxWeight: number
    }
    */

    try {
        // Generate proof using compiled circuit
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            inputs,
            "/circuits/vote.wasm",
            "/circuits/vote_final.zkey"
        );

        // Format proof for Solidity contract
        // Groth16 proof structure: (A, B, C)
        // A is 2D point [x, y]
        // B is 2D point of 2D points [[x1, x0], [y1, y0]]
        // C is 2D point [x, y]
        const proofFormatted = {
            a: [proof.pi_a[0], proof.pi_a[1]],
            b: [
                [proof.pi_b[0][1], proof.pi_b[0][0]],
                [proof.pi_b[1][1], proof.pi_b[1][0]]
            ],
            c: [proof.pi_c[0], proof.pi_c[1]]
        };

        return { proof: proofFormatted, publicSignals };
    } catch (error) {
        console.error("Error generating proof:", error);
        throw error;
    }
}

/**
 * Verify a proof locally (for testing purposes)
 */
async function verifyProofLocal(proof, publicSignals) {
    try {
        const res = await snarkjs.groth16.verify(
            "/circuits/vote_verification_key.json",
            publicSignals,
            proof
        );
        return res;
    } catch (error) {
        console.error("Error verifying proof:", error);
        return false;
    }
}

export { generateVoteProof, verifyProofLocal };
