# Quick Reference: Testing ZK & Blockchain

## 🚀 Start Services (3 terminals)

```powershell
# Terminal 1: Backend
cd backend
npm install
npm start

# Terminal 2: Frontend
cd frontend
npm install
npm run dev

# Terminal 3: Tests (optional)
cd backend
npm run test:integration
```

**Expected:**
- Backend: `Server running on http://localhost:5000`
- Frontend: `localhost:3000`
- Browser: Auto-opens to `http://localhost:3000`

---

## ✅ Smoke Test (2 minutes)

1. **Install wallet**: [Polkadot.js Extension](https://polkadot.js.org/extension/)
2. **Create account**: Click extension → Create account
3. **Connect wallet**: Click wallet button (top right) → should show address
4. **Create proposal**: Click "Create Proposal" → fill form → submit
5. **Vote**: Click proposal → click "Yes" or "No"
6. **Verify**: 
   - See "Your vote has been recorded" ✓
   - Vote count increments ✓
   - Refresh page → "already voted" error ✓

---

## 🧪 ZK Proof Test (5 minutes)

### What to check:
Open DevTools (F12) → Network tab → click vote button

**POST request to `/vote` should contain:**
```
✅ proof.pi_a (array)
✅ proof.pi_b (array)
✅ proof.pi_c (array)
✅ nullifierHash (hex string)
✅ voteCommitment (hex string)
❌ vote (should NOT appear)
❌ userAddress (should NOT appear)
```

If vote value appears → **PRIVACY BROKEN**

---

## 🔒 Privacy Check (3 minutes)

### Option A: Browser DevTools
```
1. F12 → Network → Filter: "vote"
2. Click vote button
3. Click the POST request
4. Check "Payload" tab
5. Verify no "vote: 0" or "vote: 1"
```

### Option B: Database Query
```powershell
# While backend is running:
sqlite3 backend/voting.db
SELECT * FROM votes;

# Verify:
# - No "vote" column
# - Each nullifierHash is UNIQUE
# - No user identities stored
```

---

## 🚫 Double Vote Prevention Test (2 minutes)

1. Create proposal
2. Vote "Yes" → see success
3. Click "Yes" again → see error "already voted"
4. Check DevTools Network:
   - Request 1: Status 201 ✓ (accepted)
   - Request 2: Status 400 ✓ (rejected)

---

## 🤖 Automated Tests (1 minute)

```powershell
# Check system is ready
cd backend
npm run test:check

# Run integration tests (backend must be running)
npm run test:integration

# Expected output:
# ✅ All Tests Passed!
# ✅ Proposal creation works
# ✅ ZK proof submission works
# ✅ Double voting prevention works
```

---

## 📊 View Vote Results

```powershell
# Query database
sqlite3 backend/voting.db

# Show all votes
SELECT COUNT(*) as total_votes FROM votes;
SELECT COUNT(DISTINCT nullifierHash) as unique_voters FROM votes;

# Show votes per proposal
SELECT proposalId, COUNT(*) as votes FROM votes GROUP BY proposalId;

# Verify privacy (no "vote" column exists)
PRAGMA table_info(votes);
# Should show: id, proposalId, nullifierHash, proof, voteCommitment, timestamp
# Should NOT show: vote, userAddress
```

---

## 📋 Test Checklist

### Environment
- [ ] Backend runs: `npm start` (port 5000)
- [ ] Frontend runs: `npm run dev` (port 3000)
- [ ] Database created: `backend/voting.db`

### Blockchain
- [ ] Polkadot.js extension installed
- [ ] Test account exists
- [ ] Wallet button shows address
- [ ] Can switch accounts

### ZK Proofs
- [ ] Vote request includes `proof` object
- [ ] Vote request includes `nullifierHash`
- [ ] Vote request includes `voteCommitment`
- [ ] Vote request does NOT include vote value

### Privacy
- [ ] Vote count displays correctly
- [ ] Individual votes not revealed
- [ ] Database has no "vote" column
- [ ] nullifierHash is unique per user per proposal

### Security
- [ ] Double voting is prevented
- [ ] Can vote on different proposals
- [ ] Cannot vote twice on same proposal
- [ ] Cannot vote after deadline

---

## 🔍 Debugging

### Wallet Button Shows "Loading" or "Error"
```
Fix:
1. Refresh page (Ctrl+Shift+R)
2. Check Polkadot.js extension is enabled
3. Check you created an account in extension
4. Check browser console (F12) for errors
```

### Backend Crashing
```
Check:
1. Is port 5000 free? → netstat -ano | findstr :5000
2. Install dependencies: npm install
3. Check Node.js version: node --version
4. Check database: ls backend/voting.db
```

### Vote Submission Fails
```
Check:
1. Backend is running: curl http://localhost:5000/proposals
2. Proposal exists: Check browser network → GET /proposals
3. Wallet connected: Click wallet button → show address
4. Check console errors: F12 → Console tab
```

### Database Errors
```
Reset database:
1. Stop backend (Ctrl+C)
2. Delete file: rm backend/voting.db
3. Restart backend: npm start
4. New database auto-creates with schema
```

---

## 📚 Documentation Files

- **[HOW_IT_WORKS.md](HOW_IT_WORKS.md)** - Detailed explanation of ZK & blockchain
- **[ZK_TESTING_GUIDE.md](ZK_TESTING_GUIDE.md)** - Complete testing guide
- **[TESTING.md](TESTING.md)** - Quick testing steps
- **[README.md](README.md)** - Project overview
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Development setup

---

## 🎯 Key Concepts

```
BLOCKCHAIN (Polkadot.js)
└─ Identifies user
   └─ Used for: Proposal creation only
   └─ NOT used for: Voting (privacy!)

ZERO-KNOWLEDGE PROOFS
└─ Proves vote is 0 or 1 without revealing which
   └─ Proof: pi_a, pi_b, pi_c (cryptographic)
   └─ Commitment: hash(vote, nullifier, proposalId)
   └─ Never reveals: vote value, nullifier

DOUBLE VOTING PREVENTION
└─ nullifierHash = hash(nullifier, proposalId)
   └─ Unique per user per proposal
   └─ Database UNIQUE constraint prevents duplicates

PRIVACY GUARANTEE
└─ Votes: HIDDEN ✓
   └─ Vote count: VISIBLE (transparent)
   └─ Individual choices: HIDDEN (private)
   └─ Total votes: VISIBLE (transparent)
```

---

## ⚡ One-Liner Commands

```powershell
# Start everything
cd backend && npm start & cd ../frontend && npm run dev

# Run all tests
cd backend && npm run test:integration

# Check system
cd backend && npm run test:check

# Query votes
sqlite3 backend/voting.db "SELECT COUNT(*) FROM votes;"

# Kill background processes
lsof -i :5000 | grep LISTEN | awk '{print $2}' | xargs kill
lsof -i :3000 | grep LISTEN | awk '{print $2}' | xargs kill
```

---

## 🆘 Still Need Help?

Check these files in order:
1. **[HOW_IT_WORKS.md](HOW_IT_WORKS.md)** - Understand the architecture
2. **[ZK_TESTING_GUIDE.md](ZK_TESTING_GUIDE.md)** - Run comprehensive tests
3. **[TESTING.md](TESTING.md)** - Quick test steps
4. Check browser console (F12) for error messages
5. Check backend logs for API errors

---

## ✅ Success Criteria

You've tested successfully when:

```
☑ Wallet connects → shows address
☑ Proposal appears in list
☑ Vote submission succeeds
☑ Vote count increments
☑ Network request shows proof (no vote value)
☑ Double vote is rejected
☑ Database query shows nullifierHash is unique
☑ Results page shows total votes (not breakdown)
```

**You're done! ✅**
