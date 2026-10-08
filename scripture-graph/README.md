# Scripture Graph: Compare & Study

## My project explanation — write this section yourself before submitting

The assignment requires a README in your own words. Replace these prompts with your own explanation; the technical notes below are labeled as AI-generated.

- What does this app do, and who would use it?
- What did HW4 already do? What new P2 features change how someone uses it?
- Which feature are you most proud of, and why?
- Which exact code changes did you make yourself? Name the function/file and explain your decision.
- How did you use AI, which tools/models did you use, and what did you verify or correct?
- State your actual work time and development process in the separate prompt log.

## AI-generated technical documentation

This section was prepared with Codex and must stay labeled if retained.

### What the software does

The existing Bible explorer retrieves passages and cross-references using a Python/Flask API and visualizes them with Cytoscape.js. P2 adds a comparison workflow, an exact-reference overlap list, named study collections, personal notes, and Markdown export. It also corrects verse-range retrieval, relationship styles, empty results, and search error handling.

### Use the app

1. Enter a Bible verse, person, topic, or natural-language question in the first search field.
2. Optionally enter a second search. Blue represents the first result, purple the second, and gold a shared passage.
3. Select a node or a shared-reference button to read Scripture and connection details. Use node-type filters or the shared-passages filter to narrow the view.
4. Save a verse to a collection. Open **Study notebook** to create collections, add notes, remove saved passages, or export Markdown.
5. **Fit graph** fits visible nodes. **Reset view** restores all filters and shows the search center. Cancel or retry slow/failed searches.

Comparison counts measure exact displayed reference matches among the returned passages, not all relevant verses in the Bible. Different ranges count separately. Topic and subtheme nodes are kept separate even when the backend gives them the same IDs.

### Architecture and code map

- `index.html`: page structure, comparison controls, inspector, notebook dialog.
- `styles.css`: original desktop design plus P2 controls and notebook styling.
- `graph-utils.js`: validates graph responses, merges results without ID collisions, and formats notebook exports.
- `app.js`: requests results, renders the graph, handles filters and selection, and stores collections.
- Backend `app.py`: Flask routes and public error responses.
- Backend `services.py`: builds retrieved graphs and invokes AI interpretation/explanation.
- Backend `bible_data.py`: retrieves Bible data, resolves verse ranges, and performs lexical search.
- Backend `ai_service.py`: existing server-side OpenAI calls; its model is configured with `OPENAI_MODEL`.

Comparison happens in the frontend, using two requests to the existing `/explore` route. The two search requests run together, and the backend batches independent passage retrieval in parallel. A 150-second overall timeout, cancellation, and a request number prevent indefinite loading and stale responses. The browser caches up to 20 successful searches per session.

### Run locally

Clone the frontend and backend repositories separately:

```sh
git clone https://github.com/kadiekeslar/kadiekeslar.github.io.git
git clone https://github.com/kadiekeslar/scripture-graph-backend.git
```

From the backend repository:

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Before starting Flask, configure `OPENAI_API_KEY` and `OPENAI_MODEL` in a local `.env` file. Use a model available to your API account; keep the same working Render model configuration unless deliberately changing it. Never commit `.env`.

From the frontend repository:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/scripture-graph/?api=http://127.0.0.1:5000` to use your local backend. Without that query parameter, the frontend uses the deployed Render backend. Only localhost/127.0.0.1 HTTP overrides are accepted.

### Secrets, privacy, and limitations

The OpenAI key stays on the backend in environment variables, never in the browser code. Keep `.env` ignored and configure secrets in Render's environment settings. Public errors no longer expose raw provider exception details.

Queries are sent to the backend and may be sent to OpenAI for interpretation. Notebook entries and personal notes remain in this browser's localStorage and are not sent to the backend. They do not sync across devices; clearing browser data removes them. Export backups. If storage is unavailable, the app retains session changes and displays a warning.

This version retains the HW4 desktop layout. Small screens are not supported well; mobile improvements were explicitly excluded from this implementation. This does not automatically qualify as a genuinely desktop-only project under the course rubric.

AI-generated explanations and topic categories are labeled and should be checked against the retrieved Scripture. Entity enrichment is chapter context, not proof that the selected verse mentions an entity. Topic search is lexical retrieval guided by AI, not exhaustive semantic search.

### Sources and attribution

- [Bible data API](https://bible.helloao.org/) supplies Berean Standard Bible text, Open Bible cross-references, and Theographic metadata through the existing backend.
- [Cytoscape.js](https://js.cytoscape.org/) renders the interactive network.
- [Flask](https://flask.palletsprojects.com/) serves the backend API.
- [OpenAI API](https://platform.openai.com/docs/) supplies server-side query interpretation and explanations.
- Codex generated the P2 replacement implementation and technical notes. The student must separately identify their own manual changes and record actual development tools/models in `prompt_log.md`.

### Project links

- [Live project](https://kadiekeslar.github.io/scripture-graph/)
- [Frontend source](https://github.com/kadiekeslar/kadiekeslar.github.io/tree/main/scripture-graph)
- [Backend source](https://github.com/kadiekeslar/scripture-graph-backend)

GitHub Pages hosts the frontend and Render hosts the backend. A new commit may take a few minutes to appear in the public deployment; verify that the page says Compare & Study and the backend version says compare-study-p2.

### Explained comparisons and faster search (P2 continuation)

Comparisons now include an overview, thematic similarities, and side-by-side differences in emphasis, each with clickable evidence from both retrieved selections. Gold dashed links connect supporting passages even when they have different references. These thematic links are labeled separately from published cross-references. Highlighting evidence focuses the graph on the cited passages.

**Save study outline** creates a notebook collection with the findings, supporting Scripture, and study questions. Its Markdown export includes the explanation and questions alongside your notes. Existing saved collections remain compatible.

A text-based preview appears immediately and is replaced by AI-assisted interpretation when available. Word-family matches are explicitly labeled as a preview: matching language does not guarantee the same theological meaning. Differences concern the selected passages, not exhaustive claims about the entire Bible. The backend verifies every comparison citation belongs to the respective retrieved selection; verification of citation membership does not automatically prove the interpretation is correct.

Search optimizations include parallel passage/entity retrieval, ten-minute process-local result caching, coalescing duplicate concurrent requests, cached query interpretation, and graph-first/background-explanation delivery. Eight common topics (fear, hope, faith, love, anxiety, forgiveness, suffering, prayer) use transparent word-family retrieval without an initial AI classification call. More complex questions still require AI classification. The complete translation reader now handles the API's nested chapter format correctly; a lock prevents duplicate first-time full-Bible downloads.

Endpoints: `GET /explore?fast=1&q=...` returns retrieval before final AI explanation; `GET /explain?q=...` enriches that retrieved graph; `POST /compare` accepts JSON `{"left":"fear","right":"hope"}` and returns evidence-checked findings. The frontend wakes `/health` when opened. Caches are in memory and reset on service restart. Render free-tier cold starts can still add delay; these code changes do not make a sleeping service permanently available.

Run frontend checks with `node --test scripture-graph/tests/graph.test.cjs` from the frontend repo. Run backend checks with `python -m unittest discover -s tests` from the backend repo, with its dependencies installed.

### Notebook folders

Open **My notebook** in the left sidebar. Choose a folder to view its saved passages and study outline, create or rename folders, search saved text/notes, and export the entire folder as Markdown. Passage notes save automatically. The notebook remembers the last selected folder and keeps existing stored studies. Storage remains local to this browser and device.
