/* global BigInt */

import { buildPoseidon } from "circomlibjs";

const DOMAIN_SEPARATOR = 12345n;

/**
 * Compute nullifier for a voter's vote on a specific proposal
 * nullifier = Poseidon([Poseidon([walletPrivateKey, DOMAIN_SEPARATOR]), proposalId])
 * 
 * @param {string|BigInt} walletPrivateKey - Voter's private key
 * @param {string|number|BigInt} proposalId - Proposal ID
 * @returns {Promise<string>} Nullifier as string
 */
async function computeNullifier(walletPrivateKey, proposalId) {
    const poseidon = await buildPoseidon();

    // Convert inputs to BigInt
    const privKey = typeof walletPrivateKey === "string" 
        ? BigInt(walletPrivateKey) 
        : walletPrivateKey;
    const propId = typeof proposalId === "string" 
        ? BigInt(proposalId) 
        : BigInt(proposalId);

    // Step 1: Compute voter secret
    const voterSecretInput = [privKey, DOMAIN_SEPARATOR];
    const voterSecretHash = poseidon(voterSecretInput);
    const voterSecret = poseidon.F.toObject(voterSecretHash);

    // Step 2: Compute nullifier
    const nullifierInput = [voterSecret, propId];
    const nullifierHash = poseidon(nullifierInput);
    const nullifier = poseidon.F.toObject(nullifierHash);

    return nullifier.toString();
}

export { computeNullifier, DOMAIN_SEPARATOR };
