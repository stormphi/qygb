/* 观澜研究台 — 共享 UI：提示、模态、抽屉、图表、导航 */
'use strict';

function avatar(name, cls = '') { return `<span class="avatar ${cls}" style="background:${avColor(name)}">${esc(String(name).slice(0, 1))}</span>`; }
function taskKindTag(kind) { const K = TASK_KINDS[kind] || TASK_KINDS.write; return `<span class="tag" style="background:${K.color}1A;color:${K.color}">${icon(K.icon, 13)}${K.name}</span>`; }
function stanceTag(s) { return `<span class="tag" style="background:${stanceColor(s)}1A;color:${stanceColor(s)}"><span class="stance-dot" style="background:${stanceColor(s)}"></span>${esc(s)}</span>`; }
function docStatus(d) {
  const map = { ready: ['ss-ready', '导读卡就绪'], cold: ['ss-cold', '待解析'], processing: ['ss-processing', '解析中'], queued: ['ss-processing', '排队中'] };
  const [c, l] = map[d.status] || map.ready; return `<span class="src-status ${c}">${l}</span>`;
}
function taskStatus(t) {
  const map = { running: ['st-running', '进行中'], done: ['st-ready', '已完成'], failed: ['st-failed', '已中断'], queued: ['st-draft', '排队中'] };
  const [c, l] = map[t.status] || map.done; return `<span class="status-tag ${c}">${l}</span>`;
}
function citeChip(id) {
  const isWeb = /^web_/.test(id);
  return `<span class="cite-chip ${isWeb ? 'web' : ''}" data-action="cite" data-id="${id}" title="${isWeb ? '查看联网线索来源' : '点击跳转原文页码高亮'}">${icon(isWeb ? 'globe' : 'anchor', 10)}${id}</span>`;
}
function renderCites(text) { return esc(text).replace(/\[(doc_\d+_p\d+_c\d+|web_\d+)\]/g, (m, id) => citeChip(id)); }

/* ---------- Toast ---------- */
let toastSeq = 0;
function toast(msg, opts = {}) {
  const { type = 'success', undo = null, duration = 4600 } = opts;
  const icons = { success: 'check', error: 'x', warn: 'alert', info: 'info' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-ic">${icon(icons[type] || 'info', 17)}</span><span class="toast-msg">${msg}</span>
    ${undo ? `<button class="toast-undo">撤销</button>` : ''}<button class="toast-x">${icon('x', 14)}</button>
    <span class="toast-bar" style="animation-duration:${duration}ms"></span>`;
  document.getElementById('toasts').appendChild(el);
  const kill = () => { el.classList.add('out'); setTimeout(() => el.remove(), 240); };
  const timer = setTimeout(kill, duration);
  el.querySelector('.toast-x').onclick = () => { clearTimeout(timer); kill(); };
  if (undo) el.querySelector('.toast-undo').onclick = () => { clearTimeout(timer); kill(); undo(); };
  return el;
}

/* ---------- 模态 / 抽屉 ---------- */
let confirmCb = null;
function openModal(html, wide = false) { const m = document.getElementById('modal'); m.className = 'modal' + (wide ? ' wide' : ''); m.innerHTML = html; document.getElementById('modalScrim').classList.add('open'); }
function closeModal() { document.getElementById('modalScrim').classList.remove('open'); confirmCb = null; }
function confirmDlg({ title = '确认操作', text = '', okText = '确认', danger = false, iconName = 'alert', onOk }) {
  confirmCb = onOk;
  openModal(`<div class="md-head"><h3>${esc(title)}</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div>
    <div class="md-body"><div class="confirm-ic ${danger ? 'danger' : 'warn'}">${icon(iconName, 28)}</div><div class="confirm-text">${text}</div></div>
    <div class="md-foot"><button class="btn btn-ghost" data-action="modal-close">取消</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-action="confirm-ok">${esc(okText)}</button></div>`);
}
function openDrawer(html) { document.getElementById('drawer').innerHTML = html; document.getElementById('drawer').classList.add('open'); document.getElementById('drawerScrim').classList.add('open'); }
function closeDrawer() { document.getElementById('drawer').classList.remove('open'); document.getElementById('drawerScrim').classList.remove('open'); }
const drawerOpen = () => document.getElementById('drawer').classList.contains('open');
const modalOpen = () => document.getElementById('modalScrim').classList.contains('open');
function emptyState(ic, title, sub, action = '') { return `<div class="empty-state"><div class="empty-ic">${icon(ic, 34)}</div><h3>${esc(title)}</h3><p>${sub}</p>${action}</div>`; }
function animateNums(root) {
  root.querySelectorAll('[data-count]').forEach(el => {
    const target = parseFloat(el.dataset.count); const dec = parseInt(el.dataset.dec || '0');
    const t0 = performance.now(), dur = 750;
    const step = t => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = (target * e).toFixed(dec); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

/* ---------- SVG 图表 ---------- */
function smoothPath(pts) { if (pts.length < 2) return ''; let d = `M${pts[0][0]},${pts[0][1]}`; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; const mx = (x0 + x1) / 2; d += ` C${mx},${y0} ${mx},${y1} ${x1},${y1}`; } return d; }
function svgTrend({ labels, series, height = 210 }) {
  const W = 620, H = height, padL = 34, padR = 14, padT = 16, padB = 28;
  const max = Math.max(4, ...series.flatMap(s => s.values)) * 1.2;
  const iw = W - padL - padR, ih = H - padT - padB;
  const X = i => padL + (labels.length === 1 ? iw / 2 : i * iw / (labels.length - 1));
  const Y = v => padT + ih - v / max * ih;
  let grid = '';
  for (let g = 0; g <= 4; g++) { const v = max * g / 4, y = Y(v); grid += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="#E7E3D6" stroke-width="1" ${g ? 'stroke-dasharray="3 4"' : ''}/><text x="${padL - 7}" y="${y + 4}" text-anchor="end" font-size="10" fill="#8A97A5">${Math.round(v)}</text>`; }
  let body = '';
  series.forEach((s, si) => {
    const pts = s.values.map((v, i) => [X(i), Y(v)]); const line = smoothPath(pts);
    const area = line + ` L${X(pts.length - 1)},${padT + ih} L${X(0)},${padT + ih} Z`;
    body += `<path d="${area}" fill="url(#tg${si})" opacity=".9"/><path d="${line}" fill="none" stroke="${s.color}" stroke-width="2.4" stroke-linecap="round" ${si ? 'stroke-dasharray="6 4"' : ''}/>`;
    pts.forEach(([x, y], i) => { body += `<circle cx="${x}" cy="${y}" r="3.4" fill="#fff" stroke="${s.color}" stroke-width="2"><title>${labels[i]} · ${s.name}：${s.values[i]}</title></circle>`; });
  });
  const xl = labels.map((l, i) => `<text x="${X(i)}" y="${H - 8}" text-anchor="middle" font-size="10.5" fill="#8A97A5">${l}</text>`).join('');
  const defs = series.map((s, i) => `<linearGradient id="tg${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".26"/><stop offset="1" stop-color="${s.color}" stop-opacity=".02"/></linearGradient>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" role="img"><defs>${defs}</defs>${grid}${body}${xl}</svg>`;
}
function svgDonut(items, centerLabel = '总量') {
  const total = items.reduce((a, b) => a + b.value, 0) || 1; const R = 56, C = 2 * Math.PI * R; let off = 0, arcs = '';
  items.forEach(it => { const frac = it.value / total; arcs += `<circle cx="90" cy="90" r="${R}" fill="none" stroke="${it.color}" stroke-width="21" stroke-dasharray="${Math.max(0.001, frac * C - 2.4)} ${C}" stroke-dashoffset="${-off * C}" transform="rotate(-90 90 90)"><title>${it.label}：${it.value}（${Math.round(frac * 100)}%）</title></circle>`; off += frac; });
  return `<svg viewBox="0 0 180 180" style="max-width:200px;margin:0 auto" role="img"><circle cx="90" cy="90" r="${R}" fill="none" stroke="#EFECE2" stroke-width="21"/>${arcs}<text x="90" y="85" text-anchor="middle" font-size="24" font-weight="700" fill="#1C2530">${total}</text><text x="90" y="105" text-anchor="middle" font-size="11" fill="#8A97A5">${esc(centerLabel)}</text></svg>`;
}
function legendHtml(items) { return `<div class="legend">${items.map(it => `<span class="lg-item"><span class="lg-dot" style="background:${it.color}"></span>${esc(it.label)} <b class="num">${it.value}</b></span>`).join('')}</div>`; }

/* ---------- 导航 ---------- */
const NAV = [
  { page: 'dashboard', label: '研究工作台', icon: 'dashboard' },
  { cap: '研究空间' },
  { page: 'topics', label: '我的专题', icon: 'book', badge: 'topics', badgeGold: true },
  { page: 'corpus', label: '研究资料库', icon: 'globe' },
  { cap: '写作能力' },
  { page: 'skills', label: '写作 Skill', icon: 'spark', badge: 'skills' },
  { page: 'packs', label: '论据篮', icon: 'funnel' },
  { cap: '成果与任务' },
  { page: 'reports', label: '研究成果', icon: 'pen' },
  { page: 'tasks', label: '生成任务', icon: 'queue', badge: 'tasks' },
  { page: 'settings', label: '写作偏好', icon: 'settings' }
];
function badgeCounts() { return { topics: S.topics.length, skills: S.skills.length, tasks: S.tasks.filter(t => t.status === 'running' || t.status === 'failed').length }; }
function renderNav(active) {
  const c = badgeCounts();
  document.getElementById('nav').innerHTML = NAV.map(n => {
    if (n.cap) return `<div class="nav-cap">${n.cap}</div>`;
    const badge = n.badge && c[n.badge] ? `<span class="nav-badge ${n.badgeGold ? 'gold' : ''}">${c[n.badge]}</span>` : '';
    return `<button class="nav-item ${n.page === active ? 'active' : ''}" data-action="nav" data-page="${n.page}" title="${n.label}"><span class="nav-ic">${icon(n.icon, 19)}</span><span class="nav-label">${n.label}</span>${badge}</button>`;
  }).join('');
}
function updateBadges() {
  const c = badgeCounts();
  document.querySelectorAll('.nav-item').forEach(el => {
    const n = NAV.find(x => x.page === el.dataset.page); if (!n || !n.badge) return;
    let b = el.querySelector('.nav-badge'); const val = c[n.badge];
    if (val > 0) { if (!b) { b = document.createElement('span'); b.className = 'nav-badge' + (n.badgeGold ? ' gold' : ''); el.appendChild(b); } b.textContent = val; }
    else if (b) b.remove();
  });
  const alert = S.tasks.some(t => t.status === 'failed' || t.status === 'running');
  document.getElementById('bellDot').classList.toggle('on', alert);
}