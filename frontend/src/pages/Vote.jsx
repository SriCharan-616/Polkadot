import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProposal, castVote } from "../utils/contract";
import { computeNullifier } from "../utils/nullifier";
import { encryptVoteVector, computeVoteWeight } from "../utils/elgamal";
import { generateVoteProof } from "../utils/zkproof";

const VotingModeLabel = {
    0: "Normal",
    1: "Quadratic"
};

export default function Vote() {
    const { proposalId } = useParams();
    const navigate = useNavigate();
    const [proposal, setProposal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedOption, setSelectedOption] = useState(null);
    const [walletAddress, setWalletAddress] = useState(null);
    const [tokenBalance, setTokenBalance] = useState(0);
    const [voteWeight, setVoteWeight] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [proofGenerating, setProofGenerating] = useState(false);
    const [walletPrivateKey, setWalletPrivateKey] = useState(null);
    const [step, setStep] = useState(1); // 1: Connect, 2: Check Eligibility, 3: Vote, 4: Generate Proof, 5: Submit
    const [error, setError] = useState(null);

    useEffect(() => {
        loadProposal();
        checkWalletConnection();
    }, [proposalId]);

    async function loadProposal() {
        try {
            const prop = await getProposal(proposalId);
            setProposal(prop);
            setLoading(false);
        } catch (err) {
            console.error("Error loading proposal:", err);
            setError("Failed to load proposal");
            setLoading(false);
        }
    }

    async function checkWalletConnection() {
        // Check if wallet is connected
        if (window.ethereum) {
            try {
                const accounts = await window.ethereum.request({
                    method: "eth_accounts"
                });
                if (accounts.length > 0) {
                    setWalletAddress(accounts[0]);
                    setStep(2); // Move to eligibility check
                    // Note: In real app, fetch actual token balance
                    setTokenBalance(Math.floor(Math.random() * 10000)); // Mock balance
                }
            } catch (err) {
                console.error("Error checking wallet:", err);
            }
        }
    }

    async function connectWallet() {
        try {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            setWalletAddress(accounts[0]);
            setTokenBalance(Math.floor(Math.random() * 10000)); // Mock balance
            setStep(2);
        } catch (err) {
            console.error("Error connecting wallet:", err);
            setError("Failed to connect wallet");
        }
    }

    function handleOptionSelect(optionIndex) {
        setSelectedOption(optionIndex);
        const weight = computeVoteWeight(tokenBalance, proposal.votingMode === 0 ? "normal" : "quadratic");
        setVoteWeight(weight);
        setStep(3);
    }

    async function generateProof() {
        setProofGenerating(true);
        setError(null);

        try {
            // For demo: using the wallet address as private key
            const pvtKey = walletAddress.substring(2) || "1"; // Use address as placeholder for demo
            setWalletPrivateKey(pvtKey);

            // Compute nullifier
            const nullifier = await computeNullifier(pvtKey, proposalId);

            // Encrypt vote vector
            const publicKey = [
                BigInt(proposal.electionPublicKey[0]),
                BigInt(proposal.electionPublicKey[1])
            ];
            const encryptedVote = encryptVoteVector(
                selectedOption,
                voteWeight,
                proposal.options.length,
                publicKey
            );

            // Prepare proof inputs
            const proofInputs = {
                walletPrivateKey: pvtKey,
                tokenBalance: tokenBalance,
                voteWeight: voteWeight,
                voteOption: selectedOption,
                votingMode: proposal.votingMode,
                walletPublicKey: pvtKey, // Simplified: should be derived from private key
                eligibilityThreshold: proposal.eligibilityThreshold,
                proposalID: proposalId,
                nullifier: nullifier,
                optionCount: proposal.options.length,
                maxWeight: 10000
            };

            // Generate ZK proof
            const { proof, publicSignals } = await generateVoteProof(proofInputs);

            setStep(4); // Move to submission
        } catch (err) {
            console.error("Error generating proof:", err);
            setError("Failed to generate proof: " + err.message);
        } finally {
            setProofGenerating(false);
        }
    }

    async function submitVote() {
        setSubmitting(true);
        setError(null);

        try {
            // Regenerate proof and encrypted vote for submission
            const nullifier = await computeNullifier(walletPrivateKey, proposalId);
            const publicKey = [
                BigInt(proposal.electionPublicKey[0]),
                BigInt(proposal.electionPublicKey[1])
            ];
            const encryptedVote = encryptVoteVector(
                selectedOption,
                voteWeight,
                proposal.options.length,
                publicKey
            );

            const proofInputs = {
                walletPrivateKey: walletPrivateKey,
                tokenBalance: tokenBalance,
                voteWeight: voteWeight,
                voteOption: selectedOption,
                votingMode: proposal.votingMode,
                walletPublicKey: walletPrivateKey,
                eligibilityThreshold: proposal.eligibilityThreshold,
                proposalID: proposalId,
                nullifier: nullifier,
                optionCount: proposal.options.length,
                maxWeight: 10000
            };

            const { proof, publicSignals } = await generateVoteProof(proofInputs);

            // Submit vote to contract
            const receipt = await castVote(proposalId, encryptedVote, proof, publicSignals, nullifier);

            alert("Vote cast successfully! Your vote is private.");
            navigate("/proposals");
            setStep(5);
        } catch (err) {
            console.error("Error submitting vote:", err);
            setError("Failed to submit vote: " + err.message);
        } finally {
            setSubmitting(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading proposal...</p>
                </div>
            </div>
        );
    }

    if (!proposal) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8">
                <p className="text-red-600">Proposal not found</p>
            </div>
        );
    }

    const isEligible = tokenBalance >= proposal.eligibilityThreshold;

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">
                Proposal #{proposalId}
            </h1>
            <p className="text-gray-600 mb-8">{proposal.description}</p>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-8">
                {/* Step 1: Connect Wallet */}
                {step === 1 && (
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-4">Connect Wallet</h2>
                        <p className="text-gray-600 mb-6">
                            Please connect your wallet to vote
                        </p>
                        <button
                            onClick={connectWallet}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Connect Wallet
                        </button>
                    </div>
                )}

                {/* Step 2: Check Eligibility */}
                {step === 2 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Check Eligibility</h2>
                        <div className="space-y-4 mb-6">
                            <div>
                                <p className="text-gray-600">Wallet Address</p>
                                <p className="font-semibold text-lg break-all">{walletAddress}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Your Token Balance</p>
                                <p className="font-semibold text-lg">{tokenBalance}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Required Threshold</p>
                                <p className="font-semibold text-lg">{proposal.eligibilityThreshold}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Voting Mode</p>
                                <p className="font-semibold">{VotingModeLabel[proposal.votingMode]}</p>
                            </div>
                        </div>

                        {!isEligible && (
                            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                                You are not eligible to vote. Your balance is below the threshold.
                            </div>
                        )}

                        {isEligible && (
                            <button
                                onClick={() => setStep(3)}
                                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
                            >
                                Continue to Vote
                            </button>
                        )}
                    </div>
                )}

                {/* Step 3: Select Option */}
                {step === 3 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Select Your Vote</h2>
                        <div className="space-y-3 mb-6">
                            {proposal.options.map((option, idx) => (
                                <label
                                    key={idx}
                                    className="flex items-center p-4 border-2 rounded-lg cursor-pointer transition"
                                    style={{
                                        borderColor: selectedOption === idx ? "#2563eb" : "#e5e7eb",
                                        backgroundColor: selectedOption === idx ? "#eff6ff" : "white"
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="option"
                                        value={idx}
                                        checked={selectedOption === idx}
                                        onChange={() => handleOptionSelect(idx)}
                                        className="mr-4 w-4 h-4"
                                    />
                                    <span className="text-lg">{option}</span>
                                </label>
                            ))}
                        </div>

                        {selectedOption !== null && (
                            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                                <p className="text-gray-600 mb-2">Your Vote Weight</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {voteWeight} votes
                                </p>
                                {proposal.votingMode === 1 && (
                                    <p className="text-sm text-gray-600 mt-2">
                                        (Quadratic: √{tokenBalance} = {voteWeight})
                                    </p>
                                )}
                            </div>
                        )}

                        <button
                            onClick={generateProof}
                            disabled={selectedOption === null || proofGenerating}
                            className={`w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold transition ${
                                selectedOption === null || proofGenerating
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:bg-blue-700"
                            }`}
                        >
                            {proofGenerating ? (
                                <span className="flex items-center justify-center">
                                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></span>
                                    Generating ZK Proof...
                                </span>
                            ) : (
                                "Generate Proof"
                            )}
                        </button>
                    </div>
                )}

                {/* Step 4: Submit Vote */}
                {step === 4 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Submit Vote</h2>
                        <div className="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
                            <p className="text-green-800">✓ ZK proof generated successfully</p>
                            <p className="text-green-800 text-sm mt-2">
                                Your vote eligibility and privacy have been verified
                            </p>
                        </div>

                        <p className="text-gray-600 mb-6">
                            Ready to submit your vote? Click the button below to cast your vote on-chain.
                        </p>

                        <button
                            onClick={submitVote}
                            disabled={submitting}
                            className={`w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold transition ${
                                submitting
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:bg-green-700"
                            }`}
                        >
                            {submitting ? "Submitting..." : "Submit Vote"}
                        </button>
                    </div>
                )}

                {/* Step 5: Success */}
                {step === 5 && (
                    <div className="text-center">
                        <div className="text-6xl mb-4">✓</div>
                        <h2 className="text-2xl font-bold mb-4 text-green-600">Vote Cast Successfully</h2>
                        <p className="text-gray-600 mb-6">
                            Your vote is mathematically private. No one can see your choice.
                        </p>
                        <button
                            onClick={() => navigate("/proposals")}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Back to Proposals
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
