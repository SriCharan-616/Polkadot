# 🗳️ Private DAO Voting System on Polkadot PVM

A cutting-edge private voting system using **ElGamal homomorphic encryption**, **zero-knowledge proofs (Groth16)**, and **threshold cryptography** for secure, privacy-preserving democratic governance on Polkadot's parachain virtual machine.

## 🎯 Key Features

- **Vote Privacy**: ElGamal homomorphic encryption ensures individual votes remain encrypted until results are revealed
- **Eligibility Proof**: Zero-knowledge proofs (Groth16/Circom) prove voting eligibility without revealing identity
- **Threshold Decryption**: Shamir's 2-of-3 threshold scheme requires cooperation of keyholders to reveal results
- **Quadratic Voting**: Optional quadratic voting mode (vote weight = √balance) for reduced plutocracy
- **Verifiable Results**: Chaum-Pedersen proofs ensure keyholders correctly compute partial decryptions
- **On-Chain Privacy**: All cryptographic operations work within Polkadot's gas constraints

## 📋 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Smart Contracts (Solidity)               │
├─────────────────────────────────────────────────────────────┤
│  PrivateVoting.sol          │ ChaumPedersen.sol             │
│  - Proposal management      │ - Proof verification          │
│  - Vote casting             │ - ZK-proof validation         │
│  - Homomorphic tallying     │                               │
│  - Threshold decryption     │                               │
└─────────────────────────────────────────────────────────────┘
           ↑                                    ↑
           │                                    │
    ┌──────┴──────────┐              ┌─────────┴──────┐
    │                 │              │                │
┌───────────┐  ┌─────────────┐  ┌──────────────┐  ┌──────────┐
│  Frontend │  │ Keyholder   │  │  Groth16     │  │  Circom  │
│  (React)  │  │  Servers    │  │  Verifier    │  │  Circuits│
└───────────┘  └─────────────┘  └──────────────┘  └──────────┘
```

## 🚀 Getting Started

### Prerequisites

- Node.js 16+
- Hardhat for smart contract development
- Circom for circuit compilation
- Rust (for circuit development)
- MetaMask or compatible Web3 wallet

### Installation

```bash
# Clone repository
git clone <repo>
cd PK

# Install root dependencies
npm install

# Install frontend dependencies
npm install --prefix frontend

# Copy environment template
cp .env.example .env
```

### Configuration

Edit `.env` with your values:

```bash
# Keyholder addresses (set to your team members' addresses)
KEYHOLDER_0=0x...
KEYHOLDER_1=0x...
KEYHOLDER_2=0x...

# RPC endpoint (Paseo Asset Hub)
RPC_URL=wss://asset-hub-paseo-rpc.polkadot.io

# Private key for deployment (only for testing)
PRIVATE_KEY=0x...
```

## 📦 Project Structure

```
PK/
├── contracts/
│   ├── PrivateVoting.sol          # Main voting contract
│   ├── ChaumPedersen.sol          # Proof verification
│   └── MockVerifier.sol           # Testing verifier
│
├── circuits/
│   ├── vote.circom                # ZK circuit for vote proof
│   └── build/                     # Generated artifacts
│
├── scripts/
│   ├── deploy.js                  # Contract deployment
│   ├── keyholder.js               # Keyholder server process
│   └── dkg.js                     # Distributed Key Generation
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Main app component
│   │   ├── pages/
│   │   │   ├── Proposals.jsx       # List proposals
│   │   │   ├── CreateProposal.jsx  # Create form
│   │   │   ├── Vote.jsx            # Voting interface
│   │   │   └── Result.jsx          # View results
│   │   ├── components/
│   │   │   ├── ProposalCard.jsx    # Proposal display
│   │   │   └── VoteForm.jsx        # Vote submission
│   │   └── utils/
│   │       ├── elgamal.js          # ElGamal encryption
│   │       ├── nullifier.js        # Nullifier generation
│   │       ├── zkproof.js          # Proof generation
│   │       └── contract.js         # Web3 interaction
│   ├── package.json
│   └── public/index.html
│
├── test/
│   └── PrivateVoting.test.js       # Contract tests
│
├── hardhat.config.js
├── package.json
├── .env.example
└── README.md
```

## 🔄 Voting Flow

### 1. Proposal Creation

```
Voter creates proposal
    ↓
[Contract] Generates new proposal ID
    ↓
Status: PENDING_DKG
```

### 2. Distributed Key Generation

```
[ProposalCreated event]
    ↓
[Keyholder 1,2,3] Generate key shares
    ↓
[Keyholder 1,2,3] Submit public keys
    ↓
Status: ACTIVE (when all 3 submit)
```

### 3. Voting

```
Eligible voter submits vote
    ↓
[Client] Generates ZK proof of eligibility
    ↓
[Client] Encrypts vote using ElGamal
    ↓
[Contract] Verifies proof
    ↓
[Contract] Homomorphically multiplies into tally
    ↓
Nullifier prevents double voting
```

### 4. Result Decryption

```
Voting period ends
    ↓
[Keyholder 1,2,3] Compute partial decryptions
    ↓
[Keyholder 1,2,3] Submit Chaum-Pedersen proofs
    ↓
[Contract] Lagrange interpolation (2-of-3)
    ↓
[Contract] Discrete log to get final vote counts
    ↓
Status: REVEALED
```

## 🏃 Running the System

### Local Development

```bash
# Terminal 1: Deploy contracts locally
npx hardhat test
npx hardhat run scripts/deploy.js --network hardhat

# Terminal 2: Start frontend
npm run frontend
```

### Production (Paseo Asset Hub)

```bash
# 1. Deploy contracts
npm run deploy

# 2. Update .env with contract address

# 3. Start keyholder server (on each keyholder's machine)
KEYHOLDER_INDEX=0 npm run keyholder
# (Repeat with KEYHOLDER_INDEX=1 and KEYHOLDER_INDEX=2)

# 4. Start frontend
npm run frontend
```

## 🔐 Cryptographic Details

### ElGamal Encryption

- **Field**: BN254 (21888242871839275222246405745257275088548364400416034343698204186575808495617)
- **Generator**: 5 (primitive generator)
- **Vote Encryption**: 
  - For each option i: encrypt_i = (g^r, g^{vote_i} * pk^r) mod p
  - Fresh nonce r for each option
  - Homomorphic property: E(a) ⊙ E(b) = E(a+b)

### Groth16 Proof (Circom Circuit)

Proves without revealing:
1. **Wallet Ownership**: walletPublicKey = Poseidon(walletPrivateKey)
2. **Eligibility**: tokenBalance ≥ threshold AND tokenBalance ≤ maxWeight
3. **Nullifier Correctness**: nullifier = Poseidon([Poseidon(privKey, nonce), proposalId])
4. **Vote Validity**: 
   - Normal mode: voteWeight = tokenBalance
   - Quadratic mode: floor(√tokenBalance) ≤ voteWeight < floor(√tokenBalance) + 1
5. **Option Range**: 0 ≤ voteOption < optionCount

### Threshold Decryption

- **Scheme**: (2,3) Shamir secret sharing
- **Key Share Distribution**: Each of 3 keyholders gets unique share
- **Decryption**: Only 2 of 3 can decrypt using Lagrange coefficients

### Chaum-Pedersen Proof

Keyholders prove:
- g^k = commitmentA
- c1^k = commitmentB
- Without revealing personal key share

## 📊 Vote Tallying

```
Encrypted Tally = ∏ encrypt(votes)

For each option:
  Partial_i = encryptedTally_i^{keyShare} (done by keyholder i)
  
Combine 2 of 3:
  Full_decryption = Lagrange(Partial_0, Partial_1)
  m_i = log_g(encryptedTally_i / Full_decryption)
  
Result: m_i = total votes for option i
```

## 🧪 Testing

```bash
# Run smart contract tests
npm test

# Test circuit compilation (when circuit is built)
# npx circom circuits/vote.circom --r1cs --wasm
```

## ⚠️ Security Considerations

### Current Implementation

- **Mock Verifier**: Tests use MockVerifier - replace with snarkjs-generated verifier for production
- **Local Key Storage**: Keyholder keys currently stored locally - use encrypted HSM in production
- **Simplified DKG**: Hackathon version - implement proper Shamir secret sharing
- **Discrete Log**: On-chain brute force - move off-chain with Schnorr proofs in production

### Production Hardening

```solidity
TODO:
- [ ] Replace MockVerifier with production Groth16 verifier
- [ ] Implement HSM key storage for keyholders
- [ ] Use proper DKG protocol (e.g., Feldman scheme)
- [ ] Move discrete log computation off-chain
- [ ] Add DAO governance for keyholder rotation
- [ ] Formal security audit
- [ ] Economic analysis of quadratic voting
```

## 🎓 Educational Notes

This is a **hackathon-grade** implementation demonstrating:
- ElGamal homomorphic encryption for vote aggregation
- Zero-knowledge proofs for privacy-preserving eligibility
- Threshold cryptography for distributed trust
- Blockchain integration for tamper-proof record

For production use, additional hardening is essential.

## 📚 References

- **ElGamal Encryption**: [Wikipedia](https://en.wikipedia.org/wiki/ElGamal_encryption)
- **Groth16 Proofs**: [eprint.iacr.org](https://eprint.iacr.org/2016/260)
- **Polkadot PVM**: [Docs](https://docs.polkadot.network)
- **Circom**: [docs.circom.io](https://docs.circom.io)
- **snarkjs**: [github.com/iden3/snarkjs](https://github.com/iden3/snarkjs)

## 📄 License

MIT

## 👥 Team

Private voting system built for hackathon. Designed for educational purposes.

---

**Questions?** Check the code comments or open an issue!

🔐 **Remember**: Individual votes are mathematically private. Results are verifiable. Democracy is trustless.
