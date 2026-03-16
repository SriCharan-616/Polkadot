# System Architecture

## Component Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                    User Browser                               │
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         Polkadot.js Wallet Extension                   │  │
│  │         (Browser Local Storage)                        │  │
│  │         • Account addresses                            │  │
│  │         • Signing capability                           │  │
│  └────────────────────┬───────────────────────────────────┘  │
│                       │                                       │
│  ┌────────────────────▼───────────────────────────────────┐  │
│  │       Next.js Frontend Application                     │  │
│  │       (React + TypeScript + TailwindCSS)               │  │
│  │                                                        │  │
│  │  Components:                                           │  │
│  │  ├─ Header (Wallet Display & Selector)                │  │
│  │  ├─ ProposalList (Home Page)                          │  │
│  │  ├─ CreateProposal (Form Page)                        │  │
│  │  ├─ ProposalDetail (Voting Page)                      │  │
│  │  └─ VoteComponent (ZK Proof Generation)               │  │
│  │                                                        │  │
│  │  Utilities:                                            │  │
│  │  ├─ zkProof.ts (Generate proofs)                      │  │
│  │  └─ useWallet.ts (Wallet context)                     │  │
│  └────────────────────┬───────────────────────────────────┘  │
│                       │                                       │
└───────────────────────┼───────────────────────────────────────┘
                        │
                        │ HTTP/REST
                        │
┌───────────────────────▼───────────────────────────────────────┐
│          Express.js Backend Server                             │
│          (Node.js Runtime)                                     │
│                                                                │
│  API Routes:                                                   │
│  ├─ POST   /proposal           (Create)                       │
│  ├─ GET    /proposals          (List all)                     │
│  ├─ GET    /proposal/:id       (Get single)                   │
│  ├─ POST   /vote               (Submit vote)                  │
│  ├─ GET    /results/:id        (Get results)                  │
│  └─ GET    /health             (Health check)                 │
│                                                                │
│  Features:                                                     │
│  ├─ CORS middleware            (Allow frontend)               │
│  ├─ Body parser                (JSON requests)                │
│  └─ Error handling             (Global middleware)            │
│                                                                │
└───────────────────────┬───────────────────────────────────────┘
                        │
                        │ SQL
                        │
┌───────────────────────▼───────────────────────────────────────┐
│          SQLite3 Database                                      │
│          (voting.db file)                                      │
│                                                                │
│  Table: proposals                                              │
│  ├─ id (TEXT, PRIMARY KEY)                                    │
│  ├─ title (TEXT)                                              │
│  ├─ description (TEXT)                                        │
│  ├─ creator (TEXT, Polkadot address)                          │
│  ├─ createdAt (INTEGER, unix timestamp)                       │
│  ├─ endTime (INTEGER, unix timestamp)                         │
│  └─ status (TEXT, "active" | "closed")                        │
│                                                                │
│  Table: votes                                                  │
│  ├─ id (INTEGER, PRIMARY KEY, AUTO)                           │
│  ├─ proposalId (TEXT, FOREIGN KEY)                            │
│  ├─ nullifierHash (TEXT, UNIQUE)                              │
│  ├─ proof (TEXT, JSON object)                                 │
│  ├─ voteCommitment (TEXT, hash)                               │
│  └─ timestamp (INTEGER, unix timestamp)                       │
│                                                                │
│  IMPORTANT:                                                    │
│  ❌ Vote value (0 or 1) is NEVER stored                       │
│  ✅ Only cryptographic proof is stored                        │
│  ✅ Only nullifier hash to prevent double voting              │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### 1. Wallet Connection Flow

```
User opens app
     │
     ▼
web3Enabled() [Check if extension exists]
     │
     ├─→ No  → Show warning message
     │
     └─→ Yes
          │
          ▼
web3AccountsSubscribe() [Listen for accounts]
          │
          ▼
Display wallet address in header
          │
          ▼
User can now create proposals and vote
```

### 2. Create Proposal Flow

```
User fills form
     │
     ▼
Click "Create Proposal"
     │
     ▼
Validate inputs (title, description required)
     │
     ├─→ Invalid → Show error
     │
     └─→ Valid
          │
          ▼
Calculate endTime = now + duration
          │
          ▼
POST /proposal {
  title, description, endTime, creator (address)
}
          │
          ▼
Backend stores in proposals table
          │
          ▼
Return proposalId
          │
          ▼
Redirect to home page
```

### 3. Voting Flow (CRITICAL PRIVACY FLOW)

```
User sees proposal detail
     │
     ▼
User clicks YES (1) or NO (0) button
     │
     ▼
generateZKProof() on frontend:
├─ Generate random nullifier
├─ Hash nullifierHash = Poseidon(nullifier, proposalId)
├─ Hash voteCommitment = Poseidon(vote, nullifier, proposalId)
└─ Create proof object
     │
     ▼
❌ VOTE VALUE (0 or 1) STAYS ON FRONTEND
✅ ONLY PROOF IS SENT TO BACKEND
     │
     ▼
POST /vote {
  proposalId,
  proof,
  nullifierHash,
  voteCommitment
}  ← NOTE: NO VOTE VALUE!
     │
     ▼
Backend checks:
├─ Does proposal exist?
├─ Is proposal still active?
└─ Has user already voted? (query nullifierHash)
     │
     ├─→ Duplicate vote → Reject
     │
     └─→ New vote → Store in database
          │
          ▼
          INSERT INTO votes (
            proposalId,
            nullifierHash,
            proof,
            voteCommitment,
            timestamp
          )  ← NO VOTE VALUE STORED!
          │
          ▼
Return success
     │
     ▼
Show "Vote recorded" message
```

### 4. Results Viewing Flow

```
User views proposal results
     │
     ▼
GET /results/:proposalId
     │
     ▼
Backend counts votes:
SELECT COUNT(*) FROM votes WHERE proposalId = ?
     │
     ▼
Return { totalVotes: 42 }
└─ DOES NOT return individual votes
└─ DOES NOT return Yes/No breakdown
└─ ONLY shows total count
     │
     ▼
Frontend displays:
"Total Votes: 42"
"Individual votes are private ✓"
```

## Zero Knowledge Proof Architecture

```
┌─────────────────────────────────────────┐
│   User selects vote (Yes=1 or No=0)     │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Generate ZK Proof (Frontend Only)      │
│                                          │
│  Inputs (secret):                        │
│  ├─ vote         (0 or 1) [HIDDEN]      │
│  ├─ nullifier    (random number)        │
│  └─ proposalId   (public)                │
│                                          │
│  Outputs (sent to backend):              │
│  ├─ proof                                │
│  │  (proves vote ∈ {0,1})                │
│  ├─ nullifierHash                        │
│  │  (prevents double voting, hides vote) │
│  └─ voteCommitment                       │
│     (commits to this specific proof)     │
│                                          │
└──────────────────┬──────────────────────┘
                   │
                   ▼ HTTP POST /vote
┌─────────────────────────────────────────┐
│  Backend Receives Proof                  │
│                                          │
│  Can verify:                             │
│  ✓ Proof is valid (mathematical)        │
│  ✓ User hasn't voted before              │
│    (nullifierHash not in database)       │
│  ✓ Proof was for this proposal           │
│                                          │
│  Can NOT determine:                      │
│  ✗ Did user vote Yes or No?              │
│  ✗ Who is the actual user?               │
│  ✗ This vs any other proposal            │
│                                          │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Store in Database                       │
│                                          │
│  INSERT INTO votes (                    │
│    proposalId,          [PUBLIC]        │
│    nullifierHash,       [HASHED]        │
│    proof,               [VALID]         │
│    voteCommitment,      [COMMITMENT]    │
│    timestamp            [PUBLIC]        │
│  )                                       │
│                                          │
│  NOT STORED:                             │
│  ✗ vote (0 or 1)        [DISCARDED]     │
│  ✗ nullifier            [DISCARDED]     │
│                                          │
└──────────────────┬──────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│  Results Query                           │
│                                          │
│  SELECT COUNT(*) FROM votes             │
│  WHERE proposalId = ?                   │
│                                          │
│  Returns: { totalVotes: 42 }             │
│                                          │
│  Privacy Guarantee:                      │
│  Nobody can determine how individual    │
│  users voted, even with database access │
│                                          │
└─────────────────────────────────────────┘
```

## Security Layers

```
╔═══════════════════════════════════════════════════════════╗
║            Frontend Layer (Client-Side)                   ║
║  ├─ Vote choice never leaves client                       ║
║  ├─ Proof generated locally                               ║
║  └─ Wallet verification via extension                     ║
╚═══════════════════════════════════════════════════════════╝
                          │
                          ▼
╔═══════════════════════════════════════════════════════════╗
║            Network Layer (HTTPS in Production)            ║
║  ├─ Encrypted in transit (TLS/SSL)                        ║
║  └─ Only proof transmitted (not vote)                     ║
╚═══════════════════════════════════════════════════════════╝
                          │
                          ▼
╔═══════════════════════════════════════════════════════════╗
║            Backend Layer (API Validation)                 ║
║  ├─ Verify proof is valid                                 │
║  ├─ Check nullifierHash for double voting                 │
║  ├─ Validate proposal exists & is active                  │
║  └─ Rate limiting (production)                            │
╚═══════════════════════════════════════════════════════════╝
                          │
                          ▼
╔═══════════════════════════════════════════════════════════╗
║            Database Layer (Storage)                       ║
║  ├─ proof (cryptographic, can't extract vote)             │
║  ├─ nullifierHash (one-way hash, can't reverse)           │
║  └─ NO vote values stored (deleted after proof created)   ║
╚═══════════════════════════════════════════════════════════╝
```

---

**Privacy Goal Achieved**: 🔒 Even with full database access, nobody can determine individual votes!
