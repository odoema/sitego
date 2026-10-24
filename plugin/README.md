# SiteGo Plugin

SiteGo is a local-first publishing plugin for ChatGPT/Codex. It exposes controlled Git inspection, secret scanning, selected-file publishing, GitHub Actions status, and HTTPS live-site verification through a local MCP server.

Requires Node.js 24+ and Git available on PATH.

## Repository source

The plugin lives under `plugin/` so the existing SiteGo Electron application remains intact. The desktop app and the plugin share the same safety principles: inspect before publishing, block common secret patterns, publish only selected paths, never force-push, and distinguish pushed, deployed, and verified-live states.
