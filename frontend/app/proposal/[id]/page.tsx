'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import axios from 'axios';
import VoteComponent from '../../../components/VoteComponent';
import { useWallet } from '../../../hooks/useWallet';

interface Proposal {
  id: string;
  title: string;
  description: string;
  creator: string;
  createdAt: number;
  endTime: number;
  status: string;
}

interface Results {
  proposalId: string;
  title: string;
  totalVotes: number;
  status: string;
}

export default function ProposalDetail() {
  const params = useParams();
  const proposalId = params.id as string;
  const { address } = useWallet();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    if (proposalId) {
      fetchProposal();
      fetchResults();
      const interval = setInterval(fetchResults, 5000); // Poll every 5 seconds
      return () => clearInterval(interval);
    }
  }, [proposalId]);

  const fetchProposal = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/proposal/${proposalId}`
      );
      setProposal(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load proposal');
      console.error('Error fetching proposal:', err);
    }
  };

  const fetchResults = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/results/${proposalId}`
      );
      setResults(response.data);
    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const timeUntilEnd = (endTime: number) => {
    const now = Math.floor(Date.now() / 1000);
    const diff = endTime - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / 86400);
    const hours = Math.floor((diff % 86400) / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Loading proposal...</p>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Proposal not found</p>
      </div>
    );
  }

  const isActive = proposal.status === 'active' && results?.status === 'active';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="card">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">{proposal.title}</h1>
            <p className="text-gray-600">{proposal.description}</p>
          </div>
          <span className={`badge ${isActive ? 'badge-active' : 'badge-closed'}`}>
            {isActive ? 'Active' : 'Closed'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-6 border-t border-gray-200 pt-6 text-sm">
          <div>
            <p className="text-gray-600 mb-1">Creator</p>
            <p className="font-mono font-semibold break-all">{proposal.creator}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Time Remaining</p>
            <p className="font-semibold">{timeUntilEnd(proposal.endTime)}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Created</p>
            <p>{formatDate(proposal.createdAt)}</p>
          </div>
          <div>
            <p className="text-gray-600 mb-1">Ends</p>
            <p>{formatDate(proposal.endTime)}</p>
          </div>
        </div>
      </div>

      {/* Results Card */}
      {results && (
        <div className="card bg-blue-50 border-2 border-blue-200">
          <h2 className="text-2xl font-bold mb-4">Results</h2>
          <p className="text-lg mb-4">
            Total Votes: <span className="font-bold text-blue-600">{results.totalVotes}</span>
          </p>
          <p className="text-gray-600 text-sm">
            {isActive 
              ? 'Voting is still active. Individual vote choices remain private.' 
              : 'Voting has ended. Results are final. Individual votes were never stored.'}
          </p>
        </div>
      )}

      {/* Voting Component */}
      {isActive ? (
        <VoteComponent 
          proposalId={proposalId} 
          userAddress={address}
          onVoteSuccess={() => {
            setHasVoted(true);
            fetchResults();
          }}
        />
      ) : (
        <div className="card bg-gray-50 border-2 border-gray-200">
          <p className="text-gray-600 text-center">
            Voting for this proposal has ended.
          </p>
        </div>
      )}
    </div>
  );
}
