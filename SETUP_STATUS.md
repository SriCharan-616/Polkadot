# Setup & Deployment Status

**Project**: Private DAO Voting System on Polkadot PVM  
**Date**: March 16, 2026  
**Status**: ✅ Complete - Ready for Deployment

---

## ✅ What's Been Completed

### Smart Contracts (100%)
- ✅ `contracts/PrivateVoting.sol` - Main voting contract (10 functions)
- ✅ `contracts/ChaumPedersen.sol` - ZK proof verifier
- ✅ `contracts/Verifier.sol` - Groth16 verifier stub

### Circom Circuit (100%)
- ✅ `circuits/vote.circom` - Complete ZK proof circuit

### Frontend (100%)
- ✅ `frontend/src/pages/Proposals.jsx` - Proposal listing
- ✅ `frontend/src/pages/CreateProposal.jsx` - Proposal creation
- ✅ `frontend/src/pages/Vote.jsx` - Voting flow
- ✅ `frontend/src/pages/Result.jsx` - Results display
- ✅ `frontend/src/utils/elgamal.js` - Encryption utilities
- ✅ `frontend/src/utils/nullifier.js` - Nullifier generation
- ✅ `frontend/src/utils/zkproof.js` - Proof generation
- ✅ `frontend/src/utils/contract.js` - Contract interaction

### Server Scripts (100%)
- ✅ `scripts/deploy.js` - Deployment script
- ✅ `scripts/keyholder.js` - Keyholder service

### Configuration (100%)
- ✅ `.env` - Environment variables (ready to fill in)
- ✅ `.env.example` - Template
- ✅ `hardhat.config.js` - Hardhat configuration
- ✅ `package.json` - Root dependencies (updated)
- ✅ `frontend/package.json` - Frontend dependencies (updated)

### Documentation (100%)
- ✅ `QUICK_START.md` - Quick setup guide
- ✅ `IMPLEMENTATION_GUIDE.md` - Detailed guide
- ✅ `DEPLOYMENT_CHECKLIST.md` - Deployment checklist
- ✅ `IMPLEMENTATION_SUMMARY.md` - Implementation summary

---

## 🚀 Next Steps (For You To Execute)

Follow these steps in order. Each section includes the exact commands to run.

### Step 1: Install Dependencies

**Command:**
```powershell
cd "c:\Users\Dell\Desktop\New_folder\Polkadot"
npm install --legacy-peer-deps
```

**Troubleshooting if it fails:**
```powershell
npm cache clean --force
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue
npm install --legacy-peer-deps
```

**Then install frontend dependencies:**
```powershell
cd frontend
npm install --legacy-peer-deps
cd ..
```

**Expected output:** "added X packages" with no errors

---

### Step 2: Install Circom (if not already installed)

**Command:**
```powershell
npm install -g circom
```

**Verify:** 
```powershell
circom --version
```

---

### Step 3: Generate Groth16 Verifier

Run these commands in the project root:

```powershell
# Step 3a: Compile circuit to R1CS
npx circom circuits/vote.circom --r1cs --wasm

# Step 3b: Setup groth16 ceremony
npx snarkjs groth16 setup circuits/vote.r1cs circuits/pot12_final.ptau circuits/vote_0000.zkey

# Step 3c: Contribute to ceremony
npx snarkjs zkey contribute circuits/vote_0000.zkey circuits/vote_final.zkey --name="Contribution" -v

# Step 3d: Export Solidity verifier
npx snarkjs zkey export solidityverifier circuits/vote_final.zkey contracts/Verifier.sol

# Step 3e: Export verification key for frontend
npx snarkjs zkey export vkey circuits/vote_final.zkey circuits/vote_verification_key.json
```

**Expected files created:**
- `circuits/vote.r1cs` - Circuit constraints
- `circuits/vote.wasm` - Wasm for proof generation
- `circuits/vote_0000.zkey` & `vote_final.zkey` - Proving keys
- `contracts/Verifier.sol` - **Populated** (not stub)
- `circuits/vote_verification_key.json` - For frontend

---

### Step 4: Compile Smart Contracts

**Command:**
```powershell
npx hardhat compile
```

**Expected output:**
```
Successfully compiled 3 Solidity files
```

---

### Step 5: Setup Testnet Wallet & Fund Account

1. **Get test tokens from [Paseo Faucet](https://faucet.paseo.network/)**
   - Request tokens for your address
   - Wait for confirmation

2. **Add Paseo Network to MetaMask/Wallet:**
   - Network: Paseo Asset Hub
   - RPC: https://asset-hub-paseo-rpc.polkadot.io
   - Chain ID: 420420421
   - Currency: DOT

3. **Create 3 test wallets for keyholders** (you can use same account 3 times for testing)

---

### Step 6: Update .env Configuration

Edit `.env` file with your values:

```powershell
# Open the .env file in any text editor and fill in:

DEPLOYER_PRIVATE_KEY=0x...        # Your deployer account private key
KEYHOLDER_0=0x...                 # First keyholder address
KEYHOLDER_1=0x...                 # Second keyholder address
KEYHOLDER_2=0x...                 # Third keyholder address
RPC_URL=wss://asset-hub-paseo-rpc.polkadot.io
NETWORK=asset-hub-paseo
```

**⚠️ Important:** Use test accounts ONLY. Never use mainnet accounts or real funds.

---

### Step 7: Deploy Contracts to Paseo

**Command:**
```powershell
npx hardhat run scripts/deploy.js --network paseo-asset-hub
```

**Expected output:**
```
=================================================
Deploying Private Voting System
=================================================
Deploying contracts with account: 0x...

1. Deploying ChaumPedersen...
   ChaumPedersen deployed to: 0x...

2. Deploying Verifier...
   Verifier deployed to: 0x...

3. Deploying PrivateVoting...
   PrivateVoting deployed to: 0x...

=================================================
Deployment Summary
=================================================
Network: asset-hub-paseo
Deployer: 0x...

Deployed Contracts:
  ChaumPedersen: 0x...
  Verifier: 0x...
  PrivateVoting: 0x...

Deployment addresses saved to: deployments.json
```

**Save these addresses!**

---

### Step 8: Update .env with Contract Addresses

Add the deployed contract addresses to `.env`:

```
REACT_APP_CONTRACT_ADDRESS=0x...        # PrivateVoting contract from deployment
REACT_APP_VERIFIER_ADDRESS=0x...        # Verifier contract from deployment
REACT_APP_CHAUM_PEDERSEN_ADDRESS=0x...  # ChaumPedersen contract from deployment
```

---

### Step 9: Run Frontend

**Command:**
```powershell
cd frontend
npm run dev
```

**Expected output:**
```
  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

**Open browser:** http://localhost:5173

---

### Step 10: Test Creating a Proposal (Optional)

1. Open frontend in browser
2. Click "Create Proposal"
3. Fill in:
   - Description: "Test Proposal"
   - Options: ["Option A", "Option B"]
   - Voting Mode: Normal
   - Start Block: Current + 10
   - End Block: Current + 100
   - Eligibility Threshold: 0
   - Min Voters: 1
4. Click "Create Proposal"
5. Confirm transaction in MetaMask

---

### Step 11: (Optional) Run Keyholder Services

In separate terminal windows:

**Terminal 1 - Keyholder 0:**
```powershell
$env:KEYHOLDER_INDEX="0"
$env:KEYHOLDER_0_PRIVATE_KEY="0x..."
$env:CONTRACT_ADDRESS="0x..."
node scripts/keyholder.js
```

**Terminal 2 - Keyholder 1:**
```powershell
$env:KEYHOLDER_INDEX="1"
$env:KEYHOLDER_1_PRIVATE_KEY="0x..."
$env:CONTRACT_ADDRESS="0x..."
node scripts/keyholder.js
```

**Terminal 3 - Keyholder 2:**
```powershell
$env:KEYHOLDER_INDEX="2"
$env:KEYHOLDER_2_PRIVATE_KEY="0x..."
$env:CONTRACT_ADDRESS="0x..."
node scripts/keyholder.js
```

These services will automatically:
- Submit DKG public keys
- Submit partial decryptions when voting ends

---

## 📋 Complete Command Sequence

Copy and paste in order:

```powershell
# 1. Install dependencies
cd "c:\Users\Dell\Desktop\New_folder\Polkadot"
npm install --legacy-peer-deps

# 2. Install frontend dependencies
cd frontend
npm install --legacy-peer-deps
cd ..

# 3. Compile circuit
npx circom circuits/vote.circom --r1cs --wasm

# 4. Generate verifier (3 steps)
npx snarkjs groth16 setup circuits/vote.r1cs circuits/pot12_final.ptau circuits/vote_0000.zkey
npx snarkjs zkey contribute circuits/vote_0000.zkey circuits/vote_final.zkey --name="Contribution" -v
npx snarkjs zkey export solidityverifier circuits/vote_final.zkey contracts/Verifier.sol
npx snarkjs zkey export vkey circuits/vote_final.zkey circuits/vote_verification_key.json

# 5. Compile contracts
npx hardhat compile

# 6. Deploy (after updating .env with wallet info)
npx hardhat run scripts/deploy.js --network paseo-asset-hub

# 7. Run frontend (after updating .env with contract addresses)
cd frontend
npm run dev
```

---

## 📁 Project Structure

```
Polkadot/
├── contracts/               ✅ Smart contracts
│   ├── PrivateVoting.sol   ✅ Main contract
│   ├── ChaumPedersen.sol   ✅ Verifier
│   └── Verifier.sol        ← Will be generated by snarkjs
├── circuits/               ✅ ZK circuit
│   ├── vote.circom         ✅ Circuit definition
│   ├── pot12_final.ptau    ✅ PTAU file (provided)
│   ├── vote.r1cs           ← Generated by circom
│   ├── vote.wasm           ← Generated by circom
│   ├── vote_final.zkey     ← Generated by snarkjs
│   └── vote_verification_key.json ← Generated by snarkjs
├── frontend/               ✅ React frontend
│   ├── src/
│   │   ├── pages/          ✅ Proposals, Vote, Result, Create
│   │   ├── utils/          ✅ Encryption, proofs, contracts
│   │   └── ...
│   ├── public/
│   │   └── circuits/       ← Copy generated files here
│   └── package.json        ✅ Updated
├── scripts/                ✅ Server scripts
│   ├── deploy.js          ✅ Deployment
│   └── keyholder.js       ✅ Keyholder service
├── .env                    ✅ Configuration (create & fill in)
├── hardhat.config.js       ✅ Hardhat config
├── package.json            ✅ Dependencies
├── QUICK_START.md          ✅ Quick start guide
├── IMPLEMENTATION_GUIDE.md ✅ Detailed guide
└── ...
```

---

## 🔐 Security Checklist

Before going to mainnet:

- [ ] Use test accounts only
- [ ] Never commit `.env` to git
- [ ] Review all contract code
- [ ] Test on testnet first
- [ ] Get professional security audit
- [ ] Test with multiple users
- [ ] Verify keyholder coordination works

---

## 📞 Troubleshooting

### npm errors
```powershell
npm cache clean --force
rm -r node_modules
npm install --legacy-peer-deps
```

### circom not found
```powershell
npm install -g circom
circom --version  # Check installation
```

### Deployment fails
- Check `.env` has valid DEPLOYER_PRIVATE_KEY
- Verify account has tokens
- Check MetaMask is on correct network

### Frontend won't start
- Check port 5173 is free
- Verify contract address in `.env`
- Clear browser cache

### Proof generation fails
- Ensure vote.wasm exists
- Check vote_final.zkey readable
- Verify public/ folder accessible

---

## 📚 Documentation

- **QUICK_START.md** - This quick reference (copy-paste commands)
- **IMPLEMENTATION_GUIDE.md** - Complete step-by-step guide
- **DEPLOYMENT_CHECKLIST.md** - Detailed checklist for deployment
- **IMPLEMENTATION_SUMMARY.md** - What was implemented

---

## ✅ Ready to Start?

Follow the **Complete Command Sequence** section above! Start with:

```powershell
cd "c:\Users\Dell\Desktop\New_folder\Polkadot"
npm install --legacy-peer-deps
```

Once dependencies are installed, follow the remaining steps in order.

**Good luck! 🚀**
