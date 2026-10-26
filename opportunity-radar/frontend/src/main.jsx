import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Radar,
  Compass,
  Bookmark,
  Layers,
  FileText,
  ArrowUpRight,
  ArrowRight,
  Check,
  Circle,
  RefreshCw,
  Search,
  X,
  MapPin,
  Building2,
  Radio,
  ChevronRight,
  ExternalLink,
  Sprout,
  SlidersHorizontal,
  Database,
} from "lucide-react";
import "./styles.css";

const API = (
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://127.0.0.1:8000" : "")
).replace(/\/$/, "");
const REPO =
  "https://github.com/kadiekeslar/kadiekeslar.github.io/tree/main/opportunity-radar";
const stages = [
  ["The foundation", "Frontend, API, persistent databases, and the job model."],
  [
    "The first real source",
    "Connect one company job board and retrieve open roles.",
  ],
  [
    "Keep the radar fresh",
    "Track new, updated, and closed jobs with a background refresh.",
  ],
  [
    "Search by meaning",
    "Add job embeddings and semantic search with ChromaDB.",
  ],
  [
    "Bring your experience",
    "Upload a resume and find supported connections to jobs.",
  ],
  ["Check the requirements", "Separate experience match from eligibility."],
  [
    "Decide your next move",
    "Rank opportunities into apply, prepare, save, or skip.",
  ],
  ["Make it yours", "Add accounts, profiles, and an application tracker."],
  ["Widen the radar", "Connect more job providers."],
  ["Ready for every day", "Polish the dashboard and deploy the backend."],
];

function date(value) {
  return value
    ? new Date(value).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Not listed";
}

function App() {
  const [view, setView] = useState("discover");
  const [filter, setFilter] = useState("current");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [offset, setOffset] = useState(0);
  const [filters, setFilters] = useState({
    company: "",
    location: "",
    employment_type: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [reload, setReload] = useState(0);
  const dialog = useRef(null);

  useEffect(() => {
    if (!API) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ status: filter, limit: 20, offset });
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    async function get(path) {
      const response = await fetch(`${API}${path}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      return response.json();
    }
    Promise.all([get("/health"), get("/stats"), get(`/jobs?${params}`)])
      .then(([health, stats, jobs]) => setData({ health, stats, jobs }))
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError(
            "We couldn’t reach the API. Check that the backend is running, then try again.",
          );
          setData(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filter, offset, appliedFilters, reload]);

  useEffect(() => {
    if (selected && !dialog.current.open) dialog.current.showModal();
  }, [selected]);

  const statusText = loading
    ? "Connecting to backend"
    : error
      ? "Backend unavailable"
      : data
        ? "Backend connected"
        : "Backend not connected";
  const stats = data?.stats;
  const jobs = data?.jobs.items || [];
  const isFiltered =
    filter !== "current" || Object.values(appliedFilters).some(Boolean);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="./" aria-label="Opportunity Radar home">
          <span className="brand-icon">
            <Radar size={27} />
          </span>
          <span>
            opportunity
            <span className="brand-second">
              radar<span className="brand-period">.</span>
            </span>
          </span>
        </a>
        <div className="workspace-label">YOUR NEXT CHAPTER</div>
        <nav aria-label="Main navigation">
          <button
            className={view === "discover" ? "nav active" : "nav"}
            onClick={() => setView("discover")}
          >
            <Compass size={20} />
            Discover
            <ChevronRight size={15} className="nav-chevron" />
          </button>
          <button
            className="nav"
            disabled
            title="Application tracking comes in Stage 8"
          >
            <Bookmark size={19} />
            Saved<span className="soon">SOON</span>
          </button>
          <button
            className="nav"
            disabled
            title="Application tracking comes in Stage 8"
          >
            <Layers size={19} />
            Applications<span className="soon">SOON</span>
          </button>
          <button
            className="nav"
            disabled
            title="Resume uploads come in Stage 5"
          >
            <FileText size={19} />
            My resume<span className="soon">SOON</span>
          </button>
        </nav>
        <div className="sidebar-note">
          <Sprout size={24} />
          <h3>
            A little progress.
            <br />A lot of possibility.
          </h3>
          <p>Your next opportunity starts with knowing what’s out there.</p>
          <button onClick={() => setView("roadmap")}>
            See what we’re building <ArrowUpRight size={16} />
          </button>
        </div>
        <div className="sidebar-footer">
          <span className="avatar">OR</span>
          <div>
            Built for your next move
            <small>College careers, thoughtfully.</small>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <div>
            Workspace <ChevronRight size={14} />
            <span>{view === "discover" ? "Discover" : "Build roadmap"}</span>
          </div>
          <a href="https://kadiekeslar.github.io/">
            Kadie’s projects <ArrowUpRight size={15} />
          </a>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">A CLEARER PATH FORWARD</div>
              <h1>
                {view === "discover"
                  ? "Find your next direction."
                  : "Good things take a foundation."}
              </h1>
              <p>
                {view === "discover"
                  ? "Fresh opportunities. Thoughtful matches. Your next move, all in one place."
                  : "One useful, verifiable step at a time. Here’s where Opportunity Radar is headed."}
              </p>
            </div>
            <span className="stage-pill">
              <span />
              STAGE 01 · FOUNDATION
            </span>
          </div>

          {view === "roadmap" ? (
            <section className="roadmap panel">
              <div className="section-heading">
                <div>
                  <h2>The build roadmap</h2>
                  <p>Stage 1 is ready to verify. Later stages are planned.</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => setView("discover")}
                >
                  Back to discover <ArrowRight size={16} />
                </button>
              </div>
              {stages.map(([title, description], i) => (
                <div className="roadmap-row" key={title}>
                  <span
                    className={i === 0 ? "step-number current" : "step-number"}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                  <span className="roadmap-label">
                    {i === 0 ? "READY TO VERIFY" : "PLANNED"}
                  </span>
                </div>
              ))}
            </section>
          ) : (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <span className="hero-tag">
                    <Radio size={14} /> YOUR RADAR, TAKING SHAPE
                  </span>
                  <h2>
                    Less searching.
                    <br />
                    More possibility.
                  </h2>
                  <p>
                    Know what’s open, understand what fits,
                    <br className="desktop-break" /> and make your next move
                    with confidence.
                  </p>
                  <button
                    className="light-button"
                    onClick={() =>
                      document
                        .getElementById("opportunities")
                        .scrollIntoView({ behavior: "smooth" })
                    }
                  >
                    Explore your radar <ArrowRight size={17} />
                  </button>
                </div>
                <div className="radar-art" aria-hidden="true">
                  <div className="radar-axis horizontal" />
                  <div className="radar-axis vertical" />
                  <div className="radar-ring ring-one" />
                  <div className="radar-ring ring-two" />
                  <div className="radar-ring ring-three" />
                  <div className="radar-sweep" />
                  <span className="radar-center" />
                  <span className="radar-dot dot-one" />
                  <span className="radar-dot dot-two" />
                  <span className="radar-dot dot-three" />
                  <span className="radar-caption">LOOKING AHEAD, ALWAYS.</span>
                </div>
              </section>

              <section className="stats" aria-label="Job database statistics">
                {[
                  [
                    Radio,
                    "Verified open",
                    stats?.verified_open,
                    "Checked within 24 hours",
                  ],
                  [
                    Sprout,
                    "Discovered today",
                    stats?.new_today,
                    "New since midnight UTC",
                  ],
                  [
                    Building2,
                    "Connected sources",
                    data?.health.sources_connected,
                    "First source in Stage 2",
                  ],
                ].map(([Icon, label, value, caption]) => (
                  <div className="stat" key={label}>
                    <div className="stat-label">
                      <span>{label}</span>
                      <Icon size={18} />
                    </div>
                    <strong>{value ?? "—"}</strong>
                    <small>{caption}</small>
                  </div>
                ))}
              </section>

              <div className="content-columns">
                <section id="opportunities" className="feed panel">
                  <div className="section-heading">
                    <div>
                      <h2>
                        Your opportunity feed{" "}
                        <span className="count">{data?.jobs.total ?? 0}</span>
                      </h2>
                      <p>
                        Real roles, with their source and freshness in view.
                      </p>
                    </div>
                    <button
                      className="icon-button"
                      aria-label="Reload job database"
                      disabled={loading || !API}
                      onClick={() => setReload((x) => x + 1)}
                    >
                      <RefreshCw
                        size={17}
                        className={loading ? "spinning" : ""}
                      />
                    </button>
                  </div>
                  <div className="feed-toolbar">
                    <div className="tabs" aria-label="Job status filters">
                      {[
                        ["current", "All current"],
                        ["NEW", "New"],
                        ["CLOSED", "Closed history"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          aria-pressed={filter === key}
                          className={filter === key ? "selected" : ""}
                          onClick={() => {
                            setFilter(key);
                            setOffset(0);
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      className={
                        "icon-button " + (showFilters ? "selected" : "")
                      }
                      aria-expanded={showFilters}
                      aria-label="Toggle exact filters"
                      onClick={() => setShowFilters((x) => !x)}
                    >
                      <SlidersHorizontal size={17} />
                    </button>
                  </div>
                  {showFilters && (
                    <form
                      className="filters"
                      onSubmit={(event) => {
                        event.preventDefault();
                        setAppliedFilters({ ...filters });
                        setOffset(0);
                      }}
                    >
                      <p>Exact filters · semantic search comes in Stage 4.</p>
                      {[
                        ["company", "Company"],
                        ["location", "Location"],
                        ["employment_type", "Employment type"],
                      ].map(([key, label]) => (
                        <label key={key}>
                          {label}
                          <input
                            value={filters[key]}
                            onChange={(event) =>
                              setFilters({
                                ...filters,
                                [key]: event.target.value,
                              })
                            }
                            placeholder={`Exact ${label.toLowerCase()}`}
                          />
                        </label>
                      ))}
                      <button className="primary-button" type="submit">
                        Apply filters
                      </button>
                      <button
                        className="text-button"
                        type="button"
                        onClick={() => {
                          setFilters({
                            company: "",
                            location: "",
                            employment_type: "",
                          });
                          setAppliedFilters({});
                          setOffset(0);
                        }}
                      >
                        Reset
                      </button>
                    </form>
                  )}
                  <div aria-live="polite">
                    {loading ? (
                      <div className="empty-state">
                        <RefreshCw className="spinning" size={30} />
                        <h3>Checking your database…</h3>
                        <p>
                          The website reads stored jobs.
                          <br />
                          It doesn’t contact company sites on page load.
                        </p>
                      </div>
                    ) : error ? (
                      <div className="empty-state">
                        <Database size={32} />
                        <h3>Let’s reconnect your radar.</h3>
                        <p>{error}</p>
                        <button
                          className="primary-button"
                          onClick={() => setReload((x) => x + 1)}
                        >
                          Try again
                        </button>
                      </div>
                    ) : jobs.length ? (
                      <div className="job-list">
                        {jobs.map((job) => (
                          <button
                            className="job-card"
                            key={job.id}
                            onClick={() => setSelected(job)}
                          >
                            <div className="job-company">
                              <span className="company-avatar">
                                {job.company.slice(0, 1)}
                              </span>
                              <span>
                                {job.company}
                                <small>{job.source}</small>
                              </span>
                              <span className="job-status">
                                {job.status === "CLOSED"
                                  ? "Closed"
                                  : job.verified_open
                                    ? "Verified open"
                                    : "Needs recheck"}
                              </span>
                            </div>
                            <h3>{job.title}</h3>
                            <p>
                              <MapPin size={14} />
                              {job.location || "Location not listed"}
                            </p>
                            <div className="job-bottom">
                              <span>Found {date(job.first_seen_at)}</span>
                              <ArrowUpRight size={18} />
                            </div>
                          </button>
                        ))}
                        <div className="pagination">
                          <button
                            className="text-button"
                            disabled={offset === 0}
                            onClick={() => setOffset(Math.max(0, offset - 20))}
                          >
                            Previous
                          </button>
                          <span>
                            {offset + 1}–
                            {Math.min(offset + 20, data.jobs.total)} of{" "}
                            {data.jobs.total}
                          </span>
                          <button
                            className="text-button"
                            disabled={offset + 20 >= data.jobs.total}
                            onClick={() => setOffset(offset + 20)}
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="empty-state">
                        <div className="empty-radar">
                          <Radar size={40} strokeWidth={1.2} />
                          <span />
                        </div>
                        <span className="small-label">
                          {isFiltered ? "NO RESULTS YET" : "A FRESH START"}
                        </span>
                        <h3>
                          {isFiltered
                            ? "Nothing in this view yet."
                            : "Your next chapter is on the radar."}
                        </h3>
                        <p>
                          {isFiltered
                            ? "There are no stored jobs matching these filters."
                            : "The foundation is ready. Next, we’ll connect a real job board so fresh opportunities can find their way here."}
                        </p>
                        <button
                          className="primary-button"
                          onClick={() => setView("roadmap")}
                        >
                          See the build roadmap <ArrowRight size={16} />
                        </button>
                        <small>No sample listings. No made-up matches.</small>
                      </div>
                    )}
                  </div>
                  <div className="feed-footnote">
                    <span className="status-dot" />
                    {data
                      ? "Reading from your job database"
                      : "Waiting for a connected backend"}
                    <span>Last refresh: never</span>
                  </div>
                </section>

                <aside className="right-column">
                  <section className="build-panel panel">
                    <span className="small-label">BUILT WITH INTENTION</span>
                    <h2>First, a solid foundation.</h2>
                    <p>We’re building a useful product, one stage at a time.</p>
                    <div className="check-list">
                      {[
                        "React dashboard",
                        "FastAPI & job model",
                        "SQLite & persistent ChromaDB",
                      ].map((text) => (
                        <div key={text}>
                          <span className="check-icon">
                            <Check size={12} />
                          </span>
                          {text}
                        </div>
                      ))}
                    </div>
                    <div className="next-step">
                      <span>UP NEXT · STAGE 02</span>
                      <h3>
                        Connect a real job source <ArrowUpRight size={16} />
                      </h3>
                      <p>
                        Real company postings, stored locally and ready to
                        explore.
                      </p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setView("roadmap")}
                    >
                      View all 10 stages <ArrowRight size={16} />
                    </button>
                  </section>
                  <section className="promise">
                    <div className="promise-icon">
                      <Compass size={20} />
                    </div>
                    <h3>Clarity over guesswork.</h3>
                    <p>
                      Match and eligibility stay separate. Unknowns stay
                      unknown. Every opportunity links back to its source.
                    </p>
                  </section>
                </aside>
              </div>
            </>
          )}
          <footer className="page-footer">
            <span>
              Opportunity Radar <span className="footer-dot">/</span> Your
              future, a little clearer.
            </span>
            <span className="backend-status">
              <span className={data ? "status-dot connected" : "status-dot"} />
              {statusText}
            </span>
            <a href={`${REPO}#readme`} target="_blank" rel="noreferrer">
              Project guide <ArrowUpRight size={13} />
            </a>
          </footer>
        </main>
      </div>

      <dialog
        ref={dialog}
        onCancel={() => setSelected(null)}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <button
              className="close-dialog icon-button"
              aria-label="Close job details"
              onClick={() => dialog.current.close()}
            >
              <X size={22} />
            </button>
            <div className="eyebrow">
              {selected.company} · {selected.source}
            </div>
            <h2>{selected.title}</h2>
            <p>
              <MapPin size={15} /> {selected.location || "Location not listed"}
            </p>
            <div className="detail-meta">
              <span>
                {selected.status === "CLOSED"
                  ? "Closed"
                  : selected.verified_open
                    ? "Verified open"
                    : "Freshness unknown — needs recheck"}
              </span>
              <span>Verified: {date(selected.last_verified_at)}</span>
              <span>Deadline: {date(selected.deadline)}</span>
              <span>Found: {date(selected.first_seen_at)}</span>
            </div>
            <div className="job-description">{selected.description}</div>
            <p className="detail-notice">
              Experience matching and eligibility checks are planned for later
              stages.
            </p>
            <a
              className="primary-button"
              href={selected.job_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {selected.status === "CLOSED"
                ? "View original posting"
                : "View on company site"}{" "}
              <ExternalLink size={15} />
            </a>
          </>
        )}
      </dialog>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
