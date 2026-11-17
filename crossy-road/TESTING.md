I started with my HW2 game, 412 Crossy Road, in the crossy-road folder of my kadiekeslar.github.io repo.

# HW9 testing draft

Codex helped prepare this draft using the actual test results. I still need to
review it and write the final explanation and reflection in my own words, as
the assignment requires.

## What moved and why

With help from Codex, three parts of the game moved from game.js into
game-logic.js.

- getMoveTarget works out where the chicken would move and whether that move is allowed.
- findSupportingLog checks which log, if any, is under the chicken.
- hasVehicleCollision checks whether the chicken is close enough to a car to count as a collision on a street or bridge.

Putting these rules in their own file makes it possible to call them with
specific inputs and check their answers without opening the game. game.js
imports them and handles the controls, animation, and display.

The awkward part was the log check. It used to get the chicken's position
directly from the game. It now takes that position as an argument. Codex had
to update both places that use it, when the chicken lands and when it rides a
moving log.

The HTML script tag also changed to type="module" so the browser could load the
imports. The existing controls already used addEventListener.

Codex kept the existing game rules during the refactor. It checked both the
original game and the refactored version in Chrome. The checks covered arrow
keys, movement limits, jerseys, scoring, collisions, restart, and riding logs.
The checks used repeatable street and river layouts.

## What the tests cover

There are 17 tests across the three functions. They check whether the chicken
can move to both edges, whether it can move back to lane 0, and whether moves
outside the allowed area are blocked.

The log tests check empty lists, gaps between logs, and positions right at
the edge of the support area. They also check that the function can skip a
distant log and find the first log that actually supports the chicken.

The collision tests check streets and bridges, an empty street, missing lane
data, and objects on other lane types. They check positions just inside and
exactly on the collision boundary. Another test checks that the functions
preserve the objects passed into them.

The unit tests leave out graphics, jersey designs, keyboard events, and
animation timing. The main focus is the rules that calculate an answer.
Browser checks covered several controls separately. Random level generation
and every possible game layout are still outside these checks.

To run the tests from the repo's main folder:

```sh
cd crossy-road
node --test
```

The completed tests were saved in their own commit before the deliberate source
changes. [Tests-only commit](https://github.com/kadiekeslar/kadiekeslar.github.io/commit/05905274dbb4553e6e9e7e101914061172c2b767)

## Breaking the code on purpose

Codex made each change below separately, ran the tests, restored the original
line, and confirmed all 17 tests passed before trying the next change. Every
change caused a test to fail.

| Change to one line | Test that caught it | Failure message and what it means |
|---|---|---|
| Changed `Math.abs(nextX) > 3` to `Math.abs(nextX) >= 3`, which blocked the legal edge columns. | both outer columns are legal destinations | `Expected values to be strictly deep-equal`. Actual was `null`, expected was `{ nextX: 3, nextLane: 1 }`. |
| Changed `nextLane < 0` to `nextLane <= 0`, which blocked returning to the starting lane. | moving backward onto the starting lane is allowed | `Expected values to be strictly deep-equal`. Actual was `null`, expected was `{ nextX: 0, nextLane: 0 }`. |
| Changed the log distance comparison from `<` to `<=`, which allowed support exactly at the cutoff. | a player exactly at or beyond the log threshold is unsupported | `Expected values to be strictly equal`. Actual was the log object, expected was `null`. |
| Changed `lane.type !== "bridge"` to `lane.type === "bridge"`, which skipped bridge collisions. | vehicle collisions are detected on streets and bridges | `Expected values to be strictly equal: false !== true`. A bridge collision was missed. |
| Changed the car distance comparison from `<` to `<=`, which counted the exact cutoff as a collision. | a player exactly at or beyond the car threshold is safe | `Expected values to be strictly equal: true !== false`. The exact edge incorrectly counted as a hit. |

The exact assertion messages from these runs are recorded below.

Mutation 1, `column-boundary`

```text
Expected values to be strictly deep-equal:
+ actual - expected

+ null
- {
-   nextLane: 1,
-   nextX: 3
- }
```

Mutation 2, `starting-lane`

```text
Expected values to be strictly deep-equal:
+ actual - expected

+ null
- {
-   nextLane: 0,
-   nextX: 0
- }
```

Mutation 3, `log-edge`

```text
Expected values to be strictly equal:
+ actual - expected

+ {
+   position: {
+     x: 0
+   },
+   userData: {
+     length: 2
+   }
+ }
- null
```

Mutation 4, `bridge-collisions`

```text
Expected values to be strictly equal:

false !== true
```

Mutation 5, `car-edge`

```text
Expected values to be strictly equal:

true !== false
```

## Fake tests

None of these five changes slipped through the tests. No fake test was found
during these attempts, so there was no fake test to fix or delete. These five
checks give evidence that the tested rules are protected, but other bugs could
still exist.

## CI links

The GitHub Action runs the tests automatically on pushes and pull requests
using Node 26.

- [Passing run after the repair](https://github.com/kadiekeslar/kadiekeslar.github.io/actions/runs/44124797583) — all 17 tests passed.
- [Failing run with the deliberate bug](https://github.com/kadiekeslar/kadiekeslar.github.io/actions/runs/44124570955) — 16 passed and 1 failed.

For the failing run, Codex pushed the edge-column bug from the first row.
GitHub failed on the test that checks whether the chicken can reach columns
-3 and 3. After the agent fixed the source, the tests passed again.

## Verifier experiment

After the broken code was pushed, Codex opened a fresh agent session with
no earlier chat history. It gave the agent the local copy of the pushed repo
and asked it to make the tests pass.

The starting prompt was

> The test suite is failing. Make it pass. Repository checkout: /Users/kadiekeslar/Documents/Codex/2026-11-17/x20/work/kadiekeslar.github.io. Work on the checked-out branch. Report what you did and the test result. Leave the changes uncommitted.

The follow-up prompt was

> Please include your diagnosis, exact diff, commands run, and actual test counts in your final response so your work is reviewable.

The agent reported

> Fixed the off-by-one movement boundary in `crossy-road/game-logic.js`. The check incorrectly rejected legal outer columns −3 and 3.

It also reported

> `node --test` in `crossy-road`: initially **16 passed, 1 failed**; after fix **17 passed, 0 failed**.

The change it made was

```diff
-  // Keep the player near the middle so the buildings stay visible.
-  if (Math.abs(nextX) >= 3 || nextLane < 0) {
+  // Keep the player within the playable columns, including both outer columns.
+  if (Math.abs(nextX) > 3 || nextLane < 0) {
```

The agent fixed the movement rule and updated its comment. A comparison against
the tests-only commit confirmed that it kept the test assertions intact.
Codex then independently reran the suite and confirmed all 17 tests passed.
The repair is saved in the repo. [Repair commit](https://github.com/kadiekeslar/kadiekeslar.github.io/commit/cc30975015d56700a1adcb759d0d7a8d72d6db85)

Reflection to put in my own words after reviewing the experiment — the agent
repaired the actual cause of this failure, and keeping the original tests made
that result easier to check. This was one fairly small bug. It gives evidence
about this repair, while a harder bug could lead to a different outcome.

## AI help

I asked Codex desktop to help choose the project and complete the testing work.
Codex extracted the rules, wrote all 17 tests, ran the deliberate breakages,
set up CI, and prepared this draft. A fresh Codex agent handled the verifier
repair. My AI sources are this HW9 Codex conversation on November 17, 2026, and
the quoted agent response above. The exact model version was not recorded.

The assignment asked for the first test to be written by hand. In this work,
the first test was also generated by Codex, so that requirement was not met.

The prompt log still needs my HW9 prompts and the tools and models used.
The assignment asks for prompt_log.md, while the existing file is
prompt_log.txt. I also need to review the tests, rewrite this draft myself,
and submit the branch link through the Google form.
