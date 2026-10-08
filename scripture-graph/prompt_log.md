# Project 2 prompt log — Scripture Graph

## Project background

P2 builds on the HW4 Scripture Graph. The 15 prompts below record the new comparison, notebook, performance, interface, and documentation work.

## Which tool for which job

- **OpenAI Codex, GPT-6.1 Sol, medium reasoning:** the student identified this model in the conversation. Used for rubric review and planning, repository inspection, code generation, iterative fixes, tests, deployment checks, and documentation. Keeping one agent with the repository context made changes across Flask, JavaScript, and the notebook easier to coordinate. No separate brainstorming/debugging model is evidenced here.
- **Computer-use browser tools:** exercised the rendered interface and real network results, including connection clicks, counts, folder navigation, notes after refresh, exports, and restore. These reveal interface problems that a code-only review misses.
- **Node's test runner and Python unittest:** deterministic checks for graph identity, evidence membership, ranges, corpus format, safe errors, and cache behavior. Chosen to check behavior independently of changing AI responses.
- **Git and HTTPS requests:** inspected the named public repositories, kept a commit history, and checked actual deployed endpoints rather than assuming a push worked. Only the two project repositories were accessed.
- **Prettier and Black:** formatters for readable JavaScript/HTML/CSS and Python. They change presentation, not intended behavior.
- **Runtime OpenAI API:** used by the app for interpreting free-form searches and comparing/explaining retrieved Scripture. This model is selected by `OPENAI_MODEL`, separately from Codex. The source default is `gpt-5.6-luna`; the actual deployed setting was not inspected. Bible retrieval uses public Bible data, not invented AI quotations.

## Development process and actual prompts

The numbered quotations below are the actual prompts. Original spelling is preserved; blockquote markers are added for readability. Development notes appear separately after the prompts.

### 1. Initial P2 review

> here is the project prompt for p2, i am going to build off my hw4 which you can find here [**kadiekeslar.github.io**](https://github.com/kadiekeslar/kadiekeslar.github.io/tree/main)
>
> # scripture-graph this is the front end and here is the back end[kadiekeslar](https://github.com/kadiekeslar)
>
> 1. [**scripture-graph-backend**](https://github.com/kadiekeslar/scripture-graph-backend)**&#xA0;&#x20;**[https://kadiekeslar.github.io/](https://kadiekeslar.github.io/) you can find it here in scripture graph and the frontend and backend code is all there as well, let me know what i should add to it to make it full credit for p2

### 2. Implementation and scope

> okay i dont care about the mobile part but do everything else and tell me what code to change and where

### 3. Apply the edits

> are you able to edit the files for me

### 4. Repository access and permissions

> do you only have access to those or do you have access to my whole github even my private stuff

### 5. Compare meaning

> instead of only crossing reference if they share an exact passage, make it more clear on the similarites and difeerences not just make the user read through all of them and add anything to the app that you thing would be super cool and useful

### 6. Search performance

> also why is it so slow every search

### 7. Loading feedback

> while similarites are loading add loading instead of just nothing found

### 8. Wrong Jesus/God result

> ext-based preview · AI comparison is unavailable right now. You can still explore and save this study.
>
> Compare 1 passages from A with 12 from B. The preview below highlights shared language and differences in these retrieved selections; the AI explanation can also connect ideas expressed with different words.
>
> ### Similarities
>
> No supported connection identified in this selection yet.
>
> ### Differences in emphasis
>
> #### Different passages to begin with
>
> **A · Jesus:&#x20;**“Jesus, who is called Justus, also sends greetings. These are the only Jews among my fellow workers for the kingdom of God, and they have been a comfort to me.”
>
> **B · God:&#x20;**“[1] In the beginning God created the heavens and the earth. [2] Now the earth was formless and void, and darkness was over the surface of the deep. And the Spirit of God was hovering over the surface of the wat…”
>
> A · Colossians 4:11
>
> B · Genesis 1:1-12
>
> Highlight supporting passages
>
> Questions for your study
>
> 1.
> 2.
> 3.
>
> Fit graphReset viewStudy notebook this is what is says

### 9. Counts, clutter, and explanations

> right now the left side doesnt date, there were 3 connections like yellow lines but tit still says 0 also there is a lot of info its overwelming also when i click on the yellow line i dont understand why theyre connected i just see that theyre connected and can read both passages

### 10. Remove sidebar clutter

> Shared passages only
> Choose a yellow connection to see why the passages relate. get rid of this 0 identical passages and this

### 11. Notebook folders

> redo the notebook section it should be more clear where its at and the folders in them and stuff like that

### 12. Delete and save destinations

> how do you delete notebooks and make it easier to know what youre savinf and to where

## One place AI got it wrong

The AI-assisted implementation was reported as working after earlier successful tests, but the student then tried Jesus versus God and found the app had selected Jesus called Justus: the A result contained only Colossians 4:11. Earlier comparison tests had not covered this ambiguous person name. The student identified the bad result and pasted it into the chat. Codex reproduced it against the public API, inspected the separate Jesus and Jesus Christ dataset entries, changed plain Jesus to resolve to Jesus Christ, retained an explicit Justus query, added a regression check, and verified the deployed comparison. The lesson is to test ordinary ambiguous names and inspect the actual retrieved evidence, rather than treating a successful unrelated demo as proof that all searches work.

Other real findings: the full-Bible reader expected chapter content at the wrong nesting level, leaving its topic corpus empty; the reader and a regression test were corrected. A temporary script's mismatched heredoc terminator caused edits not to apply, and failing checks exposed the mistake. A browser click using an outdated numeric index opened the wrong control; testing switched to named controls and checked the returned state.

## Who contributed what

**Student decisions and feedback evidenced here:** reuse the HW4 Scripture Graph foundation; request comparisons of meaning; ask for faster searches and loading feedback; report the incorrect Jesus result; identify misleading counts and overwhelming content; ask for clearer explanation of graph lines; direct removal of sidebar controls; request notebook folders, deletion, and explicit saving destinations. These are real product/design and evaluation contributions.

**AI-written or substantially modified P2 code:** Codex implemented `index.html`, `styles.css`, `app.js`, and `graph-utils.js` updates; backend routes, retrieval, person resolution, comparison validation, cache, and AI integration changes; automated tests; comments; the code guide and supporting technical documentation.

**Independent student code changes:** I implemented the starting folder foundation and got the folders working, AI then helped implement them into the rest of the logic

## Verification and deployment record

Initial work passed 15 automated checks. Expanded comparison/performance work passed 27; the identity and validation fixes brought the checked total to 31 (8 JavaScript and 23 Python). Later notebook changes were additionally checked in the browser: preserved older saved studies, new/renamed folders, folder search, notes after refresh, exports of entire folders from filtered views, delete/reload/restore, and review of passage/study destinations with note-preserving merges. Not every rare timeout/storage-quota path was exercised end to end.

Live observations included a first post-deployment fear/hope graph taking 15.0 seconds, a repeated browser search taking 0.1 seconds, and successful AI Jesus/God comparison after the identity fix. These are observed examples, not performance guarantees. Mobile testing was excluded by the student's scope choice.

Representative actual commits include `3ebc30c` / `5fe4388` (initial frontend/backend changes), `e5027c2` / `ce05a43` (explained comparison and speed), `37b7580` (identity/validation repair), `b01c146` / `e09a8e0` (connection clarity), `b58a7ab` (notebook folders), and `da0b839` (delete/restore and save review). These identify AI-applied development history, not student-authored commits or proof of work across ten days.
