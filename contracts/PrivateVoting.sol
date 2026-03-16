// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVerifier {
    function verifyProof(
        uint256[2] memory a,
        uint256[2][2] memory b,
        uint256[2] memory c,
        uint256[] memory input
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
    // ================== CONSTANTS ==================
    uint256 private constant NUM_KEYHOLDERS = 3;
    uint256 private constant THRESHOLD = 2;
    uint256 private constant MIN_VOTERS = 10;
    uint256 private constant MIN_OPTIONS = 2;
    uint256 private constant MAX_OPTIONS = 10;
    uint256 private constant MAX_WEIGHT = 10000;
    uint256 private constant FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 private constant TIMEOUT_BLOCKS = 50000;
    uint256 private constant GENERATOR_G = 5;

    // ================== ENUMS ==================
    enum ProposalStatus { PENDING_DKG, ACTIVE, ENDED, REVEALED, CANCELLED }
    enum VotingMode { NORMAL, QUADRATIC }

    // ================== STRUCTS ==================
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

    // ================== STATE VARIABLES ==================
    address[3] public keyholders;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(uint256 => bool)) public usedNullifiers;
    uint256 public proposalCount;
    address public verifierContract;
    address public chaumPedersenContract;

    // ================== EVENTS ==================
    event ProposalCreated(uint256 indexed proposalId, address creator, string description);
    event VotingStarted(uint256 indexed proposalId, uint256[2] publicKey);
    event VoteCast(uint256 indexed proposalId, uint256 voteCount);
    event VotingEnded(uint256 indexed proposalId, uint256 voteCount);
    event PartialDecryptionSubmitted(uint256 indexed proposalId, uint256 keyholderIndex);
    event ResultRevealed(uint256 indexed proposalId, uint256[] result, uint256 winningOption);
    event ProposalCancelled(uint256 indexed proposalId, string reason);

    // ================== CONSTRUCTOR ==================
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

    // ================== FUNCTIONS ==================

    /**
     * @dev Creates a new proposal
     */
    function createProposal(
        string memory description,
        string[] memory options,
        VotingMode votingMode,
        uint256 startBlock,
        uint256 endBlock,
        uint256 eligibilityThreshold,
        uint256 minVoterThreshold
    ) external returns (uint256 proposalId) {
        require(options.length >= MIN_OPTIONS && options.length <= MAX_OPTIONS, "Invalid option count");
        require(startBlock >= block.number, "Start block must be in future");
        require(endBlock > startBlock, "End block must be after start block");
        require(eligibilityThreshold >= 1, "Eligibility threshold must be at least 1");
        require(minVoterThreshold >= MIN_VOTERS, "Min voter threshold must be at least 10");

        proposalId = proposalCount++;
        Proposal storage proposal = proposals[proposalId];

        proposal.id = proposalId;
        proposal.creator = msg.sender;
        proposal.description = description;
        proposal.options = options;
        proposal.votingMode = votingMode;
        proposal.startBlock = startBlock;
        proposal.endBlock = endBlock;
        proposal.eligibilityThreshold = eligibilityThreshold;
        proposal.minVoterThreshold = minVoterThreshold;
        proposal.status = ProposalStatus.PENDING_DKG;

        // Initialize encryptedTally with identity elements (1, 1)
        for (uint256 i = 0; i < options.length; i++) {
            proposal.encryptedTally.push(ElGamalCiphertext(1, 1));
        }

        emit ProposalCreated(proposalId, msg.sender, description);

        return proposalId;
    }

    /**
     * @dev Submit public key component for DKG
     */
    function submitPublicKey(
        uint256 proposalId,
        uint256[2] memory publicKey,
        uint256[2] memory publicKeyShare
    ) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.PENDING_DKG, "Not in DKG phase");

        uint256 keyholderIndex = getKeyholderIndex(msg.sender);
        require(keyholderIndex < NUM_KEYHOLDERS, "Not a keyholder");
        require(!proposal.keyholderSubmittedPublicKey[keyholderIndex], "Already submitted");

        // Verify public key consistency across submissions
        if (keyholderIndex > 0 && proposal.keyholderSubmittedPublicKey[0]) {
            require(publicKey[0] == proposal.electionPublicKey[0], "Public key mismatch");
            require(publicKey[1] == proposal.electionPublicKey[1], "Public key mismatch");
        }

        proposal.publicKeyShares[keyholderIndex] = publicKeyShare;
        proposal.keyholderSubmittedPublicKey[keyholderIndex] = true;
        proposal.electionPublicKey = publicKey;

        // Check if all 3 keyholders submitted
        if (proposal.keyholderSubmittedPublicKey[0] && 
            proposal.keyholderSubmittedPublicKey[1] && 
            proposal.keyholderSubmittedPublicKey[2]) {
            proposal.status = ProposalStatus.ACTIVE;
            emit VotingStarted(proposalId, publicKey);
        }
    }

    /**
     * @dev Cast a vote with ZK proof
     */
    function castVote(
        uint256 proposalId,
        uint256[2][] memory encryptedVote,
        uint256[2] memory proofA,
        uint256[2][2] memory proofB,
        uint256[2] memory proofC,
        uint256[] memory publicSignals,
        uint256 nullifier
    ) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.ACTIVE, "Voting not active");
        require(block.number >= proposal.startBlock && block.number <= proposal.endBlock, "Outside voting period");
        require(encryptedVote.length == proposal.options.length, "Mismatched vote vector length");
        require(!usedNullifiers[proposalId][nullifier], "Nullifier already used");

        // Verify ZK proof
        require(
            IVerifier(verifierContract).verifyProof(proofA, proofB, proofC, publicSignals),
            "Invalid ZK proof"
        );

        // Mark nullifier as used
        usedNullifiers[proposalId][nullifier] = true;

        // Update encryptedTally homomorphically
        for (uint256 i = 0; i < encryptedVote.length; i++) {
            proposal.encryptedTally[i].c1 = mulmod(
                proposal.encryptedTally[i].c1,
                encryptedVote[i][0],
                FIELD_MODULUS
            );
            proposal.encryptedTally[i].c2 = mulmod(
                proposal.encryptedTally[i].c2,
                encryptedVote[i][1],
                FIELD_MODULUS
            );
        }

        proposal.voteCount++;
        emit VoteCast(proposalId, proposal.voteCount);
    }

    /**
     * @dev End voting period
     */
    function endVoting(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.ACTIVE, "Not in active state");
        require(block.number > proposal.endBlock, "Voting period not ended");

        if (proposal.voteCount < proposal.minVoterThreshold) {
            proposal.status = ProposalStatus.CANCELLED;
            emit ProposalCancelled(proposalId, "insufficient voters");
        } else {
            proposal.status = ProposalStatus.ENDED;
            proposal.endedAtBlock = block.number;
            emit VotingEnded(proposalId, proposal.voteCount);
        }
    }

    /**
     * @dev Submit partial decryption with Chaum-Pedersen proof
     */
    function submitPartialDecryption(
        uint256 proposalId,
        uint256[2][] memory partialDecryption,
        uint256[2] memory commitmentA,
        uint256[2] memory commitmentB,
        uint256 challenge,
        uint256 response
    ) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.ENDED, "Not in ended state");

        uint256 keyholderIndex = getKeyholderIndex(msg.sender);
        require(keyholderIndex < NUM_KEYHOLDERS, "Not a keyholder");
        require(!proposal.keyholderSubmittedDecryption[keyholderIndex], "Already submitted");
        require(partialDecryption.length == proposal.options.length, "Mismatched decryption length");

        // Verify Chaum-Pedersen proof for first element
        require(
            IChaumPedersen(chaumPedersenContract).verify(
                GENERATOR_G,
                proposal.encryptedTally[0].c1,
                proposal.publicKeyShares[keyholderIndex][0],
                partialDecryption[0][0],
                commitmentA[0],
                commitmentA[1],
                challenge,
                response
            ),
            "Invalid Chaum-Pedersen proof"
        );

        // Store partial decryption
        if (proposal.partialDecryptions.length == 0) {
            for (uint256 i = 0; i < partialDecryption.length; i++) {
                proposal.partialDecryptions.push(partialDecryption[i]);
            }
        } else {
            for (uint256 i = 0; i < partialDecryption.length; i++) {
                proposal.partialDecryptions.push(partialDecryption[i]);
            }
        }

        proposal.keyholderSubmittedDecryption[keyholderIndex] = true;
        proposal.partialCount++;

        emit PartialDecryptionSubmitted(proposalId, keyholderIndex);

        if (proposal.partialCount >= THRESHOLD) {
            _finalizeResult(proposalId);
        }
    }

    /**
     * @dev Finalize and reveal result (moves discrete log computation off-chain)
     */
    function _finalizeResult(uint256 proposalId) internal {
        Proposal storage proposal = proposals[proposalId];
        
        // Initialize final result array
        proposal.finalResult = new uint256[](proposal.options.length);
        
        // For actual deployment, discrete log computation should be done off-chain
        // and submitted as part of a result verification transaction
        // This is a placeholder for the finalization logic
        
        proposal.status = ProposalStatus.REVEALED;
        proposal.winningOption = findWinningOption(proposal.finalResult);
        
        emit ResultRevealed(proposalId, proposal.finalResult, proposal.winningOption);
    }

    /**
     * @dev Find the winning option (index of max result)
     */
    function findWinningOption(uint256[] memory results) internal pure returns (uint256) {
        uint256 maxVotes = 0;
        uint256 winningIdx = 0;
        
        for (uint256 i = 0; i < results.length; i++) {
            if (results[i] > maxVotes) {
                maxVotes = results[i];
                winningIdx = i;
            }
        }
        
        return winningIdx;
    }

    /**
     * @dev Cancel proposal (timeout)
     */
    function cancelProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.ENDED, "Not in ended state");
        require(block.number > proposal.endedAtBlock + TIMEOUT_BLOCKS, "Timeout not expired");

        proposal.status = ProposalStatus.CANCELLED;
        emit ProposalCancelled(proposalId, "timeout");
    }

    /**
     * @dev Get full proposal
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    /**
     * @dev Get encrypted tally
     */
    function getEncryptedTally(uint256 proposalId) external view returns (ElGamalCiphertext[] memory) {
        return proposals[proposalId].encryptedTally;
    }

    /**
     * @dev Get result (only if revealed)
     */
    function getResult(uint256 proposalId) external view returns (uint256[] memory, uint256) {
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.REVEALED, "Result not yet revealed");
        return (proposal.finalResult, proposal.winningOption);
    }

    /**
     * @dev Get keyholder index from address
     */
    function getKeyholderIndex(address addr) internal view returns (uint256) {
        for (uint256 i = 0; i < NUM_KEYHOLDERS; i++) {
            if (keyholders[i] == addr) {
                return i;
            }
        }
        return uint256(type(uint256).max);
    }

    /**
     * @dev Modular inverse using Fermat's little theorem: a^(p-2) mod p
     */
    function modInverse(uint256 a) internal pure returns (uint256) {
        return modExp(a, FIELD_MODULUS - 2, FIELD_MODULUS);
    }

    /**
     * @dev Modular exponentiation: base^exp mod modulus
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
