# Complete Testing Guide: ZK Voting System

## Overview
This project combines:
1. **Blockchain Integration** (Polkadot.js wallet connection)
2. **Zero-Knowledge Proofs** (ZK-SNARKs for private voting)
3. **Privacy** (votes never stored, only cryptographic proofs)

---

## Quick Start (5 minutes)

### Start All Services
```powershell
# Terminal 1: Backend
cd backend
npm install
npm start
# Expected: "Server running on http://localhost:5000"

# Terminal 2: Frontend  
cd frontend
npm install
npm run dev
# Expected: "localhost:3000"

# Browser
Open http://localhost:3000
```

### Basic Smoke Test
1. Install [Polkadot.js Extension](https://polkadot.js.org/extension/)
2. Create test account in extension
3. Click wallet button → should show address
4. Click "Create Proposal" → fill form → create
5. Click proposal → click "Yes" → see success message
6. Refresh → try voting again → should fail with "already voted"

---

## Testing Components

### 1️⃣ Blockchain/Wallet Testing

#### Manual Test
```
Step 1: Open http://localhost:3000
Step 2: Check wallet connection
  - No extension installed? → See warning "Install Polkadot.js"
  - Extension installed, no account? → See "Create account first"
  - Account exists? → See your address (truncated)

Step 3: Create Proposal
  - Title: "Blockchain Test"
  - Description: "Testing wallet integration"
  - Click Create
  - Should show transaction hash (simulated)

Step 4: Switch Accounts (if you have multiple test accounts)
  - Click wallet button → select different account → address updates
```

#### Expected Behavior
- ✅ Address updates when you switch accounts in extension
- ✅ Only creator can see creation confirmation message
- ✅ All users can see proposals

---

### 2️⃣ ZK Proof Testing

#### What Gets Generated
When voting, the frontend creates:

```javascript
{
  proof: {
    pi_a: [...],      // Proof point A
    pi_b: [...],      // Proof point B  
    pi_c: [...],      // Proof point C
    protocol: "groth16",
    curve: "bn128"
  },
  nullifierHash: "abc123...",           // Unique per user per proposal
  voteCommitment: "xyz789...",          // Proves vote is 0 or 1
  // ❌ Vote value (0 or 1) is NOT included!
}
```

#### Verify Proof Generation
```powershell
# In Browser DevTools (F12) → Network → Filter: vote
# Click a vote button, then examine the POST request

# Look for these in the request body:
✅ proof (object)
✅ nullifierHash (unique hex string)
✅ voteCommitment (hex string)
❌ vote: 0 or vote: 1 should NOT appear
❌ proposalId should NOT be in request body detail
```

#### Manual Verification
1. Create 2 test accounts in Polkadot extension
2. Vote with Account A on a proposal
3. Switch to Account B in extension
4. Vote on same proposal with Account B
5. Switch back to Account A
6. Try voting again → see "already voted" error
7. Query database (see below) → verify 2 unique nullifierHashes

---

### 3️⃣ Privacy Verification

#### Check Database Integrity
```powershell
# While backend is running, open new terminal:
cd backend
sqlite3 voting.db

# In SQLite prompt:
SELECT id, proposalId, nullifierHash, voteCommitment FROM votes;

# Should see:
# id | proposalId | nullifierHash | voteCommitment
# 1  | proposal_* | abc123def456  | xyz789...
# 2  | proposal_* | def456ghi789  | abc123...

# Key privacy checks:
✅ Each nullifierHash is UNIQUE
✅ No "vote" column (0 or 1 never stored)
✅ No "userAddress" column (voter identity not stored)
✅ nullifierHash cannot be reversed to find original user
```

#### Verify Vote Counting
```sql
-- Still in SQLite:
SELECT COUNT(*) as total_votes FROM votes WHERE proposalId = 'proposal_xxx';

-- Results show TOTAL votes, never revealing individual choices
```

---

### 4️⃣ Automated Integration Tests

#### Run Tests
```powershell
# Start backend first:
cd backend
npm start

# In another terminal (same backend folder):
npm run test:integration
```

#### Expected Output
```
🧪 Starting ZK Voting Test Suite

Test 1: Creating Proposal...
✅ Proposal created: proposal_1234567_xyz

Test 2: Fetching Proposals...
✅ Found 1 proposals

Test 3: Fetching Specific Proposal...
✅ Proposal details retrieved: "Test Proposal"

Test 4: Submitting Vote with ZK Proof...
✅ Vote submitted successfully

Test 5: Testing Double Voting Prevention...
✓ First vote accepted
✓ Double voting correctly prevented

Test 6: Fetching Vote Results...
✅ Results retrieved - Total votes: 3

═══════════════════════════════════════
✅ All Tests Passed!
═══════════════════════════════════════
```

---

### 5️⃣ Double Voting Prevention Test

#### Manual Test
```
1. Create a proposal
2. Generate some votes:
   - Vote 1 (Account A) → nullifierHash1 → ✅ Accepted
   - Vote 2 (Account B) → nullifierHash2 → ✅ Accepted
   - Vote 3 (Account A) → nullifierHash1 → ❌ Rejected "already voted"

Why this works:
- Each vote requires a unique nullifierHash
- nullifierHash = hash(nullifier, proposalId)
- Same user → same nullifier → same nullifierHash on same proposal
- Database has UNIQUE constraint on nullifierHash
- Database rejects duplicate nullifierHash
```

#### Database Verification
```sql
-- Try inserting duplicate nullifierHash:
INSERT INTO votes (proposalId, nullifierHash, proof, voteCommitment, timestamp)
VALUES ('prop_123', 'duplicate_hash', '{}', 'commitment', 1234567);

INSERT INTO votes (proposalId, nullifierHash, proof, voteCommitment, timestamp)
VALUES ('prop_123', 'duplicate_hash', '{}', 'commitment', 1234568);
-- Result: ❌ UNIQUE constraint failed on nullifierHash
```

---

### 6️⃣ Comprehensive Multi-User Test

#### Scenario: 3 Users, 1 Proposal
```
Setup:
  Account A (Alice)
  Account B (Bob)  
  Account C (Charlie)
  Proposal: "Should we upgrade?"

Execution:
  1. Alice creates proposal (duration: 24 hours)
  2. Alice votes "Yes"
     → Backend generates proof
     → nullifierHash_A generated
     → Database stores once
  
  3. Bob votes "Yes"
     → Different nullifierHash_B
     → Database stores twice
  
  4. Charlie votes "No"
     → Different nullifierHash_C
     → Database stores three times
  
  5. Alice tries voting again
     → Sends same nullifierHash_A
     → Database rejects with "already voted"
  
  6. Check results
     → Shows: "3 total votes"
     → Does NOT show: "2 Yes, 1 No"
     → Does NOT show: "Alice voted Yes"

Privacy Verification:
  ✅ No one knows Alice/Bob voted Yes or Charlie voted No
  ✅ Everyone knows there were 3 votes
  ✅ Alice can't vote twice
  ✅ No way to link nullifierHash to identity
```

---

## Troubleshooting

### Issue: "Cannot find module 'snarkjs'"
```powershell
cd backend
npm install snarkjs
npm start
```

### Issue: Backend crashes on startup
```powershell
# Check if port 5000 is in use:
netstat -ano | findstr :5000

# Kill the process or use different port:
$env:PORT=5001
npm start
```

### Issue: Wallet button shows "null" or doesn't update
```
1. Refresh browser (Ctrl+Shift+R to hard refresh)
2. Check Polkadot.js extension is enabled
3. Check you have at least 1 account in extension
4. Check browser console (F12) for errors
```

### Issue: Vote submission fails with "missing fields"
```
- Check Network tab (F12) to see request body
- Verify proof, nullifierHash, voteCommitment are included
- Verify proposalId is included
```

---

## Test Checklist

### Core Functionality
- [ ] Backend starts on port 5000
- [ ] Frontend starts on port 3000
- [ ] Database file created (backend/voting.db)

### Blockchain Integration
- [ ] Wallet extension connects
- [ ] Account address displays
- [ ] Can switch between accounts
- [ ] Account change updates UI

### ZK Proof System
- [ ] Vote button generates proof
- [ ] Network request shows proof.pi_a, proof.pi_b, proof.pi_c
- [ ] Network request does NOT show vote value
- [ ] Backend stores proof in database

### Privacy
- [ ] Vote count displays correctly
- [ ] Individual votes not revealed
- [ ] Database has no "vote" column
- [ ] Database has unique nullifierHash entries

### Security
- [ ] Double voting prevented (same user, same proposal)
- [ ] Can vote on different proposals
- [ ] Cannot vote after proposal deadline
- [ ] Empty proposals list doesn't crash

### Multi-User
- [ ] Multiple users can vote on same proposal
- [ ] Each user gets unique nullifierHash
- [ ] Vote count increments correctly
- [ ] User cannot determine who voted what

---

## Circuit Testing (Advanced)

The `circuits/Vote.circom` file defines the ZK proof circuit:

```circom
pragma circom 2.0.0;

template VoteProof() {
    // Inputs
    signal input vote;                // 0 or 1
    signal input nullifier;           // Secret random value
    signal input proposalId;          // Public proposal ID
    
    // Outputs
    signal output nullifierHash;      // Reveals unique per user
    signal output voteCommitment;     // Proves vote is 0 or 1
    
    // Constraints
    vote * (vote - 1) === 0;          // Enforce: vote is 0 or 1
    
    // Compute nullifierHash
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== nullifier;
    nullifierHasher.inputs[1] <== proposalId;
    nullifierHash <== nullifierHasher.out;
    
    // Compute voteCommitment
    component voteHasher = Poseidon(3);
    voteHasher.inputs[0] <== vote;
    voteHasher.inputs[1] <== nullifier;
    voteHasher.inputs[2] <== proposalId;
    voteCommitment <== voteHasher.out;
}
```

To compile this circuit (optional):
```powershell
cd circuits
# npm install -g snarkjs

# Compile (requires circom)
circom Vote.circom --r1cs --wasm

# Generate witness and proof (requires circuit file)
snarkjs groth16 prove circuit.zkey witness.wtns proof.json public.json
```

---

## Summary

| Component | Test Method | Expected Result |
|-----------|------------|-----------------|
| **Blockchain** | Connect wallet, switch account | Address updates, no errors |
| **ZK Proof** | Vote on proposal, check network | Proof sent, vote value hidden |
| **Privacy** | Query database | No vote values stored |
| **Security** | Try voting twice | Second attempt rejected |
| **Integration** | Run test suite | All 6 tests pass |

You're ready to test! Start with Quick Start, then run automated tests for comprehensive validation.
