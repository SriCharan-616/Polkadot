# Quick Start Guide

## 5-Minute Setup (Local Testing)

### 1. Install Dependencies
```bash
# Project root
npm install

# Frontend
cd frontend && npm install && cd ..
```

### 2. Copy Environment File
```bash
cp .env.example .env
# Edit .env if needed (optional for local testing)
```

### 3. Run Tests
```bash
npm test
```

### 4. Deploy Locally
```bash
npx hardhat run scripts/deploy.js --network hardhat
```

Output will show contract addresses.

### 5. Start Frontend
```bash
npm run frontend
```

Visit http://localhost:3000

### 6. Create and Vote

1. **Create Proposal**:
   - Go to "Create Proposal"
   - Fill in description, 2-3 options
   - Set start block: current + 10
   - Set end block: start + 100
   - Submit

2. **Vote**:
   - Go to "Proposals"
   - Click "Vote" on active proposal
   - Select option
   - "Generate Proof & Submit Vote"
   - Wait for transaction

3. **View Results**:
   - After voting ends
   - Click "View Result"
   - See encrypted tally and results

---

## Full Deployment (Polkadot Testnet)

### 1. Setup Keyholders

Choose 3 addresses (team members or self) and get their private keys.

```bash
# .env
KEYHOLDER_0=0x...
KEYHOLDER_1=0x...
KEYHOLDER_2=0x...
PRIVATE_KEY=0x... # Your deployment key
```

### 2. Get Testnet Tokens

Visit https://faucet.paleo.dev - get PAS tokens to all 4 addresses.

### 3. Deploy Contracts

```bash
npm run deploy
```

This will output contract address. Update .env:
```bash
REACT_APP_CONTRACT_ADDRESS=0x... # From output
```

### 4. Start Keyholders (3 Terminals)

**Terminal 1:**
```bash
export KEYHOLDER_INDEX=0
export KEYHOLDER_PRIVATE_KEY=<private_key_1>
npm run keyholder
```

**Terminal 2:**
```bash
export KEYHOLDER_INDEX=1
export KEYHOLDER_PRIVATE_KEY=<private_key_2>
npm run keyholder
```

**Terminal 3:**
```bash
export KEYHOLDER_INDEX=2
export KEYHOLDER_PRIVATE_KEY=<private_key_3>
npm run keyholder
```

### 5. Start Frontend

```bash
npm run frontend
```

---

## Common Tasks

### Find Contract Address
```bash
cat deployments.json | grep privateVoting
```

### Check Proposal Status
```bash
npx hardhat run -c "
const votingABI = require('./artifacts/contracts/PrivateVoting.sol/PrivateVoting.json').abi;
const contract = new ethers.Contract(process.env.REACT_APP_CONTRACT_ADDRESS, votingABI, provider);
const p = await contract.getProposal(0);
console.log('Status:', p.status);
"
```

### View Encrypted Tally
```bash
npx hardhat run -c "
const contract = new ethers.Contract(ADDRESS, ABI, provider);
const tally = await contract.getEncryptedTally(proposalId);
console.log(tally);
"
```

### List All Proposals
```bash
# Frontend automatically fetches and displays
# Or query directly:
npx hardhat run scripts/getAllProposals.js
```

---

## Troubleshooting

### "Connection refused"
```bash
# Ensure RPC is running
curl https://asset-hub-paseo-rpc.polkadot.io
```

### "Insufficient balance"
```bash
# Get more testnet tokens
# Go to https://faucet.paleo.dev
```

### "Proof verification failed"
```bash
# Ensure circuit WASM and zkey files exist
ls -la circuits/*.wasm circuits/*.zkey

# If missing, build circuit:
circom circuits/vote.circom --wasm
# (requires proper key ceremony - for now use MockVerifier)
```

### "Keyholder not submitting"
```bash
# Check if watching events
# In keyholder.js logs should show event listening

# Verify contract address in .env
echo $REACT_APP_CONTRACT_ADDRESS

# Check keyholder has funds
```

### "Frontend won't connect wallet"
```bash
# Ensure MetaMask is installed
# Ensure you're on Paseo Asset Hub network
# Check browser console for errors
```

---

## Testing Your Circuit

If you want to use real Groth16 proofs instead of MockVerifier:

```bash
# 1. Install Circom
npm install -g circom snarkjs

# 2. Build circuit
cd circuits
circom vote.circom --r1cs --wasm

# 3. Generate proving key (requires Powers of Tau)
wget https://hermez.s3-us-west-2.amazonaws.com/ptau/powersOfTau28_hez_final_12.ptau
snarkjs groth16 setup vote.r1cs powersOfTau28_hez_final_12.ptau vote_0000.zkey
snarkjs zkey contribute vote_0000.zkey vote_final.zkey --name="Contribution"

# 4. Export Verifier
snarkjs zkey export solidityverifier vote_final.zkey ../contracts/Verifier.sol

# 5. Update zkproof.js to use real circuits
# Change circuits/ paths from mock to real
```

---

## File Checklist

Created for you:

```
✓ Smart Contracts
  ✓ contracts/PrivateVoting.sol (main contract)
  ✓ contracts/ChaumPedersen.sol (proof verifier)
  ✓ contracts/MockVerifier.sol (for testing)

✓ Circuits
  ✓ circuits/vote.circom (ZK circuit template)

✓ Frontend
  ✓ frontend/src/App.jsx (main app)
  ✓ frontend/src/pages/Proposals.jsx
  ✓ frontend/src/pages/CreateProposal.jsx
  ✓ frontend/src/pages/Vote.jsx
  ✓ frontend/src/pages/Result.jsx
  ✓ frontend/src/components/ProposalCard.jsx
  ✓ frontend/src/components/VoteForm.jsx
  ✓ frontend/src/utils/elgamal.js
  ✓ frontend/src/utils/nullifier.js
  ✓ frontend/src/utils/zkproof.js
  ✓ frontend/src/utils/contract.js
  ✓ frontend/public/index.html
  ✓ frontend/package.json

✓ Backend Scripts
  ✓ scripts/deploy.js
  ✓ scripts/keyholder.js
  ✓ scripts/dkg.js

✓ Configuration
  ✓ hardhat.config.js
  ✓ package.json
  ✓ .env.example
  ✓ .gitignore

✓ Tests
  ✓ test/PrivateVoting.test.js

✓ Documentation
  ✓ README.md (overview)
  ✓ ARCHITECTURE.md (design & data flow)
  ✓ DEPLOYMENT.md (production guide)
  ✓ circuits/README.md (circuit development)
  ✓ QUICKSTART.md (this file)
```

---

## Next Steps

1. **Local Testing**: Start with local hardhat network
2. **Testnet**: Deploy to Paseo Asset Hub
3. **Customization**: Modify circuit constraints as needed
4. **Audit**: Security review before production
5. **Mainnet**: Deploy to Polkadot mainnet (future)

---

## Support

- **Documentation**: See README.md and ARCHITECTURE.md
- **Circuit Troubleshooting**: See circuits/README.md
- **Deployment Issues**: See DEPLOYMENT.md
- **Code Issues**: Check test files for examples
- **Error Messages**: Check console logs and contract revert messages

🚀 **Happy voting!**
