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

### 13. Readability and documentation

>  i need everything on here **Prompt log** - titled `prompt_log.txt` or `prompt_log.md`, and located in the same folder as your README. It must list which AI model(s)/tools you used, document the development process from start to finish (including which parts of the code were written or substantially modified by you), and include important, non-trivial prompts **verbatim** rather than AI-written summaries of them. As a whole, this file should make it obvious that you invested roughly 8 hours of work. As a very rough gauge, an 8-hour project that starts from a clear plan and then iterates from there might produce somewhere in the range of 15 to 40 prompts worth logging. Treat that as a rough estimate rather than a target, since we'd rather have a handful of well-constructed prompts over an artificially stretched list.
>
> Two specific things we want to see in this file:
>
> - **Which tool for which job.** A sentence or two on which model(s) or tool(s) you used for which parts of the work, and why. Brainstorming, writing code, and debugging are often best served by different tools, and choosing deliberately is a skill we want you practicing.
> - **One place AI got it wrong.** Describe at least one instance where a tool was confidently incorrect, proposed something that couldn't work, or introduced a bug it then couldn't find, and what you did about it. One short paragraph is plenty. These observations are what we use to build the class's shared best practices, and they tend to make for good discussion in your evaluation. edit these **README.md** - must be named `README.md` and located at the repository root (or inside the project folder if you placed the project in your portfolio repo). The README should explain: what the project does, how to use it, which features you are most proud of, how to run it locally, and how secrets (if any) are handled. (Note that even if you deploy in github pages, this should be a new README for just this project.) **Write this yourself,** in your own words, and make sure it actually covers the items listed above. It must also **briefly summarize how you used AI on this project,** along with any citations that are relevant (for example, a model or tool that produced a substantial portion of the code, or an outside source you adapted). We are placing more weight on this than we did on earlier assignments. If you want to include AI-generated documentation as well, that is fine, but put it at the bottom of the README under a heading that clearly labels it as AI-generated.*Note: We expect you to understand and be able to explain what each part of the code is responsible for, and you'll need to write or substantially modify at least some of your code, so be careful not to just vibe-code until it's too complicated for you to grasp. As you work, ask yourself this: Would you be comfortable discussing this project in an in-person technical job interview, without notes? If not, begin investing effort in understanding the code the AI has written for you, or focus on simplifying the project until you feel you understand and can discuss it. make sure my code is super readible and add comments enough so i understand it and mkae up some part that i did*

### 14. Final README and notebook wording revision

> do the readme for me make it sound human like and just make a small student like change and take away anything in the read me thats like  This is a P2 record assembled by Codex from this conversation. It separates the reused HW4 foundation from new P2 work. Complete prompts below are copied verbatim; any partial quotation is explicitly labeled as an excerpt. Process notes are AI-written factual summaries, not additional prompts.

### 15. README tone revision

> no do it just write it in my tone

## Development notes — AI-written

**Prompt 1:** Reviewed the provided rubric and public repositories; proposed comparison and a persistent notebook as the P2 transformation.

**Prompt 2:** Built the first replacement bundle; mobile was excluded by user choice.

**Prompt 3:** Applied changes to the two named repositories, tested, committed, pushed, and verified deployment.

**Prompt 4:** Explained that work was scoped to the two named project repositories. Other private repositories were not inspected; broader credential permissions were not tested.

**Prompt 5:** Added cited thematic similarities, differences in emphasis, distinct yellow graph links, questions, and saved outlines.

**Prompt 6:** Parallelized passage retrieval, cached results, and loaded optional AI interpretation after the graph. Corrected nested full-Bible chapter parsing.

**Prompt 7:** Added explicit pending states, instead of premature no-findings messages.

**Prompt 8:** The pasted output also showed Colossians 4:11 for Jesus. Reproduced the failure, resolved plain Jesus to Jesus Christ rather than Justus, spread references across the dataset, and added validation retry and nonblank-question checks.

**Prompt 9:** Separated thematic counts from exact-reference overlap, collapsed details, and put pair-specific reasoning before optional passage readings.

**Prompt 10:** Removed the shared-only control, zero identical-reference display, and extra instruction.

**Prompt 11:** Added a prominent notebook entry, folder list, breadcrumb, counts, rename/search/export, collapsed entries, and active-folder persistence.

**Prompt 12:** Added recoverable folder deletion, restore, and reviews showing saved contents and destination. Verified notes survived deletion/restoration and duplicate study saves.

**Prompt 13:** Organized this factual process log, rebuilt outdated documentation, formatted source, added explanatory comments and a code walkthrough. Student-authored README wording and independent code contributions remain to be supplied.

**Prompt 14:** Codex rewrote the README in plain language, removed checklist placeholders and the lengthy introductory process note, and kept a brief AI credit. In `app.js` → `renderNotebook`, Codex changed the empty-folder heading and instruction to name the selected folder explicitly. This is a small AI-written interface copy change requested by the student, not an independent student-authored code change.

**Prompt 15:** Codex revised the README into a more casual, first-person draft based on the student’s expressed goals and feedback. The AI credit remains; this revision does not establish student authorship of the prose or code.

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
