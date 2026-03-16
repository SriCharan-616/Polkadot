/**
 * VoteForm Component
 * Form for submitting a vote
 */

import React from "react";

const VoteForm = ({
    proposal,
    voteOption,
    onVoteOptionChange,
    onSubmit,
    loading,
    buttonText
}) => {
    return (
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
            <div className="mb-3">
                <label className="form-label">
                    <strong>Select Option to Vote For</strong>
                </label>

                <div className="card">
                    <div className="card-body">
                        {proposal.options.map((option, index) => (
                            <div key={index} className="form-check mb-2">
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    name="voteOption"
                                    id={`option-${index}`}
                                    value={index}
                                    checked={voteOption === index}
                                    onChange={(e) => onVoteOptionChange(parseInt(e.target.value))}
                                />
                                <label className="form-check-label" htmlFor={`option-${index}`}>
                                    {option}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="alert alert-info">
                <strong>Your vote will be encrypted and remain private.</strong>
                <br />
                Zero-knowledge proofs ensure eligibility without revealing your identity.
            </div>

            <div className="d-grid gap-2">
                <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <span
                                className="spinner-border spinner-border-sm me-2"
                                role="status"
                                aria-hidden="true"
                            ></span>
                            {buttonText}
                        </>
                    ) : (
                        buttonText
                    )}
                </button>
            </div>
        </form>
    );
};

export default VoteForm;
