import { isWord } from './words';

export type Mark = 'correct' | 'present' | 'absent';
export type Guess = { word: string; marks: Mark[] };
export type Game = { answer: string; current: string; guesses: Guess[]; status: 'playing' | 'won' | 'lost'; message: string };
export const MAX_GUESSES = 6;

export function scoreGuess(guess: string, answer: string): Mark[] {
  const marks: Mark[] = Array(guess.length).fill('absent');
  const remaining = answer.split('');
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === answer[i]) { marks[i] = 'correct'; remaining[i] = ''; }
  }
  for (let i = 0; i < guess.length; i++) {
    if (marks[i] === 'correct') continue;
    const index = remaining.indexOf(guess[i]);
    if (index !== -1) { marks[i] = 'present'; remaining[index] = ''; }
  }
  return marks;
}

export function newGame(answer: string): Game {
  return { answer, current: '', guesses: [], status: 'playing', message: '' };
}

export function enterKey(game: Game, key: string): Game {
  if (game.status !== 'playing') return game;
  if (key === 'DELETE') return { ...game, current: game.current.slice(0, -1), message: '' };
  if (key !== 'ENTER') {
    return /^[A-Z]$/.test(key) && game.current.length < game.answer.length
      ? { ...game, current: game.current + key, message: '' } : game;
  }
  if (game.current.length !== game.answer.length) return { ...game, message: `Enter ${game.answer.length} letters.` };
  if (game.guesses.some(guess => guess.word === game.current)) return { ...game, message: 'You already used that word. Try another word.' };
  if (!isWord(game.current)) return { ...game, message: 'Not in the English word list. Try another word.' };
  const guesses = [...game.guesses, { word: game.current, marks: scoreGuess(game.current, game.answer) }];
  const status = game.current === game.answer ? 'won' : guesses.length === MAX_GUESSES ? 'lost' : 'playing';
  return { ...game, guesses, current: '', status, message: '' };
}

export function keyboardMarks(guesses: Guess[]): Record<string, Mark> {
  const keys: Record<string, Mark> = {};
  const rank = { absent: 0, present: 1, correct: 2 };
  guesses.forEach(({ word, marks }) => word.split('').forEach((letter, i) => {
    if (keys[letter] === undefined || rank[marks[i]] > rank[keys[letter]]) keys[letter] = marks[i];
  }));
  return keys;
}
