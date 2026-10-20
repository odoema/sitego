'use strict';

const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');

function git(cwd, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile('git', args, {
      cwd,
      windowsHide: true,
      timeout: options.timeout || 30000,
      maxBuffer: 8 * 1024 * 1024,
      encoding: 'utf8',
    }, (error, stdout, stderr) => {
      if (error) {
        const detail = (stderr || error.message || 'Git command failed').trim();
        reject(new Error(detail));
        return;
      }
      resolve(stdout);
    });
  });
}

function parseStatus(output) {
  const fields = output.split('\0');
  const files = [];
  for (let i = 0; i < fields.length; i += 1) {
    const entry = fields[i];
    if (!entry) continue;
    const code = entry.slice(0, 2);
    let file = entry.slice(3);
    const relatedPaths = [];
    if (code.includes('R') || code.includes('C')) {
      const source = fields[i + 1];
      if (source) {
        relatedPaths.push(source);
        i += 1;
      }
    }
    files.push({ path: file, relatedPaths, code, status: describeStatus(code) });
  }
  return files;
}

function describeStatus(code) {
  if (code === '??') return 'New file';
  if (code.includes('D')) return 'Deleted';
  if (code.includes('R')) return 'Renamed';
  if (code.includes('A')) return 'Added';
  if (code.includes('M')) return 'Modified';
  return 'Changed';
}

function repoFromRemote(remote) {
  const value = remote.trim();
  const ssh = value.match(/^(?:git@|ssh:\/\/git@)github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/i);
  const https = value.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
  const match = ssh || https;
  return match ? `${match[1]}/${match[2]}` : null;
}

function isInside(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function secretFinding(relativePath, source) {
  const base = path.basename(relativePath).toLowerCase();
  if (/^(\.env($|\.)|id_rsa$|id_ed25519$|credentials\.json$)/i.test(base)) {
    return 'Sensitive filename';
  }
  if (/\.(pem|key|p12|pfx)$/i.test(base)) return 'Private key or certificate file';
  if (source.includes('\0')) return null;
  const patterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bAKIA[0-9A-Z]{16}\b/,
    /\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}\b/,
    /\b(?:sk_live|rk_live)_[A-Za-z0-9]{16,}\b/,
    /(?:api[_-]?key|client[_-]?secret|password|access[_-]?token)\s*[:=]\s*["'][^"'\r\n]{12,}["']/i,
  ];
  return patterns.some((pattern) => pattern.test(source)) ? 'Possible secret in file' : null;
}

async function inspectRepository(folder) {
  const top = await git(folder, ['rev-parse', '--show-toplevel']);
  const root = await fs.realpath(top.trim());
  const [branchOutput, headOutput, remoteOutput, statusOutput] = await Promise.all([
    git(root, ['branch', '--show-current']),
    git(root, ['rev-parse', 'HEAD']),
    git(root, ['remote', 'get-url', 'origin']),
    git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']),
  ]);
  const files = parseStatus(statusOutput);
  const findings = [];
  for (const file of files) {
    if (file.status === 'Deleted') continue;
    const absolute = path.resolve(root, file.path);
    if (!isInside(root, absolute)) {
      findings.push({ path: file.path, level: 'block', issue: 'Path leaves the project folder' });
      continue;
    }
    try {
      const info = await fs.lstat(absolute);
      if (info.isSymbolicLink() || !info.isFile() || info.size > 2 * 1024 * 1024) continue;
      const content = await fs.readFile(absolute, 'utf8');
      const issue = secretFinding(file.path, content);
      if (issue) findings.push({ path: file.path, level: 'block', issue });
    } catch {
      // Missing or unreadable files remain visible in the change list. They are not scanned.
    }
  }
  const remote = remoteOutput.trim();
  return {
    root,
    branch: branchOutput.trim(),
    head: headOutput.trim(),
    remote,
    repository: repoFromRemote(remote),
    files,
    findings,
  };
}

async function stagedPaths(root) {
  const output = await git(root, ['diff', '--cached', '--name-only', '-z']);
  return output.split('\0').filter(Boolean);
}

async function commitAndPush(site, selectedPaths, note) {
  const current = await inspectRepository(site.folder);
  if (current.head !== site.expectedHead) throw new Error('The repository changed after review. Refresh the change list before publishing.');
  if (current.branch !== site.branch) throw new Error('The current branch changed after review. Refresh before publishing.');
  if (!current.repository) throw new Error('SiteGo MVP can publish GitHub repositories only.');
  if (current.repository !== site.repository) throw new Error(`The GitHub remote changed from ${site.repository} to ${current.repository}. Reconnect the site before publishing.`);
  const block = current.findings.filter((finding) => selectedPaths.includes(finding.path));
  if (block.length) throw new Error(`Remove sensitive file(s) before publishing: ${block.map((item) => item.path).join(', ')}`);
  const changed = new Set(current.files.map((file) => file.path));
  if (!selectedPaths.length || selectedPaths.some((file) => !changed.has(file))) {
    throw new Error('The selected files no longer match the reviewed change list. Refresh and review again.');
  }
  const staged = await stagedPaths(current.root);
  if (staged.length) throw new Error('There are already staged changes. Commit or unstage them, then review again so SiteGo cannot include unrelated work.');

  const relatedPaths = current.files.filter((file) => selectedPaths.includes(file.path)).flatMap((file) => file.relatedPaths || []);
  const pathspec = [...new Set([...selectedPaths, ...relatedPaths])];
  await git(current.root, ['add', '--', ...pathspec]);
  try {
    await git(current.root, ['commit', '-m', note.trim().slice(0, 120) || `Publish ${site.name}`, '--only', '--', ...pathspec], { timeout: 120000 });
  } catch (error) {
    await git(current.root, ['reset', '--', ...pathspec]).catch(() => {});
    throw new Error(`Could not create the publish commit. Review Git's message and retry. ${error.message}`);
  }
  const sha = (await git(current.root, ['rev-parse', 'HEAD'])).trim();
  try {
    await git(current.root, ['push', 'origin', current.branch], { timeout: 180000 });
  } catch (error) {
    throw new Error(`The local commit ${sha.slice(0, 7)} was created, but push failed. Your changes remain in the local repository. ${error.message}`);
  }
  return { sha, repository: current.repository, branch: current.branch };
}

async function waitForDeployment(repository, sha, siteUrl) {
  const apiUrl = `https://api.github.com/repos/${repository}/actions/runs?head_sha=${encodeURIComponent(sha)}&per_page=20`;
  const deadline = Date.now() + 120000;
  let last = 'Checking GitHub Actions';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(apiUrl, { headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
      if (response.ok) {
        const payload = await response.json();
        const run = (payload.workflow_runs || []).find((item) => item.head_sha === sha);
        if (run) {
          last = run.status === 'completed' ? (run.conclusion === 'success' ? 'Deployment workflow succeeded' : `Deployment workflow ${run.conclusion || 'failed'}`) : `Deployment workflow ${run.status}`;
          if (run.status === 'completed' && run.conclusion !== 'success') return { state: 'failed', detail: last, runUrl: run.html_url };
          if (run.status === 'completed' && run.conclusion === 'success') {
            const live = await checkLiveUrl(siteUrl);
            return { state: live.ok ? 'verified' : 'deployed', detail: live.ok ? 'GitHub workflow succeeded and the live URL responded.' : `GitHub workflow succeeded. Live URL check: ${live.detail}`, runUrl: run.html_url, liveUrl: siteUrl };
          }
        } else {
          last = 'Waiting for a workflow run for this commit';
        }
      } else if (response.status === 404) {
        last = 'GitHub could not provide public workflow status. The push succeeded, but SiteGo cannot confirm deployment yet.';
        break;
      } else {
        last = `GitHub Actions status unavailable (${response.status})`;
      }
    } catch {
      last = 'Could not reach GitHub Actions to confirm deployment.';
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  return { state: 'unconfirmed', detail: `${last}. The commit was pushed, but SiteGo has not confirmed that the new version is live.`, liveUrl: siteUrl };
}

async function checkLiveUrl(siteUrl) {
  if (!siteUrl) return { ok: false, detail: 'Add the expected live URL to enable this check.' };
  let url;
  try { url = new URL(siteUrl); } catch { return { ok: false, detail: 'The live URL is invalid.' }; }
  if (url.protocol !== 'https:') return { ok: false, detail: 'Only HTTPS live URLs are checked.' };
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(12000) });
    return { ok: response.ok, detail: `The URL returned HTTP ${response.status}.` };
  } catch {
    return { ok: false, detail: 'The live URL did not respond.' };
  }
}

module.exports = { git, inspectRepository, commitAndPush, waitForDeployment, checkLiveUrl };
