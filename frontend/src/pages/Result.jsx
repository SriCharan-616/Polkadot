/**
 * Result Page
 * Shows voting results when proposal is revealed
 */

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getProposal, getResult } from "../utils/contract";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const Result = () => {
    const { proposalId } = useParams();
    const [proposal, setProposal] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [chartData, setChartData] = useState([]);

    const statusLabels = {
        0: "PENDING_DKG",
        1: "ACTIVE",
        2: "ENDED",
        3: "REVEALED",
        4: "CANCELLED"
    };

    useEffect(() => {
        const initPage = async () => {
            try {
                setLoading(true);
                const prop = await getProposal(proposalId);
                setProposal(prop);

                if (prop.status === 3) {
                    // REVEALED status
                    const [finalResult, winningOption] = await getResult(proposalId);
                    setResult({
                        finalResult: finalResult.map((r) => Number(r)),
                        winningOption: winningOption
                    });

                    // Prepare chart data
                    const data = prop.options.map((option, index) => ({
                        name: option,
                        votes: Number(finalResult[index])
                    }));
                    setChartData(data);
                }
            } catch (err) {
                console.error("Failed to load result:", err);
                setError("Failed to load result: " + err.message);
            } finally {
                setLoading(false);
            }
        };

        initPage();
    }, [proposalId]);

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

    return (
        <div className="container mt-5">
            <div className="row">
                <div className="col-md-12">
                    <h1>Voting Result</h1>

                    {error && <div className="alert alert-danger">{error}</div>}

                    <div className="card mb-4">
                        <div className="card-body">
                            <h5 className="card-title">{proposal.description}</h5>
                            <p className="card-text">
                                <strong>Status:</strong> {statusLabels[proposal.status]}
                                <br />
                                <strong>Total Votes:</strong> {proposal.voteCount}
                            </p>
                        </div>
                    </div>

                    {proposal.status === 3 && result ? (
                        <div>
                            <div className="alert alert-info">
                                <strong>Individual votes are mathematically private</strong> -
                                The result is encrypted until threshold decryption is complete.
                            </div>

                            <div className="card mb-4">
                                <div className="card-body">
                                    <h5 className="card-title">Results by Option</h5>
                                    <ResponsiveContainer width="100%" height={400}>
                                        <BarChart data={chartData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" />
                                            <YAxis />
                                            <Tooltip />
                                            <Legend />
                                            <Bar
                                                dataKey="votes"
                                                fill="#0066cc"
                                                name="Vote Count"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-body">
                                    <h5 className="card-title">Winning Option</h5>
                                    <p className="card-text">
                                        <strong>{proposal.options[result.winningOption]}</strong>
                                        <br />
                                        <small className="text-muted">
                                            Votes: {result.finalResult[result.winningOption]}
                                        </small>
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : proposal.status === 2 ? (
                        <div className="alert alert-warning">
                            <strong>Waiting for keyholders to decrypt result...</strong>
                            <br />
                            Partial decryptions submitted: {proposal.partialCount} of 2 required
                        </div>
                    ) : proposal.status === 4 ? (
                        <div className="alert alert-danger">
                            <strong>Proposal Cancelled</strong>
                            <br />
                            This proposal was cancelled due to insufficient voters or timeout.
                        </div>
                    ) : (
                        <div className="alert alert-info">
                            Results are not yet available. Proposal status: {statusLabels[proposal.status]}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Result;
