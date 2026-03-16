// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ChaumPedersen {
    // BN254 field modulus
    uint256 private constant FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    
    // Primitive generator for BN254 scalar field
    uint256 private constant GENERATOR_G = 5;

    /**
     * @dev Verify Chaum-Pedersen proof
     * Proves that a partial decryption is correctly computed without revealing the key share
     */
    function verify(
        uint256 generatorG,
        uint256 c1,
        uint256 publicKeyShare,
        uint256 partialDecryption,
        uint256 commitmentA,
        uint256 commitmentB,
        uint256 challenge,
        uint256 response
    ) public pure returns (bool) {
        // Step 1: Recompute expected challenge
        uint256 expectedChallenge = uint256(keccak256(abi.encodePacked(
            generatorG,
            c1,
            publicKeyShare,
            partialDecryption,
            commitmentA,
            commitmentB
        ))) % FIELD_MODULUS;

        // Step 2: Check challenge matches
        if (challenge != expectedChallenge) {
            return false;
        }

        // Step 3: Verify first equation
        // g^response == commitmentA * (publicKeyShare^challenge)
        uint256 lhs1 = modExp(generatorG, response, FIELD_MODULUS);
        uint256 rhs1 = mulmod(
            commitmentA,
            modExp(publicKeyShare, challenge, FIELD_MODULUS),
            FIELD_MODULUS
        );

        if (lhs1 != rhs1) {
            return false;
        }

        // Step 4: Verify second equation
        // c1^response == commitmentB * (partialDecryption^challenge)
        uint256 lhs2 = modExp(c1, response, FIELD_MODULUS);
        uint256 rhs2 = mulmod(
            commitmentB,
            modExp(partialDecryption, challenge, FIELD_MODULUS),
            FIELD_MODULUS
        );

        if (lhs2 != rhs2) {
            return false;
        }

        // Step 5: Return true if all checks pass
        return true;
    }

    /**
     * @dev Modular exponentiation: base^exp mod modulus
     * Uses square-and-multiply algorithm
     */
    function modExp(uint256 base, uint256 exp, uint256 modulus) internal pure returns (uint256) {
        uint256 result = 1;
        base = base % modulus;
        
        while (exp > 0) {
            if (exp % 2 == 1) {
                result = mulmod(result, base, modulus);
            }
            exp = exp >> 1;
            base = mulmod(base, base, modulus);
        }
        
        return result;
    }
}
