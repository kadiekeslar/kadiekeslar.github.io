export const SAVED_KEY = "opportunity-radar:saved:v1";
export const CACHE_KEY = "opportunity-radar:recently-viewed:v1";

export function jobType(value) {
  const key = (value || "").replace(/[\s_-]/g, "").toLowerCase();
  return (
    {
      intern: "Internship",
      internship: "Internship",
      fulltime: "Full-time",
      parttime: "Part-time",
      contractor: "Contract",
      contract: "Contract",
      temporary: "Temporary",
    }[key] ||
    value ||
    ""
  );
}

export function readSaved(storage) {
  try {
    const rows = JSON.parse(storage.getItem(SAVED_KEY) || "[]");
    return Array.isArray(rows)
      ? rows.filter(
          (row) =>
            row?.job?.id &&
            typeof row.job.description === "string" &&
            typeof row.status === "string",
        )
      : [];
  } catch {
    return [];
  }
}

// Keep public posting fields only; never copy resume evidence into job snapshots.
export function snapshot(job) {
  const fields = [
    "id",
    "title",
    "company",
    "description",
    "location",
    "job_url",
    "employment_type",
    "job_category",
    "status",
    "source",
    "source_label",
    "date_posted",
    "deadline",
    "first_seen_at",
    "last_seen_at",
    "last_verified_at",
    "closed_at",
  ];
  return Object.fromEntries(fields.map((key) => [key, job[key] ?? null]));
}

export function saveRole(rows, job, now = new Date().toISOString()) {
  if (rows.some((row) => row.job.id === job.id)) return rows;
  return [
    {
      job: snapshot(job),
      status: "Saved",
      notes: "",
      saved_at: now,
      applied_at: null,
      updated_at: now,
    },
    ...rows,
  ];
}

export function updateRole(
  rows,
  job,
  status,
  notes,
  now = new Date().toISOString(),
) {
  return saveRole(rows, job, now).map((row) =>
    row.job.id !== job.id
      ? row
      : {
          ...row,
          status,
          notes: notes ?? row.notes,
          applied_at: row.applied_at || (status !== "Saved" ? now : null),
          updated_at: now,
        },
  );
}

export function mergeSaved(local, remote) {
  const result = new Map(
    remote.map((row) => [row.job.id, { ...row, job: snapshot(row.job) }]),
  );
  local.forEach((row) => result.set(row.job.id, row));
  return [...result.values()];
}

function timestamp(value) {
  if (!value) return NaN;
  return Date.parse(/[Zz]|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
}

export function verifiedOpen(job, now = Date.now()) {
  const age = now - timestamp(job.last_verified_at);
  return (
    job.status !== "CLOSED" &&
    Number.isFinite(age) &&
    age >= 0 &&
    age <= 86400000
  );
}

export function cacheJobs(storage, jobs) {
  try {
    const existing = JSON.parse(storage.getItem(CACHE_KEY) || "[]");
    const rows = new Map(
      (Array.isArray(existing) ? existing : []).map((job) => [job.id, job]),
    );
    jobs.forEach((job) => rows.set(job.id, snapshot(job)));
    storage.setItem(CACHE_KEY, JSON.stringify([...rows.values()].slice(-80)));
  } catch {
    /* A feed cache is optional; saving a role reports storage failures separately. */
  }
}

export function cachedFeed(storage, filters, recent = false) {
  try {
    const jobs = JSON.parse(storage.getItem(CACHE_KEY) || "[]");
    if (!Array.isArray(jobs)) return [];
    return jobs
      .filter((job) => {
        if (
          filters.status === "current"
            ? job.status === "CLOSED"
            : job.status !== filters.status
        )
          return false;
        if (filters.company && job.company !== filters.company) return false;
        if (
          filters.location &&
          !(job.location || "")
            .toLowerCase()
            .includes(filters.location.toLowerCase())
        )
          return false;
        if (
          filters.employment_type &&
          jobType(job.employment_type) !== filters.employment_type
        )
          return false;
        if (
          filters.student &&
          !/intern|new grad|early career|university|graduate|entry.level/i.test(
            job.title,
          )
        )
          return false;
        if (
          filters.days &&
          timestamp(job.first_seen_at) <
            Date.now() - Number(filters.days) * 86400000
        )
          return false;
        if (
          recent &&
          (job.status === "CLOSED" ||
            !Number.isFinite(timestamp(job.date_posted || job.first_seen_at)) ||
            timestamp(job.date_posted || job.first_seen_at) > Date.now() ||
            timestamp(job.date_posted || job.first_seen_at) <
              Date.now() - 7 * 86400000)
        )
          return false;
        return true;
      })
      .sort(
        (a, b) =>
          timestamp(
            recent ? b.date_posted || b.first_seen_at : b.first_seen_at,
          ) -
          timestamp(
            recent ? a.date_posted || a.first_seen_at : a.first_seen_at,
          ),
      );
  } catch {
    return [];
  }
}
