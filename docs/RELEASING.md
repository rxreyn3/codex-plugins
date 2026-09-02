# Release workflow

Users install the Git marketplace with `--ref main`, so pushing a plugin change to `main` publishes it. A version tag and GitHub release record what was published; they are not the publication switch.

## Version policy

Every published change under `plugins/rpiv-codex/` must have a new clean semantic version in `.codex-plugin/plugin.json`:

- patch for a compatible fix or packaging correction;
- minor for a new compatible skill or capability;
- major for a breaking contract after `1.0.0`.

Before `1.0.0`, a breaking change will normally use a minor bump. Multiple accepted skill commits may be batched into one release; one skill per candidate and one skill per release are separate choices.

Never publish a `+codex.local-*` development version.

## Prepare

Start with a clean local `main` containing `origin/main` and the accepted candidate commits you intend to release. Those commits may be merged locally or collected from reviewed branches, but must not have been pushed to public `main` without the release version:

```bash
scripts/prepare-release.sh 0.3.0
```

Preparation runs the complete test suite and Codex plugin validator before and after changing the manifest. It does not commit, tag, push, or create a release.

Review the manifest diff and commit it:

```bash
git add plugins/rpiv-codex/.codex-plugin/plugin.json
git commit -m "Release RPIV Codex 0.3.0"
```

## Publish

Publishing is deliberately separate and requires both the intended GitHub account and the explicit `--yes` flag:

```bash
scripts/publish-release.sh 0.3.0 --github-user rxreyn3 --yes
```

The script retrieves the selected account's existing credential from GitHub CLI, verifies the authenticated username, and uses that credential explicitly for Git and GitHub CLI operations. It does not change the globally active GitHub account or store a token in the repository. The selected account must already be authenticated with `gh auth login`.

After revalidating the release, the script creates an annotated tag and atomically pushes `main` and the tag. It then creates the GitHub release. If GitHub release creation fails after the atomic push, do not rewind `main` or move the tag; retry the credential-scoped command printed by the script.

## Verify the remote release

Upgrade and reinstall from the Git marketplace:

```bash
codex plugin marketplace upgrade rpiv-codex
codex plugin add rpiv-codex@rpiv-codex
```

Confirm the installed version and start a fresh task. For a release containing a new skill, run one representative invocation of that skill. Do not repeat the entire candidate acceptance suite unless the remote package differs from the accepted candidate.

## Recovery

Published tags are immutable and `main` is not force-pushed. Correct a bad public release with a forward patch release. If only the GitHub release page is missing, recreate it for the existing tag rather than changing Git history.
