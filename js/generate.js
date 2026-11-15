/* 观澜研究台 — 生成引擎：Skill 结构 × 专题资料 × 联网线索 → 成稿 */
'use strict';

const GEN = { running: false, timers: [], topicId: null, skillId: null };
function clearGen() { GEN.timers.forEach(t => { clearInterval(t); clearTimeout(t); }); GEN.timers = []; GEN.running = false; }
function later(fn, ms) { const t = setTimeout(fn, ms); GEN.timers.push(t); return t; }
function every(fn, ms) { const t = setInterval(fn, ms); GEN.timers.push(t); return t; }

function addTask(kind, label, topicId, detail, done) {
  const t = { id: uid(), kind, label, topicId: topicId || '', status: done ? 'done' : 'running', progress: done ? 100 : 8, startedAt: now(), detail: detail || '' };
  S.tasks.unshift(t); saveState(); updateBadges(); return t;
}
function finishTask(id, detail) { const t = S.tasks.find(x => x.id === id); if (t) { t.status = 'done'; t.progress = 100; if (detail) t.detail = detail; } saveState(); updateBadges(); }

/* ---------- 检索 ---------- */
function grams(q) { const s = String(q).replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ''); const g = new Set(); for (let i = 0; i < s.length - 1; i++) g.add(s.slice(i, i + 2)); (String(q).match(/[a-zA-Z]{3,}/g) || []).forEach(w => g.add(w.toLowerCase())); return g; }
function scoreText(hay, g) { let s = 0; g.forEach(x => { if (hay.includes(x)) s++; }); return s; }
function retrieveClaims(topic, query, packId) {
  let pool;
  if (packId && packById(packId)) pool = packById(packId).claims.map(claimById).filter(Boolean);
  else pool = claimsOf(topic);
  const g = grams(query);
  return pool.map(c => { const d = docById(c.doc) || {}; return { c, d, s: scoreText((c.text + d.title + d.org + (d.tags || []).join('') + (d.summary || '')).toLowerCase(), g) }; })
    .sort((a, b) => b.s - a.s);
}
function ensureWebFor(topic) {
  let rows = S.web.filter(w => w.topic === topic.id);
  if (!rows.length) {
    const keys = (topic.keywords.length ? topic.keywords : [topic.title.slice(0, 6)]).slice(0, 3);
    rows = keys.map((k, i) => {
      const w = { id: 'web_' + (S.web.length + 1 + i), topic: topic.id, title: `${k} · 最新公开进展`, source: '演示检索结果', date: fmtD(now() - (i + 1) * DAY), tag: '演示', snippet: `围绕「${k}」的公开报道与官方表态汇总（演示线索，接入真实搜索后替换为实时结果）。` };
      S.web.push(w); return w;
    });
    saveState();
  }
  return rows;
}
function retrieveWeb(topic, query) {
  const rows = ensureWebFor(topic);
  const g = grams(query + topic.keywords.join(''));
  return [...rows].sort((a, b) => scoreText((b.title + b.snippet).toLowerCase(), g) - scoreText((a.title + a.snippet).toLowerCase(), g));
}

/* ---------- 写作规则 ---------- */
const AVOID_MAP = { '必然': '可能', '绝对': '相对', '彻底解决': '缓解', '震惊': '引发关注', '史无前例': '罕见', '一劳永逸': '阶段性见效', '脱钩必然': '脱钩风险' };
const INTENSIFIERS = /非常|十分|极其|极为|巨大的|显著地|大幅地/g;
function soften(text, sk) {
  let out = text;
  (sk.avoid || []).forEach(w => { if (!w) return; out = out.split(w).join(AVOID_MAP[w] || ''); });
  if (sk.style.formality < 45) out = out.replace(INTENSIFIERS, '');
  return out.replace(/[，。]{2,}/g, '，').replace(/\s{2,}/g, ' ');
}
function openerFor(sk, i) {
  if ((sk.style.terminology || 0) < 40) return ['', '目前的情况是，', '简单说，', '从公开信息看，'][i % 4];
  const T = {
    '咨政建言': ['从最新进展看，', '总体研判，', '就当前态势而言，', '综合各方动向，'],
    '产业研判': ['从产业链传导看，', '分环节看，', '就供需结构而言，', '从政策落地节奏看，'],
    '学术严谨': ['本节考察的事实基础在于：', '既有研究显示，', '就现有证据而言，', '比较各方论述可见，'],
    '平实克制': ['', '目前的情况是，', '就已披露信息看，', '简单说，'],
    '媒体评论': ['值得注意的是，', '事情的转折在于，', '把时间线拉长看，', '眼下最关键的是，']
  };
  const arr = T[sk.style.tone] || T['咨政建言'];
  return arr[i % arr.length];
}
const hasNum = t => /\d/.test(t);
function claimSentence(sk, item, idx, prevOrg, must) {
  const d = item.d || docById(item.c.doc) || {};
  const c = item.c;
  const flags = must || new Set(sk.must);
  const tag = flags.has('区分官方表态与智库判断') ? (d.orgType === '官方' ? '官方表态' : '智库判断') : '';
  const timePrefix = flags.has('标注政策生效时间') && (c.date || d.date) ? `截至 ${c.date || d.date}，` : '';
  const showDate = !timePrefix && d.date;
  const label = showDate ? `${d.org}（${tag ? tag + ' · ' : ''}${d.date}）` : tag ? `${d.org}（${tag}）` : d.org;
  const body = c.text.replace(/[。；]$/, '');
  if (idx > 0 && prevOrg === d.org) return `${timePrefix}同一机构还指出，${body}`;
  const lead = idx === 0 ? '据' : sk.style.sentence > 70 ? '与此同时，' : ['另据', '此外，据', '另据'][idx % 3];
  return `${timePrefix}${lead}${label}，${body}`;
}
function webSentence(w) { return `公开信息方面，${w.source}（${w.date}）披露，${w.snippet.replace(/[。]$/, '')}`; }
function judgeSentence(sk, role, stances) {
  const LABELS = ['研判', '判断', '评估', '敞口', '弹性', '立场', '结论'];
  const w = (sk.prefer || []).find(x => x && LABELS.includes(x)) || '研判';
  const label = `${w}：`;
  const base = {
    fact: '事实底座已相对明确，后续变量集中在执行口径与时间节奏。',
    debate: `从${stances.slice(0, 3).join('、') || '各方'}立场看，分歧的实质是安全逻辑与效率逻辑的结构性冲突。`,
    scenario: '情景切换的分水岭在于官方执行细则与关键主体的公开表态。',
    advice: '宜以规则导向的组合方案争取边际改善，并同步做好合规与本地化准备。',
    risk: '上述风险应纳入常态化跟踪，触发阈值时同步调整方案。',
    general: '政策空间尚存，宜以规则导向争取边际改善。'
  }[role] || '政策空间尚存，宜以规则导向争取边际改善。';
  const tail = sk.style.stance > 62 ? '建议尽快形成组合方案，抢占窗口。' : sk.style.stance < 35 ? '相关判断仍需继续观察，暂不宜给出单一结论。' : '';
  return label + base + tail;
}
function scenarioSentence(items) {
  const a = items[0], b = items[1];
  return `情景推演：基准情景为现行政策延续、摩擦边际管控${a ? ` [${a.c.id}]` : ''}；乐观情景为以对话与承诺替代对抗；悲观情景为反制升级、供应链与福利双损${b ? ` [${b.c.id}]` : ''}。`;
}
function adviceSentence(items) {
  const coop = items.filter(x => (x.d || {}).stance === '务实合作').slice(0, 2);
  const use = coop.length ? coop : items.slice(0, 2);
  return '建议：' + use.map(x => x.c.text.replace(/[。]$/, '') + ` [${x.c.id}]`).join('；') + '。';
}
function riskSentence(h) { return `风险提示：本节判断依赖公开披露口径，若政策执行力度或时间节奏发生变化，「${h.replace(/^[一二三四五六七八九十\d]+[、.．)）]\s*/, '')}」相关结论需同步复核。`; }
function indicatorSentence() { return '观察指标：官方执行公告的发布节奏、关键主体的公开表态，以及项目审批与落地进度。'; }

function parseRequirement(text) {
  const t = String(text || '');
  const addSec = t.match(/(?:新增|增加|加|补充)(?:一)?(?:节|章节|部分)[：:「"']?([^」"'，。；、]{2,20})/);
  if (addSec) return { type: 'section', param: addSec[1].trim(), label: '新增章节' };
  const limit = t.match(/(?:控制在|不超过|压缩到|精简到|字数)[^\d]{0,6}(\d{2,5})/);
  if (limit) return { type: 'limit', param: +limit[1], label: '篇幅控制' };
  if (/风险/.test(t)) return { type: 'risk', label: '风险提示' };
  if (/情景|乐观|悲观/.test(t)) return { type: 'scenario', label: '情景推演' };
  if (/观察指标|跟踪|监测/.test(t)) return { type: 'indicator', label: '观察指标' };
  if (/角标|引用|出处|标注来源|溯源/.test(t)) return { type: 'cite', label: '强制溯源' };
  if (/数据|量化|百分比|数字/.test(t)) return { type: 'data', label: '强化数据' };
  if (/克制|平实|口吻|形容词|夸张|情绪/.test(t)) return { type: 'calm', label: '口吻克制' };
  if (/官方|智库|区分/.test(t)) return { type: 'label', label: '来源分类' };
  if (/时间点|口径|日期/.test(t)) return { type: 'time', label: '口径时间' };
  if (/精简|压缩|简短|缩短/.test(t)) return { type: 'limit', param: 260, label: '篇幅控制' };
  return { type: 'note', label: '已记录' };
}
function requirementStatus(reqs) {
  const seen = new Set(), out = [];
  (reqs || []).forEach(r => { const text = typeof r === 'string' ? r : r.text; if (!text || seen.has(text)) return; seen.add(text); out.push(Object.assign({ text }, parseRequirement(text))); });
  return out;
}

/* 按 Skill 撰写一节 —— 预览与成稿共用 */
const REQ_MUST = { risk: '每节末尾给出风险提示', label: '区分官方表态与智库判断', time: '标注政策生效时间', indicator: '给出后续观察指标', scenario: '给出三情景推演', data: '关键判断附量化数据' };
function effectiveMust(sk, rq) {
  const set = new Set(sk.must);
  rq.forEach(r => { if (REQ_MUST[r.type]) set.add(REQ_MUST[r.type]); });
  return set;
}
function composeSection(sk, ol, items, webs, reqs, idx) {
  const rq = requirementStatus(reqs || []);
  const has = t => rq.some(r => r.type === t);
  const must = effectiveMust(sk, rq);
  const target = Math.max(120, ol.words || 500);
  const pool = [...items];
  if (sk.style.data > 60 || must.has('关键判断附量化数据')) pool.sort((a, b) => (hasNum(b.c.text) ? 1 : 0) - (hasNum(a.c.text) ? 1 : 0));
  const anchor = sk.style.citeStyle === 'anchor' || has('cite');
  const cite = id => anchor ? ` [${id}]` : '';
  const used = [], orgs = [], stances = [], foots = [];
  const sents = [];
  const op = openerFor(sk, idx || 0);
  if (op) sents.push({ t: op, q: false });
  const role = roleOf(ol.h);
  let len = op.length;
  const maxItems = sk.style.sentence > 70 ? 3 : 4;
  for (const it of pool.slice(0, maxItems)) {
    const s = claimSentence(sk, it, used.length, orgs[orgs.length - 1], must) + cite(it.c.id) + '。';
    sents.push({ t: s, q: true }); orgs.push(it.d.org); stances.push(it.d.stance); used.push(it); len += s.length; foots.push(it.c.id);
    if (len > target * 0.72) break;
  }
  if (!sents.length) sents.push({ t: op + `就「${ol.h.replace(/^[一二三四五六七八九十\d]+[、.．)）]\s*/, '')}」而言，专题资料尚未提供可直接引用的论据，需补充资料后再行研判。`, q: false });
  if (webs.length && (sk.style.data > 45 || must.has('关键判断附量化数据') || idx === 0)) {
    const w = webs[0]; const s = webSentence(w) + cite(w.id) + '。';
    sents.push({ t: s, q: true }); len += s.length; foots.push(w.id);
  }
  const uniqStances = [...new Set(stances)].filter(Boolean);
  if (role === 'debate' && uniqStances.length > 1) sents.push({ t: `对比${uniqStances.slice(0, 3).join('、')}三类表述可见，分歧集中在政策工具的力度与时间节奏，而非事实本身。`, q: false });
  if (must.has('给出三情景推演') && ol.scenario) sents.push({ t: scenarioSentence(used.length ? used : pool), q: true });
  if (role === 'advice' && must.has('结尾给出可执行建议') && pool.length) {
    const rest = pool.filter(x => !used.includes(x));
    sents.push({ t: rest.length ? adviceSentence(rest) : '落实次序上，建议先争取磋商空间，再推进本地化与技术授权布局，并同步完善合规体系。', q: rest.length > 0 });
  }
  sents.push({ t: judgeSentence(sk, role, uniqStances), q: false });
  if (must.has('给出后续观察指标') && (role === 'risk' || role === 'advice' || ol.isLast)) sents.push({ t: indicatorSentence(), q: false });
  if (must.has('每节末尾给出风险提示')) sents.push({ t: riskSentence(ol.h), q: false });
  let text = sents.map(x => {
    if (x.q) return x.t;
    let t = x.t;
    if (has('calm')) t = t.replace(INTENSIFIERS, '');
    return soften(t, sk);
  }).join('');
  if (!anchor && foots.length) text += `\n出处：${[...new Set(foots)].map(id => `[${id}]`).join('')}`;
  const lim = rq.find(r => r.type === 'limit');
  if (lim && lim.param) {
    const max = Math.max(80, lim.param);
    if (text.length > max) { const cut = text.slice(0, max); const stop = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('；')); text = (stop > 40 ? cut.slice(0, stop + 1) : cut) + '（按篇幅要求节选）'; }
  }
  return text;
}

/* ---------- 按小节语义分配证据 ---------- */
const SECTION_ROLES = [
  { re: /(态势|事实|背景|时间线|发生了什么|现状|进展|政策事实)/, kind: 'fact' },
  { re: /(分歧|博弈|视角|碰撞|立场|各方|多方)/, kind: 'debate' },
  { re: /(推演|趋势|情景|未来|展望|下一步)/, kind: 'scenario' },
  { re: /(建议|启示|对策|路径|应对|合作|对冲)/, kind: 'advice' },
  { re: /(风险|挑战|敞口|影响|评估)/, kind: 'risk' }
];
const roleOf = h => (SECTION_ROLES.find(x => x.re.test(h)) || { kind: 'general' }).kind;
function pickForSection(ol, ranked, usedIds) {
  const g = grams(ol.h + ol.point);
  const role = roleOf(ol.h);
  const scored = ranked.map(x => {
    let s = scoreText((x.c.text + (x.d.tags || []).join('') + x.d.org).toLowerCase(), g) * 2;
    if (role === 'fact') { if (x.d.orgType === '官方') s += 7; if ((x.c.date || x.d.date || '') >= '2026-01') s += 3; }
    if (role === 'scenario' && /若|预计|将|到 ?20\d\d|情景|短期/.test(x.c.text)) s += 7;
    if (role === 'advice') { if (x.d.stance === '务实合作') s += 7; if (/建议|应|可以|模式|呼吁/.test(x.c.text)) s += 4; }
    if (role === 'risk' && /损失|风险|压力|下滑|缺口|成本|依赖/.test(x.c.text)) s += 7;
    if (usedIds.has(x.c.id)) s -= 14;
    return { x, s };
  }).sort((a, b) => b.s - a.s);
  if (role === 'debate') {
    const seen = new Set(), out = [];
    for (const it of scored) { if (!seen.has(it.x.d.stance)) { seen.add(it.x.d.stance); out.push(it.x); } if (out.length >= 4) break; }
    for (const it of scored) { if (out.length >= 4) break; if (!out.includes(it.x)) out.push(it.x); }
    return out;
  }
  return scored.slice(0, 4).map(y => y.x);
}
function pickWebForSection(ol, webs, usedWeb) {
  const g = grams(ol.h + ol.point);
  const fresh = webs.filter(w => !usedWeb.has(w.id));
  const pool = fresh.length ? fresh : webs;
  return [...pool].sort((a, b) => scoreText((b.title + b.snippet).toLowerCase(), g) - scoreText((a.title + a.snippet).toLowerCase(), g)).slice(0, 2);
}

/* ---------- 组装整篇 ---------- */
function buildDraft(topic, sk, opts) {
  const query = topic.title + topic.keywords.join('') + topic.questions.join('');
  const ranked = retrieveClaims(topic, query, opts.packId);
  const webs = opts.web ? retrieveWeb(topic, query) : [];
  const scale = opts.length === 'brief' ? 0.6 : opts.length === 'deep' ? 1.4 : 1;
  const reqs = [...new Set([...sk.requirements.map(r => r.text), ...(opts.extraReq ? [opts.extraReq] : [])])];
  const rq = requirementStatus(reqs);
  if (opts.type === '矩阵') {
    const docs = topic.sourceIds.map(docById).filter(d => d && d.status === 'ready');
    const cols = ['对象国视角', '美欧视角', '周边视角'];
    const colOf = d => d.region === topic.region ? 0 : ['美国', '英国'].includes(d.orgCountry) ? 1 : 2;
    const rows = docs.map(d => {
      const cells = ['—', '—', '—'];
      cells[colOf(d)] = d.summary ? d.summary.slice(0, 42) + '…' : d.stance;
      return { org: d.org, stance: d.stance, cells, quote: d.claims[0] ? `${d.claims[0].text.slice(0, 30)}… [${d.claims[0].id}]` : '—' };
    });
    const sections = [{ id: uid(), h: '矩阵解读', p: composeSection(sk, { h: '矩阵解读', point: '归纳三方视角的分歧焦点与我方应对主线。', words: 520, scenario: true, isLast: true }, ranked.slice(0, 4), webs.slice(0, 1), reqs, 0) }];
    return { sections, matrix: { cols, rows }, ranked, webs, reqs: rq, docUsed: [...new Set(ranked.map(x => x.c.doc))], webUsed: webs.slice(0, 1).map(w => w.id) };
  }
  const usedIds = new Set(), usedWeb = new Set();
  const extras = rq.filter(r => r.type === 'section');
  const sIdx = sk.outline.findIndex(o => roleOf(o.h) === 'scenario');
  const scenarioIdx = sIdx >= 0 ? sIdx : sk.outline.length - 1;
  const sections = sk.outline.map((o, i) => {
    const use = pickForSection(o, ranked, usedIds);
    use.forEach(u => usedIds.add(u.c.id));
    const ws = pickWebForSection(o, webs, usedWeb);
    ws.forEach(w => usedWeb.add(w.id));
    const ol = Object.assign({}, o, { words: Math.round((o.words || 500) * scale), scenario: i === scenarioIdx, isLast: !extras.length && i === sk.outline.length - 1 });
    return { id: uid(), h: o.h, p: composeSection(sk, ol, use, ws, reqs, i) };
  });
  extras.forEach(r => {
    const use = pickForSection({ h: r.param, point: r.text }, ranked, usedIds);
    use.forEach(u => usedIds.add(u.c.id));
    sections.push({ id: uid(), h: `${CN_NUM[sections.length + 1] || sections.length + 1}、${r.param}`, p: composeSection(sk, { h: r.param, point: `按用户要求补充「${r.param}」相关内容。`, words: 420, scenario: false, isLast: true }, use, pickWebForSection({ h: r.param, point: r.text }, webs, usedWeb), reqs, sections.length) });
  });
  const citedDocs = new Set();
  sections.forEach(s => (s.p.match(/\[doc_\d+_p\d+_c\d+\]/g) || []).forEach(m => citedDocs.add(m.slice(1).split('_p')[0])));
  const docUsed = [...citedDocs];
  const webUsed = [...new Set(webs.map(w => w.id))].filter(id => sections.some(s => s.p.includes('[' + id + ']')));
  return { sections, ranked, webs, reqs: rq, docUsed, webUsed };
}

/* ---------- 生成流水线 ---------- */
function runGeneration(opts) {
  const topic = topicById(opts.topicId); if (!topic) return;
  const sk = skillById(opts.skillId || topic.skillId);
  if (!sk) { toast('该专题尚未绑定写作 Skill，请先上传范文提炼或选择一套 Skill', { type: 'warn', duration: 5200 }); return; }
  if (!topic.sourceIds.length) { toast('专题还没有资料，请先添加研报或上传范文', { type: 'warn' }); return; }
  clearGen(); GEN.running = true; GEN.topicId = topic.id; GEN.skillId = sk.id;
  const options = Object.assign({ web: S.prefs.webSearch, length: S.prefs.length, packId: null }, opts);
  const draft = buildDraft(topic, sk, options);
  if (!draft.ranked.length) { clearGen(); toast('专题资料尚未解析出可用论据，请稍后重试或补充资料', { type: 'warn' }); return; }
  const task = addTask(options.extraReq ? 'revise' : 'write', (options.extraReq ? '按要求重写 · ' : '深度撰稿 · ') + topic.title, topic.id, `按 Skill v${curVersion(sk)} 撰写 ${draft.sections.length} 节`);
  const stages = [
    { k: 'skill', t: `读取写作 Skill · v${curVersion(sk)}`, d: `${sk.outline.length} 节结构 · ${sk.requirements.length} 条既有要求` },
    { k: 'docs', t: '检索专题资料库', d: `${topic.sourceIds.length} 篇资料 → 命中 ${Math.min(draft.ranked.length, 24)} 条论据` },
    ...(options.web ? [{ k: 'web', t: '联网检索最新线索', d: `${draft.webs.length} 条外部信息待核对` }] : []),
    { k: 'write', t: '按结构逐节撰写', d: `${draft.sections.length} 节 · 目标 ${draft.sections.reduce((a, s) => a + s.p.length, 0)} 字` },
    { k: 'check', t: '落实要求与溯源校对', d: `${draft.reqs.length} 条要求 · 角标全量校验` }
  ];
  openModal(`<div class="md-head"><h3>${icon('spark', 17)}${options.extraReq ? '按要求重写' : '生成新稿'} · ${esc(topic.title)}</h3><button class="icon-btn" data-action="gen-cancel">${icon('x', 17)}</button></div>
  <div class="md-body gen-body">
    <div class="gen-left">
      <div class="gen-skill">${icon('spark', 14)}<div><b>${esc(sk.name)}</b><span>v${curVersion(sk)} · ${esc(sk.style.tone)} · ${sk.outline.length} 节</span></div></div>
      <div class="stage-list" id="genStages">${stages.map((s, i) => `<div class="stage" data-i="${i}"><span class="st-ic">${icon('clock', 14)}</span><span class="st-tx">${esc(s.t)}<em>${esc(s.d)}</em></span><span class="st-state">等待</span></div>`).join('')}</div>
      <div class="progress lg"><i id="genBar" style="width:4%"></i></div>
      <div class="gen-found" id="genFound"></div>
      <div class="hint gen-demo">${icon('info', 12)} 演示环境：联网检索返回内置线索，接入真实搜索后替换为实时结果。</div>
    </div>
    <div class="gen-right"><div class="gen-stream" id="genStream"><div class="pop-empty">正在准备写作…</div></div></div>
  </div>
  <div class="md-foot" id="genFoot"><span class="hint">生成过程可取消，已完成的资料检索不会丢失</span><button class="btn btn-ghost" data-action="gen-cancel">取消</button></div>`, true);

  const setStage = (i, state) => {
    const box = document.getElementById('genStages'); if (!box) return;
    box.querySelectorAll('.stage').forEach((r, ri) => {
      if (ri < i || (ri === i && state === 'done')) { r.className = 'stage done'; r.querySelector('.st-ic').innerHTML = icon('check', 14); r.querySelector('.st-state').textContent = '完成'; }
      else if (ri === i) { r.className = 'stage run'; r.querySelector('.st-ic').innerHTML = icon('refresh', 14); r.querySelector('.st-state').textContent = '进行中'; }
    });
    const bar = document.getElementById('genBar'); if (bar) bar.style.width = Math.min(100, (i + (state === 'done' ? 1 : 0.35)) / stages.length * 100) + '%';
  };
  const found = html => { const f = document.getElementById('genFound'); if (f) f.insertAdjacentHTML('beforeend', html); };
  let si = 0;
  const advance = () => {
    if (!GEN.running) return;
    if (si > 0) setStage(si - 1, 'done');
    if (si >= stages.length) { finish(); return; }
    const st = stages[si]; setStage(si, 'run');
    if (st.k === 'skill') { found(`<div class="gf-row">${icon('layers', 13)}<span>结构：${sk.outline.map(o => esc(o.h.replace(/^[一二三四五六七八九十\d]+[、.．)）]\s*/, ''))).join(' → ')}</span></div>`); later(() => { si++; advance(); }, 700); }
    else if (st.k === 'docs') {
      const top = draft.ranked.slice(0, 4);
      top.forEach((x, i) => later(() => found(`<div class="gf-row doc">${icon('anchor', 13)}<span>${esc(x.d.org)}：${esc(x.c.text.slice(0, 30))}…</span>${citeChip(x.c.id)}</div>`), 160 * i));
      later(() => { si++; advance(); }, 900);
    } else if (st.k === 'web') {
      draft.webs.slice(0, 4).forEach((w, i) => later(() => found(`<div class="gf-row web">${icon('globe', 13)}<span><b>${esc(w.source)}</b> · ${w.date}：${esc(w.title)}</span>${citeChip(w.id)}</div>`), 260 * i));
      later(() => { si++; advance(); }, 1500);
    } else if (st.k === 'write') {
      const stream = document.getElementById('genStream'); if (stream) stream.innerHTML = '';
      let i = 0;
      const nextSection = () => {
        if (!GEN.running) return;
        if (i >= draft.sections.length) { si++; advance(); return; }
        const sec = draft.sections[i++];
        const div = document.createElement('div'); div.className = 'rp-section'; div.innerHTML = `<h4>${esc(sec.h)}</h4><p></p>`;
        const stream2 = document.getElementById('genStream'); if (!stream2) return; stream2.appendChild(div);
        const p = div.querySelector('p'); let k = 0;
        const timer = every(() => {
          k = Math.min(sec.p.length, k + 8); p.textContent = sec.p.slice(0, k);
          stream2.scrollTop = stream2.scrollHeight;
          if (k >= sec.p.length) { clearInterval(timer); p.innerHTML = renderCites(sec.p); later(nextSection, 180); }
        }, 16);
      };
      nextSection();
    } else {
      const list = draft.reqs.length ? draft.reqs.map(r => `<div class="rq-check ${r.type === 'note' ? 'note' : 'ok'}">${icon(r.type === 'note' ? 'info' : 'check', 13)}<span>${esc(r.text)}</span><em>${r.type === 'note' ? '已记录 · 需人工确认' : '已落实 · ' + r.label}</em></div>`).join('') : '<div class="hint">本次没有额外要求</div>';
      found(`<div class="gf-check">${list}</div>`);
      later(() => { si++; advance(); }, 900);
    }
  };
  const finish = () => {
    clearGen();
    const words = draft.sections.reduce((a, s) => a + s.h.length + s.p.length, 0);
    let rp;
    if (options.targetReportId && reportById(options.targetReportId)) {
      rp = reportById(options.targetReportId);
      rp.sections = draft.sections; rp.skillId = sk.id; rp.skillVersion = curVersion(sk);
      rp.matrix = draft.matrix || null; rp.type = options.type === '矩阵' ? '矩阵' : rp.type;
      rp.docUsed = draft.docUsed; rp.webUsed = draft.webUsed; rp.requirements = draft.reqs.map(r => r.text);
      rp.status = 'ready'; rp.updatedAt = now();
      pushVersion('report', rp, options.extraReq ? 'require' : 'ai', options.extraReq ? `按要求重写：${options.extraReq}` : `按 Skill v${curVersion(sk)} 重新生成`);
    } else {
      rp = {
        id: uid(), topicId: topic.id, skillId: sk.id, skillVersion: curVersion(sk), type: options.type === '矩阵' ? '矩阵' : '内参',
        title: topic.title + ' · ' + (options.type === '矩阵' ? '多智库立场碰撞矩阵' : sk.style.tone === '咨政建言' ? '咨政内参' : '研判稿') + '（' + fmtD(now()) + '）',
        status: 'ready', sections: draft.sections, matrix: draft.matrix || null, docUsed: draft.docUsed, webUsed: draft.webUsed,
        requirements: draft.reqs.map(r => r.text), createdAt: now(), updatedAt: now(), versions: []
      };
      S.reports.unshift(rp); topic.reportIds.push(rp.id);
      pushVersion('report', rp, options.extraReq ? 'require' : 'ai', `按 Skill v${curVersion(sk)} 首次成稿（资料 ${draft.docUsed.length} 篇${options.web ? ` + 联网 ${draft.webUsed.length} 条` : ''}）`);
    }
    sk.usage++; S.metrics.drafts++; S.metrics.monthDrafts++; S.metrics.skillUses++;
    finishTask(task.id, `成稿 ${draft.sections.length} 节 · ${words} 字`);
    saveState(); closeModal();
    ED.reportId = rp.id; ED.draft = null; ED.editing = false;
    ui.topicId = topic.id; ui.topicTab = 'write'; go('topic', topic.id);
    toast(`已成稿：${draft.sections.length} 节 · ${words} 字，可直接编辑或继续提要求`);
  };
  advance();
}
function cancelGeneration() { clearGen(); closeModal(); S.tasks.forEach(t => { if (t.status === 'running' && t.kind === 'write') { t.status = 'failed'; t.detail = '用户取消'; } }); saveState(); updateBadges(); toast('已取消本次生成', { type: 'warn' }); }