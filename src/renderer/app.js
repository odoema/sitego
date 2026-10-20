'use strict';

const content = document.getElementById('content');
const siteList = document.getElementById('site-list');
const siteCount = document.getElementById('site-count');
const breadcrumb = document.getElementById('breadcrumb-site');
const dialog = document.getElementById('add-dialog');
const form = document.getElementById('add-form');
const toast = document.getElementById('toast');
let knownSites = [];
let activeSiteId = null;
let currentInspection = null;
let toastTimer;

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function siteLabel(site) { return site.repository === 'GitHub repository not detected' ? 'GitHub setup needed' : site.repository; }

async function loadSites() {
  knownSites = await window.sitego.listSites();
  siteCount.textContent = String(knownSites.length);
  renderSiteNav();
  if (activeSiteId && !knownSites.some((site) => site.id === activeSiteId)) activeSiteId = null;
  activeSiteId ? await openSite(activeSiteId) : renderOverview();
}

function renderSiteNav() {
  siteList.replaceChildren();
  knownSites.forEach((site, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `site-nav${site.id === activeSiteId ? ' active' : ''}`;
    button.innerHTML = `<span class="site-glyph">${index === 0 ? '◈' : '⌂'}</span><span>${escapeText(site.name)}</span>`;
    button.addEventListener('click', () => openSite(site.id));
    siteList.append(button);
  });
}

function renderOverview() {
  breadcrumb.textContent = 'Overview';
  const siteCards = knownSites.map((site, index) => `
    <article class="site-card" data-site="${escapeText(site.id)}" tabindex="0" role="button" aria-label="Open ${escapeText(site.name)}">
      <div class="site-card-top"><div class="site-card-title"><span class="site-card-icon">${index === 0 ? '◈' : '⌂'}</span><div><strong>${escapeText(site.name)}</strong><small>${escapeText(siteLabel(site))}</small></div></div><span class="change-badge">Review changes</span></div>
      <div class="site-card-bottom"><span>${escapeText(site.branch)} · local folder connected</span><span>Open site →</span></div>
    </article>`).join('');
  content.innerHTML = `
    <section class="hero"><div><div class="eyebrow">PUBLISHING WORKSPACE</div><h1>Good to see you, Brian.</h1><p>Your websites, connected to the folders you already work in.</p></div><button class="button primary" id="add-site-main">＋ Add a website</button></section>
    <section class="overview-grid">
      <div class="publish-card ${knownSites.length ? '' : 'publish-empty'}"><div class="eyebrow">SAFE PUBLISHING, MADE SIMPLE</div><h2>${knownSites.length ? 'Ready when your changes are.' : 'Your next great site starts here.'}</h2><p>${knownSites.length ? 'Review the files, check for secrets, and publish with a clear status.' : 'Connect a local website folder to see what changed and publish it with confidence.'}</p>${knownSites.length ? '' : '<button class="button" id="add-site-hero">Connect your first site <span>→</span></button>'}</div>
      <div class="overview-side"><div class="stat-card"><span class="stat-label">CONNECTED SITES</span><strong class="stat-number">${knownSites.length}</strong></div><div class="stat-card"><span class="stat-label">PUBLISHES TODAY</span><strong class="stat-number">—</strong></div><div class="stat-card wide"><span><span class="stat-label">WORKSPACE STATUS</span><strong class="stat-number" style="display:block;font-size:14px">Local and ready</strong></span><span class="status-pill">Files stay on device</span></div></div>
    </section>
    <section><div class="section-head"><h2>Your websites</h2><small>${knownSites.length ? 'Select a site to review its changes' : 'Connect your first website folder'}</small></div>
    ${knownSites.length ? `<div class="site-cards">${siteCards}</div>` : `<div class="empty-state" style="background:#fff;border:1px solid var(--line);border-radius:10px"><div class="empty-icon">＋</div><h3>No websites connected yet</h3><p>Add a local folder to get started. Your files stay on this computer.</p></div>`}</section>
    <section class="how-card"><div class="how-head"><span class="how-icon">↗</span><div><strong>Every publish stays in your control</strong><small>Review first. Publish only after you approve.</small></div></div><div class="steps"><div class="step"><span>01</span><strong>Choose a website</strong><small>SiteGo remembers the folder and repository.</small></div><div class="step"><span>02</span><strong>Review changes</strong><small>See each file and check for likely secrets.</small></div><div class="step"><span>03</span><strong>Approve publish</strong><small>SiteGo commits only the files you selected.</small></div><div class="step"><span>04</span><strong>Confirm it is live</strong><small>See deployment evidence and the live URL.</small></div></div></section>
    <div class="footer-note"><span>●</span> SiteGo does not upload your project files until you publish.</div>`;
  document.getElementById('add-site-main')?.addEventListener('click', showAddDialog);
  document.getElementById('add-site-hero')?.addEventListener('click', showAddDialog);
  content.querySelectorAll('.site-card').forEach((card) => {
    card.addEventListener('click', () => openSite(card.dataset.site));
    card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') openSite(card.dataset.site); });
  });
}

async function openSite(id) {
  activeSiteId = id;
  renderSiteNav();
  breadcrumb.textContent = knownSites.find((site) => site.id === id)?.name || 'Website';
  content.innerHTML = '<div class="empty-state"><div class="empty-icon">↻</div><h3>Checking this website</h3><p>Reading local Git status and scanning changed files.</p></div>';
  try {
    currentInspection = await window.sitego.inspectSite(id);
    renderSiteDetail(currentInspection);
  } catch (error) {
    content.innerHTML = `<div class="help-card"><h2>Could not inspect this folder</h2><p>${escapeText(error.message)}</p><button class="button secondary" id="retry-inspect">Try again</button></div>`;
    document.getElementById('retry-inspect').addEventListener('click', () => openSite(id));
  }
}

function renderSiteDetail(data, deploymentResult = null) {
  const site = data.site;
  const files = data.files || [];
  const findings = data.findings || [];
  const hasBlocking = findings.some((finding) => finding.level === 'block');
  const canPublish = Boolean(data.repository && data.branch && data.branch !== '(detached HEAD)');
  breadcrumb.textContent = site.name;
  const fileRows = files.map((file, index) => {
    const finding = findings.find((item) => item.path === file.path);
    return `<label class="file-row"><input type="checkbox" data-file-index="${index}" ${finding ? 'disabled' : 'checked'} aria-label="Select ${escapeText(file.path)}"><span class="file-path">${escapeText(file.path)}</span><span class="file-status">${escapeText(file.status)}</span>${finding ? `<span class="risk-tag">${escapeText(finding.issue)}</span>` : '<span class="file-tag">Ready to review</span>'}</label>`;
  }).join('');
  const findingRows = findings.map((finding) => `<div class="risk-banner"><span class="risk-symbol">⚠</span><div><strong>${escapeText(finding.issue)}</strong>${escapeText(finding.path)} is excluded from publish until you resolve the issue.</div></div>`).join('');
  const result = deploymentResult ? `<div class="result-banner"><span class="risk-symbol">${deploymentResult.state === 'verified' ? '✓' : '!'}</span><div><strong>${escapeText(resultTitle(deploymentResult.state))}</strong>${escapeText(deploymentResult.detail)}${deploymentResult.sha ? `<br>Commit ${escapeText(deploymentResult.sha.slice(0, 7))}` : ''}${deploymentResult.runUrl ? `<br><a href="${escapeText(deploymentResult.runUrl)}" data-open="${escapeText(deploymentResult.runUrl)}">View GitHub workflow →</a>` : ''}${deploymentResult.liveUrl ? `<br><a href="${escapeText(deploymentResult.liveUrl)}" data-open="${escapeText(deploymentResult.liveUrl)}">Open live website →</a>` : ''}</div></div>` : '';
  content.innerHTML = `
    <section class="detail-top"><button class="back-button" id="back-home" aria-label="Back to overview">←</button><div class="detail-name"><h1>${escapeText(site.name)}</h1><p>${escapeText(data.repository || site.repository)} · ${escapeText(data.branch || site.branch)}</p></div><div class="detail-actions"><button class="button secondary" id="refresh-detail">↻ Refresh</button>${site.liveUrl ? '<button class="button secondary" id="check-live">Check live site</button>' : ''}</div></section>
    <section class="detail-summary"><div class="summary-box"><label>LOCAL FOLDER</label><span>${escapeText(site.folder)}</span></div><div class="summary-box"><label>BRANCH</label><span>${escapeText(data.branch || 'Not detected')}</span></div><div class="summary-box"><label>EXPECTED LIVE URL</label><span>${site.liveUrl ? `<a href="${escapeText(site.liveUrl)}" data-open="${escapeText(site.liveUrl)}">${escapeText(site.liveUrl)}</a>` : 'Not added yet'}</span></div></section>
    ${result}
    <section class="changes-panel"><div class="panel-head"><div><strong>Changes to review</strong><small>${files.length} changed file${files.length === 1 ? '' : 's'} · HEAD ${escapeText((data.head || '').slice(0, 7))}</small></div><div class="panel-tools"><button class="text-button" id="select-all">Select ready</button><button class="text-button" id="select-none">Clear selection</button></div></div>
    ${findingRows}
    ${files.length ? fileRows : '<div class="empty-state"><div class="empty-icon">✓</div><h3>Everything is up to date</h3><p>There are no local changes waiting to publish.</p></div>'}</section>
    <section class="pipeline-panel"><div class="panel-head"><div><strong>Publish flow</strong><small>SiteGo reports each stage separately</small></div></div><div class="pipeline"><div class="pipeline-step done"><span class="step-circle">✓</span><strong>Review</strong><small>Files and checks</small></div><div class="pipeline-step"><span class="step-circle">2</span><strong>Approve</strong><small>You confirm in the publish dialog</small></div><div class="pipeline-step"><span class="step-circle">3</span><strong>Deploy</strong><small>Wait for GitHub Actions</small></div><div class="pipeline-step"><span class="step-circle">4</span><strong>Verify</strong><small>Check the live address</small></div></div></section>
    <div class="detail-footer"><span>${hasBlocking ? 'Resolve flagged files before publishing.' : !canPublish ? 'Connect a GitHub origin and select a branch before publishing.' : 'Only the selected, reviewed files will be committed.'}</span><button class="button primary" id="publish" ${!files.length || hasBlocking || !canPublish ? 'disabled' : ''}>Publish ${files.length ? `(${files.length - findings.length})` : ''} <span>→</span></button></div>`;
  document.getElementById('back-home').addEventListener('click', () => { activeSiteId = null; renderSiteNav(); renderOverview(); });
  document.getElementById('refresh-detail').addEventListener('click', () => openSite(site.id));
  document.getElementById('check-live')?.addEventListener('click', async () => {
    try { const status = await window.sitego.checkLiveUrl(site.id); notify(status.detail); }
    catch (error) { notify(error.message); }
  });
  document.getElementById('select-all')?.addEventListener('click', () => content.querySelectorAll('[data-file-index]:not(:disabled)').forEach((input) => { input.checked = true; }));
  document.getElementById('select-none')?.addEventListener('click', () => content.querySelectorAll('[data-file-index]').forEach((input) => { input.checked = false; }));
  document.getElementById('publish')?.addEventListener('click', () => publishSelected(data));
  content.querySelectorAll('[data-open]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); window.sitego.openUrl(link.dataset.open); }));
}

function resultTitle(state) {
  return ({ verified: 'Published and verified', deployed: 'Deployment succeeded; live check needs attention', unconfirmed: 'Changes pushed; deployment not confirmed', failed: 'Deployment failed', cancelled: 'Publish cancelled' })[state] || 'Publish status';
}

async function publishSelected(data) {
  const selected = [...content.querySelectorAll('[data-file-index]:checked')].map((input) => data.files[Number(input.dataset.fileIndex)]?.path).filter(Boolean);
  if (!selected.length) { notify('Select at least one changed file first.'); return; }
  const button = document.getElementById('publish');
  button.disabled = true;
  button.textContent = 'Publishing…';
  document.querySelector('.pipeline')?.classList.add('loading');
  try {
    const result = await window.sitego.publish({ id: data.site.id, paths: selected, expectedHead: data.head, note: `Publish ${data.site.name}` });
    if (result.state === 'cancelled') { renderSiteDetail(data, result); return; }
    const updated = await window.sitego.inspectSite(data.site.id);
    currentInspection = updated;
    renderSiteDetail(updated, result);
  } catch (error) {
    const refreshed = await window.sitego.inspectSite(data.site.id).catch(() => data);
    renderSiteDetail(refreshed, { state: 'failed', detail: error.message });
  }
}

function showAddDialog() {
  form.reset();
  document.getElementById('site-folder').value = '';
  dialog.showModal();
  document.getElementById('site-name').focus();
}

document.getElementById('add-site-side').addEventListener('click', showAddDialog);
document.getElementById('choose-folder').addEventListener('click', async () => {
  const folder = await window.sitego.chooseFolder();
  if (folder) document.getElementById('site-folder').value = folder;
});
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.getElementById('save-site');
  button.disabled = true;
  try {
    const site = await window.sitego.addSite({ name: form.elements.name.value, folder: form.elements.folder.value, liveUrl: form.elements.liveUrl.value });
    dialog.close();
    await loadSites();
    await openSite(site.id);
    notify(`${site.name} connected.`);
  } catch (error) {
    notify(error.message);
  } finally { button.disabled = false; }
});
document.getElementById('refresh').addEventListener('click', () => loadSites().catch((error) => notify(error.message)));
document.getElementById('add-site-main')?.addEventListener('click', showAddDialog);
loadSites().catch((error) => notify(error.message));
