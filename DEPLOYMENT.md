# Deployment Guide

## Prerequisites

1. **Testnet Tokens**: Get PAS (Paseo Asset Hub) tokens from faucet
   - https://faucet.paleo.dev

2. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Keyholder Setup**:
   - Setup 3 keyholder addresses (can be same person on testnet)
   - Each needs private key for signing transactions

## Deployment Steps

### Step 1: Deploy Smart Contracts

```bash
# Compile contracts
npx hardhat compile

# Test locally first
npm test

# Deploy to Paseo Asset Hub
npm run deploy
```

This will:
1. Deploy ChaumPedersen.sol
2. Deploy MockVerifier.sol (replace with real verifier for production)
3. Deploy PrivateVoting.sol
4. Save deployment addresses to deployments.json

### Step 2: Update Frontend Configuration

After deployment, update `.env` with contract address:
```bash
REACT_APP_CONTRACT_ADDRESS=0x... # From deployment output
REACT_APP_RPC_URL=wss://asset-hub-paseo-rpc.polkadot.io
```

### Step 3: Start Keyholder Servers

On each keyholder's machine:

```bash
# Keyholder 1
export KEYHOLDER_INDEX=0
export KEYHOLDER_PRIVATE_KEY=0x...
npm run keyholder

# Keyholder 2
export KEYHOLDER_INDEX=1
export KEYHOLDER_PRIVATE_KEY=0x...
npm run keyholder

# Keyholder 3
export KEYHOLDER_INDEX=2
export KEYHOLDER_PRIVATE_KEY=0x...
npm run keyholder
```

The keyholder servers will:
- Listen for ProposalCreated events
- Participate in DKG by submitting public keys
- Listen for VotingEnded events
- Compute and submit partial decryptions

### Step 4: Start Frontend

```bash
npm run frontend
```

Accessible at http://localhost:3000

## Verification

### Check Deployment

```bash
# View deployed addresses
cat deployments.json

# Verify contract is live
npx hardhat verify \
  0x... \
  --network paseoAssetHub \
  keyholder0 keyholder1 keyholder2 verifier chaumPedersen
```

### Test Voting Flow

1. Create Proposal
2. Wait for DKG (keyholders auto-submit)
3. Vote once DKG completes
4. End voting
5. Wait for decryption (keyholders auto-submit)
6. View results

## Troubleshooting

### Contract Deployment Fails

```bash
# Check balance
npx hardhat run -c "
  const signer = await ethers.getSigner();
  const balance = await signer.getBalance();
  console.log('Balance:', balance);
"

# Check RPC connectivity
curl -X POST https://asset-hub-paseo-rpc.polkadot.io \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","id":1}'
```

### Proof Generation Fails

```bash
# Check circuit files exist
ls -la circuits/*.wasm circuits/*.zkey

# Verify proof circuits compiled
file circuits/vote.wasm
```

### Transactions Fail

```bash
# Check nonce
npx hardhat run -c "
  const signer = await ethers.getSigner();
  const nonce = await signer.getTransactionCount();
  console.log('Nonce:', nonce);
"

# Check pending transactions
npx hardhat run -c "
  const provider = ethers.getDefaultProvider();
  // Check mempool
"
```

### Keyholders Not Submitting

```bash
# Check keyholder can access contract
npx hardhat run scripts/keyholder.js

# Check private key is valid
npx hardhat run -c "
  const privateKey = process.env.KEYHOLDER_PRIVATE_KEY;
  const wallet = new ethers.Wallet(privateKey);
  console.log('Address:', wallet.address);
"

# Check logs for errors
tail -f keyholder.log
```

## Gas Optimization

Current gas estimates (testnet):

```
createProposal:              ~120,000 gas
submitPublicKey:             ~100,000 gas per keyholder
castVote:                    ~300,000 gas (includes ZK verification)
submitPartialDecryption:     ~250,000 gas per keyholder
Total per proposal:          ~770,000 gas
```

Cost at 1 Gwei:
- 1 proposal cycle: ~$0.77 (at $1000 ETH)
- Can reduce by batch operations

## Production Hardening

Before mainnet deployment:

1. **Code Audit**
   - [ ] Contract security audit
   - [ ] Circuit formal verification
   - [ ] Cryptography review

2. **Key Management**
   - [ ] HSM/Cold storage for keyholder keys
   - [ ] Multi-sig for critical functions
   - [ ] Key rotation procedure

3. **Monitoring**
   - [ ] Event logging
   - [ ] Anomaly detection
   - [ ] Failover procedures

4. **Testing**
   - [ ] Fuzz testing
   - [ ] Stress testing (1000+ proposals)
   - [ ] Long-running stability tests

5. **Governance**
   - [ ] DAO proposal for mainnet
   - [ ] Security committee
   - [ ] Emergency pause mechanism

## Rollback Plan

If critical issue found:

1. Stop accepting new proposals
2. Pause contract with governance
3. Deploy fixed version
4. Migrate state (if needed)
5. Communicate to users

## Support

- GitHub Issues: Report bugs and feature requests
- Discord: Community support channel
- Email: security@dao.vote for security issues
