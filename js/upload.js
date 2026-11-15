/* 观澜研究台 — 范文上传与解析（txt / md / docx / pdf + 粘贴兜底） */
'use strict';

const UP = { topicId: null, phase: 'input', name: '', size: 0, text: '', analysis: null, target: 'new', skillName: '', err: '' };

async function inflateRaw(bytes) {
  if (typeof DecompressionStream === 'undefined') throw new Error('当前浏览器不支持解压，请改用 .txt 或直接粘贴正文');
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
function xmlToText(xml) {
  return xml.replace(/<w:tab[^>]*\/>/g, '\t').replace(/<w:br[^>]*\/>/g, '\n').replace(/<\/w:p>/g, '\n')
    .replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
async function docxText(buf) {
  const u8 = new Uint8Array(buf), dv = new DataView(buf), dec = new TextDecoder('utf-8');
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) { if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; } }
  if (eocd < 0) throw new Error('这不是有效的 .docx 文件');
  const count = dv.getUint16(eocd + 10, true); let off = dv.getUint32(eocd + 16, true);
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(off, true) !== 0x02014b50) break;
    const method = dv.getUint16(off + 10, true), csize = dv.getUint32(off + 20, true);
    const nlen = dv.getUint16(off + 28, true), elen = dv.getUint16(off + 30, true), clen = dv.getUint16(off + 32, true);
    const lho = dv.getUint32(off + 42, true);
    const name = dec.decode(u8.subarray(off + 46, off + 46 + nlen));
    if (name === 'word/document.xml') {
      const lnlen = dv.getUint16(lho + 26, true), lelen = dv.getUint16(lho + 28, true);
      const start = lho + 30 + lnlen + lelen;
      const data = u8.subarray(start, start + csize);
      const xml = method === 0 ? dec.decode(data) : new TextDecoder('utf-8').decode(await inflateRaw(data));
      const t = xmlToText(xml);
      if (t.length < 40) throw new Error('文档正文为空或为图片版');
      return t;
    }
    off += 46 + nlen + elen + clen;
  }
  throw new Error('未在 .docx 中找到正文');
}
async function pdfText(buf) {
  const u8 = new Uint8Array(buf), latin = new TextDecoder('latin1'), raw = latin.decode(u8);
  let out = '';
  const re = /stream\r?\n/g; let m;
  while ((m = re.exec(raw)) !== null) {
    const start = m.index + m[0].length, end = raw.indexOf('endstream', start);
    if (end < 0) break;
    re.lastIndex = end + 9;
    let s;
    try { s = latin.decode(await inflateRaw(u8.subarray(start, end))); } catch (e) { s = latin.decode(u8.subarray(start, end)); }
    if (!/Tj|TJ/.test(s)) continue;
    const ops = s.match(/\((?:\\.|[^\\()])*\)\s*Tj|\[[^\]]*\]\s*TJ|<[0-9A-Fa-f\s]+>\s*Tj/g) || [];
    ops.forEach(op => {
      const hex = op.match(/^<([0-9A-Fa-f\s]+)>/);
      if (hex) { const h = hex[1].replace(/\s/g, ''); let str = ''; for (let i = 0; i + 3 < h.length; i += 4) str += String.fromCharCode(parseInt(h.substr(i, 4), 16)); out += str + '\n'; return; }
      const parts = op.match(/\((?:\\.|[^\\()])*\)/g) || [];
      out += parts.map(p => p.slice(1, -1).replace(/\\([nrt()\\])/g, (_, c) => ({ n: '\n', r: '', t: '\t', '(': '(', ')': ')', '\\': '\\' }[c]))).join('') + '\n';
    });
  }
  const clean = out.replace(/[^\S\n]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  const readable = (clean.match(/[\u4e00-\u9fa5A-Za-z0-9]/g) || []).length;
  if (readable < 120) throw new Error('该 PDF 为扫描件或使用嵌入字体编码，无法可靠提取文字');
  return clean;
}
async function readFileText(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (['txt', 'md', 'markdown', 'text'].includes(ext)) {
    const t = (await file.text()).trim();
    if (!t) throw new Error('文件内容为空');
    return t;
  }
  const buf = await file.arrayBuffer();
  if (ext === 'docx') return await docxText(buf);
  if (ext === 'pdf') return await pdfText(buf);
  if (ext === 'doc') throw new Error('旧版 .doc 无法直接解析，请另存为 .docx 或粘贴正文');
  throw new Error('暂不支持 .' + ext + '，请上传 .docx / .txt / .md / .pdf 或直接粘贴正文');
}

/* ---------- 上传流程 ---------- */
function openUpload(topicId) {
  const t = topicById(topicId) || S.topics[0];
  Object.assign(UP, { topicId: t ? t.id : null, phase: 'input', name: '', size: 0, text: '', analysis: null, target: t && t.skillId ? 'update' : 'new', skillName: '', err: '' });
  renderUpload();
}
function renderUpload() {
  const t = topicById(UP.topicId);
  const bound = t && t.skillId ? skillById(t.skillId) : null;
  if (UP.phase === 'input') {
    openModal(`<div class="md-head"><h3>${icon('upload', 17)}上传范文 · 提炼写作思路与风格</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div>
    <div class="md-body">
      <div class="up-context">${icon('book', 14)} 归属专题：<select class="select sm" data-action="up-topic">${S.topics.map(x => `<option value="${x.id}" ${x.id === UP.topicId ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select><span class="hint">范文只用于提炼写作方式，不会作为事实证据写入稿件。</span></div>
      <div class="dropzone" id="dropZone" data-action="up-pick">
        ${icon('upload', 30)}
        <b>把范文拖到这里，或点击选择文件</b>
        <span>支持 .docx / .txt / .md / .pdf（文字版），单份 ≤ 10MB</span>
        <input type="file" id="upFile" accept=".docx,.txt,.md,.markdown,.pdf,.text" hidden>
      </div>
      ${UP.err ? `<div class="up-err">${icon('alert', 14)}${esc(UP.err)}</div>` : ''}
      <div class="up-or"><span>或</span></div>
      <div class="field full"><label>直接粘贴范文正文</label><textarea id="upPaste" rows="5" placeholder="粘贴一段您认可的历史报告正文，系统会识别章节结构、论证路径与语言风格…">${esc(UP.text)}</textarea></div>
      <div class="up-actions"><button class="btn btn-ghost sm" data-action="up-sample">${icon('spark', 14)}使用内置范文体验</button><span class="hint">内置范文为一份四段式咨政内参样例</span></div>
    </div>
    <div class="md-foot"><button class="btn btn-ghost" data-action="modal-close">取消</button><button class="btn btn-primary" data-action="up-parse-paste">${icon('spark', 15)}解析并提炼</button></div>`, true);
    return;
  }
  if (UP.phase === 'parsing') {
    openModal(`<div class="md-head"><h3>${icon('upload', 17)}正在解析范文</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div>
      <div class="md-body"><div class="parse-file">${icon('file', 18)}<div><b>${esc(UP.name)}</b><span class="hint">${UP.size ? (UP.size / 1024).toFixed(1) + ' KB · ' : ''}${UP.text.length} 字</span></div></div>
        <div class="stage-list" id="upStages">${['读取文件与提取正文', '识别章节结构与标题层级', '统计句式、术语与数据密度', '归纳论证路径与必备要素'].map((s, i) => `<div class="stage" data-i="${i}"><span class="st-ic">${icon('clock', 14)}</span><span class="st-tx">${s}</span><span class="st-state">等待</span></div>`).join('')}</div>
        <div class="progress lg"><i id="upBar" style="width:5%"></i></div></div>`, true);
    return;
  }
  const a = UP.analysis;
  openModal(`<div class="md-head"><h3>${icon('spark', 17)}提炼结果 · 请确认后生成 Skill</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div>
    <div class="md-body">
      <div class="an-tiles">
        <div class="an-tile"><span>正文字数</span><b>${a.chars}</b></div>
        <div class="an-tile"><span>识别章节</span><b>${a.outline.length}</b></div>
        <div class="an-tile"><span>平均句长</span><b>${a.avgSentence}<small>字</small></b></div>
        <div class="an-tile"><span>数据引用</span><b>${a.dataCount}<small>处</small></b></div>
      </div>
      <div class="up-sec-title">${icon('layers', 14)}识别出的结构骨架</div>
      <div class="outline-preview">${a.outline.map((o, i) => `<div class="op-row"><span class="op-n">${i + 1}</span><div><b>${esc(o.h)}</b><span>${esc(o.point)}</span></div><em>约 ${o.words} 字</em></div>`).join('')}</div>
      <div class="up-sec-title">${icon('pen', 14)}语言风格画像</div>
      <div class="style-bars">${[['formality', '正式度'], ['sentence', '句长'], ['terminology', '术语密度'], ['data', '数据密度'], ['stance', '立场强度']].map(([k, l]) => `<div class="sb-row"><span>${l}</span><span class="sb-track"><i style="width:${a.style[k]}%"></i></span><b>${a.style[k]}</b></div>`).join('')}</div>
      <div class="up-sec-title">${icon('check', 14)}自动识别的必备要素</div>
      <div class="chip-line">${a.must.map(m => `<span class="chip jade">${esc(m)}</span>`).join('') || '<span class="hint">未识别到强约束要素</span>'}</div>
      <div class="form-grid" style="margin-top:16px">
        <div class="field full"><label>Skill 名称</label><input id="upSkillName" value="${esc(UP.skillName)}" placeholder="给这套写作方式起个名字"></div>
        <div class="field full"><label>生成方式</label>
          <div class="radio-line">
            <label class="radio"><input type="radio" name="upTarget" value="new" ${UP.target === 'new' ? 'checked' : ''}><span>新建写作 Skill</span></label>
            ${bound ? `<label class="radio"><input type="radio" name="upTarget" value="update" ${UP.target === 'update' ? 'checked' : ''}><span>更新专题已绑定的「${esc(bound.name)}」（生成 v${curVersion(bound) + 1}）</span></label>` : ''}
          </div>
        </div>
      </div>
    </div>
    <div class="md-foot"><button class="btn btn-ghost" data-action="up-back">重新选择</button><button class="btn btn-primary" data-action="up-commit">${icon('spark', 15)}生成写作 Skill</button></div>`, true);
}
function markStage(i, state) {
  const box = document.getElementById('upStages'); if (!box) return;
  const rows = box.querySelectorAll('.stage');
  rows.forEach((r, ri) => {
    if (ri < i) { r.className = 'stage done'; r.querySelector('.st-ic').innerHTML = icon('check', 14); r.querySelector('.st-state').textContent = '完成'; }
    else if (ri === i) { r.className = 'stage ' + (state === 'done' ? 'done' : 'run'); r.querySelector('.st-ic').innerHTML = icon(state === 'done' ? 'check' : 'refresh', 14); r.querySelector('.st-state').textContent = state === 'done' ? '完成' : '进行中'; }
  });
  const bar = document.getElementById('upBar'); if (bar) bar.style.width = Math.min(100, (i + (state === 'done' ? 1 : 0.4)) / 4 * 100) + '%';
}
function runParse(topicId, name, size, text) {
  Object.assign(UP, { topicId, phase: 'parsing', name, size, text, err: '' });
  renderUpload();
  addTask('parse', '范文解析 · ' + name, topicId, '提取正文并识别写作结构');
  [0, 1, 2, 3].forEach(i => { setTimeout(() => markStage(i, 'run'), 120 + i * 380); setTimeout(() => markStage(i, 'done'), 400 + i * 380); });
  setTimeout(() => {
    UP.analysis = analyzeReport(text);
    UP.skillName = UP.analysis.suggestName;
    UP.phase = 'preview';
    renderUpload();
  }, 1750);
}
async function handleFile(file) {
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) { UP.err = '文件超过 10MB，请压缩后重试'; renderUpload(); return; }
  UP.err = ''; UP.phase = 'parsing'; UP.name = file.name; UP.size = file.size; UP.text = '';
  renderUpload(); markStage(0, 'run');
  try {
    const text = await readFileText(file);
    runParse(UP.topicId, file.name, file.size, text);
  } catch (err) {
    UP.phase = 'input'; UP.err = (err && err.message) || '解析失败'; UP.text = '';
    renderUpload(); toast(UP.err, { type: 'warn', duration: 6000 });
  }
}
/* ---------- 范文正文直接编辑（修改留版本） ---------- */
function openUploadEditor(id) {
  const u = S.uploads.find(x => x.id === id); if (!u) return;
  openModal(`<div class="md-head"><h3>${icon('edit', 17)}编辑范文 · ${esc(u.name)}</h3><button class="icon-btn" data-action="modal-close">${icon('x', 17)}</button></div>
    <div class="md-body">
      <div class="up-context">${icon('info', 13)} 这里修改的是您上传的原文。保存后生成新版本，旧版本完整保留；「重新提炼」将按最新正文重新识别结构与风格。</div>
      <div class="field full"><label>范文正文（<span id="upEditCount">${u.text.length}</span> 字）</label><textarea id="upEditText" rows="14" style="min-height:320px;line-height:1.8">${esc(u.text)}</textarea></div>
      <div class="field full" style="margin-top:10px"><label>版本说明（可选）</label><input id="upEditNote" placeholder="例如：补充终裁税率细节、删去重复段落"></div>
    </div>
    <div class="md-foot"><span class="hint">当前 v${curVersion(u)} · 上传于 ${fmtDT(u.time)}</span><button class="btn btn-ghost" data-action="up-history" data-id="${u.id}">${icon('timeline', 14)}历史版本</button><button class="btn btn-ghost" data-action="modal-close">取消</button><button class="btn btn-primary" data-action="up-edit-save" data-id="${u.id}">${icon('save', 15)}保存为新版本 v${curVersion(u) + 1}</button></div>`, true);
  setTimeout(() => { const t = document.getElementById('upEditText'); if (t) { t.focus(); t.addEventListener('input', () => { const c = document.getElementById('upEditCount'); if (c) c.textContent = t.value.length; }); } }, 60);
}
function uploadEditSave(id) {
  const u = S.uploads.find(x => x.id === id); if (!u) return;
  const ta = document.getElementById('upEditText'); const note = ((document.getElementById('upEditNote') || {}).value || '').trim();
  const tx = (ta ? ta.value : u.text).trim();
  if (tx.length < 120) { toast('正文太短（至少 120 字），无法支撑结构与风格识别', { type: 'warn' }); return; }
  const before = snapText('upload', snapOf('upload', u));
  if (tx === before) { toast('内容没有变化，未生成新版本', { type: 'info', duration: 2800 }); closeModal(); return; }
  u.text = tx; u.chars = tx.length;
  const st = diffStat(before, snapText('upload', snapOf('upload', u)));
  const v = pushVersion('upload', u, 'edit', note || `手工编辑范文正文（新增 ${st.add} 行、删除 ${st.del} 行）`);
  saveState(); closeModal();
  toast(`范文已保存为 v${v.n}（+${st.add} / −${st.del} 行），可在专题资料中「重新提炼」更新 Skill`);
  if (ui.page === 'topic' || ui.page === 'skill') render();
}

function commitUpload() {
  const a = UP.analysis; if (!a) return;
  const nameEl = document.getElementById('upSkillName');
  const name = (nameEl ? nameEl.value : UP.skillName).trim() || a.suggestName;
  const t = topicById(UP.topicId);
  const target = (document.querySelector('input[name="upTarget"]:checked') || {}).value || UP.target;
  const up = { id: uid(), topicId: UP.topicId, name: UP.name, size: UP.size, chars: UP.text.length, text: UP.text, time: now(), skillId: '', by: ME.name };
  let sk;
  if (target === 'update' && t && t.skillId && skillById(t.skillId)) {
    sk = skillById(t.skillId);
    Object.assign(sk, { name, origin: 'distill', sourceName: UP.name, sourceExcerpt: UP.text.slice(0, 520), outline: a.outline, logic: a.logic, style: a.style, must: a.must, prefer: a.prefer, avoid: sk.avoid.length ? sk.avoid : a.avoid });
    if (!sk.topicIds.includes(t.id)) sk.topicIds.push(t.id);
    pushVersion('skill', sk, 'distill', `依据新上传范文《${UP.name}》重新提炼结构与风格`);
  } else {
    sk = {
      id: uid(), name, origin: 'distill', topicIds: t ? [t.id] : [], usage: 0, sourceName: UP.name, sourceExcerpt: UP.text.slice(0, 520),
      outline: a.outline, logic: a.logic, style: a.style, must: a.must, prefer: a.prefer, avoid: a.avoid, requirements: [],
      createdAt: now(), updatedAt: now(), versions: []
    };
    S.skills.unshift(sk);
    pushVersion('skill', sk, 'distill', `从上传范文《${UP.name}》提炼初版`);
    if (t) { t.skillId = sk.id; pushVersion('topic', t, 'bind', `绑定写作 Skill「${sk.name}」v1`); }
  }
  up.skillId = sk.id; S.uploads.unshift(up); if (t && !t.uploadIds.includes(up.id)) t.uploadIds.push(up.id);
  pushVersion('upload', up, 'create', `上传范文《${UP.name}》`);
  addTask('distill', 'Skill 提炼 · ' + sk.name, UP.topicId, `识别 ${a.outline.length} 节结构、${a.must.length} 项必备要素`, true);
  S.metrics.skillUses++; saveState(); closeModal();
  ui.skillId = sk.id; go('skill', null);
  toast(`已生成写作 Skill「${sk.name}」v${curVersion(sk)}，可直接编辑或立即用它写作`);
}