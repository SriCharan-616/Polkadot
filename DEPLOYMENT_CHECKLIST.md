# Deployment Checklist - Private DAO Voting System

Use this checklist to ensure all components are properly configured and deployed.

## Pre-Deployment Setup

### 1. Dependencies
- [ ] Install Node.js 16+ and npm
- [ ] Clone repository
- [ ] Run `npm install` in root directory
- [ ] Run `npm install` in frontend directory
- [ ] Verify installations with `npm list`

### 2. Wallet & Accounts
- [ ] Create 3 Polkadot/Ethereum compatible wallets for keyholders
- [ ] Get keyholder addresses:
  - [ ] KEYHOLDER_0: 0x...
  - [ ] KEYHOLDER_1: 0x...
  - [ ] KEYHOLDER_2: 0x...
- [ ] Fund deployer account with testnet tokens
- [ ] Save private keys in secure location (encrypted)

### 3. Environment Configuration
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in all environment variables:
  ```
  DEPLOYER_PRIVATE_KEY=...
  KEYHOLDER_0=...
  KEYHOLDER_1=...
  KEYHOLDER_2=...
  RPC_URL=...
  CHAIN_ID=...
  ```

## Circom Circuit & Proofs

### 4. Circuit Compilation
- [ ] Verify `circuits/vote.circom` exists
- [ ] Compile circuit to R1CS:
  ```bash
  circom circuits/vote.circom --r1cs --wasm
  ```
- [ ] Check R1CS file created: `circuits/vote.r1cs`

### 5. Groth16 Setup
- [ ] Verify PTAU file exists: `circuits/pot12_final.ptau` OR `circuits/pot12_0000.ptau`
- [ ] Run groth16 setup:
  ```bash
  snarkjs groth16 setup circuits/vote.r1cs circuits/pot12_final.ptau circuits/vote_0000.zkey
  ```
- [ ] Contribute to ceremony:
  ```bash
  snarkjs zkey contribute circuits/vote_0000.zkey circuits/vote_final.zkey
  ```

### 6. Solidity Verifier Export
- [ ] Export verifier contract:
  ```bash
  snarkjs zkey export solidityverifier circuits/vote_final.zkey contracts/Verifier.sol
  ```
- [ ] Verify `contracts/Verifier.sol` is populated (not stub)
- [ ] Check that Verifier implements `IVerifier` interface

### 7. Verification Key Export
- [ ] Export verification key for frontend:
  ```bash
  snarkjs zkey export vkey circuits/vote_final.zkey circuits/vote_verification_key.json
  ```
- [ ] Place in `frontend/public/circuits/`

## Smart Contracts

### 8. Contract Compilation
- [ ] Run `npx hardhat compile`
- [ ] Check for compilation errors
- [ ] Verify all artifacts in `artifacts/` directory

### 9. Contract Tests (Optional)
- [ ] Create test file: `test/PrivateVoting.test.js`
- [ ] Run `npx hardhat test`
- [ ] All tests should pass

### 10. Contract Verification Code
- [ ] Review `contracts/PrivateVoting.sol`
- [ ] Review `contracts/ChaumPedersen.sol`
- [ ] Check constants match specifications
- [ ] Verify event definitions

## Contract Deployment

### 11. Deploy to Testnet
- [ ] Set network to `paseo-asset-hub` in hardhat config
- [ ] Run deployment:
  ```bash
  npx hardhat run scripts/deploy.js --network paseo-asset-hub
  ```
- [ ] Record contract addresses:
  - [ ] PrivateVoting: 0x...
  - [ ] ChaumPedersen: 0x...
  - [ ] Verifier: 0x...
- [ ] Save to `deployments.json`

### 12. Update Frontend Config
- [ ] Update `.env` with contract addresses:
  ```
  REACT_APP_CONTRACT_ADDRESS=0x...
  REACT_APP_VERIFIER_ADDRESS=0x...
  REACT_APP_CHAUM_PEDERSEN_ADDRESS=0x...
  ```
- [ ] Verify RPC URL is correct
- [ ] Check CHAIN_ID matches deployment network

## Frontend Setup

### 13. Frontend Build
- [ ] Navigate to frontend directory
- [ ] Run `npm install` if needed
- [ ] Run `npm run build` to check for build errors
- [ ] Verify no TypeScript errors

### 14. Create Frontend ABI File
- [ ] Copy contract ABI from `artifacts/contracts/PrivateVoting.sol/PrivateVoting.json`
- [ ] Save to `frontend/src/utils/PrivateVoting.abi.json`
- [ ] Update `contract.js` to import the ABI

### 15. Test Frontend Locally
- [ ] Run `npm run dev` in frontend directory
- [ ] Open browser to `http://localhost:5173`
- [ ] Check for console errors
- [ ] Verify Tailwind CSS is loaded

## Keyholder Servers

### 16. Prepare Keyholder Services
For each of the 3 keyholders:
- [ ] Create separate environment file: `.env.keyholder0`, `.env.keyholder1`, `.env.keyholder2`
- [ ] Set `KEYHOLDER_INDEX` (0, 1, or 2)
- [ ] Set `KEYHOLDER_*_PRIVATE_KEY`
- [ ] Set `CONTRACT_ADDRESS`

### 17. Test Keyholder Services (Optional)
- [ ] Run one keyholder service: `KEYHOLDER_INDEX=0 node scripts/keyholder.js`
- [ ] Check console output for successful initialization
- [ ] Verify it's listening for events

## End-to-End Testing

### 18. Create Test Proposal
- [ ] Open frontend in browser
- [ ] Connect MetaMask or Polkadot.js
- [ ] Go to "Create Proposal" page
- [ ] Fill in proposal details:
  - [ ] Description
  - [ ] 2-10 options
  - [ ] Voting mode (normal or quadratic)
  - [ ] Start block (future block)
  - [ ] End block (greater than start)
  - [ ] Eligibility threshold
  - [ ] Minimum voters (≥10)
- [ ] Submit and wait for confirmation

### 19. DKG Phase
- [ ] Check proposal status is "PENDING_DKG"
- [ ] Run keyholder services (all 3 if possible)
- [ ] Each keyholder should submit public key automatically
- [ ] Wait for all 3 to submit
- [ ] Status should change to "ACTIVE"

### 20. Casting Votes
- [ ] Go to proposal page
- [ ] Multiple test accounts should vote:
  - [ ] Connect wallet
  - [ ] Verify eligibility
  - [ ] Select option
  - [ ] Generate ZK proof
  - [ ] Submit vote
- [ ] Repeat with at least 10 different wallets
- [ ] Check vote count increments

### 21. End Voting
- [ ] Wait for end block to pass
- [ ] Click "End Voting" button
- [ ] If vote count ≥ min threshold:
  - [ ] Status = "ENDED"
- [ ] If vote count < min threshold:
  - [ ] Status = "CANCELLED"

### 22. Partial Decryption
- [ ] If voting ended successfully, launch keyholder services
- [ ] Each keyholder should automatically submit partial decryption
- [ ] After 2 of 3 submit:
  - [ ] Status = "REVEALED"
  - [ ] Results are published

### 23. View Results
- [ ] Click "View Result" on proposal
- [ ] Check that:
  - [ ] Results are displayed correctly
  - [ ] Winning option is highlighted
  - [ ] Bar chart shows vote distribution
  - [ ] Individual vote count is shown per option

## Post-Deployment

### 24. Documentation
- [ ] Create deployment report with contract addresses
- [ ] Document any modifications to original instructions
- [ ] Update README with deployment details
- [ ] Create user guide for voting

### 25. Security Review
- [ ] Review smart contract for vulnerabilities
- [ ] Check for reentrancy issues
- [ ] Verify require statements
- [ ] Validate input ranges

### 26. Monitoring
- [ ] Set up event monitoring/logging
- [ ] Create alerts for contract events
- [ ] Monitor gas usage
- [ ] Track keyholder service health

### 27. Production Readiness
- [ ] Plan mainnet deployment timeline
- [ ] Get security audit (recommended)
- [ ] Create disaster recovery plan
- [ ] Document emergency procedures

## Troubleshooting Reference

### Issue: Revert "Only keyholder can call"
**Fix**: Ensure transactions are sent from one of the 3 keyholder addresses set in constructor

### Issue: Revert "Invalid ZK proof"
**Fix**: 
- Ensure voter meets eligibility threshold
- Check that public signals match circuit parameters
- Verify Verifier contract is correctly deployed

### Issue: "Contract not found" on testnet
**Fix**:
- Check contract address is correct
- Verify contract was deployed to same network
- Check RPC_URL matches network

### Issue: Proof generation takes very long
**Fix**:
- This is normal (3-5 seconds) on first run
- Check browser console for errors
- Ensure vote.wasm and vote_final.zkey are in public folder

### Issue: MetaMask network mismatch
**Fix**:
- Add Polkadot PVM network to MetaMask:
  - RPC: https://asset-hub-paseo-rpc.polkadot.io
  - Chain ID: 420420421
  - Currency: DOT
  - Block Explorer: https://assethub-paseo.subscan.io

## Checklist Sign-Off

- [ ] All security checks complete
- [ ] End-to-end testing passed
- [ ] Documentation updated
- [ ] Ready for production deployment

**Deployment Date**: _______________
**Deployed By**: _______________
**Notes**: 
_______________________________________________________________________________
