/* global BigInt */
const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const GENERATOR_G = 5n;
const MAX_WEIGHT = 10000;

/**
 * Modular exponentiation using square-and-multiply algorithm
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
 * Modular inverse using extended Euclidean algorithm
 */
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

/**
 * Generate cryptographically secure random BigInt in range [1, FIELD_MODULUS-1]
 */
function generateNonce() {
    const bytesNeeded = 32; // 256 bits for BN254 field
    const randomBytes = new Uint8Array(bytesNeeded);
    crypto.getRandomValues(randomBytes);

    let result = 0n;
    for (let i = 0; i < bytesNeeded; i++) {
        result = (result << 8n) | BigInt(randomBytes[i]);
    }

    // Reduce to field modulus
    result = (result % (FIELD_MODULUS - 1n)) + 1n;
    return result;
}

/**
 * Encrypt a single value using ElGamal
 * @param {BigInt} value - The plaintext value to encrypt
 * @param {Array<BigInt>} publicKey - [g, h] where h = g^x mod p
 * @returns {Object} { c1, c2 } - Ciphertext components
 */
function encryptValue(value, publicKey) {
    const r = generateNonce();

    const c1 = modExp(GENERATOR_G, r, FIELD_MODULUS);
    const c2 = (modExp(GENERATOR_G, value, FIELD_MODULUS) * modExp(publicKey[1], r, FIELD_MODULUS)) % FIELD_MODULUS;

    return { c1, c2 };
}

/**
 * Encrypt a vote vector for multiple options
 * @param {number} voteOption - Index of chosen option (0-based)
 * @param {BigInt} voteWeight - Vote weight (balance or floor(sqrt(balance)))
 * @param {number} optionCount - Total number of options
 * @param {Array<BigInt>} publicKey - ElGamal public key
 * @returns {Array<Object>} Array of { c1, c2 } ciphertexts
 */
function encryptVoteVector(voteOption, voteWeight, optionCount, publicKey) {
    const vector = new Array(optionCount).fill(0n);
    vector[voteOption] = voteWeight;

    const encryptedVote = [];
    for (let i = 0; i < optionCount; i++) {
        encryptedVote.push(encryptValue(vector[i], publicKey));
    }

    return encryptedVote;
}

/**
 * Compute floor(sqrt(balance))
 */
function computeFloorSqrt(balance) {
    const floored = Math.floor(Math.sqrt(balance));
    return Math.min(floored, MAX_WEIGHT);
}

/**
 * Compute vote weight based on voting mode
 * @param {number} tokenBalance - User's token balance
 * @param {string} votingMode - "normal" or "quadratic"
 * @returns {number} Computed vote weight
 */
function computeVoteWeight(tokenBalance, votingMode) {
    if (votingMode === "quadratic") {
        return computeFloorSqrt(Math.min(tokenBalance, 100000000));
    } else {
        // normal mode
        return Math.min(tokenBalance, MAX_WEIGHT);
    }
}

export {
    modExp,
    modInverse,
    generateNonce,
    encryptValue,
    encryptVoteVector,
    computeFloorSqrt,
    computeVoteWeight,
    FIELD_MODULUS,
    GENERATOR_G,
    MAX_WEIGHT
};
