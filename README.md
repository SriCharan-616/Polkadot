# Private Proposal Voting with Zero Knowledge Proofs

A minimal demo web application demonstrating private proposal voting using Zero Knowledge Proofs (ZK-SNARKs). Users can vote on proposals while keeping their vote choices completely private.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│  - Connect Wallet (Polkadot.js)                              │
│  - Create Proposals                                          │
│  - Vote with ZK Proofs                                       │
│  - View Results                                              │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  │ HTTP
                  ↓
┌─────────────────────────────────────────────────────────────┐
│                 Backend (Express + Node.js)                  │
│  - Store Proposals                                           │
│  - Verify ZK Proofs                                          │
│  - Prevent Double Voting (nullifierHash)                     │
│  - Aggregate Results                                         │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────────────────┐
│              Database (SQLite)                   │
│  - Proposals Table                                           │
│  - Votes Table (proof + nullifierHash, NOT votes)            │
└─────────────────────────────────────────────────────────────┘
```

## Key Features

### 🔒 Privacy-First Design
- **Actual votes are NEVER stored** in the database
- Only cryptographic proofs and nullifier hashes are recorded
- Vote choices remain completely hidden

### ✅ Zero Knowledge Proofs
- Each voter generates a ZK proof showing:
  - They voted either 0 (No) or 1 (Yes)
  - They have not voted before (using nullifier hash)
  - The proof is valid (using circom + snarkjs)

### 🚫 Double Voting Prevention
- Nullifier hash ensures users can only vote once per proposal
- Unique hash prevents linking to actual voter

### 📊 Transparent Results
- Vote counts are publicly viewable
- Individual vote choices remain private
- Results only show total votes, never breaking down Yes/No

## Tech Stack

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **TailwindCSS** - Styling
- **Polkadot.js** - Wallet connection
- **Axios** - HTTP client
- **snarkjs** - ZK proof generation

### Backend
- **Express.js** - REST API
- **SQLite3** - Database
- **Node.js** - Runtime

### ZK System
- **Circom** - Circuit language (in `/circuits`)
- **snarkjs** - ZK proof generation and verification

## Project Structure

```
Polkadot/
├── frontend/              # Next.js frontend application
│   ├── app/              # Next.js app directory
│   │   ├── layout.tsx    # Root layout with providers
│   │   ├── page.tsx      # Home page (list proposals)
│   │   ├── create/       # Create proposal page
│   │   └── proposal/[id]/ # Proposal detail page
│   ├── components/        # React components
│   │   ├── Header.tsx    # Navigation header
│   │   ├── VoteComponent.tsx # Voting UI
│   │   └── WalletProvider.tsx # Wallet context
│   ├── hooks/            # Custom React hooks
│   │   └── useWallet.ts  # Wallet hook
│   ├── utils/            # Utility functions
│   │   └── zkProof.ts    # ZK proof generation
│   └── public/           # Static assets
├── backend/              # Express backend
│   ├── index.js         # Main server entry point
│   ├── package.json     # Backend dependencies
│   └── voting.db        # SQLite database (auto-created)
├── circuits/            # Circom circuits
│   └── Vote.circom      # Voting circuit
├── scripts/             # Setup and compile scripts
└── README.md            # This file
```

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Polkadot Extension (for wallet connection)

### 1. Install Dependencies

#### Backend
```bash
cd backend
npm install
cd ..
```

#### Frontend
```bash
cd frontend
npm install
cd ..
```

### 2. Start the Backend

```bash
cd backend
npm start
```

The backend will start on `http://localhost:5000`

### 3. Start the Frontend

In a new terminal:

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:3000`

### 4. Install Polkadot Wallet Extension

Download and install the Polkadot.js extension:
- [Chrome](https://chrome.google.com/webstore/detail/polkadot%7Bjs%7D-extension/mopemgiiheijhofmt/reviews)
- [Firefox](https://addons.mozilla.org/en-US/firefox/addon/polkadot-js-extension/)

Create a test account in the extension (it can be any account, mock or real).

## Usage

### 1. Connect Wallet
Click the wallet button in the top right to connect your Polkadot account.

### 2. Create a Proposal
- Go to "Create Proposal" page
- Enter title, description, and voting duration
- Submit to create the proposal

### 3. Vote on a Proposal
- Click on a proposal from the home page
- Choose "Yes" (👍) or "No" (👎)
- A zero-knowledge proof is automatically generated
- Vote is submitted to the backend with the proof (NOT the actual vote)

### 4. View Results
- Results show the total vote count
- Individual votes remain private
- Results are only available after the proposal ends

## How It Works: The Privacy Model

### Traditional Voting
```
User → Vote (Yes/No) → Database (stores Yes/No)
↓
Anyone can see: User A voted Yes, User B voted No
```

### This Application (ZK Privacy)
```
User chooses: Yes or No (0 or 1)
↓
Generate ZK Proof:
  - Proof(vote ∈ {0,1})        [Proves vote is Yes or No]
  - nullifierHash               [Proves no double voting]
  - voteCommitment              [Commitment to this proof]
↓
Database stores:
  - proof                       [Not revealing vote]
  - nullifierHash              [For double-voting check]
  - voteCommitment             [Proof validity]
↓
Result: Vote count known, individual votes UNKNOWN ✓
```

## Zero Knowledge Proof Details

### Circom Circuit (Vote.circom)

The circuit enforces:
1. **Vote Constraint**: `vote * (vote - 1) === 0` (vote must be 0 or 1)
2. **Nullifier Hash**: Prevents double voting using `Poseidon(nullifier, proposalId)`
3. **Vote Commitment**: Hashes the vote to prove validity without revealing it

### Proof Generation (Frontend)
```typescript
generateZKProof(vote, proposalId, userAddress)
  → {
      proof: { pi_a, pi_b, pi_c },    // Actual proof
      nullifierHash: "hash...",        // Prevent double voting
      voteCommitment: "hash..."        // Proof validity
    }
```

### Proof Verification (Backend)
```typescript
verifyZKProof(proof, publicInputs)
  → true/false
```

## API Endpoints

### Proposals

**POST /proposal** - Create a new proposal
```json
{
  "title": "Increase voting period to 48 hours",
  "description": "Detailed description...",
  "endTime": 1234567890,
  "creator": "polkadot_address"
}
```

**GET /proposals** - List all proposals
```json
[
  {
    "id": "proposal_...",
    "title": "...",
    "description": "...",
    "creator": "...",
    "endTime": 1234567890,
    "status": "active" | "closed"
  }
]
```

**GET /proposal/:proposalId** - Get a specific proposal

### Voting

**POST /vote** - Submit a vote with ZK proof
```json
{
  "proposalId": "proposal_...",
  "proof": { "pi_a": [...], "pi_b": [...], "pi_c": [...] },
  "nullifierHash": "hash...",
  "voteCommitment": "hash..."
}
```

**GET /results/:proposalId** - Get vote results
```json
{
  "proposalId": "proposal_...",
  "totalVotes": 42,
  "status": "active" | "closed",
  "message": "..."
}
```

## Example Flow

1. **Alice connects** her Polkadot wallet
2. **Alice creates** a proposal: "Increase reward pool"
3. **Bob connects** his Polkadot wallet
4. **Bob votes YES** → ZK proof generated → sent to backend
5. **Carol connects** and **votes NO** → ZK proof generated → sent to backend
6. **Results show**: 2 total votes
   - **Database contains**: 2 proofs + 2 nullifier hashes
   - **Database does NOT contain**: Yes/No information
   - **Result**: Nobody knows if Bob voted Yes or Carol voted No ✓

## Security Considerations

### Current Implementation
This is a **minimal demo** for educational purposes. It uses simplified cryptography.

### Production Requirements
To deploy this for real applications:

1. **Compile actual Circom circuits** with snarkjs
2. **Use real ZK-SNARK proofs** instead of mock proofs
3. **Implement proof verification** using snarkjs verifier
4. **Add input validation** and rate limiting
5. **Use HTTPS** for all communications
6. **Implement authentication** (currently trusting caller)
7. **Add audit logging** for all operations
8. **Use environment variables** for sensitive configs

## Testing

### Manual Testing Steps

1. Create a proposal with a short duration (e.g., 1 hour)
2. Vote as multiple users (create test accounts in wallet extension)
3. Verify:
   - Each account can only vote once (nullifier hash prevents double voting)
   - Results show total votes but never individual votes
   - Different users can't see each other's votes

### Example Test Flow
```bash
# Terminal 1: Start backend
cd backend && npm start

# Terminal 2: Start frontend
cd frontend && npm run dev

# Browser: Go to http://localhost:3000
# 1. Create proposal
# 2. Switch accounts in wallet > vote
# 3. Switch accounts again > vote
# 4. Check results show correct total but no individual votes
```

## Future Enhancements

### Phase 2
- [ ] Implement actual circom + snarkjs compilation
- [ ] Verify proofs on backend
- [ ] Add PostgreSQL for production database
- [ ] Implement proper authentication

### Phase 3
- [ ] Multi-choice voting (rank choice voting)
- [ ] Delegation support
- [ ] Batched proof verification for efficiency
- [ ] Proof of Stake integration

### Phase 4
- [ ] Deploy to testnet
- [ ] Smart contract integration (optional)
- [ ] Decentralized voting (no central backend)
- [ ] IPFS storage for immutability

## Troubleshooting

### "Polkadot Extension not found"
→ Install the Polkadot.js extension and reload the page

### "Backend is not running"
→ Make sure `npm start` is running in the `backend/` directory

### "CORS error"
→ Backend CORS is configured for localhost:3000. For other origins, update `cors()` in `backend/index.js`

### "Database locked"
→ SQLite may be locked. Stop both servers and restart.

## License

MIT - This is a demo for educational purposes.

## Support

For questions or issues:
1. Check the troubleshooting section above
2. Review the code comments
3. Check that both frontend and backend are running

---

**Happy voting privately! 🗳️🔒**
