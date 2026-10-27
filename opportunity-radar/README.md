# Opportunity Radar

## 1. What I built and why

I built a website called Opportunity Radar, and it was made to help college students find internships and jobs that match their experience and interests. I chose this idea because internship searching can be overwhelming, and I wanted to make something that could use semantic search to find relevant opportunities even when the job description uses different wording than the student’s resume or search.

## 2. My data

I store real job postings collected from public company career pages. Each job is one item, and longer descriptions are split into smaller chunks so they can be searched better with embeddings. I loaded hundreds of jobs and thousands of chunks, and I store extra information like the company, job title, location, job ID, and whether the job is open.

## 3. Adding and searching

A user can add a new job posting while the app is running by entering the job information and description. The app saves it and adds it to the vector database so it can be searched right away. Users can then search in normal language and use the matching job details and explanations to decide whether they want to apply, save the job, or keep looking.

## 4. My two semantic examples

One query I tested was “protect a company from cyber attacks.” This returned security-related jobs such as Palantir’s Information Security Engineer Internship and Metasys’s Security Engineer Internship. The postings did not need to use the exact phrase “protect a company from cyber attacks,” but the app still understood the meaning and found related security roles.

My second query was “teach people and help them learn.” This returned Coinbase’s Learning & Development Intern along with other learning-related results. The jobs did not have to use the exact words “teach people,” but the search still connected the idea to learning and development work. This showed that the meaning of the search could change the results instead of only using the technical skills in my profile.

## AI-generated technical documentation

### Local class version

The local version is the implementation used for the vector-database requirement. It uses Python/FastAPI, SQLite, and persistent ChromaDB.

- Vector database: ChromaDB `PersistentClient`, stored in `chroma_store/`
- Embedding model: local ONNX `all-MiniLM-L6-v2`, 384 dimensions, cosine distance
- Structured database: SQLite through SQLAlchemy
- Job descriptions are split into passages of up to 220 tokens with a 30-token overlap
- Vector metadata includes the job ID and company
- Raw job descriptions remain in the structured database while Chroma stores searchable chunks

The local search now treats a user’s typed search as the primary semantic vector query. Resume/profile similarity is only a secondary signal, so a search such as “protect a company from cyber attacks” is not forced back toward software jobs just because the user has technical experience.

### Runtime additions

A signed-in user can choose **Add a role** and enter a public job title, company, original URL, location, and description. In the local class version, the job is saved and indexed into Chroma before the request finishes, so it is immediately searchable. User-added jobs are marked as unverified until they come from an official monitored source.

### How to load the data

The raw job dataset is not committed to GitHub. To reproduce the local corpus, run the importer:

```sh
cd opportunity-radar
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.lock.txt
cp .env.example .env
python refresh_jobs.py
```

The first run downloads the embedding model and creates the SQLite and ChromaDB data locally. Later refreshes only re-embed jobs when their searchable text changes or their index is missing.

To run the full local app:

```sh
cd opportunity-radar
source .venv/bin/activate
cd frontend
npm ci
cd ..
./start.sh
```

Local frontend: `http://127.0.0.1:5173/opportunity-radar/`

Local API: `http://127.0.0.1:8000`

### Public demo

Public site: https://kadiekeslar.github.io/opportunity-radar/

The public demo uses GitHub Pages for the frontend and a hosted Supabase backend for accounts, profiles, saved applications, and the larger hosted job feed.

The public interface has three main sections: **Jobs, Info, and Saved**. The Jobs page includes natural-language search, location, company, job type, and recency filters. When a search is entered, the search meaning is treated as the main ranking signal and profile information is used only as a smaller secondary signal.

The public demo and local class version do not use exactly the same storage backend. The persistent ChromaDB implementation described above is the version that fulfills the class vector-database requirement.

### Search and useful actions

The app does more than return a list of nearest neighbors. A user can:

- search jobs in normal language
- inspect a matching role and its source information
- save a job
- track it as Saved, Applied, Interview, Rejected, Offer, or Withdrawn
- add profile information or a resume to personalize recommendations
- use filters for company, location, job type, and recently opened jobs

The match labels are ranking categories, not probabilities of getting hired.

### Persistence

The local ChromaDB uses `PersistentClient`, so its index remains after the program closes and reopens. SQLite also persists the structured job records locally. The raw databases, models, resumes, tokens, and passwords are ignored by Git and are not committed to the repository.

### Important files

- `backend/main.py`: FastAPI routes, recommendations, runtime job additions, profiles, and application tracking
- `backend/vectors.py`: ChromaDB setup, chunking, embedding, persistence, and semantic search
- `backend/jobs/providers/`: Greenhouse, Lever, and Ashby job-source adapters
- `backend/jobs/refresh.py` and `refresh_jobs.py`: job importing and lifecycle updates
- `frontend/src/main.jsx`: main frontend interface
- `companies.json`: configured local public job boards
- `prompt_log.md`: AI tools, development process, and verbatim prompts
- `DEMO.md`: demo checklist

### AI usage

I used OpenAI Codex for a large part of the implementation and code changes. I used ChatGPT to help plan changes, compare the project to the assignment requirements, debug problems I found while testing, and make fixes to the GitHub/Supabase version near the deadline

### References

- ChromaDB documentation: https://docs.trychroma.com/
- FastAPI documentation: https://fastapi.tiangolo.com/
- Vite documentation: https://vite.dev/
- Supabase documentation: https://supabase.com/docs
