//[assignment] write your own unit test to show that your Mastermind variation circuit is working as expected

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const { expect } = chai;

const { wasm: wasm_tester} = require('circom_tester');
const { buildPoseidon } = require('circomlibjs');

// source: Discord kink#6488
const poseidonHash = async (items) => {
    let poseidon = await buildPoseidon();
    return poseidon.F.toObject(poseidon(items));
}

describe('Mastermind', function () {
    this.timeout(100000000);

    it('Circuit should verify valid input correctly', async function () {
        const circuit = await wasm_tester('contracts/circuits/MasterMindVariation.circom');

        const solution = [1, 2, 3, 4, 5];
        const salt = 1234;
        const solnHash = await poseidonHash([salt, ...solution]);

        const check = async (guess, hits, blows) => {
            const INPUT = {
                // Private inputs
                'privSolnA': solution[0],
                'privSolnB': solution[1],
                'privSolnC': solution[2],
                'privSolnD': solution[3],
                'privSolnE': solution[4],
                'privSalt': salt,

                // Public inputs
                'pubGuessA': guess[0],
                'pubGuessB': guess[1],
                'pubGuessC': guess[2],
                'pubGuessD': guess[3],
                'pubGuessE': guess[4],
                'pubNumHit': hits,
                'pubNumBlow': blows,
                'pubSolnHash': solnHash,
            };

            const _witness = await circuit.calculateWitness(INPUT, true);
        };

        await check([1, 2, 3, 4, 5], 5, 0);
        await check([2, 3, 4, 5, 1], 0, 5);
        await check([0, 4, 3, 2, 6], 1, 2);
    });

    it('Circuit should verify invalid input correctly', async function () {
        const circuit = await wasm_tester('contracts/circuits/MasterMindVariation.circom');

        const solution = [1, 2, 3, 4, 5];
        let salt = 1234;
        const solnHash = await poseidonHash([salt, ...solution]);

        const check = async (guess, hits, blows) => {
            const INPUT = {
                // Private inputs
                'privSolnA': solution[0],
                'privSolnB': solution[1],
                'privSolnC': solution[2],
                'privSolnD': solution[3],
                'privSolnE': solution[4],
                'privSalt': salt,

                // Public inputs
                'pubGuessA': guess[0],
                'pubGuessB': guess[1],
                'pubGuessC': guess[2],
                'pubGuessD': guess[3],
                'pubGuessE': guess[4],
                'pubNumHit': hits,
                'pubNumBlow': blows,
                'pubSolnHash': solnHash,
            };

            await expect(circuit.calculateWitness(INPUT, true)).to.eventually.be.rejected;
        };

        // invalid digit
        await check([1, 2, 3, 4, 8], 4, 0);

        // wrong `hits`
        await check([1, 2, 3, 4, 5], 0, 0);

        // duplicate guess
        await check([0, 0, 0, 0, 0], 0, 0);

        // wrong salt
        salt = 5678;
        await check([1, 2, 3, 4, 5], 5, 0);
    });
});
