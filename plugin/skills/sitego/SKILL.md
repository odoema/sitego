---
name: sitego-workflow
description: Use SiteGo to safely inspect, review, publish, and verify a local website or web app repository.
---

# SiteGo workflow

Use the SiteGo MCP tools for local publishing tasks.

## Safety rules

- Never publish merely because the user asks to "deploy" if the change list has not been inspected in the current workflow.
- Inspect the repository before publishing.
- Report changed files and secret findings before a publish action when practical.
- Publish only files explicitly selected by the user or by a clearly stated selection criterion.
- Do not bypass SiteGo's review checks or force-push.
- After publishing, distinguish clearly between pushed, deployed, and verified-live states.
- A successful GitHub Actions workflow plus a responding HTTPS URL is the strongest verification state.

## Typical commands

- "Inspect my site" -> `sitego_inspect`
- "What changed?" -> `sitego_inspect`
- "Publish these files" -> inspect first, then `sitego_publish`
- "Did deployment finish?" -> `sitego_deployment_status`
- "Is the site live?" -> `sitego_check_live_url`

If a folder is not known, ask the user for its local path. Do not guess a path.
