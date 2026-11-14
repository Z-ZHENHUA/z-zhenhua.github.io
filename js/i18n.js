// 11-11 中 / EN switch. The pages are written in Chinese; English swaps text in place.
// Choice: ?lang=en|zh, remembered in localStorage 'zh-lang'. Contact sections stay as they are.
(() => {
  const root = document.documentElement;
  let lang = 'zh';
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'zh') localStorage.setItem('zh-lang', q);
    lang = localStorage.getItem('zh-lang') === 'en' ? 'en' : 'zh';
  } catch (_) {}
  if (lang === 'en') { root.classList.add('lang-en'); root.lang = 'en'; }

  // Whole-text replacements (trimmed text node or attribute value).
  const T = {
    // works
    '当技术拥有回声，它会生成怎样的我们？': 'When Technology Echoes, What Version of Ourselves Will It Give Birth To?',
    '你的冗余正在结算……': 'Calculating Your Redundancy...',
    '辩白书': 'Libro de Justificación', '第一步': 'First Step', '脱敏': 'Desensitized',
    '迎战拉尼娜': 'Fight La Niña', '重置 ID': 'Redo ID', '空值 ID': 'Null ID', '输入 ID': 'Enter ID',
    '待织的辞海': 'The Unwoven Sea of Words', '量子荒岛': 'Quantum Isle',
    '无面狂欢': 'Faceless Rave',
    // tags and meta
    '影像 · Mapping': 'Video · Mapping', '游戏 · 交互': 'Game · Interactive', '装置': 'Installation',
    'AI 语音交互': 'AI Voice Interaction', '激光灯光秀': 'Laser Show', '全部作品': 'All works',
    '幕墙影像 | AI 编程 | 2026': 'Façade projection | AI coding | 2026',
    'AI 交互游戏装置 | 奥地利林茨 | 2026': 'AI interactive game installation | Linz, Austria | 2026',
    '多模态 AI 交互空间 | 西安 | 2025': 'Multimodal AI interactive space | Xi’an | 2025',
    '游戏交互装置 | 2024': 'Interactive game installation | 2024',
    'Mapping | 重庆 | 2025': 'Mapping | Chongqing | 2025',
    'Mapping | 俄罗斯喀山 | 2026': 'Mapping | Kazan, Russia | 2026',
    '灯光装置 | 秦皇岛阿那亚 | 2024': 'Light installation | Aranya, Qinhuangdao | 2024',
    '激光灯光秀 | 北京': 'Laser show | Beijing',
    'AI 语音交互 | 浙江濮院古镇 | 2026': 'AI voice interaction | Puyuan Ancient Town, Zhejiang | 2026',
    '游戏交互装置 | 西安 | 2024': 'Interactive game installation | Xi’an | 2024',
    '灯光装置 | 秦皇岛阿那亚 · 阿那亚戏剧节候鸟 300 | 2024': 'Lighting installation | Migratory Birds 300, Aranya Theatre Festival, Qinhuangdao | 2024',
    'Mapping | 2024 重庆国际 Mapping 大赛投稿作品 | 2024': 'Mapping | Submission, 2024 Chongqing International Mapping Competition | 2024',
    'Mapping | 俄罗斯喀山 · NUR 灯光节投稿作品 | 2026': 'Mapping | Submission, NUR Festival of Light, Kazan, Russia | 2026',
    'Mapping | 亚洲国际 Mapping 大赛（进行中） | 2026': 'Mapping | Asia International Mapping Competition (ongoing) | 2026',
    'Mapping | 重庆 · 第四届重庆国际光影文化旅游季（入围） | 2025': 'Mapping | Shortlisted, 4th Chongqing International Light Culture Tourism Season | 2025',
    'Mapping | 重庆 · 第四届重庆国际光影文化旅游季 · 重庆国际 Mapping 大赛入围作品 | 2025': 'Mapping | Shortlisted, Chongqing International Mapping Competition, 4th Chongqing International Light Culture Tourism Season | 2025',
    'AIGC 幕墙影像 | 上海张江科学之门 · 张江城市灯塔 AI 艺术展 | 2026': 'AIGC media facade | Zhangjiang Urban Beacon AI Art Exhibition, Gate of Science, Shanghai | 2026',
    '多模态 AI 交互空间 | 西安方所 | 2025': 'Multimodal AI interactive space | Fangsuo, Xi’an | 2025',
    'AI 交互游戏装置 | 奥地利林茨 · 林茨电子艺术节 | 2026': 'AI interactive game installation | Ars Electronica, Linz, Austria | 2026',
    'AI 交互游戏装置 | 展出于 2026 林茨电子艺术节（奥地利林茨） | 2026': 'AI interactive game installation | Exhibited at Ars Electronica 2026, Linz, Austria | 2026',
    'AI 交互游戏装置 | 2026 林茨电子艺术节（奥地利林茨） | 2026': 'AI interactive game installation | Ars Electronica 2026, Linz, Austria | 2026',
    'AI 语音交互文化空间': 'AI voice-interactive cultural space',
    'AI 语音交互文化空间 | 浙江濮院古镇 · 北更楼 | 2026': 'AI voice-interactive cultural space | Beigeng Tower, Puyuan Ancient Town, Zhejiang | 2026',
    '沉浸式 Mapping 交互空间': 'Immersive mapping interactive space',
    '沉浸式 Mapping 交互空间 | 四川西昌 · 北斗之上星际幻城《地心谷》 | 2026': 'Immersive mapping interactive space | Earth Core Valley, Interstellar City Above Beidou, Xichang, Sichuan | 2026',
    '沉浸式 CAVE 粒子、吹气交互风车': 'Immersive CAVE particles, breath-activated pinwheels',
    '沉浸式 CAVE 粒子、吹气交互风车 | 四川西昌 · 北斗之上星际幻城《地心谷》 | 2026': 'Immersive CAVE particles, breath-activated pinwheels | Earth Core Valley, Interstellar City Above Beidou, Xichang, Sichuan | 2026',
    '濮院': 'Puyuan',
    '西昌': 'Xichang',
    '北京': 'Beijing',
    '激光 × Mapping 视觉制作': 'Laser × mapping visuals',
    '激光 × Mapping 视觉制作 | 北京三里屯 · NEW PH | 2025': 'Laser × mapping visuals | NEW PH, Sanlitun, Beijing | 2025',
    '12FPS Lab 发起人': 'Founder, 12FPS Lab',
    '发起人': 'Founder',
    '12FPS Lab 是一个创意团队，致力于探索 AI 在公共空间中的艺术化表达，把实验带进展览、城市建筑立面与文旅现场，从创意构思一直做到项目落地。': '12FPS Lab is a creative team exploring artistic expressions of AI in public space, taking experiments into exhibitions, building facades and cultural tourism sites, from first concept all the way to delivery.',
    '主理人': 'Founder',
    '吴振华 ZH': 'Wu Zhenhua (ZH)',
    '林茨电子艺术节': 'Ars Electronica Festival',
    '奥地利林茨': 'Linz, Austria',
    '入围亚洲国际 Mapping 大赛': 'Shortlisted, Asia International Mapping Competition',
    '亚洲': 'Asia',
    '张江城市灯塔 AI 艺术展': 'Zhangjiang Urban Beacon AI Art Exhibition',
    '上海': 'Shanghai',
    '入围成都国际光影大赛': 'Shortlisted, Chengdu International Light Art Competition',
    '成都': 'Chengdu',
    '入围重庆国际 Mapping 大赛': 'Shortlisted, Chongqing International Mapping Competition',
    '重庆': 'Chongqing',
    '《辩白书》获西美毕业展 GPARK 展区“未来之星”全场大奖': 'Libro de Justificación wins the Future Star Grand Prize, GPARK section, XAFA Graduation Exhibition',
    '西安': 'Xi’an',
    '入选“千里之行——全国美术学院毕业作品展”': 'Selected, A Journey of a Thousand Miles: National Art Academies Graduation Exhibition',
    '入选“丛生——两岸艺术教育双年展”': 'Selected, Cluster: Cross-Strait Art Education Biennale',
    '杭州': 'Hangzhou',
    '入选阿那亚戏剧节「候鸟 300」': 'Selected, Migratory Birds 300, Aranya Theatre Festival',
    '秦皇岛': 'Qinhuangdao',
    '入选南京 D9 街区艺术驻留计划': 'Selected, D9 Block Art Residency',
    '南京': 'Nanjing',
    '展览经历': 'Exhibitions',
    '第三届全国大学生美展': '3rd National College Students Art Exhibition',
    '广州': 'Guangzhou',
    '陕西省高校艺术类研究生优秀作品展': 'Shaanxi Universities Graduate Art Exhibition of Outstanding Works',
    // captions on detail pages
    '斜侧面 / AI 修饰': 'Three-quarter view / AI-retouched', '正面与侧面 / AI 修饰': 'Front and side / AI-retouched',
    '参与体验 / AI 修饰': 'Visitors taking part / AI-retouched', '正面现场 / AI 修饰': 'Front view on site / AI-retouched',
    '现场全景 / AI 修饰；立柱细节 / PDF 图片裁切': 'Site overview / AI-retouched; column detail / cropped from PDF',
    'AI 生成场景': 'AI-generated scene', '场景效果图 / AI 合成': 'Scene rendering / AI composite',
    // navigation and labels
    '跳到内容': 'Skip to content', '回到顶部 ↑': 'Back to top ↑', '← 上一件': '← Previous', '下一件 →': 'Next →',
    '← 返回艺术创作': '← Back to Art Work', '← 返回商业合作': '← Back to Commissions',
    '查看作品 →': 'View work →', '全部艺术创作 →': 'All Art Work →', '进入实验室 →': 'Enter the Lab →',
    '整理中': 'Coming soon', '近期作品': 'Recent Work',
    '跨媒体项目的视觉制作与游戏化互动开发': 'Visual production and gamified interaction for cross-media projects',
    '由 AI 担任判定者的驾驶测试游戏。玩家戴上 VR 头显、握住方向盘沿直线行驶，系统不断干扰，玩家不断修正；双方共同造成的偏差，最后都结算为玩家的“冗余值”。入选 2026 林茨电子艺术节。':
      'A driving-test game judged by AI. Wearing a VR headset and holding a steering wheel, players try to drive in a straight line while the system keeps interfering and they keep correcting; every deviation they cause together is charged to the player as “redundancy”. Selected for Ars Electronica Festival 2026, Linz.',
    // about
    '吴振华（ZH）｜媒体艺术家｜创意 AI Builder': 'Wu Zhenhua (ZH) | Media Artist | Creative AI Builder',
    '创作涉及影像、实验性游戏、交互装置与 Mapping 等。其作品取材于智能媒介的技术语言、算法治理的现场，以及不断被调试的文明参数，关注人、技术与世界在量产智能时代如何相互设定，并以沉浸式体验、虚构叙事和游戏化机制，探索这些设定被共同编辑的可能。':
      'Working across moving image, experimental games, interactive installation and projection mapping. The work draws on the technical language of intelligent media, the sites where algorithms govern, and the parameters of civilisation that are constantly being re-tuned. It looks at how people, technology and the world set one another in an age of mass-produced intelligence, and uses immersive experience, fictional narrative and game mechanics to explore how those settings might be edited together.',
    '作品曾展出于林茨电子艺术节、亚洲国际 Mapping 大赛、上海张江科学之门双子塔、“重庆之夜”国际光影文化旅游季、阿那亚戏剧节候鸟 300、北京上上国际美术馆、西安丝路国际文化艺术中心、西安方所等。':
      'Work has been shown at Ars Electronica Festival in Linz, the Asia International Mapping Competition, the twin towers of the Gate of Science in Zhangjiang, Shanghai, the “Chongqing Night” International Light and Culture Tourism Season, Migratory Birds 300 at the Aranya Theatre Festival, Beijing Shangshang International Art Museum, Xi’an Silk Road International Culture and Art Center and Fangsuo Commune Xi’an.',
    '把 AI 的能力带进真实的创作工作流，通过制作原型、评估模型、沉淀可复用的流程与工具，寻求将智能这一能源转化为创造力的最好方式。':
      'Brings AI into real creative workflows: building prototypes, evaluating models, and turning what works into reusable processes and tools, in search of the best way to turn intelligence, as a source of energy, into creativity.',
    // page titles
    '媒体艺术家｜创意 AI Builder': 'Media Artist | Creative AI Builder',
    // aria labels
    'ZH 首页': 'ZH home', '主要导航': 'Main navigation', '语言': 'Language', '打开菜单': 'Open menu',
    '移动导航': 'Mobile navigation', '作品导航': 'Work navigation', '首页': 'Home',
    '按作品类型筛选': 'Filter by type', '艺术创作列表': 'Art Work', '商业合作列表': 'Commissions',
    'Instagram 二维码': 'Instagram QR code', '小红书二维码': 'RedNote QR code'
  };
  // Pieces used to put image descriptions into English.
  const PIECES = [
    ['当技术拥有回声，它会生成怎样的我们？', 'When Technology Echoes'], ['你的冗余正在结算……', 'Calculating Your Redundancy'],
    ['当技术拥有回声', 'When Technology Echoes'], ['辩白书', 'Libro de Justificación'], ['第一步', 'First Step'], ['脱敏', 'Desensitized'],
    ['待织的辞海', 'The Unwoven Sea of Words'], ['量子荒岛', 'Quantum Isle'], ['无面狂欢', 'Faceless Rave'],
    ['拉尼娜：', ''], ['作品概念脚本第', 'concept script, page'], ['视觉材料第', 'visual material, page'], ['页', ''],
    ['作品视频画面', 'video still'], ['作品画面', 'image'], ['现场照片', 'site photo'], ['现场组图，观众', 'site photos, audience'],
    ['现场组图', 'site photos'], ['现场全景', 'site overview'], ['正面现场', 'front view on site'], ['现场', 'on site'],
    ['AI 修饰拼图', 'AI-retouched composite'], ['AI 修饰图', 'AI-retouched'], ['原始帧', 'original frame'],
    ['航拍首图', 'aerial view'], ['航拍画面', 'aerial view'], ['林茨', 'Linz'], ['装置', 'installation'],
    ['场景效果图，模拟舞台和观众', 'scene rendering with stage and audience'], ['场景效果图', 'scene rendering'],
    ['海边装置方案效果图', 'seaside installation rendering'], ['展览主视觉', 'Exhibition key visual'],
    ['投影建筑立面', 'projection on the building façade'], ['斜侧面', 'three-quarter view'], ['正面与侧面', 'front and side'],
    ['观众体验', 'visitors in'], ['观众剪影前的球形影像，以及广场全景', 'spherical image behind audience silhouettes, and the square'],
    ['激光下的角色影像，以及线条影像全景', 'figure under lasers, and line imagery'],
    ['投影现场的 场景合成 / AI 背景，投影为原始单帧图', 'scene composite with AI background; the projection is an original frame'],
    ['沙地上的互动道具与齿轮', 'Interactive props and gears on sand'], ['红光下的装置软管和道具', 'Hoses and props under red light'],
    ['装置底部的互动道具', 'Interactive props at the base'], ['，', ', '], ['：', ': ']
  ];
  const hasZh = s => /[一-鿿]/.test(s);
  function alt(s) {
    if (T[s]) return T[s];
    let o = s;
    for (const [a, b] of PIECES) o = o.split(a).join(b);
    o = o.replace(/\s+/g, ' ').trim();
    return hasZh(o) ? 'Image' : o;
  }
  const skip = el => el.closest('.site-contact, .contact, script, style, .work-text, .page-plate h1 [lang="zh-CN"]');
  function run(scope) {
    const w = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (w.nextNode()) nodes.push(w.currentNode);
    for (const n of nodes) {
      const t = n.nodeValue.trim();
      if (!t || !hasZh(t) || !n.parentElement || skip(n.parentElement)) continue;
      if (T[t]) n.nodeValue = n.nodeValue.replace(t, T[t]);
    }
    scope.querySelectorAll?.('[alt],[aria-label],[title]').forEach(el => {
      if (el.closest('.site-contact, .contact') && el.tagName !== 'IMG') return;
      for (const k of ['alt', 'aria-label', 'title']) {
        const v = el.getAttribute(k);
        if (v && hasZh(v)) el.setAttribute(k, k === 'alt' ? alt(v) : (T[v] || v));
      }
    });
  }
  function title() {
    const m = document.title.match(/^(.*) — ZH$/);
    if (m && T[m[1]]) document.title = `${T[m[1]]} — ZH`;
    else if (m && m[1] === '艺术创作') document.title = 'Art Work — ZH';
    else if (m && m[1] === '商业合作') document.title = 'Commissions — ZH';
  }

  function wire() {
    document.querySelectorAll('.lang-toggle').forEach(g => {
      g.querySelectorAll('button').forEach((b, i) => {
        const v = i ? 'en' : 'zh';
        b.disabled = false; b.removeAttribute('title');
        b.setAttribute('aria-pressed', String(v === lang));
        b.addEventListener('click', () => {
          if (v === lang) return;
          try { localStorage.setItem('zh-lang', v); } catch (_) {}
          const u = new URL(location.href); u.searchParams.delete('lang'); location.replace(u);
        });
      });
    });
    if (lang !== 'en') return;
    title(); run(document.body);
    // Cards the homepage builds later (carousel) get translated as they appear.
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => n.nodeType === 1 && run(n)))).observe(document.body, {childList: true, subtree: true});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();
})();
