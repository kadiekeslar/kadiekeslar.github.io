import test from "node:test";
import assert from "node:assert/strict";
import {
  SAVED_KEY,
  readSaved,
  saveRole,
  updateRole,
  mergeSaved,
  snapshot,
  jobType,
  verifiedOpen,
  cacheJobs,
  cachedFeed,
} from "../src/browser-store.js";
const storage = () => {
  const map = new Map();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, value),
  };
};
const job = {
  id: "one",
  title: "Engineer",
  company: "Example",
  description: "A complete public posting.",
  job_url: "https://example.com/jobs/1",
  status: "OPEN",
  employment_type: "FullTime",
  first_seen_at: new Date().toISOString(),
};

test("saved roles and notes survive browser reload with no account or service", () => {
  const device = storage();
  let rows = saveRole([], job);
  rows = updateRole(rows, job, "Applied", "Interview preparation");
  device.setItem(SAVED_KEY, JSON.stringify(rows));
  const afterReload = readSaved(device);
  assert.equal(afterReload[0].status, "Applied");
  assert.equal(afterReload[0].notes, "Interview preparation");
  assert.ok(afterReload[0].applied_at);
  assert.deepEqual(
    saveRole(afterReload, job),
    afterReload,
    "saving again must not regress application status",
  );
});
test("account saves can be recovered without overwriting newer device notes", () => {
  const local = updateRole([], job, "Interview", "New note");
  const remote = [
    { job, status: "Saved", notes: "Old note" },
    { job: { ...job, id: "two" }, status: "Saved", notes: "" },
  ];
  const rows = mergeSaved(local, remote);
  assert.equal(rows.length, 2);
  assert.equal(rows.find((row) => row.job.id === "one").notes, "New note");
});
test("public job snapshots never include private resume evidence", () => {
  const copy = snapshot({
    ...job,
    resume_evidence: "Private resume",
    connections: [{ resume_evidence: "private" }],
    profile: { name: "Private" },
  });
  assert.equal("resume_evidence" in copy, false);
  assert.equal("connections" in copy, false);
  assert.equal("profile" in copy, false);
});
test("provider job type aliases collapse into one user-facing label", () => {
  assert.equal(jobType("Intern"), "Internship");
  assert.equal(jobType("internship"), "Internship");
  assert.equal(jobType("FullTime"), "Full-time");
  assert.equal(jobType("Full-time"), "Full-time");
  assert.equal(jobType("full_time"), "Full-time");
});
test("cached verified status expires instead of staying true forever", () => {
  const now = Date.now();
  assert.equal(
    verifiedOpen(
      {
        ...job,
        verified_open: true,
        last_verified_at: new Date(now - 25 * 3600000).toISOString(),
      },
      now,
    ),
    false,
  );
  assert.equal(
    verifiedOpen(
      { ...job, last_verified_at: new Date(now - 3600000).toISOString() },
      now,
    ),
    true,
  );
  assert.equal(
    verifiedOpen(
      {
        ...job,
        status: "CLOSED",
        last_verified_at: new Date(now).toISOString(),
      },
      now,
    ),
    false,
  );
  assert.equal(
    verifiedOpen(
      { ...job, last_verified_at: new Date(now + 3600000).toISOString() },
      now,
    ),
    false,
  );
});
test("recently opened respects known posting dates and labels unknown dates by discovery", () => {
  const device = storage();
  cacheJobs(device, [
    job,
    {
      ...job,
      id: "old",
      date_posted: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
    { ...job, id: "closed", status: "CLOSED" },
  ]);
  const rows = cachedFeed(device, { status: "current" }, true);
  assert.deepEqual(
    rows.map((row) => row.id),
    ["one"],
  );
  assert.equal(
    cachedFeed(device, { status: "current", employment_type: "Full-time" })
      .length,
    2,
  );
});
test("corrupt browser data does not prevent opening the saved view", () => {
  const device = storage();
  device.setItem(SAVED_KEY, "not json");
  assert.deepEqual(readSaved(device), []);
});
