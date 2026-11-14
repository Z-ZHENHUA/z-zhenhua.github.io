// Home "Artworks" row: folder cards (same look as the artworks list page) sliding one
// card at a time. The three .art-slot elements keep the layout the steel board is
// measured from; the cards themselves ride on .art-track above them.
// Works shown: everything on the artworks page except the "Recent Work" one, in the
// same order. Adding a work means adding a line here too.
(() => {
  const row = document.querySelector('.art-row[data-carousel]');
  if (!row) return;
  const W = [
    ['zhangjiang', '当技术拥有回声，它会生成怎样的我们？', '影像 · Mapping', 2026, 'works/zhangjiang/cover-title.webp', 'fit-width', ''],
    ['bianbaishu', '辩白书', '游戏 · 交互', 2025, 'works/bianbaishu/01.webp', '', ''],
    ['redo-id', 'Redo ID', '影像 · Mapping', 2026, 'works/redo-id/scene-comp-1f.webp', '', ''],
    ['null-id', 'Null ID', '影像 · Mapping', 2026, 'works/null-id/03.webp', '', 'transform:translate(-50%,-50%) scale(1.18)'],
    ['enter-id', 'Enter ID', '影像 · Mapping', 2025, 'works/enter-id/01.webp', '', 'transform:translate(-50%,-55%) scale(1.12)'],
    ['tuomin', '脱敏', '影像 · Mapping', 2024, 'works/tuomin/scene-glow-20261108.png', '', ''],
    ['fight-lanina', 'Fight La Niña', '装置', 2024, 'works/fight-lanina/cover-frontal-centered-title-20261110.png?v=3', '', ''],
    ['diyibu', '第一步', '游戏 · 交互', 2024, 'works/diyibu/cover-6-ai-final-20261108.png', '', '']
  ];
  const steps = ['step-c', 'step-a', 'step-b'];
  const slots = [...row.querySelectorAll('.art-slot')];
  const viewport = row.querySelector('.art-viewport'), track = row.querySelector('.art-track');
  const make = (w, k) => {
    const [slug, title, tag, year, img, fit, style] = w;
    const el = document.createElement('article');
    el.className = 'home-card' + (k % 2 ? ' tilt-r' : '');
    el.innerHTML = `<a class="${steps[k % 3]}" href="./artworks/${slug}/"><span class="window ${fit}"><img class="photo" src="./assets/${img}" alt="${title}作品画面" decoding="async"${style ? ` style="${style}"` : ''}><img class="icon" src="./assets/graphics/${slug}-v8.png" alt="" decoding="async"></span><span class="caption"><span class="meta"><span class="tag">${tag}</span><span>${year}</span></span><strong>${title}</strong></span></a>`;
    tint(el);
    return el;
  };

  // Same spectrum sheet as the artworks page: hairline bars sampled from the cover.
  const specCache = {};
  function tint(card) {
    const img = card.querySelector('.photo'), key = img.getAttribute('src');
    const apply = v => { card.style.setProperty('--spec', v.spec); card.style.setProperty('--back', v.back); card.style.setProperty('--glow', v.glow); };
    if (specCache[key]) return apply(specCache[key]);
    const run = () => {
      try {
        const w = 160, h = 100, c = document.createElement('canvas'); c.width = w; c.height = h;
        const g = c.getContext('2d', {willReadFrequently: true}); g.drawImage(img, 0, 0, w, h);
        const d = g.getImageData(0, 0, w, h).data, BARS = 300, PITCH = 4;
        const s = document.createElement('canvas'); s.width = BARS * PITCH; s.height = 4;
        const out = s.getContext('2d'); out.fillStyle = '#080808'; out.fillRect(0, 0, s.width, s.height);
        let total = [0, 0, 0], n = 0;
        for (let i = 0; i < BARS; i++) {
          const x = Math.floor(i / BARS * w), jump = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
          let best = [0, 0, 0], score = -1;
          for (let t = 0; t < 6; t++) {
            const y = Math.floor((jump + t / 6) % 1 * h), k = (y * w + x) * 4, rgb = [d[k], d[k + 1], d[k + 2]];
            const v = Math.max(...rgb) - Math.min(...rgb) + Math.max(...rgb) * .3;
            total = total.map((m, j) => m + rgb[j]); n++;
            if (v > score) { score = v; best = rgb; }
          }
          out.fillStyle = vivid(best, .3, .72); out.fillRect(i * PITCH, 0, jump > .86 ? 1 : 2, s.height);
        }
        const avg = total.map(v => v / n);
        apply(specCache[key] = {spec: `url(${s.toDataURL()})`, back: vivid(avg, .2, .16), glow: vivid(avg, .58, .62)});
      } catch (_) {}
    };
    if (img.complete && img.naturalWidth) run(); else img.addEventListener('load', run, {once: true});
  }
  function vivid([r, g, b], lowL = .36, highL = .62) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let hue = 0;
    if (d) hue = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    const l = (max + min) / 2, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    return `hsl(${Math.round(hue * 60 + 360) % 360} ${Math.round(Math.min(1, s * 1.3) * 100)}% ${Math.round(Math.min(highL, Math.max(lowL, l)) * 100)}%)`;
  }

  let start = 0, cardW = 0, gap = 0, sliding = false, paused = false, inRow = true;
  function build() {
    track.replaceChildren(...[0, 1, 2, 3].map(k => make(W[(start + k) % W.length], start + k)));
    layout();
  }
  function layout() {
    const r = row.getBoundingClientRect(), b = slots.map(s => s.getBoundingClientRect());
    inRow = Math.abs(b[0].top - b[2].top) < 2;
    row.classList.toggle('is-static', !inRow);
    if (!inRow) {
      // Narrow screens stack the slots: each card sits inside its own slot, no sliding.
      track.style.cssText = '';
      const cards = [...row.querySelectorAll('.art-slot > .home-card'), ...track.children];
      slots.forEach((s, k) => { const c = cards[k]; if (c) { c.style.width = ''; c.style.display = ''; s.querySelector('.art-slot-size').hidden = true; s.appendChild(c); } });
      return;
    }
    slots.forEach(s => { s.querySelector('.art-slot-size').hidden = false; const c = s.querySelector('.home-card'); if (c) track.appendChild(c); });
    while (track.children.length < 4) track.appendChild(make(W[(start + track.children.length) % W.length], start + track.children.length));
    cardW = b[0].width; gap = b[1].left - b[0].right;
    Object.assign(viewport.style, {left: `${b[0].left - r.left}px`, top: `${b[0].top - r.top}px`, width: `${b[2].right - b[0].left}px`});
    track.style.gap = `${gap}px`;
    [...track.children].forEach(c => { c.style.width = `${cardW}px`; c.style.display = ''; });
  }
  function next() {
    if (sliding || paused || document.hidden || !inRow) return;
    sliding = true;
    track.classList.add('is-sliding');
    track.style.transform = `translateX(${-(cardW + gap)}px)`;
    track.addEventListener('transitionend', () => {
      track.classList.remove('is-sliding');
      track.style.transform = '';
      start = (start + 1) % W.length;
      track.firstElementChild.remove();
      const c = make(W[(start + 3) % W.length], start + 3); c.style.width = `${cardW}px`;
      track.appendChild(c);
      sliding = false;
    }, {once: true});
  }

  const recent = document.querySelector('.recent-image.home-card');
  if (recent) tint(recent);

  // Round clips where the wires land on the cards: the steel board draws them, but the
  // cards now sit above the board, so repeat them on top.
  const dots = [];
  function placeDots() {
    const m = window.__zhModules, board = document.querySelector('.steel-board');
    dots.forEach(d => d.remove()); dots.length = 0;
    if (!m || !board) return;
    const B = board.getBoundingClientRect();
    const boxes = [...slots, recent].filter(Boolean).map(e => e.getBoundingClientRect());
    m.clips.forEach(c => {
      const x = B.left + c.x, y = B.top + c.y;
      if (!boxes.some(b => x > b.left - 2 && x < b.right + 2 && y > b.top - 24 && y < b.bottom + 2)) return;
      const d = document.createElement('span'); d.className = 'home-clip'; d.setAttribute('aria-hidden', 'true');
      d.style.left = `${c.x}px`; d.style.top = `${c.y}px`; board.appendChild(d); dots.push(d);
    });
  }
  // 11-11 ZH: the clips on the artwork cards looked odd, so they are not redrawn.
  // window.addEventListener('zh-layout', placeDots); placeDots();

  W.forEach(w => { const i = new Image(); i.src = './assets/' + w[4]; });
  build();
  new ResizeObserver(() => { if (!sliding) layout(); }).observe(row);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  row.addEventListener('mouseenter', () => paused = true);
  row.addEventListener('mouseleave', () => paused = false);
  row.addEventListener('focusin', () => paused = true);
  row.addEventListener('focusout', () => paused = false);
  setInterval(next, 4800);
})();
