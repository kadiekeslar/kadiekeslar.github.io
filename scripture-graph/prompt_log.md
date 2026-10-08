# Project 2 prompt log — Scripture Graph

## Project background

P2 builds on the HW4 Scripture Graph. The prompts below record the new comparison, notebook, performance, and interface work. Partial quotations are labeled as excerpts.

## Which tool for which job

- **OpenAI Codex, GPT-6.1 Sol, medium reasoning:** the student identified this model in the conversation. Used for rubric review and planning, repository inspection, code generation, iterative fixes, tests, deployment checks, and documentation. Keeping one agent with the repository context made changes across Flask, JavaScript, and the notebook easier to coordinate. No separate brainstorming/debugging model is evidenced here.
- **Computer-use browser tools:** exercised the rendered interface and real network results, including connection clicks, counts, folder navigation, notes after refresh, exports, and restore. These reveal interface problems that a code-only review misses.
- **Node's test runner and Python unittest:** deterministic checks for graph identity, evidence membership, ranges, corpus format, safe errors, and cache behavior. Chosen to check behavior independently of changing AI responses.
- **Git and HTTPS requests:** inspected the named public repositories, kept a commit history, and checked actual deployed endpoints rather than assuming a push worked. Only the two project repositories were accessed.
- **Prettier and Black:** formatters for readable JavaScript/HTML/CSS and Python. They change presentation, not intended behavior.
- **Runtime OpenAI API:** used by the app for interpreting free-form searches and comparing/explaining retrieved Scripture. This model is selected by `OPENAI_MODEL`, separately from Codex. The source default is `gpt-5.6-luna`; the actual deployed setting was not inspected. Bible retrieval uses public Bible data, not invented AI quotations.

## Development process and actual prompts

### 1. Initial P2 review — verbatim excerpt

> you can find it here in scripture graph and the frontend and backend code is all there as well, let me know what i should add to it to make it full credit for p2

**Outcome:** Reviewed the provided rubric and public repositories; proposed comparison and a persistent notebook as the P2 transformation.

### 2. Implementation and scope

> okay i dont care about the mobile part but do everything else and tell me what code to change and where

**Outcome:** Built the first replacement bundle; mobile was excluded by user choice.

### 3. Apply the edits

> are you able to edit the files for me

**Outcome:** Applied changes to the two named repositories, tested, committed, pushed, and verified deployment.

### 4. Compare meaning

> instead of only crossing reference if they share an exact passage, make it more clear on the similarites and difeerences not just make the user read through all of them and add anything to the app that you thing would be super cool and useful

**Outcome:** Added cited thematic similarities, differences in emphasis, distinct yellow graph links, questions, and saved outlines.

### 5. Search performance

> also why is it so slow every search

**Outcome:** Parallelized passage retrieval, cached results, and loaded optional AI interpretation after the graph. Corrected nested full-Bible chapter parsing.

### 6. Loading feedback

> while similarites are loading add loading instead of just nothing found

**Outcome:** Added explicit pending states, instead of premature no-findings messages.

### 7. Wrong Jesus/God result — verbatim excerpt from the pasted output

> ext-based preview · AI comparison is unavailable right now. You can still explore and save this study.

**Outcome:** The pasted output also showed Colossians 4:11 for Jesus. Reproduced the failure, resolved plain Jesus to Jesus Christ rather than Justus, spread references across the dataset, and added validation retry and nonblank-question checks.

### 8. Counts, clutter, and explanations

> right now the left side doesnt date, there were 3 connections like yellow lines but tit still says 0 also there is a lot of info its overwelming also when i click on the yellow line i dont understand why theyre connected i just see that theyre connected and can read both passages

**Outcome:** Separated thematic counts from exact-reference overlap, collapsed details, and put pair-specific reasoning before optional passage readings.

### 9. Remove sidebar clutter

> Shared passages only
> Choose a yellow connection to see why the passages relate. get rid of this 0 identical passages and this

**Outcome:** Removed the shared-only control, zero identical-reference display, and extra instruction.

### 10. Notebook folders

> i have added a notebook section that should be a good start to the foundation, can you add it to the rest of the logic

**Outcome:** Added a prominent notebook entry, folder list, breadcrumb, counts, rename/search/export, collapsed entries, and active-folder persistence.

### 11. Delete and save destinations

> how do you delete notebooks and make it easier to know what youre savinf and to where

**Outcome:** Added recoverable folder deletion, restore, and reviews showing saved contents and destination. Verified notes survived deletion/restoration and duplicate study saves.

### 12. Readability/documentation — verbatim excerpt

> make sure my code is super readible and add comments enough so i understand it

**Outcome:** Organized this factual process log, rebuilt outdated documentation, formatted source, added explanatory comments and a code walkthrough. Student-authored README wording and independent code contributions remain to be supplied.

## One place AI got it wrong

The AI-assisted implementation was reported as working after earlier successful tests, but the student then tried Jesus versus God and found the app had selected Jesus called Justus: the A result contained only Colossians 4:11. Earlier comparison tests had not covered this ambiguous person name. The student identified the bad result and pasted it into the chat. Codex reproduced it against the public API, inspected the separate Jesus and Jesus Christ dataset entries, changed plain Jesus to resolve to Jesus Christ, retained an explicit Justus query, added a regression check, and verified the deployed comparison. The lesson is to test ordinary ambiguous names and inspect the actual retrieved evidence, rather than treating a successful unrelated demo as proof that all searches work.

Other real findings: the full-Bible reader expected chapter content at the wrong nesting level, leaving its topic corpus empty; the reader and a regression test were corrected. A temporary script's mismatched heredoc terminator caused edits not to apply, and failing checks exposed the mistake. A browser click using an outdated numeric index opened the wrong control; testing switched to named controls and checked the returned state.

## Who contributed what

**Student decisions and feedback evidenced here:** reuse the HW4 Scripture Graph foundation; request comparisons of meaning; ask for faster searches and loading feedback; report the incorrect Jesus result; identify misleading counts and overwhelming content; ask for clearer explanation of graph lines; direct removal of sidebar controls; request notebook folders, deletion, and explicit saving destinations. These are real product/design and evaluation contributions.

**AI-written or substantially modified P2 code:** Codex implemented `index.html`, `styles.css`, `app.js`, and `graph-utils.js` updates; backend routes, retrieval, person resolution, comparison validation, cache, and AI integration changes; automated tests; comments; the code guide and supporting technical documentation.

**Independent student code changes:** none have been specifically identified in the available conversation. Do not substitute the student’s requests, accepting generated code, or AI-authored comments for a manually written code contribution. After making a real change, add the exact file/function, what you changed, why, and how you verified it here.

| My actual change | File / function | Why I changed it | How I checked it | Commit |
|---|---|---|---|---|
| Not yet recorded | | | | |

## Work time — report actual P2 work

The student reported approximately **8 hours** in chat. A session-by-session focused-work breakdown has not been supplied, so this document does not independently establish that total. Do not count reused HW4 work or idle agent/deployment waiting as eight hours of new student work. Fill the table with actual sessions and reconcile the total before submitting; no invented dates or activities have been added.

| Actual date/session | New P2 task | Focused minutes | What I personally did / learned |
|---|---|---:|---|
| To be supplied by the student | | | |

## Verification and deployment record

Initial work passed 15 automated checks. Expanded comparison/performance work passed 27; the identity and validation fixes brought the checked total to 31 (8 JavaScript and 23 Python). Later notebook changes were additionally checked in the browser: preserved older saved studies, new/renamed folders, folder search, notes after refresh, exports of entire folders from filtered views, delete/reload/restore, and review of passage/study destinations with note-preserving merges. Not every rare timeout/storage-quota path was exercised end to end.

Live observations included a first post-deployment fear/hope graph taking 15.0 seconds, a repeated browser search taking 0.1 seconds, and successful AI Jesus/God comparison after the identity fix. These are observed examples, not performance guarantees. Mobile testing was excluded by the student's scope choice.

Representative actual commits include `3ebc30c` / `5fe4388` (initial frontend/backend changes), `e5027c2` / `ce05a43` (explained comparison and speed), `37b7580` (identity/validation repair), `b01c146` / `e09a8e0` (connection clarity), `b58a7ab` (notebook folders), and `da0b839` (delete/restore and save review). These identify AI-applied development history, not student-authored commits or proof of work across ten days.

## Still needed from the student

Write the README's personal explanation in your own words, record actual independent code changes, and supply real focused-work sessions. Review `CODE_GUIDE.md` and practice explaining the request flow, graph identity, grounded comparisons, browser storage, and secret handling. Record the demo and submit the course form yourself; this log does not claim those are completed.

## Final README and notebook wording revision

Verbatim prompt:

> do the readme for me make it sound human like and just make a small student like change and take away anything in the read me thats like  This is a P2 record assembled by Codex from this conversation. It separates the reused HW4 foundation from new P2 work. Complete prompts below are copied verbatim; any partial quotation is explicitly labeled as an excerpt. Process notes are AI-written factual summaries, not additional prompts.

**Outcome:** Codex rewrote the README in plain language, removed checklist placeholders and the lengthy introductory process note, and kept a brief AI credit. In `app.js` → `renderNotebook`, Codex changed the empty-folder heading and instruction to name the selected folder explicitly. This is a small AI-written interface copy change requested by the student, not an independent student-authored code change.

## README tone revision

Verbatim prompt:

> no do it just write it in my tone

**Outcome:** Codex revised the README into a more casual, first-person draft based on the student’s expressed goals and feedback. The AI credit remains; this revision does not establish student authorship of the prose or code.
