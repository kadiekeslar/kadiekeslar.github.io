// Run the pure TypeScript game logic without adding a test framework.
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
};
const { newGame, enterKey, scoreGuess, keyboardMarks } = require('../src/game/engine.ts');
const { answers, chooseWord, isWord, LENGTHS } = require('../src/game/words.ts');
const guess = (game, word) => [...word, 'ENTER'].reduce(enterKey, game);
assert.deepEqual(scoreGuess('ALLEY', 'APPLE'), ['correct', 'present', 'absent', 'present', 'absent']);
assert.deepEqual(scoreGuess('PUPPY', 'APPLE'), ['present', 'absent', 'correct', 'absent', 'absent']);
assert.deepEqual(scoreGuess('AAAAA', 'APPLE'), ['correct', 'absent', 'absent', 'absent', 'absent']);
let game = enterKey(newGame('APPLE'), 'ENTER');
assert.equal(game.guesses.length, 0);
assert.match(game.message, /5 letters/);
game = guess(newGame('APPLE'), 'ZZZZZ');
assert.equal(game.guesses.length, 0);
assert.equal(game.current, 'ZZZZZ');
assert.match(game.message, /English word list/);
game = enterKey(game, 'DELETE');
assert.equal(game.current, 'ZZZZ');
assert.equal(game.message, '');
game = guess(newGame('APPLE'), 'APPLE');
assert.equal(game.status, 'won');
assert.equal(game.guesses.length, 1);
assert.equal(enterKey(game, 'A'), game);
game = newGame('APPLE');
game = guess(game, 'BEACH');
const firstGuesses = game.guesses;
game = guess(game, 'BEACH');
assert.equal(game.guesses, firstGuesses);
assert.equal(game.guesses.length, 1);
assert.equal(game.current, 'BEACH');
assert.equal(game.status, 'playing');
assert.match(game.message, /already used that word/);
for (let i = 0; i < 5; i++) game = enterKey(game, 'DELETE');
for (const word of ['TRAIN', 'CLOUD', 'STONE', 'FRUIT', 'GHOST']) game = guess(game, word);
assert.equal(game.status, 'lost');
assert.equal(game.guesses.length, 6);
assert.equal(enterKey(game, 'ENTER'), game);
assert.equal(guess(newGame('APPLE'), 'BEACH').guesses.length, 1);
for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
  for (const length of LENGTHS) {
    let typing = newGame('A'.repeat(length));
    for (let position = 0; position < length; position++) {
      typing = enterKey(typing, letter);
      assert.equal(typing.current, letter.repeat(position + 1));
      assert.equal(typing.current[position], letter);
    }
    assert.equal(enterKey(typing, letter), typing, 'A full row must ignore extra letters');
    for (let remaining = length - 1; remaining >= 0; remaining--) {
      typing = enterKey(typing, 'DELETE');
      assert.equal(typing.current, letter.repeat(remaining));
    }
  }
  const word = Object.values(answers).flat().find(word => word.includes(letter.toLowerCase())).toUpperCase();
  const submitted = guess(newGame(word), word);
  assert.equal(submitted.guesses[0].word, word);
  assert.equal(submitted.status, 'won');
}
const keys = keyboardMarks([{ word: 'AA', marks: ['correct', 'absent'] }, { word: 'A', marks: ['present'] }]);
assert.equal(keys.A, 'correct');
for (const length of LENGTHS) {
  assert.ok(answers[length].length > 40);
  for (const word of answers[length]) {
    assert.equal(word.length, length, `Wrong answer length: ${word}`);
    assert.ok(/^[a-z]+$/.test(word));
    assert.ok(isWord(word));
  }
  const first = chooseWord(length);
  assert.equal(first.length, length);
  assert.notEqual(chooseWord(length, first), first);
  const won = guess(newGame(first), first);
  assert.equal(won.status, 'won');
}
assert.ok(isWord('TRAIN'));
assert.ok(isWord('gardens'));
assert.ok(!isWord('asdfghjk'));
console.log('Game checks passed: repeated letters, duplicate guesses, all 26 letter inputs, validation, deletion, wins, losses, keyboard priority, all word lengths, and replay.');
