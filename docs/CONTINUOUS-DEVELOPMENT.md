# SiteGo Continuous Development Plan

## Product north star

Make SiteGo the safest simple path from a local website change to a verified live deployment.

## Release tracks

### 0.2.x — Hardening
- Validate plugin packaging on Windows.
- Expand automated MCP protocol tests.
- Improve secret detection and false-positive handling.
- Add deployment diagnostics and retry guidance.
- Add golden test repositories for GitHub Pages.

### 0.3.x — Better publishing UX
- Add preview/diff summaries before publish.
- Add selectable deployment targets.
- Support custom live URLs and common hosting patterns.
- Add rollback guidance and deployment history.

### 0.4.x — Cross-platform distribution
- Windows installer first.
- macOS and Linux packaging.
- Versioned releases and checksums.
- Automated update notifications.

### 0.5.x — Ecosystem
- Public ChatGPT/Codex plugin-directory submission.
- VS Code integration.
- GitHub Action/helper for standard deployment verification.
- Documentation and examples for agencies, students, NGOs and small businesses.

### 1.0 — Trustworthy publishing platform
- Stable API/tool contracts.
- Security review.
- Privacy and support documentation.
- Strong automated regression suite.
- Clear verified-live deployment state.

## Continuous engineering loop

Every change follows:

`Issue → Design → Implement → Test → Security check → Deploy → Verify → Document → Release`

## Quality gates

A release is not complete until:

1. MCP initialize/list/call tests pass.
2. Windows local Git path is tested.
3. Secret-scan regression tests pass.
4. No force-push path exists.
5. GitHub Actions deployment succeeds on the SiteGo demo site.
6. The expected HTTPS URL responds.
7. Plugin metadata and version are aligned.
8. README/changelog/documentation are updated.

## Product feedback loop

Collect real-world feedback from early users and turn repeated failures into tests before adding more features. Prefer small, reversible releases over large rewrites.
