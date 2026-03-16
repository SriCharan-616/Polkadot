import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createProposal } from "../utils/contract";

export default function CreateProposal() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        description: "",
        options: ["", ""],
        votingMode: 0, // 0 = NORMAL, 1 = QUADRATIC
        startBlock: "",
        endBlock: "",
        eligibilityThreshold: 1,
        minVoterThreshold: 10
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentBlock, setCurrentBlock] = useState(0);

    // Initialize with approximate current block
    React.useEffect(() => {
        setCurrentBlock(Math.floor(Date.now() / 12000));
        setFormData((prev) => ({
            ...prev,
            startBlock: (Math.floor(Date.now() / 12000) + 10).toString(),
            endBlock: (Math.floor(Date.now() / 12000) + 100).toString()
        }));
    }, []);

    function handleDescriptionChange(e) {
        setFormData({
            ...formData,
            description: e.target.value
        });
    }

    function handleOptionChange(index, value) {
        const newOptions = [...formData.options];
        newOptions[index] = value;
        setFormData({
            ...formData,
            options: newOptions
        });
    }

    function addOption() {
        if (formData.options.length < 10) {
            setFormData({
                ...formData,
                options: [...formData.options, ""]
            });
        }
    }

    function removeOption(index) {
        if (formData.options.length > 2) {
            setFormData({
                ...formData,
                options: formData.options.filter((_, i) => i !== index)
            });
        }
    }

    function handleNumberChange(field, value) {
        setFormData({
            ...formData,
            [field]: parseInt(value) || 0
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Validation
            if (!formData.description.trim()) {
                throw new Error("Description is required");
            }

            const nonEmptyOptions = formData.options.filter((opt) => opt.trim());
            if (nonEmptyOptions.length < 2) {
                throw new Error("At least 2 options are required");
            }

            if (nonEmptyOptions.length > 10) {
                throw new Error("Maximum 10 options allowed");
            }

            if (formData.startBlock < currentBlock) {
                throw new Error("Start block must be in the future");
            }

            if (formData.endBlock <= formData.startBlock) {
                throw new Error("End block must be after start block");
            }

            if (formData.eligibilityThreshold < 1) {
                throw new Error("Eligibility threshold must be at least 1");
            }

            if (formData.minVoterThreshold < 10) {
                throw new Error("Minimum voter threshold must be at least 10");
            }

            // Create proposal
            const receipt = await createProposal(
                formData.description,
                nonEmptyOptions,
                formData.votingMode,
                formData.startBlock,
                formData.endBlock,
                formData.eligibilityThreshold,
                formData.minVoterThreshold
            );

            alert("Proposal created successfully!");
            navigate("/proposals");
        } catch (err) {
            console.error("Error creating proposal:", err);
            setError(err.message || "Failed to create proposal");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Create Proposal</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-8">
                {/* Description */}
                <div className="mb-6">
                    <label className="block text-gray-700 font-semibold mb-2">
                        Description *
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={handleDescriptionChange}
                        placeholder="Describe the proposal"
                        rows="4"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        disabled={loading}
                    />
                </div>

                {/* Options */}
                <div className="mb-6">
                    <label className="block text-gray-700 font-semibold mb-2">
                        Options (2-10) *
                    </label>
                    <div className="space-y-3">
                        {formData.options.map((option, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => handleOptionChange(index, e.target.value)}
                                    placeholder={`Option ${index + 1}`}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    disabled={loading}
                                />
                                {formData.options.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() => removeOption(index)}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                        disabled={loading}
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    {formData.options.length < 10 && (
                        <button
                            type="button"
                            onClick={addOption}
                            className="mt-3 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                            disabled={loading}
                        >
                            Add Option
                        </button>
                    )}
                </div>

                {/* Voting Mode */}
                <div className="mb-6">
                    <label className="block text-gray-700 font-semibold mb-2">
                        Voting Mode *
                    </label>
                    <div className="flex gap-4">
                        <label className="flex items-center">
                            <input
                                type="radio"
                                value="0"
                                checked={formData.votingMode === 0}
                                onChange={() => setFormData({ ...formData, votingMode: 0 })}
                                className="mr-2"
                                disabled={loading}
                            />
                            <span>Normal (1 token = 1 vote)</span>
                        </label>
                        <label className="flex items-center">
                            <input
                                type="radio"
                                value="1"
                                checked={formData.votingMode === 1}
                                onChange={() => setFormData({ ...formData, votingMode: 1 })}
                                className="mr-2"
                                disabled={loading}
                            />
                            <span>Quadratic (√tokens = vote power)</span>
                        </label>
                    </div>
                </div>

                {/* Block Parameters */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">
                            Start Block *
                        </label>
                        <input
                            type="number"
                            value={formData.startBlock}
                            onChange={(e) => handleNumberChange("startBlock", e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                            disabled={loading}
                        />
                        <p className="text-sm text-gray-600 mt-1">Current: ~{currentBlock}</p>
                    </div>

                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">
                            End Block *
                        </label>
                        <input
                            type="number"
                            value={formData.endBlock}
                            onChange={(e) => handleNumberChange("endBlock", e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                            disabled={loading}
                        />
                    </div>
                </div>

                {/* Thresholds */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">
                            Eligibility Threshold *
                        </label>
                        <input
                            type="number"
                            value={formData.eligibilityThreshold}
                            onChange={(e) => handleNumberChange("eligibilityThreshold", e.target.value)}
                            min="1"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <label className="block text-gray-700 font-semibold mb-2">
                            Minimum Voters Threshold *
                        </label>
                        <input
                            type="number"
                            value={formData.minVoterThreshold}
                            onChange={(e) => handleNumberChange("minVoterThreshold", e.target.value)}
                            min="10"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                            disabled={loading}
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className={`flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold transition ${
                            loading
                                ? "opacity-50 cursor-not-allowed"
                                : "hover:bg-blue-700"
                        }`}
                    >
                        {loading ? "Creating..." : "Create Proposal"}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate("/proposals")}
                        disabled={loading}
                        className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
                    >
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}
