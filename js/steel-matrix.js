// The first-screen holes form work graphics as a slow halftone: holes inside a graphic open wider.
// Holes near the mouse open too and trail behind it.
// It has its own small canvas, so the 3D steel is never redrawn for it.
(() => {
  const board = document.querySelector('.steel-board');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Optical scale on the dot grid, with the Linz installation as the reference.
  const workScale = {
    zhangjiang: 1.08, linz: 1.12, bianbaishu: 1.14,
    redo: 1.32, null: 1.03, enter: 1.57, fight: 1.04, diyibu: 1.15, tuomin: 1.45
  };
  const sources = [
    'zh-logo-hero.png', 'zhangjiang-v8.png',
    'bianbaishu-20261113.png', 'redo-id-20261113.png', 'null-id-v8.png',
    'enter-id-20261113.png', 'fight-lanina-v8.png',
    'diyibu-v8.png', 'lab-mark.svg'
  ];
  // ?hero=zh : instead of work graphics, three strokes keep re-editing themselves
  // Z -> H -> braces mark -> Z: strokes shrink to dots, fly, and grow again. Loops seamlessly.
  const ZH = new URLSearchParams(location.search).get('hero') === 'zh';
  // ?hero=photo (11-11 test): the works' cover photos as halftone instead of icons.
  // [file, crop centre x, crop centre y, crop size (share of the short side), dark subject on light ground]
  const PHOTO = new URLSearchParams(location.search).get('hero') === 'photo';
  const PHOTOS = [
    ['linz/thumb-4x3.webp', .36, .45, .95, false],
    ['zhangjiang/cover-aerial-20261108.png', .5, .42, .8, false],
    ['bianbaishu/01.webp', .5, .55, .85, false],
    ['redo-id/scene-comp-1f.webp', .5, .45, .9, false],
    ['null-id/03.webp', .5, .5, .8, false],
    ['enter-id/01.webp', .5, .42, .95, false],
    ['fight-lanina/cover-frontal-centered-20261110.png', .5, .45, .9, false],
    ['diyibu/cover-6-ai-final-20261108.png', .5, .52, .85, true]
  ];
  let zhStart = 0;
  const seg = (ax, ay, bx, by) => ({cx: (ax + bx) / 2, cy: (ay + by) / 2, len: Math.hypot(bx - ax, by - ay), ang: Math.atan2(by - ay, bx - ax)});
  const A = .2, B = .8, T = .24, D = .76;
  // The braces mark (logo B / 4c): "}" and "{" turned half a turn, tips meeting in the middle.
  const poly = pts => pts.slice(1).map((q, n) => seg(pts[n][0], pts[n][1], q[0], q[1]));
  const brace = [[.19, .2], [.37, .2], [.37, .38], [.5, .42], [.37, .5], [.37, .8], [.19, .8]];
  const MARK = [...poly(brace), ...poly(brace.map(([x, y]) => [1 - x, 1 - y]))];
  const N = MARK.length;
  // Letters have 3 strokes; the spare ones wait as invisible dots at a stroke's centre,
  // so a letter's strokes split up and fly out into the mark, and gather back again.
  const pad = strokes => Array.from({length: N}, (_, i) => i < 3 ? {...strokes[i], w: 1} : {...strokes[i % 3], len: 0, w: 0});
  const KEYS = [
    pad([seg(A, T, B, T), seg(B, T, A, D), seg(A, D, B, D)]),   // Z
    pad([seg(A, T, A, D), seg(A, .5, B, .5), seg(B, T, B, D)]), // H
    // Mark strokes ordered so each letter stroke feeds a nearby group.
    [0, 6, 3, 1, 7, 4, 2, 8, 5, 9, 10, 11].map(n => ({...MARK[n], w: 1}))
  ];
  // Each change: the strokes shrink to dots, the dots fly on curves to their new places
  // (staggered, fast in the middle), then shoot out into the next letter's strokes.
  const ZH_HOLD = 1700, ZH_MOVE = 1600, ZH_STEP = ZH_HOLD + ZH_MOVE, STROKE = .1, SOFT = .03, STAGGER = .03;
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const inCubic = v => v * v * v;
  const inOutQuint = v => v < .5 ? 16 * v ** 5 : 1 - Math.pow(-2 * v + 2, 5) / 2;
  const outBack = v => { const c = 1.6; return 1 + (c + 1) * Math.pow(v - 1, 3) + c * Math.pow(v - 1, 2); };
  function strokesAt(ms) {
    const total = ZH_STEP * KEYS.length, t = ((ms % total) + total) % total;
    const k = Math.floor(t / ZH_STEP), local = t - k * ZH_STEP;
    const from = KEYS[k], to = KEYS[(k + 1) % KEYS.length];
    const raw = local < ZH_HOLD ? 0 : (local - ZH_HOLD) / ZH_MOVE;
    return from.map((a, i) => {
      const b = to[i];
      // Stagger the three strokes so they leave and land one after another.
      const u = clamp01((raw - (i % 12) * STAGGER) / (1 - 11 * STAGGER));
      if (u <= 0) return a;
      if (u >= 1) return b;
      const shrink = clamp01(u / .28), fly = clamp01((u - .28) / .46), grow = clamp01((u - .74) / .26);
      // Curved flight: bend sideways, alternating direction per stroke and per step.
      const f = inOutQuint(fly), dx = b.cx - a.cx, dy = b.cy - a.cy, dist = Math.hypot(dx, dy);
      const bend = (((i + k) % 2) ? 1 : -1) * (.18 + .5 * dist);
      const mx = (a.cx + b.cx) / 2 - dy / (dist || 1) * bend * (dist ? 1 : 0) + (dist ? 0 : bend * .5);
      const my = (a.cy + b.cy) / 2 + dx / (dist || 1) * bend * (dist ? 1 : 0);
      const cx = (1 - f) * (1 - f) * a.cx + 2 * (1 - f) * f * mx + f * f * b.cx;
      const cy = (1 - f) * (1 - f) * a.cy + 2 * (1 - f) * f * my + f * f * b.cy;
      const w = a.w + (b.w - a.w) * f;
      if (grow > 0) return {cx: b.cx, cy: b.cy, len: b.len * outBack(grow), ang: b.ang, w: b.w};
      if (fly > 0) return {cx, cy, len: 0, ang: a.ang, w};
      return {cx: a.cx, cy: a.cy, len: a.len * (1 - inCubic(shrink)), ang: a.ang, w: a.w};
    });
  }
  function zhLevels(ms) {
    const side = Math.round(Math.sqrt(levels.length)), strokes = strokesAt(ms).filter(s => s.w > .02).map(s => ({ w: s.w,
      ax: s.cx - Math.cos(s.ang) * s.len / 2, ay: s.cy - Math.sin(s.ang) * s.len / 2,
      bx: s.cx + Math.cos(s.ang) * s.len / 2, by: s.cy + Math.sin(s.ang) * s.len / 2}));
    for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
      const px = (x + .5) / side, py = (y + .5) / side;
      let v = 0;
      for (const s of strokes) {
        const vx = s.bx - s.ax, vy = s.by - s.ay, l2 = vx * vx + vy * vy || 1e-9;
        const q = Math.max(0, Math.min(1, ((px - s.ax) * vx + (py - s.ay) * vy) / l2));
        const dx = px - (s.ax + vx * q), dy = py - (s.ay + vy * q);
        v = Math.max(v, 1 - (Math.hypot(dx, dy) - STROKE * s.w / 2) / SOFT);
      }
      levels[y * side + x] = v <= 0 ? 0 : Math.min(1, v);
    }
  }
  const SLOW = +(new URLSearchParams(location.search).get("slow") || 1);  // test only: ?slow=6 plays transitions 6x slower
  const HOLD = 3600, FADE = 1900 * SLOW, REACH = 4.2, TRAIL = .9, FOLLOW = .24;
  // 11-11: by default the board goes ZH -> a work -> ZH -> the next work ..., so the dots of the
  // name keep turning into the works. The name changes its own layout each round. ?hero=icons = works only.
  const HERO = new URLSearchParams(location.search).get('hero');
  // 11-11 v3 (default): the Lab braces are the container. They open, the work bursts out of the gap
  // between them, then shrinks back and the braces close; every close flips them between the
  // back-to-back Lab mark  }{  and an enclosing  { }.  ?hero=name = name/work alternation, ?hero=icons = works only.
  // 11-11: ZH went back to the gather / fly / burst transition; the braces version is kept as ?hero=code.
  const CODE = HERO === 'code';
  const THINK = HERO === 'think';
  const MIX = !ZH && !CODE && !THINK && HERO !== 'icons';
  // 11-11 v2 (default): the name stays put; each work is born from a different point of Z or H as a
  // ripple that spreads from that point, then shrinks back into the next point. ?hero=mix = v1 (dots fly).
  const RIPPLE = MIX && HERO === 'ripple';   // test: not convincing yet, kept off by default
  // points on the side-by-side ZH, in the order the works come out of them
  const ORIGINS = [[.44, .32], [.73, .5], [.1, .68], [.9, .32], [.27, .5], [.56, .68], [.9, .68], [.1, .32]];
  const ZH_FRAME_HOLD = 1500, WORK_HOLD = 3000;
  const L = (ax, ay, bx, by) => [ax, ay, bx, by];
  const ZH_LAYOUTS = [
    // side by side
    [L(.1, .32, .44, .32), L(.44, .32, .1, .68), L(.1, .68, .44, .68), L(.56, .32, .56, .68), L(.56, .5, .9, .5), L(.9, .32, .9, .68)],
    // stacked: Z over H
    [L(.3, .12, .7, .12), L(.7, .12, .3, .44), L(.3, .44, .7, .44), L(.3, .56, .3, .88), L(.3, .72, .7, .72), L(.7, .56, .7, .88)],
    // monogram: Z drawn through H
    [L(.22, .2, .22, .8), L(.78, .2, .78, .8), L(.22, .5, .78, .5), L(.32, .26, .68, .26), L(.68, .26, .32, .74), L(.32, .74, .68, .74)]
  ];
  function strokeFrame(side, lines, width) {
    const out = new Float32Array(side * side);
    for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
      const px = (x + .5) / side, py = (y + .5) / side;
      let v = 0;
      for (const [ax, ay, bx, by] of lines) {
        const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1e-9;
        const q = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
        v = Math.max(v, 1 - (Math.hypot(px - (ax + vx * q), py - (ay + vy * q)) - width / 2) / SOFT);
      }
      out[y * side + x] = v <= 0 ? 0 : Math.min(1, v);
    }
    return out;
  }
  // 11-11: the name frame is the full name set in type, WU / ZHEN / HUA stacked to fill the square.
  const NAME_LINES = ['WU', 'ZHEN', 'HUA'];
  const NAME_FONT = new URLSearchParams(location.search).get('font') || '"Futura", "Avenir Next", "Helvetica Neue", Arial, sans-serif';
  function textFrame(side) {
    const S = 12, n = side * S, c = document.createElement('canvas'); c.width = c.height = n;
    const g = c.getContext('2d'); g.fillStyle = '#000'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    const lineH = n * .3, top = (n - lineH * NAME_LINES.length) / 2;
    NAME_LINES.forEach((t, i) => {
      let size = lineH * 1.05; g.font = `800 ${size}px ${NAME_FONT}`;
      const w = g.measureText(t).width; if (w > n * .86) { size *= n * .86 / w; g.font = `800 ${size}px ${NAME_FONT}`; }
      const m = g.measureText(t), capH = m.actualBoundingBoxAscent;
      g.fillText(t, n / 2, top + lineH * i + (lineH + capH) / 2);
    });
    const d = g.getImageData(0, 0, n, n).data, out = new Float32Array(side * side);
    for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
      let a = 0; for (let yy = 0; yy < S; yy++) for (let xx = 0; xx < S; xx++) a += d[((y * S + yy) * n + x * S + xx) * 4 + 3];
      const v = a / (S * S * 255); out[y * side + x] = v < .25 ? 0 : Math.min(1, v * 1.2);
    }
    return out;
  }
  let nameFrames = new Set();
  let codeStart = 0, labFrame = null;
  const C_HOLD = 1300, C_OPEN = 1500, C_WORK = 3000, C_CLOSE = 1300, C_STEP = C_HOLD + C_OPEN + C_WORK + C_CLOSE;
  const B_W = .085;   // brace stroke width (share of the square)
  // a brace as a polyline: body at x=b, tip pointing by dir*tip (dir +1 = "}", -1 = "{"), arms back by dir*arm
  function bracePts(b, dir, top = .2, bot = .8, k = .1) {
    const arm = k * dir, tip = k * dir, mid = (top + bot) / 2, d = k * .6;
    return [[b - arm, top], [b, top + .04], [b, mid - d], [b + tip, mid], [b, mid + d], [b, bot - .04], [b - arm, bot]];
  }
  // closed states alternate: back-to-back "}{" (the Lab mark) and enclosing "{}"
  const CLOSED = [{l: .4, ld: 1, r: .6, rd: -1}, {l: .33, ld: -1, r: .67, rd: 1}];
  const OPEN = {l: .045, ld: -1, r: .955, rd: 1};
  // closed: compact and bolder; open: pushed to the edges, taller, thinner and smaller-tipped
  const SHAPE_CLOSED = {w: .066, top: .2, bot: .8, k: .1}, SHAPE_OPEN = {w: .024, top: .05, bot: .95, k: .055};
  const GAP = .045;   // clear space kept between the open braces and the work
  function lineV(px, py, pts, w) {
    let v = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i], vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1e-9;
      const q = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / l2));
      v = Math.max(v, 1 - (Math.hypot(px - (ax + vx * q), py - (ay + vy * q)) - w / 2) / SOFT);
    }
    return v;
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  function codeLevels(ms) {
    const side = Math.round(Math.sqrt(levels.length)), works = frames;
    if (!works.length) return;
    const t = ((ms % (C_STEP * works.length)) + C_STEP * works.length) % (C_STEP * works.length);
    const k = Math.floor(t / C_STEP), u = t - k * C_STEP, work = works[k];
    const closedA = CLOSED[k % 2], closedB = CLOSED[(k + 1) % 2];
    let L, Ld, R, Rd, scale, o = 0;
    if (u < C_HOLD) { L = closedA.l; Ld = closedA.ld; R = closedA.r; Rd = closedA.rd; scale = 0; }
    else if (u < C_HOLD + C_OPEN) {
      const e = inOutQuint((u - C_HOLD) / C_OPEN);
      L = lerp(closedA.l, OPEN.l, e); R = lerp(closedA.r, OPEN.r, e);
      Ld = lerp(closedA.ld, OPEN.ld, e); Rd = lerp(closedA.rd, OPEN.rd, e);   // passes through a straight bar when it flips
      scale = outBack(clamp01(((u - C_HOLD) / C_OPEN - .35) / .65)); o = e;
    } else if (u < C_HOLD + C_OPEN + C_WORK) { L = OPEN.l; Ld = OPEN.ld; R = OPEN.r; Rd = OPEN.rd; scale = 1; o = 1; }
    else {
      const p = (u - C_HOLD - C_OPEN - C_WORK) / C_CLOSE, e = inOutQuint(p);
      L = lerp(OPEN.l, closedB.l, e); R = lerp(OPEN.r, closedB.r, e);
      Ld = lerp(OPEN.ld, closedB.ld, e); Rd = lerp(OPEN.rd, closedB.rd, e);
      scale = 1 - inCubic(clamp01(p / .7)); o = 1 - e;
    }
    const sh = k2 => lerp(SHAPE_CLOSED[k2], SHAPE_OPEN[k2], o), bw = sh('w');
    // the back-to-back state is shown with the real Lab mark; drawn braces take over as they move
    let lab = 0;
    if (labFrame) {
      if (u < C_HOLD) lab = closedA.ld === 1 ? 1 : 0;
      else if (u < C_HOLD + C_OPEN) lab = closedA.ld === 1 ? 1 - clamp01((u - C_HOLD) / (C_OPEN * .25)) : 0;
      else if (u >= C_HOLD + C_OPEN + C_WORK) lab = closedB.ld === 1 ? clamp01(((u - C_HOLD - C_OPEN - C_WORK) / C_CLOSE - .75) / .25) : 0;
    }
    const lp = bracePts(L, Ld, sh('top'), sh('bot'), sh('k')), rp = bracePts(R, Rd, sh('top'), sh('bot'), sh('k')), inner = scale;
    for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
      const px = (x + .5) / side, py = (y + .5) / side;
      // crisp braces: holes are either open or shut, no grey half-open rim
      const lv = lineV(px, py, lp, bw), rv = lineV(px, py, rp, bw);
      let v = Math.max(lv, rv) > .45 ? 1 : 0;
      if (lab > 0) v = lab >= 1 ? labFrame[y * side + x] : Math.max(v * (1 - lab), labFrame[y * side + x] * lab);
      if (inner > .02) {
        // the work, scaled about the centre; kept clear of the braces so they never touch
        const wx = (px - .5) / inner + .5, wy = (py - .5) / inner + .5;
        const near = Math.max(lineV(px, py, lp, bw + 2 * GAP), lineV(px, py, rp, bw + 2 * GAP)) > .45;
        if (!near && wx >= 0 && wx < 1 && wy >= 0 && wy < 1) v = Math.max(v, work[Math.floor(wy * side) * side + Math.floor(wx * side)]);
      }
      levels[y * side + x] = v <= 0 ? 0 : Math.min(1, v);
    }
  }

  // 11-11 ?hero=think (test): one 8 s loop — empty braces -> a ZH of metaball "neurons" grows
  // between them -> the braces bend into two faces looking at it -> a signal runs face to face
  // through the ZH -> faces straighten, the links let go, back to the first frame.
  const TH = 8000, thinkStart = {t: 0};
  function resample(pts, n) {
    const d = [0];
    for (let i = 1; i < pts.length; i++) d.push(d[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const out = [], L = d[d.length - 1];
    for (let k = 0; k < n; k++) {
      const s = L * k / (n - 1); let i = 1; while (i < d.length - 1 && d[i] < s) i++;
      const q = (s - d[i - 1]) / ((d[i] - d[i - 1]) || 1);
      out.push([lerp(pts[i - 1][0], pts[i][0], q), lerp(pts[i - 1][1], pts[i][1], q)]);
    }
    return out;
  }
  // left face looking right (x offset from the brace body, y)
  const PROFILE = [[.0, .19], [.012, .27], [.02, .34], [.035, .4], [.11, .47], [.035, .515], [.075, .56], [.03, .595], [.065, .635], [.025, .69], [.005, .75], [-.015, .81]];
  const TB = .11, NP = 40, Y0 = .13, Y1 = .87;
  const braceL = resample(bracePts(TB, -1, Y0, Y1, .07), NP), faceL = resample(PROFILE.map(([x, y]) => [TB + x * 1.1, Y0 + (y - .19) / .62 * (Y1 - Y0)]), NP);
  const mirror = pts => pts.map(([x, y]) => [1 - x, y]);
  const braceR = mirror(braceL), faceR = mirror(faceL);
  // neurons on Z and H, and the links between them, in the order they light up
  const NODES = [[.31, .31, 1], [.46, .31, .75], [.385, .5, .7], [.31, .69, .75], [.46, .69, 1], [.55, .31, .85], [.55, .5, .7], [.55, .69, .85], [.69, .31, .75], [.69, .5, 1], [.69, .69, .85], [.62, .5, .55]];
  const LINKS = [[0, 1], [1, 2], [2, 3], [3, 4], [5, 6], [6, 7], [6, 11], [11, 9], [8, 9], [9, 10]];
  const NODE_R = .075, LINK_R = .028;
  // the signal's road: left face's nose -> through the Z -> across the H -> right face's nose
  const ROAD = resample([[.2, .47], [.31, .3], [.47, .3], [.39, .5], [.31, .7], [.47, .7], [.55, .7], [.55, .5], [.62, .5], [.69, .5], [.8, .47]], 60);
  const segD = (px, py, ax, ay, bx, by) => { const vx = bx - ax, vy = by - ay, l2 = vx * vx + vy * vy || 1e-9, q = clamp01(((px - ax) * vx + (py - ay) * vy) / l2); return Math.hypot(px - ax - vx * q, py - ay - vy * q); };
  function thinkLevels(ms) {
    const side = Math.round(Math.sqrt(levels.length)), t = ((ms % TH) + TH) % TH / 1000;
    const span = (a, b) => clamp01((t - a) / (b - a));
    // 0-1.2 braces; 1.2-3.2 grow; 3.2-4.4 to faces; 4.4-5.6 signal; 5.6-6.6 back to braces; 6.6-7.8 links let go
    const grow = inOutQuint(span(1.2, 3.2)) * (1 - inOutQuint(span(6.6, 7.8)));
    const face = inOutQuint(span(3.2, 4.4)) * (1 - inOutQuint(span(5.6, 6.6)));
    const sig = t > 4.4 && t < 5.6 ? span(4.4, 5.6) : -1;
    const lp = braceL.map((q, i) => [lerp(q[0], faceL[i][0], face), lerp(q[1], faceL[i][1], face)]);
    const rp = braceR.map((q, i) => [lerp(q[0], faceR[i][0], face), lerp(q[1], faceR[i][1], face)]);
    const bw = lerp(.055, .05, face);
    // each neuron swells in turn (overshoot = a little "pop"), each link stretches from its first end
    const nr = NODES.map((n, i) => { const a = i / NODES.length * .55; return NODE_R * n[2] * Math.max(0, outBack(clamp01((grow - a) / .35))) ; });
    const lk = LINKS.map((_, i) => clamp01((grow - .2 - i / LINKS.length * .5) / .3));
    let sx = -1, sy = -1;
    if (sig >= 0) { const q = ROAD[Math.min(ROAD.length - 1, Math.floor(inOutQuint(sig) * ROAD.length))]; sx = q[0]; sy = q[1]; }
    // a faint idle flicker of a few neurons while the braces are empty
    const idle = (1 - grow) * (.5 + .5 * Math.sin(t * 5));
    for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
      const px = (x + .5) / side, py = (y + .5) / side;
      let v = Math.max(lineV(px, py, lp, bw), lineV(px, py, rp, bw)) > .45 ? 1 : 0;
      // metaball field: neurons + links sum up, so they melt into each other where they meet
      let f = 0;
      for (let i = 0; i < NODES.length; i++) { const r = nr[i]; if (r <= 0) continue; const k = 1 - ((px - NODES[i][0]) ** 2 + (py - NODES[i][1]) ** 2) / (r * r); if (k > 0) f += k * k; }
      for (let i = 0; i < LINKS.length; i++) {
        const g = lk[i]; if (g <= 0) continue;
        const [a, b] = LINKS[i], ax = NODES[a][0], ay = NODES[a][1], bx = lerp(ax, NODES[b][0], g), by = lerp(ay, NODES[b][1], g);
        const k = 1 - segD(px, py, ax, ay, bx, by) ** 2 / (LINK_R * LINK_R); if (k > 0) f += .8 * k * k;
      }
      if (sx >= 0) { const k = 1 - ((px - sx) ** 2 + (py - sy) ** 2) / .0081; if (k > 0) f += 1.4 * k * k; }
      let m = clamp01((f - .18) / .22);
      if (idle > .02 && (x * 7 + y * 13) % 23 === 0 && px > .3 && px < .7 && py > .28 && py < .72) m = Math.max(m, .35 * idle);
      v = Math.max(v, m);
      levels[y * side + x] = v;
    }
  }
  const holdFor = i => nameFrames.has(i) ? ZH_FRAME_HOLD : (MIX ? WORK_HOLD : HOLD);

  const canvas = document.createElement('canvas');
  canvas.className = 'steel-matrix';
  canvas.setAttribute('aria-hidden', 'true');
  board.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const stats = window.__zhMatrix = {draws: 0, shown: -1};
  if (THINK) stats.think = ms => { thinkLevels(ms); const side = Math.round(Math.sqrt(levels.length)); let o = ''; for (let y = 0; y < side; y++) { for (let x = 0; x < side; x++) { const v = levels[y * side + x]; o += v > .7 ? '#' : v > .3 ? '+' : v > .05 ? '.' : ' '; } o += '\n'; } return o; };

  let images = [], layout = null, frames = [], levels = null, sprite = null, artSprite = null;
  let holeX = null, holeY = null, graphicAt = null, heat = null, glow = null;
  // 11-11 ZH: the original mouse trail lights picture holes close to the push field.
  const GLOW_REACH = 1.25, GLOW_IN = .28, GLOW_OUT = .08;
  // 11-24 demo: white-glow — two neutral layers for the hand, flashlight and flight.
  const ART_BRIGHT = .16; // White tint inside an artwork hole, at the same radius.
  const GLOW_MIN = .01, GLOW_HALO_SCALE = 2.4;
  const FLIGHT_GLOW_SHARE = .55, FLIGHT_GLOW_RADIUS = [.85, 2.6], FLIGHT_GLOW_STRENGTH = [.26, .74];
  let glowCore, glowHalo;
  function buildGlowSprite(radius, ratio, stops) {
    const size = Math.max(2, Math.ceil(radius * 2 * ratio)), c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d'), m = size / 2, gr = g.createRadialGradient(m, m, 0, m, m, m);
    for (const [point, alpha] of stops) gr.addColorStop(point, `rgba(255,255,255,${alpha})`);
    g.fillStyle = gr;
    g.fillRect(0, 0, size, size);
    return c;
  }
  function paintGlow(x, y, radius, brightness, haloRadius = radius * GLOW_HALO_SCALE) {
    const amount = clamp01(brightness);
    if (amount <= GLOW_MIN) return;
    const halo = clamp01((amount - .12) / .88);
    if (halo > 0) {
      ctx.globalAlpha = .56 * halo;
      ctx.drawImage(glowHalo, x - haloRadius, y - haloRadius, haloRadius * 2, haloRadius * 2);
    }
    const size = radius * (.73 + .27 * amount);
    ctx.globalAlpha = clamp01(amount * 1.16);
    ctx.drawImage(glowCore, x - size, y - size, size * 2, size * 2);
  }
  let fromIndex = -1, index = -1, timer = 0, raf = 0, startedAt = 0, fading = false, begun = false;
  let hiddenAt = null;
  let pointerOn = false, clientX = 0, clientY = 0, targetX = 0, targetY = 0, trailX = 0, trailY = 0, presence = 0;

  // 11-24 demo: flashlight — keep the light separate from the mouse's push field.
  const hoverPointer = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  const flashlight = {x: 0, y: 0, targetX: 0, targetY: 0, on: false, strength: 0, last: 0, touch: null};
  const roamPhases = Array.from({length: 4}, () => Math.random() * Math.PI * 2);
  const frameGrays = new WeakMap();
  let shownGray = null;

  // 11-24 demo: tap-continuous — distances in hole pitches, speeds in pitches/sec, times in ms.
  const TAP_TIME = 350, TAP_DISTANCE = 10, TAP_HIT_RADIUS = 2.5, TAP_AREA_PAD = 2;
  const TAP_GATHER_MS = 150, TAP_WAVE_MS = 320, TAP_WAVE_REACH = 4.5, TAP_WAVE_GLOW = .5, TAP_FLASH_MS = 90, TAP_WAVE_TAIL_MS = 46;
  const TAP_STEP = 1 / 240, TAP_SPREAD = 1.3, TAP_KICK_SPEED = 82;
  const TAP_PUSH_RADIUS = 9, TAP_PUSH_FORCE = 96, TAP_PUSH_SPEED = 85;
  const FLOAT_TOUCH_MS = 1500, FLOAT_MOUSE_MS = 2600, FLOAT_WIND = 4.6, FLOAT_TEMPO = 1.8, FLOAT_DAMPING = 6.5, FLOAT_RETURN = 1.15;
  const TAP_EDGE_RANGE = 3, TAP_EDGE_FORCE = 24;
  const TAP_ATTRACT_RAMP_MS = 480, TAP_ATTRACT_STAGGER_MS = 220, TAP_ATTRACT_RATE = 15;  // 11-24 ZH: gather faster, with acceleration
  const TAP_ARRIVAL_DISTANCE = .16, TAP_ARRIVAL_SPEED = .8, TAP_BURST_MS = 430 * SLOW;
  const LIT_HOLE = .08, FLIGHT_STAGGER = .19, GATHER = .3, FLY = .4;
  const BURST_START = GATHER + FLY, GATHER_END = FLIGHT_STAGGER + (1 - FLIGHT_STAGGER) * GATHER;
  let tapNext = null, press = null;
  let tapDots, tapCellAt;
  const tapWaves = [];
  let flightGroups = null, renderedFlightProgress = null;
  const flightLights = [];

  // One opened hole: dark inside, lighter toward the lower right, with a thin lit lip there.
  // On the light look the opened hole shows the wall, with the steel edge's shadow on its upper left.
  function buildSprite(radius, ratio, light, brightness = 0) {
    const size = Math.ceil(radius * 2 * ratio) + 2, c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d'), mid = size / 2, core = mid - 1;
    if (light) {
      g.fillStyle = '#e3e4e5'; g.beginPath(); g.arc(mid, mid, core, 0, Math.PI * 2); g.fill();
      g.save();
      g.beginPath(); g.arc(mid, mid, core, 0, Math.PI * 2); g.clip();
      g.shadowColor = 'rgba(20,20,19,.5)'; g.shadowBlur = core * .3; g.shadowOffsetX = core * .12; g.shadowOffsetY = core * .16;
      g.fillStyle = '#000';
      g.beginPath(); g.rect(-size, -size, size * 3, size * 3); g.arc(mid, mid, core, 0, Math.PI * 2, true); g.fill('evenodd');
      g.restore();
    } else {
      const inside = g.createLinearGradient(mid - core, mid - core, mid + core, mid + core);
      inside.addColorStop(0, '#090908');
      inside.addColorStop(1, '#2c2b28');
      g.fillStyle = inside; g.beginPath(); g.arc(mid, mid, core, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.34)'; g.lineWidth = Math.max(1, ratio * .8);
      g.beginPath(); g.arc(mid, mid, core - g.lineWidth / 2, -.2, Math.PI * .7); g.stroke();
    }
    if (brightness > 0) {
      g.globalCompositeOperation = 'source-atop';
      g.fillStyle = `rgba(255,255,255,${clamp01(brightness)})`;
      g.fillRect(0, 0, size, size);
    }
    return c;
  }

  // Samples one graphic down to one brightness value per hole.
  function sample(image, side, baseSide) {
    const c = document.createElement('canvas'); c.width = c.height = side;
    const g = c.getContext('2d', {willReadFrequently: true});
    g.fillStyle = '#fff'; g.fillRect(0, 0, side, side);
    g.imageSmoothingQuality = 'high';
    if (image.crop) {
      // photo: square crop, then auto levels so the lit installation opens the holes
      const [cx, cy, size, darkSubject] = image.crop, w = image.naturalWidth, h = image.naturalHeight, sw = size * Math.min(w, h);
      const sx = Math.max(0, Math.min(w - sw, cx * w - sw / 2)), sy = Math.max(0, Math.min(h - sw, cy * h - sw / 2));
      g.drawImage(image, sx, sy, sw, sw, 0, 0, side, side);
      const px = g.getImageData(0, 0, side, side).data, lum = new Float32Array(side * side);
      for (let i = 0; i < lum.length; i++) { const l = (.3 * px[i * 4] + .59 * px[i * 4 + 1] + .11 * px[i * 4 + 2]) / 255; lum[i] = darkSubject ? 1 - l : l; }
      const sorted = Float32Array.from(lum).sort(), lo = sorted[Math.floor(lum.length * .45)], hi = sorted[Math.floor(lum.length * .985)];
      const out = new Float32Array(side * side);
      for (let i = 0; i < out.length; i++) { const v = Math.pow(Math.max(0, Math.min(1, (lum[i] - lo) / Math.max(.05, hi - lo))), 1.15); out[i] = v < .08 ? 0 : v; }
      // 11-24 demo: flashlight — keep the gray values before the halftone threshold.
      frameGrays.set(out, lum);
      return out;
    }
    const work = image.src.split('/').pop().split('-')[0];
    const scale = workScale[work] ?? 1;
    // Both wide works can extend into the empty columns beside the central square.
    // Their normalized artwork occupies at most 86% of the source width.
    const size = .966 * Math.min(baseSide * scale, side / .86), inset = (side - size) / 2;
    g.drawImage(image, inset, inset, size, size);
    const data = g.getImageData(0, 0, side, side).data, out = new Float32Array(side * side);
    const gray = new Float32Array(out.length);
    for (let i = 0; i < out.length; i++) {
      const value = Math.min(1, (1 - data[i * 4] / 255) * 1.25);
      out[i] = value < .08 ? 0 : value;
      gray[i] = 1 - (.3 * data[i * 4] + .59 * data[i * 4 + 1] + .11 * data[i * 4 + 2]) / 255;
    }
    frameGrays.set(out, gray);
    return out;
  }

  function measure() {
    const M = window.__zhModules;
    if (!M || (!images.length && !ZH && !THINK)) return false;
    const p = M.heroPitch, hero = M.plates[0], bodyBottom = hero.outline[2][1], bodyRows = Math.round(bodyBottom / p);
    const width = board.getBoundingClientRect().width, tab = width - hero.outline[3][0], height = M.perforatedBottom;
    const baseSide = Math.max(8, Math.min(M.heroColumns - 2, bodyRows - 2));
    const side = HERO ? baseSide : Math.min(M.heroColumns - 2, Math.ceil(baseSide * 1.4));
    const left = Math.floor((M.heroColumns - side) / 2), top = Math.floor((bodyRows - side) / 2);
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.ceil(width * ratio); canvas.height = Math.ceil(height * ratio);
    canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
    const opened = p * .38;
    const light = document.documentElement.dataset.look === 'light';
    sprite = buildSprite(opened, ratio, light);
    artSprite = buildSprite(opened, ratio, light, ART_BRIGHT);
    const glowRadius = opened * .92;
    glowCore = buildGlowSprite(glowRadius, ratio, [[0, 1], [.23, .99], [.56, .55], [1, 0]]);
    glowHalo = buildGlowSprite(p * Math.max(FLIGHT_GLOW_RADIUS[1], .38 * GLOW_HALO_SCALE),
      ratio, [[0, .92], [.32, .55], [.68, .14], [1, 0]]);
    // 11-24 demo: flashlight — measure against the short edge of the hero plate.
    const shortSide = Math.min(width, height), rows = Math.round(height / p), columns = M.heroColumns;
    layout = {p, ratio, closed: p * .115, opened, glowRadius, reach: p * REACH, light, side, left, top, rows, columns,
      width, height, bodyBottom, tab, shortSide, flashlightRadius: shortSide * .15};

    dispX = new Float32Array(side * side); dispY = new Float32Array(side * side);
    velX = new Float32Array(side * side); velY = new Float32Array(side * side);
    jitter = new Float32Array(side * side).map((_, i) => (Math.abs(Math.sin(i * 91.17) * 43758.55) % 1) * 2 - 1);
    frames = (ZH || THINK) ? [] : images.map(image => sample(image, side, baseSide));
    let logoFrame = null;
    { const li = images.findIndex(im => /zh-logo-hero/.test(im.src)); if (li >= 0 && frames.length) { logoFrame = frames[li]; frames = frames.filter((_, i) => i !== li); } }
    if (CODE) { labFrame = frames.find((_, i) => /lab-mark/.test(images[i].src)) || null; frames = frames.filter((_, i) => !/lab-mark/.test(images[i].src)); }
    nameFrames = new Set();
    if (MIX && frames.length) {
      const works = frames; frames = [];
      const one = logoFrame || textFrame(side);
      // 11-14 ZH: the loop now opens on the ZH logo (it used to open on 张江); still two logos per loop.
      if (HERO) works.forEach((work, i) => {
        frames.push(work);   // experimental ?hero= modes keep a logo after every work, as before
        nameFrames.add(frames.length); frames.push(one);
      });
      else {
        const mid = Math.max(0, Math.floor(works.length / 2) - 1);
        nameFrames.add(0); frames.push(one);
        works.forEach((work, i) => {
          frames.push(work);
          if (i === mid) { nameFrames.add(frames.length); frames.push(one); }
        });
      }
    }
    levels = new Float32Array(side * side);

    // Every small hole on the plate, leaving out the large through-holes.
    const large = new Set((hero.vents || []).map(v => Math.floor(v.x / p) + ',' + Math.floor(v.y / p)));
    const xs = [], ys = [], links = [], tapLinks = [];
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const x = (col + .5) * p, y = (row + .5) * p;
      if (large.has(col + ',' + row) || (y > bodyBottom && (x < tab || x > width - tab))) continue;
      xs.push(x); ys.push(y);
      tapLinks.push(row * columns + col);
      links.push(col >= left && col < left + side && row >= top && row < top + side ? (row - top) * side + (col - left) : -1);
    }
    holeX = Float32Array.from(xs); holeY = Float32Array.from(ys); graphicAt = Int32Array.from(links);
    tapCellAt = Int32Array.from(tapLinks);
    tapDots = new Float32Array(rows * columns);
    heat = new Float32Array(xs.length);
    glow = new Float32Array(xs.length);
    return true;
  }

  // 11-11 (default, ?hand=0 turns it off): the mouse pushes the dots of the picture aside like a hand
  // through sand; when it leaves, they drift back and the picture closes up again.
  const HAND = new URLSearchParams(location.search).get('hand') !== '0';
  // gravity version (11-11, ZH: bigger range, should feel like gravity, not a mask sliding):
  // every dot has momentum, is pulled toward the pointer (1/r, felt across the whole picture),
  // swirls a little, and a spring brings it home. ?hand=push = the earlier push-aside version.
  const PUSH = new URLSearchParams(location.search).get('hand') === 'push';
  const G = 16, SOFT2 = 4, RANGE = 6, SPRING = .035, DAMP = .86, SWIRL = .45, MAXD = 12;
  const H_R = 8, H_PUSH = 4.6, H_IN = .3, H_OUT = .06;
  let dispX = null, dispY = null, velX = null, velY = null, jitter = null, shown = null;
  function handField(gray) {
    const {p, side, left, top} = layout, cx = trailX / p - .5 - left, cy = trailY / p - .5 - top;
    let moving = false;
    for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
      const k = y * side + x;
      if (PUSH) {
        const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy);
        let tx = 0, ty = 0;
        if (presence > .003 && r < H_R) {
          const f = (1 - r / H_R) ** 2 * H_PUSH * presence, ux = r > 1e-3 ? dx / r : 0, uy = r > 1e-3 ? dy / r : 0;
          tx = (ux - uy * jitter[k] * .55) * f; ty = (uy + ux * jitter[k] * .55) * f;
        }
        const rate = Math.abs(tx) + Math.abs(ty) > Math.abs(dispX[k]) + Math.abs(dispY[k]) ? H_IN : H_OUT;
        dispX[k] += (tx - dispX[k]) * rate; dispY[k] += (ty - dispY[k]) * rate;
      } else {
        const px = x + dispX[k], py = y + dispY[k], dx = cx - px, dy = cy - py, r2 = dx * dx + dy * dy + SOFT2, r = Math.sqrt(r2);
        let fx = -SPRING * dispX[k], fy = -SPRING * dispY[k];
        if (presence > .003 && r < RANGE) {
          // push (11-11, ZH: push instead of pull, gentler, nothing felt from far away)
          const g = G * presence * (.85 + .3 * jitter[k]) / r2 * r * (1 - r / RANGE) ** 2;
          fx -= dx / r * g * .1 + dy / r * g * .1 * SWIRL; fy -= dy / r * g * .1 - dx / r * g * .1 * SWIRL;
        }
        velX[k] = (velX[k] + fx) * DAMP; velY[k] = (velY[k] + fy) * DAMP;
        dispX[k] += velX[k]; dispY[k] += velY[k];
        const m = Math.hypot(dispX[k], dispY[k]); if (m > MAXD) { dispX[k] *= MAXD / m; dispY[k] *= MAXD / m; }
      }
      if (Math.abs(dispX[k]) + Math.abs(dispY[k]) + Math.abs(velX[k]) + Math.abs(velY[k]) > .03) moving = true;
      else { dispX[k] = 0; dispY[k] = 0; velX[k] = 0; velY[k] = 0; }
    }
    // draw the picture moved by the field: each hole shows what was pushed onto it
    if (!shown || shown.length !== levels.length) shown = new Float32Array(levels.length);
    shown.fill(0);
    // 11-24 demo: flashlight — use the same destination for the extra gray values.
    if (gray) {
      if (!shownGray || shownGray.length !== gray.length) shownGray = new Float32Array(gray.length);
      shownGray.fill(0);
    }
    for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
      const k = y * side + x, v = levels[k], detail = gray ? gray[k] : 0;
      if (v < .02 && detail <= 0) continue;
      const nx = Math.round(x + dispX[k]), ny = Math.round(y + dispY[k]);
      if (nx < 0 || ny < 0 || nx >= side || ny >= side) continue;
      const j = ny * side + nx;
      if (v >= .02 && v > shown[j]) shown[j] = v;
      if (gray && detail > shownGray[j]) shownGray[j] = detail;
    }
    stats.push = moving; let md = 0; for (let i = 0; i < dispX.length; i++) md = Math.max(md, Math.abs(dispX[i]) + Math.abs(dispY[i])); stats.maxd = +md.toFixed(2);
    return moving;
  }

  function pictureGray(now) {
    // 11-24 demo: flashlight — reveal the extra image detail at rest and ease it
    // out/in at the endpoints so the moving dots stay in charge during a transition.
    if (CODE || index < 0) return [];
    if (!fading) return [frameGrays.get(frames[index]), 1];
    const t = transitionProgress(now);
    if (t < .12 && fromIndex >= 0) return [frameGrays.get(frames[fromIndex]), smooth(1 - t / .12)];
    if (t > .88) return [frameGrays.get(frames[index]), smooth((t - .88) / .12)];
    return [];
  }

  function paint(now = performance.now()) {
    let [gray, grayMix] = flashlight.strength > 0 ? pictureGray(now) : [];
    const useHand = HAND && !tapNext;
    const pushed = useHand && handField(gray);
    if (useHand && gray) gray = shownGray;
    const pic = HAND ? shown : levels;
    const {ratio, p, side, left, top, closed, opened, glowRadius, reach, light, flashlightRadius} = layout;
    const reach2 = reach * reach;
    const {x: lampX, y: lampY, strength} = flashlight;
    const radius2 = flashlightRadius ** 2;
    let warm = false;
    for (let i = tapWaves.length - 1; i >= 0; i--) {
      const wave = tapWaves[i], age = now - wave.at;
      if (age >= TAP_WAVE_MS) tapWaves.splice(i, 1);
      else {
        wave.front = wave.reach * clamp01(age / TAP_WAVE_MS);
        wave.strength = 1 - smooth(clamp01((age / TAP_WAVE_MS - .76) / .24));
        wave.flash = (1 - clamp01(age / TAP_FLASH_MS)) ** 2;
      }
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < holeX.length; i++) {
      const x = holeX[i], y = holeY[i], dx = x - trailX, dy = y - trailY, d2 = dx * dx + dy * dy;
      // the pointer's own trail of opened holes stays on with the gravity, also over empty plate
      let h = heat[i] * TRAIL;
      if (presence > .003 && d2 < reach2) { const f = 1 - d2 / reach2; h = Math.max(h, f * f * presence); }
      if (h < .01) h = 0; else warm = true;
      heat[i] = h;
      const cell = graphicAt[i];
      const art = tapNext ? tapDots[tapCellAt[i]] : cell >= 0 ? pic[cell] : 0;
      let value = Math.max(art, h), lampGlow = 0;
      if (strength > 0) {
        const lampDistance2 = (x - lampX) ** 2 + (y - lampY) ** 2;
        if (lampDistance2 < radius2) {
          const weight = strength * smooth(clamp01((1 - Math.sqrt(lampDistance2 / radius2)) / .55));
          const detail = gray && cell >= 0 ? lerp(art, gray[cell], grayMix) : art;
          const signal = Math.max(art, detail);
          const lit = .04 + .96 * Math.pow(signal, .65);
          value = Math.max(h, lerp(art, lit, weight));
          lampGlow = weight * (.025 + .75 * signal);
        }
      }
      // glow: only picture holes, only near the ball; eases in fast and out slowly
      let gt = 0;
      if (art > .1 && presence > .003 && d2 < reach2 * GLOW_REACH * GLOW_REACH) { const f = 1 - d2 / (reach2 * GLOW_REACH * GLOW_REACH); gt = f * f * presence * Math.min(1, art * 1.3); }
      const gl = glow[i] + (gt - glow[i]) * (gt > glow[i] ? GLOW_IN : GLOW_OUT);
      glow[i] = gl < .01 && gt === 0 ? 0 : gl;
      if (glow[i] > 0) warm = true;
      let impactGlow = 0;
      for (const wave of tapWaves) {
        const distance = wave.distances[i], behind = wave.front - distance;
        const ring = behind < 0 ? clamp01(1 + behind / p) : clamp01(1 - behind / wave.tail);
        const flash = wave.flash * clamp01(1 - distance / (p * 1.5));
        impactGlow = Math.max(impactGlow, TAP_WAVE_GLOW * wave.strength * ring ** 2, flash);
      }
      value = Math.max(value, .42 * impactGlow);
      if (value >= .02) {
        const radius = closed + (opened - closed) * Math.pow(value, .8);
        // A dark closed hole fades into the wall colour as it starts to open.
        ctx.globalAlpha = light ? Math.min(1, value * 4) : 1;
        ctx.drawImage(art >= .02 ? artSprite : sprite, x - radius, y - radius, radius * 2, radius * 2);
        paintGlow(x, y, glowRadius, Math.max(glow[i], lampGlow, impactGlow));
      }
    }
    for (const {x, y, lightRadius, lightStrength} of flightLights) {
      const col = Math.round(x), row = Math.round(y);
      const cell = col >= 0 && col < side && row >= 0 && row < side ? row * side + col : -1;
      const dx = useHand && cell >= 0 ? dispX[cell] : 0, dy = useHand && cell >= 0 ? dispY[cell] : 0;
      paintGlow((left + x + dx + .5) * p, (top + y + dy + .5) * p,
        glowRadius, lightStrength, lightRadius * p);
    }
    for (const wave of tapWaves) paintGlow(wave.x, wave.y, glowRadius * 1.18, wave.flash);
    ctx.globalAlpha = 1;
    stats.draws++;
    return warm || pushed || tapWaves.length > 0;
  }


  // Split the lit holes along the longest axis, keeping each travelling group local.
  function splitGroups(cells, count, side) {
    const groups = [];
    function split(points, parts) {
      let minX = side, minY = side, maxX = 0, maxY = 0, sumX = 0, sumY = 0, peak = 0;
      for (const {x, y, v} of points) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        sumX += x; sumY += y;
        peak = Math.max(peak, v);
      }
      if (parts === 1) {
        groups.push({cells: points, x: points.length ? sumX / points.length : side / 2,
          y: points.length ? sumY / points.length : side / 2, peak});
        return;
      }
      const axis = maxX - minX >= maxY - minY ? 'x' : 'y';
      points.sort((a, b) => a[axis] - b[axis]);
      const left = Math.floor(parts / 2);
      const share = parts <= 4 ? .25 : left / parts;
      const cut = Math.max(left, Math.min(points.length - (parts - left), Math.round(points.length * share)));
      split(points.slice(0, cut), left);
      split(points.slice(cut), parts - left);
    }
    split(cells, count);
    return groups.sort((a, b) => Math.atan2(a.y - side / 2, a.x - side / 2)
      - Math.atan2(b.y - side / 2, b.x - side / 2));
  }

  function prepareFlight(source, target) {
    const side = Math.sqrt(source.length);
    function litCells(frame) {
      const cells = [];
      frame.forEach((v, i) => {
        if (v >= LIT_HOLE) cells.push({x: i % side, y: Math.floor(i / side), v});
      });
      return cells;
    }
    const a = litCells(source), b = litCells(target);
    const count = Math.max(1, Math.min(30, a.length || 1, b.length || 1,
      Math.max(6, Math.round(Math.max(a.length, b.length) / 78))));
    const sourceGroups = splitGroups(a, count, side), targetGroups = splitGroups(b, count, side);
    let glowsLeft = count === 1 ? Number(Math.random() < FLIGHT_GLOW_SHARE)
      : Math.max(1, Math.min(count - 1, Math.round(count * FLIGHT_GLOW_SHARE)));
    return sourceGroups.map((start, i) => {
      // 11-24 demo: white-glow — choose each group's size and strength once per transition.
      const phase = (i * .618034) % 1;
      const end = targetGroups[i];
      const dx = end.x - start.x, dy = end.y - start.y, dist = Math.hypot(dx, dy) || 1;
      const bend = (i % 2 ? 1 : -1) * (.25 * dist + side * .08);
      const hasGlow = start.cells.length > 0 && Math.random() < glowsLeft / (count - i);
      if (hasGlow) glowsLeft--;
      return {
        start, end, phase,
        radius: .6 + 2.6 * phase ** 1.7,
        midX: (start.x + end.x) / 2 - dy / dist * bend,
        midY: (start.y + end.y) / 2 + dx / dist * bend,
        glowRadius: hasGlow ? lerp(...FLIGHT_GLOW_RADIUS, Math.random()) : 0,
        glowStrength: hasGlow ? lerp(...FLIGHT_GLOW_STRENGTH, Math.random()) : 0
      };
    });
  }

  const smooth = v => v * v * (3 - 2 * v);
  const back = v => { const c = 1.5; return 1 + (c + 1) * Math.pow(v - 1, 3) + c * Math.pow(v - 1, 2); };

  function splat(x, y, v, r) {
    const {side} = layout;
    const x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(side - 1, Math.ceil(x + r));
    const y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(side - 1, Math.ceil(y + r));
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const d = Math.hypot(xx - x, yy - y), a = r <= .5 ? (d < .75 ? 1 : 0) : clamp01(r + .5 - d);
      const k = yy * side + xx; if (a * v > levels[k]) levels[k] = a * v;
    }
  }

  function splatTap(x, y, v, r) {
    const {left, top, columns, rows} = layout;
    x += left; y += top;
    const extent = Math.max(1, r + .5), radial = smooth(clamp01((r - .5) * 2));
    const x0 = Math.max(0, Math.ceil(x - extent)), x1 = Math.min(columns - 1, Math.floor(x + extent));
    const y0 = Math.max(0, Math.ceil(y - extent)), y1 = Math.min(rows - 1, Math.floor(y + extent));
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
      const dx = Math.abs(xx - x), dy = Math.abs(yy - y);
      const bilinear = clamp01(1 - dx) * clamp01(1 - dy);
      const coverage = radial > 0 ? lerp(bilinear, clamp01(r + .5 - Math.hypot(dx, dy)), radial) : bilinear;
      const cell = yy * columns + xx;
      tapDots[cell] = Math.max(tapDots[cell], v * coverage);
    }
  }

  function groupFlightProgress(t, phase) {
    return clamp01((t - FLIGHT_STAGGER * phase) / (1 - FLIGHT_STAGGER));
  }

  function splatGroup(shape, x, y, spread, radius, paintDot = splat) {
    for (const cell of shape.cells) {
      paintDot(x + (cell.x - shape.x) * spread, y + (cell.y - shape.y) * spread, cell.v, radius);
    }
  }

  function drawBurst(group, burst, paintDot) {
    splatGroup(group.end, group.x, group.y, back(burst), lerp(group.radius, .5, burst), paintDot);
  }

  function lightGroup(group, strength, radius = group.glowRadius) {
    group.lightStrength = strength;
    group.lightRadius = radius;
    if (strength > GLOW_MIN) flightLights.push(group);
  }

  function flightValue(group, travel, startValue) {
    const lift = lerp(startValue, 1, smooth(clamp01(travel * 4)));
    return lerp(lift, group.end.peak, smooth(clamp01((travel - .75) * 4)));
  }

  function drawFlightGroup(group, u) {
    const {start, end, radius, midX, midY, glowStrength} = group;
    const gather = smooth(clamp01(u / GATHER));
    const burst = clamp01((u - BURST_START) / (1 - BURST_START));
    group.progress = u;
    if (u < GATHER) {
      group.x = start.x;
      group.y = start.y;
      splatGroup(start, group.x, group.y, 1 - gather, lerp(.5, radius, gather));
    } else if (u < BURST_START) {
      const travel = (u - GATHER) / FLY, fly = inOutQuint(travel), q = 1 - fly;
      group.x = q ** 2 * start.x + 2 * q * fly * midX + fly ** 2 * end.x;
      group.y = q ** 2 * start.y + 2 * q * fly * midY + fly ** 2 * end.y;
      splat(group.x, group.y, flightValue(group, travel, start.peak), radius);
    } else {
      group.x = end.x;
      group.y = end.y;
      drawBurst(group, burst);
    }
    lightGroup(group, glowStrength * smooth(clamp01((gather - .45) / .55)) * (1 - smooth(burst)));
  }

  function flight(groups, t) {
    levels.fill(0);
    flightLights.length = 0;
    for (const group of groups) {
      drawFlightGroup(group, groupFlightProgress(t, group.phase));
    }
  }

  function startTapWave(x, y, now) {
    // 11-24 ZH: the big ring was too much; keep only a small highlight around the tap.
    const reach = layout.p * TAP_WAVE_REACH;
    const distances = holeX.map((hx, i) => Math.hypot(hx - x, holeY[i] - y));
    if (tapWaves.length >= 3) tapWaves.shift();
    tapWaves.push({x, y, distances, at: now, reach, tail: Math.max(layout.p, reach * TAP_WAVE_TAIL_MS / TAP_WAVE_MS)});
  }

  function clampGroup(group) {
    const {minX, maxX, minY, maxY} = group;
    if (group.x < minX || group.x > maxX) {
      group.x = Math.max(minX, Math.min(maxX, group.x));
      group.vx = 0;
    }
    if (group.y < minY || group.y > maxY) {
      group.y = Math.max(minY, Math.min(maxY, group.y));
      group.vy = 0;
    }
  }

  function prepareTapGroups(groups) {
    const {p, width, bodyBottom, left, top} = layout;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let firstX = Infinity, firstY = Infinity, lastX = -Infinity, lastY = -Infinity;
    for (const {start} of groups) {
      firstX = Math.min(firstX, start.x); lastX = Math.max(lastX, start.x);
      firstY = Math.min(firstY, start.y); lastY = Math.max(lastY, start.y);
      for (const {x, y} of start.cells) {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      }
    }
    if (minX === Infinity) {
      minX = firstX; maxX = lastX;
      minY = firstY; maxY = lastY;
    }
    const centerX = (minX + maxX) / 2, centerY = (minY + maxY) / 2;
    const halfX = (maxX - minX + 1) * TAP_SPREAD / 2, halfY = (maxY - minY + 1) * TAP_SPREAD / 2;
    for (const group of groups) {
      const {start, end, radius, progress = 0} = group;
      const burst = clamp01((progress - BURST_START) / (1 - BURST_START));
      const gather = smooth(clamp01(progress / GATHER));
      group.tapShape = burst > 0 ? end : start;
      group.tapSpread = burst > 0 ? back(burst) : 1 - gather;
      group.tapRadius = burst > 0 ? lerp(radius, .5, burst) : lerp(.5, radius, gather);
      group.tapValue = burst > 0 ? end.peak : flightValue(group, clamp01((progress - GATHER) / FLY), start.peak);
      group.tapGlow = group.lightStrength || 0;
      group.hoverGlow = 0;
      group.x ??= start.x;
      group.y ??= start.y;
      group.vx = group.vy = 0;
      group.attraction = 0;
      if (progress > GATHER && progress < BURST_START) {
        // A tap can take over a group already moving along the carousel's arc.
        const travel = (progress - GATHER) / FLY, fly = inOutQuint(travel);
        const travelSeconds = (1 - FLIGHT_STAGGER) * FLY * FADE / 1000;
        const speed = 80 * Math.min(travel, 1 - travel) ** 4 / travelSeconds;
        group.vx = 2 * speed * lerp(group.midX - start.x, end.x - group.midX, fly);
        group.vy = 2 * speed * lerp(group.midY - start.y, end.y - group.midY, fly);
      }
      const nx = lastX > firstX ? 2 * (start.x - firstX) / (lastX - firstX) - 1 : 0;
      const ny = lastY > firstY ? 2 * (start.y - firstY) / (lastY - firstY) - 1 : 0;
      const margin = Math.max(radius + .5, group.glowRadius, 1.65);
      group.minX = Math.min(group.x, end.x, margin - left - .5);
      group.maxX = Math.max(group.x, end.x, width / p - left - .5 - margin);
      group.minY = Math.min(group.y, end.y, margin - top - .5);
      group.maxY = Math.max(group.y, end.y, bodyBottom / p - top - .5 - margin);
      group.restX = Math.max(group.minX, Math.min(group.maxX, centerX + nx * Math.max(0, halfX - radius)));
      group.restY = Math.max(group.minY, Math.min(group.maxY, centerY + ny * Math.max(0, halfY - radius)));
      group.mass = lerp(1, 1.8, (radius - .6) / 2.6);
    }
  }

  function kickTapGroups(x, y) {
    const {p, left, top} = layout, {area} = tapNext;
    const cx = x / p - left - .5, cy = y / p - top - .5;
    const reach = Math.max(1, Math.hypot(area.right - area.left, area.bottom - area.top) / p * .4);
    for (const group of flightGroups) {
      const dx = group.x - cx, dy = group.y - cy, distance = Math.hypot(dx, dy);
      const direction = (distance > .1 ? Math.atan2(dy, dx) : group.phase * 2 * Math.PI) + (Math.random() - .5) * .44;
      const speed = TAP_KICK_SPEED * lerp(1, .22, clamp01(distance / reach)) / group.mass;
      group.vx += Math.cos(direction) * speed;
      group.vy += Math.sin(direction) * speed;
    }
  }

  function tapEdgeForce(position, min, max) {
    return TAP_EDGE_FORCE * (Math.max(0, min + TAP_EDGE_RANGE - position)
      - Math.max(0, position - max + TAP_EDGE_RANGE));
  }

  function stepTapGroups(tap, now) {
    const {p, left, top} = layout;
    const time = (now - tap.at) / 1000 * FLOAT_TEMPO;  // 11-24 ZH: livelier floating
    const cx = tap.pointerX / p - left - .5, cy = tap.pointerY / p - top - .5;
    const speed = clamp01(tap.pointerSpeed * Math.exp(-Math.max(0, now - tap.pointerAt) / 115) / TAP_PUSH_SPEED);
    const mouse = tap.touch ? 0 : 1 - smooth(clamp01((now - (tap.leftAt ?? now)) / 115));
    for (const group of flightGroups) {
      const {x, y, end} = group;
      const age = now - tap.aggregateAt - TAP_ATTRACT_STAGGER_MS * group.phase;
      const ramp = clamp01(age / TAP_ATTRACT_RAMP_MS), attraction = ramp * ramp * ramp;  // ease-in: starts gently, then pulls hard
      const air = 1 - attraction;
      const stiffness = TAP_ATTRACT_RATE ** 2 * attraction;
      const damping = lerp(FLOAT_DAMPING, 2 * Math.sqrt(stiffness), attraction);
      // Nearby groups share the same slowly changing wind field.
      const windX = FLOAT_WIND * (.55 * Math.sin(y * .23 + time * .9) + .45 * Math.sin(y * .07 - time * .37 + 1.3));
      const windY = FLOAT_WIND * (.55 * Math.cos(x * .21 - time * .8) + .45 * Math.sin(x * .09 + time * .41));
      let forceX = windX * FLOAT_DAMPING + FLOAT_RETURN * (group.restX - x) + tapEdgeForce(x, group.minX, group.maxX);
      let forceY = windY * FLOAT_DAMPING + FLOAT_RETURN * (group.restY - y) + tapEdgeForce(y, group.minY, group.maxY);
      let proximity = 0;
      if (mouse > 0 && air > 0) {
        const dx = x - cx, dy = y - cy, distance = Math.hypot(dx, dy);
        proximity = clamp01(1 - distance / TAP_PUSH_RADIUS) * mouse;
        const push = proximity ** 2 * TAP_PUSH_FORCE * lerp(.32, 1, speed) / group.mass;
        const scale = push / Math.max(distance, .5);
        forceX += dx * scale;
        forceY += dy * scale;
      }

      // Semi-implicit integration carries the same velocity into the attraction and the burst.
      group.vx += (air * forceX + stiffness * (end.x - x) - damping * group.vx) * TAP_STEP;
      group.vy += (air * forceY + stiffness * (end.y - y) - damping * group.vy) * TAP_STEP;
      group.x += group.vx * TAP_STEP;
      group.y += group.vy * TAP_STEP;
      clampGroup(group);
      group.attraction = attraction;
      group.hoverGlow = lerp(group.hoverGlow, air * proximity, 1 - Math.exp(-TAP_STEP * 18));
      if (group.burstAt === undefined && attraction === 1
        && Math.hypot(end.x - group.x, end.y - group.y) < TAP_ARRIVAL_DISTANCE
        && Math.hypot(group.vx, group.vy) < TAP_ARRIVAL_SPEED) {
        group.burstAt = now;
      }
    }
  }

  function advanceTapPhysics(tap, now) {
    const stepMs = TAP_STEP * 1000;
    while (now - tap.lastStep >= stepMs) {
      tap.lastStep += stepMs;
      stepTapGroups(tap, tap.lastStep);
    }
  }

  function tapFlight(now) {
    const tap = tapNext;
    advanceTapPhysics(tap, now);
    tapDots.fill(0);
    flightLights.length = 0;
    const gather = smooth(clamp01((now - tap.at) / TAP_GATHER_MS));
    tap.burstProgress = 1;
    for (const group of flightGroups) {
      const burst = group.burstAt === undefined ? 0 : clamp01((now - group.burstAt) / TAP_BURST_MS);
      tap.burstProgress = Math.min(tap.burstProgress, burst);
      if (group.burstAt !== undefined) {
        drawBurst(group, burst, splatTap);
      } else if (gather < 1 && group.tapSpread > 0) {
        splatGroup(group.tapShape, group.x, group.y, group.tapSpread * (1 - gather),
          lerp(group.tapRadius, group.radius, gather), splatTap);
      } else {
        splatTap(group.x, group.y, lerp(group.tapValue, group.end.peak, group.attraction), group.radius);
      }
      const glow = lerp(group.tapGlow, group.glowStrength, gather) + .5 * group.hoverGlow;
      lightGroup(group, clamp01(glow) * (1 - smooth(burst)), Math.max(group.glowRadius, 1.65 * group.hoverGlow));
    }
    return tap.burstProgress >= 1;
  }

  function rippleOrigin() {
    const offset = nameFrames.has(fromIndex) ? 0 : 1;
    return ORIGINS[(Math.floor(Math.max(index, fromIndex) / 2) + offset) % ORIGINS.length];
  }
  // name -> work: a ring opens from one point of the letters and the work fills in behind it.
  // work -> name: the ring closes back into the next point and the letters return outside it.
  function ripple(a, b, t, outward, [ox, oy]) {
    stats.ripples = (stats.ripples || 0) + 1;
    const side = Math.round(Math.sqrt(levels.length)), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const R = (outward ? e : 1 - e) * 1.45, ring = .05;
    const inner = outward ? b : a, outer = outward ? a : b;
    for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
      const k = y * side + x, d = Math.hypot((x + .5) / side - ox, (y + .5) / side - oy);
      let v = d < R ? inner[k] : outer[k] * (outward ? 1 - .55 * e : .45 + .55 * e);
      const f = 1 - Math.abs(d - R) / ring;
      if (f > 0 && R > .01) v = Math.max(v, f * (1 - Math.abs(2 * e - 1) * .6));
      levels[k] = v;
    }
    // Keep the original ripple mode’s focal group of opened holes.
    const px = ox * side - .5, py = oy * side - .5, r = 1.6 * (1 - Math.abs(2 * e - 1));
    if (r > .3) splat(px, py, 1, r);
  }
  // 11-24 demo: flashlight — follow a pointer or roam along smooth, randomly phased waves.
  function stepFlashlight(now) {
    const roaming = !hoverPointer.matches && !flashlight.touch && !flashlight.on;
    let {targetX: x, targetY: y} = flashlight;
    if (roaming) {
      const t = now / 1000, [a, b, c, d] = roamPhases;
      const {width, bodyBottom, shortSide} = layout;
      x = width / 2 + shortSide * (.28 * Math.sin(t * .29 + a) + .12 * Math.sin(t * .51 + b));
      y = bodyBottom / 2 + shortSide * (.24 * Math.sin(t * .24 + c) + .10 * Math.sin(t * .43 + d));
    }
    const wanted = flashlight.on || roaming ? 1 : 0;
    const dt = Math.min(40, flashlight.last ? now - flashlight.last : 1000 / 60);
    flashlight.last = now;
    if (wanted && flashlight.strength === 0) {
      flashlight.x = x;
      flashlight.y = y;
    }
    if (wanted) {
      const follow = 1 - Math.exp(-dt / 95);
      flashlight.x = lerp(flashlight.x, x, follow);
      flashlight.y = lerp(flashlight.y, y, follow);
    }
    const fade = 1 - Math.exp(-dt / (wanted ? 85 : 210));
    flashlight.strength = lerp(flashlight.strength, wanted, fade);
    if (Math.abs(wanted - flashlight.strength) < .004) flashlight.strength = wanted;
    if (wanted && Math.hypot(x - flashlight.x, y - flashlight.y) < .3) {
      flashlight.x = x;
      flashlight.y = y;
    }
    return roaming || flashlight.strength !== wanted || (wanted && (flashlight.x !== x || flashlight.y !== y));
  }

  function transitionProgress(now) {
    if (!tapNext) return clamp01((now - startedAt) / FADE);
    if (now < tapNext.at + TAP_GATHER_MS) return GATHER_END * clamp01((now - tapNext.at) / TAP_GATHER_MS);
    return lerp(GATHER_END, 1, tapNext.burstProgress);
  }

  function step(now) {
    raf = 0;
    let busy = false;
    if (ZH) { zhLevels(now - zhStart); busy = true; }
    if (CODE) { codeLevels(now - codeStart); busy = true; }
    if (THINK) { thinkLevels(now - thinkStart.t); busy = true; }
    if (fading) {
      busy = true;
      const target = frames[index], t = transitionProgress(now);
      if (tapNext ? tapFlight(now) : t >= 1) {
        levels.set(target);
        flightLights.length = 0;
        flightGroups = tapNext = null;
        fading = false;
        schedule(holdFor(index));
      } else if (!tapNext) {
        if (renderedFlightProgress === null) {
          ripple(frames[fromIndex], target, t, nameFrames.has(fromIndex), rippleOrigin());
        } else {
          flightGroups ??= prepareFlight(frames[fromIndex], target);
          flight(flightGroups, t);
          renderedFlightProgress = t;
        }
      }
    }
    const wanted = pointerOn ? 1 : 0;
    presence += (wanted - presence) * .16;
    if (Math.abs(wanted - presence) < .004) presence = wanted;
    trailX += (targetX - trailX) * FOLLOW;
    trailY += (targetY - trailY) * FOLLOW;
    const moving = pointerOn && Math.hypot(targetX - trailX, targetY - trailY) > .3;
    const lighting = stepFlashlight(now);
    const paintMoving = paint(now);
    if (busy || moving || presence !== wanted || lighting || paintMoving) raf = requestAnimationFrame(step);
  }
  function kick() { if (!raf && layout && !document.hidden && !reduced.matches) raf = requestAnimationFrame(step); }

  function advance() {
    timer = 0;
    if (document.hidden || !layout || fading || reduced.matches) return;
    startTransition();
  }
  function startTransition() {
    clearTimeout(timer);
    timer = 0;
    fromIndex = index;
    index = (index + 1) % frames.length;
    stats.shown = index;
    startedAt = performance.now();
    flightGroups = null;
    renderedFlightProgress = RIPPLE && (nameFrames.has(fromIndex) || nameFrames.has(index)) ? null : 0;
    fading = true;
    kick();
  }
  function schedule(delay) { clearTimeout(timer); timer = setTimeout(advance, delay); }
  function halt() {
    clearTimeout(timer);
    timer = 0;
    cancelAnimationFrame(raf);
    raf = 0;
  }
  function resume() {
    if (!begun || reduced.matches) return;
    if (hiddenAt !== null && fading) {
      const pause = performance.now() - hiddenAt;
      startedAt += pause;
      if (tapNext) {
        tapNext.at += pause;
        tapNext.aggregateAt += pause;
        tapNext.lastStep += pause;
        tapNext.pointerAt += pause;
        if (tapNext.leftAt !== undefined) tapNext.leftAt += pause;
        for (const group of flightGroups) {
          if (group.burstAt !== undefined) group.burstAt += pause;
        }
      }
    }
    hiddenAt = null;
    if (!ZH && !CODE && !THINK && !timer && !fading) schedule(600);
    kick();
  }

  function refresh() {
    halt();
    fading = false;
    tapNext = press = flightGroups = null;
    flightLights.length = 0;
    tapWaves.length = 0;
    hiddenAt = null;
    if (!measure()) return;
    if (reduced.matches) {
      pointerOn = false;
      presence = 0;
      flashlight.strength = 0;
    }
    if (ZH) {
      begun = true;
      if (!zhStart) zhStart = performance.now();
      if (reduced.matches) { zhLevels(0); paint(); return; }
      kick(); return;
    }
    if (THINK) {
      begun = true;
      if (!thinkStart.t) thinkStart.t = performance.now();
      if (reduced.matches) { thinkLevels(2600); paint(); return; }
      kick(); return;
    }
    if (CODE) {
      begun = true;
      if (!codeStart) codeStart = performance.now() - C_HOLD * .5;
      if (reduced.matches) { codeLevels(C_HOLD + C_OPEN + 10); paint(); return; }
      kick(); return;
    }
    if (index < 0) index = 0;
    stats.shown = index;
    begun = true;
    levels.set(frames[index]); paint();
    if (reduced.matches) return;
    schedule(holdFor(index));
    kick();
  }

  // 11-24 demo: flashlight — share the canvas coordinates, including the stepped plate edge.
  function onPlate(x, y) {
    const {width, height, bodyBottom, tab} = layout;
    return x >= 0 && x <= width && y >= 0 && y <= height
      && (y <= bodyBottom || (x >= tab && x <= width - tab));
  }

  function aimFlashlight(x, y) {
    const inside = onPlate(x, y);
    if (inside) {
      flashlight.targetX = x;
      flashlight.targetY = y;
    }
    if (inside || flashlight.on) kick();
    flashlight.on = inside;
    return inside;
  }

  function aim() {
    const r = canvas.getBoundingClientRect(), x = clientX - r.left, y = clientY - r.top;
    const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
    targetX = x; targetY = y;
    if (inside && !pointerOn && presence < .01) { trailX = x; trailY = y; }
    if (inside !== pointerOn || inside) { pointerOn = inside; kick(); }
    if (!flashlight.touch) aimFlashlight(x, y);
    checkFloatBounds(x, y);
  }
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || reduced.matches || !layout) return;
    clientX = e.clientX; clientY = e.clientY;
    aim();
  }, {passive: true});
  addEventListener('scroll', () => {
    if (press?.touch) press = null;
    if (pointerOn || tapNext?.bounds) aim();
    if (flashlight.touch) aimTouch(flashlight.touch);
  }, {passive: true});
  function leavePage() {
    pointerOn = false;
    press = null;
    if (!flashlight.touch) flashlight.on = false;
    if (tapNext?.bounds) leaveTapArea(tapNext, performance.now());
    kick();
  }
  document.documentElement.addEventListener('pointerleave', e => {
    if (e.pointerType === 'mouse') leavePage();
  });
  addEventListener('blur', leavePage);
  // 11-24 demo: flashlight — passive touch events keep tracking during native scrolling.
  function aimTouch(touch) {
    const r = canvas.getBoundingClientRect();
    return aimFlashlight(touch.clientX - r.left, touch.clientY - r.top);
  }
  addEventListener('touchstart', e => {
    if (flashlight.touch || reduced.matches || !layout) return;
    const touch = e.changedTouches[0];
    if (aimTouch(touch)) flashlight.touch = touch;
  }, {passive: true});
  addEventListener('touchmove', e => {
    if (!flashlight.touch) return;
    const touch = Array.from(e.changedTouches).find(t => t.identifier === flashlight.touch.identifier);
    if (touch) {
      flashlight.touch = touch;
      aimTouch(touch);
    }
  }, {passive: true});
  function releaseFlashlight(e) {
    if (!flashlight.touch || Array.from(e.touches).some(t => t.identifier === flashlight.touch.identifier)) return;
    flashlight.touch = null;
    flashlight.on = false;
    kick();
  }
  addEventListener('touchend', releaseFlashlight, {passive: true});
  addEventListener('touchcancel', releaseFlashlight, {passive: true});
  hoverPointer.addEventListener('change', () => { if (!reduced.matches) kick(); });

  // Hit-test artwork holes, excluding flashlight and hand trails.
  function tappedBounds(x, y) {
    const pic = levels, hitRadius = TAP_HIT_RADIUS * layout.p;  // unpushed picture: the hand pushes holes away from the cursor
    let hit = false, left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (let i = 0; i < graphicAt.length; i++) {
      const cell = graphicAt[i];
      if (cell < 0 || pic[cell] < LIT_HOLE) continue;
      const hx = holeX[i], hy = holeY[i];
      if (!hit && Math.hypot(x - hx, y - hy) <= hitRadius) hit = true;
      left = Math.min(left, hx); right = Math.max(right, hx);
      top = Math.min(top, hy); bottom = Math.max(bottom, hy);
    }
    if (!hit) return null;
    const pad = TAP_AREA_PAD * layout.p;
    return {left: left - pad, right: right + pad, top: top - pad, bottom: bottom + pad};
  }

  function inTapBounds(x, y, bounds) {
    return x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom && onPlate(x, y);
  }

  function leaveTapArea(tap, now) {
    tap.bounds = null;
    tap.leftAt = now;
    tap.aggregateAt = Math.min(tap.aggregateAt, now);
  }

  function checkFloatBounds(x, y) {
    const tap = tapNext;
    if (!tap?.bounds) return;
    const now = performance.now();
    if (!inTapBounds(x, y, tap.bounds)) {
      leaveTapArea(tap, now);
      return;
    }
    const distance = Math.hypot(x - tap.pointerX, y - tap.pointerY);
    if (!distance) return;
    const elapsed = now - tap.pointerAt;
    const speed = Math.min(TAP_PUSH_SPEED * 2, distance / layout.p * 1000 / Math.max(8, elapsed));
    tap.pointerSpeed = lerp(tap.pointerSpeed * Math.exp(-elapsed / 115), speed, .65);
    tap.pointerX = x;
    tap.pointerY = y;
    tap.pointerAt = now;
  }

  function tapTarget(x, y, touch, now) {
    if (tapNext) {
      const bounds = touch ? tapNext.area : tapNext.bounds;
      return touch === tapNext.touch && now < tapNext.aggregateAt
        && bounds && inTapBounds(x, y, bounds) ? bounds : null;
    }
    if (fading && renderedFlightProgress === null) return null;
    if (fading && flightGroups
      && flightGroups.filter(group => group.progress > BURST_START).length > flightGroups.length / 2) return null;
    return tappedBounds(x, y);
  }

  function tapArtwork(x, y, touch, previewed) {
    const now = performance.now(), bounds = tapTarget(x, y, touch, now);
    if (!bounds) return;
    if (reduced.matches) {
      index = (index + 1) % frames.length;
      stats.shown = index;
      levels.set(frames[index]);
      paint();
      return;
    }
    const floatMs = touch ? FLOAT_TOUCH_MS : FLOAT_MOUSE_MS;
    if (!tapNext) {
      if (!fading) startTransition();
      flightGroups ??= prepareFlight(frames[fromIndex], frames[index]);
      prepareTapGroups(flightGroups);
      tapNext = {
        touch, area: bounds, bounds: touch ? null : bounds,
        at: now, aggregateAt: now + floatMs, lastStep: now, burstProgress: 0,
        pointerX: x, pointerY: y, pointerAt: now, pointerSpeed: 0
      };
    } else {
      advanceTapPhysics(tapNext, now);
      tapNext.aggregateAt = now + floatMs;
    }
    if (!previewed) startTapWave(x, y, now);
    kickTapGroups(x, y);
    tapFlight(now);
    paint(now);
    kick();
  }

  // Listen passively so a swipe can still scroll and cancel the tap.
  addEventListener('pointerdown', e => {
    const touch = e.pointerType === 'touch';
    if (touch && !e.isPrimary) { press = null; return; }
    if ((!touch && e.pointerType !== 'mouse') || e.button !== 0 || !layout || document.hidden
      || frames.length < 2 || index < 0 || ZH || CODE || THINK) return;
    if (!board.contains(e.target) || e.target.closest('a, button, input, select, textarea, label, [role="button"]')) return;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (onPlate(x, y)) {
      const now = performance.now(), bounds = !touch && !reduced.matches && tapTarget(x, y, false, now);
      press = {id: e.pointerId, touch, at: e.timeStamp, x: e.clientX, y: e.clientY, previewed: Boolean(bounds)};
      // Show the flash on mouse-down. Commit on release so dragging and touch scrolling still cancel.
      if (bounds) {
        startTapWave(x, y, now);
        paint(now);
        kick();
      }
    }
  }, {passive: true});
  const pressMoved = e => Math.hypot(e.clientX - press.x, e.clientY - press.y) > TAP_DISTANCE;
  addEventListener('pointermove', e => {
    if (press?.id === e.pointerId && pressMoved(e)) press = null;
  }, {passive: true});
  addEventListener('pointerup', e => {
    if (press?.id !== e.pointerId) return;
    const {touch, previewed, x: downX, y: downY} = press;
    const tap = e.button === 0 && !pressMoved(e) && (!touch || e.timeStamp - press.at <= TAP_TIME);
    press = null;
    if (!tap || document.hidden || !board.contains(e.target)) return;
    if (e.target.closest('a, button, input, select, textarea, label, [role="button"]')) return;
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    if (!onPlate(x, y)) return;
    if (!touch) { clientX = e.clientX; clientY = e.clientY; }
    tapArtwork(previewed ? downX - r.left : x, previewed ? downY - r.top : y, touch, previewed);
    if (!touch) checkFloatBounds(x, y);
  }, {passive: true});
  addEventListener('pointercancel', e => { if (press?.id === e.pointerId) press = null; }, {passive: true});
  reduced.addEventListener('change', refresh);

  if (ZH || THINK) { images = []; setTimeout(refresh, 0); } else if (PHOTO) Promise.all(PHOTOS.map(([file, ...crop]) => new Promise((done, fail) => {
    const image = new Image();
    image.crop = crop;
    image.onload = () => done(image);
    image.onerror = fail;
    image.src = `./assets/works/${file}`;
  }))).then(loaded => { images = loaded; refresh(); }).catch(() => {});
  else Promise.all(sources.map(name => new Promise((done, fail) => {
    const image = new Image();
    image.onload = () => done(image);
    image.onerror = fail;
    image.src = `./assets/graphics/${name}`;
  }))).then(loaded => { images = loaded; refresh(); }).catch(() => {});

  addEventListener('zh-layout', refresh);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      leavePage();
      tapWaves.length = 0;
      hiddenAt = performance.now();
      halt();
    } else resume();
  });
})();
