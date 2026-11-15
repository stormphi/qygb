/* 观澜研究台 — 专题工作台：写作台 / 专题资料 / 溯源问答 / 专题设置 + 稿件编辑器 */
'use strict';

const ED = { reportId: null, editing: false, draft: null };
const TOPIC_TABS = [['write', '写作台', 'pen'], ['src', '专题资料', 'file'], ['chat', '溯源问答', 'chat'], ['set', '专题设置', 'settings']];

function renderTopic(id) {
  const t = topicById(id || ui.topicId); if (!t) return renderTopics();
  ui.topicId = t.id;
  const sk = t.skillId ? skillById(t.skillId) : null;
  const body = ui.topicTab === 'src' ? topicSources(t) : ui.topicTab === 'chat' ? topicChat(t) : ui.topicTab === 'set' ? topicSettings(t) : topicWrite(t, sk);
  return `<div class="page"><div class="page-head rise" style="--i:0">
    <div><div class="page-title"><button class="icon-btn" data-action="nav" data-page="topics">${icon('chevL', 18)}</button>${esc(t.title)}
      <span class="ver-chip" data-action="topic-history" data-id="${t.id}">${icon('timeline', 13)}v${curVersion(t)}</span></div>
      <div class="page-sub">${esc(t.region)} · ${esc(t.deliverable)} · 读者：${esc(t.audience)}</div></div>
    <div class="head-actions"><button class="btn btn-ghost" data-action="topic-edit" data-id="${t.id}">${icon('edit', 15)}编辑专题</button>
      <button class="btn btn-gold" data-action="up-open" data-id="${t.id}">${icon('upload', 15)}上传范文</button></div></div>
  <div class="topic-tabs rise" style="--i:1">${TOPIC_TABS.map(([k, l, ic]) => `<button class="tt ${ui.topicTab === k ? 'on' : ''}" data-action="topic-tab" data-tab="${k}">${icon(ic, 15)}${l}${k === 'src' ? `<em>${t.sourceIds.length}</em>` : ''}</button>`).join('')}</div>
  <div class="rise" style="--i:2">${body}</div></div>`;
}

/* ================= 写作台 ================= */
function topicWrite(t, sk) {
  const packs = S.packs.filter(p => p.topicId === t.id);
  const reports = reportsOf(t);
  if (!ED.reportId || !reportById(ED.reportId) || reportById(ED.reportId).topicId !== t.id) { ED.reportId = reports.length ? reports[0].id : null; ED.editing = false; ED.draft = null; }
  const rp = ED.reportId ? reportById(ED.reportId) : null;
  const rail = `<aside class="write-rail">
    <div class="card"><div class="card-head"><span class="card-title">${icon('spark', 16)}写作设置</span></div><div class="card-body">
      <div class="field full"><label>写作 Skill</label><select data-action="write-skill">${S.skills.map(s => `<option value="${s.id}" ${sk && s.id === sk.id ? 'selected' : ''}>${esc(s.name)} · v${curVersion(s)}</option>`).join('')}<option value="" ${!sk ? 'selected' : ''}>未绑定</option></select>
        ${sk ? `<span class="hint">${sk.outline.length} 节结构 · ${esc(sk.style.tone)} · ${sk.requirements.length} 条我的要求 <a class="link" data-action="open-skill" data-id="${sk.id}">编辑 Skill</a></span>` : `<span class="hint warn">尚未绑定，上传范文即可自动提炼一套</span>`}</div>
      <div class="field full" style="margin-top:12px"><label>证据范围</label><select id="genPack"><option value="">全部专题资料（${claimsOf(t).length} 条论据）</option>${packs.map(p => `<option value="${p.id}">论据篮：${esc(p.name)}（${p.claims.length} 条）</option>`).join('')}</select></div>
      <div class="field full" style="margin-top:12px"><label>稿件类型</label><select id="genType"><option value="内参">按 Skill 结构成稿</option><option value="矩阵">多智库立场碰撞矩阵</option></select></div>
      <div class="field full" style="margin-top:12px"><label>篇幅</label><select id="genLength">${[['brief', '精简'], ['standard', '标准'], ['deep', '详版']].map(([v, l]) => `<option value="${v}" ${S.prefs.length === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div class="switch-row"><span>${icon('globe', 14)}联网检索最新线索</span><button class="switch ${S.prefs.webSearch ? 'on' : ''}" data-action="pref-toggle" data-key="webSearch"></button></div>
      <button class="btn btn-primary" data-action="gen-run" data-id="${t.id}" style="width:100%;justify-content:center;margin-top:14px">${icon('spark', 15)}开始生成</button>
      <div class="hint" style="margin-top:8px">生成会新建一篇稿件，不会覆盖已有版本。</div>
    </div></div>
    <div class="card"><div class="card-head"><span class="card-title">${icon('layers', 16)}本篇结构</span></div><div class="card-body">
      ${sk ? `<div class="mini-outline">${sk.outline.map((o, i) => `<div class="mo-row"><i>${i + 1}</i><div><b>${esc(o.h)}</b><span>${esc(o.point)}</span></div><em>${o.words}字</em></div>`).join('')}</div>` : '<div class="hint">绑定 Skill 后显示结构骨架</div>'}
      ${sk && sk.requirements.length ? `<div class="sub-label" style="margin-top:12px">已沉淀的要求</div><div class="req-mini">${sk.requirements.map(r => `<div class="rm-row">${icon('check', 12)}<span>${esc(r.text)}</span></div>`).join('')}</div>` : ''}
    </div></div>
    <div class="card"><div class="card-head"><span class="card-title">${icon('file', 16)}稿件列表</span><span class="hint">${reports.length} 篇</span></div><div class="card-body">
      <div class="mini-list">${reports.map(r => `<div class="mini-item ${ED.reportId === r.id ? 'on' : ''}" data-action="report-select" data-id="${r.id}"><span class="mi-ic" style="background:${reportColor(r)}">${icon(reportIcon(r), 15)}</span><div class="mi-main"><div class="mi-title">${esc(r.title)}</div><div class="mi-sub"><span>v${curVersion(r)}</span><span>${wordsOf(r)} 字</span><span>${relTime(r.updatedAt)}</span></div></div></div>`).join('') || '<div class="pop-empty">还没有稿件</div>'}</div>
    </div></div>
  </aside>`;
  return `<div class="write-layout">${rail}<section class="write-main">${rp ? draftPanel(t, rp) : emptyDraft(t, sk)}</section></div>`;
}
function emptyDraft(t, sk) {
  return `<div class="card draft-card"><div class="card-body">${emptyState('pen', '这个专题还没有稿件', sk ? `已绑定「${esc(sk.name)}」，点击左侧「开始生成」即可按 ${sk.outline.length} 节结构成稿。` : '先上传一份您认可的报告，系统会提炼写作思路与风格，再结合专题资料成稿。',
    `<div class="empty-acts">${sk ? `<button class="btn btn-primary" data-action="gen-run" data-id="${t.id}">${icon('spark', 15)}开始生成</button>` : ''}<button class="btn btn-gold" data-action="up-open" data-id="${t.id}">${icon('upload', 15)}上传范文提炼 Skill</button></div>`)}</div></div>`;
}
function draftPanel(t, rp) {
  const sk = skillById(rp.skillId);
  const d = ED.editing ? ED.draft : rp;
  const reqs = rp.requirements || [];
  const head = `<div class="draft-head">
    <div class="dh-top"><span class="dw-type" style="background:${reportColor(rp)}">${icon(reportIcon(rp), 13)}${rp.type}</span>
      <span class="ver-chip" data-action="report-history" data-id="${rp.id}">${icon('timeline', 13)}v${curVersion(rp)} · ${rp.versions.length} 个版本</span>
      ${sk ? `<span class="chip violet sm">${esc(sk.name)} v${rp.skillVersion || 1}</span>` : ''}
      <span class="spacer"></span><span class="hint">${fmtDT(rp.updatedAt)} 更新</span></div>
    ${ED.editing ? `<input class="draft-title-input" id="edTitle" value="${esc(d.title)}" placeholder="稿件标题">` : `<h2 class="draft-title">${esc(rp.title)}</h2>`}
    <div class="dh-meta"><span>${icon('file', 12)}${wordsOf(d)} 字</span><span>${icon('book', 12)}资料 ${rp.docUsed ? rp.docUsed.length : 0} 篇</span><span>${icon('globe', 12)}联网 ${rp.webUsed ? rp.webUsed.length : 0} 条</span><span>${icon('layers', 12)}${(d.sections || []).length} 节</span></div>
    ${reqs.length ? `<div class="dh-reqs">${requirementStatus(reqs).map(r => `<span class="chip ${r.type === 'note' ? 'gold' : 'magenta'} sm" title="${esc(r.text)}">${icon(r.type === 'note' ? 'info' : 'check', 11)}${esc(r.label)}</span>`).join('')}<span class="hint">本篇落实的写作要求</span></div>` : ''}
  </div>`;
  const body = ED.editing ? editBody(d) : readBody(rp);
  const foot = ED.editing
    ? `<div class="draft-foot"><input id="edNote" placeholder="版本说明，例如：调整第二节措辞、补充数据"><span class="spacer"></span><button class="btn btn-ghost" data-action="edit-cancel">取消</button><button class="btn btn-primary" data-action="edit-save" data-id="${rp.id}">${icon('save', 15)}保存为新版本 v${curVersion(rp) + 1}</button></div>`
    : `<div class="draft-foot"><button class="btn btn-ghost sm" data-action="edit-start" data-id="${rp.id}">${icon('edit', 14)}直接编辑</button>
        <button class="btn btn-ghost sm" data-action="report-history" data-id="${rp.id}">${icon('timeline', 14)}历史版本</button>
        <button class="btn btn-ghost sm" data-action="report-export" data-id="${rp.id}">${icon('download', 14)}导出</button>
        <span class="spacer"></span><button class="btn btn-danger-ghost sm" data-action="report-del" data-id="${rp.id}">${icon('trash', 14)}删除</button></div>`;
  const ask = ED.editing ? '' : `<div class="ask-card">
    <div class="ask-head">${icon('msg', 15)}<b>对这篇稿子提要求</b><span class="hint">系统会按要求重写；勾选后要求同时沉淀进写作 Skill，下次自动生效</span></div>
    <div class="ask-chips">${['每节末尾补一句风险提示', '新增一节：对我企业的具体影响', '压缩到 800 字以内', '口吻更克制，去掉夸张形容词', '关键判断都要有量化数据'].map(q => `<button class="suggest-chip" data-action="ask-chip" data-q="${esc(q)}">${q}</button>`).join('')}</div>
    <textarea id="askInput" rows="2" placeholder="例如：第二节要区分官方表态与智库判断，并补上最新时间节点"></textarea>
    <div class="ask-foot"><label class="checkbox-line"><input type="checkbox" class="checkbox" id="askToSkill" checked><span>同时写入写作 Skill「${esc(sk ? sk.name : '未绑定')}」</span></label><span class="spacer"></span>
      <button class="btn btn-primary" data-action="ask-rewrite" data-id="${rp.id}">${icon('refresh', 15)}按此要求重写</button></div>
  </div>`;
  return `<div class="card draft-card">${head}<div class="draft-body">${body}</div>${foot}</div>${ask}`;
}
function readBody(rp) {
  let html = '';
  if (rp.matrix) html += matrixHtml(rp.matrix);
  html += (rp.sections || []).map(s => `<div class="rp-section"><h4>${esc(s.h)}</h4>${String(s.p).split('\n').map(line => `<p>${renderCites(line)}</p>`).join('')}</div>`).join('');
  const webs = (rp.webUsed || []).map(webById).filter(Boolean);
  if (webs.length) html += `<div class="src-block"><div class="sub-label">${icon('globe', 13)}本篇引用的联网线索</div>${webs.map(w => `<div class="web-row">${icon('globe', 13)}<div><b>${esc(w.title)}</b><span>${esc(w.source)} · ${w.date} · ${esc(w.tag)}</span><em>${esc(w.snippet)}</em></div>${citeChip(w.id)}</div>`).join('')}</div>`;
  return html;
}

const ANCHOR_G = /\[(doc_\d+_p\d+_c\d+|web_\d+)\]/g;
function editBody(d) {
  let html = `<div class="edit-hint">${icon('edit', 13)} 可直接修改标题与正文（包括引用的原文表述），保存后生成新版本；旧版本完整保留，可随时对比或恢复。</div>`;
  if (d.matrix) {
    html += `<div class="table-wrap" style="margin-bottom:14px"><table class="matrix-table"><thead><tr><th style="width:140px">智库 / 立场</th>${d.matrix.cols.map(c => `<th>${esc(c)}</th>`).join('')}<th>关键原话（溯源）</th></tr></thead><tbody>
      ${d.matrix.rows.map((r, ri) => `<tr><td class="org">${esc(r.org)}<br><span class="stance-cell" style="background:${stanceColor(r.stance)}">${esc(r.stance)}</span></td>
        ${r.cells.map((c, ci) => `<td><textarea class="mx-cell" rows="2" data-mx="${ri}-${ci}">${esc(c)}</textarea></td>`).join('')}
        <td><textarea class="mx-cell" rows="2" data-mx="${ri}-q">${esc(r.quote)}</textarea></td></tr>`).join('')}
    </tbody></table></div>`;
  }
  html += `<div class="edit-sections" id="editSections">${(d.sections || []).map((s, i) => `<div class="es-row" data-sid="${s.id}">
    <div class="es-head"><span class="es-n">${i + 1}</span><input class="es-h" value="${esc(s.h)}" data-es="h" data-sid="${s.id}" placeholder="小节标题">
      <div class="es-btns"><button class="icon-btn xs" data-action="es-up" data-sid="${s.id}" title="上移">${icon('arrowUp', 14)}</button><button class="icon-btn xs" data-action="es-down" data-sid="${s.id}" title="下移">${icon('arrowDown', 14)}</button><button class="icon-btn xs danger" data-action="es-del" data-sid="${s.id}" title="删除本节">${icon('trash', 14)}</button></div></div>
    <textarea class="es-p" rows="6" data-es="p" data-sid="${s.id}" placeholder="正文，可保留 [doc_05_p9_c1] 形式的页码角标">${esc(s.p)}</textarea>
    <div class="es-foot"><span class="hint">${s.p.length} 字</span><span class="hint">${(s.p.match(ANCHOR_G) || []).length} 处出处</span></div>
  </div>`).join('')}</div>
  <button class="btn btn-ghost sm" data-action="es-add" style="margin-top:10px">${icon('plus', 14)}添加小节</button>`;
  return html;
}
function matrixHtml(mx) {
  return `<div class="table-wrap" style="margin-bottom:16px"><table class="matrix-table"><thead><tr><th style="width:150px">智库 / 立场</th>${mx.cols.map(c => `<th>${esc(c)}</th>`).join('')}<th>关键原话（溯源）</th></tr></thead><tbody>${mx.rows.map(r => `<tr><td class="org">${esc(r.org)}<br><span class="stance-cell" style="background:${stanceColor(r.stance)}">${esc(r.stance)}</span></td>${r.cells.map(c => `<td>${esc(c)}</td>`).join('')}<td>${renderCites(r.quote)}</td></tr>`).join('')}</tbody></table></div>`;
}

/* ---------- 编辑操作 ---------- */
function editStart(id) {
  const rp = reportById(id); if (!rp) return;
  ED.reportId = id; ED.editing = true;
  ED.draft = clone({ title: rp.title, sections: rp.sections, matrix: rp.matrix || null });
  render();
  const el = document.getElementById('edTitle'); if (el) el.focus();
}
function editCancel() { ED.editing = false; ED.draft = null; render(); }
function editSave(id) {
  const rp = reportById(id); if (!rp || !ED.draft) return;
  const title = (document.getElementById('edTitle') || {}).value || rp.title;
  if (!title.trim()) { toast('标题不能为空', { type: 'warn' }); return; }
  if (!ED.draft.sections.length) { toast('至少保留一个小节', { type: 'warn' }); return; }
  const note = ((document.getElementById('edNote') || {}).value || '').trim();
  const before = snapText('report', snapOf('report', rp));
  rp.title = title.trim(); rp.sections = clone(ED.draft.sections); if (ED.draft.matrix) rp.matrix = clone(ED.draft.matrix);
  const after = snapText('report', snapOf('report', rp));
  if (before === after) { ED.editing = false; ED.draft = null; render(); toast('内容没有变化，未生成新版本', { type: 'info' }); return; }
  const st = diffStat(before, after);
  const v = pushVersion('report', rp, 'edit', note || `手工编辑：新增 ${st.add} 行、删除 ${st.del} 行`);
  ED.editing = false; ED.draft = null; saveState(); render();
  toast(`已保存为 v${v.n}（+${st.add} / −${st.del} 行），可在历史版本中对比`);
}
function renumberSections(arr) { arr.forEach((s, i) => { s.h = s.h.replace(/^[一二三四五六七八九十\d]+([、.．)）])/, (m, p) => (CN_NUM[i + 1] || i + 1) + p); }); }
function esMove(sid, dir) {
  const arr = ED.draft.sections; const i = arr.findIndex(s => s.id === sid); const j = i + dir;
  if (i < 0 || j < 0 || j >= arr.length) return;
  [arr[i], arr[j]] = [arr[j], arr[i]]; renumberSections(arr); render();
}
function esDel(sid) {
  const arr = ED.draft.sections; const i = arr.findIndex(s => s.id === sid); if (i < 0) return;
  const snap = arr[i]; arr.splice(i, 1); renumberSections(arr); render();
  toast('已移除小节（保存前可撤销）', { undo: () => { arr.splice(i, 0, snap); renumberSections(arr); render(); } });
}
function esAdd() { ED.draft.sections.push({ id: uid(), h: `${CN_NUM[ED.draft.sections.length + 1] || ED.draft.sections.length + 1}、新增小节`, p: '' }); render(); const list = document.querySelectorAll('.es-p'); if (list.length) list[list.length - 1].focus(); }

/* ---------- 提要求重写 ---------- */
function askRewrite(id) {
  const rp = reportById(id); if (!rp) return;
  const inp = document.getElementById('askInput'); const text = (inp ? inp.value : '').trim();
  if (!text) { toast('请先写下您的要求', { type: 'warn' }); inp && inp.focus(); return; }
  const toSkill = !!(document.getElementById('askToSkill') || {}).checked;
  const t = topicById(rp.topicId); const sk = skillById(rp.skillId || (t && t.skillId));
  if (toSkill && sk) {
    sk.requirements.push(req(text, '用户'));
    const parsed = parseRequirement(text);
    if (REQ_MUST[parsed.type] && !sk.must.includes(REQ_MUST[parsed.type])) sk.must.push(REQ_MUST[parsed.type]);
    pushVersion('skill', sk, 'require', `沉淀写作要求：${text.slice(0, 28)}${text.length > 28 ? '…' : ''}`);
  }
  saveState();
  runGeneration({ topicId: rp.topicId, skillId: sk ? sk.id : null, extraReq: text, targetReportId: rp.id, web: S.prefs.webSearch, length: S.prefs.length, type: rp.type });
}

/* ================= 专题资料 ================= */
function topicSources(t) {
  const docs = t.sourceIds.map(docById).filter(Boolean);
  const ups = uploadsOf(t);
  return `<div class="src-layout">
    <div class="card"><div class="card-head"><span class="card-title">${icon('file', 16)}写作证据 · ${docs.length} 篇</span>
      <span class="head-actions"><button class="btn btn-ghost sm" data-action="open-compile">${icon('spark', 14)}智能组卷</button><button class="btn btn-soft sm" data-action="corpus-add-nb" data-id="${t.id}">${icon('plus', 14)}添加资料</button></span></div>
      <div class="card-body"><div class="src-grid">${docs.map(d => `<div class="src-card">
        <div class="sc-top"><span class="src-org">${esc(d.org)}</span>${docStatus(d)}<span class="spacer"></span><button class="icon-btn xs danger" data-action="src-remove" data-id="${d.id}" data-tid="${t.id}" title="移出专题">${icon('x', 14)}</button></div>
        <div class="src-title">${esc(d.title)}</div>
        <div class="src-meta"><span class="stance-dot" style="background:${stanceColor(d.stance)}"></span>${esc(d.stance)}<span>${d.date}</span><span>${d.lang}</span><span>${d.pages}p</span></div>
        ${d.summary ? `<div class="guide-card">${esc(d.summary)}<div>${d.tags.map(x => `<span class="gc-tag">${esc(x)}</span>`).join('')}</div></div>` : '<div class="guide-card faint">尚未生成导读卡，点击下方按钮立即补齐</div>'}
        <div class="src-acts"><button class="mini-btn" data-action="src-pdf" data-id="${d.id}">${icon('eye', 12)}原文与论据</button>${d.status !== 'ready' ? `<button class="mini-btn gold" data-action="jit-doc" data-id="${d.id}">${icon('zap', 12)}补齐导读卡</button>` : `<span class="hint">${d.claims.length} 条可用论据</span>`}</div>
      </div>`).join('') || emptyState('file', '专题还没有资料', '从资料库添加，或用智能组卷快速挑选')}</div></div></div>
    <div class="card"><div class="card-head"><span class="card-title">${icon('upload', 16)}我的范文 · ${ups.length} 份</span><button class="btn btn-gold sm" data-action="up-open" data-id="${t.id}">${icon('upload', 14)}上传范文</button></div>
      <div class="card-body">${ups.map(u => { const sk = skillById(u.skillId); return `<div class="up-row">${icon('file', 18)}<div class="ur-main"><b>${esc(u.name)}</b><span class="hint">${u.chars} 字 · v${curVersion(u)} · ${fmtDT(u.time)} · ${esc(u.by)} 上传${sk ? ` · 已提炼为「${esc(sk.name)}」` : ''}</span></div>
        <div class="ur-acts">${sk ? `<button class="mini-btn ok" data-action="open-skill" data-id="${sk.id}">查看 Skill</button>` : ''}<button class="mini-btn" data-action="up-view" data-id="${u.id}">${icon('edit', 12)}编辑正文</button><button class="mini-btn" data-action="up-history" data-id="${u.id}">历史 v${curVersion(u)}</button><button class="mini-btn gold" data-action="up-redistill" data-id="${u.id}">重新提炼</button></div></div>`; }).join('') || '<div class="pop-empty">还没有上传范文。上传一份您认可的报告，即可提炼出专属写作 Skill。</div>'}
        <div class="funnel-note" style="margin-top:10px">${icon('edit', 13)} 范文正文可直接编辑，每次修改自动留版本；系统不会改动您的原文。「重新提炼」以最新正文为准，只学写法、不作为稿件事实证据。</div></div></div>
  </div>`;
}

/* ================= 溯源问答 ================= */
function topicChat(t) {
  const docs = t.sourceIds.map(docById).filter(Boolean);
  if (!ui.pdfDoc || !t.sourceIds.includes(ui.pdfDoc)) ui.pdfDoc = docs.length ? docs[0].id : null;
  return `<div class="chat-layout">
    <div class="card chat-card"><div class="card-head"><span class="card-title">${icon('chat', 16)}围绕本专题提问</span><span class="hint">平均首字 ${avgRT()}s · 答案均带页码角标</span></div>
      <div class="chat-thread" id="chatThread">${t.chats.map(msgHtml).join('') || '<div class="pop-empty">围绕本专题提问，系统会基于导读卡与原文切片带角标回答；资料未覆盖时会明确说明。</div>'}</div>
      <div class="composer"><div class="suggest-chips">${['整体有哪几种观点？', '终裁税率是多少？', '各方核心分歧是什么？'].map(q => `<button class="suggest-chip" data-action="suggest" data-q="${esc(q)}" data-id="${t.id}">${q}</button>`).join('')}</div>
        <div class="composer-row"><textarea id="chatInput" rows="1" placeholder="输入研究问题，Enter 发送…"></textarea><button class="send-btn" data-action="chat-send" data-id="${t.id}">${icon('send', 18)}</button></div></div></div>
    <div class="card pdf-card"><div class="pdf-toolbar"><select class="select sm" data-action="pdf-select">${docs.map(d => `<option value="${d.id}" ${ui.pdfDoc === d.id ? 'selected' : ''}>${esc(d.org)} · ${esc(d.title.slice(0, 18))}</option>`).join('')}</select></div>
      ${ui.pdfDoc ? pdfViewer(docById(ui.pdfDoc)) : '<div class="pop-empty">专题暂无资料</div>'}</div>
  </div>`;
}
function msgHtml(m) {
  if (m.role === 'user') return `<div class="msg user">${avatar(ME.name, 'sm')}<div class="msg-bubble">${esc(m.text)}</div></div>`;
  if (m.pending) return `<div class="msg ai">${avatar('观', 'sm')}<div class="msg-bubble"><span class="typing"><i></i><i></i><i></i></span> ${esc(m.stage || '检索导读卡与原文切片…')}</div></div>`;
  return `<div class="msg ai">${avatar('观', 'sm')}<div style="min-width:0;flex:1"><div class="msg-bubble">${renderCites(m.text)}</div><div class="msg-meta"><span class="path-tag path-${m.path}">${m.path === 'A' ? '导读卡速答' : '原文精准切片'}</span><span>首字 ${m.rt}s</span><span>${relTime(m.time)}</span></div></div></div>`;
}
function pdfViewer(d) {
  if (!d) return '<div class="pop-empty">未选择资料</div>';
  const pageSet = new Set((d.claims || []).map(c => c.page));
  if (ui.pdfHl) { const hc = claimById(ui.pdfHl); if (hc) pageSet.add(hc.page); }
  if (!pageSet.size) pageSet.add(1);
  const pages = [...pageSet].sort((a, b) => a - b).slice(0, 8);
  let html = `<div class="pdf-viewer" id="pdfViewer">`;
  for (const p of pages) {
    const paras = (d.claims || []).filter(c => c.page === p);
    html += `<div class="pdf-page"><div class="pg-title">${esc(d.title)} · 第 ${p} 页</div>`;
    html += paras.length ? paras.map(c => `<div class="pdf-para ${ui.pdfHl === c.id ? 'hl' : ''}" id="para-${c.id}">${esc(c.text)} <span class="mono faint fs12">[${c.id}]</span></div>`).join('') : `<div class="pdf-para faint">（本页为章节过渡与图表，略）…${esc(d.summary || '待解析')}</div>`;
    html += `<span class="pg-no">- ${p} -</span></div>`;
  }
  return html + '</div>';
}

/* ================= 专题设置 ================= */
function topicSettings(t) {
  return `<div class="set-layout"><div class="card"><div class="card-head"><span class="card-title">${icon('edit', 16)}专题信息</span><span class="hint">修改后保存会生成新版本</span></div>
    <div class="card-body"><div class="form-grid">
      <div class="field full"><label>专题名称</label><input value="${esc(t.title)}" data-tp="title" data-id="${t.id}"></div>
      <div class="field"><label>区域</label><select data-tp="region" data-id="${t.id}">${['欧洲', '东南亚', '中东', '北美', '东亚', '欧亚', '拉美', '非洲', '全球'].map(r => `<option ${t.region === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
      <div class="field"><label>交付形式</label><input value="${esc(t.deliverable)}" data-tp="deliverable" data-id="${t.id}"></div>
      <div class="field full"><label>研究目标</label><textarea rows="3" data-tp="desc" data-id="${t.id}">${esc(t.desc)}</textarea></div>
      <div class="field full"><label>读者对象</label><input value="${esc(t.audience)}" data-tp="audience" data-id="${t.id}"></div>
      <div class="field full"><label>写作 Skill</label><select data-tp="skillId" data-id="${t.id}"><option value="">未绑定</option>${S.skills.map(s => `<option value="${s.id}" ${t.skillId === s.id ? 'selected' : ''}>${esc(s.name)} · v${curVersion(s)}</option>`).join('')}</select></div>
    </div>
    <div class="sub-label" style="margin-top:16px">关注问题（写作时优先回答）</div>
    <div class="q-list">${t.questions.map((q, i) => `<div class="q-row"><span>${i + 1}</span><input value="${esc(q)}" data-tq="${i}" data-id="${t.id}"><button class="icon-btn xs danger" data-action="tq-del" data-id="${t.id}" data-i="${i}">${icon('x', 14)}</button></div>`).join('')}</div>
    <div class="req-add"><input id="tqInput" placeholder="补充一个关注问题"><button class="btn btn-soft sm" data-action="tq-add" data-id="${t.id}">${icon('plus', 14)}添加</button></div>
    <div class="sub-label" style="margin-top:16px">关键词（影响资料匹配与联网检索）</div>
    <div class="chip-line editable">${t.keywords.map((w, i) => `<span class="chip sky">${esc(w)}<button class="chip-x" data-action="tk-del" data-id="${t.id}" data-i="${i}">${icon('x', 11)}</button></span>`).join('')}<input class="chip-input" placeholder="+ 添加后回车" data-tk="${t.id}"></div>
    <div class="set-foot"><input id="tpNote" placeholder="版本说明，例如：调整读者对象与关注问题"><span class="spacer"></span><button class="btn btn-primary" data-action="topic-save" data-id="${t.id}">${icon('save', 15)}保存为新版本 v${curVersion(t) + 1}</button></div>
    </div></div>
  <div class="card"><div class="card-head"><span class="card-title">${icon('timeline', 16)}版本历史</span><button class="btn btn-ghost sm" data-action="topic-history" data-id="${t.id}">查看全部</button></div>
    <div class="card-body"><div class="ver-mini">${[...t.versions].reverse().slice(0, 5).map(v => `<div class="vm-row"><span class="vm-n" style="background:${KIND_COLOR[v.kind]}">v${v.n}</span><div><b>${esc(v.note)}</b><span>${fmtDT(v.time)} · ${esc(v.author)} · ${KIND_LABEL[v.kind]}</span></div><button class="mini-btn" data-action="ver-view" data-kind="topic" data-id="${t.id}" data-vid="${v.id}">查看</button></div>`).join('')}</div>
      <div class="sub-label" style="margin-top:16px">危险操作</div>
      <button class="btn btn-danger-ghost sm" data-action="topic-del" data-id="${t.id}">${icon('trash', 14)}删除专题</button>
      <div class="hint" style="margin-top:6px">删除后可在提示条中撤销；专题下的稿件会一并移除。</div>
    </div></div></div>`;
}