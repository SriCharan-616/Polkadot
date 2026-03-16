/**
 * Proposals List Page
 * Shows all proposals with their status and options to interact
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllProposals, endVoting } from "../utils/contract";
import ProposalCard from "../components/ProposalCard";

const Proposals = () => {
    const [proposals, setProposals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const statusLabels = {
        0: "PENDING_DKG",
        1: "ACTIVE",
        2: "ENDED",
        3: "REVEALED",
        4: "CANCELLED"
    };

    useEffect(() => {
        const fetchProposals = async () => {
            try {
                setLoading(true);
                const allProposals = await getAllProposals();
                setProposals(allProposals);
            } catch (err) {
                console.error("Failed to fetch proposals:", err);
                setError("Failed to load proposals");
            } finally {
                setLoading(false);
            }
        };

        fetchProposals();
    }, []);

    const handleVote = (proposalId) => {
        navigate(`/vote/${proposalId}`);
    };

    const handleViewResult = (proposalId) => {
        navigate(`/result/${proposalId}`);
    };

    const handleEndVoting = async (proposalId) => {
        try {
            await endVoting(proposalId);
            // Refetch proposals
            const allProposals = await getAllProposals();
            setProposals(allProposals);
        } catch (err) {
            console.error("Failed to end voting:", err);
            setError("Failed to end voting");
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

    return (
        <div className="container mt-5">
            <div className="row">
                <div className="col-md-12">
                    <h1>Proposals</h1>
                    <button
                        className="btn btn-primary mb-3"
                        onClick={() => navigate("/create")}
                    >
                        Create Proposal
                    </button>

                    {error && <div className="alert alert-danger">{error}</div>}

                    {proposals.length === 0 ? (
                        <div className="alert alert-info">No proposals yet</div>
                    ) : (
                        <div className="row">
                            {proposals.map((proposal, index) => (
                                <div key={index} className="col-md-6 mb-4">
                                    <ProposalCard
                                        proposal={proposal}
                                        proposalId={index}
                                        statusLabel={statusLabels[proposal.status]}
                                        onVote={handleVote}
                                        onViewResult={handleViewResult}
                                        onEndVoting={handleEndVoting}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Proposals;
