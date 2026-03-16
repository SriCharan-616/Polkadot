// ElGamal homomorphic encryption utilities using BigInt for arithmetic

const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const GENERATOR_G = 5n;
const MAX_WEIGHT = 10000;

/**
 * Modular exponentiation: base^exp mod modulus
 * Uses square-and-multiply algorithm with BigInt
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
 * Modular inverse using Extended Euclidean algorithm
 * For large primes, can also use Fermat's little theorem: a^(p-2) mod p
 */
function modInverse(a, mod) {
    // Use Fermat's little theorem: a^(p-2) mod p where p is prime
    return modExp(a, mod - 2n, mod);
}

/**
 * Generate a cryptographically secure random nonce in range [1, FIELD_MODULUS-1]
 */
function generateNonce() {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    
    // Convert bytes to BigInt
    let nonce = 0n;
    for (let i = 0; i < randomBytes.length; i++) {
        nonce = (nonce << 8n) | BigInt(randomBytes[i]);
    }
    
    // Ensure nonce is in valid range [1, FIELD_MODULUS-1]
    nonce = (nonce % (FIELD_MODULUS - 1n)) + 1n;
    return nonce;
}

/**
 * Encrypt a single value using ElGamal
 * Input: value as BigInt, publicKey as [BigInt, BigInt]
 * publicKey = [g, h] where h = g^x mod p (x is secret key)
 * Returns: {c1, c2} as BigInt pair
 */
function encryptValue(value, publicKey) {
    // Generate random nonce
    const r = generateNonce();
    
    // c1 = g^r mod p
    const c1 = modExp(GENERATOR_G, r, FIELD_MODULUS);
    
    // c2 = g^value * h^r mod p
    const gValue = modExp(GENERATOR_G, value, FIELD_MODULUS);
    const hR = modExp(publicKey[1], r, FIELD_MODULUS);
    const c2 = (gValue * hR) % FIELD_MODULUS;
    
    return { c1, c2 };
}

/**
 * Encrypt a vote vector for one option
 * Creates a vector where vote[voteOption] = voteWeight and all others = 0
 * Each element is encrypted separately with a fresh nonce
 */
function encryptVoteVector(voteOption, voteWeight, optionCount, publicKey) {
    const encryptedVote = [];
    
    for (let i = 0; i < optionCount; i++) {
        const value = i === voteOption ? BigInt(voteWeight) : 0n;
        const encrypted = encryptValue(value, publicKey);
        encryptedVote.push(encrypted);
    }
    
    return encryptedVote;
}

/**
 * Compute floor(sqrt(balance))
 * Used for quadratic voting mode
 * Capped at MAX_WEIGHT
 */
function computeFloorSqrt(balance) {
    const sqrtValue = Math.floor(Math.sqrt(balance));
    return Math.min(sqrtValue, MAX_WEIGHT);
}

/**
 * Compute vote weight based on voting mode and token balance
 * votingMode: "normal" or "quadratic"
 * returns: integer vote weight
 */
function computeVoteWeight(tokenBalance, votingMode) {
    if (votingMode === "normal") {
        return Math.min(tokenBalance, MAX_WEIGHT);
    } else if (votingMode === "quadratic") {
        return computeFloorSqrt(Math.min(tokenBalance, 100000000));
    } else {
        throw new Error("Invalid voting mode");
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
