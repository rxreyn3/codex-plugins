# Release workflow

Users install the Git marketplace with `--ref main`, so pushing a plugin change to `main` publishes it. A version tag and GitHub release record what was published; they are not the publication switch.

## Version policy

Each plugin has its own clean semantic version in its `.codex-plugin/plugin.json`. Every published plugin change requires a new version:

- patch for a compatible fix or packaging correction;
- minor for a new compatible skill or capability;
- major for a breaking contract after `1.0.0`.

Before `1.0.0`, a breaking change will normally use a minor bump. Multiple accepted skill commits may be batched into one release; one skill per candidate and one skill per release are separate choices.

Never publish a `+codex.local-*` development version.

The workflow plugin uses tags `vX.Y.Z`; Advisor uses `codex-advisor-vX.Y.Z`. The release helpers below operate only on the workflow plugin and expect `origin` to be `https://github.com/rxreyn3/codex-plugins.git`. Advisor releases require their own manifest update, packaging validation, tag, and GitHub release.

## Prepare

The commands below illustrate a workflow-only release; choose an unused version. The coordinated marketplace migration uses the separate sequence below.

Start with a clean local `main` containing `origin/main` and the accepted candidate commits you intend to release. Those commits may be merged locally or collected from reviewed branches, but must not have been pushed to public `main` without the release version:

```bash
scripts/prepare-release.sh 0.6.4
```

Preparation runs the complete test suite and Codex plugin validator before and after changing the manifest. It does not commit, tag, push, or create a release.

Review the manifest diff and commit it:

```bash
git add plugins/rpiv-codex/.codex-plugin/plugin.json
git commit -m "Release RPIV Codex 0.6.4"
```

## Publish

Publishing is deliberately separate and requires both the intended GitHub account and the explicit `--yes` flag:

```bash
scripts/publish-release.sh 0.6.4 --github-user rxreyn3 --yes
```

The script retrieves the selected account's existing credential from GitHub CLI, verifies the authenticated username, and uses that credential explicitly for Git and GitHub CLI operations. It does not change the globally active GitHub account or store a token in the repository. The selected account must already be authenticated with `gh auth login`.

After revalidating the release, the script creates an annotated tag and atomically pushes `main` and the tag. It then creates the GitHub release. If GitHub release creation fails after the atomic push, do not rewind `main` or move the tag; retry the credential-scoped command printed by the script.

## Coordinated marketplace migration release

The marketplace rename is released as RPIV Codex `0.6.3` and Codex Advisor `0.1.2`. Check that both versions and tags are unused before preparing the migration. Update both manifests and the catalog documentation, validate both packages, then create one migration commit. Rename the GitHub repository and verify the new `origin` and remote ancestry before publication.

Tag the same migration commit with `v0.6.3` and `codex-advisor-v0.1.2`, then push `main` and both tags atomically using the verified `rxreyn3` credential. The workflow-only publishing helper does not publish both tags together; use the same credential-scoped Git approach for this coordinated push. Create a separate GitHub release for each plugin with the [marketplace migration instructions](../README.md#migrate-from-the-previous-marketplace-names), and mark the workflow release as the repository's latest release. Verify that both remote tags resolve to the migration commit.

If release creation fails after the push, leave the published commit and tags intact and retry only the missing GitHub release creation. Install and verify both public replacements before removing old installations or marketplace registrations.

## Verify the remote release

Upgrade and reinstall from the Git marketplace:

```bash
codex plugin marketplace upgrade ryan-codex
codex plugin add rpiv-codex@ryan-codex
codex plugin add codex-advisor@ryan-codex  # when releasing or using Advisor
```

Confirm the installed version and start a fresh task. For a release containing a new skill, run one representative invocation of that skill. Do not repeat the entire candidate acceptance suite unless the remote package differs from the accepted candidate.

## Recovery

Published tags are immutable and `main` is not force-pushed. Correct a bad public release with a forward patch release. If only the GitHub release page is missing, recreate it for the existing tag rather than changing Git history.
