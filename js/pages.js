/* 观澜研究台 — 业务页面：工作台 / 专题 / 资料库 / 论据篮 / 成果 / 任务 / 偏好 */
'use strict';
const ui = {
  page: 'dashboard', topicId: null, topicTab: 'write', skillId: null,
  rightTab: 'src', pdfDoc: null, pdfHl: null, mobTab: 'write',
  filters: {}, packSel: new Set(), packTopic: null, reportTopic: 'all'
};
function filtersFor(p) { if (!ui.filters[p]) ui.filters[p] = { q: '', region: 'all', stance: 'all', heat: 'all', lang: 'all', sort: 'date-desc' }; return ui.filters[p]; }
const avgRT = () => S.metrics.queries ? (S.metrics.rtSum / S.metrics.queries).toFixed(1) : '0.9';

/* ================= 工作台首页 ================= */
function activityFeed(limit) {
  const rows = [];
  S.topics.forEach(t => (t.versions || []).forEach(v => rows.push({ time: v.time, kind: v.kind, who: v.author, text: v.note, entity: '专题', name: t.title, action: 'topic-history', id: t.id })));
  S.skills.forEach(s => (s.versions || []).forEach(v => rows.push({ time: v.time, kind: v.kind, who: v.author, text: v.note, entity: 'Skill', name: s.name, action: 'skill-history', id: s.id })));
  S.reports.forEach(r => (r.versions || []).forEach(v => rows.push({ time: v.time, kind: v.kind, who: v.author, text: v.note, entity: '稿件', name: r.title, action: 'report-history', id: r.id })));
  return rows.sort((a, b) => b.time - a.time).slice(0, limit || 8);
}
function renderDashboard() {
  const m = S.metrics;
  const running = S.tasks.filter(t => t.status === 'running').length;
  const reports = [...S.reports].sort((a, b) => b.updatedAt - a.updatedAt);
  const trend = svgTrend({ labels: ['一', '二', '三', '四', '五', '六', '日'], series: [{ name: '成稿', color: '#0E3A5D', values: [2, 3, 2, 4, 3, 1, 3] }, { name: '按要求重写', color: '#C2379B', values: [1, 1, 2, 1, 2, 0, 2] }] });
  const steps = [
    { ic: 'upload', t: '上传范文', s: '把您认可的报告交给系统', act: 'dash-upload', c: '#0E9F8A' },
    { ic: 'spark', t: '提炼写作 Skill', s: '结构骨架 · 论证路径 · 语言风格', act: 'nav-skills', c: '#7C5CFC' },
    { ic: 'globe', t: '资料 + 联网成稿', s: '专题论据与最新公开线索一起写', act: 'dash-write', c: '#3E8EDE' },
    { ic: 'edit', t: '改写与版本回溯', s: '直接改稿，要求可沉淀进 Skill', act: 'nav-reports', c: '#C2379B' }
  ];
  return `<div class="page">
  <section class="hero rise" style="--i:0"><div class="hero-bg"></div>
    <svg class="hero-globe" viewBox="0 0 200 200"><g fill="none" stroke="#D9A441" stroke-width="1"><circle cx="100" cy="100" r="70"/><circle cx="100" cy="100" r="50" opacity=".6"/><circle cx="100" cy="100" r="88" opacity=".35"/><path d="M30 100h140M100 30c26 20 26 120 0 140c-26-20-26-120 0-140z"/></g></svg>
    <div class="hero-inner">
      <div class="hero-hello"><h1>${ME.name}，欢迎回到观澜研究台</h1>
        <p>上传一份您认可的报告，系统会把它的写作思路与风格沉淀成可复用的 Skill；再结合专题资料与联网线索成稿，稿子随时能改，每一步都留有版本。</p>
        <div class="hero-targets"><span class="ht">${icon('upload', 12)}范文 <b>→ Skill</b></span><span class="ht">${icon('globe', 12)}资料 <b>+ 联网</b></span><span class="ht">${icon('timeline', 12)}版本 <b>可回溯</b></span></div>
      </div>
      <div class="hero-stats">
        <div class="hstat gold" data-action="nav" data-page="topics"><b data-count="${S.topics.length}">0</b><span>我的专题</span></div>
        <div class="hstat" data-action="nav" data-page="skills"><b data-count="${S.skills.length}">0</b><span>写作 Skill</span></div>
        <div class="hstat" data-action="nav" data-page="reports"><b data-count="${m.monthDrafts}">0</b><span>本月成稿</span></div>
        <div class="hstat" data-action="nav" data-page="tasks"><b data-count="${running}">0</b><span>进行中任务</span></div>
      </div>
    </div>
  </section>
  <div class="flow-strip rise" style="--i:1">${steps.map((s, i) => `<button class="fs-step" data-action="${s.act}" style="--sc:${s.c}"><span class="fs-n">${i + 1}</span><span class="fs-ic">${icon(s.ic, 19)}</span><div><b>${s.t}</b><span>${s.s}</span></div>${i < 3 ? `<span class="fs-arrow">${icon('chevR', 16)}</span>` : ''}</button>`).join('')}</div>
  <div class="grid-dash">
    <div class="dash-col">
      <div class="card rise" style="--i:2"><div class="card-head"><span class="card-title">${icon('book', 17)}我的专题</span><span class="card-extra" data-action="nav" data-page="topics">全部 ${icon('chevR', 13)}</span></div>
        <div class="card-body"><div class="nb-grid" style="grid-template-columns:1fr 1fr">${S.topics.slice(0, 2).map(topicCard).join('')}</div></div></div>
      <div class="card rise" style="--i:3"><div class="card-head"><span class="card-title">${icon('pen', 17)}最近稿件</span><span class="card-extra" data-action="nav" data-page="reports">全部 ${icon('chevR', 13)}</span></div>
        <div class="card-body"><div class="mini-list">${reports.slice(0, 4).map(r => `<div class="mini-item" data-action="report-open" data-id="${r.id}"><span class="mi-ic" style="background:${reportColor(r)}">${icon(reportIcon(r), 17)}</span><div class="mi-main"><div class="mi-title">${esc(r.title)}</div><div class="mi-sub"><span>${esc((topicById(r.topicId) || {}).title || '')}</span><span>${wordsOf(r)} 字</span><span>v${curVersion(r)}</span></div></div><div class="mi-side"><span class="ver-chip sm">${relTime(r.updatedAt)}</span></div></div>`).join('') || emptyState('pen', '还没有稿件', '先在专题里上传范文并生成第一篇')}</div></div></div>
      <div class="card rise" style="--i:4"><div class="card-head"><span class="card-title">${icon('chart', 17)}本周写作产出</span><span class="hint">成稿与按要求重写的次数</span></div>
        <div class="chart-box">${trend}</div>${legendHtml([{ label: '成稿', color: '#0E3A5D', value: 18 }, { label: '按要求重写', color: '#C2379B', value: 9 }])}</div>
    </div>
    <div class="dash-col">
      <div class="card rise" style="--i:2"><div class="card-head"><span class="card-title">${icon('zap', 17)}快速开始</span></div>
        <div class="card-body" style="display:flex;flex-direction:column;gap:8px">
          <button class="btn btn-gold" data-action="dash-upload">${icon('upload', 15)}上传范文 → 提炼 Skill</button>
          <button class="btn btn-primary" data-action="dash-write">${icon('spark', 15)}进入专题写作台</button>
          <button class="btn btn-ghost" data-action="topic-new">${icon('plus', 15)}新建研究专题</button>
        </div></div>
      <div class="card rise" style="--i:3"><div class="card-head"><span class="card-title">${icon('spark', 17)}写作 Skill</span><span class="card-extra" data-action="nav" data-page="skills">管理 ${icon('chevR', 13)}</span></div>
        <div class="card-body"><div class="mini-list">${S.skills.slice(0, 3).map(s => `<div class="mini-item" data-action="open-skill" data-id="${s.id}"><span class="mi-ic" style="background:${s.origin === 'distill' ? 'var(--violet)' : 'var(--teal)'}">${icon(s.origin === 'distill' ? 'spark' : 'pen', 17)}</span><div class="mi-main"><div class="mi-title">${esc(s.name)}</div><div class="mi-sub"><span>${s.outline.length} 节</span><span>${s.requirements.length} 条要求</span><span>v${curVersion(s)}</span></div></div><div class="mi-side"><span class="chip violet sm">${esc(s.style.tone)}</span></div></div>`).join('')}</div></div></div>
      <div class="card rise" style="--i:4"><div class="card-head"><span class="card-title">${icon('timeline', 17)}最近动态</span><span class="hint">自动留痕</span></div>
        <div class="card-body"><div class="feed">${activityFeed(6).map(a => `<div class="feed-row" data-action="${a.action}" data-id="${a.id}"><span class="fd-dot" style="background:${KIND_COLOR[a.kind] || '#8A97A5'}"></span><div><b>${esc(a.entity)} · ${esc(a.name.slice(0, 16))}</b><span>${esc(a.text)}</span><em>${esc(a.who)} · ${relTime(a.time)}</em></div></div>`).join('')}</div></div></div>
      <div class="card rise" style="--i:5"><div class="card-head"><span class="card-title">${icon('queue', 17)}任务进度</span><span class="card-extra" data-action="nav" data-page="tasks">全部 ${icon('chevR', 13)}</span></div>
        <div class="card-body">${S.tasks.slice(0, 3).map(t => `<div style="margin-bottom:11px"><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:5px;gap:8px"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${taskKindTag(t.kind)} ${esc(t.label)}</span>${taskStatus(t)}</div><div class="progress"><i style="width:${t.progress}%"></i></div></div>`).join('')}</div></div>
    </div>
  </div></div>`;
}
const reportColor = r => r.type === '内参' ? 'var(--violet)' : r.type === '矩阵' ? 'var(--cinnabar)' : r.type === '快评' ? 'var(--gold)' : 'var(--teal)';
const reportIcon = r => r.type === '内参' ? 'pen' : r.type === '矩阵' ? 'matrix' : r.type === '快评' ? 'zap' : 'book';

function topicCard(t) {
  const sk = t.skillId ? skillById(t.skillId) : null;
  const rs = reportsOf(t);
  const ready = t.sourceIds.filter(id => (docById(id) || {}).status === 'ready').length;
  return `<div class="nb-card" data-action="open-topic" data-id="${t.id}"><div class="nb-cover" style="background:linear-gradient(120deg,${t.color},${t.color}BB)">${icon('globe', 26)}<b>${esc(t.title)}</b><span class="nb-ver">v${curVersion(t)}</span></div>
    <div class="nb-body"><div class="nb-desc">${esc(t.desc)}</div>
      <div class="nb-skill">${sk ? `${icon('spark', 12)}<span>${esc(sk.name)}</span><em>v${curVersion(sk)}</em>` : `${icon('alert', 12)}<span class="warn">未绑定写作 Skill</span>`}</div>
      <div class="nb-meta"><span>${icon('file', 12)} ${ready}/${t.sourceIds.length} 篇</span><span>${icon('pen', 12)} ${rs.length} 稿</span><span>${icon('upload', 12)} ${uploadsOf(t).length} 范文</span></div></div></div>`;
}

/* ================= 专题列表 ================= */
function renderTopics() {
  const f = filtersFor('topics');
  let rows = S.topics.filter(t => !f.q || (t.title + t.desc + t.keywords.join('')).toLowerCase().includes(f.q.toLowerCase()));
  rows = [...rows].sort(f.sort === 'reports' ? (a, b) => reportsOf(b).length - reportsOf(a).length : (a, b) => b.updatedAt - a.updatedAt);
  return `<div class="page"><div class="page-head rise" style="--i:0"><div><div class="page-title">${icon('book', 21)}我的专题<span class="faint fs13 num">${S.topics.length} 个</span></div><div class="page-sub">每个专题有自己的资料、写作 Skill 与稿件版本，专题信息可随时编辑</div></div>
    <div class="head-actions"><button class="btn btn-ghost" data-action="dash-upload">${icon('upload', 15)}上传范文</button><button class="btn btn-primary" data-action="topic-new">${icon('plus', 15)}新建专题</button></div></div>
  <div class="toolbar rise" style="--i:1"><div class="search-box">${icon('search', 16)}<input placeholder="检索专题名称 / 关键词…" value="${esc(f.q)}" data-filter="q" data-page="topics"></div>
    <select class="select" data-filter="sort" data-page="topics"><option value="updated" ${f.sort !== 'reports' ? 'selected' : ''}>最近更新</option><option value="reports" ${f.sort === 'reports' ? 'selected' : ''}>稿件最多</option></select></div>
  <div class="nb-grid rise" style="--i:2">${rows.map(topicCard).join('')}</div>
  ${rows.length ? '' : emptyState('book', '没有匹配的专题', '换个关键词，或新建一个研究专题')}</div>`;
}

/* ================= 资料库 ================= */
function renderCorpus() {
  const f = filtersFor('corpus');
  let rows = S.corpus.filter(d => {
    if (f.q && !(d.title + d.org + d.tags.join('')).toLowerCase().includes(f.q.toLowerCase())) return false;
    if (f.region !== 'all' && d.region !== f.region) return false;
    if (f.stance !== 'all' && d.stance !== f.stance) return false;
    if (f.heat !== 'all' && d.heat !== f.heat) return false;
    if (f.lang !== 'all' && d.lang !== f.lang) return false;
    return true;
  });
  const cmp = { 'date-desc': (a, b) => b.date.localeCompare(a.date), 'date-asc': (a, b) => a.date.localeCompare(b.date), 'words-desc': (a, b) => b.words - a.words, 'hot-first': (a, b) => (a.heat === b.heat ? b.date.localeCompare(a.date) : a.heat === 'hot' ? -1 : 1) }[f.sort] || ((a, b) => b.date.localeCompare(a.date));
  rows = [...rows].sort(cmp);
  const regions = [...new Set(S.corpus.map(d => d.region))];
  return `<div class="page"><div class="page-head rise" style="--i:0"><div><div class="page-title">${icon('globe', 21)}研究资料库<span class="faint fs13 num">${rows.length} 篇</span></div><div class="page-sub">智库研报与官方文件，均已生成导读卡与页码锚点，可直接加入专题作为写作证据</div></div>
    <button class="btn btn-gold" data-action="open-compile">${icon('spark', 15)}智能组卷</button></div>
  <div class="toolbar rise" style="--i:1"><div class="search-box">${icon('search', 16)}<input placeholder="检索标题 / 智库 / 标签…" value="${esc(f.q)}" data-filter="q" data-page="corpus"></div>
    <select class="select" data-filter="region" data-page="corpus"><option value="all">全部区域</option>${regions.map(r => `<option ${f.region === r ? 'selected' : ''}>${r}</option>`).join('')}</select>
    <select class="select" data-filter="stance" data-page="corpus"><option value="all">全部立场</option>${Object.keys(STANCES).map(s => `<option ${f.stance === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
    <select class="select" data-filter="heat" data-page="corpus"><option value="all">全部状态</option><option value="hot" ${f.heat === 'hot' ? 'selected' : ''}>已就绪</option><option value="cold" ${f.heat === 'cold' ? 'selected' : ''}>待解析</option></select>
    <select class="select" data-filter="lang" data-page="corpus"><option value="all">全部语言</option>${[...new Set(S.corpus.map(d => d.lang))].map(l => `<option ${f.lang === l ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <select class="select" data-filter="sort" data-page="corpus" title="排序">${[['date-desc', '日期 ↓'], ['date-asc', '日期 ↑'], ['words-desc', '篇幅 ↓'], ['hot-first', '就绪优先']].map(([v, l]) => `<option value="${v}" ${f.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
  <div class="table-card rise" style="--i:2"><div class="table-wrap"><table class="list-table"><thead><tr><th>研报 / 智库</th><th class="hide-sm">区域·国别</th><th>立场</th><th class="hide-sm">语言·日期</th><th>状态</th><th style="text-align:right">操作</th></tr></thead><tbody>
    ${rows.map(d => `<tr data-action="corpus-preview" data-id="${d.id}"><td><div class="cell-main"><span class="cm-ic" style="background:${avColor(d.org)}">${icon('file', 17)}</span><div class="cm-text"><div class="cm-title"><span class="t">${esc(d.title)}</span></div><div class="cm-sub"><span>${esc(d.org)}</span><span>${d.pages}p · ${kfmt(d.words)}字</span></div></div></div></td>
    <td class="hide-sm fs13 muted">${d.region} · ${d.country}</td><td>${stanceTag(d.stance)}</td><td class="hide-sm fs13 muted">${d.lang} · ${d.date}</td><td>${docStatus(d)}</td>
    <td><div class="row-actions"><button class="mini-btn" data-action="corpus-preview" data-id="${d.id}">导读卡</button><button class="mini-btn ok" data-action="corpus-add" data-id="${d.id}">加入专题</button></div></td></tr>`).join('')}
  </tbody></table></div><div class="table-foot"><span>共 ${rows.length} 篇 · 已就绪 ${S.corpus.filter(d => d.status === 'ready').length} / 待解析 ${S.corpus.filter(d => d.status !== 'ready').length}</span><span>待解析资料加入专题时会自动补齐导读卡</span></div></div></div>`;
}

/* ================= 论据篮 ================= */
function renderPacks() {
  if (!S.topics.length) return `<div class="page">${emptyState('book', '还没有专题', '先新建一个研究专题')}</div>`;
  const tid = ui.packTopic || S.topics[0].id; ui.packTopic = tid;
  const t = topicById(tid); const claims = claimsOf(t);
  const selDocs = new Set([...ui.packSel].map(id => (claimById(id) || {}).doc).filter(Boolean));
  const stCount = {};
  [...ui.packSel].forEach(id => { const c = claimById(id); if (c) { const s = (docById(c.doc) || {}).stance; stCount[s] = (stCount[s] || 0) + 1; } });
  const packs = S.packs.filter(p => p.topicId === tid);
  return `<div class="page"><div class="page-head rise" style="--i:0"><div><div class="page-title">${icon('funnel', 21)}论据篮</div><div class="page-sub">手工挑选核心论据，写作时优先使用篮内证据，保证关键判断的出处可控</div></div>
    <select class="select" data-action="pack-topic">${S.topics.map(x => `<option value="${x.id}" ${x.id === tid ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select></div>
  <div class="ana-tiles rise" style="--i:1;grid-template-columns:repeat(3,1fr)">
    <div class="ana-tile" style="--tc:var(--sky)"><div class="at-label">${icon('check', 14)}已选论据</div><div class="at-num"><span>${ui.packSel.size}</span><small>条</small></div><div class="at-sub">篮内证据将在写作时优先引用</div></div>
    <div class="ana-tile" style="--tc:var(--jade)"><div class="at-label">${icon('building', 14)}覆盖智库</div><div class="at-num"><span>${selDocs.size}</span><small>家</small></div><div class="at-sub">建议至少覆盖对象国、美欧与周边</div></div>
    <div class="ana-tile" style="--tc:var(--gold)"><div class="at-label">${icon('users', 14)}立场分布</div><div class="at-num"><span>${Object.keys(stCount).length}</span><small>类</small></div><div class="at-sub">${Object.entries(stCount).map(([k, v]) => `${k} ${v}`).join(' · ') || '尚未选择'}</div></div>
  </div>
  <div class="grid-dash rise" style="--i:2"><div class="dash-col"><div class="card"><div class="card-head"><span class="card-title">${icon('anchor', 16)}论据清单（带页码锚点）</span><button class="btn btn-gold sm" data-action="pack-save" data-id="${tid}">${icon('save', 14)}存为论据篮</button></div>
    <div class="card-body" style="max-height:520px;overflow-y:auto">${claims.map(c => `<div class="claim-row ${ui.packSel.has(c.id) ? 'on' : ''}" data-action="claim-toggle" data-id="${c.id}"><input type="checkbox" class="checkbox" ${ui.packSel.has(c.id) ? 'checked' : ''}><div class="cr-text">${esc(c.text)}<div class="cr-meta"><span class="mono">${c.id}</span><span>${esc((docById(c.doc) || {}).org || '')}</span>${stanceTag((docById(c.doc) || {}).stance || '')}<span>第 ${c.page} 页</span></div></div></div>`).join('') || emptyState('anchor', '暂无可用论据', '先为专题添加并解析资料')}</div></div></div>
  <div class="dash-col"><div class="card"><div class="card-head"><span class="card-title">${icon('box', 16)}已存论据篮</span></div><div class="card-body">${packs.map(p => `<div class="note-card"><b>${esc(p.name)}</b>${p.claims.length} 条论据 · ${new Set(p.claims.map(id => (claimById(id) || {}).doc)).size} 家智库<div class="nc-meta"><button class="mini-btn gold" data-action="pack-use" data-id="${p.id}">用它写作</button> <button class="mini-btn danger" data-action="pack-del" data-id="${p.id}">删除</button></div></div>`).join('') || '<div class="pop-empty">暂无已存论据篮</div>'}</div></div>
  <div class="funnel-note">${icon('info', 13)} 不选也可以写作：系统会按 Skill 结构自动匹配专题内的相关论据。</div></div></div></div>`;
}

/* ================= 研究成果 ================= */
function renderReports() {
  let rows = [...S.reports];
  if (ui.reportTopic !== 'all') rows = rows.filter(r => r.topicId === ui.reportTopic);
  rows.sort((a, b) => b.updatedAt - a.updatedAt);
  return `<div class="page"><div class="page-head rise" style="--i:0"><div><div class="page-title">${icon('pen', 21)}研究成果<span class="faint fs13 num">${rows.length} 篇</span></div><div class="page-sub">每篇稿件都可直接编辑、按要求重写，并保留完整版本历史</div></div>
    <select class="select" data-action="report-filter"><option value="all">全部专题</option>${S.topics.map(t => `<option value="${t.id}" ${ui.reportTopic === t.id ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</select></div>
  <div class="table-card rise" style="--i:1"><div class="table-wrap"><table class="list-table"><thead><tr><th>稿件</th><th>类型</th><th class="hide-sm">写作 Skill</th><th class="hide-sm">字数</th><th>版本</th><th>更新时间</th><th style="text-align:right">操作</th></tr></thead><tbody>
  ${rows.map(r => { const sk = skillById(r.skillId); return `<tr data-action="report-open" data-id="${r.id}"><td><div class="cell-main"><span class="cm-ic" style="background:${reportColor(r)}">${icon(reportIcon(r), 17)}</span><div class="cm-text"><div class="cm-title"><span class="t">${esc(r.title)}</span></div><div class="cm-sub"><span>${esc((topicById(r.topicId) || {}).title || '')}</span>${r.requirements && r.requirements.length ? `<span>${r.requirements.length} 条要求</span>` : ''}</div></div></div></td>
  <td><span class="tag" style="background:${reportColor(r)}1A;color:${reportColor(r)}">${r.type}</span></td>
  <td class="hide-sm fs13 muted">${sk ? esc(sk.name) + ' v' + (r.skillVersion || 1) : '—'}</td>
  <td class="hide-sm num fs13">${wordsOf(r)}</td><td><span class="ver-chip sm" data-action="report-history" data-id="${r.id}">${icon('timeline', 12)}v${curVersion(r)}</span></td><td class="fs13 muted">${relTime(r.updatedAt)}</td>
  <td><div class="row-actions"><button class="mini-btn ok" data-action="report-open" data-id="${r.id}">查看/编辑</button><button class="mini-btn" data-action="report-export" data-id="${r.id}">导出</button><button class="mini-btn danger" data-action="report-del" data-id="${r.id}">删除</button></div></td></tr>`; }).join('')}
  </tbody></table></div>${rows.length ? `<div class="table-foot"><span>共 ${rows.length} 篇</span><span>导出为 Markdown，页码角标保留</span></div>` : emptyState('pen', '暂无稿件', '进入专题写作台生成第一篇')}</div></div>`;
}

/* ================= 任务 ================= */
function renderTasks() {
  const rows = [...S.tasks].sort((a, b) => b.startedAt - a.startedAt);
  return `<div class="page"><div class="page-head rise" style="--i:0"><div><div class="page-title">${icon('queue', 21)}生成任务</div><div class="page-sub">范文解析、Skill 提炼、联网检索与撰稿的执行情况</div></div><button class="btn btn-ghost" data-action="task-clear">${icon('trash', 15)}清理已完成</button></div>
  <div class="table-card rise" style="--i:1"><div class="table-wrap"><table class="list-table"><thead><tr><th>任务</th><th>类型</th><th class="hide-sm">所属专题</th><th>进度</th><th>开始时间</th><th>状态</th><th style="text-align:right">操作</th></tr></thead><tbody>
  ${rows.map(t => `<tr style="cursor:default"><td><b class="fs13">${esc(t.label)}</b><div class="faint fs12">${esc(t.detail || '')}</div></td><td>${taskKindTag(t.kind)}</td><td class="hide-sm fs13 muted">${esc((topicById(t.topicId) || {}).title || '—')}</td><td><div class="progress"><i style="width:${t.progress}%"></i></div><span class="faint fs12 num">${t.progress}%</span></td><td class="fs13 muted">${fmtDT(t.startedAt)}</td><td>${taskStatus(t)}</td>
  <td><div class="row-actions">${t.status === 'failed' ? `<button class="mini-btn gold" data-action="task-retry" data-id="${t.id}">重试</button>` : ''}${t.status === 'running' ? `<button class="mini-btn danger" data-action="task-cancel" data-id="${t.id}">取消</button>` : ''}${t.topicId ? `<button class="mini-btn" data-action="open-topic" data-id="${t.topicId}">查看专题</button>` : ''}</div></td></tr>`).join('')}
  </tbody></table></div><div class="table-foot"><span>共 ${rows.length} 个任务</span><span>资料入库在夜间自动执行，不影响白天写作</span></div></div></div>`;
}

/* ================= 偏好设置 ================= */
function renderSettings() {
  const p = S.prefs;
  const totalVersions = [...S.topics, ...S.skills, ...S.reports].reduce((a, o) => a + (o.versions || []).length, 0);
  return `<div class="page"><div class="page-head rise" style="--i:0"><div><div class="page-title">${icon('settings', 21)}写作偏好</div><div class="page-sub">这些默认值会应用到每一次生成，专题内仍可临时调整</div></div></div>
  <div class="ana-tiles rise" style="--i:1;grid-template-columns:repeat(4,1fr)">
    ${[['资料', S.corpus.length, '篇', 'globe', '#3E8EDE'], ['专题', S.topics.length, '个', 'book', '#0E3A5D'], ['写作 Skill', S.skills.length, '套', 'spark', '#7C5CFC'], ['历史版本', totalVersions, '个', 'timeline', '#0E9F8A']].map(([l, n, u, ic, c]) => `<div class="ana-tile" style="--tc:${c}"><div class="at-label">${icon(ic, 14)}${l}</div><div class="at-num"><span data-count="${n}">0</span><small>${u}</small></div></div>`).join('')}
  </div>
  <div class="card rise" style="--i:2;margin-bottom:16px"><div class="card-head"><span class="card-title">${icon('pen', 16)}生成默认值</span></div><div class="card-body"><div class="form-grid">
    <div class="field"><label>默认写作 Skill</label><select data-pref="defaultSkill">${S.skills.map(s => `<option value="${s.id}" ${p.defaultSkill === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select><span class="hint">新建专题时自动绑定</span></div>
    <div class="field"><label>默认篇幅</label><select data-pref="length">${[['brief', '精简（约 0.6 倍）'], ['standard', '标准（按 Skill 设定）'], ['deep', '详版（约 1.4 倍）']].map(([v, l]) => `<option value="${v}" ${p.length === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label>联网检索</label><div style="display:flex;align-items:center;gap:10px"><button class="switch ${p.webSearch ? 'on' : ''}" data-action="pref-toggle" data-key="webSearch"></button><span class="hint">生成时补充最新公开线索，并单独标注出处</span></div></div>
    <div class="field"><label>检索范围</label><select data-pref="webScope">${['官方+智库+媒体', '仅官方与智库', '全部公开来源'].map(x => `<option ${p.webScope === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
    <div class="field"><label>引用格式</label><select data-pref="citeStyle">${[['anchor', '正文页码角标'], ['footnote', '文末统一列出']].map(([v, l]) => `<option value="${v}" ${p.citeStyle === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field"><label>自动留痕</label><div style="display:flex;align-items:center;gap:10px"><button class="switch ${p.autoVersion ? 'on' : ''}" data-action="pref-toggle" data-key="autoVersion"></button><span class="hint">每次生成、编辑与回滚都自动存为版本</span></div></div>
  </div></div></div>
  <div class="card rise" style="--i:3;margin-bottom:16px"><div class="card-head"><span class="card-title">${icon('shield', 16)}写作规范</span><button class="btn btn-ghost sm" data-action="show-protocol">${icon('eye', 14)}查看完整规范</button></div>
    <div class="card-body"><div class="kv-grid">
      <div class="kv"><div class="kv-k">不做库外推测</div><div class="kv-v">专题资料未覆盖的问题，明确回复「资料中未提及」，不编造事实。</div></div>
      <div class="kv"><div class="kv-k">出处可点击</div><div class="kv-v">论断保留页码角标，点击直达原文段落；联网线索单独标注来源与日期。</div></div>
      <div class="kv"><div class="kv-k">智库身份显式</div><div class="kv-v">引用标明机构与国别，区分对象国、美欧与周边视角。</div></div>
      <div class="kv"><div class="kv-k">范文只学写法</div><div class="kv-v">上传范文仅用于提炼结构与风格，不作为事实证据写入新稿。</div></div>
    </div></div></div>
  <div class="card rise" style="--i:4"><div class="card-head"><span class="card-title">${icon('refresh', 16)}演示数据</span></div>
    <div class="card-body"><div class="funnel-note">${icon('info', 13)} 本工作台为可交互原型：资料库、联网线索与任务均为内置演示数据，上传范文与编辑操作真实生效并保存在本机浏览器。</div>
      <button class="btn btn-danger-ghost sm" data-action="user-reset" style="margin-top:12px">${icon('refresh', 14)}重置为初始演示数据</button></div></div></div>`;
}