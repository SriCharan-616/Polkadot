# Testing: Expected Results & Outputs

## Test Environment

```
Windows PowerShell
├─ Terminal 1: Backend (Port 5000)
├─ Terminal 2: Frontend (Port 3000)  
├─ Terminal 3: Tests & Database Queries
└─ Browser DevTools: Network & Console tabs
```

---

## 1. Backend Startup Output

### Command
```powershell
cd backend
npm install  # First time only
npm start
```

### Expected Output
```
> zk-voting-backend@1.0.0 start
> node index.js

Server running on http://localhost:5000
```

### If it fails:
```
Error: Cannot find module 'express'
→ Run: npm install

Error: listen EADDRINUSE: address already in use :::5000
→ Kill: netstat -ano | findstr :5000
→ Then: taskkill /PID <PID> /F

Error: Database error
→ Delete: rm backend/voting.db
→ Restart: npm start (recreates database)
```

---

## 2. Frontend Startup Output

### Command
```powershell
cd frontend
npm install  # First time only
npm run dev
```

### Expected Output
```
> zk-voting-frontend@0.1.0 dev
> next dev

  ▲ Next.js 14.0.0

  - Local:        http://localhost:3000
  - Environments: .env.local

  ✓ Ready in 2.1s
```

### If it fails:
```
Error: EACCES: permission denied
→ Run: npm install --global npm@latest

Error: Address already in use port 3000
→ Kill port 3000 or use different port
→ PORT=3001 npm run dev
```

---

## 3. Wallet Connection Test

### What You Should See

**Before Wallet Extension Installed:**
```
┌─ HEADER ─────────────────────────┐
│ Polkadot Voting                  │
│ [⚠ Install Polkadot.js] (button) │
└──────────────────────────────────┘

Warning message:
"Please install Polkadot.js extension to use this app"
```

**After Extension Installed (No Account):**
```
┌─ HEADER ─────────────────────────┐
│ Polkadot Voting                  │
│ [⚙ No Account] (button)          │
└──────────────────────────────────┘

Warning message:
"Create an account in Polkadot.js extension first"
```

**After Creating Account:**
```
┌─ HEADER ─────────────────────────┐
│ Polkadot Voting                  │
│ [1AGu...xK9A] (button) ✓         │
└──────────────────────────────────┘

(No warning)
Account successfully connected!
```

### In Browser Console (F12)
```
✓ Polkadot extension detected
✓ Account: 1AGu9ouBHfDwCzuNfhP3W5v4ZeXK9A
✓ Address available for proposals
```

---

## 4. Proposal Creation Test

### UI Steps
```
1. Click "Create Proposal" button
2. Fill in:
   - Title: "Test Proposal"
   - Description: "Testing ZK voting"
   - Duration: 24 hours (default)
3. Click "Create" button
4. Wait for transaction...
```

### Expected Response

**Success:**
```
✓ Proposal Created Successfully!
  Proposal ID: proposal_1710086400_abc123def456

Redirecting to home page...
```

### In Browser Network Tab

**Request:**
```
POST http://localhost:5000/proposal
Headers:
  Content-Type: application/json

Body:
{
  "title": "Test Proposal",
  "description": "Testing ZK voting",
  "endTime": 1710172800,
  "creator": "1AGu9ouBHfDwCzuNfhP3W5v4ZeXK9A"
}
```

**Response:**
```
Status: 201 Created
{
  "success": true,
  "proposalId": "proposal_1710086400_abc123def456",
  "message": "Proposal created successfully"
}
```

### On Home Page
```
┌─────────────────────────────────────┐
│ Active Proposals                     │
├─────────────────────────────────────┤
│ Test Proposal                        │
│ Testing ZK voting                    │
│ Created by: 1AGu9ouBH...xK9A        │
│ Status: Active (23h 59m remaining)   │
└─────────────────────────────────────┘
```

---

## 5. Voting Test

### UI Steps
```
1. Click proposal
2. See proposal details
3. Click "Yes" or "No" button
4. Wait for ZK proof generation...
5. Wait for server response...
```

### Expected Progression

**Step 1: Processing**
```
[● Processing vote...]
Button disabled, showing spinner
```

**Step 2: Success**
```
✓ Your vote has been recorded privately!

Vote results:
├─ Total votes: 1
├─ Privacy maintained: ✓
└─ Can vote on other proposals: ✓
```

---

## 6. ZK Proof Test (Browser DevTools)

### Open DevTools
```
F12 → Network tab → Filter: "vote"
Click vote button → Inspect POST request
```

### Expected Request Body
```json
{
  "proposalId": "proposal_1710086400_abc123def456",
  "proof": {
    "pi_a": [
      "1234567890abcdef1234567890abcdef12345678",
      "fedcba0987654321fedcba0987654321fedcba09",
      "1"
    ],
    "pi_b": [
      [
        "1111111111111111111111111111111111111111",
        "2222222222222222222222222222222222222222"
      ],
      [
        "3333333333333333333333333333333333333333",
        "4444444444444444444444444444444444444444"
      ],
      ["1", "0"]
    ],
    "pi_c": [
      "5555555555555555555555555555555555555555",
      "6666666666666666666666666666666666666666",
      "1"
    ],
    "protocol": "groth16",
    "curve": "bn128"
  },
  "nullifierHash": "abc123def456ghi789jkl012mno345pqr678stu",
  "voteCommitment": "xyz789abc123def456ghi789jkl012mno345pqr"
}
```

### ⚠️ Privacy Check
**THESE SHOULD NOT APPEAR IN REQUEST:**
- ❌ `"vote": 0` or `"vote": 1`
- ❌ `"userAddress": "1AGu..."`
- ❌ `"nullifier": "..."`

If they appear → **PRIVACY IS BROKEN!**

### Expected Response
```
Status: 201 Created
{
  "success": true,
  "message": "Vote recorded successfully"
}
```

---

## 7. Double Voting Prevention Test

### First Vote
```
Network POST to /vote:
Status: 201 Created ✓
Message: "Vote recorded successfully"

Browser shows:
✓ Your vote has been recorded privately!
```

### Second Vote (Same User, Same Proposal)
```
Network POST to /vote:
Status: 400 Bad Request ✗
Body: {
  "error": "User has already voted on this proposal (double voting detected)"
}

Browser shows:
✗ Error: User has already voted on this proposal
```

### In Database
```sql
sqlite3 backend/voting.db
SELECT nullifierHash FROM votes WHERE proposalId = 'proposal_xxx';

Results:
abc123def456ghi789jkl012mno345pqr678stu

(Only 1 entry for this user on this proposal)
```

---

## 8. Integration Test Output

### Command
```powershell
cd backend
npm run test:integration
```

### Expected Output
```
🧪 Starting ZK Voting Test Suite

Test 1: Creating Proposal...
✅ Proposal created: proposal_1710086400_xyz789

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

📊 Summary:
  ✓ Proposal creation works
  ✓ Proposal retrieval works
  ✓ ZK proof submission works
  ✓ Double voting prevention works
  ✓ Vote results retrieval works
```

### If Test Fails
```
❌ Test Failed: Request timeout

Common causes:
1. Backend not running → npm start
2. Port 5000 not accessible → check firewall
3. Database locked → restart backend
```

---

## 9. Database Query Results

### View Vote Records
```powershell
sqlite3 backend/voting.db
SELECT id, proposalId, nullifierHash FROM votes LIMIT 3;
```

**Expected Output:**
```
1|proposal_1710086400_abc|abc123def456ghi789jkl012m
2|proposal_1710086400_abc|def456ghi789jkl012mno345p
3|proposal_1710086400_def|xyz789abc123def456ghi789j
```

### Count Votes Per Proposal
```sql
SELECT proposalId, COUNT(*) as vote_count FROM votes GROUP BY proposalId;
```

**Expected Output:**
```
proposal_1710086400_abc|2
proposal_1710086400_def|1
proposal_1710086400_ghi|3
```

### Verify Privacy
```sql
PRAGMA table_info(votes);
```

**Expected Output:**
```
0|id|INTEGER|0||1
1|proposalId|TEXT|1||0
2|nullifierHash|TEXT|1|UNIQUE|0
3|proof|TEXT|1||0
4|voteCommitment|TEXT|1||0
5|timestamp|INTEGER|1||0
```

**Key checks:**
- ✅ Has: id, proposalId, nullifierHash, proof, voteCommitment, timestamp
- ❌ Missing: vote (0 or 1)
- ❌ Missing: creator, userAddress
- ✅ nullifierHash has UNIQUE constraint

---

## 10. Multi-User Test Output

### Setup: 3 Accounts
```
Account A: 1AGu9ouBHfDwCzuNfhP3W5v4ZeXK9A
Account B: 1GG9ZXpJYHrRiHbmQDYYRJY5hQYkSwNy
Account C: 1JkwpHRzQPtYxRFLH2aFKGwwZ7wBzCjZ
```

### Voting Sequence
```
Step 1: Account A creates "Should we upgrade?" proposal
  ✓ proposalId: proposal_1710086400_upgraded

Step 2: Account A votes "Yes"
  ✓ nullifierHash: aaaa111111111111111111111111
  ✓ Status: 201 Created

Step 3: Account B votes "No"  
  ✓ nullifierHash: bbbb222222222222222222222222
  ✓ Status: 201 Created

Step 4: Account C votes "Yes"
  ✓ nullifierHash: cccc333333333333333333333333
  ✓ Status: 201 Created

Step 5: Account A tries voting again
  ✗ Status: 400 Bad Request
  ✗ Error: "already voted"

Step 6: Account B votes on different proposal
  ✓ nullifierHash: bbbb444444444444444444444444 (different!)
  ✓ Status: 201 Created (allowed on different proposal)
```

### Database State
```sql
SELECT proposalId, nullifierHash FROM votes;

proposal_1710086400_upgraded|aaaa111111111111111111111111
proposal_1710086400_upgraded|bbbb222222222222222222222222
proposal_1710086400_upgraded|cccc333333333333333333333333
proposal_1710086401_other  |bbbb444444444444444444444444
```

**Verification:**
- ✅ 4 total votes
- ✅ 3 unique accounts
- ✅ All nullifierHash values unique
- ✅ Same account can vote on different proposals
- ✅ Same account cannot vote twice on same proposal

### Results Visible to All
```
Proposal: "Should we upgrade?"
Status: Active (23h 59m)
Total votes: 3
```

**NOT visible:**
- ❌ "2 votes for Yes, 1 for No"
- ❌ "User A voted Yes"
- ❌ "User B voted No"
- ❌ "User C's choice"

---

## 11. End-to-End Test Checklist

### ✅ Environment
- [ ] Backend starts successfully
- [ ] Frontend starts successfully
- [ ] Database created automatically
- [ ] No port conflicts (3000, 5000 free)

### ✅ Blockchain Integration
- [ ] Wallet extension installs
- [ ] Account creation works
- [ ] Address displays in header
- [ ] Wallet button updates on account switch

### ✅ ZK Proof System
- [ ] Vote button generates proof
- [ ] Network request shows pi_a, pi_b, pi_c
- [ ] Network request does NOT show vote value
- [ ] Backend accepts proof without error

### ✅ Privacy
- [ ] Vote results display total count
- [ ] Individual votes not revealed
- [ ] Database has no "vote" column  
- [ ] nullifierHash appears in every vote

### ✅ Security
- [ ] First vote accepted (201)
- [ ] Second vote rejected (400)
- [ ] Error message: "already voted"
- [ ] Can vote on different proposals

### ✅ Multi-User
- [ ] 3+ users can vote on same proposal
- [ ] Each user gets unique nullifierHash
- [ ] Vote count increments correctly
- [ ] No way to determine individual votes

---

## Troubleshooting Expected Errors

### Error: "Cannot find module"
```
Message: Error: Cannot find module 'express'
Fix: npm install
```

### Error: "Address already in use"
```
Message: Error: listen EADDRINUSE: address already in use :::5000
Fix: 
  1. netstat -ano | findstr :5000
  2. taskkill /PID <PID> /F
  3. npm start
```

### Error: "Wallet not connected"
```
Message: "Wallet not connected" warning on page
Fix:
  1. Install Polkadot.js extension
  2. Create account in extension
  3. Refresh page
  4. Click wallet button
```

### Error: "Request failed"
```
Message: "Error connecting to backend"
Fix:
  1. Check backend is running: npm start
  2. Check port 5000 is accessible
  3. Check cors is enabled in backend
```

---

## Success Indication

You've completed testing successfully when you see:

```
✅ Wallet displays address
✅ Proposal appears in list
✅ Vote submission succeeds (201)
✅ Double vote rejected (400)
✅ Network request shows proof (no vote value)
✅ Database shows nullifierHash is unique
✅ Results display vote count (not breakdown)
✅ Integration tests all pass

🎉 SYSTEM WORKING CORRECTLY! 🎉
```

