const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PrivateVoting", function () {
    let privateVoting, chaumPedersen, mockVerifier;
    let keyholder0, keyholder1, keyholder2, voter1, voter2;

    const KEYHOLDER_COUNT = 3;
    const THRESHOLD = 2;

    before(async function () {
        [keyholder0, keyholder1, keyholder2, voter1, voter2] = await ethers.getSigners();

        // Deploy ChaumPedersen
        const ChaumPedersen = await ethers.getContractFactory("ChaumPedersen");
        chaumPedersen = await ChaumPedersen.deploy();

        // Deploy MockVerifier
        const MockVerifier = await ethers.getContractFactory("MockVerifier");
        mockVerifier = await MockVerifier.deploy();

        // Deploy PrivateVoting
        const PrivateVoting = await ethers.getContractFactory("PrivateVoting");
        privateVoting = await PrivateVoting.deploy(
            keyholder0.address,
            keyholder1.address,
            keyholder2.address,
            mockVerifier.address,
            chaumPedersen.address
        );
    });

    describe("Proposal Creation", function () {
        it("Should create a proposal", async function () {
            const description = "Test Proposal";
            const options = ["Yes", "No"];
            const votingMode = 0; // NORMAL
            const startBlock = (await ethers.provider.getBlockNumber()) + 10;
            const endBlock = startBlock + 100;
            const eligibilityThreshold = 100;
            const minVoterThreshold = 10;

            const tx = await privateVoting.createProposal(
                description,
                options,
                votingMode,
                startBlock,
                endBlock,
                eligibilityThreshold,
                minVoterThreshold
            );

            const receipt = await tx.wait();
            expect(receipt.status).to.equal(1);

            const proposal = await privateVoting.getProposal(0);
            expect(proposal.description).to.equal(description);
            expect(proposal.options.length).to.equal(2);
        });

        it("Should fail with invalid options count", async function () {
            const description = "Invalid Proposal";
            const options = ["Option"]; // Only 1 option
            const votingMode = 0;
            const startBlock = (await ethers.provider.getBlockNumber()) + 10;
            const endBlock = startBlock + 100;
            const eligibilityThreshold = 100;
            const minVoterThreshold = 10;

            await expect(
                privateVoting.createProposal(
                    description,
                    options,
                    votingMode,
                    startBlock,
                    endBlock,
                    eligibilityThreshold,
                    minVoterThreshold
                )
            ).to.be.revertedWith("Invalid options count");
        });
    });

    describe("DKG (Distributed Key Generation)", function () {
        it("Should submit public keys from all keyholders", async function () {
            const description = "DKG Test Proposal";
            const options = ["Yes", "No"];
            const votingMode = 0;
            const startBlock = (await ethers.provider.getBlockNumber()) + 10;
            const endBlock = startBlock + 100;
            const eligibilityThreshold = 100;
            const minVoterThreshold = 10;

            await privateVoting.createProposal(
                description,
                options,
                votingMode,
                startBlock,
                endBlock,
                eligibilityThreshold,
                minVoterThreshold
            );

            const proposalId = 1;
            const publicKey = [5, 6]; // Dummy public key
            const publicKeyShare = [7, 8]; // Dummy public key share

            // Submit from all 3 keyholders
            await privateVoting.connect(keyholder0).submitPublicKey(proposalId, publicKey, publicKeyShare);
            await privateVoting.connect(keyholder1).submitPublicKey(proposalId, publicKey, publicKeyShare);
            await privateVoting.connect(keyholder2).submitPublicKey(proposalId, publicKey, publicKeyShare);

            // Check proposal status changed to ACTIVE
            const proposal = await privateVoting.getProposal(proposalId);
            expect(proposal.status).to.equal(1); // ACTIVE
        });
    });

    describe("Voting", function () {
        it("Should allow casting a vote", async function () {
            const description = "Voting Test Proposal";
            const options = ["Yes", "No"];
            const votingMode = 0;
            const startBlock = (await ethers.provider.getBlockNumber()) + 10;
            const endBlock = startBlock + 100;
            const eligibilityThreshold = 100;
            const minVoterThreshold = 10;

            await privateVoting.createProposal(
                description,
                options,
                votingMode,
                startBlock,
                endBlock,
                eligibilityThreshold,
                minVoterThreshold
            );

            const proposalId = 2;

            // Submit DKG
            const publicKey = [5, 6];
            const publicKeyShare = [7, 8];
            await privateVoting.connect(keyholder0).submitPublicKey(proposalId, publicKey, publicKeyShare);
            await privateVoting.connect(keyholder1).submitPublicKey(proposalId, publicKey, publicKeyShare);
            await privateVoting.connect(keyholder2).submitPublicKey(proposalId, publicKey, publicKeyShare);

            // Mine blocks to reach voting period
            while ((await ethers.provider.getBlockNumber()) < (await privateVoting.getProposal(proposalId)).startBlock) {
                await ethers.provider.send("hardhat_mine", ["0x1"]);
            }

            // Cast vote
            const encryptedVote = [[12n, 13n], [14n, 15n]];
            const proofA = [1, 2];
            const proofB = [[3, 4], [5, 6]];
            const proofC = [7, 8];
            const publicSignals = [1, 2, 3, 4, 5, 6];
            const nullifier = 9999;

            const proposalBeforeVote = await privateVoting.getProposal(proposalId);
            expect(proposalBeforeVote.voteCount).to.equal(0);

            // This should work with mock verifier
            await privateVoting.castVote(
                proposalId,
                encryptedVote,
                proofA,
                proofB,
                proofC,
                publicSignals,
                nullifier
            );

            const proposalAfterVote = await privateVoting.getProposal(proposalId);
            expect(proposalAfterVote.voteCount).to.equal(1);
        });
    });
});
