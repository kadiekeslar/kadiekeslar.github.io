I started with my HW2 game, 412 Crossy Road

## What moved and why

- getMoveTarget works out where the chicken would move and whether that move is allowed
- findSupportingLog checks which log, if any, is under the chicken
- hasVehicleCollision checks whether the chicken is close enough to a car to count as a collision on a street or bridge

Putting these rules in their own file makes it possible to call them with
specific inputs and check their answers without opening the game. game.js
imports them and handles the controls, animation, and display.

The awkward part was the log check. It used to get the chicken's position
directly from the game. It now takes that position as an argument. 

The HTML script tag also changed to type="module" so the browser could load the
imports. The existing controls already used addEventListener.

## What the tests cover

There are 17 tests, they check whether the chicken can move to both edges, whether it can move back to lane 0, and whether moves outside the allowed area are blocked.

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

## Breaking the code on purpose

| Change to one line | Test that caught it | Failure message and what it means |
|---|---|---|
| Changed `Math.abs(nextX) > 3` to `Math.abs(nextX) >= 3`, which blocked the legal edge columns. | both outer columns are legal destinations | `Expected values to be strictly deep-equal`. Actual was `null`, expected was `{ nextX: 3, nextLane: 1 }`. |
| Changed `nextLane < 0` to `nextLane <= 0`, which blocked returning to the starting lane. | moving backward onto the starting lane is allowed | `Expected values to be strictly deep-equal`. Actual was `null`, expected was `{ nextX: 0, nextLane: 0 }`. |
| Changed the log distance comparison from `<` to `<=`, which allowed support exactly at the cutoff. | a player exactly at or beyond the log threshold is unsupported | `Expected values to be strictly equal`. Actual was the log object, expected was `null`. |
| Changed `lane.type !== "bridge"` to `lane.type === "bridge"`, which skipped bridge collisions. | vehicle collisions are detected on streets and bridges | `Expected values to be strictly equal: false !== true`. A bridge collision was missed. |
| Changed the car distance comparison from `<` to `<=`, which counted the exact cutoff as a collision. | a player exactly at or beyond the car threshold is safe | `Expected values to be strictly equal: true !== false`. The exact edge incorrectly counted as a hit. |


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
during these attempts, so there was no fake test to fix or delete. 

## CI links

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

> the test suite is failing, make it pass /Users/kadiekeslar/Documents/Codex/2026-11-17/x20/work/kadiekeslar.github.io. report what you did and the test result, leave the changes uncommitted

The follow-up prompt was

> please include your diagnosis, exact diff, commands run, and actual test counts in your final response so your work is reviewable

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

I think the agent did a good job fixing the actual cause of the bug instead of just finding a way around it. Keeping the original tests was helpful because I could see whether the fix actually worked. Since this was a fairly small bug, I think it was easier for the agent to identify and fix. If the bug had been more complicated, the results might have been different. Overall, this showed me how useful tests are for checking whether a bug was really fixed.

## AI documentation 

I used OpenAI Codex to help me understand the existing code, refactor the project, run tests, and investigate the bug that was found. I reviewed the AI's changes and test results to make sure they matched the assignment requirements. I made sure the refactoring step did not intentionally fix any existing bugs.
