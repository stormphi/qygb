/* 观澜研究台 — 写作 Skill：范文分析、列表与可编辑工作台 */
'use strict';

const SED = { dirty: false };
const CN_NUM = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const TERMS = ['反补贴', '关税', '供应链', '产能', '下游化', '配额', '主权', '算力', '本地化', '合规', '碳足迹', '冶炼', '出口管制', '价格承诺', '磋商', '补贴', '产业链', '地缘', '敞口', '弹性', '前驱体', '数据主权', '技术授权', '福利损失', '关键矿物'];
const clamp = (v, a, b) => Math.max(a, Math.min(b, Math.round(v)));

/* ---------- 从范文正文真实统计，提炼结构与风格 ---------- */
function analyzeReport(text) {
  const clean = String(text || '').replace(/\r/g, '').replace(/\u00a0/g, ' ').trim();
  const lines = clean.split('\n').map(s => s.trim()).filter(Boolean);
  const chars = clean.replace(/\s/g, '').length;
  const HRE = /^(?:([一二三四五六七八九十]{1,3}[、.．)）])|(第[一二三四五六七八九十\d]{1,3}[部分章节篇])|(\d{1,2}[、.．)）])|([（(]\d{1,2}[)）]))\s*(.*)$/;
  const blocks = []; let docTitle = '';
  if (lines.length && lines[0].length <= 42 && !/[。！？]$/.test(lines[0]) && !HRE.test(lines[0])) docTitle = lines.shift();
  let cur = null;
  lines.forEach(ln => {
    const m = ln.match(HRE);
    if (m && ln.length <= 60) { cur = { h: ln.replace(/\s+/g, ' ').slice(0, 40), body: [] }; blocks.push(cur); }
    else { if (!cur) { cur = { h: '', body: [] }; blocks.push(cur); } cur.body.push(ln); }
  });
  let sections = blocks.filter(b => b.h || b.body.join('').length > 30);
  if (!sections.length) sections = [{ h: '', body: [clean] }];
  if (sections.length < 2) {
    const paras = clean.split(/\n+/).filter(p => p.trim().length > 20);
    const names = ['一、事实与背景', '二、分析与判断', '三、影响评估', '四、对策与建议'];
    const size = Math.max(1, Math.ceil(paras.length / 4));
    sections = [];
    for (let i = 0; i < Math.min(4, Math.ceil(paras.length / size)); i++) sections.push({ h: names[i], body: paras.slice(i * size, (i + 1) * size) });
    if (!sections.length) sections = [{ h: names[0], body: [clean] }];
  }
  sections = sections.slice(0, 8);
  const totalBody = sections.reduce((a, s) => a + s.body.join('').length, 0) || 1;
  const outline = sections.map((s, i) => {
    const body = s.body.join(' ').trim();
    const first = (body.split(/[。！？]/)[0] || body).trim();
    const h = s.h || `${CN_NUM[i + 1] || i + 1}、${first.slice(0, 12) || '核心内容'}`;
    const share = body.length / totalBody;
    const point = first ? (first.length > 46 ? first.slice(0, 46) + '…' : first) : `围绕「${h.replace(/^[一二三四五六七八九十\d]+[、.．)）]\s*/, '').slice(0, 24)}」给出事实与判断。`;
    return outlineItem(h, point, Math.max(150, Math.round(share * 3000 / 50) * 50));
  });

  const sentences = clean.split(/[。！？!?；;]/).map(s => s.trim()).filter(s => s.length > 3);
  const avgSentence = Math.round(chars / Math.max(1, sentences.length));
  const dataCount = (clean.match(/\d+(?:[.,]\d+)?\s*(?:%|％|亿|万|美元|欧元|个百分点|倍|GWh|辆|人|吨)/g) || []).length;
  const kilo = Math.max(0.4, chars / 1000);
  let termCount = 0; TERMS.forEach(t => { termCount += (clean.split(t).length - 1); });
  const quoted = [...new Set((clean.match(/[“"「]([^”"」]{2,6})[”"」]/g) || []).map(s => s.slice(1, -1)))];
  const formal = ['研判', '据此', '综上', '本报告', '建议', '应当', '鉴于', '其一', '其二', '第一', '第二', '总体看', '需'].reduce((a, w) => a + (clean.split(w).length - 1), 0);
  const casual = ['我们觉得', '其实', '挺', '差不多', '大概', '说实话'].reduce((a, w) => a + (clean.split(w).length - 1), 0);
  const strong = ['必须', '坚决', '严重', '强硬', '绝不'].reduce((a, w) => a + (clean.split(w).length - 1), 0);
  const mild = ['审慎', '克制', '客观', '边际', '有限'].reduce((a, w) => a + (clean.split(w).length - 1), 0);
  const style = {
    tone: /建议|启示|对我/.test(clean) ? '咨政建言' : /产业|供应链|产能|冶炼/.test(clean) ? '产业研判' : avgSentence < 28 ? '平实克制' : '学术严谨',
    person: /我们认为|我院认为|我们建议/.test(clean) ? '第一人称（我们）' : '第三人称',
    formality: clamp(48 + formal * 3.2 - casual * 9, 20, 98),
    sentence: clamp((avgSentence - 16) / 46 * 100, 8, 96),
    terminology: clamp(termCount / kilo * 9, 15, 96),
    data: clamp(dataCount / kilo * 11, 10, 96),
    stance: clamp(34 + strong * 8 - mild * 5, 12, 92),
    citeStyle: 'anchor'
  };
  const must = [];
  if (/\[doc_\d+|（\d{4}）|参见|资料来源|页码/.test(clean)) must.push('每条论断保留页码角标');
  if (dataCount >= 3) must.push('关键判断附量化数据');
  if (/乐观|悲观|情景/.test(clean)) must.push('给出三情景推演');
  if (/建议|启示|对策/.test(clean)) must.push('结尾给出可执行建议');
  if (/\d{4}\s*年|生效|时间线/.test(clean)) must.push('标注政策生效时间');
  if (/观察指标|跟踪|监测/.test(clean)) must.push('给出后续观察指标');
  if (!must.length) must.push('每条论断保留页码角标');
  const logic = [];
  if (outline.length >= 2) logic.push(`以 ${CN_NUM[outline.length] || outline.length} 段式推进：` + outline.map(o => o.h.replace(/^[一二三四五六七八九十\d]+[、.．)）]\s*/, '')).join(' → '));
  if (/首先|第一|其一/.test(clean)) logic.push('段内按序编号，逐条给出判断');
  if (/但|然而|分歧|争议|对比/.test(clean)) logic.push('先呈现对立观点，再给出本报告判断');
  if (/情景|乐观|悲观/.test(clean)) logic.push('用情景推演替代单一预测');
  if (/建议|启示/.test(clean)) logic.push('结论落到我方可执行动作');
  if (/观察指标|跟踪/.test(clean)) logic.push('收尾给出可观测的跟踪指标');
  while (logic.length < 3) logic.push(['先事实后判断，事实须带时间锚点', '每个判断给出来源与出处', '避免情绪化表述，保持研判口吻'][logic.length]);
  const prefer = [...new Set([...quoted, ...TERMS.filter(t => clean.includes(t))])].slice(0, 8);
  const avoid = ['必然', '彻底解决', '绝对', '震惊', '史无前例'].filter(w => !clean.includes(w));
  let base = docTitle ? docTitle.replace(/[（(].*?[)）]/g, '').trim() : style.tone;
  base = base.split(/[，,。；;：:—\-|]/)[0].trim() || style.tone;
  if (base.length > 14) base = base.slice(0, 14).replace(/[与和的及对在为以之]$/, '');
  return { chars, outline, logic, style, must, prefer: prefer.length ? prefer : ['研判'], avoid, avgSentence, dataCount, termCount, paraCount: lines.length, suggestName: `${base} · ${CN_NUM[outline.length] || outline.length}段式` };
}

/* ---------- Skill 列表 ---------- */
function skillCard(sk) {
  const topics = sk.topicIds.map(topicById).filter(Boolean);
  return `<div class="skill-card" data-action="open-skill" data-id="${sk.id}">
    <div class="sc-top"><span class="sc-ic" style="background:${sk.origin === 'distill' ? 'linear-gradient(135deg,#9B7BFF,#7C5CFC)' : 'linear-gradient(135deg,#3FB9A6,#0E9F8A)'}">${icon(sk.origin === 'distill' ? 'spark' : 'pen', 20)}</span>
      <div class="sc-head"><b>${esc(sk.name)}</b><span class="sc-origin">${sk.origin === 'distill' ? '范文提炼' : '手工创建'} · v${curVersion(sk)}</span></div>
      <span class="sc-ver">${icon('timeline', 13)}${sk.versions.length}</span></div>
    <div class="sc-body">
      <div class="sc-outline">${sk.outline.slice(0, 4).map((o, i) => `<span class="so-step"><i>${i + 1}</i>${esc(o.h.replace(/^[一二三四五六七八九十\d]+[、.．)）]\s*/, ''))}</span>`).join('')}${sk.outline.length > 4 ? `<span class="so-more">+${sk.outline.length - 4}</span>` : ''}</div>
      <div class="sc-tags"><span class="chip violet">${esc(sk.style.tone)}</span><span class="chip">${sk.outline.length} 节结构</span>${sk.requirements.length ? `<span class="chip magenta">${sk.requirements.length} 条我的要求</span>` : ''}</div>
      ${topics.length ? `<div class="sc-topics">${icon('book', 12)}${topics.map(t => esc(t.title)).join('、')}</div>` : '<div class="sc-topics faint">尚未关联专题</div>'}
    </div>
    <div class="sc-foot"><span class="hint">${relTime(sk.updatedAt)}更新 · 已用于 ${sk.usage} 篇</span>
      <span class="sc-acts"><button class="mini-btn" data-action="skill-history" data-id="${sk.id}">历史</button><button class="mini-btn ok" data-action="skill-use" data-id="${sk.id}">用它写作</button></span></div>
  </div>`;
}
function renderSkills() {
  const f = filtersFor('skills');
  let rows = S.skills.filter(s => (!f.q || (s.name + s.style.tone + s.sourceName).toLowerCase().includes(f.q.toLowerCase())) && (f.region === 'all' || (f.region === 'distill' ? s.origin === 'distill' : s.origin === 'manual')));
  rows = [...rows].sort(f.sort === 'usage' ? (a, b) => b.usage - a.usage : (a, b) => b.updatedAt - a.updatedAt);
  return `<div class="page"><div class="page-head rise" style="--i:0"><div><div class="page-title">${icon('spark', 21)}写作 Skill<span class="faint fs13 num">${S.skills.length} 套</span></div><div class="page-sub">把您认可的报告沉淀为可复用的写作思路与风格，随时编辑、随时回看历史版本</div></div>
    <div class="head-actions"><button class="btn btn-ghost" data-action="skill-new">${icon('plus', 15)}手工新建</button><button class="btn btn-primary" data-action="skill-from-upload">${icon('upload', 15)}上传范文提炼</button></div></div>
  <div class="skill-how rise" style="--i:1">
    ${[['upload', '上传范文', '把您写过、认可的报告交给系统'], ['spark', '提炼 Skill', '自动识别结构骨架、论证路径与语言风格'], ['edit', '按需编辑', '章节、风格、禁用词与您的要求都能改'], ['pen', '反复复用', '结合专题资料与联网线索生成新稿']].map(([ic, t, s], i) => `<div class="sh-step"><span class="sh-ic">${icon(ic, 17)}</span><div><b>${t}</b><span>${s}</span></div>${i < 3 ? `<span class="sh-arrow">${icon('chevR', 15)}</span>` : ''}</div>`).join('')}
  </div>
  <div class="toolbar rise" style="--i:2"><div class="search-box">${icon('search', 16)}<input placeholder="检索 Skill 名称 / 风格 / 范文…" value="${esc(f.q)}" data-filter="q" data-page="skills"></div>
    <select class="select" data-filter="region" data-page="skills"><option value="all">全部来源</option><option value="distill" ${f.region === 'distill' ? 'selected' : ''}>范文提炼</option><option value="manual" ${f.region === 'manual' ? 'selected' : ''}>手工创建</option></select>
    <select class="select" data-filter="sort" data-page="skills"><option value="updated" ${f.sort !== 'usage' ? 'selected' : ''}>最近更新</option><option value="usage" ${f.sort === 'usage' ? 'selected' : ''}>使用最多</option></select></div>
  <div class="skill-grid rise" style="--i:3">${rows.map(skillCard).join('')}</div>
  ${rows.length ? '' : emptyState('spark', '没有匹配的 Skill', '换个关键词，或上传一份范文重新提炼')}</div>`;
}

/* ---------- Skill 编辑工作台 ---------- */
function renderSkillPage(id) {
  const sk = skillById(id || ui.skillId); if (!sk) return renderSkills();
  ui.skillId = sk.id;
  const topics = S.topics.filter(t => sk.topicIds.includes(t.id));
  const totalWords = sk.outline.reduce((a, o) => a + (+o.words || 0), 0);
  const styleRows = [['formality', '正式度', '口语化', '公文体'], ['sentence', '句长', '短句为主', '长句为主'], ['terminology', '术语密度', '通俗', '专业'], ['data', '数据密度', '少量化', '重量化'], ['stance', '立场强度', '克制中立', '鲜明表态']];
  return `<div class="page"><div class="page-head rise" style="--i:0">
    <div><div class="page-title"><button class="icon-btn" data-action="nav" data-page="skills">${icon('chevL', 18)}</button><span class="sk-title">${esc(sk.name)}</span><span class="ver-chip" data-action="skill-history" data-id="${sk.id}">${icon('timeline', 13)}v${curVersion(sk)} · ${sk.versions.length} 个版本</span></div>
      <div class="page-sub">${sk.origin === 'distill' ? `提炼自《${esc(sk.sourceName)}》` : '手工创建的写作模板'} · ${sk.outline.length} 节 · 约 ${totalWords} 字 · 已用于 ${sk.usage} 篇</div></div>
    <div class="head-actions"><span class="dirty-dot ${SED.dirty ? 'on' : ''}">${SED.dirty ? '有未存版本的修改' : '已同步'}</span>
      <button class="btn btn-ghost" data-action="skill-history" data-id="${sk.id}">${icon('timeline', 15)}历史版本</button>
      <button class="btn btn-primary" data-action="skill-use" data-id="${sk.id}">${icon('pen', 15)}用它写作</button></div></div>
  <div class="skill-layout rise" style="--i:1">
    <div class="sk-main">
      <div class="card sk-card"><div class="card-head"><span class="card-title">${icon('layers', 16)}结构骨架</span><span class="hint">拖动或用箭头调整顺序，写作时按此顺序成节</span></div>
        <div class="card-body"><div class="outline-list" id="outlineList">
          ${sk.outline.map((o, i) => `<div class="ol-row" draggable="true" data-oid="${o.id}">
            <span class="ol-grip" title="拖动排序">${icon('drag', 15)}</span>
            <span class="ol-n">${i + 1}</span>
            <div class="ol-fields"><input class="ol-h" value="${esc(o.h)}" data-ol="h" data-oid="${o.id}" data-id="${sk.id}" placeholder="章节标题">
              <textarea class="ol-p" rows="2" data-ol="point" data-oid="${o.id}" data-id="${sk.id}" placeholder="这一节要写什么、怎么写">${esc(o.point)}</textarea></div>
            <div class="ol-side"><label class="ol-words"><input type="number" min="100" step="50" value="${o.words}" data-ol="words" data-oid="${o.id}" data-id="${sk.id}"><span>字</span></label>
              <div class="ol-btns"><button class="icon-btn xs" data-action="ol-up" data-id="${sk.id}" data-oid="${o.id}" title="上移">${icon('arrowUp', 14)}</button><button class="icon-btn xs" data-action="ol-down" data-id="${sk.id}" data-oid="${o.id}" title="下移">${icon('arrowDown', 14)}</button><button class="icon-btn xs danger" data-action="ol-del" data-id="${sk.id}" data-oid="${o.id}" title="删除本节">${icon('trash', 14)}</button></div></div>
          </div>`).join('')}
        </div><button class="btn btn-ghost sm" data-action="ol-add" data-id="${sk.id}" style="margin-top:10px">${icon('plus', 14)}添加章节</button></div></div>

      <div class="card sk-card"><div class="card-head"><span class="card-title">${icon('compass', 16)}写作思路（论证路径）</span><button class="mini-btn" data-action="logic-add" data-id="${sk.id}">${icon('plus', 12)}添加一步</button></div>
        <div class="card-body"><div class="logic-list">${sk.logic.map((l, i) => `<div class="lg-row"><span class="lg-n">${i + 1}</span><input value="${esc(l)}" data-logic="${i}" data-id="${sk.id}"><button class="icon-btn xs danger" data-action="logic-del" data-id="${sk.id}" data-i="${i}">${icon('x', 14)}</button></div>`).join('')}</div></div></div>

      <div class="card sk-card"><div class="card-head"><span class="card-title">${icon('pen', 16)}语言风格</span><span class="hint">拖动即时生效，右侧预览同步变化</span></div>
        <div class="card-body">
          <div class="form-grid" style="margin-bottom:14px">
            <div class="field"><label>语气基调</label><select data-style="tone" data-id="${sk.id}">${['咨政建言', '产业研判', '学术严谨', '平实克制', '媒体评论'].map(x => `<option ${sk.style.tone === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
            <div class="field"><label>人称</label><select data-style="person" data-id="${sk.id}">${['第三人称', '第一人称（我们）'].map(x => `<option ${sk.style.person === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
          </div>
          ${styleRows.map(([k, l, lo, hi]) => `<div class="slider-row"><label>${l}</label><input type="range" min="0" max="100" value="${sk.style[k]}" data-style="${k}" data-id="${sk.id}"><b class="sv" data-sv="${k}">${sk.style[k]}</b><span class="sr-lo">${lo}</span><span class="sr-hi">${hi}</span></div>`).join('')}
          <div class="field" style="margin-top:12px"><label>引用格式</label><div class="radio-line">
            <label class="radio"><input type="radio" name="citeStyle" value="anchor" data-style="citeStyle" data-id="${sk.id}" ${sk.style.citeStyle === 'anchor' ? 'checked' : ''}><span>正文页码角标（可点击溯源）</span></label>
            <label class="radio"><input type="radio" name="citeStyle" value="footnote" data-style="citeStyle" data-id="${sk.id}" ${sk.style.citeStyle === 'footnote' ? 'checked' : ''}><span>文末统一列出出处</span></label>
          </div></div>
        </div></div>

      <div class="card sk-card"><div class="card-head"><span class="card-title">${icon('check', 16)}必备要素与用词</span></div>
        <div class="card-body">
          <div class="sub-label">每篇必须满足</div>
          <div class="chip-line editable">${MUST_POOL.map(m => `<button class="chip toggle ${sk.must.includes(m) ? 'on jade' : ''}" data-action="must-toggle" data-id="${sk.id}" data-m="${esc(m)}">${sk.must.includes(m) ? icon('check', 12) : icon('plus', 12)}${esc(m)}</button>`).join('')}</div>
          <div class="sub-label" style="margin-top:14px">偏好词（优先使用）</div>
          <div class="chip-line editable">${sk.prefer.map((w, i) => `<span class="chip sky">${esc(w)}<button class="chip-x" data-action="word-del" data-id="${sk.id}" data-list="prefer" data-i="${i}">${icon('x', 11)}</button></span>`).join('')}
            <input class="chip-input" placeholder="+ 添加后回车" data-word="prefer" data-id="${sk.id}"></div>
          <div class="sub-label" style="margin-top:14px">禁用词（出现即改写）</div>
          <div class="chip-line editable">${sk.avoid.map((w, i) => `<span class="chip cinnabar">${esc(w)}<button class="chip-x" data-action="word-del" data-id="${sk.id}" data-list="avoid" data-i="${i}">${icon('x', 11)}</button></span>`).join('')}
            <input class="chip-input" placeholder="+ 添加后回车" data-word="avoid" data-id="${sk.id}"></div>
        </div></div>

      <div class="card sk-card req-card"><div class="card-head"><span class="card-title">${icon('msg', 16)}我的要求</span><span class="hint">写作时会逐条落实，稿件页新提的要求也可沉淀到这里</span></div>
        <div class="card-body">
          <div class="req-list">${sk.requirements.map((r, i) => `<div class="req-row"><span class="rq-n">${i + 1}</span><textarea rows="2" data-req="${r.id}" data-id="${sk.id}">${esc(r.text)}</textarea>
            <div class="rq-side"><span class="rq-from ${r.from === '用户' ? 'user' : 'ai'}">${esc(r.from)}</span><span class="hint">${relTime(r.time)}</span><button class="icon-btn xs danger" data-action="req-del" data-id="${sk.id}" data-rid="${r.id}">${icon('trash', 14)}</button></div></div>`).join('') || '<div class="hint" style="padding:6px 2px">还没有额外要求。写作过程中提出的要求可以一键沉淀到这里。</div>'}</div>
          <div class="req-add"><input id="skReqInput" placeholder="例如：每节末尾补一句风险提示；金额统一换算为人民币"><button class="btn btn-soft sm" data-action="req-add" data-id="${sk.id}">${icon('plus', 14)}加入要求</button></div>
        </div></div>
    </div>

    <aside class="sk-rail">
      <div class="card sk-card sticky"><div class="card-head"><span class="card-title">${icon('eye', 16)}风格实时预览</span></div>
        <div class="card-body"><div class="preview-box" id="skPreview">${previewHtml(sk)}</div>
          <div class="hint" style="margin-top:8px">预览用同一段论据演示当前风格的措辞、句长与引用方式，与实际成稿使用同一套写作规则。</div></div></div>
      <div class="card sk-card"><div class="card-head"><span class="card-title">${icon('book', 16)}关联与来源</span></div>
        <div class="card-body">
          <div class="sub-label">适用专题</div>
          <div class="chip-line">${S.topics.map(t => `<button class="chip toggle ${sk.topicIds.includes(t.id) ? 'on navy' : ''}" data-action="sk-topic-toggle" data-id="${sk.id}" data-tid="${t.id}">${esc(t.title.slice(0, 12))}</button>`).join('')}</div>
          ${sk.sourceName ? `<div class="sub-label" style="margin-top:14px">来源范文</div><div class="source-box">${icon('file', 14)}<div><b>${esc(sk.sourceName)}</b><span class="hint">${esc(sk.sourceExcerpt.slice(0, 90))}…</span></div></div>
            <button class="btn btn-ghost sm" data-action="sk-view-source" data-id="${sk.id}" style="margin-top:8px;width:100%;justify-content:center">${icon('eye', 14)}查看范文全文</button>` : ''}
          <div class="sub-label" style="margin-top:14px">版本</div>
          <div class="ver-mini">${[...sk.versions].reverse().slice(0, 3).map(v => `<div class="vm-row"><span class="vm-n" style="background:${KIND_COLOR[v.kind]}">v${v.n}</span><div><b>${esc(v.note)}</b><span>${fmtDT(v.time)} · ${esc(v.author)}</span></div></div>`).join('')}</div>
          <button class="btn btn-ghost sm" data-action="skill-history" data-id="${sk.id}" style="margin-top:8px;width:100%;justify-content:center">${icon('timeline', 14)}查看全部 ${sk.versions.length} 个版本</button>
        </div></div>
      <div class="card sk-card save-card"><div class="card-head"><span class="card-title">${icon('save', 16)}保存版本</span></div>
        <div class="card-body"><div class="field full"><label>Skill 名称</label><input value="${esc(sk.name)}" data-skname="${sk.id}"></div>
          <div class="field full" style="margin-top:10px"><label>版本说明</label><input id="skVerNote" placeholder="例如：补充风险节、下调术语密度"></div>
          <button class="btn btn-primary" data-action="skill-save" data-id="${sk.id}" style="width:100%;justify-content:center;margin-top:12px">${icon('save', 15)}保存为新版本 v${curVersion(sk) + 1}</button>
          <button class="btn btn-danger-ghost sm" data-action="skill-del" data-id="${sk.id}" style="width:100%;justify-content:center;margin-top:8px">${icon('trash', 14)}删除此 Skill</button>
        </div></div>
    </aside>
  </div></div>`;
}
const MUST_POOL = ['每条论断保留页码角标', '关键判断附量化数据', '给出三情景推演', '结尾给出可执行建议', '标注政策生效时间', '给出后续观察指标', '区分官方表态与智库判断', '每节末尾给出风险提示'];

function markSkillDirty() { SED.dirty = true; const d = document.querySelector('.dirty-dot'); if (d) { d.classList.add('on'); d.textContent = '有未存版本的修改'; } }
function renumberOutline(sk) { sk.outline.forEach((o, i) => { o.h = o.h.replace(/^[一二三四五六七八九十\d]+([、.．)）])/, (m, p) => (CN_NUM[i + 1] || i + 1) + p); }); }
function refreshPreview(sk) { const box = document.getElementById('skPreview'); if (box) box.innerHTML = previewHtml(sk); }
function previewHtml(sk) {
  const sample = {
    c: { id: 'doc_05_p9_c1', text: '终裁对抽样企业分别征收 17.0%～35.3% 的反补贴税，叠加 10% 基础关税。', date: '2026-04' },
    d: { org: '欧盟委员会贸易总司', date: '2026-04', orgType: '官方', stance: '保护主义' }
  };
  const p = composeSection(sk, { h: '核心态势研判', point: '给出最新政策事实并定性当前阶段。', words: 420, scenario: false, isLast: true }, [sample], [], [], 0);
  return `<div class="pv-meta"><span class="chip violet">${esc(sk.style.tone)}</span><span class="chip">${esc(sk.style.person)}</span><span class="chip">${sk.style.citeStyle === 'anchor' ? '页码角标' : '文末脚注'}</span></div><p class="pv-text">${renderCites(p)}</p>`;
}
function skillSave(id) {
  const sk = skillById(id); if (!sk) return;
  const note = (document.getElementById('skVerNote') || {}).value || '';
  const v = pushVersion('skill', sk, 'edit', note.trim() || '手工调整结构、风格与要求');
  SED.dirty = false; saveState(); render();
  toast(`已保存为 v${v.n}，可随时在历史版本中对比或恢复`);
}
function skillNew() {
  const sk = {
    id: uid(), name: '未命名写作 Skill', origin: 'manual', topicIds: [], usage: 0, sourceName: '', sourceExcerpt: '',
    outline: [outlineItem('一、核心事实', '交代事件、时间与关键数据。', 500), outlineItem('二、分析判断', '给出本报告判断与依据。', 800), outlineItem('三、对策建议', '落到可执行动作。', 600)],
    logic: ['先事实后判断', '每个判断给出出处', '结论可执行'], style: defaultStyle(),
    must: ['每条论断保留页码角标'], prefer: ['研判'], avoid: ['必然', '绝对'], requirements: [], createdAt: now(), updatedAt: now(), versions: []
  };
  S.skills.unshift(sk); pushVersion('skill', sk, 'create', '手工创建空白 Skill'); saveState();
  ui.skillId = sk.id; go('skill'); toast('已创建空白 Skill，可直接编辑结构与风格');
}
function skillUse(id) {
  const sk = skillById(id); if (!sk) return;
  openModal(`<div class="md-head"><h3>${icon('pen', 17)}用「${esc(sk.name)}」写作</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div>
    <div class="md-body"><div class="field full"><label>选择专题</label><select id="useTopic">${S.topics.map(t => `<option value="${t.id}" ${sk.topicIds.includes(t.id) ? 'selected' : ''}>${esc(t.title)}（${t.sourceIds.length} 篇资料${t.skillId === sk.id ? ' · 已绑定' : ''}）</option>`).join('')}</select></div>
      <div class="funnel-note" style="margin-top:12px">${icon('info', 13)} 将按此 Skill 的 ${sk.outline.length} 节结构${sk.requirements.length ? `与 ${sk.requirements.length} 条要求` : ''}，结合专题资料${S.prefs.webSearch ? '与联网检索' : ''}生成新稿。</div></div>
    <div class="md-foot"><button class="btn btn-ghost" data-action="modal-close">取消</button><button class="btn btn-primary" data-action="skill-use-go" data-id="${sk.id}">${icon('spark', 15)}进入写作台</button></div>`);
}
function skillUseGo(id) {
  const sk = skillById(id); const tid = (document.getElementById('useTopic') || {}).value;
  const t = topicById(tid); if (!t) return;
  if (t.skillId !== sk.id) { t.skillId = sk.id; pushVersion('topic', t, 'bind', `绑定写作 Skill「${sk.name}」v${curVersion(sk)}`); }
  if (!sk.topicIds.includes(t.id)) sk.topicIds.push(t.id);
  saveState(); closeModal(); ui.topicId = t.id; ui.topicTab = 'write'; go('topic', t.id);
  toast(`已进入「${t.title}」写作台，点击「开始生成」即可成稿`);
}
function skillSource(id) {
  const sk = skillById(id); const up = S.uploads.find(u => u.skillId === sk.id) || S.uploads.find(u => u.name === sk.sourceName);
  const text = up ? up.text : sk.sourceExcerpt;
  openModal(`<div class="md-head"><h3>${icon('file', 17)}${esc(sk.sourceName || '来源范文')}</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div>
    <div class="md-body"><pre class="snap-view">${esc(text || '（范文正文未保留）')}</pre></div>
    <div class="md-foot"><span class="hint">${up ? `${up.chars} 字 · v${curVersion(up)} · ${fmtDT(up.time)} 由 ${esc(up.by)} 上传` : ''}</span>${up ? `<button class="btn btn-soft" data-action="up-view" data-id="${up.id}">${icon('edit', 14)}编辑范文</button>` : ''}<button class="btn btn-primary" data-action="modal-close">关闭</button></div>`, true);
}