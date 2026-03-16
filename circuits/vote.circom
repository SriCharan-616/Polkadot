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

    // Constraint 1: Wallet ownership
    // walletPublicKey === Poseidon([walletPrivateKey])
    component walletOwnershipHash = Poseidon(1);
    walletOwnershipHash.inputs[0] <== walletPrivateKey;
    walletOwnershipHash.out === walletPublicKey;

    // Constraint 2: Eligibility check
    // tokenBalance >= eligibilityThreshold
    component eligibilityCheck = GreaterEqThan(32);
    eligibilityCheck.in[0] <== tokenBalance;
    eligibilityCheck.in[1] <== eligibilityThreshold;
    eligibilityCheck.out === 1;

    // tokenBalance <= maxWeight
    component maxWeightCheck = LessThan(32);
    maxWeightCheck.in[0] <== tokenBalance;
    maxWeightCheck.in[1] <== maxWeight + 1;
    maxWeightCheck.out === 1;

    // Constraint 3: Nullifier correctness
    // voterSecret = Poseidon([walletPrivateKey, 12345])
    component voterSecretHash = Poseidon(2);
    voterSecretHash.inputs[0] <== walletPrivateKey;
    voterSecretHash.inputs[1] <== 12345;

    // nullifier === Poseidon([voterSecret, proposalID])
    component nullifierHash = Poseidon(2);
    nullifierHash.inputs[0] <== voterSecretHash.out;
    nullifierHash.inputs[1] <== proposalID;
    nullifierHash.out === nullifier;

    // Constraint 4: Voting mode is 0 or 1
    component votingModeCheck = IsZero();
    votingModeCheck.in <== votingMode * (votingMode - 1);
    votingModeCheck.out === 1;

    // Constraint 5: Vote weight validity
    // Normal voting: voteWeight === tokenBalance
    // Quadratic voting: voteWeight^2 <= tokenBalance < (voteWeight+1)^2
    
    // normalCheck = (1 - votingMode) * (voteWeight - tokenBalance)
    // This enforces voteWeight == tokenBalance when votingMode == 0
    signal normalCheck <== (1 - votingMode) * (voteWeight - tokenBalance);
    normalCheck === 0;

    // For quadratic voting (votingMode == 1)
    // Check voteWeight * voteWeight <= tokenBalance
    component quadraticLowerBound = LessEqThan(64);
    quadraticLowerBound.in[0] <== voteWeight * voteWeight;
    quadraticLowerBound.in[1] <== tokenBalance;
    
    // Check (voteWeight + 1) * (voteWeight + 1) > tokenBalance
    component quadraticUpperBound = LessThan(64);
    quadraticUpperBound.in[0] <== tokenBalance;
    quadraticUpperBound.in[1] <== (voteWeight + 1) * (voteWeight + 1);

    // Apply quadratic constraints only when votingMode == 1
    signal quadraticConstraintLower <== votingMode * (quadraticLowerBound.out - 1);
    signal quadraticConstraintUpper <== votingMode * (quadraticUpperBound.out - 1);
    quadraticConstraintLower === 0;
    quadraticConstraintUpper === 0;

    // Constraint 6: Vote option is valid
    // voteOption >= 0 (always true for unsigned)
    // voteOption < optionCount
    component voteOptionCheck = LessThan(32);
    voteOptionCheck.in[0] <== voteOption;
    voteOptionCheck.in[1] <== optionCount;
    voteOptionCheck.out === 1;

    // Constraint 7: Vote weight is within range
    // voteWeight >= 0 (always true for unsigned)
    component voteWeightMin = GreaterEqThan(32);
    voteWeightMin.in[0] <== voteWeight;
    voteWeightMin.in[1] <== 0;
    voteWeightMin.out === 1;

    component voteWeightMax = LessThan(32);
    voteWeightMax.in[0] <== voteWeight;
    voteWeightMax.in[1] <== maxWeight + 1;
    voteWeightMax.out === 1;
}

component main { public [ walletPublicKey, eligibilityThreshold, proposalID, nullifier, optionCount, maxWeight ] } = VoteProof();
