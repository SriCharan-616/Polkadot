'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';

interface Proposal {
  id: string;
  title: string;
  description: string;
  creator: string;
  endTime: number;
  status: string;
}

export default function Home() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:5000/proposals');
      setProposals(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load proposals. Make sure the backend is running.');
      console.error('Error fetching proposals:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    return status === 'active' 
      ? 'badge-active' 
      : 'badge-closed';
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

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">Private Proposal Voting</h1>
        <Link href="/create" className="btn btn-primary">
          Create Proposal
        </Link>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Loading proposals...</p>
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No proposals yet</p>
          <Link href="/create" className="btn btn-primary">
            Be the first to create one
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {proposals.map(proposal => (
            <Link href={`/proposal/${proposal.id}`} key={proposal.id}>
              <div className="card hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{proposal.title}</h2>
                    <p className="text-gray-600 line-clamp-2">{proposal.description}</p>
                  </div>
                  <span className={`badge ${getStatusBadge(proposal.status)}`}>
                    {proposal.status}
                  </span>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>Creator: <span className="font-mono">{proposal.creator.slice(0, 10)}...</span></p>
                  <p>Ends: {formatDate(proposal.endTime)}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
