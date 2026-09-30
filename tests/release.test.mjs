import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const publisherPath = join(repositoryRoot, "scripts/publish-release.sh");

test("publisher requires an explicit GitHub user", () => {
  const help = execFileSync(publisherPath, ["--help"], { encoding: "utf8" });
  assert.match(help, /X\.Y\.Z --github-user USERNAME --yes/);

  const missingUser = spawnSync(publisherPath, ["0.3.0", "--yes"], {
    encoding: "utf8",
  });
  assert.equal(missingUser.status, 2);
  assert.match(missingUser.stderr, /--github-user USERNAME/);
});

test("publisher scopes remote writes to the verified GitHub credential", () => {
  const publisher = readFileSync(publisherPath, "utf8");

  assert.match(publisher, /gh auth token --hostname github\.com --user "\$github_user"/);
  assert.match(publisher, /GH_TOKEN="\$github_token" gh api user --jq \.login/);
  assert.match(publisher, /-c 'credential\.helper=!gh auth git-credential'/);
  assert.match(publisher, /git_with_github_identity push --atomic origin main/);
  assert.match(publisher, /GH_TOKEN="\$github_token" gh release create/);
});


test("release helpers accept only the renamed repository origin", () => {
  for (const helper of ["prepare-release.sh", "publish-release.sh"]) {
    const source = readFileSync(join(repositoryRoot, "scripts", helper), "utf8");
    assert.ok(source.includes('"$(git remote get-url origin)" != "https://github.com/rxreyn3/codex-plugins.git"'));
    assert.equal(source.includes("https://github.com/rxreyn3/rpiv-codex.git"), false);
  }
});
