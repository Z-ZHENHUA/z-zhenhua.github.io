// Light/dark switch for the static inner pages; shares the homepage's saved choice.
(() => {
  const page = document.documentElement, toggle = document.querySelector('.look-toggle');
  if (!toggle) return;
  function label() {
    const light = page.dataset.look === 'light';
    toggle.textContent = light ? 'Dark' : 'Light';
    toggle.setAttribute('aria-label', light ? '切换到深色' : '切换到浅色');
    document.querySelector('meta[name=theme-color]').content = light ? '#f8f7f1' : '#0a0a0a';
    document.querySelector('meta[name=color-scheme]').content = light ? 'light' : 'dark';
  }
  toggle.addEventListener('click', () => {
    const light = page.dataset.look !== 'light';
    if (light) page.dataset.look = 'light'; else delete page.dataset.look;
    try { localStorage.setItem('zh-look', light ? 'light' : 'dark'); } catch (_) {}
    // The Claude preview window colours its own edge only when a page loads, so reload there.
    if (/\bClaude\//.test(navigator.userAgent)) {
      try { sessionStorage.setItem('zh-scroll', String(scrollY)); } catch (_) {}
      const url = new URL(location.href);
      url.searchParams.delete('look');
      location.replace(url);
      return;
    }
    label();
  });
  label();
  try {
    const kept = sessionStorage.getItem('zh-scroll');
    if (kept !== null) { sessionStorage.removeItem('zh-scroll'); scrollTo(0, Number(kept)); }
  } catch (_) {}
})();

// List pages: one wire leaves the nameplate, clips onto the first folder, then snakes
// through the gaps of the grid down to the contact plate. It is worked out from the
// cards' real positions, so adding works or resizing needs no change here.
(() => {
  const main = document.querySelector('main.page'), grid = main && main.querySelector('.grid'),
    plate = main && main.querySelector('.page-plate'), contact = main && main.querySelector('.site-contact');
  if (!grid || !plate || !contact || !main.querySelector('.rail')) return;
  main.querySelector('.rail').remove();
  const NS = 'http://www.w3.org/2000/svg', RADIUS = 16;
  const svg = document.createElementNS(NS, 'svg'), wire = document.createElementNS(NS, 'path');
  svg.classList.add('rail-svg'); svg.setAttribute('aria-hidden', 'true'); svg.appendChild(wire);
  const dot = document.createElement('span'); dot.className = 'rail-dot'; dot.setAttribute('aria-hidden', 'true');
  main.append(svg, dot);

  function rounded(points) {
    let d = `M${points[0][0]} ${points[0][1]}`;
    for (let i = 1; i < points.length - 1; i++) {
      const [px, py] = points[i - 1], [x, y] = points[i], [nx, ny] = points[i + 1];
      const r = Math.min(RADIUS, Math.hypot(x - px, y - py) / 2, Math.hypot(nx - x, ny - y) / 2);
      const ux = Math.sign(x - px), uy = Math.sign(y - py), vx = Math.sign(nx - x), vy = Math.sign(ny - y);
      d += `L${x - ux * r} ${y - uy * r}Q${x} ${y} ${x + vx * r} ${y + vy * r}`;
    }
    const last = points[points.length - 1];
    return `${d}L${last[0]} ${last[1]}`;
  }

  function place() {
    const m = main.getBoundingClientRect(), local = r => ({l: r.left - m.left, r: r.right - m.left, t: r.top - m.top, b: r.bottom - m.top});
    const cards = [...grid.children].filter(c => !c.hidden).map(c => local(c.getBoundingClientRect()));
    if (!cards.length) { svg.style.display = dot.style.display = 'none'; return; }
    svg.style.display = dot.style.display = 'block';
    const rows = [];
    for (const c of cards) {
      const row = rows.find(r => Math.abs(r[0].t - c.t) < 4);
      if (row) row.push(c); else rows.push([c]);
    }
    const p = local(plate.getBoundingClientRect()), k = local(contact.getBoundingClientRect()), first = rows[0];
    const startX = Math.round(Math.min(first[0].l + 96, p.r - 40)), dotY = first[0].t + 16;
    const gutters = first.slice(1).map((c, i) => Math.round((first[i].r + c.l) / 2));
    const pts = [[startX, p.b - 2], [startX, dotY]];
    let x = startX;
    // 11-14 ZH: the wire now only runs from the nameplate to the first work; no snaking down to the contact plate.
    const ONLY_FIRST = true;
    if (ONLY_FIRST) { svg.setAttribute('width', m.width); svg.setAttribute('height', m.height); wire.setAttribute('d', `M${startX} ${p.b - 2}L${startX} ${dotY}`); dot.style.left = `${startX}px`; dot.style.top = `${dotY}px`; return; }
    if (gutters.length) {
      let far = true;
      rows.forEach((row, i) => {
        const y = Math.round(i < rows.length - 1 ? (row[0].b + rows[i + 1][0].t - 14) / 2 : (row[0].b + k.t) / 2);
        pts.push([x, y]);
        x = far ? gutters[gutters.length - 1] : gutters[0];
        if (i < rows.length - 1 || x !== pts[pts.length - 1][0]) pts.push([x, y]);
        far = !far;
      });
    }
    pts.push([x, k.t + 2]);
    const clean = pts.filter((q, i) => !i || q[0] !== pts[i - 1][0] || q[1] !== pts[i - 1][1]);
    svg.setAttribute('width', m.width); svg.setAttribute('height', m.height);
    wire.setAttribute('d', rounded(clean));
    dot.style.left = `${startX}px`; dot.style.top = `${dotY}px`;
  }

  // Sheet inside each folder: a spectrum sampled from that work's own first image.
  function tint(card) {
    const img = card.querySelector('.photo');
    if (!img) return;
    const run = () => {
      try {
        // Hundreds of hairline bars, each one a colour read from the image along its width.
        const W = 160, H = 100, c = document.createElement('canvas'); c.width = W; c.height = H;
        const g = c.getContext('2d', {willReadFrequently: true}); g.drawImage(img, 0, 0, W, H);
        const d = g.getImageData(0, 0, W, H).data, BARS = 300, PITCH = 4;
        const s = document.createElement('canvas'); s.width = BARS * PITCH; s.height = 4;
        const out = s.getContext('2d');
        out.fillStyle = '#080808'; out.fillRect(0, 0, s.width, s.height);
        let total = [0, 0, 0], n = 0;
        for (let i = 0; i < BARS; i++) {
          const x = Math.floor(i / BARS * W), jump = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
          // Prefer the most colourful of a few samples down this column, so dark photos still glow.
          let best = [0, 0, 0], score = -1;
          for (let t = 0; t < 6; t++) {
            const y = Math.floor((jump + t / 6) % 1 * H), k = (y * W + x) * 4, rgb = [d[k], d[k + 1], d[k + 2]];
            const v = Math.max(...rgb) - Math.min(...rgb) + Math.max(...rgb) * .3;
            total = total.map((m, j) => m + rgb[j]); n++;
            if (v > score) { score = v; best = rgb; }
          }
          out.fillStyle = vivid(best, .3, .72);
          out.fillRect(i * PITCH, 0, jump > .86 ? 1 : 2, s.height);
        }
        card.style.setProperty('--spec', `url(${s.toDataURL()})`);
        card.style.setProperty('--back', vivid(total.map(v => v / n), .2, .16));
        card.style.setProperty('--glow', vivid(total.map(v => v / n), .58, .62));
      } catch (_) {}
    };
    if (img.complete && img.naturalWidth) run(); else img.addEventListener('load', run, {once: true});
    img.loading = 'eager';
  }
  function vivid([r, g, b], lowL = .36, highL = .62) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
    let h = 0;
    if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    const l = (max + min) / 2, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    return `hsl(${Math.round(h * 60 + 360) % 360} ${Math.round(Math.min(1, s * 1.3) * 100)}% ${Math.round(Math.min(highL, Math.max(lowL, l)) * 100)}%)`;
  }

  [...grid.children].forEach(tint);
  new ResizeObserver(place).observe(main);
  main.querySelectorAll('.filter').forEach(b => b.addEventListener('click', () => requestAnimationFrame(place)));
  place();
})();
