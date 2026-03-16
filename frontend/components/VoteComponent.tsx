'use client';

import { useState } from 'react';
import axios from 'axios';
import { generateZKProof } from '../utils/zkProof';

interface VoteComponentProps {
  proposalId: string;
  userAddress: string | null;
  onVoteSuccess: () => void;
}

export default function VoteComponent({
  proposalId,
  userAddress,
  onVoteSuccess
}: VoteComponentProps) {
  const [vote, setVote] = useState<0 | 1 | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleVote = async (voteChoice: 0 | 1) => {
    if (!userAddress) {
      setError('Please connect your wallet');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setVote(voteChoice);

      // Generate ZK proof
      const { proof, nullifierHash, voteCommitment } = await generateZKProof(
        voteChoice,
        proposalId,
        userAddress
      );

      // Send vote to backend
      const response = await axios.post('http://localhost:5000/vote', {
        proposalId,
        proof,
        nullifierHash,
        voteCommitment
      });

      setSuccess(true);
      onVoteSuccess();

      // Reset form after 2 seconds
      setTimeout(() => {
        setVote(null);
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      let errorMessage = err.response?.data?.error || 'Failed to submit vote';
      
      // Make error message more user-friendly
      if (errorMessage.includes('already voted')) {
        errorMessage = '✓ You have already voted on this proposal! This is by design to prevent double voting. You can vote on other proposals.';
      } else if (errorMessage.includes('has ended')) {
        errorMessage = '❌ This proposal voting period has ended.';
      }
      
      setError(errorMessage);
      setVote(null);
      console.error('Error submitting vote:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-6">Cast Your Vote</h2>

      {!userAddress && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
          Please connect your wallet to vote
        </div>
      )}

      {error && (
        <div className={`border rounded mb-6 px-4 py-3 ${
          error.includes('You have already voted') 
            ? 'bg-green-100 border-green-400 text-green-700' 
            : 'bg-red-100 border-red-400 text-red-700'
        }`}>
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
          ✓ Your vote has been recorded privately!
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm">
        <p className="text-blue-800">
          <strong>🔒 Privacy Protection:</strong> Your vote is encrypted using Zero Knowledge Proofs. 
          Only a proof is stored, never your actual vote choice.
        </p>
      </div>

      <div className="flex gap-4">
        <button
          onClick={() => handleVote(1)}
          disabled={loading || !userAddress || success}
          className="flex-1 btn btn-success text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && vote === 1 ? '⏳ Processing...' : '👍 Yes'}
        </button>
        <button
          onClick={() => handleVote(0)}
          disabled={loading || !userAddress || success}
          className="flex-1 btn btn-danger text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading && vote === 0 ? '⏳ Processing...' : '👎 No'}
        </button>
      </div>

      <p className="text-center text-sm text-gray-600 mt-6">
        💡 The actual vote choice is never stored on the server. 
        Only cryptographic proofs are recorded.
      </p>
    </div>
  );
}
