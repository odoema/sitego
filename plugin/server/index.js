'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { execFile } = require('node:child_process');

function send(message) { process.stdout.write(JSON.stringify(message) + '\n'); }
function ok(id, result) { send({ jsonrpc: '2.0', id, result }); }
function err(id, code, message) { send({ jsonrpc: '2.0', id, error: { code, message } }); }

function runGit(cwd, args, timeout = 30000) {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd, windowsHide: true, timeout, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) return reject(new Error((stderr || error.message || 'Git command failed').trim()));
      resolve(stdout);
    });
  });
}

function repoFromRemote(remote) {
  const value = remote.trim();
  const ssh = value.match(/^(?:git@|ssh:\/\/git@)github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/i);
  const https = value.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
  const m = ssh || https;
  return m ? `${m[1]}/${m[2]}` : null;
}

function describeStatus(code) {
  if (code === '??') return 'New file';
  if (code.includes('D')) return 'Deleted';
  if (code.includes('R')) return 'Renamed';
  if (code.includes('A')) return 'Added';
  if (code.includes('M')) return 'Modified';
  return 'Changed';
}

function parseStatus(output) {
  const fields = output.split('\0');
  const files = [];
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (!field) continue;
    const code = field.slice(0, 2);
    let file = field.slice(3);
    if (code.includes('R') || code.includes('C')) {
      const next = fields[++i] || '';
      files.push({ path: next, relatedPaths: [file], code, status: describeStatus(code) });
    } else {
      files.push({ path: file, relatedPaths: [], code, status: describeStatus(code) });
    }
  }
  return files;
}

const SECRET_PATTERNS = [
  { name: 'Private key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: 'GitHub token', regex: /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/ },
  { name: 'Generic API key', regex: /\b(?:api[_-]?key|secret|token)\s*[:=]\s*['\"][A-Za-z0-9_\-]{20,}['\"]/i },
  { name: 'AWS access key', regex: /\bAKIA[0-9A-Z]{16}\b/ }
];

async function scanSecrets(root, files) {
  const findings = [];
  for (const file of files) {
    if (file.status === 'Deleted') continue;
    const full = path.join(root, file.path);
    try {
      const stat = await fs.stat(full);
      if (!stat.isFile() || stat.size > 2 * 1024 * 1024) continue;
      const text = await fs.readFile(full, 'utf8');
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(text)) findings.push({ path: file.path, type: pattern.name });
      }
    } catch {}
  }
  return findings;
}

async function inspect(folder) {
  const root = path.resolve(folder);
  const branch = (await runGit(root, ['branch', '--show-current'])).trim();
  const remoteUrl = (await runGit(root, ['remote', 'get-url', 'origin'])).trim();
  const repository = repoFromRemote(remoteUrl);
  const head = (await runGit(root, ['rev-parse', 'HEAD'])).trim();
  const status = await runGit(root, ['status', '--short', '-z']);
  const files = parseStatus(status);
  const findings = await scanSecrets(root, files);
  return { root, branch, head, remote: remoteUrl, repository, files, findings };
}

async function liveCheck(siteUrl) {
  let url;
  try { url = new URL(siteUrl); } catch { return { ok: false, detail: 'Invalid URL.' }; }
  if (url.protocol !== 'https:') return { ok: false, detail: 'Only HTTPS URLs are checked.' };
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(12000) });
    return { ok: response.ok, status: response.status, detail: `The URL returned HTTP ${response.status}.` };
  } catch { return { ok: false, detail: 'The live URL did not respond.' }; }
}

async function deployment(repository, sha, liveUrl) {
  const api = `https://api.github.com/repos/${repository}/actions/runs?head_sha=${encodeURIComponent(sha)}&per_page=20`;
  try {
    const response = await fetch(api, { headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' } });
    if (!response.ok) return { state: 'unconfirmed', detail: `GitHub Actions status unavailable (${response.status}).` };
    const payload = await response.json();
    const run = (payload.workflow_runs || []).find(x => x.head_sha === sha);
    if (!run) return { state: 'pending', detail: 'No workflow run found yet for this commit.' };
    if (run.status !== 'completed') return { state: 'running', detail: `Workflow is ${run.status}.`, runUrl: run.html_url };
    if (run.conclusion !== 'success') return { state: 'failed', detail: `Workflow concluded ${run.conclusion || 'without a conclusion'}.`, runUrl: run.html_url };
    const live = await liveCheck(liveUrl);
    return { state: live.ok ? 'verified' : 'deployed', detail: live.ok ? 'Workflow succeeded and the live URL responded.' : `Workflow succeeded. ${live.detail}`, runUrl: run.html_url, live };
  } catch { return { state: 'unconfirmed', detail: 'Could not reach GitHub Actions.' }; }
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function waitForDeployment(repository, sha, liveUrl, waitSeconds = 120) {
  const limit = Math.min(Math.max(Number(waitSeconds) || 120, 0), 300);
  const deadline = Date.now() + limit * 1000;
  let last;
  do {
    last = await deployment(repository, sha, liveUrl);
    if (['verified', 'deployed', 'failed', 'unconfirmed'].includes(last.state)) return last;
    if (Date.now() >= deadline) return last;
    await sleep(5000);
  } while (Date.now() < deadline);
  return last;
}

async function publish(args) {
  const current = await inspect(args.folder);
  if (!current.repository) throw new Error('The repository origin is not a GitHub repository.');
  if (args.expectedHead && current.head !== args.expectedHead) throw new Error('Repository changed after review. Inspect again before publishing.');
  const selected = [...new Set((args.paths || []).map(String))];
  if (!selected.length) throw new Error('Select at least one changed file.');
  const blocked = current.findings.filter(f => selected.includes(f.path));
  if (blocked.length) throw new Error(`Blocked by secret scan: ${blocked.map(x => x.path).join(', ')}`);
  const changed = new Set(current.files.map(f => f.path));
  if (selected.some(p => !changed.has(p))) throw new Error('Selected files no longer match the reviewed change list. Inspect again.');
  const staged = (await runGit(current.root, ['diff', '--cached', '--name-only', '-z'])).split('\0').filter(Boolean);
  if (staged.length) throw new Error('There are already staged changes. Commit or unstage them, then inspect again.');
  const related = current.files.filter(f => selected.includes(f.path)).flatMap(f => f.relatedPaths || []);
  const paths = [...new Set([...selected, ...related])];
  await runGit(current.root, ['add', '--', ...paths]);
  try {
    await runGit(current.root, ['commit', '-m', String(args.note || `Publish ${path.basename(current.root)}`).slice(0, 120), '--only', '--', ...paths], 120000);
  } catch (e) {
    await runGit(current.root, ['reset', '--', ...paths]).catch(() => {});
    throw e;
  }
  const sha = (await runGit(current.root, ['rev-parse', 'HEAD'])).trim();
  try {
    await runGit(current.root, ['push', 'origin', current.branch], 180000);
  } catch (e) {
    throw new Error(`Commit ${sha.slice(0, 7)} was created but push failed. ${e.message}`);
  }
  const deploymentResult = args.waitForDeployment === false
    ? await deployment(current.repository, sha, args.liveUrl)
    : await waitForDeployment(current.repository, sha, args.liveUrl, args.waitSeconds);
  return { repository: current.repository, branch: current.branch, sha, deployment: deploymentResult };
}

const tools = [
  { name: 'sitego_inspect', description: 'Inspect a local Git repository, changed files, branch, GitHub remote, and secret-scan findings.', inputSchema: { type: 'object', properties: { folder: { type: 'string', description: 'Absolute local path to the repository.' } }, required: ['folder'] } },
  { name: 'sitego_publish', description: 'Publish only explicitly selected reviewed files. By default, wait for GitHub Actions and verify the live HTTPS URL before reporting the result.', inputSchema: { type: 'object', properties: { folder: { type: 'string' }, paths: { type: 'array', items: { type: 'string' } }, expectedHead: { type: 'string' }, note: { type: 'string' }, liveUrl: { type: 'string' }, waitForDeployment: { type: 'boolean', description: 'Wait for GitHub Actions and live verification. Defaults to true.' }, waitSeconds: { type: 'integer', minimum: 0, maximum: 300, description: 'Maximum seconds to wait for deployment verification. Defaults to 120.' } }, required: ['folder', 'paths'] } },
  { name: 'sitego_deployment_status', description: 'Check GitHub Actions status for a commit and optionally verify the HTTPS live URL.', inputSchema: { type: 'object', properties: { repository: { type: 'string' }, sha: { type: 'string' }, liveUrl: { type: 'string' } }, required: ['repository', 'sha'] } },
  { name: 'sitego_check_live_url', description: 'Check whether an HTTPS live URL responds successfully.', inputSchema: { type: 'object', properties: { liveUrl: { type: 'string' } }, required: ['liveUrl'] } }
];

async function callTool(name, args) {
  if (name === 'sitego_inspect') return inspect(args.folder);
  if (name === 'sitego_publish') return publish(args);
  if (name === 'sitego_deployment_status') return deployment(args.repository, args.sha, args.liveUrl);
  if (name === 'sitego_check_live_url') return liveCheck(args.liveUrl);
  throw new Error(`Unknown tool: ${name}`);
}

let line = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  line += chunk;
  let idx;
  while ((idx = line.indexOf('\n')) >= 0) {
    const raw = line.slice(0, idx).trim(); line = line.slice(idx + 1);
    if (!raw) continue;
    let message;
    try { message = JSON.parse(raw); } catch { continue; }
    if (message.method === 'initialize') {
      ok(message.id, { protocolVersion: message.params?.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'sitego', version: '0.2.2' } });
    } else if (message.method === 'notifications/initialized') {
    } else if (message.method === 'tools/list') {
      ok(message.id, { tools });
    } else if (message.method === 'tools/call') {
      callTool(message.params?.name, message.params?.arguments || {})
        .then(result => ok(message.id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }))
        .catch(e => ok(message.id, { isError: true, content: [{ type: 'text', text: e.message }] }));
    } else if (message.id !== undefined) {
      err(message.id, -32601, `Method not found: ${message.method}`);
    }
  }
});
