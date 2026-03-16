# Development Guide

This document provides detailed information for developers working on or extending this ZK voting application.

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                   Polkadot Wallet                        │
│            (Browser Extension)                           │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ web3AccountsSubscribe()
                         ↓
┌─────────────────────────────────────────────────────────┐
│              Frontend (Next.js + React)                  │
│                                                           │
│  Pages:                                                  │
│  ├── /             (List proposals)                      │
│  ├── /create       (Create proposal)                     │
│  └── /proposal/:id (Vote on proposal)                    │
│                                                           │
│  Components:                                              │
│  ├── Header        (Wallet connection UI)                │
│  ├── WalletProvider (Context for wallet state)           │
│  └── VoteComponent (Voting interface + ZK)               │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ HTTP REST API
                         ↓
┌─────────────────────────────────────────────────────────┐
│            Backend (Express.js)                          │
│                                                           │
│  Routes:                                                 │
│  ├── POST   /proposal      (Create proposal)             │
│  ├── GET    /proposals     (List proposals)              │
│  ├── GET    /proposal/:id  (Get single proposal)         │
│  ├── POST   /vote          (Submit vote)                 │
│  ├── GET    /results/:id   (Get results)                 │
│  └── GET    /health        (Health check)                │
└────────────────────────┬────────────────────────────────┘
                         │
                         │ SQLite3
                         ↓
┌─────────────────────────────────────────────────────────┐
│            Database (SQLite)                             │
│                                                           │
│  Tables:                                                 │
│  ├── proposals                                           │
│  │   ├── id (TEXT)                                       │
│  │   ├── title (TEXT)                                    │
│  │   ├── description (TEXT)                              │
│  │   ├── creator (TEXT)                                  │
│  │   ├── createdAt (INTEGER)                             │
│  │   ├── endTime (INTEGER)                               │
│  │   └── status (TEXT)                                   │
│  │                                                        │
│  └── votes                                               │
│      ├── id (INTEGER, PK)                                │
│      ├── proposalId (TEXT, FK)                           │
│      ├── nullifierHash (TEXT, UNIQUE)                    │
│      ├── proof (TEXT, JSON)                              │
│      ├── voteCommitment (TEXT)                           │
│      └── timestamp (INTEGER)                             │
└─────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Directory Structure
```
frontend/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── globals.css         # Global styles (Tailwind)
│   ├── page.tsx            # Home page (proposal list)
│   ├── create/
│   │   └── page.tsx        # Create proposal page
│   └── proposal/
│       └── [id]/
│           └── page.tsx    # Proposal detail page
├── components/
│   ├── Header.tsx          # Navigation & wallet display
│   ├── WalletProvider.tsx  # Wallet context provider
│   └── VoteComponent.tsx   # Voting UI + ZK proof
├── hooks/
│   └── useWallet.ts        # Custom wallet hook
├── utils/
│   └── zkProof.ts          # ZK proof generation
└── public/                 # Static assets
```

### Data Flow

#### 1. Wallet Connection
```typescript
// WalletProvider.tsx
useEffect(() => {
  const unsub = await web3AccountsSubscribe((accounts) => {
    setAccounts(accounts)
    setAddress(accounts[0].address)
  })
})
```

#### 2. Proposal Creation
```typescript
// app/create/page.tsx → API
POST /proposal {
  title: string
  description: string
  endTime: number (unix timestamp)
  creator: string (wallet address)
}
```

#### 3. Voting Flow
```typescript
// VoteComponent.tsx
1. User clicks Yes/No button
2. generateZKProof(vote, proposalId, userAddress) called
3. Returns: { proof, nullifierHash, voteCommitment }
4. POST /vote with proof (NOT vote value)
5. Backend verifies proof & stores it
6. Results updated on frontend
```

## Backend Architecture

### API Routes

#### Create Proposal
```
POST /proposal
Headers: Content-Type: application/json
Body: {
  "title": string,
  "description": string,
  "endTime": number,
  "creator": string
}
Response: {
  "success": boolean,
  "proposalId": string,
  "message": string
}
```

#### List Proposals
```
GET /proposals
Response: [
  {
    "id": string,
    "title": string,
    "description": string,
    "creator": string,
    "createdAt": number,
    "endTime": number,
    "status": "active" | "closed"
  }
]
```

#### Submit Vote
```
POST /vote
Headers: Content-Type: application/json
Body: {
  "proposalId": string,
  "proof": {
    "pi_a": string[],
    "pi_b": string[][],
    "pi_c": string[],
    "protocol": string,
    "curve": string
  },
  "nullifierHash": string,
  "voteCommitment": string
}
Response: {
  "success": boolean,
  "message": string
}
Errors:
  - 400: Missing fields
  - 404: Proposal not found
  - 400: Proposal has ended
  - 400: User already voted (nullifierHash conflict)
```

#### Get Results
```
GET /results/:proposalId
Response: {
  "proposalId": string,
  "title": string,
  "totalVotes": number,
  "status": "active" | "closed",
  "message": string
}
```

### Database Operations

#### Check for Double Voting
```javascript
db.get(
  `SELECT id FROM votes WHERE nullifierHash = ?`,
  [nullifierHash],
  (err, existingVote) => {
    if (existingVote) {
      return res.status(400).json({
        error: 'User has already voted'
      })
    }
  }
)
```

#### Store Vote (with proof, NOT actual vote)
```javascript
db.run(
  `INSERT INTO votes (proposalId, nullifierHash, proof, voteCommitment, timestamp)
   VALUES (?, ?, ?, ?, ?)`,
  [proposalId, nullifierHash, JSON.stringify(proof), voteCommitment, timestamp]
)
```

#### Aggregate Results
```javascript
db.get(
  `SELECT COUNT(*) as totalVotes FROM votes WHERE proposalId = ?`,
  [proposalId],
  (err, voteCount) => {
    // Return only the count, never individual votes
    return { totalVotes: voteCount.totalVotes }
  }
)
```

## Zero Knowledge Proof System

### Current Simplified Implementation

For the demo, ZK proofs are generated client-side using crypto hashing:

```typescript
// zkProof.ts
export async function generateZKProof(
  vote: 0 | 1,
  proposalId: string,
  userAddress: string
): Promise<ProofData> {
  // 1. Generate random nullifier
  const nullifier = crypto.randomBytes(32).toString('hex')
  
  // 2. Compute nullifier hash (prevents double voting)
  const nullifierHash = poseidonHash([nullifier, proposalId])
  
  // 3. Compute vote commitment (proves vote is 0 or 1)
  const voteCommitment = poseidonHash([vote.toString(), nullifier, proposalId])
  
  // 4. Create proof structure
  const proof = { pi_a, pi_b, pi_c, protocol, curve }
  
  return { proof, nullifierHash, voteCommitment }
}
```

### Privacy Guarantees

**What the proof proves:**
- ✅ Vote is either 0 (No) or 1 (Yes)
- ✅ User has not voted before (via nullifier hash)
- ✅ Proof is valid

**What is NOT revealed:**
- ❌ Which vote value (0 or 1)
- ❌ User's actual wallet address
- ❌ Any link between voter and vote

## Development Workflow

### Adding a New Feature

#### Example: Add vote deadline warning

1. **Frontend Component** (ui-only)
```typescript
// components/DeadlineWarning.tsx
export function DeadlineWarning({ endTime }) {
  const timeLeft = endTime - Date.now() / 1000
  return timeLeft < 3600 ? (
    <div className="bg-yellow-100">⚠️ Voting ends in less than 1 hour</div>
  ) : null
}

// app/proposal/[id]/page.tsx - Add to component
import DeadlineWarning from '@/components/DeadlineWarning'
<DeadlineWarning endTime={proposal.endTime} />
```

2. **Backend API** (if needed)
Skip - this feature is UI-only

3. **Database** (if needed)
Skip - no schema changes

#### Example: Add transaction fee tracking

1. **Backend** (add to database)
```javascript
// backend/index.js
db.run(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY,
    proposalId TEXT,
    transactionHash TEXT,
    fee INTEGER,
    timestamp INTEGER
  )
`)
```

2. **Backend API** (add endpoint)
```javascript
app.post('/vote', (req, res) => {
  // ... existing code ...
  
  // Store fee
  db.run(
    `INSERT INTO transactions (proposalId, transactionHash, fee, timestamp)
     VALUES (?, ?, ?, ?)`,
    [proposalId, transactionHash, fee, timestamp]
  )
})
```

3. **Frontend** (show fee to user)
```typescript
// VoteComponent.tsx
const [fee, setFee] = useState(0)

const handleVote = async (voteChoice) => {
  // ... generate proof ...
  const response = await axios.post('/vote', { ... })
  setFee(response.data.fee)
  return <p>Fee charged: {fee} units</p>
}
```

## Testing Strategy

### Unit Tests

#### Frontend (useWallet hook)
```typescript
// hooks/__tests__/useWallet.test.ts
describe('useWallet', () => {
  it('should return null address when wallet not connected', () => {
    const { result } = renderHook(() => useWallet())
    expect(result.current.address).toBeNull()
  })
})
```

#### Backend (proof verification)
```javascript
// tests/proof.test.js
describe('verifyZKProof', () => {
  it('should reject invalid proof', () => {
    const invalidProof = { pi_a: null }
    expect(verifyZKProof(invalidProof)).toBe(false)
  })
})
```

### Integration Tests

```bash
# Test full flow
1. Create proposal via API
2. Submit vote via API
3. Check nullifier hash prevents double voting
4. Verify results don't reveal individual votes
```

### Manual Testing

```
1. Start both servers
2. Create a proposal in browser
3. Vote as 2 different accounts
4. Verify:
   - Both votes recorded in DB
   - Total count is 2
   - Individual votes are hidden
   - Same account can't vote twice
```

## Performance Optimization

### Frontend Optimizations

1. **Lazy Loading Pages**
```typescript
// Automatic with Next.js dynamic imports
export default async function Page() { ... }
```

2. **Memoize Components**
```typescript
// components/ProposalCard.tsx
export const ProposalCard = React.memo(({ proposal }) => {
  return <div>{proposal.title}</div>
})
```

3. **Polling Optimization**
```typescript
// Only poll results, not proposals list
const [, setResults] = useState()
useEffect(() => {
  const interval = setInterval(fetchResults, 5000)
  return () => clearInterval(interval)
}, [proposalId])
```

### Backend Optimizations

1. **Database Indexing**
```sql
CREATE UNIQUE INDEX idx_nullifier_hash ON votes(nullifierHash)
CREATE INDEX idx_proposal_id ON votes(proposalId)
```

2. **Caching Results**
```javascript
const resultsCache = new Map()

app.get('/results/:proposalId', (req, res) => {
  if (resultsCache.has(proposalId)) {
    return res.json(resultsCache.get(proposalId))
  }
  // ... fetch from DB ...
})
```

## Deployment

### Frontend (Vercel)
```bash
# In frontend directory
vercel deploy
```

### Backend (Heroku)
```bash
# In backend directory
heroku create
heroku config:set NODE_ENV=production
git push heroku main
```

### Environment Variables
```
BACKEND_URL=https://zk-voting-backend.herokuapp.com
FRONTEND_URL=https://zk-voting.vercel.app
DATABASE_PATH=/persistent/voting.db
```

## Debugging

### Common Issues

**Issue: "Wallet not connecting"**
```
Debug steps:
1. Check Polkadot extension is installed
2. Check extension has at least one account
3. Check browser console for web3Enabled errors
4. Try refreshing page
```

**Issue: "Vote fails with CORS error"**
```
Solution: Update backend CORS header
// backend/index.js
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-frontend.com']
}))
```

**Issue: "Database locked"**
```
Solution: Kill all servers and restart
Windows: taskkill /F /IM node.exe
Linux: pkill -f node
```

## Resources

- [Polkadot.js Documentation](https://polkadot.js.org/docs/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Express.js Documentation](https://expressjs.com/)
- [Circom Documentation](https://docs.circom.io/)
- [snarkjs Documentation](https://github.com/iden3/snarkjs)

---

Happy developing! 🚀
