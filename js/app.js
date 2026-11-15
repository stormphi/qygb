/* 观澜研究台 — 路由 / 事件 / 问答与组卷 */
'use strict';
const PAGE_TITLES = { dashboard: '研究工作台', topics: '我的专题', topic: '专题工作台', skills: '写作 Skill', skill: 'Skill 编辑', corpus: '研究资料库', packs: '论据篮', reports: '研究成果', tasks: '生成任务', settings: '写作偏好' };
const PAGES = {
  dashboard: renderDashboard, topics: renderTopics, topic: () => renderTopic(ui.topicId),
  skills: renderSkills, skill: () => renderSkillPage(ui.skillId), corpus: renderCorpus,
  packs: renderPacks, reports: renderReports, tasks: renderTasks, settings: renderSettings
};
let refocusQ = null, chatBusy = false, chatTimers = [], saveTimer = null, DND = null;
function queueSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveState, 350); }

function go(page, id) {
  ui.page = page;
  if (id) { if (page === 'topic') ui.topicId = id; if (page === 'skill') ui.skillId = id; }
  closePops(); render();
  const main = document.getElementById('main'); if (main) main.scrollTop = 0;
}
function render() {
  const fn = PAGES[ui.page] || renderDashboard;
  document.getElementById('main').innerHTML = fn();
  const navPage = ui.page === 'topic' ? 'topics' : ui.page === 'skill' ? 'skills' : ui.page;
  renderNav(navPage); updateBadges();
  const t = ui.page === 'topic' ? topicById(ui.topicId) : null;
  const sk = ui.page === 'skill' ? skillById(ui.skillId) : null;
  document.getElementById('crumb').innerHTML = `<strong>${esc(t ? t.title : sk ? sk.name : PAGE_TITLES[ui.page])}</strong><span>${t ? '专题 · 资料 / Skill / 稿件' : sk ? '写作思路与风格' : '观澜 · 区域国别研究写作台'}</span>`;
  animateNums(document.getElementById('main'));
  const th = document.getElementById('chatThread'); if (th) th.scrollTop = th.scrollHeight;
  if (ui.pdfHl) scrollHl();
  if (refocusQ !== null) { const inp = document.querySelector(`input[data-filter="q"][data-page="${refocusQ}"]`); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } refocusQ = null; }
}
function scrollHl() { requestAnimationFrame(() => { const el = document.getElementById('para-' + ui.pdfHl); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }); }

/* ---------- 折叠 / 弹层 ---------- */
function applyCollapse() { document.getElementById('app').classList.toggle('collapsed', S.collapsed); const b = document.getElementById('collapseBtn'); b.innerHTML = icon(S.collapsed ? 'chevR' : 'chevL', 17); b.title = S.collapsed ? '展开侧栏' : '收起侧栏'; }
function closePops() { document.getElementById('notifPop').classList.remove('open'); document.getElementById('userPop').classList.remove('open'); }
function toggleNotif() {
  const p = document.getElementById('notifPop'); const open = p.classList.contains('open'); closePops(); if (open) return;
  const rows = [...S.tasks].sort((a, b) => b.startedAt - a.startedAt).slice(0, 6);
  p.innerHTML = `<div class="pop-head">${icon('bell', 15)}任务通知<button class="mini-btn" data-action="nav" data-page="tasks" style="margin-left:auto">全部任务</button></div><div class="pop-list">${rows.map(t => `<div class="pop-item" data-action="nav" data-page="tasks"><span class="mi-ic" style="background:${(TASK_KINDS[t.kind] || TASK_KINDS.write).color}">${icon(t.status === 'failed' ? 'alert' : t.status === 'running' ? 'refresh' : 'check', 15)}</span><div class="mi-main"><div class="mi-title">${esc(t.label)}</div><div class="mi-sub">${taskStatus(t)} · ${relTime(t.startedAt)}</div></div></div>`).join('') || '<div class="pop-empty">暂无通知</div>'}</div>`;
  p.classList.add('open'); S.notifRead = now(); saveState();
}
function toggleUser() {
  const p = document.getElementById('userPop'); const open = p.classList.contains('open'); closePops(); if (open) return;
  p.innerHTML = `<div class="user-pop-head">${avatar(ME.name, 'lg')}<div><b>${ME.name}</b><span>${ME.dept} · ${ME.role}</span></div></div>
    <button class="pop-menu-item" data-action="user-about">${icon('info', 16)}关于观澜研究台</button>
    <button class="pop-menu-item" data-action="show-protocol">${icon('shield', 16)}写作与引用规范</button>
    <button class="pop-menu-item" data-action="nav" data-page="settings">${icon('settings', 16)}写作偏好</button>
    <button class="pop-menu-item danger" data-action="user-reset">${icon('refresh', 16)}重置演示数据</button>`;
  p.classList.add('open');
}

/* ---------- 溯源 ---------- */
function citeJump(id) {
  if (/^web_/.test(id)) {
    const w = webById(id); if (!w) { toast('未找到该联网线索', { type: 'warn' }); return; }
    openModal(`<div class="md-head"><h3>${icon('globe', 17)}联网线索</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div>
      <div class="md-body"><div class="web-detail"><div class="wd-title">${esc(w.title)}</div><div class="wd-meta"><span class="chip sky">${esc(w.source)}</span><span class="chip">${w.date}</span><span class="chip gold">${esc(w.tag)}</span></div><p class="wd-snip">${esc(w.snippet)}</p>
        <div class="funnel-note">${icon('info', 13)} 演示环境中的内置线索。接入真实检索后，此处显示原文摘要与可跳转链接。</div></div></div>
      <div class="md-foot"><span class="hint mono">${w.id}</span><button class="btn btn-primary" data-action="modal-close">关闭</button></div>`);
    return;
  }
  const c = claimById(id); if (!c) { toast('未找到该角标对应的原文切片', { type: 'warn' }); return; }
  const d = docById(c.doc);
  const t = ui.page === 'topic' ? topicById(ui.topicId) : null;
  if (t && t.sourceIds.includes(c.doc) && ui.topicTab === 'chat') {
    ui.pdfDoc = c.doc; ui.pdfHl = id; render(); toast(`已定位 ${d.org} 第 ${c.page} 页`, { type: 'info', duration: 2200 }); return;
  }
  ui.pdfHl = id;
  openModal(`<div class="md-head"><h3>${icon('anchor', 17)}原文溯源 · ${esc(d.org)}</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div>
    <div class="md-body" style="padding:0"><div class="pdf-viewer" style="max-height:62vh">${pdfViewer(Object.assign({}, d))}</div></div>
    <div class="md-foot"><span class="hint">角标 ${id} · 第 ${c.page} 页</span><button class="btn btn-primary" data-action="modal-close">关闭</button></div>`, true);
  scrollHl();
}

/* ---------- 问答 ---------- */
const MACRO_RE = /(整体|总体|概览|综述|几种|哪些观点|分歧|立场|总结|概括|梳理|看法)/;
function answerFor(t, q) {
  const docs = t.sourceIds.map(docById).filter(d => d && d.status === 'ready');
  const claims = docs.flatMap(d => d.claims);
  const macro = MACRO_RE.test(q);
  const rt = +((macro ? 0.55 : 0.85) + Math.random() * 0.25).toFixed(2);
  if (macro) {
    const byStance = {}; docs.forEach(d => { (byStance[d.stance] = byStance[d.stance] || []).push(d); });
    const parts = Object.entries(byStance).slice(0, 4).map(([st, ds]) => { const rep = ds.find(d => d.claims.length) || ds[0]; const cite = rep.claims[0] ? ` [${rep.claims[0].id}]` : ''; return `${st}派（${ds.map(d => d.org).join('、')}）：${rep.summary ? rep.summary.slice(0, 46) + '…' : '主张见导读卡'}${cite}`; });
    return { path: 'A', rt, text: parts.length ? `基于 ${docs.length} 篇导读卡，本专题整体呈现 ${parts.length} 类立场：\n` + parts.map((p, i) => `${'①②③④'[i]} ${p}`).join('\n') + '\n如需某一方的具体论据与页码，可继续追问细节。' : '当前专题暂无就绪资料，请先添加或解析研报。' };
  }
  const g = grams(q);
  const scored = claims.map(c => { const d = docById(c.doc); return { c, d, s: scoreText((c.text + d.title + d.org + d.tags.join('') + (d.summary || '')).toLowerCase(), g) }; }).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
  if (!scored.length) return { path: 'A', rt, text: '当前专题选定资料中未提及此内容。依据写作规范，我不做库外推测。建议：① 用「智能组卷」补充相关研报；② 换用更具体的政策／税率／时间线提问；③ 在写作台开启联网检索，获取最新公开线索。' };
  const top = scored.slice(0, 3);
  return { path: 'B', rt, text: top.map(({ c, d }) => `据${d.org}（${d.date}）报告，${c.text} [${c.id}]`).join('。\n') + '。\n以上论据均来自专题内原文切片并保留页码锚点，点击角标可跳回原文核对。' };
}
function sendChat(tid) {
  if (chatBusy) return;
  const t = topicById(tid); const inp = document.getElementById('chatInput'); if (!t || !inp) return;
  const q = inp.value.trim(); if (!q) { toast('请输入研究问题', { type: 'warn' }); return; }
  inp.value = ''; inp.style.height = 'auto'; chatBusy = true;
  t.chats.push({ role: 'user', text: q, time: now() });
  const ans = answerFor(t, q);
  t.chats.push({ role: 'ai', pending: true, stage: ans.path === 'A' ? '读取专题导读卡…' : '检索原文精准切片…', time: now() });
  renderChat(t); saveState();
  const t1 = setTimeout(() => {
    const m = t.chats[t.chats.length - 1]; delete m.pending; m.text = ''; m.path = ans.path; m.rt = ans.rt;
    renderChat(t);
    const bubble = document.querySelector('#chatThread .msg.ai:last-child .msg-bubble');
    let i = 0;
    const timer = setInterval(() => {
      i = Math.min(ans.text.length, i + 3);
      if (bubble) { bubble.textContent = ans.text.slice(0, i); const th = document.getElementById('chatThread'); if (th) th.scrollTop = th.scrollHeight; }
      if (i >= ans.text.length) { clearInterval(timer); m.text = ans.text; renderChat(t); chatBusy = false; saveState(); }
    }, 16);
    chatTimers.push(timer);
    S.metrics.queries++; S.metrics.rtSum += ans.rt; saveState();
  }, ans.rt * 1000);
  chatTimers.push(t1);
}
function renderChat(t) { const th = document.getElementById('chatThread'); if (th) { th.innerHTML = t.chats.map(msgHtml).join(''); th.scrollTop = th.scrollHeight; } }
function clearChat() { chatTimers.forEach(x => { clearInterval(x); clearTimeout(x); }); chatTimers = []; chatBusy = false; }

/* ---------- 待解析资料补齐 ---------- */
const JIT_CONTENT = {
  doc_19: { summary: '回顾中欧全面投资协定（CAI）谈判得失，认为市场准入与公平竞争条款可为当前电动汽车磋商提供模板，主张以规则导向化解摩擦。', claims: [C('doc_19', 6, 1, 'CAI 中的“竞争中性”条款可作为电动汽车补贴磋商的对等参照框架。', { date: '2019-06' }), C('doc_19', 14, 2, '投资协定谈判经验表明，分阶段承诺比一揽子关税更具可持续性。')] },
  doc_20: { summary: '分析拉美“锂三角”资源治理与产业化路径，提醒资源民族主义与外资技术转移之间的张力，对印尼镍政策有比较借鉴意义。', claims: [C('doc_20', 8, 1, '智利、阿根廷、玻利维亚锂储量占全球约 56%，但本地加工率不足 15%。', { date: '2018-11' }), C('doc_20', 17, 2, '建议以“资源换技术”阶梯式合资模式提升拉美锂产业本地增值。')] },
  doc_21: { summary: '梳理非洲关键矿物（钴、锰、铂）在绿色转型中的供给地位，主张以本地选矿与 ESG 标准吸引多元投资，避免单一资本依赖。', claims: [C('doc_21', 5, 1, '刚果（金）钴产量占全球约 70%，但精炼环节高度集中于亚洲。', { date: '2020-03' }), C('doc_21', 13, 2, '非洲应以本地选矿与 ESG 认证为杠杆，争取电池产业链更高附加值环节。')] }
};
function jitDoc(docId, cb) {
  const d = docById(docId); if (!d || d.status === 'ready') { cb && cb(); return; }
  d.status = 'processing';
  const task = addTask('index', '资料解析 · ' + d.title.slice(0, 20), '', '补齐导读卡与页码锚点');
  saveState(); updateBadges();
  toast(`正在为《${d.title.slice(0, 18)}…》补齐导读卡…`, { type: 'info', duration: 2600 });
  setTimeout(() => {
    const content = JIT_CONTENT[docId] || { summary: `${d.org} 报告导读卡：聚焦${d.tags.join('、')}，立场为${d.stance}。`, claims: [C(docId, 3, 1, `${d.org}指出，${d.tags[0] || '该议题'}的政策走向将显著影响区域供应链格局。`, { date: d.date })] };
    d.summary = content.summary; d.claims = content.claims; d.status = 'ready';
    finishTask(task.id, `导读卡就绪 · ${content.claims.length} 条论据`);
    saveState(); updateBadges(); toast('导读卡已就绪，可用于写作与问答');
    if (['corpus', 'topic', 'tasks', 'packs'].includes(ui.page)) render();
    cb && cb();
  }, 2600);
}

/* ---------- 成果 ---------- */
function openReport(id) {
  const r = reportById(id); if (!r) return;
  ED.reportId = id; ED.editing = false; ED.draft = null;
  ui.topicId = r.topicId; ui.topicTab = 'write'; go('topic', r.topicId);
}
function exportMd(id) {
  const r = reportById(id); if (!r) return;
  const t = topicById(r.topicId); const sk = skillById(r.skillId);
  let md = `# ${r.title}\n\n> 专题：${t ? t.title : ''} · 类型：${r.type} · 写作 Skill：${sk ? sk.name + ' v' + (r.skillVersion || 1) : '—'} · 版本：v${curVersion(r)} · ${fmtDT(r.updatedAt)}\n\n`;
  if (r.matrix) { md += `| 智库/立场 | ${r.matrix.cols.join(' | ')} | 关键原话 |\n|---|${r.matrix.cols.map(() => '---').join('|')}|---|\n`; r.matrix.rows.forEach(row => { md += `| ${row.org}（${row.stance}） | ${row.cells.join(' | ')} | ${row.quote} |\n`; }); md += '\n'; }
  (r.sections || []).forEach(s => { md += `## ${s.h}\n\n${s.p}\n\n`; });
  const webs = (r.webUsed || []).map(webById).filter(Boolean);
  if (webs.length) { md += `## 联网线索\n\n`; webs.forEach(w => { md += `- [${w.id}] ${w.source}（${w.date}）：${w.title} — ${w.snippet}\n`; }); }
  if (r.requirements && r.requirements.length) { md += `\n## 本篇落实的写作要求\n\n`; r.requirements.forEach((q, i) => { md += `${i + 1}. ${q}\n`; }); }
  md += `\n---\n页码角标遵循 [doc_X_pY_cZ] 协议，可在观澜研究台点击跳回原文。\n`;
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = r.title.replace(/[\\/:*?"<>|]/g, '_') + '.md';
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('已导出 Markdown（保留页码角标与要求清单）');
}

/* ---------- 智能组卷 ---------- */
let CS = null;
function openCompile() {
  CS = { phase: 'input', q: '', picked: new Set(), target: ui.topicId || (S.topics[0] || {}).id || 'new', newTitle: '' };
  renderCompile();
}
function renderCompile() {
  if (CS.phase === 'input') {
    openModal(`<div class="md-head"><h3>${icon('spark', 17)}智能组卷 · 从资料库挑书</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div>
    <div class="md-body"><div class="field full"><label>研究课题（自然语言）</label><textarea id="compileQ" rows="3" placeholder="例如：欧盟对华电动汽车反补贴终裁及中方应对">${esc(CS.q)}</textarea><div class="hint">系统会把课题拆解为检索式，从 ${S.corpus.length} 篇资料中召回候选并给出入选理由。</div></div></div>
    <div class="md-foot"><button class="btn btn-ghost" data-action="modal-close">取消</button><button class="btn btn-primary" data-action="compile-run">${icon('search', 15)}生成候选清单</button></div>`, true);
    setTimeout(() => { const x = document.getElementById('compileQ'); if (x) x.focus(); }, 60);
    return;
  }
  const cands = CS.cands;
  openModal(`<div class="md-head"><h3>${icon('spark', 17)}智能组卷 · 候选清单</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div>
  <div class="md-body"><div class="funnel-note">${icon('search', 14)} 检索式：<span class="mono">${esc(CS.query)}</span> · 召回 ${cands.length} 篇</div>
    <div style="max-height:300px;overflow-y:auto;margin-top:12px">${cands.map(c => `<div class="claim-row ${CS.picked.has(c.d.id) ? 'on' : ''}" data-action="compile-pick" data-id="${c.d.id}"><input type="checkbox" class="checkbox" ${CS.picked.has(c.d.id) ? 'checked' : ''}><div class="cr-text"><b class="fs13">${esc(c.d.title)}</b><div class="cr-meta"><span>${esc(c.d.org)}</span>${stanceTag(c.d.stance)}<span>${c.d.date}</span>${docStatus(c.d)}<span style="color:var(--gold)">匹配度 ${c.score}</span></div><div class="hint" style="margin-top:3px">入选理由：${esc(c.reason)}</div></div></div>`).join('')}</div>
    <div class="form-grid" style="margin-top:14px"><div class="field"><label>加入专题</label><select id="compileTarget"><option value="new">＋ 新建专题</option>${S.topics.map(t => `<option value="${t.id}" ${CS.target === t.id ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</select></div><div class="field" id="newTitleField" style="${CS.target === 'new' ? '' : 'display:none'}"><label>新专题名称</label><input id="compileNewTitle" value="${esc(CS.newTitle)}" placeholder="自动取课题关键词"></div></div></div>
  <div class="md-foot"><span class="hint">已选 ${CS.picked.size} 篇 · 待解析资料会自动补齐</span><button class="btn btn-ghost" data-action="compile-back">返回</button><button class="btn btn-primary" data-action="compile-add">${icon('plus', 15)}加入专题</button></div>`, true);
}
function runCompile() {
  const el = document.getElementById('compileQ'); const q = (el ? el.value : CS.q).trim();
  if (!q) { toast('请输入研究课题', { type: 'warn' }); return; }
  CS.q = q; CS.phase = 'loading';
  openModal(`<div class="md-head"><h3>${icon('spark', 17)}智能组卷</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div><div class="md-body"><div class="pop-empty"><span class="typing"><i></i><i></i><i></i></span> 拆解课题 → 生成检索式 → 相关度排序…</div></div>`, true);
  setTimeout(() => {
    const g = grams(q);
    const cands = S.corpus.map(d => ({ d, score: scoreText((d.title + d.org + d.tags.join('') + d.summary + d.region + d.country).toLowerCase(), g) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 10)
      .map(x => Object.assign({}, x, { reason: `标题/标签命中课题关键词（${x.d.tags.slice(0, 2).join('、')}），${x.d.stance}立场，${x.d.status === 'ready' ? '导读卡就绪' : '待解析'}` }));
    CS.cands = cands.length ? cands : S.corpus.slice(0, 6).map(d => ({ d, score: 1, reason: '课题较新，按区域相关度推荐' }));
    const freq = {}; CS.cands.forEach(c => c.d.tags.forEach(x => freq[x] = (freq[x] || 0) + 1));
    CS.query = `${q} ⇒ (${Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 4).map(x => x[0]).join(' OR ') || '区域相关'})`;
    CS.picked = new Set(CS.cands.slice(0, 8).map(c => c.d.id));
    CS.phase = 'pick'; renderCompile();
  }, 1100);
}
function compileAdd() {
  const sel = document.getElementById('compileTarget'); const target = sel ? sel.value : CS.target;
  const ids = [...CS.picked]; if (!ids.length) { toast('请至少勾选一篇候选资料', { type: 'warn' }); return; }
  let t;
  if (target === 'new') {
    const nt = document.getElementById('compileNewTitle'); const title = (nt && nt.value.trim()) || CS.q.slice(0, 18);
    t = newTopicObject(title, (docById(ids[0]) || {}).region || '全球', CS.q);
    S.topics.push(t); pushVersion('topic', t, 'create', '智能组卷创建专题');
  } else t = topicById(target);
  ids.forEach(id => { if (!t.sourceIds.includes(id)) t.sourceIds.push(id); });
  pushVersion('topic', t, 'edit', `智能组卷加入 ${ids.length} 篇资料`);
  saveState(); closeModal(); ui.topicId = t.id; ui.topicTab = 'src'; go('topic', t.id);
  toast(`已组卷 ${ids.length} 篇加入「${t.title}」`);
  ids.filter(id => (docById(id) || {}).status !== 'ready').forEach((id, i) => setTimeout(() => jitDoc(id), 400 + i * 700));
}
function newTopicObject(title, region, desc) {
  return {
    id: uid(), title, region, color: AV_COLORS[S.topics.length % AV_COLORS.length], desc: desc || '新建研究专题',
    audience: '课题组内部', deliverable: '研究简报', questions: [], keywords: [], sourceIds: [],
    skillId: S.prefs.defaultSkill && skillById(S.prefs.defaultSkill) ? S.prefs.defaultSkill : '',
    chats: [], notes: [], packs: [], reportIds: [], uploadIds: [], createdAt: now(), updatedAt: now(), versions: []
  };
}
function openTopicCreate() {
  openModal(`<div class="md-head"><h3>${icon('book', 17)}新建研究专题</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div>
  <div class="md-body"><div class="form-grid">
    <div class="field full"><label>专题名称</label><input id="ntTitle" placeholder="例如：欧盟对华电动汽车反补贴博弈"></div>
    <div class="field"><label>区域</label><select id="ntRegion">${['欧洲', '东南亚', '中东', '北美', '东亚', '欧亚', '拉美', '非洲', '全球'].map(r => `<option>${r}</option>`).join('')}</select></div>
    <div class="field"><label>写作 Skill</label><select id="ntSkill"><option value="">暂不绑定</option>${S.skills.map(s => `<option value="${s.id}" ${S.prefs.defaultSkill === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
    <div class="field full"><label>研究目标</label><textarea id="ntDesc" rows="2" placeholder="一句话说明这个专题要回答什么"></textarea></div>
  </div></div>
  <div class="md-foot"><button class="btn btn-ghost" data-action="modal-close">取消</button><button class="btn btn-primary" data-action="topic-create-ok">${icon('plus', 15)}创建专题</button></div>`);
  setTimeout(() => { const x = document.getElementById('ntTitle'); if (x) x.focus(); }, 60);
}
function topicCreateOk() {
  const title = (document.getElementById('ntTitle').value || '').trim();
  if (!title) { toast('请填写专题名称', { type: 'warn' }); return; }
  const t = newTopicObject(title, document.getElementById('ntRegion').value, document.getElementById('ntDesc').value.trim());
  t.skillId = document.getElementById('ntSkill').value;
  S.topics.push(t); pushVersion('topic', t, 'create', '创建专题' + (t.skillId ? `，绑定「${skillById(t.skillId).name}」` : ''));
  saveState(); closeModal(); ui.topicTab = 'write'; ED.reportId = null; go('topic', t.id);
  toast('专题已创建，可上传范文或添加资料');
}
function openAddToTopic(docId) {
  const d = docById(docId);
  openModal(`<div class="md-head"><h3>${icon('plus', 17)}加入专题</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div>
  <div class="md-body"><div class="field full"><label>${esc(d.title)}</label><select id="addTarget">${S.topics.map(t => `<option value="${t.id}">${esc(t.title)}${t.sourceIds.includes(docId) ? '（已含）' : ''}</option>`).join('')}</select></div>
  ${d.status !== 'ready' ? `<div class="funnel-note" style="margin-top:10px">${icon('info', 13)} 该资料尚未解析，加入后会自动补齐导读卡（约 3 秒）。</div>` : ''}</div>
  <div class="md-foot"><button class="btn btn-ghost" data-action="modal-close">取消</button><button class="btn btn-primary" data-action="add-to-topic-ok" data-id="${docId}">加入</button></div>`);
}
function addToTopicOk(docId) {
  const t = topicById(document.getElementById('addTarget').value); if (!t) return;
  if (!t.sourceIds.includes(docId)) { t.sourceIds.push(docId); pushVersion('topic', t, 'edit', `加入资料《${docById(docId).title.slice(0, 18)}…》`); }
  saveState(); closeModal(); toast(`已加入「${t.title}」`);
  if (docById(docId).status !== 'ready') jitDoc(docId);
  if (ui.page === 'corpus' || ui.page === 'topic') render();
}
function openAddDocs(tid) {
  const t = topicById(tid); const avail = S.corpus.filter(d => !t.sourceIds.includes(d.id));
  openModal(`<div class="md-head"><h3>${icon('plus', 17)}为「${esc(t.title)}」添加资料</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div>
  <div class="md-body"><div style="max-height:340px;overflow-y:auto">${avail.map(d => `<div class="claim-row" data-action="add-doc-toggle" data-id="${d.id}"><input type="checkbox" class="checkbox"><div class="cr-text"><b class="fs13">${esc(d.title)}</b><div class="cr-meta"><span>${esc(d.org)}</span>${stanceTag(d.stance)}${docStatus(d)}</div></div></div>`).join('') || '<div class="pop-empty">资料库文献均已加入</div>'}</div></div>
  <div class="md-foot"><button class="btn btn-ghost" data-action="modal-close">取消</button><button class="btn btn-primary" data-action="add-docs-ok" data-id="${tid}">添加所选</button></div>`, true);
}
function addDocsOk(tid) {
  const t = topicById(tid); const ids = [...document.querySelectorAll('#modal .claim-row.on')].map(el => el.dataset.id);
  if (!ids.length) { toast('请勾选要添加的资料', { type: 'warn' }); return; }
  ids.forEach(id => { if (!t.sourceIds.includes(id)) t.sourceIds.push(id); });
  pushVersion('topic', t, 'edit', `批量加入 ${ids.length} 篇资料`); saveState(); closeModal(); render();
  toast(`已添加 ${ids.length} 篇资料`);
  ids.filter(id => docById(id).status !== 'ready').forEach((id, i) => setTimeout(() => jitDoc(id), 300 + i * 600));
}
function openDocDrawer(id) {
  const d = docById(id); if (!d) return;
  openDrawer(`<div class="dw-head"><div class="dw-top"><span class="dw-type" style="background:${avColor(d.org)}">${icon('file', 14)}研报</span><span class="dw-code mono">${d.id}</span><button class="icon-btn dw-close" data-action="close-drawer">${icon('x', 18)}</button></div>
    <div class="dw-title">${esc(d.title)}</div><div class="dw-meta">${stanceTag(d.stance)}<span class="tag">${esc(d.org)}</span><span class="tag">${d.region} · ${d.country}</span><span class="tag">${d.lang} · ${d.pages}p</span>${docStatus(d)}</div></div>
  <div class="dw-body"><div class="dw-section"><div class="dw-sec-title">${icon('book', 15)}导读卡</div>${d.summary ? `<div class="guide-card" style="margin:0">${esc(d.summary)}<div>${d.tags.map(x => `<span class="gc-tag">${esc(x)}</span>`).join('')}</div></div>` : `<div class="pop-empty">尚未生成导读卡</div><button class="btn btn-gold" data-action="jit-doc" data-id="${d.id}" style="margin-top:10px">${icon('zap', 15)}立即补齐（约 3 秒）</button>`}</div>
  ${d.claims.length ? `<div class="dw-section"><div class="dw-sec-title">${icon('anchor', 15)}核心论据（带页码锚点）</div>${d.claims.map(c => `<div class="note-card"><b>第 ${c.page} 页</b>${esc(c.text)}<div class="nc-meta"><span class="mono">${c.id}</span> ${citeChip(c.id)}</div></div>`).join('')}</div>` : ''}</div>
  <div class="dw-foot" style="display:flex;gap:10px;justify-content:flex-end"><button class="btn btn-ghost" data-action="close-drawer">关闭</button><button class="btn btn-primary" data-action="corpus-add" data-id="${d.id}">${icon('plus', 15)}加入专题</button></div>`);
}
function showProtocol() {
  openModal(`<div class="md-head"><h3>${icon('shield', 17)}写作与引用规范</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div>
  <div class="md-body"><div class="kv-grid">
    <div class="kv"><div class="kv-k">禁止库外幻觉</div><div class="kv-v">专题资料未覆盖时，明确回复「资料中未提及」，不得编造。</div></div>
    <div class="kv"><div class="kv-k">强制页码锚点</div><div class="kv-v">每条论断附 <span class="mono">[doc_X_pY_cZ]</span>，点击跳回原文页码并高亮。</div></div>
    <div class="kv"><div class="kv-k">联网单独标注</div><div class="kv-v">外部线索使用 <span class="mono">[web_XX]</span>，标明来源机构与日期，与库内证据区分。</div></div>
    <div class="kv"><div class="kv-k">智库身份显式</div><div class="kv-v">引用标明机构与国别立场，区分对象国／美欧／周边视角。</div></div>
    <div class="kv"><div class="kv-k">直接修改 · 全程留痕</div><div class="kv-v">生成的稿件与您上传的范文都可直接编辑；系统不会擅自改动原文，每次修改经您确认后存为版本，可对比、可恢复。</div></div>
    <div class="kv"><div class="kv-k">时间序列优先</div><div class="kv-v">同一议题多份资料时按发布时间排序，优先采信最新官方披露。</div></div>
    <div class="kv"><div class="kv-k">修改留痕</div><div class="kv-v">每次生成、编辑与回滚都自动存为版本，可随时对比差异并恢复。</div></div>
    <div class="kv"><div class="kv-k">范文只学写法</div><div class="kv-v">上传范文仅用于提炼结构与风格，不作为事实证据写入新稿。</div></div>
  </div></div><div class="md-foot"><button class="btn btn-primary" data-action="modal-close">知道了</button></div>`, true);
}

/* ---------- 事件委托 ---------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) { if (!e.target.closest('.popover') && !e.target.closest('#bellBtn') && !e.target.closest('#userBtn')) closePops(); return; }
  const a = el.dataset.action, id = el.dataset.id;
  if (a !== 'toggle-notif' && a !== 'toggle-user' && !el.closest('.popover')) closePops();
  switch (a) {
    case 'nav': go(el.dataset.page); document.getElementById('app').classList.remove('nav-open'); break;
    case 'nav-skills': go('skills'); break;
    case 'nav-reports': go('reports'); break;
    case 'open-topic': ED.reportId = null; ED.editing = false; ui.topicTab = 'write'; ui.pdfHl = null; go('topic', id); break;
    case 'open-skill': SED.dirty = false; go('skill', id); break;
    case 'open-mobile-nav': document.getElementById('app').classList.add('nav-open'); break;
    case 'close-mobile-nav': document.getElementById('app').classList.remove('nav-open'); break;
    case 'toggle-collapse': S.collapsed = !S.collapsed; saveState(); applyCollapse(); break;
    case 'toggle-notif': toggleNotif(); break;
    case 'toggle-user': toggleUser(); break;
    case 'modal-close': clearGen(); closeModal(); break;
    case 'confirm-ok': { const cb = confirmCb; closeModal(); cb && cb(); break; }
    case 'close-drawer': closeDrawer(); break;
    case 'gen-cancel': cancelGeneration(); break;

    /* 上传与 Skill */
    case 'dash-upload': case 'skill-from-upload': openUpload(ui.topicId || (S.topics[0] || {}).id); break;
    case 'up-open': openUpload(id); break;
    case 'up-pick': { const f = document.getElementById('upFile'); if (f && e.target.tagName !== 'INPUT') f.click(); break; }
    case 'up-sample': runParse(UP.topicId, '内置范文 · 咨政内参样例.txt', SAMPLE_REPORT.length, SAMPLE_REPORT); break;
    case 'up-parse-paste': { const ta = document.getElementById('upPaste'); const tx = (ta ? ta.value : '').trim(); if (tx.length < 120) { toast('正文太短，至少粘贴 120 字以便识别结构与风格', { type: 'warn' }); return; } runParse(UP.topicId, '粘贴的范文正文.txt', tx.length, tx); break; }
    case 'up-back': UP.phase = 'input'; UP.err = ''; renderUpload(); break;
    case 'up-commit': commitUpload(); break;
    case 'up-view': openUploadEditor(id); break;
    case 'up-history': openHistory('upload', id); break;
    case 'up-edit-save': uploadEditSave(id); break;
    case 'up-redistill': { const u = S.uploads.find(x => x.id === id); if (!u) break; UP.target = 'new'; runParse(u.topicId, u.name, u.size, u.text); break; }
    case 'skill-new': skillNew(); break;
    case 'skill-use': skillUse(id); break;
    case 'skill-use-go': skillUseGo(id); break;
    case 'skill-save': skillSave(id); break;
    case 'skill-history': openHistory('skill', id); break;
    case 'sk-view-source': skillSource(id); break;
    case 'sk-topic-toggle': { const sk = skillById(id); const tid = el.dataset.tid; const i = sk.topicIds.indexOf(tid); if (i >= 0) sk.topicIds.splice(i, 1); else sk.topicIds.push(tid); markSkillDirty(); queueSave(); render(); break; }
    case 'ol-add': { const sk = skillById(id); sk.outline.push(outlineItem(`${CN_NUM[sk.outline.length + 1] || sk.outline.length + 1}、新增章节`, '说明本节要写什么、怎么写。', 500)); markSkillDirty(); queueSave(); render(); break; }
    case 'ol-del': { const sk = skillById(id); if (sk.outline.length <= 1) { toast('至少保留一个章节', { type: 'warn' }); break; } const i = sk.outline.findIndex(o => o.id === el.dataset.oid); const snap = sk.outline[i]; sk.outline.splice(i, 1); renumberOutline(sk); markSkillDirty(); queueSave(); render(); toast('已删除章节', { undo: () => { sk.outline.splice(i, 0, snap); renumberOutline(sk); render(); } }); break; }
    case 'ol-up': case 'ol-down': { const sk = skillById(id); const arr = sk.outline; const i = arr.findIndex(o => o.id === el.dataset.oid); const j = i + (a === 'ol-up' ? -1 : 1); if (i < 0 || j < 0 || j >= arr.length) break; [arr[i], arr[j]] = [arr[j], arr[i]]; renumberOutline(sk); markSkillDirty(); queueSave(); render(); break; }
    case 'logic-add': { const sk = skillById(id); sk.logic.push('新增一步论证'); markSkillDirty(); queueSave(); render(); break; }
    case 'logic-del': { const sk = skillById(id); sk.logic.splice(+el.dataset.i, 1); markSkillDirty(); queueSave(); render(); break; }
    case 'must-toggle': { const sk = skillById(id); const m = el.dataset.m; const i = sk.must.indexOf(m); if (i >= 0) sk.must.splice(i, 1); else sk.must.push(m); markSkillDirty(); queueSave(); render(); break; }
    case 'word-del': { const sk = skillById(id); sk[el.dataset.list].splice(+el.dataset.i, 1); markSkillDirty(); queueSave(); render(); break; }
    case 'req-add': { const sk = skillById(id); const inp = document.getElementById('skReqInput'); const v = (inp ? inp.value : '').trim(); if (!v) { toast('请先写下要求', { type: 'warn' }); break; } sk.requirements.push(req(v, '用户')); pushVersion('skill', sk, 'require', `新增写作要求：${v.slice(0, 24)}`); SED.dirty = false; render(); toast('要求已加入并留痕，下次写作自动生效'); break; }
    case 'req-del': { const sk = skillById(id); const i = sk.requirements.findIndex(r => r.id === el.dataset.rid); if (i < 0) break; const snap = sk.requirements[i]; sk.requirements.splice(i, 1); markSkillDirty(); queueSave(); render(); toast('已移除要求', { undo: () => { sk.requirements.splice(i, 0, snap); render(); } }); break; }
    case 'skill-del': confirmDlg({ title: '删除写作 Skill', text: '删除后关联专题将解除绑定，可在提示条中撤销。', okText: '删除', danger: true, onOk: () => { const i = S.skills.findIndex(s => s.id === id); const snap = S.skills[i]; S.skills.splice(i, 1); S.topics.forEach(t => { if (t.skillId === id) t.skillId = ''; }); saveState(); go('skills'); toast('Skill 已删除', { undo: () => { S.skills.splice(i, 0, snap); saveState(); render(); } }); } }); break;

    /* 专题 */
    case 'topic-new': openTopicCreate(); break;
    case 'topic-create-ok': topicCreateOk(); break;
    case 'topic-tab': ui.topicTab = el.dataset.tab; ui.pdfHl = null; render(); break;
    case 'topic-edit': ui.topicTab = 'set'; render(); break;
    case 'topic-history': openHistory('topic', id); break;
    case 'topic-save': { const t = topicById(id); const note = ((document.getElementById('tpNote') || {}).value || '').trim(); const v = pushVersion('topic', t, 'edit', note || '更新专题信息'); saveState(); render(); toast(`专题已保存为 v${v.n}`); break; }
    case 'tq-add': { const t = topicById(id); const inp = document.getElementById('tqInput'); const v = (inp ? inp.value : '').trim(); if (!v) { toast('请先写下关注问题', { type: 'warn' }); break; } t.questions.push(v); queueSave(); render(); break; }
    case 'tq-del': { const t = topicById(id); t.questions.splice(+el.dataset.i, 1); queueSave(); render(); break; }
    case 'tk-del': { const t = topicById(id); t.keywords.splice(+el.dataset.i, 1); queueSave(); render(); break; }
    case 'topic-del': confirmDlg({
      title: '删除专题', text: '专题下的稿件与范文记录会一并移除，可在提示条中撤销。', okText: '删除', danger: true,
      onOk: () => {
        const i = S.topics.findIndex(t => t.id === id); const snap = S.topics[i];
        const rs = S.reports.filter(r => r.topicId === id); const us = S.uploads.filter(u => u.topicId === id);
        S.topics.splice(i, 1); S.reports = S.reports.filter(r => r.topicId !== id); S.uploads = S.uploads.filter(u => u.topicId !== id);
        saveState(); go('topics');
        toast('专题已删除', { undo: () => { S.topics.splice(i, 0, snap); S.reports.unshift(...rs); S.uploads.unshift(...us); saveState(); render(); } });
      }
    }); break;
    case 'src-remove': { const t = topicById(el.dataset.tid); const i = t.sourceIds.indexOf(id); if (i < 0) break; const snap = t.sourceIds[i]; t.sourceIds.splice(i, 1); pushVersion('topic', t, 'edit', `移出资料《${(docById(id) || {}).title.slice(0, 18)}…》`); saveState(); render(); toast('已移出专题', { undo: () => { t.sourceIds.splice(i, 0, snap); saveState(); render(); } }); break; }
    case 'src-pdf': { const d = docById(id); ui.pdfHl = null; openModal(`<div class="md-head"><h3>${icon('file', 17)}${esc(d.title)}</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div><div class="md-body" style="padding:0"><div class="pdf-viewer" style="max-height:64vh">${pdfViewer(d)}</div></div><div class="md-foot"><span class="hint">${esc(d.org)} · ${d.date} · ${d.claims.length} 条论据</span><button class="btn btn-primary" data-action="modal-close">关闭</button></div>`, true); break; }
    case 'dash-write': { if (!S.topics.length) { openTopicCreate(); break; } const t = topicById(ui.topicId) || S.topics[0]; ui.topicTab = 'write'; go('topic', t.id); break; }

    /* 写作与稿件 */
    case 'gen-run': {
      const t = topicById(id);
      const packId = (document.getElementById('genPack') || {}).value || '';
      const type = (document.getElementById('genType') || {}).value || '内参';
      const length = (document.getElementById('genLength') || {}).value || S.prefs.length;
      runGeneration({ topicId: t.id, skillId: t.skillId, packId, type, length, web: S.prefs.webSearch });
      break;
    }
    case 'report-open': openReport(id); break;
    case 'report-select': ED.reportId = id; ED.editing = false; ED.draft = null; render(); break;
    case 'report-history': openHistory('report', id); break;
    case 'report-export': exportMd(id); break;
    case 'edit-start': editStart(id); break;
    case 'edit-cancel': editCancel(); break;
    case 'edit-save': editSave(id); break;
    case 'es-add': esAdd(); break;
    case 'es-del': esDel(el.dataset.sid); break;
    case 'es-up': esMove(el.dataset.sid, -1); break;
    case 'es-down': esMove(el.dataset.sid, 1); break;
    case 'ask-chip': { const inp = document.getElementById('askInput'); if (inp) { inp.value = el.dataset.q; inp.focus(); } break; }
    case 'ask-rewrite': askRewrite(id); break;
    case 'report-del': confirmDlg({
      title: '删除稿件', text: '稿件及其版本历史会一并删除，可在提示条中撤销。', okText: '删除', danger: true,
      onOk: () => {
        const i = S.reports.findIndex(r => r.id === id); const snap = S.reports[i];
        S.reports.splice(i, 1); S.topics.forEach(t => t.reportIds = t.reportIds.filter(x => x !== id));
        if (ED.reportId === id) { ED.reportId = null; ED.editing = false; ED.draft = null; }
        saveState(); render();
        toast('稿件已删除', { undo: () => { S.reports.splice(i, 0, snap); const t = topicById(snap.topicId); if (t) t.reportIds.push(snap.id); saveState(); render(); } });
      }
    }); break;

    /* 资料库 / 论据篮 */
    case 'open-compile': openCompile(); break;
    case 'compile-run': runCompile(); break;
    case 'compile-back': CS.phase = 'input'; renderCompile(); break;
    case 'compile-pick': CS.picked.has(id) ? CS.picked.delete(id) : CS.picked.add(id); el.classList.toggle('on'); el.querySelector('.checkbox').checked = CS.picked.has(id); break;
    case 'compile-add': compileAdd(); break;
    case 'corpus-preview': openDocDrawer(id); break;
    case 'corpus-add': openAddToTopic(id); break;
    case 'add-to-topic-ok': addToTopicOk(id); break;
    case 'corpus-add-nb': openAddDocs(id); break;
    case 'add-doc-toggle': el.classList.toggle('on'); el.querySelector('.checkbox').checked = el.classList.contains('on'); break;
    case 'add-docs-ok': addDocsOk(id); break;
    case 'jit-doc': closeDrawer(); jitDoc(id); break;
    case 'claim-toggle': ui.packSel.has(id) ? ui.packSel.delete(id) : ui.packSel.add(id); el.classList.toggle('on'); el.querySelector('.checkbox').checked = ui.packSel.has(id); updatePackTiles(); break;
    case 'pack-save': {
      if (!ui.packSel.size) { toast('请先勾选论据', { type: 'warn' }); break; }
      const t = topicById(id); const pk = { id: uid(), topicId: id, name: t.title.slice(0, 10) + ' · ' + fmtD(now()), createdAt: now(), claims: [...ui.packSel] };
      S.packs.unshift(pk); t.packs.push(pk.id); saveState(); ui.packSel.clear(); render(); toast(`论据篮已保存（${pk.claims.length} 条）`); break;
    }
    case 'pack-use': { const p = packById(id); ui.topicId = p.topicId; ui.topicTab = 'write'; go('topic', p.topicId); runGeneration({ topicId: p.topicId, skillId: topicById(p.topicId).skillId, packId: p.id, web: S.prefs.webSearch, length: S.prefs.length }); break; }
    case 'pack-del': confirmDlg({ title: '删除论据篮', text: '删除后可撤销，已生成稿件不受影响。', okText: '删除', danger: true, onOk: () => { const i = S.packs.findIndex(p => p.id === id); const snap = S.packs[i]; S.packs.splice(i, 1); saveState(); render(); toast('论据篮已删除', { undo: () => { S.packs.splice(i, 0, snap); saveState(); render(); } }); } }); break;

    /* 问答 */
    case 'chat-send': sendChat(id); break;
    case 'suggest': { const inp = document.getElementById('chatInput'); if (inp) { inp.value = el.dataset.q; sendChat(id); } break; }
    case 'cite': citeJump(id); break;

    /* 版本 */
    case 'ver-view': viewVersion(el.dataset.kind, id, el.dataset.vid); break;
    case 'ver-diff': diffModal(el.dataset.kind, id, el.dataset.vid); break;
    case 'ver-diff-base': diffModal(el.dataset.kind, id, el.dataset.vid, el.dataset.base); break;
    case 'ver-restore': restoreVersion(el.dataset.kind, id, el.dataset.vid); break;

    /* 任务 / 偏好 */
    case 'task-retry': { const t = S.tasks.find(x => x.id === id); t.status = 'running'; t.progress = 5; saveState(); render(); toast('任务已重新入队'); break; }
    case 'task-cancel': confirmDlg({ title: '取消任务', text: '取消后任务标记为已中断，可重试。', okText: '取消任务', danger: true, onOk: () => { const t = S.tasks.find(x => x.id === id); t.status = 'failed'; t.detail = '用户取消'; saveState(); render(); updateBadges(); toast('任务已取消', { type: 'warn' }); } }); break;
    case 'task-clear': { const done = S.tasks.filter(t => t.status === 'done'); if (!done.length) { toast('暂无已完成任务', { type: 'info' }); break; } confirmDlg({ title: '清理已完成任务', text: `将移除 ${done.length} 条已完成记录。`, okText: '清理', onOk: () => { const snap = [...S.tasks]; S.tasks = S.tasks.filter(t => t.status !== 'done'); saveState(); render(); updateBadges(); toast('已清理', { undo: () => { S.tasks = snap; saveState(); render(); updateBadges(); } }); } }); break; }
    case 'pref-toggle': { const k = el.dataset.key; S.prefs[k] = !S.prefs[k]; saveState(); render(); toast(`${k === 'webSearch' ? '联网检索' : '自动留痕'}已${S.prefs[k] ? '开启' : '关闭'}`, { type: 'info', duration: 2400 }); break; }
    case 'show-protocol': closePops(); showProtocol(); break;
    case 'user-about': closePops(); openModal(`<div class="md-head"><h3>${icon('globe', 17)}关于观澜研究台</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div><div class="md-body"><p class="fs13" style="line-height:1.9">观澜研究台面向区域国别研究的业务人员：上传一份您认可的报告，系统提炼其写作思路与风格形成可编辑的 Skill；写作时结合专题资料库与联网线索成稿，稿件可直接修改，提出的要求可沉淀回 Skill；专题、Skill 与稿件的每一次变化都留有版本，可随时对比与恢复。</p><div class="funnel-note" style="margin-top:12px">${icon('info', 13)} 当前为可交互原型：资料与联网线索为内置演示数据，上传解析、编辑与版本操作真实生效并保存在本机。</div></div><div class="md-foot"><button class="btn btn-primary" data-action="modal-close">关闭</button></div>`); break;
    case 'user-reset': closePops(); confirmDlg({ title: '重置演示数据', text: '将恢复全部初始数据，当前修改会丢失。', okText: '重置', danger: true, onOk: () => { resetState(); ui.packSel.clear(); ED.reportId = null; ED.editing = false; ED.draft = null; SED.dirty = false; go('dashboard'); toast('已重置为初始演示数据'); } }); break;
  }
});
function updatePackTiles() {
  const tiles = document.querySelectorAll('.ana-tile'); if (tiles.length < 3) return;
  const docs = new Set([...ui.packSel].map(id => (claimById(id) || {}).doc).filter(Boolean));
  const st = {}; [...ui.packSel].forEach(id => { const c = claimById(id); if (c) { const s = (docById(c.doc) || {}).stance; st[s] = (st[s] || 0) + 1; } });
  tiles[0].querySelector('.at-num span').textContent = ui.packSel.size;
  tiles[1].querySelector('.at-num span').textContent = docs.size;
  tiles[2].querySelector('.at-num span').textContent = Object.keys(st).length;
  tiles[2].querySelector('.at-sub').textContent = Object.entries(st).map(([k, v]) => `${k} ${v}`).join(' · ') || '尚未选择';
}

/* ---------- 输入 ---------- */
document.addEventListener('input', e => {
  const t = e.target, ds = t.dataset;
  if (t.matches('input[data-filter="q"]')) { refocusQ = ds.page; filtersFor(ds.page).q = t.value; render(); return; }
  if (t.id === 'chatInput') { t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px'; return; }
  if (t.id === 'upPaste') { UP.text = t.value; return; }
  if (t.id === 'compileQ') { CS.q = t.value; return; }
  if (t.id === 'compileNewTitle') { CS.newTitle = t.value; return; }
  if (ds.ol) { const sk = skillById(ds.id || ui.skillId); if (!sk) return; const o = sk.outline.find(x => x.id === ds.oid); if (!o) return; o[ds.ol] = ds.ol === 'words' ? Math.max(50, +t.value || 0) : t.value; markSkillDirty(); queueSave(); if (ds.ol !== 'words') refreshPreview(sk); return; }
  if (ds.logic !== undefined) { const sk = skillById(ds.id); sk.logic[+ds.logic] = t.value; markSkillDirty(); queueSave(); return; }
  if (ds.style && t.type === 'range') { const sk = skillById(ds.id); sk.style[ds.style] = +t.value; const sv = document.querySelector(`[data-sv="${ds.style}"]`); if (sv) sv.textContent = t.value; markSkillDirty(); queueSave(); refreshPreview(sk); return; }
  if (ds.req) { const sk = skillById(ds.id); const r = sk.requirements.find(x => x.id === ds.req); if (r) { r.text = t.value; markSkillDirty(); queueSave(); } return; }
  if (ds.skname) { const sk = skillById(ds.skname); sk.name = t.value; markSkillDirty(); queueSave(); const el2 = document.querySelector('.sk-title'); if (el2) el2.textContent = t.value; return; }
  if (ds.tp) { const tp = topicById(ds.id); tp[ds.tp] = t.value; queueSave(); return; }
  if (ds.tq !== undefined) { const tp = topicById(ds.id); tp.questions[+ds.tq] = t.value; queueSave(); return; }
  if (ds.es) { const s = ED.draft.sections.find(x => x.id === ds.sid); if (!s) return; s[ds.es] = t.value; const row = t.closest('.es-row'); if (row && ds.es === 'p') { const hints = row.querySelectorAll('.es-foot .hint'); hints[0].textContent = t.value.length + ' 字'; hints[1].textContent = (t.value.match(/\[(doc_\d+_p\d+_c\d+|web_\d+)\]/g) || []).length + ' 处出处'; } return; }
  if (t.id === 'edTitle') { ED.draft.title = t.value; return; }
  if (ds.mx) { const [ri, ci] = ds.mx.split('-'); const row = ED.draft.matrix.rows[+ri]; if (ci === 'q') row.quote = t.value; else row.cells[+ci] = t.value; return; }
});
document.addEventListener('change', e => {
  const t = e.target, ds = t.dataset;
  if (t.matches('select[data-filter]')) { filtersFor(ds.page)[ds.filter] = t.value; render(); return; }
  if (t.id === 'upFile') { handleFile(t.files && t.files[0]); return; }
  if (ds.action === 'up-topic') { UP.topicId = t.value; const bt = topicById(t.value); UP.target = bt && bt.skillId ? 'update' : 'new'; renderUpload(); return; }
  if (ds.action === 'pack-topic') { ui.packTopic = t.value; ui.packSel.clear(); render(); return; }
  if (ds.action === 'report-filter') { ui.reportTopic = t.value; render(); return; }
  if (ds.action === 'pdf-select') { ui.pdfDoc = t.value; ui.pdfHl = null; render(); return; }
  if (ds.action === 'write-skill') {
    const tp = topicById(ui.topicId); tp.skillId = t.value;
    if (t.value) { const sk = skillById(t.value); if (!sk.topicIds.includes(tp.id)) sk.topicIds.push(tp.id); pushVersion('topic', tp, 'bind', `绑定写作 Skill「${sk.name}」v${curVersion(sk)}`); }
    else pushVersion('topic', tp, 'bind', '解除写作 Skill 绑定');
    saveState(); render(); toast('写作 Skill 已切换', { type: 'info', duration: 2200 }); return;
  }
  if (ds.style) { const sk = skillById(ds.id); if (!sk) return; if (t.type === 'range') { sk.style[ds.style] = +t.value; queueSave(); return; } sk.style[ds.style] = t.value; markSkillDirty(); queueSave(); refreshPreview(sk); if (ds.style !== 'citeStyle') render(); return; }
  if (ds.pref) { S.prefs[ds.pref] = t.value; saveState(); toast('偏好已保存，下次生成即时生效', { type: 'info', duration: 2200 }); return; }
  if (ds.tp) { const tp = topicById(ds.id); tp[ds.tp] = t.value; queueSave(); if (ds.tp === 'skillId') { render(); toast('写作 Skill 已切换，保存后留痕', { type: 'info', duration: 2400 }); } return; }
  if (t.id === 'compileTarget') { CS.target = t.value; const f = document.getElementById('newTitleField'); if (f) f.style.display = t.value === 'new' ? '' : 'none'; return; }
});
document.addEventListener('keydown', e => {
  const t = e.target, ds = t.dataset || {};
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); document.getElementById('globalSearch').focus(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    if (ui.page === 'skill') skillSave(ui.skillId);
    else if (ED.editing) editSave(ED.reportId);
    else if (ui.page === 'topic' && ui.topicTab === 'set') { const tp = topicById(ui.topicId); const v = pushVersion('topic', tp, 'edit', '快捷键保存专题信息'); render(); toast(`专题已保存为 v${v.n}`); }
    return;
  }
  if (e.key === 'Escape') { if (modalOpen()) { clearGen(); closeModal(); } else if (drawerOpen()) closeDrawer(); else { closePops(); document.getElementById('app').classList.remove('nav-open'); } return; }
  if (e.key === 'Enter' && !e.shiftKey) {
    if (ds.word) { e.preventDefault(); const sk = skillById(ds.id); const v = t.value.trim(); if (v) { sk[ds.word].push(v); t.value = ''; markSkillDirty(); queueSave(); render(); } return; }
    if (ds.tk) { e.preventDefault(); const tp = topicById(ds.tk); const v = t.value.trim(); if (v) { tp.keywords.push(v); t.value = ''; queueSave(); render(); } return; }
    if (t.id === 'skReqInput') { e.preventDefault(); document.querySelector('[data-action="req-add"]').click(); return; }
    if (t.id === 'tqInput') { e.preventDefault(); document.querySelector('[data-action="tq-add"]').click(); return; }
    if (t.id === 'chatInput') { e.preventDefault(); const btn = document.querySelector('.send-btn'); if (btn) sendChat(btn.dataset.id); return; }
    if (t.id === 'globalSearch') { filtersFor('corpus').q = t.value.trim(); go('corpus'); return; }
  }
});

/* ---------- 拖拽：上传与章节排序 ---------- */
document.addEventListener('dragover', e => {
  const dz = e.target.closest('#dropZone');
  if (dz) { e.preventDefault(); dz.classList.add('over'); return; }
  const row = e.target.closest('.ol-row');
  if (row && DND) { e.preventDefault(); row.classList.add('drag-over'); }
});
document.addEventListener('dragleave', e => { const dz = e.target.closest('#dropZone'); if (dz) dz.classList.remove('over'); const row = e.target.closest('.ol-row'); if (row) row.classList.remove('drag-over'); });
document.addEventListener('drop', e => {
  const dz = e.target.closest('#dropZone');
  if (dz) { e.preventDefault(); dz.classList.remove('over'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) handleFile(f); return; }
  const row = e.target.closest('.ol-row');
  if (row && DND) {
    e.preventDefault(); row.classList.remove('drag-over');
    const sk = skillById(DND.skill); const arr = sk.outline;
    const from = arr.findIndex(o => o.id === DND.oid), to = arr.findIndex(o => o.id === row.dataset.oid);
    if (from >= 0 && to >= 0 && from !== to) { const [m] = arr.splice(from, 1); arr.splice(to, 0, m); renumberOutline(sk); markSkillDirty(); queueSave(); render(); toast('章节顺序已调整'); }
    DND = null;
  }
});
document.addEventListener('dragstart', e => { const row = e.target.closest('.ol-row'); if (row) { DND = { skill: ui.skillId, oid: row.dataset.oid }; row.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', row.dataset.oid); } catch (x) { } } });
document.addEventListener('dragend', e => { const row = e.target.closest('.ol-row'); if (row) row.classList.remove('dragging'); document.querySelectorAll('.drag-over').forEach(x => x.classList.remove('drag-over')); DND = null; });

/* ---------- 任务心跳 ---------- */
setInterval(() => {
  let changed = false;
  S.tasks.forEach(t => {
    if (t.status === 'running' && t.kind === 'index' && !t.label.startsWith('资料解析')) {
      t.progress = Math.min(100, t.progress + Math.round(1 + Math.random() * 4));
      if (t.progress >= 100) { t.status = 'done'; t.detail = '批量入库完成'; toast(`任务完成：${t.label}`); }
      changed = true;
    }
  });
  if (changed) { saveState(); updateBadges(); if (ui.page === 'tasks') render(); }
}, 1600);

/* ---------- 初始化 ---------- */
(function init() {
  document.querySelector('.hamburger').innerHTML = icon('menu', 20);
  document.querySelector('.sidebar-close').innerHTML = icon('x', 18);
  document.querySelector('.gs-icon').innerHTML = icon('search', 16);
  document.querySelector('.i-spark').innerHTML = icon('upload', 16);
  document.getElementById('bellBtn').insertAdjacentHTML('afterbegin', icon('bell', 19));
  document.getElementById('userBtn').innerHTML = avatar(ME.name);
  document.getElementById('meCard').innerHTML = `${avatar(ME.name)}<div class="me-info"><b>${ME.name}</b><span>${ME.role}</span></div>`;
  applyCollapse(); go('dashboard');
})();