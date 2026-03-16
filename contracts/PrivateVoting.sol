// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVerifier {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[] calldata input
    ) external view returns (bool);
}

interface IChaumPedersen {
    function verify(
        uint256 generatorG,
        uint256 c1,
        uint256 publicKeyShare,
        uint256 partialDecryption,
        uint256 commitmentA,
        uint256 commitmentB,
        uint256 challenge,
        uint256 response
    ) external pure returns (bool);
}

contract PrivateVoting {
    // Constants
    uint256 public constant NUM_KEYHOLDERS = 3;
    uint256 public constant THRESHOLD = 2;
    uint256 public constant MIN_VOTERS = 10;
    uint256 public constant MIN_OPTIONS = 2;
    uint256 public constant MAX_OPTIONS = 10;
    uint256 public constant MAX_WEIGHT = 10000;
    uint256 public constant FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 public constant GENERATOR_G = 5;
    uint256 public constant TIMEOUT_BLOCKS = 50000;

    // Enums
    enum ProposalStatus {
        PENDING_DKG,
        ACTIVE,
        ENDED,
        REVEALED,
        CANCELLED
    }

    enum VotingMode {
        NORMAL,
        QUADRATIC
    }

    // Structs
    struct ElGamalCiphertext {
        uint256 c1;
        uint256 c2;
    }

    struct Proposal {
        uint256 id;
        address creator;
        string description;
        string[] options;
        VotingMode votingMode;
        uint256 startBlock;
        uint256 endBlock;
        uint256 eligibilityThreshold;
        uint256 minVoterThreshold;
        ProposalStatus status;
        uint256[2] electionPublicKey;
        uint256[3][2] publicKeyShares;
        bool[3] keyholderSubmittedPublicKey;
        ElGamalCiphertext[] encryptedTally;
        uint256 voteCount;
        uint256[2][] partialDecryptions;
        bool[3] keyholderSubmittedDecryption;
        uint256 partialCount;
        uint256[] finalResult;
        uint256 winningOption;
        uint256 endedAtBlock;
    }

    // State variables
    address[3] public keyholders;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(uint256 => bool)) public usedNullifiers;
    uint256 public proposalCount;
    address public verifierContract;
    address public chaumPedersenContract;

    // Events
    event ProposalCreated(uint256 indexed proposalId, address creator, string description);
    event VotingStarted(uint256 indexed proposalId, uint256[2] publicKey);
    event VoteCast(uint256 indexed proposalId, uint256 voteCount);
    event VotingEnded(uint256 indexed proposalId, uint256 voteCount);
    event PartialDecryptionSubmitted(uint256 indexed proposalId, uint256 keyholderIndex);
    event ResultRevealed(uint256 indexed proposalId, uint256[] result, uint256 winningOption);
    event ProposalCancelled(uint256 indexed proposalId, string reason);

    // Constructor
    constructor(
        address keyholder0,
        address keyholder1,
        address keyholder2,
        address verifier,
        address chaumPedersen
    ) {
        keyholders[0] = keyholder0;
        keyholders[1] = keyholder1;
        keyholders[2] = keyholder2;
        verifierContract = verifier;
        chaumPedersenContract = chaumPedersen;
    }

    // WRITE FUNCTIONS

    function createProposal(
        string memory description,
        string[] memory options,
        VotingMode votingMode,
        uint256 startBlock,
        uint256 endBlock,
        uint256 eligibilityThreshold,
        uint256 minVoterThreshold
    ) external returns (uint256) {
        // Validations
        require(
            options.length >= MIN_OPTIONS && options.length <= MAX_OPTIONS,
            "Invalid options count"
        );
        require(startBlock >= block.number, "Start block in past");
        require(endBlock > startBlock, "End block must be after start");
        require(eligibilityThreshold >= 1, "Invalid eligibility threshold");
        require(minVoterThreshold >= MIN_VOTERS, "Minimum voters too low");

        // Create proposal
        uint256 proposalId = proposalCount++;
        Proposal storage p = proposals[proposalId];

        p.id = proposalId;
        p.creator = msg.sender;
        p.description = description;
        p.options = options;
        p.votingMode = votingMode;
        p.startBlock = startBlock;
        p.endBlock = endBlock;
        p.eligibilityThreshold = eligibilityThreshold;
        p.minVoterThreshold = minVoterThreshold;
        p.status = ProposalStatus.PENDING_DKG;
        p.voteCount = 0;
        p.partialCount = 0;

        // Initialize encryptedTally with identity elements (1, 1)
        for (uint256 i = 0; i < options.length; i++) {
            p.encryptedTally.push(ElGamalCiphertext(1, 1));
        }

        emit ProposalCreated(proposalId, msg.sender, description);
        return proposalId;
    }

    function submitPublicKey(
        uint256 proposalId,
        uint256[2] memory publicKey,
        uint256[2] memory publicKeyShare
    ) external {
        Proposal storage p = proposals[proposalId];

        // Validations
        require(p.status == ProposalStatus.PENDING_DKG, "Not in DKG phase");

        // Identify keyholder index
        uint256 keyholderIndex = NUM_KEYHOLDERS;
        for (uint256 i = 0; i < NUM_KEYHOLDERS; i++) {
            if (msg.sender == keyholders[i]) {
                keyholderIndex = i;
                break;
            }
        }
        require(keyholderIndex < NUM_KEYHOLDERS, "Not a keyholder");
        require(!p.keyholderSubmittedPublicKey[keyholderIndex], "Already submitted");

        // If 2nd or 3rd submission: publicKey matches previously submitted
        if (keyholderIndex > 0) {
            for (uint256 i = 0; i < keyholderIndex; i++) {
                if (p.keyholderSubmittedPublicKey[i]) {
                    require(
                        p.electionPublicKey[0] == publicKey[0] &&
                            p.electionPublicKey[1] == publicKey[1],
                        "Public key mismatch"
                    );
                }
            }
        }

        // Store publicKey and publicKeyShare
        p.electionPublicKey = publicKey;
        p.publicKeyShares[keyholderIndex] = publicKeyShare;
        p.keyholderSubmittedPublicKey[keyholderIndex] = true;

        // Check if all 3 submitted
        uint256 submitted = 0;
        for (uint256 i = 0; i < NUM_KEYHOLDERS; i++) {
            if (p.keyholderSubmittedPublicKey[i]) {
                submitted++;
            }
        }

        if (submitted == NUM_KEYHOLDERS) {
            p.status = ProposalStatus.ACTIVE;
            emit VotingStarted(proposalId, publicKey);
        }
    }

    function castVote(
        uint256 proposalId,
        uint256[2][] memory encryptedVote,
        uint256[2] memory proofA,
        uint256[2][2] memory proofB,
        uint256[2] memory proofC,
        uint256[] memory publicSignals,
        uint256 nullifier
    ) external {
        Proposal storage p = proposals[proposalId];

        // Validations
        require(p.status == ProposalStatus.ACTIVE, "Voting not active");
        require(block.number >= p.startBlock && block.number <= p.endBlock, "Outside voting period");
        require(encryptedVote.length == p.options.length, "Vote vector length mismatch");
        require(!usedNullifiers[proposalId][nullifier], "Nullifier already used");

        // Verify ZK proof
        require(IVerifier(verifierContract).verifyProof(proofA, proofB, proofC, publicSignals), "Invalid proof");

        // Mark nullifier as used
        usedNullifiers[proposalId][nullifier] = true;

        // Update encryptedTally homomorphically
        for (uint256 i = 0; i < encryptedVote.length; i++) {
            p.encryptedTally[i].c1 = mulmod(p.encryptedTally[i].c1, encryptedVote[i][0], FIELD_MODULUS);
            p.encryptedTally[i].c2 = mulmod(p.encryptedTally[i].c2, encryptedVote[i][1], FIELD_MODULUS);
        }

        p.voteCount++;
        emit VoteCast(proposalId, p.voteCount);
    }

    function endVoting(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];

        // Validations
        require(p.status == ProposalStatus.ACTIVE, "Voting not active");
        require(block.number > p.endBlock, "Voting still ongoing");

        if (p.voteCount < p.minVoterThreshold) {
            p.status = ProposalStatus.CANCELLED;
            emit ProposalCancelled(proposalId, "insufficient voters");
        } else {
            p.status = ProposalStatus.ENDED;
            p.endedAtBlock = block.number;
            emit VotingEnded(proposalId, p.voteCount);
        }
    }

    function submitPartialDecryption(
        uint256 proposalId,
        uint256[2][] memory partialDecryption,
        uint256[2] memory commitmentA,
        uint256[2] memory commitmentB,
        uint256 challenge,
        uint256 response
    ) external {
        Proposal storage p = proposals[proposalId];

        // Validations
        require(p.status == ProposalStatus.ENDED, "Voting not ended");

        // Identify keyholder index
        uint256 keyholderIndex = NUM_KEYHOLDERS;
        for (uint256 i = 0; i < NUM_KEYHOLDERS; i++) {
            if (msg.sender == keyholders[i]) {
                keyholderIndex = i;
                break;
            }
        }
        require(keyholderIndex < NUM_KEYHOLDERS, "Not a keyholder");
        require(!p.keyholderSubmittedDecryption[keyholderIndex], "Already submitted");

        require(partialDecryption.length == p.options.length, "Partial decryption length mismatch");

        // Verify Chaum-Pedersen proof
        require(
            IChaumPedersen(chaumPedersenContract).verify(
                GENERATOR_G,
                p.encryptedTally[0].c1,
                p.publicKeyShares[keyholderIndex][0],
                partialDecryption[0][0],
                commitmentA[0],
                commitmentB[0],
                challenge,
                response
            ),
            "Invalid Chaum-Pedersen proof"
        );

        // Store partial decryption
        if (p.partialCount == 0) {
            p.partialDecryptions = new uint256[2][](partialDecryption.length);
        }

        for (uint256 i = 0; i < partialDecryption.length; i++) {
            if (p.partialCount == 0) {
                p.partialDecryptions[i] = partialDecryption[i];
            } else {
                // Store second partial decryption (we only need 2 of 3)
                if (keyholderIndex > (p.partialCount == 0 ? 0 : 1)) {
                    p.partialDecryptions[i] = partialDecryption[i];
                }
            }
        }

        p.keyholderSubmittedDecryption[keyholderIndex] = true;
        p.partialCount++;
        emit PartialDecryptionSubmitted(proposalId, keyholderIndex);

        if (p.partialCount >= THRESHOLD) {
            _finalizeResult(proposalId);
        }
    }

    function _finalizeResult(uint256 proposalId) internal {
        Proposal storage p = proposals[proposalId];

        // Allocate finalResult array
        p.finalResult = new uint256[](p.options.length);

        // Find indices of first 2 keyholders who submitted decryptions
        uint256[] memory indices = new uint256[](2);
        uint256 count = 0;
        for (uint256 i = 0; i < NUM_KEYHOLDERS && count < 2; i++) {
            if (p.keyholderSubmittedDecryption[i]) {
                indices[count] = i;
                count++;
            }
        }

        // For each option, compute final result
        for (uint256 i = 0; i < p.options.length; i++) {
            // Lagrange interpolation coefficients
            // indices are like [0, 1] or [1, 2], need to compute for indices as 1, 2, 3
            uint256 i0 = indices[0] + 1; // Convert to 1-indexed
            uint256 i1 = indices[1] + 1;

            uint256 lagrange0 = mulmod(
                i1,
                modInverse(i1 - i0, FIELD_MODULUS),
                FIELD_MODULUS
            );
            uint256 lagrange1 = mulmod(
                i0,
                modInverse(i0 - i1, FIELD_MODULUS),
                FIELD_MODULUS
            );

            // Reconstruct c1^x from partial decryptions
            uint256 c1_x = mulmod(
                modExp(p.partialDecryptions[i][0], lagrange0, FIELD_MODULUS),
                modExp(p.partialDecryptions[i][1], lagrange1, FIELD_MODULUS),
                FIELD_MODULUS
            );

            // Compute g_total = c2 / c1^x
            uint256 g_total = mulmod(
                p.encryptedTally[i].c2,
                modInverse(c1_x, FIELD_MODULUS),
                FIELD_MODULUS
            );

            // Compute discrete log using brute force (for hackathon)
            // Note: This should be done off-chain for production
            p.finalResult[i] = _discreteLog(g_total);
        }

        // Find winning option
        uint256 maxVotes = 0;
        uint256 winningOption = 0;
        for (uint256 i = 0; i < p.finalResult.length; i++) {
            if (p.finalResult[i] > maxVotes) {
                maxVotes = p.finalResult[i];
                winningOption = i;
            }
        }

        p.winningOption = winningOption;
        p.status = ProposalStatus.REVEALED;
        emit ResultRevealed(proposalId, p.finalResult, winningOption);
    }

    function _discreteLog(uint256 h) internal pure returns (uint256) {
        // Brute force discrete log computation
        // For production: use off-chain computation with Schnorr proof
        uint256 maxIterations = 10000000; // MAX_WEIGHT * MAX_VOTERS
        uint256 g = GENERATOR_G;
        uint256 current = 1;

        for (uint256 i = 0; i <= maxIterations; i++) {
            if (current == h) {
                return i;
            }
            current = mulmod(current, g, FIELD_MODULUS);
        }

        return 0; // Not found
    }

    function cancelProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];

        // Validations
        require(p.status == ProposalStatus.ENDED, "Proposal not ended");
        require(block.number > p.endedAtBlock + TIMEOUT_BLOCKS, "Timeout not reached");

        p.status = ProposalStatus.CANCELLED;
        emit ProposalCancelled(proposalId, "timeout");
    }

    // VIEW FUNCTIONS

    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    function getEncryptedTally(uint256 proposalId) external view returns (ElGamalCiphertext[] memory) {
        return proposals[proposalId].encryptedTally;
    }

    function getResult(uint256 proposalId) external view returns (uint256[] memory, uint256) {
        Proposal storage p = proposals[proposalId];
        require(p.status == ProposalStatus.REVEALED, "Result not revealed");
        return (p.finalResult, p.winningOption);
    }

    // HELPER FUNCTIONS

    function modInverse(uint256 a, uint256 m) internal pure returns (uint256) {
        // Use Fermat's little theorem: a^(m-2) mod m
        return modExp(a, m - 2, m);
    }

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
}
