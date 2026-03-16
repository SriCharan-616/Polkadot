/**
 * Vote Page
 * Allows users to vote on a specific proposal
 */

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProposal, castVote } from "../utils/contract";
import { computeNullifier } from "../utils/nullifier";
import { encryptVoteVector, computeVoteWeight } from "../utils/elgamal";
import { generateVoteProof } from "../utils/zkproof";
import VoteForm from "../components/VoteForm";

const Vote = () => {
    const { proposalId } = useParams();
    const navigate = useNavigate();

    const [proposal, setProposal] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [voteOption, setVoteOption] = useState(0);
    const [walletAddress, setWalletAddress] = useState(null);
    const [tokenBalance, setTokenBalance] = useState(0);
    const [voteWeight, setVoteWeight] = useState(0);
    const [generatingProof, setGeneratingProof] = useState(false);
    const [submittingVote, setSubmittingVote] = useState(false);

    const votingModeLabels = { 0: "Normal", 1: "Quadratic" };

    useEffect(() => {
        const initPage = async () => {
            try {
                setLoading(true);
                const prop = await getProposal(proposalId);
                setProposal(prop);

                // Get wallet address
                if (window.ethereum) {
                    const accounts = await window.ethereum.request({
                        method: "eth_accounts"
                    });
                    setWalletAddress(accounts[0]);

                    // Get token balance (mock for now)
                    const balance = Math.floor(Math.random() * 100000);
                    setTokenBalance(balance);
                    
                    // Compute vote weight
                    const weight = computeVoteWeight(
                        balance,
                        prop.votingMode === 0 ? "normal" : "quadratic"
                    );
                    setVoteWeight(weight);
                }
            } catch (err) {
                console.error("Failed to load proposal:", err);
                setError("Failed to load proposal");
            } finally {
                setLoading(false);
            }
        };

        initPage();
    }, [proposalId]);

    const handleGenerateProof = async () => {
        try {
            setGeneratingProof(true);
            setError(null);

            // Step 1: Compute nullifier
            const nullifier = await computeNullifier(walletAddress, proposalId);

            // Step 2: Encrypt vote
            const encryptedVote = encryptVoteVector(
                voteOption,
                BigInt(voteWeight),
                proposal.options.length,
                proposal.electionPublicKey
            );

            // Step 3: Generate proof
            const { proof, publicSignals } = await generateVoteProof({
                walletPrivateKey: walletAddress,
                tokenBalance: tokenBalance,
                voteWeight: voteWeight,
                voteOption: voteOption,
                votingMode: proposal.votingMode,
                walletPublicKey: "1", // Would be derived in real implementation
                eligibilityThreshold: proposal.eligibilityThreshold,
                proposalID: proposalId,
                nullifier: nullifier,
                optionCount: proposal.options.length,
                maxWeight: 10000
            });

            // Step 4: Submit vote
            setSubmittingVote(true);
            await castVote(proposalId, encryptedVote, proof, publicSignals, nullifier);

            navigate("/proposals");
        } catch (err) {
            console.error("Failed to submit vote:", err);
            setError("Failed to submit vote: " + err.message);
        } finally {
            setGeneratingProof(false);
            setSubmittingVote(false);
        }
    };

    if (loading) {
        return (
            <div className="container mt-5">
                <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    if (!proposal) {
        return (
            <div className="container mt-5">
                <div className="alert alert-danger">Proposal not found</div>
            </div>
        );
    }

    // Check eligibility
    const isEligible = tokenBalance >= proposal.eligibilityThreshold;

    return (
        <div className="container mt-5">
            <div className="row">
                <div className="col-md-8 offset-md-2">
                    <h1>Vote on Proposal</h1>

                    <div className="card mb-4">
                        <div className="card-body">
                            <h5 className="card-title">{proposal.description}</h5>
                            <p className="card-text">
                                <strong>Voting Mode:</strong> {votingModeLabels[proposal.votingMode]}
                                <br />
                                <strong>Your Token Balance:</strong> {tokenBalance}
                                <br />
                                <strong>Your Vote Weight:</strong> {voteWeight}
                                <br />
                                <strong>Eligibility Threshold:</strong> {proposal.eligibilityThreshold}
                            </p>
                        </div>
                    </div>

                    {error && <div className="alert alert-danger">{error}</div>}

                    {!isEligible && (
                        <div className="alert alert-warning">
                            You do not meet the eligibility threshold to vote on this proposal.
                        </div>
                    )}

                    {isEligible && (
                        <VoteForm
                            proposal={proposal}
                            voteOption={voteOption}
                            onVoteOptionChange={setVoteOption}
                            onSubmit={handleGenerateProof}
                            loading={generatingProof || submittingVote}
                            buttonText={
                                generatingProof || submittingVote 
                                    ? "Generating proof..." 
                                    : "Generate Proof & Submit Vote"
                            }
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default Vote;
