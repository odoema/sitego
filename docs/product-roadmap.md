# SiteGo product plan

## Version 0.5 — local-first publisher MVP

**Beachhead:** independent web builders and small studios that keep several client or portfolio sites in local folders.

- Connect a local folder and remember the name, GitHub repository, branch, and live URL.
- Show changed files before publishing.
- Flag common credential filenames and token patterns; block flagged files from publish.
- Require a native confirmation, create a commit for only the selected files, and push without force.
- Distinguish push success, GitHub workflow success, and an HTTP response from the expected HTTPS URL.
- Keep site configuration and project files local; no product telemetry by default.

## Version 0.6 — production trust

- Add GitHub App authorization with narrowly scoped access for private repositories and deployment status.
- Add a preview workflow, staged/unstaged conflict handling, deployment history, and reversible rollback.
- Improve preflight checks for missing entry pages, broken local references, oversized files, and host-specific configuration.
- Add Windows installer signing, update channel, crash-safe configuration backups, and accessible keyboard operation.

## Version 0.7 — host adapters and AI handoff

- Add a host adapter contract; prioritize GitHub Pages, then validate demand for Cloudflare Pages and Netlify.
- Let AI clients ask SiteGo to inspect status and prepare a publish preview. Require direct user confirmation before any production publish.
- Use MCP as an optional adapter, not a hard dependency of the desktop app.

## Version 1 — opt-in SiteGo gallery

- List live demos, source repositories, owner-approved previews, licenses, compatible destinations, and a one-click “Deploy your copy” action.
- Begin with curated free templates and open-source projects. Do not execute downloaded project code inside SiteGo.
- Validate discovery and repeat deployments before adding paid listings, checkout, creator payouts, or a general extension marketplace.

## Success measures

- Time from folder selection to first verified deployment.
- Share of publishes that reach a verified live state without manual repair.
- Repeat publishes per connected site and per workspace.
- Number of support incidents caused by secret scans, branch drift, or host mismatch.
- Paid-pilot conversion and retention among freelancers and studios.
