# Scripture Graph — Compare & Study

[Open the app](https://kadiekeslar.github.io/scripture-graph/) · [Backend repository](https://github.com/kadiekeslar/scripture-graph-backend) · [Prompt log](prompt_log.md) · [Code walkthrough](CODE_GUIDE.md)

## My explanation — student writing required

The course requires this explanation in my own words. The text below is a completion checklist, not a claim that I wrote AI-generated code. Replace the bracketed instructions with my actual explanation before submitting.

### What I built and why

[Explain who would use Scripture Graph and what they can do. Explain how P2 changes the HW4 single-search explorer into a comparison and saved-study workflow.]

### How to use it

[In your words: search once or compare two searches; choose a yellow connection for its explanation; save a passage or study into a folder; reopen the notebook, add notes, export, or restore a deleted folder.]

### Features I am proud of

[Choose the feature you actually care about and explain why. Possibilities include explained connections between different passages, faster graph loading, or the folder notebook.]

### My code contribution and what I learned

[Record a change you actually wrote or substantially modified: file, function, before/after behavior, and how you checked it. No independent P2 code edit has been identified in this conversation yet. Your feature choices and bug reports are recorded separately in the prompt log.]

### How I used AI

[Explain your use of Codex with GPT-6.1 Sol at medium reasoning in your own words. Credit the substantial generated implementation, comments, and documentation; describe what you personally checked or changed. The app's server-side OpenAI model is a separate runtime configuration.]

### Local setup and secrets

[Describe the local frontend/backend setup below in your own words. Explain that the OpenAI key stays in backend environment variables, and personal notebook notes stay in this browser.]

## AI-generated technical documentation

Everything in this section was written by Codex. It is supporting documentation, not student-authored prose. The detailed prompt log is a separate file next to this README.

### What the app does

Scripture Graph searches Bible verses, people, topics, and questions, then renders retrieved passages and relationships as an interactive network. Comparing two searches produces evidence-linked similarities, differences in emphasis, and study questions. Blue and purple identify the two selections. Yellow dashed links connect shared themes, even when passage references differ. Those thematic links are AI interpretations or labeled word-match previews, rather than published cross-references.

The P2 notebook stores folders, passages, personal notes, and study outlines in browser storage. Users can create, rename, search, and export folders; deleted folders move to Recently deleted and can be restored. Save reviews show the exact item and destination before saving. Compared with HW4, P2 adds a distinct comparison-to-study workflow rather than only improving a single search.

### Use the deployed app

1. Enter a reference such as Romans 8:28, a person such as Jesus, or a topic such as fear. Enter a second search to compare selections.
2. Choose a yellow link or its title in the left panel. The inspector explains the shared idea and each passage's contribution. Open the verse readings when needed.
3. Expand a similarity, difference, overview, or study question when you want more detail. Node filters and Fit graph help explore the network.
4. For one passage, select its node and choose Review & save passage. For a comparison, choose Review & save study. Check the contents and folder, then confirm.
5. Open My notebook in the left sidebar. Select a folder, expand a saved passage, and type notes; notes save automatically. Export folder downloads the entire folder, including notes and outline, even if its visible list is filtered.
6. Delete folder moves it into Recently deleted. Restore it from the folder sidebar. Closing or canceling a save review does not save the item.

Counts describe retrieved selections, not exhaustive Bible-wide theological claims. A bare Jesus search resolves to Jesus Christ; Jesus called Justus can be searched explicitly. Metadata references lacking text in the selected translation are excluded.

### Run locally

Clone the two repositories and install backend dependencies:

```sh
git clone https://github.com/kadiekeslar/kadiekeslar.github.io.git
git clone https://github.com/kadiekeslar/scripture-graph-backend.git
cd scripture-graph-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create an untracked backend `.env` containing `OPENAI_API_KEY` and, optionally, `OPENAI_MODEL` set to a model available to your account. Do not paste real keys into documentation or source files. Then run:

```sh
python app.py
```

In another terminal, from the frontend repository:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/scripture-graph/?api=http://127.0.0.1:5000`. Without the local API override, the frontend uses the deployed Render backend. Retrieve-only paths can work without a local OpenAI key; AI comparison and free-form interpretation require one.

### How the code fits together

| File | Responsibility |
|---|---|
| `index.html` | Search controls, graph area, inspector, notebook, save review |
| `styles.css` | Desktop layout, colors, collapsed findings, folder workspace |
| `app.js` | Fetch requests, Cytoscape interaction, notebook storage and save/delete events |
| `graph-utils.js` | Response validation, exact-reference graph merging, text previews, study/export data |
| Backend `app.py` | Flask endpoints and safe public errors |
| Backend `services.py` | Route a query into verse/entity/topic retrieval and optional explanations |
| Backend `bible_data.py` | Public Bible API, person matching, complete ranges, lexical verse search |
| Backend `comparison.py` | Evidence-grounded AI comparison, citation validation, one validation retry |
| Backend `ai_service.py` | Server-side OpenAI calls; model selected by `OPENAI_MODEL` |
| Backend `result_cache.py` | Bounded ten-minute cache and sharing work between identical requests |

Search flow: browser → `/explore?fast=1` → public Bible data → graph JSON. Two comparison searches run together. The graph renders before optional `/compare` or `/explain` finishes. Request numbers stop older requests replacing a newer search; cancel and timeouts stop indefinite waiting. Cached results and parallel data retrieval reduce repeated work. Server sleep/restart clears its in-memory cache.

Notebook flow: save review → chosen folder → `localStorage` → notebook display or Markdown export. Version-1 saved studies remain compatible. Recently deleted stays in the same browser storage; clearing browser data also removes it.

### Secrets and data handling

OpenAI credentials stay in the Flask server's environment or ignored `.env`, never in browser JavaScript. Render holds deployed secrets. Requests can send search terms and retrieved passages to OpenAI for interpretation. Personal notebook notes are not sent to the backend and do not sync across browsers/devices. Export a folder to back it up. Public error messages avoid exposing raw provider errors.

### Testing and limitations

Run `node --test scripture-graph/tests/graph.test.cjs` from the frontend repository. Run `python -m unittest discover -s tests` from the backend repository with dependencies installed. These checks cover graph identity, citation validation, export, range/corpus parsing, query routing, API errors, and cache coalescing. Browser checks additionally exercised saving, notes after refresh, folder renaming/search/export, deleted-folder restoration, and connection selection.

The app retains the desktop layout; mobile work was explicitly excluded. This is a remaining rubric limitation, not an automatic exemption. AI explanations compare a limited retrieved selection and need context checks. Free hosting wake-up and external API delays can still affect a first search.

### AI and source attribution

Development used OpenAI Codex with **GPT-6.1 Sol, medium reasoning**, as reported by the student. Codex generated or substantially modified most of the new P2 frontend/backend, tests, comments, and technical documentation. Student-requested features, iterative feedback, and independently written code are distinct contributions; see the prompt log.

The application's OpenAI model is configured separately using `OPENAI_MODEL`; the code's default is `gpt-5.6-luna`. The deployed environment value has not been inspected. Do not confuse that runtime setting with the Codex development model.

- [Free Use Bible API](https://bible.helloao.org/) supplies Berean Standard Bible text, Open Bible cross-references, and Theographic metadata.
- [Cytoscape.js](https://js.cytoscape.org/) renders the graph.
- [Flask](https://flask.palletsprojects.com/) serves JSON endpoints.
- [OpenAI](https://openai.com/) provides Codex and the runtime AI API.
- Existing HW4 code was reused as the foundation; P2's new work is logged separately.
