# Circuit Development Guide

## Building the Circom Circuit

### Prerequisites
```bash
npm install -g circom
npm install -g snarkjs
```

### Step 1: Compile Circuit to R1CS
```bash
circom circuits/vote.circom --r1cs --wasm --sym --json
```

### Step 2: View Circuit Stats
```bash
snarkjs info -r circuits/vote.r1cs
```

### Step 3: Generate Proving Key
This requires the Powers of Tau ceremony file:
```bash
# Download PoT file (example: 12 constraints)
wget https://hermez.s3-us-west-2.amazonaws.com/ptau/powersOfTau28_hez_final_12.ptau

# Create zero knowledge key
snarkjs groth16 setup circuits/vote.r1cs powersOfTau28_hez_final_12.ptau circuits/vote_0000.zkey

# Contribute randomness (required)
snarkjs zkey contribute circuits/vote_0000.zkey circuits/vote_final.zkey --name="Contribution"

# Verify the key
snarkjs zkey verify circuits/vote.r1cs powersOfTau28_hez_final_12.ptau circuits/vote_final.zkey
```

### Step 4: Export Verifier Contract
```bash
snarkjs zkey export solidityverifier circuits/vote_final.zkey contracts/Verifier.sol
```

### Step 5: Test the Circuit
```bash
npm test:circuit
```

## Testing Proofs Locally

### Generate a Proof
```javascript
const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    {
        walletPrivateKey: "123456789",
        tokenBalance: "5000",
        voteWeight: "70",
        voteOption: "0",
        votingMode: "0",
        walletPublicKey: "1",
        eligibilityThreshold: "1000",
        proposalID: "1",
        nullifier: "999",
        optionCount: "2",
        maxWeight: "10000"
    },
    "circuits/vote.wasm",
    "circuits/vote_final.zkey"
);

// Verify proof works
const verified = await snarkjs.groth16.verify(
    vk, // verification key
    publicSignals,
    proof
);
```

## Circuit Constraints Breakdown

```
Total Constraints Estimated:
- Wallet ownership (Poseidon): ~100
- Eligibility check (comparators): ~50
- Nullifier computation (Poseidon): ~100
- Voting mode validation: ~10
- Vote weight logic: ~150
- Option validation: ~10
- Total: ~420 constraints
```

## Optimization Tips

1. **Reduce Constraint Count**: 
   - Use bit-by-bit operations sparingly
   - Bundle logical operations
   - Avoid nested loops

2. **Optimize for Polkadot PVM**:
   - Keep proof size < 1KB
   - Public signals < 256 bits total
   - Proof generation < 10 seconds

3. **Memory Usage**:
   - WASM compilation needs ~2GB RAM
   - Keep circuit < 2^20 constraints

## Debugging Circuit Issues

### Compilation Errors
```bash
# Check template syntax
circom --check circuits/vote.circom

# View parse errors
circom circuits/vote.circom --debug
```

### Unsatisfied Constraints
When a proof fails verification:
```javascript
// Use witness viewer to inspect signals
const witness = await wasm_tester.calculateWitness(input);
console.log("Witness:", witness);

// Compare expected vs actual
console.log("Signal 'nullifier':", witness[getSignalIndex('nullifier')]);
```

### Performance Issues
```bash
# Profile circuit execution
time snarkjs groth16 fullprove input.json circuits/vote.wasm circuits/vote_final.zkey
```

## Production Considerations

1. **Verifier Update Process**:
   - Generate new Verifier.sol when circuit changes
   - Deploy new verifier alongside old
   - Use proxy pattern for smooth transition

2. **Circuit Audit**:
   - Have constraints formally verified
   - Check for overflow conditions
   - Test edge cases (max values, boundaries)

3. **Witness Generation**:
   - Move off-chain entirely
   - Cache intermediate computations
   - Parallelize for multiple proofs

## References
- Circom Docs: https://docs.circom.io
- snarkjs Docs: https://github.com/iden3/snarkjs
- ZK Proof Primer: https://blog.cryptographyengineering.com/2014/11/27/zero-knowledge-proofs-illustrated-primer/
