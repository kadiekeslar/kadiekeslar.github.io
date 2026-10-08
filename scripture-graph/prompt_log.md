# P2 prompt log

This file records the available conversation honestly. It is not evidence of eight hours of student work by itself. Keep the original HW4 log in the backend repository; do not count that earlier work as new P2 work.

## Tools and jobs

- Codex: inspected the HW4 frontend/backend and project rubric, proposed P2 scope, generated replacement code, and ran verification. The exact selected Codex model label should be copied from the app; it was not independently recorded in this log.
- The deployed application's OpenAI API model is configured separately with `OPENAI_MODEL`. That runtime model is not necessarily the model used to develop the project.
- Browser testing: exercised the real deployed HW4 verse search and the local P2 frontend.
- Node/Python checks: tested graph identity/overlap, export content, verse ranges, and lexical search behavior.

Student addition needed: explain why you selected each actual model/tool for planning, coding, or debugging. Record any other tools used.

## Important prompts, verbatim

### Review request (verbatim concluding sentence from the original request)

> you can find it here in scripture graph and the frontend and backend code is all there as well, let me know what i should add to it to make it full credit for p2

The request supplied the P2 assignment prompt, the portfolio repository, and the backend repository. Codex reviewed those sources and recommended comparison plus a persistent notebook.

### Implementation request (full prompt)

> okay i dont care about the mobile part but do everything else and tell me what code to change and where

Codex generated the local replacement bundle. The authorized scope excludes mobile layout changes. The live repositories were not changed by this step.

## What changed during this session

AI-generated changes: comparison and overlap logic, study collections/notes/export, request cancellation/deadline/retry, graph controls, corrected legend, full cross-reference range text, word-boundary search, public error cleanup, entity-lookup resilience, and no-results detection.

Student-written or substantially modified code: **not yet recorded**. Add exact files/functions and your actual changes after you make them. Do not describe copying AI code as manually authoring it.

## One place AI got it wrong

During browser verification, Codex used a numeric accessibility element index to click the shared-only filter, but the returned state showed the notebook dialog open instead. That made the attempted action unreliable. Codex corrected the testing approach by targeting the checkbox by its explicit role and name, then checked the resulting page state: the shared-only view reported three visible nodes and Reset view restored 29. This is a real AI/tool-use mistake from this session, not an invented development story. The student should explain how they evaluated AI work and add their own debugging observations as they continue.

A separate code bug discovered during review was that the existing topic graph's no-results check counted subtheme nodes rather than retrieved verse nodes. The replacement checks for at least one verse. Its original AI provenance has not been independently verified.

## Actual work log — fill in as you work

| Date / session | Task | Actual minutes | My code changes / verification | Commit |
|---|---|---:|---|---|
| | | | | |

Append substantial later prompts verbatim, decisions, debugging outcomes, deployment checks, and manual edits. Record actual elapsed focused work; no hours or extra prompts have been invented here.

## Applying the files to GitHub

Additional user prompt, verbatim:

> are you able to edit the files for me

Codex applied the replacement frontend/backend files to repository copies, updated the portfolio description, checked that both repositories were current with main, reran the 15 automated checks, and prepared commits for the authorized updates. This does not count as student-written code or establish eight hours of student work. Deployment verification follows the push.
