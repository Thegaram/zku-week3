// [bonus] unit test for bonus.circom

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const { expect } = chai;

const { wasm: wasm_tester} = require('circom_tester');
const { buildPoseidon } = require('circomlibjs');

const NONE = 0;
const HIT = 1;
const BLOW = 2;

const encode = (word) => [...word].map(ch => ch.charCodeAt(0) - 'a'.charCodeAt(0));

// source: Discord kink#6488
const poseidonHash = async (items) => {
    let poseidon = await buildPoseidon();
    return poseidon.F.toObject(poseidon(items));
}

describe('Wordle', function () {
    this.timeout(100000000);

    it('Circuit should verify valid input correctly', async function () {
        const circuit = await wasm_tester('contracts/circuits/bonus.circom');

        const soln = encode('truck');
        const salt = 1234;
        const solnHash = await poseidonHash([salt, ...soln]);

        const check = async (guess, correctness) => {
            const INPUT = {
                // Private inputs
                'soln': soln,
                'salt': salt,

                // Public inputs
                'guess': guess,
                'correctness': correctness,
                'pubSolnHash': solnHash,
            };

            const _witness = await circuit.calculateWitness(INPUT, true);
        };

        //                  truck
        await check(encode('apple'), [NONE, NONE, NONE, NONE, NONE]);
        await check(encode('doubt'), [NONE, NONE, HIT , NONE, BLOW]);
        await check(encode('front'), [NONE, HIT , NONE, NONE, BLOW]);
        await check(encode('catch'), [BLOW, NONE, BLOW, HIT , NONE]);
        await check(encode('track'), [HIT , HIT , NONE, HIT , HIT ]);
        await check(encode('truck'), [HIT , HIT , HIT , HIT , HIT ]);

        // this is not how wordle would handle this, but it's good for now
        await check(encode('ttttt'), [HIT , BLOW, BLOW, BLOW, BLOW]);
    });

    it('Circuit should verify invalid input correctly', async function () {
        const circuit = await wasm_tester('contracts/circuits/bonus.circom');

        const soln = encode('truck');
        let salt = 1234;
        const solnHash = await poseidonHash([salt, ...soln]);

        const check = async (guess, correctness) => {
            const INPUT = {
                // Private inputs
                'soln': soln,
                'salt': salt,

                // Public inputs
                'guess': guess,
                'correctness': correctness,
                'pubSolnHash': solnHash,
            };

            await expect(circuit.calculateWitness(INPUT, true)).to.eventually.be.rejected;
        };

        // invalid character
        // for some reason, this constraint is ignored by circom...
        await check(encode('~ruck'), [HIT, HIT, HIT, HIT, HIT]);

        // incorrect "correctness"
        await check(encode('truck'), [HIT, HIT, BLOW, HIT, HIT]);
        await check(encode('truck'), [HIT, HIT, NONE, HIT, HIT]);

        // wrong salt
        salt = 5678;
        await check(encode('truck'), [HIT , HIT , HIT , HIT , HIT ]);
    });
});
