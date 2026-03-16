// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ChaumPedersen {
    uint256 public constant FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 public constant GENERATOR_G = 5;

    function modExp(uint256 base, uint256 exp, uint256 mod) internal pure returns (uint256) {
        uint256 result = 1;
        base = base % mod;
        while (exp > 0) {
            if (exp % 2 == 1) {
                result = mulmod(result, base, mod);
            }
            exp = exp >> 1;
            base = mulmod(base, base, mod);
        }
        return result;
    }

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
        uint256 expectedChallenge = uint256(
            keccak256(
                abi.encodePacked(
                    generatorG,
                    c1,
                    publicKeyShare,
                    partialDecryption,
                    commitmentA,
                    commitmentB
                )
            )
        ) % FIELD_MODULUS;

        // Step 2: Check challenge matches
        require(challenge == expectedChallenge, "Challenge mismatch");

        // Step 3: Verify first equation
        // g^response == commitmentA * publicKeyShare^challenge
        uint256 lhs1 = modExp(generatorG, response, FIELD_MODULUS);
        uint256 rhs1 = mulmod(
            commitmentA,
            modExp(publicKeyShare, challenge, FIELD_MODULUS),
            FIELD_MODULUS
        );
        require(lhs1 == rhs1, "First equation failed");

        // Step 4: Verify second equation
        // c1^response == commitmentB * partialDecryption^challenge
        uint256 lhs2 = modExp(c1, response, FIELD_MODULUS);
        uint256 rhs2 = mulmod(
            commitmentB,
            modExp(partialDecryption, challenge, FIELD_MODULUS),
            FIELD_MODULUS
        );
        require(lhs2 == rhs2, "Second equation failed");

        // Step 5: Return true if all pass
        return true;
    }
}
