# Quick Start Guide - Private DAO Voting System

## Prerequisites

Ensure you have:
- **Node.js** 16+ (check with `node --version`)
- **npm** 8+ (check with `npm --version`)
- **Git** (for version control)
- A Polkadot/Ethereum compatible wallet with testnet tokens

## Step 1: Setup Dependencies

### Resolve npm package version issues

If you encounter npm version errors, use:

```powershell
# Clean npm cache
npm cache clean --force

# Remove existing node_modules if present
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item package-lock.json -ErrorAction SilentlyContinue

# Install with legacy peer deps flag
npm install --legacy-peer-deps
```

### Install Frontend Dependencies

```powershell
cd frontend
npm install --legacy-peer-deps
cd ..
```

## Step 2: Generate Groth16 Verifier

The voting circuit requires a Groth16 verifier for ZK proofs. Generate it with:

```powershell
# Compile the Circom circuit to R1CS
circom circuits/vote.circom --r1cs --wasm

# If circom is not installed globally:
npm install -g circom

# Setup groth16 ceremony (uses provided PTAU file)
npx snarkjs groth16 setup circuits/vote.r1cs circuits/pot12_final.ptau circuits/vote_0000.zkey

# Contribute to the ceremony
npx snarkjs zkey contribute circuits/vote_0000.zkey circuits/vote_final.zkey --name="Contribution" -v

# Export Solidity verifier contract
npx snarkjs zkey export solidityverifier circuits/vote_final.zkey contracts/Verifier.sol

# Export verification key for frontend
npx snarkjs zkey export vkey circuits/vote_final.zkey circuits/vote_verification_key.json
```

**What this does:**
- Generates proving keys (used by client to create proofs)
- Generates verification keys (used by contract to verify proofs)
- Creates `contracts/Verifier.sol` (auto-generated - do not edit manually)

## Step 3: Compile Smart Contracts

```powershell
npx hardhat compile
```

This will:
- Check all Solidity code for errors
- Generate contract ABIs
- Create artifacts in the `artifacts/` folder

## Step 4: Configure Deployment Settings

Edit `.env` with your settings:

```powershell
# Open .env in your editor
# Update these values:

DEPLOYER_PRIVATE_KEY=0x...          # Your account's private key (test account)
KEYHOLDER_0=0xAddress1              # First keyholder address
KEYHOLDER_1=0xAddress2              # Second keyholder address  
KEYHOLDER_2=0xAddress3              # Third keyholder address
RPC_URL=wss://asset-hub-paseo-rpc.polkadot.io
NETWORK=asset-hub-paseo
```

**Important Security Notes:**
- Never use mainnet accounts for testing
- Never commit `.env` to git
- Use test accounts with minimal funds only

## Step 5: Deploy to Polkadot PVM (Paseo Asset Hub)

### Setup Polkadot Network in MetaMask

Before deployment, add Polkadot to your wallet:

1. Open MetaMask
2. Settings → Networks → Add Network
3. Fill in:
   - **Network Name**: Paseo Asset Hub
   - **RPC URL**: https://asset-hub-paseo-rpc.polkadot.io
   - **Chain ID**: 420420421
   - **Currency Symbol**: DOT
   - **Block Explorer**: https://assethub-paseo.subscan.io

### Deploy Contracts

```powershell
# Deploy to Paseo Asset Hub testnet
npx hardhat run scripts/deploy.js --network paseo-asset-hub
```

**Expected Output:**
```
ChaumPedersen deployed to: 0x...
Verifier deployed to: 0x...
PrivateVoting deployed to: 0x...

Deployment addresses saved to: deployments.json
```

### Save Contract Addresses

After deployment, update `.env`:

```powershell
REACT_APP_CONTRACT_ADDRESS=0x...        # PrivateVoting contract
REACT_APP_VERIFIER_ADDRESS=0x...        # Verifier contract
REACT_APP_CHAUM_PEDERSEN_ADDRESS=0x...  # ChaumPedersen contract
```

## Step 6: Launch Frontend

```powershell
cd frontend
npm run dev
```

The frontend will start at `http://localhost:5173`

### Frontend Features:

1. **Proposals Page** (`/proposals`)
   - View all proposals
   - See vote counts and status
   - Create new proposal or vote

2. **Create Proposal** (`/create`)
   - Set description, options (2-10)
   - Choose voting mode (normal or quadratic)
   - Set voting period and thresholds

3. **Vote Page** (`/vote/:proposalId`)
   - Step 1: Connect wallet
   - Step 2: Verify eligibility
   - Step 3: Select vote option
   - Step 4: Generate ZK proof
   - Step 5: Submit encrypted vote

4. **Results Page** (`/result/:proposalId`)
   - View voting results (when revealed)
   - Bar chart of vote distribution
   - Privacy guarantee explanation

## Step 7: Run Keyholder Services (Optional)

For each keyholder (3 needed for full system):

```powershell
# Terminal 1 - Keyholder 0
$env:KEYHOLDER_INDEX="0"
$env:KEYHOLDER_0_PRIVATE_KEY="0x..."
$env:CONTRACT_ADDRESS="0x..."
node scripts/keyholder.js

# Terminal 2 - Keyholder 1
$env:KEYHOLDER_INDEX="1"
$env:KEYHOLDER_1_PRIVATE_KEY="0x..."
$env:CONTRACT_ADDRESS="0x..."
node scripts/keyholder.js

# Terminal 3 - Keyholder 2
$env:KEYHOLDER_INDEX="2"
$env:KEYHOLDER_2_PRIVATE_KEY="0x..."
$env:CONTRACT_ADDRESS="0x..."
node scripts/keyholder.js
```

These services will:
- Listen for proposal creation
- Automatically submit DKG public keys
- Submit partial decryptions when voting ends

## Testing the System

### Full E2E Test Flow

1. **Create Proposal**
   - Type: `localhost:5173/create`
   - Fill in proposal details
   - Submit

2. **DKG Phase** (Distributed Key Generation)
   - Run keyholder services
   - Each keyholder submits public key
   - Status changes from PENDING_DKG → ACTIVE

3. **Cast Votes**
   - Type: `localhost:5173/proposals`
   - Click "Vote" on active proposal
   - Follow 5-step process
   - Multiple users can vote

4. **End Voting**
   - Click "End Voting" after voting period
   - Status changes to ENDED
   - Keyholders begin decryption

5. **Decrypt & Reveal**
   - Keyholders submit partial decryptions
   - After threshold reached (2-of-3)
   - Results automatically revealed
   - Status changes to REVEALED

## Troubleshooting

### npm install fails
```powershell
npm cache clean --force
npm install --legacy-peer-deps
```

### "Verifier not found" error
- Run the snarkjs commands in Step 2
- Ensure `contracts/Verifier.sol` is populated

### "Contract not found" on frontend
- Check REACT_APP_CONTRACT_ADDRESS in .env
- Verify contract deployed to same network
- Check RPC_URL matches deployment network

### MetaMask "Wrong Network" error
- Add Paseo Asset Hub network to MetaMask
- Switch to that network
- Reload frontend

### Proof generation too slow
- First proof takes 5-10 seconds (normal)
- Ensure browser console doesn't show errors
- Check that vote.wasm and vote_final.zkey exist in public folder

## File Structure After Setup

```
project/
├── contracts/
│   ├── PrivateVoting.sol      ✓ Main contract
│   ├── ChaumPedersen.sol      ✓ Verifier contract
│   ├── Verifier.sol           ← Generated by snarkjs
│   └── ...
├── circuits/
│   ├── vote.circom            ✓ ZK circuit
│   ├── vote.r1cs              ← Generated by circom
│   ├── vote.wasm              ← Generated by circom
│   ├── vote_final.zkey        ← Generated by snarkjs
│   ├── vote_verification_key.json ← Generated by snarkjs
│   └── pot12_final.ptau       ✓ PTAU file (provided)
├── frontend/
│   ├── src/
│   │   ├── pages/             ✓ React pages
│   │   ├── utils/             ✓ Utilities
│   │   └── ...
│   ├── public/
│   │   └── circuits/          ← Add vote.wasm, vote_final.zkey here
│   └── ...
├── scripts/
│   ├── deploy.js              ✓ Deployment script
│   └── keyholder.js           ✓ Keyholder service
├── .env                       ← Configuration (created)
├── hardhat.config.js          ✓ Hardhat config
└── package.json               ✓ Dependencies
```

## Next Steps

1. ✅ Install dependencies (with --legacy-peer-deps if needed)
2. ✅ Generate Verifier with snarkjs
3. ✅ Compile contracts with hardhat
4. ✅ Update .env with your settings
5. ✅ Deploy to Paseo Asset Hub
6. ✅ Update .env with contract addresses
7. ✅ Run frontend development server
8. ✅ Test creating proposals and voting
9. ✅ Run keyholder services for full E2E test

## Security Reminders

🔒 **Never:**
- Commit `.env` to git
- Use mainnet accounts for testing
- Share private keys
- Deploy without security review

✅ **Always:**
- Use test accounts only
- Store keys in encrypted format
- Review contract code before deployment
- Test thoroughly on testnet first

## Resources

- [Polkadot PVM Docs](https://github.com/polkadot-builders/pallet-revive)
- [Circom Docs](https://docs.circom.io/)
- [snarkjs Docs](https://github.com/iden3/snarkjs)
- [Hardhat Docs](https://hardhat.org/)
- [ethers.js Docs](https://docs.ethers.org/v6/)

---

**For more detailed setup, see IMPLEMENTATION_GUIDE.md**
