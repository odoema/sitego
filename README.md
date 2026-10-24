# SiteGo

**The local-first publisher for websites and web apps.**

Copyright © 2026 Brian Odoch Emmanuel, Uganda. All rights reserved. See [COPYRIGHT.md](COPYRIGHT.md), [LICENSE](LICENSE), and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## What this version is

SiteGo connects the folders you already work in to their GitHub repositories. It shows local changes, flags common secret patterns, and uses your single Publish action as approval to commit only the selected files, push without force, wait for deployment evidence, and verify the live HTTPS result.

SiteGo has now completed a real Windows end-to-end publishing test against the `odoema/sitego` repository. The test used a controlled file change and verified the complete path from local inspection through GitHub Actions to a live HTTPS response.

### Verified end-to-end test

**Status: verified — October 25, 2026**

The tested flow was:

1. Inspect a real local Git repository.
2. Detect the explicitly selected new file.
3. Run the secret scan — no findings.
4. Publish only the selected file.
5. Commit and push to GitHub without force-pushing.
6. Wait for GitHub Actions deployment evidence.
7. Verify the live HTTPS URL.

Evidence from the test:

- Repository: `odoema/sitego`
- Branch: `main`
- Published commit: `24d661dba007583c3ef66f3ec52df796d65170e4`
- GitHub Actions run: [#40142265234](https://github.com/odoema/sitego/actions/runs/40142265234)
- Live URL: `https://odoema.github.io/sitego/`
- Live response: **HTTP 200**
- Final SiteGo state: **verified**

This matters because SiteGo does not treat a successful Git push as proof that a website is live. Its deployment verification is a separate step.

## The simpler publishing model

SiteGo 0.2.1 makes the common path simpler: **Publish waits for deployment verification by default.** Instead of returning immediately with a `pending` result and requiring another status check, the publisher can wait for GitHub Actions to appear and finish, then check the live HTTPS URL.

The default maximum wait is 120 seconds, configurable up to 300 seconds. Advanced callers can disable the wait when they need an immediate result.

The goal is simple: **inspect → approve → publish → verify**.

## Run from source

Requirements: Node.js 24+ and Git installed and available as `git` on `PATH`.

```powershell
npm install
npm start
```

## Current publishing boundaries

- The target must be a local Git repository with an `origin` on GitHub.
- Publishing uses the user's configured Git credential helper. SiteGo does not request a personal access token.
- The first version supports public GitHub Actions status lookups only. Private-repository status may remain unconfirmed until a narrowly scoped GitHub App integration is added.
- A green GitHub workflow plus a responding HTTPS address is reported as verified. A push alone is never described as a completed deployment.
- SiteGo's secret scan is a guardrail, not a guarantee. Review every file before publishing.
- GitHub Pages has restrictions on use as free hosting for commercial sites. SiteGo must guide users to an appropriate host when their site falls outside those terms.

## Product direction

Start with solo builders and small web studios managing several sites. Make publishing safe and provable, then add a curated gallery where creators share deployable copies of their web apps. Detailed market and technology assumptions belong in the research notes before launch; current product scope is in [the roadmap](docs/product-roadmap.md).

The next usability goal is to make the verified path feel almost automatic: one clear review screen, safer defaults, plain-English deployment status, and a short recovery path when something fails.

## Legal documents

The proprietary notice records the owner's stated claim. Privacy and terms documents are drafts for review and must not be treated as final consumer-facing policies. The code does not grant rights to third-party dependencies.
