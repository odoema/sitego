# SiteGo privacy notice — draft for legal review

**Status: product draft, not a final legal notice.** Confirm the operating entity, contact address, retention periods, hosting providers, and applicable Ugandan and international privacy requirements before public release.

## Current prototype behavior

- Site names, local folder paths, expected live URLs, and timestamps are stored in a JSON file in the operating-system application-data folder on the user's device.
- Site files are read locally for Git status and a limited pattern scan. SiteGo does not send those files to a SiteGo-operated server in this prototype.
- A publish action invokes the locally installed Git client and uses the user's configured Git credential helper to push to GitHub.
- For public repositories, the app requests GitHub's public Actions API to look up the workflow run associated with the pushed commit. It may request the user-entered HTTPS live URL to check whether it responds.
- The prototype has no SiteGo telemetry, analytics, or advertising code.

## Before commercial release

Document data categories, legal bases, subprocessors, international transfers, retention and deletion, user rights, incident response, support contact, and the difference between information stored locally and information transmitted to GitHub or a website host. Add controls for private-repository authorization before claiming private deployment verification.
