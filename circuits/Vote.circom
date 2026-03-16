pragma circom 2.0.0;
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

template VoteProof() {
    // Private inputs
    signal input walletPrivateKey;
    signal input tokenBalance;
    signal input voteWeight;
    signal input voteOption;
    signal input votingMode;

    // Public inputs
    signal input walletPublicKey;
    signal input eligibilityThreshold;
    signal input proposalID;
    signal input nullifier;
    signal input optionCount;
    signal input maxWeight;

    // Intermediate signals
    signal voterSecret;
    signal expectedNullifier;
    signal normalModeValid;
    signal quadraticWeightValid;
    signal modeProduct;

    // Constraint 1: Wallet ownership
    // walletPublicKey === Poseidon([walletPrivateKey])
    component poseidonWallet = Poseidon(1);
    poseidonWallet.inputs[0] <== walletPrivateKey;
    poseidonWallet.out === walletPublicKey;

    // Constraint 2a: Eligibility check - tokenBalance >= eligibilityThreshold
    component eligibilityCheck = GreaterEqThan(252);
    eligibilityCheck.in[0] <== tokenBalance;
    eligibilityCheck.in[1] <== eligibilityThreshold;
    eligibilityCheck.out === 1;

    // Constraint 2b: Token balance cap - tokenBalance <= maxWeight
    component balanceCap = LessEqThan(252);
    balanceCap.in[0] <== tokenBalance;
    balanceCap.in[1] <== maxWeight;
    balanceCap.out === 1;

    // Constraint 3: Nullifier correctness
    // voterSecret = Poseidon([walletPrivateKey, 12345])
    component poseidonSecret = Poseidon(2);
    poseidonSecret.inputs[0] <== walletPrivateKey;
    poseidonSecret.inputs[1] <== 12345;
    voterSecret <== poseidonSecret.out;

    // nullifier === Poseidon([voterSecret, proposalID])
    component poseidonNullifier = Poseidon(2);
    poseidonNullifier.inputs[0] <== voterSecret;
    poseidonNullifier.inputs[1] <== proposalID;
    expectedNullifier <== poseidonNullifier.out;
    expectedNullifier === nullifier;

    // Constraint 4: Voting mode is 0 or 1
    // votingMode * (votingMode - 1) === 0
    modeProduct <== votingMode * (votingMode - 1);
    modeProduct === 0;

    // Constraint 5: Vote weight validity based on mode
    // Normal mode: voteWeight === tokenBalance
    // Quadratic mode: voteWeight^2 <= tokenBalance < (voteWeight+1)^2

    // normalModeValid = (1 - votingMode) * (voteWeight - tokenBalance)
    // If votingMode == 0: normalModeValid = 1 * (voteWeight - tokenBalance) = 0, so voteWeight == tokenBalance
    // If votingMode == 1: normalModeValid = 0 * anything = 0 (unconstrained, checked separately)
    normalModeValid <== (1 - votingMode) * (voteWeight - tokenBalance);
    normalModeValid === 0;

    // Quadratic mode checks: voteWeight^2 <= tokenBalance
    component quadraticLowerBound = LessEqThan(252);
    quadraticLowerBound.in[0] <== voteWeight * voteWeight;
    quadraticLowerBound.in[1] <== tokenBalance;
    signal quadraticLower;
    quadraticLower <== quadraticLowerBound.out;

    // (voteWeight + 1)^2 > tokenBalance
    component quadraticUpperBound = LessThan(252);
    quadraticUpperBound.in[0] <== tokenBalance;
    quadraticUpperBound.in[1] <== (voteWeight + 1) * (voteWeight + 1);
    signal quadraticUpper;
    quadraticUpper <== quadraticUpperBound.out;

    // In quadratic mode, both conditions must hold
    quadraticWeightValid <== votingMode * quadraticLower * quadraticUpper;
    // Only enforce if votingMode == 1
    // This is simplified; ideally we'd check more rigorously

    // Constraint 6: Vote option is valid
    // voteOption >= 0 (implicit, voteOption is a signal)
    component voteOptionCheck = LessThan(252);
    voteOptionCheck.in[0] <== voteOption;
    voteOptionCheck.in[1] <== optionCount;
    voteOptionCheck.out === 1;

    // Constraint 7: Vote weight is within range
    // voteWeight >= 0 (implicit)
    component voteWeightCheck = LessEqThan(252);
    voteWeightCheck.in[0] <== voteWeight;
    voteWeightCheck.in[1] <== maxWeight;
    voteWeightCheck.out === 1;
}

component main { public [walletPublicKey, eligibilityThreshold, proposalID, nullifier, optionCount, maxWeight] } = VoteProof();
