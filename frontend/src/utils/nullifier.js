import { buildPoseidon } from "circomlibjs";

const DOMAIN_SEPARATOR = 12345n;

/**
 * Compute nullifier using Poseidon hash
 * Prevents double voting by deriving a unique value per voter-proposal pair
 * Nullifier = Poseidon(Poseidon(walletPrivateKey, DOMAIN_SEPARATOR), proposalId)
 */
async function computeNullifier(walletPrivateKey, proposalId) {
    const poseidon = await buildPoseidon();

    // Step 1: compute voterSecret = Poseidon([walletPrivateKey, DOMAIN_SEPARATOR])
    const voterSecret = poseidon([
        BigInt(walletPrivateKey),
        DOMAIN_SEPARATOR
    ]);

    // Step 2: compute nullifier = Poseidon([voterSecret, proposalId])
    const nullifier = poseidon([
        poseidon.F.toObject(voterSecret),
        BigInt(proposalId)
    ]);

    // Return as string for contract submission
    return poseidon.F.toObject(nullifier).toString();
}

export { computeNullifier, DOMAIN_SEPARATOR };
