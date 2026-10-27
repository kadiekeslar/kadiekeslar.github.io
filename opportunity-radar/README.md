# Opportunity Radar

## 1. What I built and why — write this yourself

I built a website called Opportunity Radar, it was made to helps college students find internships and jobs that match their experience and interests. I chose this idea because internship searching can be overwhelming, and I wanted to make something that could use semantic search to find relevant opportunities even when the job description uses different wording than the student’s resume or search.

## 2. My data — write this yourself

I store real job postings collected from public company career pages. Each job is one item, and longer descriptions are split into smaller chunks so they can be searched better with embeddings. I loaded hundreds of jobs and thousands of chunks, and I store extra information like the company, job title, location, job ID, and whether the job is open.

## 3. Adding and searching — write this yourself

A user can add a new job posting while the app is running by entering the job information and description. The app saves it and adds it to the vector database so it can be searched right away. Users can then search in normal language and use the matching job details and explanations to decide whether they want to apply, save the job or they can just keep looking.

## 4. My two semantic examples — write this yourself

One query I tested was “protect a company from cyber attacks.” This returned security-related jobs such as Palantir’s Information Security Engineer Internship and Metasys’s Security Engineer Internship. The postings did not need to use the exact phrase “protect a company from cyber attacks,” but the app still understood the meaning and found related security roles.

My second query was “teach people and help them learn.” This returned learning and education-related roles instead of only jobs that matched the technical skills in my profile. This showed that the search could use the meaning of what I typed instead of only matching exact words from my resume.

## AI-generated technical documentation

Opportunity Radar collects real public company postings, tracks their lifecycle, and uses persistent ChromaDB to search descriptions by meaning. Resume recommendations combine retrieved evidence with conservative, separate eligibility checks and a manual application tracker. It does more than print nearest neighbors: it shows supported resume/posting connections, prioritizes actions, excludes closed/stale recommendations, and tracks decisions over time. No hosted LLM or secret API key is needed.

### Run it

Tested with **Python 3.12** and **Node 24**. Use Python 3.12 and Node 22.12+ or 24. From the repository root:

```sh
cd opportunity-radar
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.lock.txt
cp .env.example .env
cd frontend
npm ci
cd ..
./start.sh
```

Open **http://127.0.0.1:5173/opportunity-radar/**. Saving roles and using the application tracker require no account or setup. They persist in the current browser. Accounts are optional for resume matching: use an email-format identifier and a password of at least 10 characters. Email is not contacted or verified. Use a unique password; password reset and email integration are not implemented.

The API starts at **http://127.0.0.1:8000**, with interactive documentation at **http://127.0.0.1:8000/docs**. The first background import downloads an approximately **79 MB** embedding model and populates the database. The initial import/index took about 2.5 minutes on the development machine. The site can display imported postings before every vector is ready; semantic results expand as indexing completes. Later refreshes only embed jobs with changed text or missing index state.

`./start.sh` runs the API and frontend; Ctrl+C stops both. The API runs a dedicated refresh thread at startup and every four hours, independent of page requests. It shares the API's Chroma client to avoid multiple processes writing an embedded index. Run only **one API worker/process** with this local-storage architecture. To disable this scheduler, set `AUTO_REFRESH=0` in `.env` and restart the API.

To run the services separately:

```sh
# Terminal 1, from opportunity-radar/
source .venv/bin/activate
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
# Terminal 2, from opportunity-radar/frontend/
npm run dev
```

### Refresh without the website

With the API stopped, the same collection pipeline can run independently:

```sh
source .venv/bin/activate
python refresh_jobs.py
python refresh_jobs.py --limit 3
python refresh_jobs.py --loop --hours 4
```

`--limit` selects complete company boards, not a truncated subset of each board. `--no-embed` imports structured jobs only. A failed index remains pending and retries on the next refresh. Provider errors are logged and preserve earlier records. Empty/incomplete responses or a drop exceeding half of an established board do not automatically mass-close jobs; investigate before deliberately using `--allow-large-drop`.

For cron or a hosting scheduler, disable the API's embedded scheduler and run the command against persistent storage when the embedded Chroma client is not in use by another process. A production expansion to multiple processes should use a dedicated Chroma server rather than share an embedded index across processes.

### Corpus and persistence

The October 26, 2026 import retrieved **647 real postings**, indexed as **5,065 chunks**:

| Company | Public source | Postings observed |
| --- | --- | ---: |
| Figma | Greenhouse | 140 |
| Duolingo | Greenhouse | 60 |
| Notion | Ashby | 140 |
| Palantir | Lever, paginated | 307 |

Counts change with the employers' boards. This corpus includes experienced jobs as well as student roles; use the student filter to narrow it. That filter uses title signals and does not certify eligibility.

`companies.json` contains provider names and public board identifiers. No ATS secret keys or private employer APIs are used. The provider modules normalize descriptions, original URLs, locations, and reliable dates. Greenhouse's updated timestamp is not mislabeled as the posting date. Missing dates and deadlines remain unknown.

One vector item is a **maximum 220-token passage**, with a 30-token overlap. Chunking uses the actual model tokenizer, not character-count guesses, so a long posting is not silently truncated to its first paragraph. Metadata includes `job_id` and company. Full original plain-text descriptions stay in SQL; the vector result identifies the exact source passage. One SQL job may have several vector chunks, but search returns each job once.

- Vector database: ChromaDB `PersistentClient`, persisted in `chroma_store/`.
- Embedding model: local ONNX **all-MiniLM-L6-v2**, 384 dimensions, cosine distance. Model files are cached in `data/models/` on first use.
- Structured database: SQLite via SQLAlchemy, in `data/opportunities.sqlite3`.
- No resume text or job text is sent to an external embedding/LLM API. Provider HTTP requests fetch public postings only. Chroma/library operational telemetry is separate from content processing.
- Raw job data, both databases, models, passwords, tokens, and resumes are **not committed to GitHub**. They are regenerated by running the importer, or created by users at runtime.
- Reproduce the corpus using `python refresh_jobs.py`; there is no old frozen dataset to download from the repository.

On refresh: a first appearance becomes NEW; an existing listing becomes OPEN and updates verification; a disappeared listing becomes CLOSED, retaining its original record and closing timestamp. Reopened postings retain their original first-seen time and gain a REOPENED event. NEW is a lifecycle flag, while “discovered today” uses midnight UTC. `job_events` preserves lifecycle history for later recruiting-cycle analysis. Source identity plus canonical original URLs avoid exact duplicates; fuzzy cross-provider deduplication is not implemented.

### Jobs and Info

Jobs is the single personalized feed. The separate For you and Recently opened tabs have been removed. Signed-in users can supply skills and project/experience text in Info without needing a resume; uploaded resumes also contribute evidence. Preferred roles constrain results semantically. Preferred location and job type populate the Jobs filters after sign-in and after saving Info, and can be changed or cleared there. Company is an open text filter (partial, case-insensitive names), not a fixed four-company dropdown. It filters the available corpus; it does not fetch every employer on the internet. The current configured sources still cover four employers.

Recommendations include only excellent/strong semantic matches. Known eligibility failures and unknown values needed for recognized requirements are excluded. Senior/staff titles receive a conservative five-year experience screen; principal/director/head/VP titles receive an eight-year screen. These thresholds are application heuristics, not claims about an employer's stated minimum. Role preference/search relevance contributes to ranking alongside experience relevance. Missing evidence produces an empty feed and a prompt to improve Info rather than unrelated jobs. Unrecognized requirements still require reviewing the original posting; the app cannot certify that someone qualifies for every job condition.

Recently opened is now a checkbox within Jobs. Job type, company, location, and recency apply together before personalized ranking. The Students & early careers shortcut/filter has been removed. Info persists skills, experience, preferences, and the existing profile fields per account. A previously uploaded resume is shown as saved, with readable extracted text restored on login/reload; replacement is a collapsed action. The original PDF binary is not retained.

### Saving, returning, and recent openings

The **Saved** tab opens immediately, including when the opportunity service is unavailable. A save fills the bookmark, changes its label to Saved, and updates the navigation count. Role snapshots, application statuses, dates, and notes persist in browser local storage across reloads; clearing site data removes them. This is device/browser storage, not cross-device account synchronization. Existing signed-in account saves are merged into the browser tracker when available; signed-in updates also attempt to sync to that account. Browser snapshots include public posting fields only, never resume evidence.

End users are not shown backend settings or connection instructions. The app uses its configured API automatically, defaulting to localhost for the current local-only setup. Fresh job search and resume matching still require that service to be running; this UI cleanup does not create cloud hosting. Previously viewed roles can be browsed from a small browser cache during an outage, with an explicit cached-data notice and verification freshness recalculated from timestamps. Cached browsing is not presented as semantic search.

**Recently opened** is a Jobs filter. It selects roles with employer posting dates in the past seven days; where no date is supplied, it uses and labels First discovered instead. Known old postings do not qualify merely because they were imported today. Provider job-type variants such as Intern/Internship and FullTime/Full-time map to one label and one filter each.

### Runtime additions and useful retrieval

1. Sign in, choose **Add a role**, and paste a public posting's title, company, original URL, and description (at least 80 characters).
2. The API saves it, embeds its useful text, and returns only after it is searchable. Reusing an original URL returns the existing record.
3. Search with a natural-language description. Results include the matching source passage and a heuristic similarity category, never a probability of getting hired.
4. Open a job, review the evidence and source freshness, save it, and track its status.
5. Add skills/experience or a text/PDF resume under **Info**, then open **Jobs** for personalized matches. The general `/jobs?q=...` API remains available for corpus-wide semantic search, including immediately searchable unverified runtime additions; those additions are excluded from verified personal recommendations.

User additions are explicitly public postings in this backend instance, not private notes. They are labeled **Needs verification**, and they cannot appear in normal resume recommendations until an official source verifies them. They are still immediately searchable, satisfying runtime addition without inventing employer verification.

Search combines vector retrieval with SQL filters for status, company, location, employment type, discovery age, and early-career title signals. Up to 100 distinct semantic results are returned; exact browse supports pagination across the corpus. A cosine-distance gate of 0.78 suppresses sufficiently distant results. Similarity labels use heuristic cutoffs (excellent <0.30, strong <0.48, possible <0.65, otherwise weak); these are imperfect and not calibrated hiring likelihoods. Some unrelated queries yield no matches, while others still produce weak or spurious results. Review the retrieved passage rather than trusting a label.

### Two measured semantic examples

Tested against the imported corpus on October 26, 2026. The returned job is the top result, not a hard-coded special case. Different future board contents can change rankings.

| Query | Observed top result | Why exact words miss the retrieved passage |
| --- | --- | --- |
| `help learners master a foreign tongue` | Duolingo — **Senior Learning Designer, Indian Languages** (cosine distance 0.4028) | The retrieved passage describes linguistics and pedagogically sound courses; it does not use the important query terms “learners,” “master,” “foreign,” or “tongue.” |
| `defend against hackers trying to break in` | Figma — **Security Engineer** (cosine distance 0.4906) | The passage describes detecting threats and auditing software, without the important query terms “defend,” “hackers,” or “break in.” |

Supporting excerpts:

- Duolingo: “identify learning challenges and design accurate, pedagogically sound courses.” [Original posting](https://careers.duolingo.com/jobs/8722385002)
- Figma: “Build platforms and tooling to detect and respond to infrastructure and corporate security threats.” [Original posting](https://boards.greenhouse.io/figma/jobs/5829751004) (Use the application’s original link if the employer replaces this posting.)

These illustrate synonym/concept retrieval, not a claim that keyword search could never find the complete job through other words. Earlier observational-research probes returned poor matches, and the prompt log records that limitation. The code does not special-case either successful query.

### Match, eligibility, and decisions

Resume uploads support PDF/text up to 5 MB, 20 PDF pages, and 60,000 extracted characters. Scanned/image-only PDFs require OCR outside this app. Sections are detected from headings; originals are not invented or rewritten. Only extracted text and its vectors are retained, not the uploaded PDF binary. Users can delete resume text and vectors.

Matching queries up to the first 12 token chunks of combined resume/skills/experience text against freshly verified, non-closed jobs. Long resumes may therefore have uncovered later content. The UI shows exact passages from the resume and job and states that semantic proximity is a connection, not proof of qualifications. It can surface other role families beyond the user's preferred titles.

Eligibility extraction supports only explicit years-of-experience requirements, unambiguous month/year graduation windows, and explicit no-sponsorship statements. It reports **Unknown** for missing profile values or unsupported requirements. Degree, location/work eligibility, and other nuanced requirements require review and are explicitly called out. “Likely eligible” means the recognized checks passed, not that every employer condition has been evaluated.

- APPLY NOW: excellent/strong semantic match + recognized eligibility checks passed + verified within 24 hours.
- SAVE: interesting but eligibility, freshness, or relevance needs review.
- SKIP: a recognized eligibility failure or weak match.
- PREPARE: a separately stored future opening backed by a source or labeled historical prediction.

No future opening dates or historical predictions have been fabricated. Future-opening tables/API remain reserved for later historical analysis; the public interface now shows Recently opened rather than an empty prediction page. Historical forecasting, email integration, and sophisticated requirement extraction remain future work.

Application statuses: Saved, Applied, Interview, Rejected, Offer, Withdrawn. Saved/applied dates, notes, and status persist in the browser tracker immediately, with optional account synchronization when signed in. Saving an applied job does not regress its status. Profile and resume data are scoped to the authenticated user. Passwords use salted scrypt hashes; bearer tokens are random, hashed in SQL, expire after seven days, and are stored in browser session storage per backend origin. Basic in-process authentication throttling is included. There is no account recovery, email verification, multi-instance rate limiting, or production account administration yet.

### Public frontend and backend hosting

Frontend: **https://kadiekeslar.github.io/opportunity-radar/**. GitHub Pages cannot execute Python or keep these databases. Without a connected running API, the public site explains how to connect; it does not pretend to be searching.

For the owner using the same computer, start the local backend and open the live frontend with:

**https://kadiekeslar.github.io/opportunity-radar/?api=http://127.0.0.1:8000**

The service URL is configured by the developer, not through user-facing settings. A browser may require permission to access local network services. This connects only that browser to its own computer, not all public visitors.

To make the whole product usable by public visitors:

1. Choose a Python/container host with **persistent writable storage**. No paid plan has been selected or purchased. Ephemeral/free server filesystems do not satisfy persistence. You can also run it on a persistent VM you already own.
2. Deploy this folder with `Dockerfile` or the normal Uvicorn command, using one worker. Persist both `/app/data` and `/app/chroma_store`; keep `AUTO_REFRESH=1` and `REFRESH_HOURS=4`. Provide HTTPS. `CORS_ORIGINS` must include `https://kadiekeslar.github.io` (origin only, no path).
3. For a local Docker alternative: `docker compose up --build -d`. This configuration uses named volumes and a localhost-only API port. It was prepared but Docker was not executed in this session.
4. Set `VITE_API_URL=https://your-api-host` in `frontend/.env.local`, then run `npm run build` from `frontend/` and commit the generated project-root `index.html` and `assets/`. Never put secrets in VITE variables.
5. Verify account creation, search, uploads, restart persistence, and background freshness on the deployed host. Configure backups of the persistent volumes before relying on saved applications.

The frontend can remember a manually entered API URL in browser local storage, while account sessions stay in session storage. Remote APIs require HTTPS; localhost HTTP is accepted for development. Changing the backend does not send an existing backend's session token to the new one.

### Prepared Render configuration

`render.yaml` configures a single Python service in this repository's `opportunity-radar` subfolder. One disk mounted at `/var/data` holds SQLite, Chroma, and the embedding model. `MODEL_CACHE_PATH` keeps model downloads on that same disk. The configuration is prepared; service creation still requires account and cost approval. Render's free web services cannot attach persistent disks. Creating the proposed paid service is a separate action from committing this file.

### Important files

- `backend/main.py`: API, per-user routes, read-only job feed, background scheduler.
- `backend/database.py`: jobs, lifecycle events, accounts, tracker, board state, vector index state, future openings.
- `backend/vectors.py`: token-aware chunking, local embedding, persistent collections, grouped retrieval, incremental indexing.
- `backend/matching.py`: explicit eligibility extraction and evidence-based decision categories.
- `backend/jobs/providers/`: Greenhouse, Lever, Ashby adapters.
- `backend/jobs/refresh.py` / `refresh_jobs.py`: standalone importer and lifecycle reconciliation.
- `companies.json`: monitored public boards.
- `frontend/src/main.jsx` / `styles.css`: careers-style responsive interface.
- `start.sh`, `Dockerfile`, `compose.yaml`: local and deployment launch options.
- `prompt_log.md`: authentic prompts, development decisions, and verification history.
- `DEMO.md`: video checklist and submission steps.

### Verify

```sh
source .venv/bin/activate
python -m pytest backend/tests -q
curl http://127.0.0.1:8000/health
curl 'http://127.0.0.1:8000/jobs?q=defend%20against%20hackers%20trying%20to%20break%20in'
cd frontend
npm run build
```

Tests use temporary databases, real local embeddings, and synthetic fixture records. They check runtime insertion/search, persistence, chunk bounds, closed/stale exclusions, authentication isolation, logout, resume deletion, eligibility, source lifecycle reconciliation, and unchanged embedding avoidance. A first test run may download the embedding model. Run `npm test` from `frontend/` for browser-storage, job-type, offline-cache, and freshness checks.
