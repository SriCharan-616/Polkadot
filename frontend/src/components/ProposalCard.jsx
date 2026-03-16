/**
 * ProposalCard Component
 * Displays a single proposal with action buttons
 */

import React from "react";

const ProposalCard = ({
    proposal,
    proposalId,
    statusLabel,
    onVote,
    onViewResult,
    onEndVoting
}) => {
    const votingModeLabels = { 0: "Normal", 1: "Quadratic" };

    const getStatusBadgeClass = (status) => {
        switch (status) {
            case "PENDING_DKG":
                return "badge bg-secondary";
            case "ACTIVE":
                return "badge bg-success";
            case "ENDED":
                return "badge bg-warning";
            case "REVEALED":
                return "badge bg-info";
            case "CANCELLED":
                return "badge bg-danger";
            default:
                return "badge bg-gray";
        }
    };

    return (
        <div className="card h-100">
            <div className="card-body">
                <h5 className="card-title">{proposal.description}</h5>

                <p className="card-text">
                    <span className={getStatusBadgeClass(statusLabel)}>
                        {statusLabel}
                    </span>
                </p>

                <div className="mb-3">
                    <strong>Details:</strong>
                    <ul className="list-unstyled mt-2">
                        <li>
                            <small>
                                <strong>Voting Mode:</strong> {votingModeLabels[proposal.votingMode]}
                            </small>
                        </li>
                        <li>
                            <small>
                                <strong>Votes:</strong> {Number(proposal.voteCount)}
                            </small>
                        </li>
                        <li>
                            <small>
                                <strong>End Block:</strong> {Number(proposal.endBlock)}
                            </small>
                        </li>
                        <li>
                            <small>
                                <strong>Options:</strong> {proposal.options.length}
                            </small>
                        </li>
                    </ul>
                </div>

                <div className="mb-3">
                    <strong>Options:</strong>
                    <ul className="list-unstyled mt-2">
                        {proposal.options.map((option, index) => (
                            <li key={index}>
                                <small className="text-muted">• {option}</small>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="d-grid gap-2">
                    {statusLabel === "ACTIVE" && (
                        <button
                            className="btn btn-primary"
                            onClick={() => onVote(proposalId)}
                        >
                            Vote
                        </button>
                    )}

                    {statusLabel === "REVEALED" && (
                        <button
                            className="btn btn-info"
                            onClick={() => onViewResult(proposalId)}
                        >
                            View Result
                        </button>
                    )}

                    {statusLabel === "ACTIVE" && (
                        <button
                            className="btn btn-warning"
                            size="sm"
                            onClick={() => onEndVoting(proposalId)}
                        >
                            End Voting
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProposalCard;
