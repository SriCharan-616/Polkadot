import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllProposals, endVoting } from "../utils/contract";

const ProposalStatus = {
    0: { label: "PENDING_DKG", color: "bg-yellow-100 text-yellow-800" },
    1: { label: "ACTIVE", color: "bg-green-100 text-green-800" },
    2: { label: "ENDED", color: "bg-gray-100 text-gray-800" },
    3: { label: "REVEALED", color: "bg-blue-100 text-blue-800" },
    4: { label: "CANCELLED", color: "bg-red-100 text-red-800" }
};

const VotingModeLabel = {
    0: "Normal",
    1: "Quadratic"
};

export default function Proposals() {
    const navigate = useNavigate();
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentBlock, setCurrentBlock] = useState(0);

    useEffect(() => {
        loadProposals();
        // Refresh proposals every 30 seconds
        const interval = setInterval(loadProposals, 30000);
        return () => clearInterval(interval);
    }, []);

    async function loadProposals() {
        try {
            setLoading(true);
            const allProposals = await getAllProposals();
            setProposals(allProposals);
            // Note: In real implementation, get current block from provider
            setCurrentBlock(Math.floor(Date.now() / 12000)); // Approximate block based on time
        } catch (err) {
            console.error("Error loading proposals:", err);
            setError("Failed to load proposals");
        } finally {
            setLoading(false);
        }
    }

    async function handleEndVoting(proposalId) {
        try {
            if (!window.confirm("Are you sure you want to end voting for this proposal?")) {
                return;
            }

            const receipt = await endVoting(proposalId);
            alert("Voting ended successfully!");
            await loadProposals();
        } catch (err) {
            console.error("Error ending voting:", err);
            alert("Error ending voting: " + err.message);
        }
    }

    if (loading && proposals.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading proposals...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="mb-8 flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Proposals</h1>
                <button
                    onClick={() => navigate("/create")}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                    Create Proposal
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {proposals.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <p className="text-gray-600 mb-4">No proposals yet</p>
                    <button
                        onClick={() => navigate("/create")}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Create the first proposal
                    </button>
                </div>
            ) : (
                <div className="grid gap-6">
                    {proposals.map((proposal, index) => {
                        const statusInfo = ProposalStatus[proposal.status];
                        const isActive = proposal.status === 1;
                        const isEnded = proposal.status === 2;
                        const isRevealed = proposal.status === 3;
                        const isPastEndBlock = currentBlock > proposal.endBlock;

                        return (
                            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
                                <div className="p-6">
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex-1">
                                            <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                                Proposal #{proposal.id.toString()}
                                            </h2>
                                            <p className="text-gray-600">{proposal.description}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusInfo.color}`}>
                                            {statusInfo.label}
                                        </span>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
                                        <div>
                                            <p className="text-gray-600">Voting Mode</p>
                                            <p className="font-semibold">{VotingModeLabel[proposal.votingMode]}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">Votes Cast</p>
                                            <p className="font-semibold">{proposal.voteCount.toString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">Eligibility Threshold</p>
                                            <p className="font-semibold">{proposal.eligibilityThreshold.toString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-600">End Block</p>
                                            <p className="font-semibold">{proposal.endBlock.toString()}</p>
                                        </div>
                                    </div>

                                    {/* Options */}
                                    <div className="mb-6">
                                        <p className="text-gray-600 text-sm mb-2 font-semibold">Options</p>
                                        <div className="flex flex-wrap gap-2">
                                            {proposal.options.map((option, i) => (
                                                <span
                                                    key={i}
                                                    className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                                                >
                                                    {option}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 flex-wrap">
                                        {isActive && (
                                            <button
                                                onClick={() => navigate(`/vote/${proposal.id}`)}
                                                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                                            >
                                                Cast Vote
                                            </button>
                                        )}

                                        {isActive && isPastEndBlock && (
                                            <button
                                                onClick={() => handleEndVoting(proposal.id)}
                                                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                                            >
                                                End Voting
                                            </button>
                                        )}

                                        {isRevealed && (
                                            <button
                                                onClick={() => navigate(`/result/${proposal.id}`)}
                                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                            >
                                                View Result
                                            </button>
                                        )}

                                        {(isEnded || isRevealed) && (
                                            <button
                                                onClick={() => navigate(`/result/${proposal.id}`)}
                                                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                                            >
                                                View Details
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
