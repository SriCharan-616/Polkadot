/**
 * Create Proposal Page
 * Form to create a new voting proposal
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createProposal } from "../utils/contract";
import { ethers } from "ethers";
const CreateProposal = () => {
    const [description, setDescription] = useState("");
    const [options, setOptions] = useState(["", ""]);
    const [votingMode, setVotingMode] = useState(0); // 0: NORMAL, 1: QUADRATIC
    const [startBlock, setStartBlock] = useState(0);
    const [endBlock, setEndBlock] = useState(0);
    const [eligibilityThreshold, setEligibilityThreshold] = useState(1);
    const [minVoterThreshold, setMinVoterThreshold] = useState(10);
    const [currentBlock, setCurrentBlock] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        // Get current block number
        const getBlockNumber = async () => {
            try {
                const provider = ethers.getDefaultProvider();
                const blockNum = await provider.getBlockNumber();
                setCurrentBlock(blockNum);
                setStartBlock(blockNum + 10);
            } catch (err) {
                console.error("Failed to get block number:", err);
            }
        };
        getBlockNumber();
    }, []);

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const handleAddOption = () => {
        if (options.length < 10) {
            setOptions([...options, ""]);
        }
    };

    const handleRemoveOption = (index) => {
        if (options.length > 2) {
            setOptions(options.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate fields
        if (!description) {
            setError("Description is required");
            return;
        }

        const validOptions = options.filter((opt) => opt.trim() !== "");
        if (validOptions.length < 2 || validOptions.length > 10) {
            setError("Must have between 2 and 10 options");
            return;
        }

        if (endBlock <= startBlock) {
            setError("End block must be after start block");
            return;
        }

        if (eligibilityThreshold < 1) {
            setError("Eligibility threshold must be at least 1");
            return;
        }

        if (minVoterThreshold < 10) {
            setError("Minimum voter threshold must be at least 10");
            return;
        }

        try {
            setLoading(true);
            await createProposal(
                description,
                validOptions,
                votingMode,
                startBlock,
                endBlock,
                eligibilityThreshold,
                minVoterThreshold
            );

            navigate("/proposals");
        } catch (err) {
            console.error("Failed to create proposal:", err);
            setError("Failed to create proposal: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-5">
            <div className="row">
                <div className="col-md-8 offset-md-2">
                    <h1>Create Proposal</h1>

                    {error && <div className="alert alert-danger">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label">Description</label>
                            <textarea
                                className="form-control"
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                            />
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Options</label>
                            {options.map((option, index) => (
                                <div key={index} className="input-group mb-2">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder={`Option ${index + 1}`}
                                        value={option}
                                        onChange={(e) => handleOptionChange(index, e.target.value)}
                                    />
                                    {options.length > 2 && (
                                        <button
                                            type="button"
                                            className="btn btn-outline-danger"
                                            onClick={() => handleRemoveOption(index)}
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            ))}
                            {options.length < 10 && (
                                <button
                                    type="button"
                                    className="btn btn-outline-primary"
                                    onClick={handleAddOption}
                                >
                                    Add Option
                                </button>
                            )}
                        </div>

                        <div className="mb-3">
                            <label className="form-label">Voting Mode</label>
                            <div>
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        id="normalMode"
                                        value={0}
                                        checked={votingMode === 0}
                                        onChange={(e) => setVotingMode(parseInt(e.target.value))}
                                    />
                                    <label className="form-check-label" htmlFor="normalMode">
                                        Normal (1 person = 1 vote)
                                    </label>
                                </div>
                                <div className="form-check">
                                    <input
                                        className="form-check-input"
                                        type="radio"
                                        id="quadraticMode"
                                        value={1}
                                        checked={votingMode === 1}
                                        onChange={(e) => setVotingMode(parseInt(e.target.value))}
                                    />
                                    <label className="form-check-label" htmlFor="quadraticMode">
                                        Quadratic (vote weight = √balance)
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label className="form-label">Start Block</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={startBlock}
                                        onChange={(e) => setStartBlock(parseInt(e.target.value))}
                                        required
                                    />
                                    <small className="form-text text-muted">
                                        Current block: {currentBlock}
                                    </small>
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label className="form-label">End Block</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        value={endBlock}
                                        onChange={(e) => setEndBlock(parseInt(e.target.value))}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="row">
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label className="form-label">Eligibility Threshold (min balance)</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        min={1}
                                        value={eligibilityThreshold}
                                        onChange={(e) => setEligibilityThreshold(parseInt(e.target.value))}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="col-md-6">
                                <div className="mb-3">
                                    <label className="form-label">Minimum Voter Threshold</label>
                                    <input
                                        type="number"
                                        className="form-control"
                                        min={10}
                                        value={minVoterThreshold}
                                        onChange={(e) => setMinVoterThreshold(parseInt(e.target.value))}
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                        >
                            {loading ? "Creating..." : "Create Proposal"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateProposal;
