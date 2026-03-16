'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { useWallet } from '../../hooks/useWallet';


export default function CreateProposal() {
  const router = useRouter();
  const { address } = useWallet();

  interface FormData {
    title: string;
    description: string;
    duration: number;
  }
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    duration: 24 
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      duration: name === 'duration' ? Number(value) || 0 : prev.duration,
      title: name === 'title' ? value : prev.title,
      description: name === 'description' ? value : prev.description
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!formData.title || !formData.description) {
      setError('Title and description are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Calculate endTime (current time + duration in hours)
      const endTime = Math.floor(Date.now() / 1000) + formData.duration * 3600;
      const response = await axios.post('http://localhost:5000/proposal', {
        title: formData.title,
        description: formData.description,
        endTime,
        creator: address
      });

      // Redirect to home page on success
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create proposal');
      console.error('Error creating proposal:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Create Proposal</h1>

      {!address && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
          Please connect your wallet to create a proposal
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-2">Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., Increase voting period to 48 hours"
            className="input-field"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Detailed description of the proposal..."
            rows={6}
            className="input-field"
            disabled={loading}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Voting Duration</label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              name="duration"
              value={formData.duration}
              onChange={handleChange}
              min={1}
              max={720}
              className="input-field w-24"
              disabled={loading}
            />
            <span className="text-gray-600">hours</span>
          </div>
        </div>

        <div className="flex gap-4 pt-6">
          <button
            type="submit"
            disabled={loading || !address}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Proposal'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
