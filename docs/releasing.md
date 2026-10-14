# Releasing

This page is for maintainers. It explains how a version reaches npm and what to set
up once.

SinterDB publishes three packages: `sinterdb-protocol`, `sinterdb` (the driver),
and `@sinterdb/cli` (the server). They share one version. Pushing a tag such as
`v0.1.0` runs [`release.yml`](../.github/workflows/release.yml), which checks,
packs, publishes, and creates a GitHub release. There is no npm token: npm
trusts the workflow through
[trusted publishing](https://docs.npmjs.com/trusted-publishers), and every
version is published with provenance.

A release goes out under the npm tag `latest`, so a plain `npm install sinterdb`
gets it. `release:publish` refuses to publish a prerelease version such as
`0.3.0-rc.1` under `latest`; use `--tag next` for those.

## Releasing a version

1. Describe the change with `pnpm changeset` in the pull request that makes it.
   Choose `minor` for a breaking change in `0.x` and `patch` for anything else.
2. When you are ready to release, on a branch run `pnpm version-packages`. It
   applies the changesets: package versions, changelogs, and the
   `fixed` group keep the six versioned packages on one version.
3. Then update what changesets cannot:
   - the `version` in the root `package.json`,
   - `DRIVER_PRODUCT_VERSION` in `packages/driver/src/client.ts` and
     `SERVER_PRODUCT_VERSION` in `packages/server/src/command-dispatcher.ts`,
   - the release notes in `docs/releases/<version>.md`,
   - any "Version x provides" text in the READMEs.
4. Run `pnpm release:check --release`. It lists everything that still disagrees
   about the version.
5. Run `pnpm all`, then `pnpm release:rehearse`. The rehearsal packs the three
   packages, checks what is inside, installs the tarballs into empty folders,
   follows the [quick start](./quick-start.md) with them, kills the server, and
   recovers the data. It uses no registry, so it works before anything is
   published. The same rehearsal also runs in `pnpm test`. To see what npm would
   receive without uploading anything, run
   `pnpm release:publish --dir release --version 0.1.0 --dry-run` after
   `pnpm release:rehearse --out release`.
6. Merge the pull request. Then tag the merge commit and push the tag:

   ```bash
   git switch main && git pull
   git tag v0.1.0
   git push origin v0.1.0
   ```

7. Watch the **Release** workflow. It runs the checks again, uploads the
   tarballs it tested, publishes those exact files, confirms that the `latest` tag
   points at the new version, and creates a GitHub release marked as a
   prerelease.

If the workflow stops after publishing some packages, run it again from the
Actions tab. A version that is already on npm is skipped, so the run continues
with the rest.

## One-time setup

Do this once, before the first release.

### 1. Make sure you own the names

The packages are `sinterdb`, `sinterdb-protocol`, and `@sinterdb/cli` (in the
`sinterdb` npm organization). Check that you can publish to the organization and
that your account has two-factor authentication turned on.

### 2. Create the `npm` environment on GitHub

In the repository, open Settings, then Environments, and create an environment
named `npm`. Add yourself under **Required reviewers**. The publish job waits
for your approval, so a stray tag cannot publish by itself. Also consider a tag
protection rule for `v*` so only maintainers can create version tags.

### 3. Tell npm to trust the workflow

On npmjs.com, open each of the three packages, then Settings, then **Trusted
Publisher**, choose **GitHub Actions**, and enter:

| Field                | Value                      |
| -------------------- | -------------------------- |
| Organization or user | `SinterDB`                 |
| Repository           | `sinterdb`                 |
| Workflow filename    | `release.yml`              |
| Environment name     | `npm`                      |
| Allowed actions      | tick **Allow npm publish** |

The workflow filename is the name of the file, not a path. npm does not check
the settings when you save them, so a typo only shows up when the workflow
publishes. A new configuration also expires if it has not been used to publish
within two days, so set it up shortly before you push the first tag.

**Tick "Allow npm publish".** It is off by default. Without it the publisher
may only use staged publishing: npm accepts the publish, exits successfully, and
holds the package until a maintainer approves it with two-factor authentication.
The workflow then reports that the version is not public. Either tick the box,
or approve each staged package by hand (see below). You cannot edit a
configuration, so delete it and create it again to change this.

npm accepts a trusted publisher for a package name that is not published yet,
and creates an empty `0.0.0-stage` stub for it. If it does not, create the
package with a throwaway placeholder version first, then configure it. Do not
publish `0.1.0` by hand: a version can only be published once, and the one you
publish from your own computer has no provenance. Run this once, signed in with
`npm login`:

```bash
for name in sinterdb-protocol sinterdb @sinterdb/cli; do
  dir=$(mktemp -d)
  (
    cd "$dir"
    npm init -y > /dev/null
    npm pkg set name="$name" version=0.0.1 license=Apache-2.0 \
      description="Placeholder while the first SinterDB release is prepared." \
      repository.type=git \
      repository.url="git+https://github.com/SinterDB/sinterdb.git"
    npm publish --access public --tag placeholder
  )
done
```

Then add the trusted publishers above and push the first tag. Prefer this to
putting an npm token into GitHub.

### 4. Check the result

After the first tag, open each package on npmjs.com. The version page shows a
**Provenance** badge that links to the workflow run and commit. npm may also
point `latest` at the first version of a brand-new package, whatever tag it was
published under. Then:

```bash
npm view sinterdb dist-tags
npm install --global @sinterdb/cli
sinterd --version
```

## Moving a tag by hand

A version is normally tagged by the workflow. To move a tag yourself, for
example to roll `latest` back to an earlier version, run this for each package,
with two-factor authentication:

```bash
npm dist-tag add sinterdb-protocol@0.2.0 latest
npm dist-tag add sinterdb@0.2.0 latest
npm dist-tag add @sinterdb/cli@0.2.0 latest
```

## When something goes wrong

- **The publish job fails with `E404` or `ENEEDAUTH`.** npm did not recognise
  the workflow. Compare the trusted publisher settings with the table above,
  and check that `repository.url` in each `package.json` is exactly
  `git+https://github.com/SinterDB/sinterdb.git`.
- **The publish step says a version "is not public".** npm accepted the publish
  but did not make the version visible. Nearly always the trusted publisher
  allows staged publishing only, so the package is waiting for your approval:
  open the package on npmjs.com, go to the **Staged Packages** tab, and approve
  it (or run `npm stage list` and `npm stage approve <id>`; both ask for
  two-factor authentication). A staged publish may not keep the `latest` tag, so
  afterwards check `npm view sinterdb dist-tags` and, if needed, run
  `npm dist-tag add sinterdb@0.1.0 latest`. To avoid the approval next time,
  recreate the trusted publisher with **Allow npm publish** ticked.
- **The publish step says a version is public but the tag is wrong.** Run the
  `npm dist-tag add` command it prints.
- **The check job fails.** Read its list. Each line names the file and what it
  should say.
- **A version was published by mistake.** npm does not allow publishing the same
  version twice. Publish a patch version and deprecate the bad one with
  `npm deprecate sinterdb@0.1.0 "Use 0.1.1"`.
