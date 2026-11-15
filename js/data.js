/* 观澜研究台 — 数据层：专题 / 写作Skill / 范文 / 语料 / 联网线索 / 成果 / 版本 */
'use strict';

const ME = { name: '沈观澜', dept: '区域国别研究院', role: '首席研究员' };
const DAY = 86400000, HOUR = 3600000;
const uid = () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);
const now = () => Date.now();
function at(d, h = 10, m = 0) { const x = new Date(now() - d * DAY); x.setHours(h, m, 0, 0); return x.getTime(); }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function pad(n) { return String(n).padStart(2, '0'); }
function fmtD(t) { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function fmtT(t) { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function fmtDT(t) { return fmtD(t) + ' ' + fmtT(t); }
function relTime(t) { const df = now() - t; if (df < HOUR) return Math.max(1, Math.round(df / 60000)) + ' 分钟前'; if (df < DAY) return Math.round(df / HOUR) + ' 小时前'; if (df < 7 * DAY) return Math.round(df / DAY) + ' 天前'; return fmtD(t); }
function kfmt(n) { return n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : String(n); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }
const AV_COLORS = ['#0E3A5D', '#D64541', '#1F8A5D', '#D9962E', '#3E8EDE', '#7C5CFC', '#0E9F8A', '#B4552D', '#5B8C2A', '#C2379B'];
function avColor(name) { let h = 0; for (const ch of String(name)) h = (h * 31 + ch.codePointAt(0)) >>> 0; return AV_COLORS[h % AV_COLORS.length]; }

const STANCES = { '对华强硬': '#D64541', '保护主义': '#B4552D', '摇摆观望': '#D9962E', '务实合作': '#1F8A5D', '自由贸易': '#3E8EDE' };
const stanceColor = s => STANCES[s] || '#68766D';

/* 任务类型（业务口径，不含成本） */
const TASK_KINDS = {
  parse: { name: '范文解析', color: '#0E9F8A', icon: 'upload' },
  distill: { name: 'Skill 提炼', color: '#7C5CFC', icon: 'spark' },
  search: { name: '联网检索', color: '#3E8EDE', icon: 'globe' },
  write: { name: '深度撰稿', color: '#0E3A5D', icon: 'pen' },
  index: { name: '资料入库', color: '#1F8A5D', icon: 'inbox' },
  revise: { name: '按要求重写', color: '#C2379B', icon: 'refresh' }
};
const KIND_LABEL = { ai: 'AI 生成', distill: '范文提炼', edit: '用户编辑', require: '要求重写', restore: '版本回滚', create: '创建', bind: '关联变更' };
const KIND_COLOR = { ai: '#3E8EDE', distill: '#7C5CFC', edit: '#C2379B', require: '#C2379B', restore: '#D9962E', create: '#1F8A5D', bind: '#0E9F8A' };

/* ---------- 语料库 ---------- */
function C(doc, page, para, text, extra) { return Object.assign({ id: `${doc}_p${page}_c${para}`, doc, page, para, text }, extra); }
function seedCorpus() {
  const d = [];
  const D = o => d.push(Object.assign({ status: 'ready', heat: 'hot', lang: 'EN', orgType: '智库' }, o));
  D({ id: 'doc_01', title: 'The EU’s EV tariffs: a costly shield', org: 'Bruegel', orgCountry: '比利时', region: '欧洲', country: '欧盟', stance: '自由贸易', date: '2026-02', pages: 24, words: 11000, tags: ['电动汽车', '反补贴', '关税'], summary: '报告认为对华电动汽车加征关税将抬高欧洲消费者购车成本约 9%，并延缓欧盟 2035 年电动化目标；主张以最低价格承诺替代关税，避免双输。', claims: [C('doc_01', 3, 1, '对华电动汽车关税将使欧洲消费者平均购车成本上升约 9%，并推迟 2035 年燃油车退出目标约 2 年。', { date: '2026-02' }), C('doc_01', 8, 2, '建议以“最低进口价格承诺”替代从价关税，可在保护本土产业的同时保留竞争压力。'), C('doc_01', 15, 3, '若中方反制大排量燃油车，欧盟每年将损失约 24 亿欧元出口额。')] });
  D({ id: 'doc_02', title: 'Countering China’s EV overcapacity', org: 'CSIS 战略与国际研究中心', orgCountry: '美国', region: '北美', country: '中国', stance: '对华强硬', date: '2026-03', pages: 31, words: 14500, tags: ['产能过剩', '供应链', '补贴'], summary: '美方视角报告，将中国电动汽车优势归因于“系统性补贴与产能过剩”，建议美欧协调关税与出口管制，构建排他性电池供应链联盟。', claims: [C('doc_02', 4, 1, '中国电动汽车产业链获得的综合补贴规模估算为每辆车 3,500～5,000 美元。', { date: '2026-03' }), C('doc_02', 11, 2, '建议美欧建立“电池供应链联盟”，对关键矿物实施联合出口管制与投资审查。'), C('doc_02', 22, 1, '若不加征关税，到 2030 年中国车企将占据欧洲 30% 市场份额。')] });
  D({ id: 'doc_03', title: '欧盟反补贴案的多维博弈与中方应对', org: '中国现代国际关系研究院', orgCountry: '中国', region: '欧亚', country: '欧盟', stance: '务实合作', date: '2026-01', pages: 18, words: 9000, lang: 'ZH', tags: ['反补贴', '博弈', '磋商'], summary: '中方智库报告，梳理欧委会调查程序与成员国投票分歧，指出德匈反对、法意推动的格局，建议以价格承诺+本地化投资组合化解摩擦。', claims: [C('doc_03', 2, 1, '欧委会终裁投票中德国、匈牙利明确反对，法国、意大利推动，成员国分歧显著。', { date: '2026-01' }), C('doc_03', 7, 2, '中方应以“价格承诺 + 匈牙利本地化建厂”组合方案争取磋商空间。'), C('doc_03', 12, 3, '反补贴税落地后，中国对欧电动车出口短期预计下滑 18%～25%。')] });
  D({ id: 'doc_04', title: 'Europe’s de-risking dilemma', org: 'MERICS 墨卡托中国研究中心', orgCountry: '德国', region: '欧洲', country: '中国', stance: '摇摆观望', date: '2025-11', pages: 27, words: 12800, tags: ['去风险', '依赖', '绿色转型'], summary: '报告量化欧洲在电池与整车环节对华依赖，认为“去风险”与绿色转型目标存在内在张力，关税是次优工具。', claims: [C('doc_04', 5, 2, '欧盟动力电池进口 68% 来自中国，短期替代成本高达 40% 溢价。'), C('doc_04', 13, 1, '“去风险”若演变为脱钩，将使欧盟绿色转型总成本增加约 1,200 亿欧元。'), C('doc_04', 19, 2, '建议区分“战略性依赖”与“一般性依赖”，对后者维持开放。')] });
  D({ id: 'doc_05', title: 'Anti-subsidy investigation final disclosure', org: '欧盟委员会贸易总司', orgCountry: '欧盟', region: '欧洲', country: '中国', stance: '保护主义', date: '2026-04', pages: 42, words: 20000, orgType: '官方', tags: ['反补贴', '终裁', '税率'], summary: '欧委会官方终裁披露文件，认定补贴幅度并公布分企业从价税率区间，阐述“损害威胁”认定逻辑与价格承诺受理条件。', claims: [C('doc_05', 9, 1, '终裁对抽样企业分别征收 17.0%～35.3% 的反补贴税，叠加 10% 基础关税。', { date: '2026-04' }), C('doc_05', 18, 2, '价格承诺申请须满足最低进口价格与年度出口配额双重条件方可受理。'), C('doc_05', 30, 1, '认定“实质损害威胁”的核心依据为进口激增与产能闲置率。')] });
  D({ id: 'doc_06', title: 'Le protectionnisme vert européen', org: 'Jacques Delors 研究所', orgCountry: '法国', region: '欧洲', country: '欧盟', stance: '保护主义', date: '2025-09', pages: 20, words: 9500, lang: 'FR', tags: ['绿色保护主义', '产业政策'], summary: '法方报告为“绿色保护主义”辩护，主张将碳足迹与补贴审查挂钩，以产业政策扶持本土电池冠军企业。', claims: [C('doc_06', 4, 2, '应将电池碳足迹阈值纳入市场准入，与反补贴工具形成政策组合。'), C('doc_06', 10, 1, '法国主张对本土电池 gigafactory 提供每 GWh 约 900 万欧元补贴。')] });
  D({ id: 'doc_07', title: '中国新能源汽车出海合规指引', org: '商务部国际贸易经济合作研究院', orgCountry: '中国', region: '欧亚', country: '欧盟', stance: '务实合作', date: '2026-02', pages: 22, words: 10500, lang: 'ZH', orgType: '官方', tags: ['出海', '合规', '本地化'], summary: '官方指引，建议车企以本地化生产、技术授权与合资模式规避关税壁垒，并完善 ESG 与数据合规体系。', claims: [C('doc_07', 6, 1, '匈牙利、西班牙成为中资电池与整车本地化首选地，综合成本低于德法 22%。'), C('doc_07', 14, 2, '技术授权（license-out）模式可绕过整车关税并保留技术收益。')] });
  D({ id: 'doc_08', title: 'The welfare cost of EV protectionism', org: 'Kiel 世界经济研究所', orgCountry: '德国', region: '欧洲', country: '欧盟', stance: '自由贸易', date: '2026-05', pages: 19, words: 8800, tags: ['福利成本', '关税'], summary: '量化研究，测算关税的净福利损失与就业保护效果之比，结论为保护主义得不偿失。', claims: [C('doc_08', 7, 1, '每保护一个本土汽车岗位，欧盟消费者需承担约 11.6 万欧元福利损失。'), C('doc_08', 12, 2, '关税带来的净福利损失约为每年 31 亿欧元，远超财政关税收入。')] });
  D({ id: 'doc_09', title: 'Indonesia’s nickel downstreaming at a crossroads', org: 'CSIS 战略与国际研究中心', orgCountry: '美国', region: '北美', country: '印尼', stance: '对华强硬', date: '2026-03', pages: 26, words: 12000, tags: ['镍', '下游化', '出口禁令'], summary: '报告关注印尼镍矿出口禁令与下游化政策，担忧中资主导冶炼产能形成“资源民族主义+中国资本”耦合，建议美国以 IRA 排除条款施压。', claims: [C('doc_09', 5, 1, '印尼镍冶炼产能 75% 由中资控股，美国 IRA 清洁车辆抵免将其排除在外。', { date: '2026-03' }), C('doc_09', 12, 2, '印尼 2026 年镍矿出口禁令将导致全球电池级镍供应缺口约 8%。'), C('doc_09', 18, 1, '建议以“关键矿物俱乐部”对冲中资镍供应链影响力。')] });
  D({ id: 'doc_10', title: 'Resource nationalism and Indonesia’s battery ambition', org: 'ISEAS 尤索夫伊萨东南亚研究院', orgCountry: '新加坡', region: '东南亚', country: '印尼', stance: '摇摆观望', date: '2026-01', pages: 23, words: 10800, tags: ['资源民族主义', '电池', '东盟'], summary: '东盟视角报告，分析印尼以出口禁令换取电池产业链落地的战略得失，提醒环境成本与东盟内部竞争。', claims: [C('doc_10', 6, 2, '印尼以镍出口禁令成功吸引逾 150 亿美元电池产业链投资。'), C('doc_10', 14, 1, '冶炼扩张带来红土镍矿尾矿处理压力，环境成本被低估。')] });
  D({ id: 'doc_11', title: 'Hilirisasi nikel: capaian dan tantangan', org: '印尼 CSIS', orgCountry: '印尼', region: '东南亚', country: '印尼', stance: '务实合作', date: '2025-12', pages: 21, words: 9900, tags: ['下游化', '就业', '技术转移'], summary: '印尼本土报告，肯定下游化带来的就业与出口增值，但承认技术转移有限，呼吁深化与中日韩多元合作。', claims: [C('doc_11', 3, 1, '镍下游化使印尼镍相关出口额从 33 亿美元增至 338 亿美元（2017→2025）。', { date: '2025-12' }), C('doc_11', 11, 2, '呼吁在冶炼之外引入正极材料与前驱体环节，提升本地增值率。')] });
  D({ id: 'doc_12', title: '印尼镍产业新政与中印尼产能合作', org: '中国社科院亚太与全球战略研究院', orgCountry: '中国', region: '欧亚', country: '印尼', stance: '务实合作', date: '2026-02', pages: 17, words: 8600, lang: 'ZH', tags: ['产能合作', '一带一路', '镍'], summary: '中方报告，评估印尼新政对中资冶炼项目的影响，建议以股权多元化与绿色冶炼标准应对 IRA 排除与 ESG 压力。', claims: [C('doc_12', 4, 1, '中资印尼镍项目应引入印尼主权基金 Danantara 参股以分散政策风险。'), C('doc_12', 9, 2, '采用高压酸浸（HPAL）绿色冶炼标准可提升进入欧美供应链的合规性。')] });
  D({ id: 'doc_13', title: 'The global battery race and critical minerals', org: 'Brookings 布鲁金斯学会', orgCountry: '美国', region: '北美', country: '全球', stance: '摇摆观望', date: '2025-10', pages: 29, words: 13500, tags: ['电池', '关键矿物', '供应链'], summary: '报告全景梳理关键矿物供应链，认为印尼镍与拉美锂构成双枢纽，美国应多元化而非单一脱钩。', claims: [C('doc_13', 8, 1, '到 2030 年全球电池级镍需求将增长 2.4 倍，印尼占比超 50%。'), C('doc_13', 17, 2, '建议与印尼建立“关键矿物战略对话”，避免将其完全推向中国。')] });
  D({ id: 'doc_14', title: 'インドネシアのニッケル戦略と日本の対応', org: '日本国际问题研究所 JIIA', orgCountry: '日本', region: '东亚', country: '印尼', stance: '摇摆观望', date: '2026-04', pages: 18, words: 8200, lang: 'JA', tags: ['镍', '日本', '供应链'], summary: '日方报告，主张以技术合作与 ESG 标准参与印尼镍下游化，制衡单一资本主导。', claims: [C('doc_14', 5, 1, '日本应以冶炼节能技术与尾矿处理标准参与印尼镍产业链。'), C('doc_14', 10, 2, '建议 JOGMEC 为日企印尼镍项目提供风险保险支持。')] });
  D({ id: 'doc_15', title: 'Gulf sovereign wealth and the AI pivot', org: 'Carnegie 中东中心', orgCountry: '美国', region: '北美', country: '海湾', stance: '摇摆观望', date: '2026-02', pages: 25, words: 11800, tags: ['主权基金', 'AI', '海湾'], summary: '报告分析海湾主权基金从油气资产转向 AI 与算力基础设施的战略动机，及其在中美之间的对冲姿态。', claims: [C('doc_15', 4, 1, 'PIF 与 Mubadala 承诺的 AI 相关投资已超 1,000 亿美元。', { date: '2026-02' }), C('doc_15', 12, 2, '海湾以“算力换安全”策略同时承接中美技术生态。')] });
  D({ id: 'doc_16', title: 'Beyond oil: Gulf AI industrial strategy', org: '海湾研究中心 GRC', orgCountry: '沙特', region: '中东', country: '海湾', stance: '务实合作', date: '2026-03', pages: 20, words: 9300, tags: ['AI', '产业战略', '2030愿景'], summary: '海湾本土报告，阐述以 AI 与数据中心实现经济多元化的路径，强调开放合作与数据主权并重。', claims: [C('doc_16', 3, 2, '沙特 2030 愿景将 AI 列为非油经济核心，目标贡献 GDP 12%。'), C('doc_16', 9, 1, '主张建立主权数据云，在开放合作中保留数据主权。')] });
  D({ id: 'doc_17', title: '海湾国家AI转向与中国数字丝绸之路', org: '上海国际问题研究院', orgCountry: '中国', region: '欧亚', country: '海湾', stance: '务实合作', date: '2026-01', pages: 16, words: 8000, lang: 'ZH', tags: ['数字丝绸之路', 'AI', '海湾'], summary: '中方报告，评估海湾 AI 转向带来的算力、云与智慧城市合作机遇，建议以联合实验室与本地化数据中心深化绑定。', claims: [C('doc_17', 5, 1, '中海合建智算中心与联合 AI 实验室是数字丝绸之路的优先抓手。'), C('doc_17', 10, 2, '应尊重海湾数据主权诉求，以“本地部署+技术转移”换取长期市场。')] });
  D({ id: 'doc_18', title: 'The Gulf’s AI balancing act', org: 'Chatham House 皇家国际事务研究所', orgCountry: '英国', region: '欧洲', country: '海湾', stance: '对华强硬', date: '2025-12', pages: 24, words: 11200, tags: ['AI', '技术竞争', '海湾'], summary: '英方报告，担忧海湾与中国 AI 合作削弱西方技术管制效力，建议以芯片出口许可为杠杆约束海湾选边。', claims: [C('doc_18', 6, 1, '建议将先进 AI 芯片出口许可与海湾对华技术合作程度挂钩。'), C('doc_18', 15, 2, '海湾“对冲”策略可能形成中美之外的第三技术生态极。')] });
  D({ id: 'doc_19', title: 'Lessons from the EU-China investment treaty', org: 'Bruegel', orgCountry: '比利时', region: '欧洲', country: '欧盟', stance: '自由贸易', date: '2019-06', pages: 22, words: 10000, heat: 'cold', status: 'cold', tags: ['投资协定', 'CAI'], summary: '', claims: [] });
  D({ id: 'doc_20', title: 'El triángulo del litio en América Latina', org: 'CEPAL 拉美经委会', orgCountry: '智利', region: '拉美', country: '拉美', stance: '务实合作', date: '2018-11', pages: 26, words: 12000, heat: 'cold', status: 'cold', lang: 'ES', tags: ['锂', '拉美'], summary: '', claims: [] });
  D({ id: 'doc_21', title: 'Africa’s critical minerals and the green transition', org: 'ISS 安全研究所', orgCountry: '南非', region: '非洲', country: '非洲', stance: '摇摆观望', date: '2020-03', pages: 21, words: 9800, heat: 'cold', status: 'cold', tags: ['关键矿物', '非洲'], summary: '', claims: [] });
  return d;
}

/* ---------- 内置范文（供一键体验上传→提炼流程） ---------- */
const SAMPLE_REPORT = `欧盟电动汽车反补贴终裁研判与对我政策启示

一、核心态势研判
欧委会于2026年4月完成对华电动汽车反补贴调查终裁，对抽样企业分别适用17.0%至35.3%的从价税，并叠加10%基础关税。终裁落地标志着摩擦由个案调查转入制度化阶段。从投票结构看，德国、匈牙利明确反对，法国、意大利推动，成员国分歧显著，磋商窗口并未关闭。
本报告认为，终裁税率虽高于初裁预期，但价格承诺通道仍然保留，短期内仍存在边际调整空间。

二、多方博弈焦点与智库分歧
美方智库主张将关税与供应链联盟捆绑，认为中国电动汽车产业链获得的综合补贴为每辆车3500至5000美元，建议美欧协调出口管制。欧洲自由贸易派测算，关税将使欧洲消费者购车成本上升约9%，净福利损失每年约31亿欧元。保护主义派则以碳足迹阈值与产业政策组合为关税辩护。中方智库强调，成员国分歧与产业界反对为价格承诺磋商提供了现实基础。
三方分歧的本质，是安全逻辑与效率逻辑的结构性冲突，短期内难以调和。

三、未来趋势推演
基准情景：价格承诺部分受理，实际税负边际下调，出口短期下滑18%至25%后逐步企稳。
乐观情景：以最低进口价格承诺全面替代从价关税，双方回到规则导向的磋商轨道。
悲观情景：中方对大排量燃油车实施反制，欧盟每年损失约24亿欧元出口，摩擦向电池与关键矿物环节扩散。
观察指标包括价格承诺受理数量、成员国后续表态以及本地化投资审批进度。

四、对我政策启示与建议
第一，以“价格承诺＋匈牙利本地化建厂”组合争取磋商空间，优先选择综合成本低于德法22%的中东欧国家布局。
第二，推动技术授权模式落地，绕过整车关税的同时保留技术收益。
第三，同步完善ESG与数据合规体系，以碳足迹核算能力对冲绿色保护主义。
第四，建立月度跟踪机制，对税率调整、配额执行与成员国政治周期保持动态研判。`;

/* ---------- 写作 Skill ---------- */
function outlineItem(h, point, words) { return { id: uid(), h, point, words }; }
function req(text, from, time) { return { id: uid(), text, from, time: time || now() }; }
function defaultStyle() { return { tone: '咨政建言', person: '第三人称', formality: 80, sentence: 60, terminology: 65, data: 70, stance: 45, citeStyle: 'anchor' }; }

function seedSkills() {
  const sk1 = {
    id: 'sk1', name: '咨政内参 · 四段式研判体', origin: 'distill', topicIds: ['nb1'], usage: 12,
    sourceName: '欧盟电动汽车反补贴终裁研判（2026年3月稿）.docx', sourceExcerpt: SAMPLE_REPORT.slice(0, 520),
    outline: [
      outlineItem('一、核心态势研判', '开门见山给出最新政策事实与时间节点，一句话定性当前所处阶段。', 600),
      outlineItem('二、多方博弈焦点与智库分歧', '按立场分组呈现美欧、对象国与周边视角，点明分歧的结构性本质。', 900),
      outlineItem('三、未来趋势推演', '给出乐观／基准／悲观三情景，每个情景附触发条件与观察指标。', 800),
      outlineItem('四、对我政策启示与建议', '落到可执行动作，区分短期磋商与中长期布局，按优先级排序。', 700)
    ],
    logic: ['先事实后判断：以官方终裁或最新披露锚定时间点', '分组对比：同一议题至少呈现三类立场并标注来源国别', '由分歧推导结构性矛盾（安全逻辑与效率逻辑）', '情景化推演，给出可观测的触发条件', '结论落到我方可执行动作，避免泛泛而谈'],
    style: { tone: '咨政建言', person: '第三人称', formality: 88, sentence: 64, terminology: 72, data: 80, stance: 42, citeStyle: 'anchor' },
    must: ['每条论断保留页码角标', '关键判断附量化数据', '给出三情景推演', '结尾给出可执行建议'],
    prefer: ['研判', '磋商窗口', '结构性', '边际', '对冲'],
    avoid: ['必然', '彻底解决', '绝对', '震惊'],
    requirements: [req('涉及税率、金额一律注明口径与时间点。', '用户', at(3, 10, 20)), req('成员国立场须区分官方表态与智库判断。', '用户', at(1, 9, 5))],
    createdAt: at(12), updatedAt: at(1, 9, 5), versions: []
  };
  const sk1v1 = clone({ name: sk1.name, outline: sk1.outline.slice(0, 3), logic: sk1.logic.slice(0, 3), style: Object.assign({}, sk1.style, { formality: 74, data: 55 }), must: sk1.must.slice(0, 2), prefer: sk1.prefer.slice(0, 3), avoid: sk1.avoid, requirements: [] });
  const sk1v2 = clone({ name: sk1.name, outline: sk1.outline, logic: sk1.logic, style: Object.assign({}, sk1.style, { data: 68 }), must: sk1.must, prefer: sk1.prefer, avoid: sk1.avoid, requirements: [clone(sk1.requirements[0])] });
  sk1.versions = [
    { id: uid(), n: 1, time: at(12, 15, 10), kind: 'distill', author: '观澜智能体', note: '从上传范文《欧盟电动汽车反补贴终裁研判（2026年3月稿）》提炼初版', snapshot: sk1v1 },
    { id: uid(), n: 2, time: at(3, 10, 22), kind: 'edit', author: ME.name, note: '补齐第四节建议，新增要求：税率金额注明口径', snapshot: sk1v2 },
    { id: uid(), n: 3, time: at(1, 9, 5), kind: 'require', author: ME.name, note: '沉淀写作要求：区分官方表态与智库判断', snapshot: snapOf('skill', sk1) }
  ];
  const sk2 = {
    id: 'sk2', name: '产业链地缘经济 · 三方视角体', origin: 'distill', topicIds: ['nb2'], usage: 6,
    sourceName: '印尼镍新政研判（院版初稿）.docx', sourceExcerpt: '一、政策事实与时间线\n印尼以出口禁令推动下游化……\n二、三方视角碰撞\n对象国、美欧与周边国家的政策算计……',
    outline: [
      outlineItem('一、政策事实与时间线', '按时间顺序梳理禁令、配额与税制变化，标注生效日期。', 500),
      outlineItem('二、三方视角碰撞', '对象国／美欧／周边三类视角并列，突出各自的收益与顾虑。', 900),
      outlineItem('三、对我产业链影响评估', '分环节（冶炼、前驱体、整车）评估风险敞口与替代弹性。', 800),
      outlineItem('四、合作路径与风险对冲', '给出股权、标准、金融工具三类可操作对冲手段。', 600)
    ],
    logic: ['以时间线固定事实底座', '并列三方视角，避免单一叙事', '按产业链环节拆解影响，量化敞口', '给出可落地的对冲工具组合'],
    style: { tone: '产业研判', person: '第三人称', formality: 78, sentence: 55, terminology: 80, data: 85, stance: 38, citeStyle: 'anchor' },
    must: ['每条论断保留页码角标', '标注政策生效时间', '分环节量化影响'],
    prefer: ['敞口', '弹性', '本地增值率', '股权多元化'],
    avoid: ['脱钩必然', '一劳永逸'],
    requirements: [req('影响评估须区分冶炼与材料两个环节。', '用户', at(2, 16, 40))],
    createdAt: at(8), updatedAt: at(2, 16, 40), versions: []
  };
  sk2.versions = [
    { id: uid(), n: 1, time: at(8, 11, 0), kind: 'distill', author: '观澜智能体', note: '从上传范文《印尼镍新政研判（院版初稿）》提炼初版', snapshot: clone({ name: sk2.name, outline: sk2.outline.slice(0, 3), logic: sk2.logic.slice(0, 3), style: Object.assign({}, sk2.style, { data: 60 }), must: sk2.must.slice(0, 2), prefer: sk2.prefer.slice(0, 2), avoid: sk2.avoid, requirements: [] }) },
    { id: uid(), n: 2, time: at(2, 16, 40), kind: 'require', author: ME.name, note: '新增第四节风险对冲，沉淀分环节评估要求', snapshot: snapOf('skill', sk2) }
  ];
  const sk3 = {
    id: 'sk3', name: '快评 · 三段式短稿', origin: 'manual', topicIds: [], usage: 3, sourceName: '', sourceExcerpt: '',
    outline: [outlineItem('一、发生了什么', '用两句话交代事件与时间。', 250), outlineItem('二、为什么重要', '指出对我方的直接影响与传导链条。', 350), outlineItem('三、下一步看什么', '给出 2~3 个观察指标。', 200)],
    logic: ['事实极简', '影响直给', '以观察指标收尾'],
    style: { tone: '平实克制', person: '第三人称', formality: 65, sentence: 35, terminology: 45, data: 55, stance: 30, citeStyle: 'anchor' },
    must: ['每条论断保留页码角标'], prefer: ['观察指标'], avoid: ['重大突破', '史无前例'], requirements: [],
    createdAt: at(5), updatedAt: at(5), versions: []
  };
  sk3.versions = [{ id: uid(), n: 1, time: at(5, 14, 0), kind: 'create', author: ME.name, note: '手工创建快评模板', snapshot: snapOf('skill', sk3) }];
  return [sk1, sk2, sk3];
}

/* ---------- 专题 ---------- */
function seedTopics() {
  const t1 = {
    id: 'nb1', title: '欧盟对华电动汽车反补贴博弈', region: '欧洲', color: '#0E3A5D',
    desc: '围绕欧委会终裁税率、成员国分歧与中方应对，形成可供部委参考的咨政研判。',
    audience: '院领导、相关部委业务司局', deliverable: '咨政内参（3000 字上下）',
    questions: ['终裁税率与价格承诺通道的实际空间有多大？', '成员国分歧能否转化为磋商筹码？', '我方本地化与技术授权如何组合布局？'],
    keywords: ['反补贴', '价格承诺', '本地化', '成员国分歧'],
    sourceIds: ['doc_01', 'doc_02', 'doc_03', 'doc_04', 'doc_05', 'doc_06', 'doc_07', 'doc_08'],
    skillId: 'sk1', chats: [], notes: [], packs: [], reportIds: ['rp1'], uploadIds: ['up1'],
    createdAt: at(12), updatedAt: at(1, 9, 10), versions: []
  };
  t1.versions = [
    { id: uid(), n: 1, time: at(12, 9, 30), kind: 'create', author: ME.name, note: '创建专题，导入首批 5 篇研报', snapshot: clone({ title: t1.title, region: t1.region, desc: '跟踪欧盟对华电动汽车反补贴调查进展。', audience: '课题组内部', deliverable: '研究简报', questions: t1.questions.slice(0, 1), keywords: ['反补贴'], sourceIds: t1.sourceIds.slice(0, 5), skillId: '' }) },
    { id: uid(), n: 2, time: at(6, 14, 12), kind: 'edit', author: ME.name, note: '补充关注问题与读者对象，扩充资料至 8 篇', snapshot: clone({ title: t1.title, region: t1.region, desc: t1.desc, audience: t1.audience, deliverable: '研究简报', questions: t1.questions, keywords: t1.keywords.slice(0, 3), sourceIds: t1.sourceIds, skillId: '' }) },
    { id: uid(), n: 3, time: at(1, 9, 10), kind: 'bind', author: ME.name, note: '绑定写作 Skill「咨政内参 · 四段式研判体」v3', snapshot: snapOf('topic', t1) }
  ];
  const t2 = {
    id: 'nb2', title: '印尼镍矿新政与全球电池供应链', region: '东南亚', color: '#1F8A5D',
    desc: '出口禁令、下游化与中资冶炼产能的地缘经济分析，输出产业链风险敞口评估。',
    audience: '院领导、产业合作部门', deliverable: '立场矩阵 + 影响评估',
    questions: ['配额与出口税新政对中资冶炼项目的实际约束是什么？', 'IRA 排除条款下我方供应链如何合规进入？'],
    keywords: ['下游化', '配额', 'HPAL', '股权多元化'],
    sourceIds: ['doc_09', 'doc_10', 'doc_11', 'doc_12', 'doc_13', 'doc_14'],
    skillId: 'sk2', chats: [], notes: [], packs: [], reportIds: ['rp2'], uploadIds: ['up2'],
    createdAt: at(8), updatedAt: at(2, 16, 45), versions: []
  };
  t2.versions = [
    { id: uid(), n: 1, time: at(8, 10, 0), kind: 'create', author: ME.name, note: '创建专题并导入 4 篇研报', snapshot: clone({ title: t2.title, region: t2.region, desc: '跟踪印尼镍出口禁令。', audience: '课题组内部', deliverable: '研究简报', questions: t2.questions.slice(0, 1), keywords: ['下游化'], sourceIds: t2.sourceIds.slice(0, 4), skillId: '' }) },
    { id: uid(), n: 2, time: at(2, 16, 45), kind: 'bind', author: ME.name, note: '绑定写作 Skill「产业链地缘经济 · 三方视角体」v2', snapshot: snapOf('topic', t2) }
  ];
  const t3 = {
    id: 'nb3', title: '海湾主权基金 AI 投资转向', region: '中东', color: '#D9962E',
    desc: '海湾算力雄心、数据主权与中美技术对冲，尚未绑定写作 Skill。',
    audience: '院领导', deliverable: '待定',
    questions: ['海湾“算力换安全”策略对我数字丝路合作意味着什么？'],
    keywords: ['主权基金', '算力', '数据主权'],
    sourceIds: ['doc_15', 'doc_16', 'doc_17', 'doc_18'],
    skillId: '', chats: [], notes: [], packs: [], reportIds: [], uploadIds: [],
    createdAt: at(4), updatedAt: at(4), versions: []
  };
  t3.versions = [{ id: uid(), n: 1, time: at(4, 9, 0), kind: 'create', author: ME.name, note: '创建专题，导入 4 篇研报', snapshot: snapOf('topic', t3) }];
  return [t1, t2, t3];
}

/* ---------- 范文上传记录（正文可直接编辑，修改留版本） ---------- */
function seedUploads() {
  const mk = (o, note) => { o.versions = [{ id: uid(), n: 1, time: o.time, kind: 'create', author: o.by, note, snapshot: snapOf('upload', o) }]; return o; };
  return [
    mk({ id: 'up1', topicId: 'nb1', name: '欧盟电动汽车反补贴终裁研判（2026年3月稿）.docx', size: 48211, chars: SAMPLE_REPORT.length, text: SAMPLE_REPORT, time: at(12, 15, 2), skillId: 'sk1', by: ME.name }, '上传范文，用于提炼写作 Skill'),
    mk({ id: 'up2', topicId: 'nb2', name: '印尼镍新政研判（院版初稿）.docx', size: 39120, chars: 2140, text: '一、政策事实与时间线\n印尼以镍矿出口禁令推动下游化，2026 年配额审批与冶炼产能利用率挂钩。\n二、三方视角碰撞\n对象国强调本地增值，美欧关注供应链排除条款，周边国家担忧竞争。\n三、对我产业链影响评估\n冶炼环节敞口最大，材料环节存在替代弹性。', time: at(8, 10, 40), skillId: 'sk2', by: ME.name }, '上传范文，用于提炼写作 Skill')
  ];
}

/* ---------- 联网检索线索（演示数据） ---------- */
function seedWeb() {
  return [
    { id: 'web_01', topic: 'nb1', title: '欧委会公布电动汽车反补贴终裁披露', source: '欧盟委员会 · 新闻稿', date: '2026-04-12', tag: '官方', snippet: '终裁确认对抽样企业适用 17.0%～35.3% 反补贴税；价格承诺申请须同时满足最低进口价格与年度配额条件。' },
    { id: 'web_02', topic: 'nb1', title: '车企密集提交价格承诺申请', source: '路透社', date: '2026-04-18', tag: '媒体', snippet: '多家整车企业已提交价格承诺方案，业内预计首轮受理比例有限，谈判仍在进行。' },
    { id: 'web_03', topic: 'nb1', title: 'VDA 警告关税延缓电动化目标', source: '德国汽车工业协会 · 声明', date: '2026-03-28', tag: '行业', snippet: '协会认为关税将抬高终端售价并抑制需求，2030 年电动化目标面临推迟风险。' },
    { id: 'web_04', topic: 'nb1', title: '匈牙利提高电池项目本地化率要求', source: '匈牙利投资促进局 · 公告', date: '2026-02-20', tag: '官方', snippet: '新签电池与整车项目本地化率门槛提升至 45%，配套用工与培训要求同步收紧。' },
    { id: 'web_05', topic: 'nb1', title: '关税净福利损失测算更新', source: 'Bruegel · 分析专栏', date: '2026-05-06', tag: '智库', snippet: '最新测算显示净福利损失约每年 31 亿欧元，建议以最低价格承诺替代从价税。' },
    { id: 'web_06', topic: 'nb2', title: '印尼 RKAB 配额审批新规', source: '印尼能源与矿产资源部 · 公告', date: '2026-03-05', tag: '官方', snippet: '镍矿年度配额审批与冶炼产能利用率、环保合规记录挂钩，未达标企业配额下调。' },
    { id: 'web_07', topic: 'nb2', title: '印尼拟对镍生铁加征出口税', source: '路透社', date: '2026-04-02', tag: '媒体', snippet: '出口税方案进入部际讨论，税率区间 2%～5%，旨在推动更高附加值环节落地。' },
    { id: 'web_08', topic: 'nb2', title: '全球镍供应集中度继续上升', source: 'USGS · 矿产年报摘要', date: '2026-01-31', tag: '数据', snippet: '印尼镍矿产量占全球比重超过 55%，供应集中度较上年进一步提高。' },
    { id: 'web_09', topic: 'nb2', title: '下游化的环境代价被低估', source: 'ISEAS · 评论', date: '2026-02-14', tag: '智库', snippet: '尾矿处置与自备电厂碳强度成为 ESG 审查焦点，可能影响进入欧美供应链。' },
    { id: 'web_10', topic: 'nb3', title: '沙特公布新增国家算力园区', source: '沙特通信与信息技术部 · 声明', date: '2026-03-18', tag: '官方', snippet: '国家算力计划新增数据中心园区，配套本地部署与数据主权要求。' },
    { id: 'web_11', topic: 'nb3', title: '海湾主权基金加码 AI 基础设施', source: '金融时报', date: '2026-02-26', tag: '媒体', snippet: '主权基金持续加码算力投资，同时与美方就先进芯片许可条件展开磋商。' },
    { id: 'web_12', topic: 'nb3', title: '阿联酋强调主权数据云前置条件', source: '阿联酋国家媒体办公室', date: '2026-01-22', tag: '官方', snippet: '对外合作须满足本地部署与数据不出境要求，技术转移成为谈判重点。' }
  ];
}

/* ---------- 成果 ---------- */
function seedReports() {
  const rp1Sections = [
    { id: uid(), h: '一、核心态势研判', p: '欧委会终裁以 17.0%～35.3% 的分企业税率落地，叠加 10% 基础关税，标志欧盟对华电动汽车摩擦进入制度化阶段 [doc_05_p9_c1]。终裁投票中德国、匈牙利明确反对，法国、意大利推动，成员国分歧为中方留下磋商窗口 [doc_03_p2_c1]。最新公开信息显示，多家车企已提交价格承诺方案，首轮受理比例预计有限 [web_02]。' },
    { id: uid(), h: '二、多方博弈焦点与智库分歧', p: '美方 CSIS 主张以关税叠加供应链联盟遏制中国产能 [doc_02_p11_c2]；欧洲自由贸易派测算关税净福利损失每年约 31 亿欧元 [doc_08_p12_c2]，与最新公开测算一致 [web_05]；保护主义派以碳足迹阈值与产业政策组合为关税辩护 [doc_06_p4_c2]。德国汽车工业协会公开警告关税将延缓电动化目标 [web_03]。分歧本质是安全逻辑与效率逻辑的结构性冲突。' },
    { id: uid(), h: '三、未来趋势推演', p: '基准情景：价格承诺部分受理，实际税负边际下调，出口短期下滑 18%～25% 后企稳 [doc_03_p12_c3]。乐观情景：以最低进口价格承诺全面替代从价关税 [doc_01_p8_c2]。悲观情景：中方反制大排量燃油车，欧盟每年损失约 24 亿欧元出口 [doc_01_p15_c3]。观察指标为价格承诺受理数量、成员国后续表态与本地化项目审批进度。' },
    { id: uid(), h: '四、对我政策启示与建议', p: '其一，以“价格承诺 + 匈牙利本地化建厂”组合争取磋商空间 [doc_03_p7_c2]，注意匈方已将本地化率门槛提升至 45% [web_04]。其二，以技术授权模式绕过整车关税并保留技术收益 [doc_07_p14_c2]。其三，完善 ESG 与数据合规体系，以碳足迹核算能力对冲绿色保护主义 [doc_06_p4_c2]。' },
    { id: uid(), h: '五、风险提示与观察指标', p: '风险一：价格承诺受理不及预期，实际税负维持高位；风险二：本地化率门槛继续抬升，侵蚀投资回报；风险三：摩擦向电池与关键矿物环节扩散。建议按月跟踪终裁执行公告、成员国表态与项目审批进度，触发阈值时启动方案调整。' }
  ];
  const rp1 = {
    id: 'rp1', topicId: 'nb1', skillId: 'sk1', skillVersion: 3, type: '内参', title: '欧盟电动汽车反补贴终裁研判与对我政策启示',
    status: 'ready', sections: rp1Sections, webUsed: ['web_02', 'web_03', 'web_04', 'web_05'], docUsed: ['doc_05', 'doc_03', 'doc_02', 'doc_08', 'doc_06', 'doc_01', 'doc_07'],
    requirements: ['涉及税率、金额一律注明口径与时间点。', '成员国立场须区分官方表态与智库判断。'],
    createdAt: at(2, 16, 40), updatedAt: at(1, 10, 12), versions: []
  };
  const v1Sections = clone(rp1Sections.slice(0, 4));
  v1Sections[1].p = '美方智库主张关税与供应链联盟捆绑；欧洲自由贸易派认为关税得不偿失；保护主义派以产业政策辩护。三方分歧本质是安全与效率的冲突。';
  rp1.versions = [
    { id: uid(), n: 1, time: at(2, 16, 40), kind: 'ai', author: '观澜智能体', note: '按 Skill v3 首次成稿（资料库 7 篇 + 联网 4 条）', snapshot: { title: rp1.title, type: '内参', sections: v1Sections } },
    { id: uid(), n: 2, time: at(1, 9, 40), kind: 'edit', author: ME.name, note: '第二节补充协会表态与角标，措辞收紧', snapshot: { title: rp1.title, type: '内参', sections: clone(rp1Sections.slice(0, 4)) } },
    { id: uid(), n: 3, time: at(1, 10, 12), kind: 'require', author: ME.name, note: '按要求新增「风险提示与观察指标」一节', snapshot: snapOf('report', rp1) }
  ];
  const rp2 = {
    id: 'rp2', topicId: 'nb2', skillId: 'sk2', skillVersion: 2, type: '矩阵', title: '印尼镍新政：多智库立场碰撞矩阵',
    status: 'ready', sections: [{ id: uid(), h: '矩阵解读', p: '对象国视角强调本地增值与就业，美欧视角以 IRA 排除与矿物俱乐部施压，周边视角提醒环境与竞争成本。我方应对落在股权多元化与绿色冶炼标准两条主线 [doc_12_p4_c1][doc_12_p9_c2]。' }],
    matrix: {
      cols: ['对象国视角', '美欧视角', '周边视角'], rows: [
        { org: '印尼 CSIS', stance: '务实合作', cells: ['肯定下游化增值，呼吁多元合作', '—', '—'], quote: '出口额 33→338 亿美元 [doc_11_p3_c1]' },
        { org: '美国 CSIS', stance: '对华强硬', cells: ['—', '以 IRA 排除 + 矿物俱乐部施压', '—'], quote: '中资控股 75% 冶炼产能 [doc_09_p5_c1]' },
        { org: 'ISEAS 新加坡', stance: '摇摆观望', cells: ['—', '—', '提醒环境成本与东盟竞争'], quote: '吸引 150 亿美元投资 [doc_10_p6_c2]' },
        { org: '中国社科院', stance: '务实合作', cells: ['股权多元化 + 绿色冶炼', '—', '—'], quote: '引入 Danantara 参股 [doc_12_p4_c1]' }
      ]
    },
    webUsed: ['web_06'], docUsed: ['doc_11', 'doc_09', 'doc_10', 'doc_12'], requirements: ['影响评估须区分冶炼与材料两个环节。'],
    createdAt: at(1, 11, 20), updatedAt: at(1, 11, 20), versions: []
  };
  rp2.versions = [{ id: uid(), n: 1, time: at(1, 11, 20), kind: 'ai', author: '观澜智能体', note: '按 Skill v2 生成立场矩阵', snapshot: snapOf('report', rp2) }];
  return [rp1, rp2];
}
function seedPacks() {
  return [
    { id: 'pk1', topicId: 'nb1', name: '反补贴终裁核心论据', createdAt: at(2, 16, 10), claims: ['doc_05_p9_c1', 'doc_03_p2_c1', 'doc_02_p11_c2', 'doc_08_p12_c2', 'doc_06_p4_c2', 'doc_01_p8_c2', 'doc_01_p15_c3', 'doc_03_p7_c2', 'doc_07_p14_c2'] },
    { id: 'pk2', topicId: 'nb2', name: '镍新政三方立场论据', createdAt: at(1, 11, 0), claims: ['doc_11_p3_c1', 'doc_09_p5_c1', 'doc_10_p6_c2', 'doc_12_p4_c1'] }
  ];
}
function seedTasks() {
  return [
    { id: 'j1', kind: 'index', label: '夜间批量 · 新增研报导读卡（500 篇）', topicId: '', status: 'running', progress: 62, startedAt: at(0, 2, 0), detail: '入库精加工，完成后自动进入可检索状态' },
    { id: 'j2', kind: 'write', label: '深度撰稿 · 欧盟电动汽车反补贴终裁研判', topicId: 'nb1', status: 'done', progress: 100, startedAt: at(2, 16, 40), detail: '按 Skill v3 成稿，5 节 3200 字' },
    { id: 'j3', kind: 'search', label: '联网检索 · 印尼镍配额与出口税', topicId: 'nb2', status: 'done', progress: 100, startedAt: at(1, 11, 5), detail: '命中 4 条外部线索，已并入证据' },
    { id: 'j4', kind: 'parse', label: '范文解析 · doc_19 冷资料补齐', topicId: '', status: 'failed', progress: 34, startedAt: at(1, 3, 12), detail: '源文件加密，解析中断，可重试' }
  ];
}
function seedChats() {
  return {
    nb1: [
      { role: 'user', text: '这批报告对欧盟加征关税整体有哪几种观点？', time: at(1, 9, 12) },
      { role: 'ai', path: 'A', rt: 0.7, time: at(1, 9, 12), text: '当前专题文献整体呈现三类立场：其一，自由贸易派（Bruegel、Kiel）认为关税抬高消费成本、净福利为负，主张价格承诺替代 [doc_01_p3_c1][doc_08_p12_c2]；其二，保护主义派（欧委会、Delors）以“损害威胁”与绿色产业政策为由推动终裁 [doc_05_p9_c1][doc_06_p4_c2]；其三，务实合作派（现代院、商务部研究院）建议以价格承诺+本地化投资化解摩擦 [doc_03_p7_c2][doc_07_p6_c1]。', cites: ['doc_01_p3_c1', 'doc_08_p12_c2', 'doc_05_p9_c1', 'doc_06_p4_c2', 'doc_03_p7_c2', 'doc_07_p6_c1'] },
      { role: 'user', text: '欧委会终裁的具体税率区间是多少？', time: at(1, 9, 20) },
      { role: 'ai', path: 'B', rt: 0.9, time: at(1, 9, 20), text: '据欧盟委员会贸易总司 2026 年 4 月终裁披露，对抽样企业分别征收 17.0%～35.3% 的反补贴税，并叠加 10% 基础关税 [doc_05_p9_c1]。价格承诺须满足最低进口价格与年度配额双重条件方可受理 [doc_05_p18_c2]。', cites: ['doc_05_p9_c1', 'doc_05_p18_c2'] }
    ],
    nb2: [
      { role: 'user', text: '印尼镍下游化带来了多少出口增值？', time: at(2, 14, 0) },
      { role: 'ai', path: 'B', rt: 0.8, time: at(2, 14, 0), text: '据印尼 CSIS 2025 年 12 月报告，镍下游化使印尼镍相关出口额从 2017 年 33 亿美元增至 2025 年 338 亿美元 [doc_11_p3_c1]；ISEAS 估计该政策吸引逾 150 亿美元电池产业链投资 [doc_10_p6_c2]。', cites: ['doc_11_p3_c1', 'doc_10_p6_c2'] }
    ],
    nb3: []
  };
}

/* ---------- 快照（用于版本历史与对比） ---------- */
function snapOf(kind, o) {
  if (kind === 'skill') return clone({ name: o.name, outline: o.outline, logic: o.logic, style: o.style, must: o.must, prefer: o.prefer, avoid: o.avoid, requirements: o.requirements });
  if (kind === 'topic') return clone({ title: o.title, region: o.region, desc: o.desc, audience: o.audience, deliverable: o.deliverable, questions: o.questions, keywords: o.keywords, sourceIds: o.sourceIds, skillId: o.skillId });
  if (kind === 'upload') return clone({ name: o.name, text: o.text });
  return clone({ title: o.title, type: o.type, sections: o.sections, matrix: o.matrix || null, requirements: o.requirements || [] });
}
function snapText(kind, s) {
  if (!s) return '';
  if (kind === 'upload') return String(s.text || '');
  if (kind === 'skill') {
    const L = ['名称：' + s.name, '', '【结构骨架】'];
    s.outline.forEach(o => L.push(`${o.h}（约 ${o.words} 字）｜${o.point}`));
    L.push('', '【写作思路】'); s.logic.forEach((x, i) => L.push(`${i + 1}. ${x}`));
    L.push('', '【语言风格】', `语气：${s.style.tone}｜人称：${s.style.person}｜引用：${s.style.citeStyle === 'anchor' ? '页码角标' : '文末脚注'}`);
    L.push(`正式度 ${s.style.formality}｜句长 ${s.style.sentence}｜术语密度 ${s.style.terminology}｜数据密度 ${s.style.data}｜立场强度 ${s.style.stance}`);
    L.push('', '【必备要素】'); s.must.forEach(x => L.push('· ' + x));
    L.push('', '【偏好词】' + s.prefer.join('、'), '【禁用词】' + s.avoid.join('、'), '', '【我的要求】');
    s.requirements.forEach((r, i) => L.push(`${i + 1}. ${r.text}（${r.from}）`));
    return L.join('\n');
  }
  if (kind === 'topic') {
    const L = ['专题：' + s.title, '区域：' + s.region, '研究目标：' + s.desc, '读者对象：' + s.audience, '交付形式：' + s.deliverable, '', '【关注问题】'];
    s.questions.forEach((q, i) => L.push(`${i + 1}. ${q}`));
    L.push('', '【关键词】' + s.keywords.join('、'));
    L.push('【关联 Skill】' + (s.skillId ? (skillById(s.skillId) || {}).name || s.skillId : '未绑定'));
    L.push('', '【专题资料】'); s.sourceIds.forEach(id => L.push('· ' + ((docById(id) || {}).title || id)));
    return L.join('\n');
  }
  const L = ['标题：' + s.title, '类型：' + s.type, ''];
  (s.sections || []).forEach(x => { L.push(x.h); L.push(x.p); L.push(''); });
  if (s.matrix) { L.push('【立场矩阵】'); s.matrix.rows.forEach(r => L.push(`${r.org}（${r.stance}）｜${r.cells.join('｜')}｜${r.quote}`)); }
  if (s.requirements && s.requirements.length) { L.push('', '【本篇落实的写作要求】'); s.requirements.forEach((q, i) => L.push(`${i + 1}. ${q}`)); }
  return L.join('\n');
}

/* ---------- 状态 ---------- */
const STORE_KEY = 'guanlan-studio-v2';
function seedState() {
  const chats = seedChats();
  const topics = seedTopics();
  topics.forEach(t => t.chats = chats[t.id] || []);
  return {
    corpus: seedCorpus(), topics, skills: seedSkills(), reports: seedReports(), packs: seedPacks(),
    uploads: seedUploads(), web: seedWeb(), tasks: seedTasks(),
    prefs: { defaultSkill: 'sk1', webSearch: true, citeStyle: 'anchor', length: 'standard', autoVersion: true, webScope: '官方+智库+媒体' },
    metrics: { drafts: 24, monthDrafts: 12, queries: 312, rtSum: 312 * 0.9, skillUses: 37, review: 2 },
    collapsed: false, notifRead: 0
  };
}
let S;
try { S = JSON.parse(localStorage.getItem(STORE_KEY)) || seedState(); } catch (e) { S = seedState(); }
if (!S || !S.corpus || !S.topics || !S.skills) S = seedState();
function saveState() { try { localStorage.setItem(STORE_KEY, JSON.stringify(S)); } catch (e) { } }
function resetState() { S = seedState(); saveState(); }
const docById = id => S.corpus.find(d => d.id === id);
const topicById = id => S.topics.find(t => t.id === id);
const skillById = id => S.skills.find(s => s.id === id);
const reportById = id => S.reports.find(r => r.id === id);
const webById = id => S.web.find(w => w.id === id);
const packById = id => S.packs.find(p => p.id === id);
const claimById = id => { for (const d of S.corpus) { const c = (d.claims || []).find(x => x.id === id); if (c) return c; } return null; };
const claimsOf = t => t.sourceIds.flatMap(id => (docById(id) || {}).claims || []);
const reportsOf = t => S.reports.filter(r => r.topicId === t.id).sort((a, b) => b.updatedAt - a.updatedAt);
const uploadsOf = t => S.uploads.filter(u => u.topicId === t.id).sort((a, b) => b.time - a.time);
const wordsOf = r => (r.sections || []).reduce((a, s) => a + (s.h || '').length + (s.p || '').length, 0);
const curVersion = o => (o.versions && o.versions.length) ? o.versions[o.versions.length - 1].n : 1;
saveState();