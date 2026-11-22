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
for (let i = 0; i < 6; i++) game = guess(game, 'BEACH');
assert.equal(game.status, 'lost');
assert.equal(game.guesses.length, 6);
assert.equal(enterKey(game, 'ENTER'), game);
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
console.log('Game checks passed: repeated letters, validation, deletion, wins, losses, keyboard priority, all word lengths, and replay.');
