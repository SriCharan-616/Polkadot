/**
 * Main App Component
 * Router and layout for the private voting application
 */

import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Proposals from "./pages/Proposals";
import CreateProposal from "./pages/CreateProposal";
import Vote from "./pages/Vote";
import Result from "./pages/Result";
import "./App.css";

const App = () => {
    return (
        <Router>
            <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
                <div className="container-fluid">
                    <a className="navbar-brand" href="/">
                        🗳️ Private DAO Voting
                    </a>
                    <button
                        className="navbar-toggler"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#navbarNav"
                    >
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav ms-auto">
                            <li className="nav-item">
                                <a className="nav-link" href="/proposals">
                                    Proposals
                                </a>
                            </li>
                            <li className="nav-item">
                                <a className="nav-link" href="/create">
                                    Create Proposal
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>

            <div className="container-fluid py-4">
                <Routes>
                    <Route path="/" element={<Navigate to="/proposals" />} />
                    <Route path="/proposals" element={<Proposals />} />
                    <Route path="/create" element={<CreateProposal />} />
                    <Route path="/vote/:proposalId" element={<Vote />} />
                    <Route path="/result/:proposalId" element={<Result />} />
                </Routes>
            </div>

            <footer className="bg-dark text-white mt-5 py-4">
                <div className="container text-center">
                    <p>&copy; 2024 Private DAO Voting System. All votes are mathematically private.</p>
                    <small>
                        Powered by ElGamal encryption, Groth16 ZK proofs, and Polkadot PVM
                    </small>
                </div>
            </footer>
        </Router>
    );
};

export default App;
