import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Radar,
  Search,
  MapPin,
  Bookmark,
  ArrowUpRight,
  ArrowRight,
  X,
  Check,
  ChevronDown,
  SlidersHorizontal,
  Upload,
  Plus,
  Settings,
  RefreshCw,
  BriefcaseBusiness,
  CircleHelp,
  FileText,
  Building2,
  ExternalLink,
  LogOut,
  Sparkles,
} from "lucide-react";
import "./styles.css";

const REPO =
  "https://github.com/kadiekeslar/kadiekeslar.github.io/tree/main/opportunity-radar";
const statuses = [
  "Saved",
  "Applied",
  "Interview",
  "Rejected",
  "Offer",
  "Withdrawn",
];
function validAPI(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:" ||
      (u.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(u.hostname))
      ? value.replace(/\/$/, "")
      : "";
  } catch {
    return "";
  }
}
const initialAPI = validAPI(
  new URLSearchParams(location.search).get("api") ||
    import.meta.env.VITE_API_URL ||
    localStorage.getItem("radar-api") ||
    (import.meta.env.DEV ? "http://127.0.0.1:8000" : ""),
);
const tokenKey = (api) => `radar-session:${api}`;
function time(value) {
  if (!value) return "Not listed";
  return new Date(
    value.endsWith("Z") || /[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`,
  ).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}
function Modal({ title, children, close, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      className={wide ? "wide" : ""}
      ref={ref}
      onCancel={close}
      onClose={close}
    >
      <header className="modal-header">
        <h2>{title}</h2>
        <button className="icon" onClick={close} aria-label="Close dialog">
          <X size={22} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
function App() {
  const [api, setApi] = useState(initialAPI);
  const [token, setToken] = useState(
    sessionStorage.getItem(tokenKey(initialAPI)) || "",
  );
  const [user, setUser] = useState(null);
  const [view, setView] = useState("discover");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [filters, setFilters] = useState({
    company: "",
    location: "",
    employment_type: "",
    status: "current",
    student: false,
    days: "",
  });
  const [page, setPage] = useState(0);
  const [responseData, setData] = useState(null);
  const [health, setHealth] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [modal, setModal] = useState("");
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState("");
  const [mobileFilters, setMobileFilters] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [sources, setSources] = useState([]);
  const [profile, setProfile] = useState({});
  const [resumeResult, setResumeResult] = useState(null);
  const [newSinceVisit, setNewSinceVisit] = useState(null);

  async function request(path, options = {}) {
    if (!api) throw new Error("Connect your backend to use this feature.");
    const response = await fetch(api + path, {
      signal: AbortSignal.timeout(60000),
      ...options,
      headers: {
        ...(options.body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
      throw new Error(
        typeof body.detail === "string"
          ? body.detail
          : `Request failed (${response.status}). Check the fields and try again.`,
      );
    return body;
  }
  function notify(message) {
    setToast(message);
  }
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    setPage(0);
  }, [view, search, filters]);
  useEffect(() => {
    if (!api) {
      setHealth(null);
      setData(null);
      return;
    }
    let current = true;
    Promise.all([request("/health"), request("/stats")])
      .then(([h, s]) => {
        if (current) {
          setHealth(h);
          setStats(s);
        }
      })
      .catch(() => {
        if (current) setHealth(null);
      });
    return () => {
      current = false;
    };
  }, [api, refresh]);
  useEffect(() => {
    if (!token || !api) {
      setUser(null);
      return;
    }
    let current = true;
    request("/me")
      .then((u) => {
        if (current) {
          setUser(u);
          setProfile(u.profile);
        }
      })
      .catch(() => {
        if (current) {
          setUser(null);
          setToken("");
          sessionStorage.removeItem(tokenKey(api));
        }
      });
    return () => {
      current = false;
    };
  }, [api, token]);
  useEffect(() => {
    if (
      !api ||
      (["matches", "applications", "profile"].includes(view) && !token)
    ) {
      setData(null);
      return;
    }
    if (view === "profile") return;
    let current = true;
    setBusy(true);
    setError("");
    const params = new URLSearchParams({ limit: 20, offset: page * 20 });
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== false) params.set(key, value);
    });
    if (search) params.set("q", search);
    const endpoint =
      view === "matches"
        ? "/recommendations"
        : view === "applications"
          ? "/applications"
          : view === "opening"
            ? "/opening-soon"
            : `/jobs?${params}`;
    request(endpoint)
      .then((result) => {
        if (current) setData({ ...result, view });
      })
      .catch((err) => {
        if (current) {
          setData(null);
          setError(err.message);
        }
      })
      .finally(() => {
        if (current) setBusy(false);
      });
    return () => {
      current = false;
    };
  }, [api, view, search, filters, page, refresh, token]);

  async function action(work) {
    setSaving(true);
    try {
      await work();
    } catch (err) {
      notify(err.message);
    } finally {
      setSaving(false);
    }
  }
  function loginGate() {
    if (!api) {
      setModal("connect");
      return false;
    }
    if (!user) {
      setModal("auth");
      return false;
    }
    return true;
  }
  async function save(job) {
    if (!loginGate()) return;
    await action(async () => {
      await request(`/jobs/${job.id}/save`, { method: "POST" });
      notify("Saved to your applications.");
      setRefresh((x) => x + 1);
    });
  }
  async function openJob(job) {
    await action(async () => {
      const result = await request(`/jobs/${job.id}`);
      setDetail(result);
      setModal("detail");
    });
  }
  function doSearch(event) {
    event?.preventDefault();
    setSearch(q);
    setFilters((f) => ({ ...f, location: locationInput }));
    setPage(0);
    setView("discover");
  }
  function shortcut(text, student = false) {
    setQ(text);
    setSearch(text);
    setFilters((f) => ({ ...f, student }));
    setView("discover");
  }
  async function changeStatus(job, status, notes) {
    await action(async () => {
      await request(`/jobs/${job.id}/status`, {
        method: "POST",
        body: JSON.stringify({ status, notes }),
      });
      notify("Application updated.");
      setRefresh((x) => x + 1);
    });
  }
  const connected = !!health;
  const data = responseData?.view === view ? responseData : null;
  const items = data?.items || [];
  const needsAccount =
    ["matches", "applications", "profile"].includes(view) && !user;
  const titles = {
    discover: "Find your next opportunity.",
    matches: "Your experience. New possibilities.",
    applications: "Every next step, in one place.",
    profile: "Bring your experience to the search.",
    opening: "Get ready for what’s next.",
  };

  return (
    <>
      <header className="site-header">
        <a className="logo" href="./">
          <Radar size={28} />
          <span>
            <strong>Opportunity</strong> Radar
          </span>
        </a>
        <nav aria-label="Main navigation">
          {[
            ["discover", "Find opportunities"],
            ["matches", "For you"],
            ["opening", "Opening soon"],
            ["applications", "Applications"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="icon"
            title="Backend connection"
            aria-label="Backend connection"
            onClick={() => setModal("connect")}
          >
            <Settings size={20} />
          </button>
          <button
            className={user ? "account-button" : "outline-button"}
            onClick={() =>
              user
                ? setView("profile")
                : api
                  ? setModal("auth")
                  : setModal("connect")
            }
          >
            {user ? user.profile.name || "My profile" : "Sign in"}
          </button>
        </div>
      </header>
      <main>
        <section className="intro">
          <div className="intro-meta">
            <span className="tiny-radar" /> YOUR NEXT CHAPTER STARTS HERE
          </div>
          <h1>
            {view === "discover" ? (
              <>
                Find your next <span>opportunity.</span>
              </>
            ) : (
              titles[view]
            )}
          </h1>
          <p>
            {view === "discover"
              ? "Explore real roles. Discover where your experience could take you."
              : view === "matches"
                ? "Connections grounded in your resume, with eligibility checked separately."
                : view === "applications"
                  ? "Keep track of the roles you saved, the steps you took, and what comes next."
                  : view === "profile"
                    ? "Your resume stays on the backend you connect. No external AI API is used."
                    : "Confirmed dates and historical expectations stay clearly separate."}
          </p>
          {view === "discover" && (
            <>
              <form className="search-bar" onSubmit={doSearch}>
                <label>
                  <Search size={23} />
                  <span className="sr-only">What do you want to do?</span>
                  <input
                    aria-label="What do you want to do?"
                    placeholder="What do you want to do? Describe it in your own words."
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </label>
                <label className="location-search">
                  <MapPin size={21} />
                  <span className="sr-only">Where?</span>
                  <input
                    aria-label="Where?"
                    placeholder="Where?"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                  />
                </label>
                <button className="blue-button" type="submit">
                  Search <ArrowRight size={18} />
                </button>
              </form>
              <div className="suggestions">
                <span>A few places to start</span>
                <button onClick={() => shortcut("", true)}>
                  Students & early careers
                </button>
                <button
                  onClick={() =>
                    shortcut(
                      "understand customer needs and shape product direction",
                    )
                  }
                >
                  Product & people
                </button>
                <button
                  onClick={() =>
                    shortcut(
                      "build reliable software and solve technical problems",
                    )
                  }
                >
                  Engineering
                </button>
                <button
                  onClick={() =>
                    shortcut("observe how people use interactive interfaces")
                  }
                >
                  Design & research
                </button>
              </div>
            </>
          )}
        </section>
        {!api && (
          <section className="connection-banner">
            <div>
              <strong>Your frontend is ready. Connect the job engine.</strong>
              <p>
                Run the included backend locally, or connect a hosted API, to
                search the real job database.
              </p>
            </div>
            <button
              className="outline-button"
              onClick={() => setModal("connect")}
            >
              Connect backend <ArrowUpRight size={16} />
            </button>
          </section>
        )}
        {api && (
          <div className="live-strip">
            <span>
              <i className={connected ? "live-dot" : "live-dot offline"} />
              {connected
                ? `${stats?.current?.toLocaleString() ?? "—"} current opportunities`
                : "Connecting to job engine"}
            </span>
            <span>{stats?.new_today ?? "—"} discovered today (UTC)</span>
            <button
              onClick={() =>
                action(async () => {
                  setSources(await request("/sources"));
                  setModal("sources");
                })
              }
            >
              {health?.sources_connected ?? 0} company boards{" "}
              <ArrowUpRight size={13} />
            </button>
            <span className="last-refresh">
              Verified{" "}
              {health?.last_refresh_at
                ? time(health.last_refresh_at)
                : "not yet"}
            </span>
          </div>
        )}
        {newSinceVisit !== null && (
          <p className="visit-note">
            Welcome back. {newSinceVisit} opportunities appeared since your last
            sign-in.
          </p>
        )}
        {view === "discover" && (
          <div className="search-layout">
            <aside className={"filters " + (mobileFilters ? "expanded" : "")}>
              <div className="filter-heading">
                <h2>Refine your search</h2>
                <button
                  onClick={() => {
                    setFilters({
                      company: "",
                      location: "",
                      employment_type: "",
                      status: "current",
                      student: false,
                      days: "",
                    });
                    setLocationInput("");
                    setQ("");
                    setSearch("");
                  }}
                >
                  Clear
                </button>
              </div>
              <label className="student-toggle">
                <input
                  type="checkbox"
                  checked={filters.student}
                  onChange={(e) =>
                    setFilters({ ...filters, student: e.target.checked })
                  }
                />
                Students & early careers
              </label>
              <p className="filter-help">
                Uses title signals, not an eligibility guarantee.
              </p>
              <details open>
                <summary>
                  Locations <ChevronDown size={17} />
                </summary>
                <input
                  aria-label="Filter locations"
                  placeholder="City, country, or remote"
                  value={filters.location}
                  onChange={(e) => {
                    setFilters({ ...filters, location: e.target.value });
                    setLocationInput(e.target.value);
                  }}
                />
              </details>
              <details open>
                <summary>
                  Companies <ChevronDown size={17} />
                </summary>
                <select
                  aria-label="Company"
                  value={filters.company}
                  onChange={(e) =>
                    setFilters({ ...filters, company: e.target.value })
                  }
                >
                  <option value="">All companies</option>
                  {stats?.companies?.map((company) => (
                    <option key={company}>{company}</option>
                  ))}
                </select>
              </details>
              <details open>
                <summary>
                  Job types <ChevronDown size={17} />
                </summary>
                <select
                  aria-label="Job type"
                  value={filters.employment_type}
                  onChange={(e) =>
                    setFilters({ ...filters, employment_type: e.target.value })
                  }
                >
                  <option value="">All types</option>
                  <option>Internship</option>
                  <option>Intern</option>
                  <option>FullTime</option>
                  <option>Full-time</option>
                </select>
              </details>
              <details open>
                <summary>
                  Posting status <ChevronDown size={17} />
                </summary>
                {[
                  ["current", "All current"],
                  ["NEW", "Newly discovered"],
                  ["CLOSED", "Closed history"],
                ].map(([id, label]) => (
                  <label className="radio-label" key={id}>
                    <input
                      type="radio"
                      name="status"
                      checked={filters.status === id}
                      onChange={() => setFilters({ ...filters, status: id })}
                    />
                    {label}
                  </label>
                ))}
              </details>
              <details>
                <summary>
                  Discovered <ChevronDown size={17} />
                </summary>
                <select
                  aria-label="Discovered within"
                  value={filters.days}
                  onChange={(e) =>
                    setFilters({ ...filters, days: e.target.value })
                  }
                >
                  <option value="">Any time</option>
                  <option value="1">Past 24 hours</option>
                  <option value="7">Past week</option>
                  <option value="30">Past month</option>
                </select>
              </details>
              <div className="filter-note">
                <Sparkles size={19} />
                <strong>Go beyond a job title.</strong>
                <p>
                  Try “turn conversations with customers into better products.”
                  Search finds related passages by meaning.
                </p>
              </div>
            </aside>
            <section className="results">
              <div className="results-heading">
                <div>
                  <h2>
                    {data
                      ? `${data.total.toLocaleString()} ${search ? "semantic matches" : "opportunities"}`
                      : "Explore opportunities"}
                  </h2>
                  <span>
                    {search
                      ? "Ranked by meaning · up to 100 results"
                      : "Newest discoveries first"}
                  </span>
                </div>
                <div className="result-actions">
                  <button
                    className="mobile-filter icon"
                    aria-label="Show filters"
                    onClick={() => setMobileFilters(!mobileFilters)}
                  >
                    <SlidersHorizontal size={20} />
                  </button>
                  <button
                    className="text-button"
                    onClick={() => loginGate() && setModal("add")}
                  >
                    <Plus size={17} />
                    Add a role
                  </button>
                  <button
                    className="icon"
                    aria-label="Reload stored jobs"
                    onClick={() => setRefresh((x) => x + 1)}
                  >
                    <RefreshCw size={17} />
                  </button>
                </div>
              </div>
              {busy ? (
                <Loading />
              ) : error ? (
                <Empty
                  title="We couldn’t load the opportunities."
                  text={error}
                  action="Try again"
                  onClick={() => setRefresh((x) => x + 1)}
                />
              ) : !items.length ? (
                <Empty
                  title={
                    api
                      ? "No opportunities match these filters."
                      : "A world of possibilities, ready to explore."
                  }
                  text={
                    api
                      ? "Try a broader description or adjust the filters."
                      : "Connect the backend to browse real jobs and search by meaning."
                  }
                  action={api ? "Clear search" : "Connect backend"}
                  onClick={() => (api ? shortcut("") : setModal("connect"))}
                />
              ) : (
                items.map((job) => (
                  <JobCard key={job.id} job={job} save={save} open={openJob} />
                ))
              )}
              {data?.total > 20 && (
                <div className="pagination">
                  <button
                    className="outline-button"
                    disabled={!page}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    {page * 20 + 1}–{Math.min(page * 20 + 20, data.total)} of{" "}
                    {data.total}
                  </span>
                  <button
                    className="outline-button"
                    disabled={(page + 1) * 20 >= data.total}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
              <div className="results-footer">
                <Check size={16} /> Original company links. No hiring
                probabilities. Freshness always visible.
              </div>
            </section>
          </div>
        )}
        {needsAccount && (
          <Empty
            title="Make this search yours."
            text="Create an account to keep your resume, profile, and application tracker together."
            action="Sign in or create account"
            onClick={() => (api ? setModal("auth") : setModal("connect"))}
          />
        )}
        {view === "matches" && user && (
          <section className="content-page">
            {busy ? (
              <Loading />
            ) : error ? (
              <Empty
                title="Start with your experience."
                text={error}
                action="Upload my resume"
                onClick={() => setView("profile")}
              />
            ) : (
              <>
                <div className="section-row">
                  <h2>What could you apply to next?</h2>
                  <span>{data?.total ?? 0} resume-based matches</span>
                </div>
                <p className="muted">
                  Recommendations exclude closed jobs and postings not verified
                  within 24 hours. “Save” means review first; “Apply now”
                  requires checked eligibility.
                </p>
                {!!data?.explore?.length && (
                  <div className="explore-careers">
                    <Sparkles size={20} />
                    <div>
                      <strong>Discover directions beyond your search</strong>
                      <p>
                        Your resume connects to roles in{" "}
                        {data.explore.slice(0, 5).join(", ")}.
                      </p>
                    </div>
                  </div>
                )}
                {items.map((job) => (
                  <JobCard key={job.id} job={job} save={save} open={openJob} />
                ))}
                {!items.length && (
                  <Empty
                    title="No sufficiently relevant, freshly verified matches yet."
                    text="Try refreshing the job corpus or adding more detail to your resume."
                  />
                )}
              </>
            )}
          </section>
        )}
        {view === "applications" && user && (
          <section className="content-page">
            {busy ? (
              <Loading />
            ) : error ? (
              <Empty title="Tracker unavailable" text={error} />
            ) : (
              <>
                <div className="tracker-counts">
                  {["Saved", "Applied", "Interview", "Offer"].map((status) => (
                    <div key={status}>
                      <strong>{data?.counts?.[status] ?? 0}</strong>
                      <span>{status}</span>
                    </div>
                  ))}
                </div>
                {items.map((item) => (
                  <article className="tracker-card" key={item.job.id}>
                    <div>
                      <button
                        className="job-title"
                        onClick={() => openJob(item.job)}
                      >
                        {item.job.title}
                      </button>
                      <p>
                        {item.job.company} · Saved {time(item.saved_at)}
                        {item.applied_at &&
                          ` · Applied ${time(item.applied_at)}`}
                      </p>
                      {item.job.status === "CLOSED" && (
                        <span className="badge">Original posting closed</span>
                      )}
                    </div>
                    <label>
                      Status
                      <select
                        aria-label={`Status for ${item.job.title}`}
                        value={item.status}
                        disabled={saving}
                        onChange={(e) =>
                          changeStatus(item.job, e.target.value, item.notes)
                        }
                      >
                        {statuses.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <label className="notes">
                      Notes
                      <textarea
                        aria-label={`Notes for ${item.job.title}`}
                        defaultValue={item.notes}
                        placeholder="Next steps, contacts, interview dates…"
                        onBlur={(e) => {
                          if (e.target.value !== item.notes)
                            changeStatus(item.job, item.status, e.target.value);
                        }}
                      />
                    </label>
                  </article>
                ))}
                {!items.length && (
                  <Empty
                    title="Your next steps will live here."
                    text="Save an opportunity or update its status to start your tracker."
                    action="Find opportunities"
                    onClick={() => setView("discover")}
                  />
                )}
              </>
            )}
          </section>
        )}
        {view === "profile" && user && (
          <section className="profile-layout">
            <form
              className="form-panel"
              onSubmit={(e) => {
                e.preventDefault();
                action(async () => {
                  const u = await request("/me", {
                    method: "PUT",
                    body: JSON.stringify(profile),
                  });
                  setUser(u);
                  notify("Profile saved.");
                });
              }}
            >
              <h2>Your profile</h2>
              <p className="muted">
                Fill in what you’re comfortable sharing. Unknowns stay unknown.
              </p>
              {[
                ["name", "Name"],
                ["school", "School"],
                ["major", "Major"],
                ["preferred_roles", "Preferred roles"],
                ["preferred_locations", "Preferred locations"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    value={profile[key] || ""}
                    maxLength={
                      key === "name"
                        ? 120
                        : key === "school" || key === "major"
                          ? 200
                          : 500
                    }
                    onChange={(e) =>
                      setProfile({ ...profile, [key]: e.target.value })
                    }
                  />
                </label>
              ))}
              <div className="form-columns">
                <label>
                  Graduation date
                  <input
                    type="date"
                    value={profile.graduation_date || ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        graduation_date: e.target.value || null,
                      })
                    }
                  />
                </label>
                <label>
                  Years of experience
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={profile.years_experience ?? ""}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        years_experience:
                          e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </label>
              </div>
              <label>
                Will you need visa sponsorship? (optional)
                <select
                  value={
                    profile.needs_sponsorship === null ||
                    profile.needs_sponsorship === undefined
                      ? ""
                      : String(profile.needs_sponsorship)
                  }
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      needs_sponsorship:
                        e.target.value === ""
                          ? null
                          : e.target.value === "true",
                    })
                  }
                >
                  <option value="">Prefer not to say / unknown</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </label>
              <button className="blue-button" disabled={saving}>
                Save profile
              </button>
            </form>
            <div>
              <section className="form-panel resume-panel">
                <div className="resume-icon">
                  <FileText size={32} />
                </div>
                <h2>Your experience, in your words.</h2>
                <p>
                  Upload a PDF or plain text resume. We extract and embed the
                  text locally on your connected backend. We never invent
                  experience.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const file = e.currentTarget.elements.resume.files[0];
                    if (!file) return;
                    action(async () => {
                      const form = new FormData();
                      form.append("file", file);
                      const result = await request("/resume", {
                        method: "POST",
                        body: form,
                      });
                      setResumeResult(result);
                      setUser({ ...user, has_resume: true });
                      notify("Resume indexed. Your matches are ready.");
                    });
                  }}
                >
                  <label className="upload-zone">
                    <Upload size={24} />
                    <span>
                      {user.has_resume
                        ? "Replace your resume"
                        : "Choose your resume"}
                    </span>
                    <input
                      name="resume"
                      type="file"
                      accept=".pdf,.txt"
                      required
                    />
                    <small>
                      PDF or UTF-8 text · 5 MB maximum · no scanned PDFs
                    </small>
                  </label>
                  <button className="blue-button" disabled={saving}>
                    {saving ? "Processing…" : "Upload & find connections"}
                  </button>
                </form>
                {user.has_resume && (
                  <div className="resume-actions">
                    <button
                      className="text-button"
                      onClick={() => setView("matches")}
                    >
                      See my matches <ArrowRight size={16} />
                    </button>
                    <button
                      className="text-button danger"
                      onClick={() =>
                        action(async () => {
                          await request("/resume", { method: "DELETE" });
                          setUser({ ...user, has_resume: false });
                          setResumeResult(null);
                          notify("Resume text and vectors deleted.");
                        })
                      }
                    >
                      Delete resume
                    </button>
                  </div>
                )}
                {resumeResult && (
                  <div className="resume-preview">
                    <strong>
                      {resumeResult.chunks} searchable chunks created
                    </strong>
                    {resumeResult.sections.map((section, i) => (
                      <details key={i}>
                        <summary>{section.section}</summary>
                        <pre>{section.text}</pre>
                      </details>
                    ))}
                  </div>
                )}
              </section>
              <button
                className="text-button logout"
                onClick={() =>
                  action(async () => {
                    await request("/auth/logout", { method: "POST" });
                    sessionStorage.removeItem(tokenKey(api));
                    setToken("");
                    setUser(null);
                    notify("Signed out.");
                  })
                }
              >
                <LogOut size={17} />
                Sign out
              </button>
            </div>
          </section>
        )}
        {view === "opening" && (
          <section className="content-page">
            <div className="opening-explainer">
              <div>
                <span className="badge green">Confirmed opening</span>
                <h3>A date backed by a source.</h3>
                <p>
                  Applications open on a published date. We link to the
                  evidence.
                </p>
              </div>
              <div>
                <span className="badge amber">Expected opening</span>
                <h3>A historical pattern, clearly labeled.</h3>
                <p>
                  A recruiting-cycle prediction, never presented as a confirmed
                  date.
                </p>
              </div>
            </div>
            {items.length ? (
              items.map((item, i) => (
                <article className="job-card" key={i}>
                  <span className="badge">
                    {item.kind === "EXPECTED"
                      ? "Prediction — not confirmed"
                      : "Confirmed by source"}
                  </span>
                  <h2>{item.title}</h2>
                  <p>
                    {item.company} · {item.date_label}
                  </p>
                  <blockquote>{item.evidence}</blockquote>
                  <a
                    className="text-button"
                    href={item.source_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Check source <ExternalLink size={15} />
                  </a>
                  <span className="badge">PREPARE</span>
                </article>
              ))
            ) : (
              <Empty
                title="No opening dates have been verified yet."
                text="We’re retaining posting history for future recruiting-cycle insights. We won’t invent a date to fill this page."
                action="Browse current roles"
                onClick={() => setView("discover")}
              />
            )}
          </section>
        )}
      </main>
      <footer className="site-footer">
        <a className="logo" href="./">
          <Radar size={22} />
          <span>Opportunity Radar</span>
        </a>
        <p>For the next chapter. Built by Kadie Keslar.</p>
        <a href={`${REPO}#readme`} target="_blank" rel="noreferrer">
          How it works <ArrowUpRight size={14} />
        </a>
        <button onClick={() => setModal("connect")}>
          {connected ? "Backend connected" : "Connect backend"}
          <i className={connected ? "live-dot" : "live-dot offline"} />
        </button>
      </footer>
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button
            className="icon"
            aria-label="Dismiss message"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {saving && (
        <div className="working" role="status">
          Working…
        </div>
      )}
      {modal === "connect" && (
        <Modal title="Connect your job engine" close={() => setModal("")}>
          <p className="muted">
            GitHub Pages serves the interface. The Python backend stores jobs,
            runs semantic search, and keeps your account data.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const value = validAPI(e.currentTarget.elements.api.value.trim());
              if (!value) {
                notify(
                  "Use HTTPS for a hosted backend, or http://127.0.0.1:8000 locally.",
                );
                return;
              }
              localStorage.setItem("radar-api", value);
              setApi(value);
              setToken(sessionStorage.getItem(tokenKey(value)) || "");
              setRefresh((x) => x + 1);
              setModal("");
            }}
          >
            <label>
              Backend URL
              <input
                name="api"
                type="url"
                defaultValue={api || "http://127.0.0.1:8000"}
                required
              />
            </label>
            <button className="blue-button">
              Connect backend <ArrowRight size={17} />
            </button>
          </form>
          <p className="muted">
            For local use, run <code>./start.sh</code> from the project folder,
            then connect to <code>http://127.0.0.1:8000</code>. Your browser
            must be on the same computer.
          </p>
          <a
            className="text-button"
            href={`${REPO}#run-it`}
            target="_blank"
            rel="noreferrer"
          >
            Setup and hosting instructions <ExternalLink size={15} />
          </a>
        </Modal>
      )}
      {modal === "auth" && (
        <Modal
          title={
            authMode === "login" ? "Welcome back." : "Start your next chapter."
          }
          close={() => setModal("")}
        >
          <p className="muted">
            Your account belongs to the backend you connected. No email
            integration or email verification is used.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              action(async () => {
                const result = await request(
                  `/auth/${authMode === "login" ? "login" : "register"}`,
                  {
                    method: "POST",
                    body: JSON.stringify(Object.fromEntries(form)),
                  },
                );
                sessionStorage.setItem(tokenKey(api), result.token);
                setToken(result.token);
                setUser(result.user);
                setProfile(result.user.profile);
                setNewSinceVisit(result.new_since_visit ?? null);
                setModal("");
                notify(
                  authMode === "login" ? "Signed in." : "Account created.",
                );
              });
            }}
          >
            <label>
              Email
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength="254"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                autoComplete={
                  authMode === "login" ? "current-password" : "new-password"
                }
                minLength="10"
                maxLength="256"
                required
              />
            </label>
            <button className="blue-button" disabled={saving}>
              {authMode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>
          <button
            className="text-button modal-switch"
            onClick={() =>
              setAuthMode(authMode === "login" ? "register" : "login")
            }
          >
            {authMode === "login"
              ? "New here? Create an account"
              : "Already have an account? Sign in"}
          </button>
        </Modal>
      )}
      {modal === "add" && (
        <Modal title="Add an opportunity" close={() => setModal("")}>
          <p className="muted">
            Add a public job posting you found. Its description becomes
            searchable immediately. User-supplied roles remain unverified until
            an official source confirms them. Do not paste private information.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const body = Object.fromEntries(new FormData(e.currentTarget));
              action(async () => {
                const result = await request("/jobs/import", {
                  method: "POST",
                  body: JSON.stringify(body),
                });
                setModal("");
                setRefresh((x) => x + 1);
                notify(
                  result.duplicate
                    ? "That original URL is already in the database."
                    : "Opportunity added and indexed. Try a semantic search for it.",
                );
              });
            }}
          >
            {[
              ["title", "Job title"],
              ["company", "Company"],
              ["location", "Location"],
              ["employment_type", "Employment type"],
              ["job_url", "Original application URL"],
            ].map(([name, label]) => (
              <label key={name}>
                {label}
                <input
                  name={name}
                  type={name === "job_url" ? "url" : "text"}
                  required={["title", "company", "job_url"].includes(name)}
                  maxLength={
                    name === "title" || name === "location"
                      ? 500
                      : name === "employment_type"
                        ? 100
                        : name === "job_url"
                          ? 2000
                          : 255
                  }
                />
              </label>
            ))}
            <label>
              Full public job description
              <textarea
                name="description"
                minLength="80"
                maxLength="60000"
                rows="7"
                required
              />
            </label>
            <button className="blue-button" disabled={saving}>
              {saving ? "Adding & embedding…" : "Add to searchable database"}
            </button>
          </form>
        </Modal>
      )}
      {modal === "detail" && detail && (
        <Modal
          title={detail.title}
          wide
          close={() => {
            setModal("");
            setDetail(null);
          }}
        >
          <div className="detail-top">
            <span>{detail.company}</span>
            <span>
              <MapPin size={16} />
              {detail.location || "Location not listed"}
            </span>
            <Freshness job={detail} />
          </div>
          <div className="detail-actions">
            <a
              className="blue-button"
              href={detail.job_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {detail.status === "CLOSED"
                ? "Original posting"
                : "Apply on company website"}
              <ArrowUpRight size={17} />
            </a>
            <button className="outline-button" onClick={() => save(detail)}>
              <Bookmark size={17} />
              Save
            </button>
            {user && (
              <select
                aria-label="Track application status"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) changeStatus(detail, e.target.value);
                }}
              >
                <option value="" disabled>
                  Track status
                </option>
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            )}
          </div>
          <div className="detail-facts">
            <span>Found {time(detail.first_seen_at)}</span>
            <span>Last verified {time(detail.last_verified_at)}</span>
            <span>Deadline {time(detail.deadline)}</span>
            <span>Source: {detail.source_label}</span>
            {detail.closed_at && <span>Closed {time(detail.closed_at)}</span>}
          </div>
          <section className="eligibility">
            <div>
              <h3>Eligibility</h3>
              <span className="badge">{detail.eligibility.label}</span>
            </div>
            {detail.eligibility.checks.map((check, i) => (
              <p key={i}>
                <strong>{check.result}</strong> · {check.requirement}
              </p>
            ))}
            <p>{detail.eligibility.note}</p>
          </section>
          {detail.connections?.length > 0 && (
            <Evidence match={detail.connections[0]} />
          )}
          <h3>About this opportunity</h3>
          <div className="description">{detail.description}</div>
        </Modal>
      )}
      {modal === "sources" && (
        <Modal title="Source freshness" close={() => setModal("")}>
          <p className="muted">
            Source collection runs in a separate worker. Reloading the page only
            reads our database.
          </p>
          {sources.map((source) => (
            <div className="source-row" key={source.key}>
              <strong>{source.company}</strong>
              <span>{source.key}</span>
              <p>Last successful check: {time(source.succeeded_at)}</p>
              {source.error ? (
                <p className="error-text">
                  Last check failed: {source.error}. Earlier records are
                  retained; freshness may be stale.
                </p>
              ) : (
                <p>
                  {source.summary.found} active postings · {source.summary.new}{" "}
                  new · {source.summary.closed} closed at last refresh
                </p>
              )}
            </div>
          ))}
        </Modal>
      )}
    </>
  );
}
function Freshness({ job }) {
  return (
    <span
      className={
        "badge " +
        (job.verified_open
          ? "green"
          : job.status === "CLOSED"
            ? "gray"
            : "amber")
      }
    >
      {job.status === "CLOSED"
        ? "Closed"
        : job.verified_open
          ? "Verified open"
          : "Needs verification"}
    </span>
  );
}
function Loading() {
  return (
    <div className="empty">
      <RefreshCw className="spin" size={28} />
      <h2>Finding possibilities…</h2>
      <p>Searching your persistent job database.</p>
    </div>
  );
}
function Empty({ title, text, action, onClick }) {
  return (
    <div className="empty">
      <div className="empty-symbol">
        <Search size={28} />
      </div>
      <h2>{title}</h2>
      <p>{text}</p>
      {action && (
        <button className="outline-button" onClick={onClick}>
          {action}
          <ArrowRight size={16} />
        </button>
      )}
    </div>
  );
}
function Evidence({ match }) {
  return (
    <section className="evidence">
      <div className="evidence-heading">
        <Sparkles size={18} />
        <h3>Why this connects to you</h3>
        <span className="badge blue">{match.match}</span>
      </div>
      <div className="evidence-grid">
        <div>
          <span>YOUR RESUME · EXACT PASSAGE</span>
          <blockquote>{match.resume_evidence}</blockquote>
        </div>
        <div>
          <span>THE ROLE · EXACT PASSAGE</span>
          <blockquote>{match.evidence}</blockquote>
        </div>
      </div>
      <p>{match.connection}</p>
      <span className="badge">{match.action}</span>
    </section>
  );
}
function JobCard({ job, save, open }) {
  let excerpt = job.evidence || job.description;
  if (!job.evidence) {
    const lines = job.description
      .split("\n")
      .filter((line) => line.trim().length > 35);
    excerpt =
      lines.find((line) =>
        /experience|responsibilit|work with|looking for|you.ll/i.test(line),
      ) ||
      lines[0] ||
      job.description;
  }
  return (
    <article className="job-card">
      <div className="job-card-head">
        <div>
          <div className="company-line">
            <span className="company-mark">{job.company.slice(0, 1)}</span>
            {job.company}
            {job.status === "NEW" && <span className="new-label">NEW</span>}
          </div>
          <button className="job-title" onClick={() => open(job)}>
            {job.title}
          </button>
        </div>
        <button
          className="icon save-icon"
          aria-label={`Save ${job.title}`}
          onClick={() => save(job)}
        >
          <Bookmark size={21} />
        </button>
      </div>
      <div className="job-meta">
        <span>
          <MapPin size={16} />
          {job.location || "Location not listed"}
        </span>
        {job.employment_type && (
          <span>
            <BriefcaseBusiness size={16} />
            {job.employment_type}
          </span>
        )}
        <Freshness job={job} />
      </div>
      {job.match && (
        <div className="match-row">
          <span className="badge blue">
            <Sparkles size={12} />
            {job.match}
          </span>
          {job.action && <span className="badge">{job.action}</span>}
          {job.eligibility && (
            <span className="eligibility-tag">
              Eligibility: {job.eligibility.label}
            </span>
          )}
        </div>
      )}
      <h3>{job.evidence ? "A relevant passage" : "From the posting"}</h3>
      <p className="card-excerpt">
        {excerpt.slice(0, 370)}
        {excerpt.length > 370 ? "…" : ""}
      </p>
      <div className="card-bottom">
        <span>
          Found {time(job.first_seen_at)} · {job.source_label}
        </span>
        <button className="text-button" onClick={() => open(job)}>
          Learn more <ArrowRight size={17} />
        </button>
      </div>
    </article>
  );
}
createRoot(document.getElementById("root")).render(<App />);
