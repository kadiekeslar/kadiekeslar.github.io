# wrdly specification review

Reviewed November 22, 2026 against `SPEC.md`. This is a review of the existing implementation, separate from development. No application code, dependencies, or configuration were changed.

Most core game rules pass the checks performed. The main weaknesses are statistics error recovery and losing an unsaved result when leaving its screen. Phone and Expo Go behavior still need device verification; passing logic tests is not proof that every screen works on a phone.

## Scope and evidence

Read all application source files, both scripts, the specification, README, package configuration, TypeScript/ESLint configuration, app configuration, and repository instructions. Checked dictionary structure, all curated answer lengths, and the bundled dictionary license. Checked installed dependency versions against local Expo compatibility metadata; a full dependency security audit was not performed. Images and icons were not visually verified.

Checks performed:

- `npm test`: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Additional in-memory game checks: all 547 curated answers can be submitted as winning guesses. A sixth-guess win and a sixth-guess loss pass for every supported length.
- Dictionary audit: 114,111 unique entries; every entry contains only lowercase ASCII letters and is 4–8 letters long. This checks structure, not the linguistic accuracy of every entry.
- Temporary in-memory mocks of the actual transpiled statistics provider: successful save/reload, serialized writes, consecutive duplicate suppression, rejected writes, and corrupt-data loading. No test files were added to the project. These mocks do not exercise native AsyncStorage or React Native rendering.
- Temporary hook mock of the actual game screen: changing the length parameter on the same mounted screen retains the old answer. This establishes a component-state mismatch; it does not establish how often native navigation reuses that screen.
- `CI=1 EXPO_OFFLINE=1 ./node_modules/.bin/expo install --check`: exited successfully and reported dependencies up to date, but explicitly warned that offline validation is unreliable. Locally installed Expo is 58.0.26, React Native is 0.88.1, and AsyncStorage is 2.2.0; the latter two match the installed Expo package's bundled module metadata.

No build, export, deployment, or fixes were performed. No physical phone, simulator, Expo Go session, browser UI, real process-kill persistence test, or native animation was exercised. Expo Doctor was not run. Runtime and appearance claims below are limited accordingly.

## Findings

### F1 — High: corrupt saved statistics can permanently block the entire app

**Locations:** `src/state/stats.tsx:11–17`, `src/state/stats.tsx:32–35`, `src/state/stats.tsx:50–58`; provider placement at `src/app/_layout.tsx:8–14`.

The statistics provider withholds every screen until saved data loads successfully. Invalid JSON, JSON `null`, or invalid totals cause loading to fail. The only recovery button rereads the same value. There is no in-app way to recover from persistently invalid data, so neither the home screen nor gameplay becomes available.

**Reproduction:** store `{` or `{"played":5,"won":6}` under `@wrdly/stats/v1`, then open the app. Loading shows “Couldn’t load your saved stats.” Repeatedly selecting “Try again” leaves the app blocked. The mocked provider also confirmed this with the JSON value `null`.

**Impact:** a single bad stored value makes the app unusable until storage is repaired or cleared externally. Clearing app data would also discard the statistics. This is an availability failure handled by the error screen, rather than a demonstrated uncaught crash. Persistent storage read failures have the same gate, although retry can recover from a transient read failure.

**Criteria affected:** 1, 12, 13, and access to all gameplay.

### F2 — Medium: leaving after a save failure permanently drops that game's result

**Locations:** `src/state/stats.tsx:38–47`; `src/app/game.tsx:65–75`, `src/app/game.tsx:81`, `src/app/game.tsx:116–118`.

A failed write rejects without updating totals or retaining a pending result. The retry action exists only inside that game's screen. Both Home controls remain available while saving or after an error. Returning home removes the round and its retry state; the next round has a new game ID and cannot recover the previous result.

**Reproduction:** complete a win while `AsyncStorage.setItem` rejects. Tap Home instead of retrying, restore storage availability, and complete another round. The first win is absent from both totals. The mocked provider confirmed that a failed win followed by a successfully saved loss retains only the loss.

**Impact:** the app can undercount completed games and wins. Serialization prevents overlapping successful writes from racing, but it does not retain failed results. Navigating away while a write is pending does not itself cancel that write; the loss described here requires that it fails, or that the process ends before persistence completes.

**Related behavior:** “Play again” is disabled until saving succeeds (`src/app/game.tsx:117`). A persistent write failure therefore blocks replay from the result screen. Returning home bypasses that restriction and allows another round while losing access to the failed result's retry.

**Criteria affected:** 10, 12, 13.

### F3 — Medium, conditional: changing the length on a mounted game can make the answer and grid disagree

**Locations:** `src/app/game.tsx:13–17`; answer-driven validation at `src/game/engine.ts:30–35`; grid columns at `src/app/game.tsx:91`.

The selected length is recalculated from route parameters every render, but `round.answer` is initialized only once. The `Round` key changes when length changes, resetting its reducer with the old answer rather than choosing one of the new length.

**Reproduction:** mount the game with `length=4`, then update that same screen's parameter to `length=8`. The mocked screen returns `length: 8` with a four-letter answer. The UI renders eight columns, but the reducer only accepts four letters and asks for a four-letter guess. The reverse transition can allow typing letters that have no corresponding visible columns.

**Impact and limits:** the displayed difficulty and actual game rules diverge. This requires route parameters to change on an existing mounted game, such as through a navigation/deep-link flow that reuses it. The normal Home → Play path pushes a game screen; this finding was not reproduced through a native navigation session and should not be read as a failure on every ordinary launch.

**Criterion affected:** 3.

### F4 — Low, usability risk: letter keys are narrow on phones

**Locations:** `src/app/game.tsx:123–129`, `src/app/game.tsx:145`, `src/app/game.tsx:160–164`.

The top keyboard row divides the available width among ten keys after subtracting gaps. On a 320-point screen, the 24 points of content padding and 36 points of gaps leave 26 points per letter key; on a 375-point screen, about 31.5 points. Keys have no extra `hitSlop`. Their 52-point height helps, but horizontal targets are small and can be easy to mistap.

**Impact:** this is a risk to the spec's “buttons should be easy to press” design requirement, not a demonstrated missing or unresponsive key. Check actual tapping on the target phone, particularly adjacent keys, Enter, and Delete. All 26 letters are present in the code.

## Acceptance criteria

“Pass” means the implementation and checks performed support the requirement under normal conditions. “Concern” means a known edge case or missing runtime evidence prevents an unconditional pass. No criterion is labeled as an unconditional failure because the confirmed problems depend on error conditions or route reuse; those conditions still need addressing.

| # | Acceptance criterion | Verdict | Evidence / qualification |
|---|---|---|---|
| 1 | Opening the app shows the home screen with wrdly | **Pass, normal startup** | Home route and title exist at `src/app/index.tsx:9–18`; stack at `src/app/_layout.tsx:10–12`. Statistics load first, and corrupt data blocks home entirely (F1). A deliberate game deep link can open the game instead. |
| 2 | Choose 4, 5, 6, 7, or 8 letters | **Pass** | `src/game/words.ts:3`; selector at `src/app/index.tsx:25–29`. All five answer pools have the correct lengths. |
| 3 | Play opens a game with the correct number of columns | **Concern** | Home passes length at `src/app/index.tsx:29`; columns use it at `src/app/game.tsx:87–91`. Normal initial state is consistent, but a same-screen parameter change causes F3. |
| 4 | Enter and delete letters using the keyboard | **Pass, code/logic** | All letters, Enter, and Delete are defined at `src/app/game.tsx:10` and wired at line 128; reducer behavior at `src/game/engine.ts:26–32`. Logic tests pass. Physical tapping and animation locking need a phone check. |
| 5 | Only correctly sized, real English guesses are submitted | **Pass within bundled dictionary** | `src/game/engine.ts:33–35`; `src/game/words.ts:17–18`. Short and invalid guesses preserve the turn. Overlong input is prevented. A fixed dictionary can omit valid newer/specialized words; it cannot certify every possible English word. |
| 6 | Green/yellow/gray scoring, including repeated letters | **Pass, logic; visual check pending** | Two-pass scoring at `src/game/engine.ts:8–19`; tested duplicate-letter examples pass. Tile colors at `src/app/game.tsx:98–105`, palette at `src/game/theme.ts:4`. Native flip rendering was not observed. |
| 7 | Six chances | **Pass** | `src/game/engine.ts:6`, `src/game/engine.ts:33–38`. Invalid/duplicate guesses do not consume turns; sixth-guess wins and losses pass for all lengths. |
| 8 | Winning message | **Pass, code/logic** | Win detection at `src/game/engine.ts:37`; “Beautifully done!” and answer/guess count at `src/app/game.tsx:113–115`. Result appears after the reveal completes. |
| 9 | Losing message and correct answer | **Pass, code/logic** | Loss detection at `src/game/engine.ts:37`; “That was a tricky one.” and “The word was …” at `src/app/game.tsx:114–115`. Result appears after the reveal completes. |
| 10 | Start another game immediately without a daily wait | **Concern under storage failure** | Replay generates another answer at `src/app/game.tsx:17`; `src/game/words.ts:20–22` excludes the previous replay answer. No date limit exists. Replay requires a successful statistics write (F2). |
| 11 | Return home from game | **Pass, code** | Header Home and final Back to home at `src/app/game.tsx:65`, line 81, line 118. Also has a fallback for entry without back history. Native back/navigation behavior was not exercised. |
| 12 | Track games played and won | **Concern** | Incrementing completed rounds at `src/state/stats.tsx:38–44` and home totals at `src/app/index.tsx:32–37` are correct on successful writes. Failed results can be lost (F2). Abandoned rounds do not count; see interpretation below. |
| 13 | Statistics survive closing and reopening | **Concern** | AsyncStorage save/load at `src/state/stats.tsx:11–17`, lines 38–44. Mocked successful reload passes. Failed writes and corrupt stored data are unresolved (F1/F2); closing before the async write finishes can omit the newest result. A real device restart was not tested. |
| 14 | English only, no language settings | **Pass, code/data structure** | English answer pools and local dictionary at `src/game/words.ts:1–18`; no language selector exists. Structural audit passes; not every dictionary entry was individually linguistically reviewed. |
| 15 | Works on the user's phone in Expo Go | **Concern — unverified on device** | Project targets Expo SDK 58 (`package.json:8`) and uses AsyncStorage 2.2.0 (`package.json:7`), which Expo documents as included in Expo Go. Local compatibility checks are encouraging, but do not prove installation, startup, layout, animations, or persistence on the actual phone. |

## Specification interpretations and remaining risks

- **Meaning of “played”:** the implementation counts completed rounds, not rounds started (`src/app/game.tsx:67–75`). README line 26 explicitly documents that leaving an unfinished game does not count as a loss. The spec does not define abandoned games, so this is a product interpretation to confirm rather than a definite defect.
- **Closing immediately after finishing:** saving starts in an effect after the game finishes, with no durable pending-round recovery (`src/app/game.tsx:67–75`). The README asks players to wait for “Your stats are saved” (`README.md:26`). Once that message appears, the write promise has resolved; before then, an abrupt process termination can lose the latest result. This caveat qualifies the spec's unconditional persistence wording.
- **Current round is not persisted:** reopening starts fresh. The spec only explicitly requires saving totals, so this is not a missing required feature.
- **Dark/green design:** implemented in `src/game/theme.ts:1–5`, both screens, and `app.json`. Screen fit, text scaling, scrolling, and keyboard usability remain visual/device checks. F4 identifies a measurable target-size concern.
- **No additional definite crash found:** app logic handles invalid guesses and invalid length parameters on initial entry. Statistics read/write rejections are caught. This is not a guarantee against native/runtime crashes; device execution was outside the checks performed. F1 demonstrates a persistent blocked screen rather than an uncaught exception.
- **Existing automated coverage is limited:** `scripts/test-game.cjs:10–82` tests game rules, not statistics, React rendering, navigation, animation completion, or native storage. The temporary review mocks provide focused evidence but do not replace integration or phone testing.

## Phone checks still needed

1. Launch in an SDK 58-compatible Expo Go, verify home, and play one round for every length.
2. Tap every keyboard key on a narrow screen; check deletion, invalid guesses, repeated letters, and input locking throughout the reveal.
3. Complete a win and a six-guess loss; inspect the messages, revealed answer, replay, and Home navigation, including native back gestures/buttons.
4. Wait for the saved confirmation, close/reopen Expo Go, and verify both totals. Separately test termination during saving and storage read/write failure recovery.
5. Inspect small screens and larger text sizes for clipped tiles, inaccessible controls, and scrolling problems.

Compatibility references checked during review: [Expo SDK 58 reference](https://docs.expo.dev/versions/v58.0.0/), [Expo AsyncStorage reference](https://docs.expo.dev/versions/latest/sdk/async-storage/), and [Expo environment setup](https://docs.expo.dev/get-started/set-up-your-environment/). The AsyncStorage reference lists version 2.2.0 and Expo Go support; these documentation checks do not establish that this app has passed criterion 15 on the user's phone.
