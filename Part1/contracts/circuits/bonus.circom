pragma circom 2.0.0;

// [bonus] implement an example game from part d

include "../../node_modules/circomlib/circuits/comparators.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/gates.circom";

template XNOR() {
    signal input a;
    signal input b;
    signal output out;

    out <== 1 - a - b + 2*a*b;
}

template Wordle() {
    // Guess and solution characters are ASCII-encode lowercase letters.
    // 'a' ~ 0, 'z' ~ 25

    // Guess correctness is:
    // 0 ~ none
    // 1 ~ hit (right character at right spot)
    // 2 ~ blow (right character at wrong spot)

    // Note: The condition that `guess` and `soln` must
    // be real English words is ignored for now.

    // Public inputs
    signal input guess[5];
    signal input correctness[5];
    signal input pubSolnHash;

    // Private inputs
    signal input soln[5];
    signal input salt;

    // Output
    signal output solnHashOut;

    var ii = 0;
    var jj = 0;
    component lessThan[10];

    // Create constraints that the solution and guess digits are all less than 26.
    for (ii = 0; ii < 5; ii++) {
        lessThan[ii] = LessThan(5);
        lessThan[ii].in[0] <== guess[ii];
        lessThan[ii].in[1] <== 26;
        lessThan[ii].out === 1;

        lessThan[ii + 5] = LessThan(5);
        lessThan[ii + 5].in[0] <== soln[ii];
        lessThan[ii + 5].in[1] <== 26;
        lessThan[ii + 5].out === 1;
    }

    // Check constraints on "correctness"
    component xnor[15];
    component equalHB[25];
    var blowCnt = 0;

    component none[10];
    component hit[10];
    component blow[5];
    component blow2[5];
    component blow3[5];

    for (ii = 0; ii < 5; ii++) {
        blowCnt = 0;

        for (jj = 0; jj < 5; jj++) {
            equalHB[5 * ii + jj] = IsEqual();
            equalHB[5 * ii + jj].in[0] <== guess[ii];
            equalHB[5 * ii + jj].in[1] <== soln[jj];
            blowCnt += equalHB[5 * ii + jj].out;
        }

        // none case
        none[ii] = IsEqual();
        none[ii].in[0] <== correctness[ii];
        none[ii].in[1] <== 0;

        none[ii + 5] = IsEqual();
        none[ii + 5].in[0] <== blowCnt;
        none[ii + 5].in[1] <== 0;

        xnor[ii] = XNOR(); // both or neither
        xnor[ii].a <== none[ii].out;
        xnor[ii].b <== none[ii + 5].out;
        xnor[ii].out === 1;

        // hit case
        hit[ii] = IsEqual();
        hit[ii].in[0] <== correctness[ii];
        hit[ii].in[1] <== 1;

        hit[ii + 5] = IsEqual();
        hit[ii + 5].in[0] <== guess[ii];
        hit[ii + 5].in[1] <== soln[ii];

        xnor[ii + 5] = XNOR();
        xnor[ii + 5].a <== hit[ii].out;
        xnor[ii + 5].b <== hit[ii + 5].out;
        xnor[ii + 5].out === 1;

        // blow case
        blow[ii] = IsEqual();
        blow[ii].in[0] <== correctness[ii];
        blow[ii].in[1] <== 2;

        blow2[ii] = GreaterThan(4);
        blow2[ii].in[0] <== blowCnt;
        blow2[ii].in[1] <== 0;

        xnor[ii + 10] = XNOR();
        xnor[ii + 10].a <== blow[ii].out;
        xnor[ii + 10].b <== blow2[ii].out;

        blow3[ii] = XOR(); // either valid blow or hit
        blow3[ii].a <== xnor[ii + 10].out;
        blow3[ii].b <== hit[ii + 5].out;

        blow3[ii].out === 1;
    }

    // Verify that the hash of the private solution matches pubSolnHash
    component poseidon = Poseidon(6);
    poseidon.inputs[0] <== salt;
    poseidon.inputs[1] <== soln[0];
    poseidon.inputs[2] <== soln[1];
    poseidon.inputs[3] <== soln[2];
    poseidon.inputs[4] <== soln[3];
    poseidon.inputs[5] <== soln[4];

    solnHashOut <== poseidon.out;
    pubSolnHash === solnHashOut;
}

component main {public [guess, correctness, pubSolnHash]} = Wordle();