import { cp, rm } from "node:fs/promises";

// Copy only built public files; never expose Python source or local databases.
// Paths are relative to this script so running it elsewhere remains safe.
const project = new URL("../../", import.meta.url);
const dist = new URL("../dist/", import.meta.url);
await rm(new URL("assets/", project), { recursive: true, force: true });
await cp(new URL("assets/", dist), new URL("assets/", project), {
  recursive: true,
});
await cp(new URL("index.html", dist), new URL("index.html", project));
console.log(
  "Published frontend build to opportunity-radar/index.html and assets/.",
);
