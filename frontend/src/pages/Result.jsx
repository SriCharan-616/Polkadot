import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProposal, getResult, listenForEvents } from "../utils/contract";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const ProposalStatus = {
    0: "PENDING_DKG",
    1: "ACTIVE",
    2: "ENDED",
    3: "REVEALED",
    4: "CANCELLED"
};

export default function Result() {
    const { proposalId } = useParams();
    const navigate = useNavigate();
    const [proposal, setProposal] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [partialCount, setPartialCount] = useState(0);

    useEffect(() => {
        loadProposal();
        // Setup event listeners
        const unsubscribe = listenForEvents(proposalId, {
            onResult: (resultData, winner) => {
                setResult({ finalResult: resultData, winningOption: winner });
            },
            onVotingEnded: () => {
                loadProposal();
            }
        });

        return () => unsubscribe();
    }, [proposalId]);

    async function loadProposal() {
        try {
            const prop = await getProposal(proposalId);
            setProposal(prop);
            setPartialCount(prop.partialCount || 0);

            // If status is REVEALED, fetch result
            if (prop.status === 3) {
                try {
                    const res = await getResult(proposalId);
                    setResult(res);
                } catch (err) {
                    console.error("Error fetching result:", err);
                }
            }

            setLoading(false);
        } catch (err) {
            console.error("Error loading proposal:", err);
            setError("Failed to load proposal");
            setLoading(false);
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
            <div className="max-w-4xl mx-auto px-4 py-8">
                <p className="text-red-600">Proposal not found</p>
            </div>
        );
    }

    const statusLabel = ProposalStatus[proposal.status];
    const isRevealed = proposal.status === 3;
    const isCancelled = proposal.status === 4;
    const isEnded = proposal.status === 2 || isRevealed;

    // Prepare chart data
    let chartData = [];
    if (result && isRevealed) {
        chartData = proposal.options.map((option, idx) => ({
            name: option,
            votes: result.finalResult[idx] || 0
        }));
    }

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-800">
                    Proposal #{proposalId}
                </h1>
                <button
                    onClick={() => navigate("/proposals")}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                    Back
                </button>
            </div>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                    {error}
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-8 mb-8">
                {/* Proposal Info */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">
                        {proposal.description}
                    </h2>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                            <p className="text-gray-600">Status</p>
                            <p className="font-semibold">{statusLabel}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Total Votes</p>
                            <p className="font-semibold">{proposal.voteCount}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Min Required</p>
                            <p className="font-semibold">{proposal.minVoterThreshold}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Eligibility Threshold</p>
                            <p className="font-semibold">{proposal.eligibilityThreshold}</p>
                        </div>
                    </div>
                </div>

                {/* Status-Specific Content */}
                {isCancelled && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-8">
                        <p className="text-red-700 font-semibold">Proposal Cancelled</p>
                        <p className="text-red-600 text-sm mt-1">
                            This proposal did not reach the minimum voter threshold.
                        </p>
                    </div>
                )}

                {!isEnded && !isCancelled && (
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8">
                        <p className="text-blue-700 font-semibold">Voting in Progress</p>
                        <p className="text-blue-600 text-sm mt-1">
                            Voting is currently active. Results will be revealed after voting ends and keyholders decrypt.
                        </p>
                    </div>
                )}

                {isEnded && !isRevealed && !isCancelled && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-8">
                        <p className="text-yellow-700 font-semibold">Waiting for Decryption</p>
                        <p className="text-yellow-600 text-sm mt-1">
                            Voting has ended. Keyholders are submitting partial decryptions.
                        </p>
                        <div className="mt-3 text-yellow-600 text-sm">
                            Progress: <span className="font-semibold">{partialCount} of 2</span> partial decryptions submitted
                        </div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-yellow-500 h-2 rounded-full transition-all"
                                style={{ width: `${(partialCount / 2) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* Results */}
                {isRevealed && result && (
                    <div>
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Results</h3>

                            {/* Winner */}
                            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                                <p className="text-green-600 text-sm font-semibold mb-2">WINNING OPTION</p>
                                <p className="text-3xl font-bold text-green-700">
                                    {proposal.options[result.winningOption]}
                                </p>
                                <p className="text-sm text-green-600 mt-2">
                                    {result.finalResult[result.winningOption]} total weighted votes
                                </p>
                            </div>

                            {/* Chart */}
                            {chartData.length > 0 && (
                                <div className="mb-8">
                                    <h4 className="font-semibold text-gray-700 mb-4">Vote Distribution</h4>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar
                                                dataKey="votes"
                                                fill="#3b82f6"
                                                onClick={(data) => {
                                                    console.log("Selected option:", data.name);
                                                }}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}

                            {/* Detailed Results */}
                            <div className="space-y-3">
                                <h4 className="font-semibold text-gray-700">Detailed Results</h4>
                                {proposal.options.map((option, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <span className="font-semibold">{option}</span>
                                        <div className="flex items-center gap-4">
                                            <div className="w-32 bg-gray-200 rounded-full h-2">
                                                <div
                                                    className={`h-2 rounded-full transition-all ${
                                                        idx === result.winningOption
                                                            ? "bg-green-500"
                                                            : "bg-blue-500"
                                                    }`}
                                                    style={{
                                                        width: `${
                                                            proposal.voteCount > 0
                                                                ? (result.finalResult[idx] / proposal.voteCount) *
                                                                  100
                                                                : 0
                                                        }%`
                                                    }}
                                                ></div>
                                            </div>
                                            <span className="font-semibold w-20 text-right">
                                                {result.finalResult[idx]}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Privacy Note */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-8">
                                <p className="text-sm text-blue-800">
                                    <span className="font-semibold">🔒 Privacy Guarantee:</span> Individual votes are
                                    mathematically private using ElGamal homomorphic encryption. Only the aggregated result
                                    is revealed after threshold decryption.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Options List */}
                <div className="border-t pt-8 mt-8">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Options</h3>
                    <div className="flex flex-wrap gap-2">
                        {proposal.options.map((option, idx) => (
                            <span
                                key={idx}
                                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                                    result && idx === result.winningOption
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-100 text-gray-800"
                                }`}
                            >
                                {option}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
                <button
                    onClick={() => navigate("/proposals")}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                >
                    Back to All Proposals
                </button>

                {isRevealed && (
                    <button
                        onClick={() => {
                            const csv = [
                                ["Option", "Votes"],
                                ...proposal.options.map((opt, idx) => [opt, result.finalResult[idx]])
                            ]
                                .map((row) => row.join(","))
                                .join("\n");

                            const blob = new Blob([csv], { type: "text/csv" });
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `proposal_${proposalId}_results.csv`;
                            a.click();
                        }}
                        className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                    >
                        Download Results
                    </button>
                )}
            </div>
        </div>
    );
}
