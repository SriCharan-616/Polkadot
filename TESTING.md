# Testing Guide

This guide provides instructions for testing the Private Proposal Voting application end-to-end.

## Prerequisites

- Both backend and frontend must be running
- Polkadot.js extension must be installed with at least one test account
- Port 5000 (backend) and 3000 (frontend) must be free

## Quick Test (5 minutes)

### 1. Setup & Start Services

```bash
# Terminal 1: Backend
cd backend
npm install  # only if first time
npm start

# Terminal 2: Frontend (new terminal)
cd frontend
npm install  # only if first time
npm run dev

# Browser
Open http://localhost:3000
```

### 2. Test Wallet Connection

- Click the wallet button (top right)
- Verify "Wallet not connected" warning appears
- Install Polkadot.js extension if not already
- Create or use existing test account in extension
- Extension should subscribe to accounts automatically
- Wallet button should show your address (truncated)

### 3. Test Proposal Creation

1. Click "Create Proposal" button
2. Fill in the form:
   - Title: "Test Proposal"
   - Description: "This is a test proposal"
   - Duration: 24 hours (default)
3. Click "Create Proposal"
4. Verify success message appears
5. Go back to home page
6. Verify your proposal appears in the list

### 4. Test Private Voting

1. Click on your proposal
2. Verify proposal details display correctly
3. Verify "Results" section shows 0 total votes
4. Click "Yes" button and wait for processing
5. Verify success message: "Your vote has been recorded privately!"
6. Verify results update to "1 total votes"
7. **IMPORTANT**: Refresh page - cannot vote twice!
8. Verify "User has already voted" error if attempting again

### 5. Verify Privacy

1. View browser DevTools (F12) → Network tab
2. Look at the POST request to `/vote`
3. Verify the request body contains:
   - `proof` (object)
   - `nullifierHash` (string)
   - `voteCommitment` (string)
   - **NOT** containing your vote value (0 or 1) ✓

4. Check backend database:
   ```bash
   # While backend is running, in another terminal:
   sqlite3 backend/voting.db
   SELECT * FROM votes;
   ```
   Verify:
   - `proof` column contains a JSON-like structure
   - `nullifierHash` is unique per vote
   - No `vote` column (vote choice never stored) ✓

## Comprehensive Test Suite

### Test 1: Multiple Users Voting

1. Create two test accounts in Polkadot extension
2. Create a proposal
3. Account A votes "Yes"
4. Switch to Account B (click wallet menu)
5. Vote "No"
6. Switch back to Account A
7. Try to vote again → Should get "already voted" error ✓
8. Verify results show "2 total votes"
9. Backend database shows 2 unique `nullifierHash` entries
10. No way to tell if any user voted Yes or No ✓

### Test 2: Voting Deadline

1. Create a proposal with 1 minute duration
2. Vote successfully
3. Wait for deadline to pass (or manually reset system time for testing)
4. After deadline: voting button should be disabled
5. Results should show "Voting has ended"
6. Attempting to submit vote should fail with "Proposal has ended"

### Test 3: Proof Structure Validation

1. Open DevTools Console
2. When voting, the `generateZKProof` function should:
   ```typescript
   {
     proof: {
       pi_a: [...],      // Proof component A
       pi_b: [...],      // Proof component B
       pi_c: [...],      // Proof component C
       protocol: "groth16",
       curve: "bn128"
     },
     nullifierHash: "0x...",    // Unique per voter
     voteCommitment: "0x..."    // Commitment to vote
   }
   ```

### Test 4: Database Integrity

Backend stores votes with:
```sql
proposalId    | TEXT  | Foreign key to
proposals(id) |       |
nullifierHash | TEXT  | UNIQUE (prevents duplicates)
proof         | TEXT  | JSON serialized proof
voteCommitment| TEXT  | Hash commitment
timestamp     | INT   | When vote was cast
```

Verify:
```bash
sqlite3 backend/voting.db

-- Should return error if trying to insert duplicate nullifierHash:
INSERT INTO votes (proposalId, nullifierHash, proof, voteCommitment, timestamp) 
VALUES ('proposal_X', 'EXISTING_HASH', '...', '...', ...);
-- Error: UNIQUE constraint failed: votes.nullifierHash

-- Should return all votes for a proposal (no individual choices revealed):
SELECT COUNT(*) FROM votes WHERE proposalId = 'proposal_X';
-- Returns: 5 (total votes, no Yes/No breakdown)
```

## Performance Tests

### Test Load: Multiple Rapid Votes

```bash
# Terminal: Run stress test
cd backend
node -e "
const http = require('http');
for(let i=0; i<10; i++) {
  const data = JSON.stringify({
    proposalId: 'test',
    proof: {},
    nullifierHash: 'hash_' + i,
    voteCommitment: 'commit_' + i
  });
  const req = http.request({
    port: 5000,
    path: '/vote',
    method: 'POST',
    headers: {'Content-Length': data.length, 'Content-Type': 'application/json'}
  });
  req.write(data);
  req.end();
}
"
```

Results should show all votes processed (some may fail if proposal doesn't exist, but no race conditions).

## Error Handling Tests

| Scenario | Expected Behavior |
|----------|-------------------|
| No wallet connected → Try to create proposal | Error: "Connect wallet first" |
| Missing required fields in proposal form | Error: "Title and description required" |
| Vote with invalid proposalId | Error: 404 "Proposal not found" |
| Vote after proposal deadline | Error: 400 "Proposal has ended" |
| Vote twice with same account | Error: 400 "Already voted" |
| Backend offline | Frontend error: "Backend not running" |
| CORS issue | Browser Network tab shows CORS error |

## Debugging

### Enable Verbose Logging

1. **Frontend**: Open DevTools Console (F12)
   - Look for API call logs
   - Check `generateZKProof` output

2. **Backend**: Terminal logs show:
   - Incoming requests
   - Database operations
   - Vote submission success/failure

### Check Database State

```bash
# While backend running:
sqlite3 backend/voting.db

# View all proposals
.mode column
.headers on
SELECT * FROM proposals;

# View vote count
SELECT COUNT(*) as total_votes FROM votes;
SELECT proposalId, COUNT(*) as votes FROM votes GROUP BY proposalId;

# Verify uniqueness of nullifierHash
SELECT COUNT(DISTINCT nullifierHash) as unique_hashes, COUNT(*) as total_votes FROM votes;
-- Both numbers should match (no duplicates)
```

## Cleanup

### Reset for Fresh Testing

```bash
# Stop both servers (Ctrl+C)

# Remove database to reset state
rm backend/voting.db

# Restart servers
cd backend && npm start
# In new terminal: cd frontend && npm run dev
```

## Success Criteria

✓ Users can connect wallet
✓ Users can create proposals
✓ Users can vote once per proposal
✓ Vote choices are completely private (not stored)
✓ Results show vote totals only
✓ Double voting is prevented
✓ Database integrity maintained
✓ All API endpoints working
✓ No errors in console
✓ Responsive UI

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Polkadot extension undefined" | Install extension, reload page |
| "Backend not responding" | Check `npm start` in backend folder, port 5000 free |
| CORS error | Ensure backend started first, frontend on localhost:3000 |
| "Database locked" | Stop backend, delete `.db-wal` and `.db-shm` files, restart |
| Votes not appearing | Refresh page (API may need small delay) |
| Wallet not showing accounts | Click extension icon, verify accounts exist |

## Next Steps for Production Testing

- [ ] Load testing (>100 concurrent votes)
- [ ] Actual circom circuit compilation
- [ ] snarkjs proof verification integration
- [ ] PostgreSQL migration
- [ ] HTTPS/TLS setup
- [ ] Rate limiting per IP
- [ ] Audit logging
- [ ] User authentication tokens
- [ ] OpenAPI documentation

---

Happy testing! 🚀
