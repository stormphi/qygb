/* 观澜研究台 — 版本历史：快照、行级差异、时间线、对比与回滚 */
'use strict';

const VUI = { kind: null, id: null, base: 'prev' };

function diffLines(aText, bText) {
  const a = String(aText || '').split('\n'), b = String(bText || '').split('\n');
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = []; let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { out.push({ t: ' ', text: a[i], ai: i + 1, bi: j + 1 }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: '-', text: a[i], ai: i + 1 }); i++; }
    else { out.push({ t: '+', text: b[j], bi: j + 1 }); j++; }
  }
  while (i < n) { out.push({ t: '-', text: a[i], ai: i + 1 }); i++; }
  while (j < m) { out.push({ t: '+', text: b[j], bi: j + 1 }); j++; }
  return out;
}
function diffStat(aText, bText) {
  const d = diffLines(aText, bText);
  return { add: d.filter(x => x.t === '+').length, del: d.filter(x => x.t === '-').length };
}
function pushVersion(kind, obj, tag, note, author) {
  if (!obj.versions) obj.versions = [];
  const n = obj.versions.length ? obj.versions[obj.versions.length - 1].n + 1 : 1;
  const v = { id: uid(), n, time: now(), kind: tag, author: author || ME.name, note: note || '', snapshot: snapOf(kind, obj) };
  obj.versions.push(v);
  obj.updatedAt = v.time;
  if (obj.versions.length > 40) obj.versions.splice(0, obj.versions.length - 40);
  saveState();
  return v;
}
const entityOf = (kind, id) => kind === 'skill' ? skillById(id) : kind === 'topic' ? topicById(id) : kind === 'upload' ? S.uploads.find(u => u.id === id) : reportById(id);
const entityName = (kind, o) => kind === 'report' ? o.title : kind === 'topic' ? o.title : o.name;
const KIND_CN = { skill: '写作 Skill', topic: '专题', report: '稿件', upload: '范文' };

function versionStatLine(kind, versions, idx) {
  const cur = snapText(kind, versions[idx].snapshot);
  const prev = idx > 0 ? snapText(kind, versions[idx - 1].snapshot) : '';
  return idx > 0 ? diffStat(prev, cur) : { add: cur.split('\n').filter(Boolean).length, del: 0 };
}

/* ---------- 历史抽屉 ---------- */
function openHistory(kind, id) {
  const o = entityOf(kind, id); if (!o) return;
  VUI.kind = kind; VUI.id = id;
  const vs = [...(o.versions || [])].reverse();
  const rows = vs.map((v, ri) => {
    const idx = o.versions.length - 1 - ri;
    const st = versionStatLine(kind, o.versions, idx);
    const isCur = idx === o.versions.length - 1;
    return `<div class="ver-item ${isCur ? 'current' : ''}">
      <div class="ver-rail"><span class="ver-dot" style="background:${KIND_COLOR[v.kind] || '#8A97A5'}">${v.n}</span></div>
      <div class="ver-main">
        <div class="ver-top">
          <span class="ver-kind" style="background:${(KIND_COLOR[v.kind] || '#8A97A5')}1A;color:${KIND_COLOR[v.kind] || '#8A97A5'}">${KIND_LABEL[v.kind] || v.kind}</span>
          ${isCur ? '<span class="ver-cur">当前版本</span>' : ''}
          <span class="ver-time">${fmtDT(v.time)} · ${relTime(v.time)}</span>
        </div>
        <div class="ver-note">${esc(v.note || '（无变更说明）')}</div>
        <div class="ver-meta">${avatar(v.author, 'sm')}<span>${esc(v.author)}</span><span class="ver-diff"><b class="add">+${st.add}</b><b class="del">−${st.del}</b> 行</span></div>
        <div class="ver-acts">
          <button class="mini-btn" data-action="ver-view" data-kind="${kind}" data-id="${id}" data-vid="${v.id}">${icon('eye', 13)}查看</button>
          <button class="mini-btn" data-action="ver-diff" data-kind="${kind}" data-id="${id}" data-vid="${v.id}">${icon('layers', 13)}对比</button>
          ${isCur ? '' : `<button class="mini-btn gold" data-action="ver-restore" data-kind="${kind}" data-id="${id}" data-vid="${v.id}">${icon('undo', 13)}恢复此版</button>`}
        </div>
      </div></div>`;
  }).join('');
  openDrawer(`<div class="dw-head"><div class="dw-top"><span class="dw-type" style="background:var(--teal)">${icon('timeline', 14)}历史版本</span><span class="dw-code">${KIND_CN[kind]} · 共 ${vs.length} 个版本</span><button class="icon-btn dw-close" data-action="close-drawer">${icon('x', 18)}</button></div>
    <div class="dw-title">${esc(entityName(kind, o))}</div>
    <div class="dw-meta"><span class="hint">每次 AI 生成、手工编辑、要求沉淀与回滚都会自动留痕，可随时对比与恢复。</span></div></div>
    <div class="dw-body"><div class="ver-list">${rows || emptyState('timeline', '暂无历史版本', '保存一次修改即可生成第一个版本')}</div></div>
    <div class="dw-foot" style="display:flex;justify-content:flex-end;gap:10px"><button class="btn btn-ghost" data-action="close-drawer">关闭</button></div>`);
}

function findVersion(o, vid) { return (o.versions || []).find(v => v.id === vid); }

function viewVersion(kind, id, vid) {
  const o = entityOf(kind, id); const v = findVersion(o, vid); if (!v) return;
  const text = snapText(kind, v.snapshot);
  openModal(`<div class="md-head"><h3>${icon('eye', 17)}v${v.n} · ${esc(entityName(kind, o))}</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div>
    <div class="md-body"><div class="ver-snap-meta"><span class="ver-kind" style="background:${(KIND_COLOR[v.kind] || '#8A97A5')}1A;color:${KIND_COLOR[v.kind]}">${KIND_LABEL[v.kind]}</span><span class="hint">${esc(v.author)} · ${fmtDT(v.time)}</span></div>
      <div class="ver-note-box">${esc(v.note)}</div>
      <pre class="snap-view">${esc(text)}</pre></div>
    <div class="md-foot"><button class="btn btn-ghost" data-action="modal-close">关闭</button><button class="btn btn-soft" data-action="ver-diff" data-kind="${kind}" data-id="${id}" data-vid="${v.id}">${icon('layers', 15)}对比差异</button>${v.n === curVersion(o) ? '' : `<button class="btn btn-gold" data-action="ver-restore" data-kind="${kind}" data-id="${id}" data-vid="${v.id}">${icon('undo', 15)}恢复此版</button>`}</div>`, true);
}

function diffModal(kind, id, vid, base) {
  const o = entityOf(kind, id); const v = findVersion(o, vid); if (!v) return;
  const idx = o.versions.indexOf(v);
  const useBase = base || (idx > 0 ? 'prev' : 'empty');
  VUI.base = useBase;
  const other = useBase === 'current' ? o.versions[o.versions.length - 1] : useBase === 'prev' ? o.versions[idx - 1] : null;
  const aText = other ? snapText(kind, other.snapshot) : '';
  const bText = snapText(kind, v.snapshot);
  const rows = diffLines(aText, bText);
  const st = { add: rows.filter(r => r.t === '+').length, del: rows.filter(r => r.t === '-').length };
  const body = rows.map(r => `<div class="dl ${r.t === '+' ? 'add' : r.t === '-' ? 'del' : 'ctx'}"><span class="dl-no">${r.t === '+' ? (r.bi || '') : (r.ai || '')}</span><span class="dl-sign">${r.t === ' ' ? '' : r.t}</span><span class="dl-tx">${esc(r.text) || '&nbsp;'}</span></div>`).join('');
  openModal(`<div class="md-head"><h3>${icon('layers', 17)}版本对比 · v${v.n}</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div>
    <div class="md-body">
      <div class="diff-bar"><span class="hint">${other ? `基准 v${other.n}` : '基准：空白初稿'} → 目标 v${v.n}</span>
        <span class="ver-diff"><b class="add">+${st.add}</b><b class="del">−${st.del}</b> 行</span>
        <span class="spacer"></span>
        <div class="seg sm">${[['prev', '对比上一版'], ['current', '对比当前版']].map(([k, l]) => `<button class="seg-btn ${useBase === k ? 'on' : ''}" data-action="ver-diff-base" data-kind="${kind}" data-id="${id}" data-vid="${vid}" data-base="${k}">${l}</button>`).join('')}</div>
      </div>
      <div class="diff-view">${body || '<div class="pop-empty">两个版本内容一致</div>'}</div>
    </div>
    <div class="md-foot"><button class="btn btn-ghost" data-action="modal-close">关闭</button>${v.n === curVersion(o) ? '' : `<button class="btn btn-gold" data-action="ver-restore" data-kind="${kind}" data-id="${id}" data-vid="${vid}">${icon('undo', 15)}恢复此版</button>`}</div>`, true);
}

function restoreVersion(kind, id, vid) {
  const o = entityOf(kind, id); const v = findVersion(o, vid); if (!o || !v) return;
  confirmDlg({
    title: `恢复到 v${v.n}`, iconName: 'undo',
    text: `将把${KIND_CN[kind]}「<b>${esc(entityName(kind, o))}</b>」的内容恢复为 v${v.n}，当前内容会先自动存为一个新版本，不会丢失。`,
    okText: '恢复此版',
    onOk: () => {
      pushVersion(kind, o, 'edit', `回滚前自动备份（恢复 v${v.n} 之前）`);
      Object.assign(o, clone(v.snapshot));
      if (kind === 'upload' && typeof o.text === 'string') o.chars = o.text.length;
      const nv = pushVersion(kind, o, 'restore', `回滚至 v${v.n}：${v.note || ''}`);
      saveState(); closeModal(); closeDrawer();
      if (kind === 'report') { ED.reportId = id; ED.draft = null; }
      render(); toast(`已恢复至 v${v.n}，当前为 v${nv.n}`, { type: 'success' });
      if (ui.page === 'topic' || ui.page === 'skill') { /* 保持在当前页 */ }
    }
  });
}