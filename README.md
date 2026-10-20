# SiteGo

**The local-first publisher for websites and web apps.**

Copyright © 2026 Brian Odoch Emmanuel, Uganda. All rights reserved. See [COPYRIGHT.md](COPYRIGHT.md), [LICENSE](LICENSE), and [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).

## What this version is

SiteGo connects the folders you already work in to their GitHub repositories. It shows local changes, flags common secret patterns, and uses your single Publish click as approval to commit only the selected files, push without force, and report GitHub Actions and live-URL evidence separately.

This is an early Windows-oriented desktop MVP. It is not yet a finished commercial publisher or app store. The app catalog is a later phase, after publishing is reliable and users ask for reusable projects. See [the product plan](docs/product-roadmap.md).

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

## Legal documents

The proprietary notice records the owner's stated claim. Privacy and terms documents are drafts for review and must not be treated as final consumer-facing policies. The code does not grant rights to third-party dependencies.
