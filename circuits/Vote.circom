pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";

template VoteProof() {
    signal input vote;
    signal input nullifier;
    signal input proposalId;
    signal output nullifierHash;
    signal output voteCommitment;
    vote * (vote - 1) === 0;
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== nullifier;
    nullifierHasher.inputs[1] <== proposalId;
    nullifierHash <== nullifierHasher.out;
    component voteHasher = Poseidon(3);
    voteHasher.inputs[0] <== vote;
    voteHasher.inputs[1] <== nullifier;
    voteHasher.inputs[2] <== proposalId;
    voteCommitment <== voteHasher.out;
}

component main {public [proposalId]} = VoteProof();
