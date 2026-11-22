# wrdly

An unlimited, English-only word game built with the existing Expo SDK 58 project, React Native, TypeScript, and Expo Router.

Choose a word length from 4–8, then solve the word in six guesses. Green means the right position, yellow means a different position, and gray means no remaining occurrence of that letter. The keyboard keeps the strongest clue for each letter. Invalid words and incomplete guesses do not use a turn.

## Try it on your phone

1. Install Expo Go on your iPhone or Android phone. Use a version that supports SDK 58.
2. In a terminal, open this project and run:

   ```sh
   cd /Users/kadiekeslar/Desktop/15113/wrdly
   npm install
   npx expo start
   ```

3. Connect the computer and phone to the same Wi-Fi network.
4. Scan the terminal QR code with the iPhone Camera app, or with Expo Go on Android.
5. Select a length and tap **Let’s play**.

If your network blocks the connection, stop the server and try `npx expo start --tunnel` instead. For a browser preview, run `npm run web`.

## Saved statistics

Completed rounds count as played; completed wins also count as won. Leaving an unfinished round does not count as a loss. Statistics are stored locally with AsyncStorage, with no account or server. The home screen also shows the win percentage. Wait for “Your stats are saved” before closing the app after a result. Unfinished boards are not saved.

A failed save offers a retry and prevents starting another round until the result is saved. Replaying picks a different answer from the previous round. There is no daily limit, language menu, or network requirement for gameplay.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npx expo-doctor
npx expo export --platform ios --platform android --platform web
```

On your phone, try each word length, delete a letter, submit a short guess, and submit a made-up word. Check that only valid guesses consume turns. Complete a round, return home, close and reopen Expo Go, and confirm the played and won totals remain. Try both a win and six unsuccessful valid guesses, then use **Play again**.

## Code

- `src/app/index.tsx`: home, length selection, and statistics.
- `src/app/game.tsx`: responsive game grid, keyboard, and results.
- `src/game/engine.ts`: guess validation, repeated-letter scoring, and round rules.
- `src/game/words.ts`: familiar answer pools and offline dictionary lookup.
- `src/state/stats.tsx`: loading and serialized, duplicate-safe statistics writes.
- `scripts/test-game.cjs`: game logic checks using the existing TypeScript dependency.

The bundled dictionary contains 114,111 alphabetic 4–8 letter entries from [sindresorhus/word-list](https://github.com/sindresorhus/word-list), based on the English Word Game dictionary (ENABLE). Like any fixed dictionary, it may omit newer or specialized terms. Answers come from a separate curated pool of familiar English words. The dictionary license is included in `src/data/WORD-LIST-LICENSE.txt`.
