(() => {
  const scene = document.querySelector('.steel-scene');
  const board = document.querySelector('.steel-board');
  const paper = document.querySelector('.paper');
  const content = document.querySelector('.steel-content');
  const header = document.querySelector('.site-header');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let moving = false, touchY = null, frame = 0;

  // Rounded corners shared by the DOM screens and the WebGL plates.
  function roundedCommands(points, radius) {
    return points.map((point, i) => {
      const prev=points[(i+points.length-1)%points.length], next=points[(i+1)%points.length];
      const l1=Math.hypot(point[0]-prev[0],point[1]-prev[1]), l2=Math.hypot(next[0]-point[0],next[1]-point[1]);
      const r=Math.min(radius,l1/2,l2/2);
      return {entry:[point[0]+(prev[0]-point[0])*r/l1,point[1]+(prev[1]-point[1])*r/l1], corner:point, exit:[point[0]+(next[0]-point[0])*r/l2,point[1]+(next[1]-point[1])*r/l2]};
    });
  }
  window.__zhGeometry = {roundedCommands};
  // Outlines run clockwise on screen, so (-dy, dx) always points into the shape.
  function normals(points) {
    return points.map((point, i) => {
      const next=points[(i+1)%points.length], dx=next[0]-point[0], dy=next[1]-point[1], len=Math.hypot(dx,dy)||1;
      return [-dy/len, dx/len];
    });
  }
  function inset(points, d) {
    const n=normals(points);
    return points.map((point,i) => {
      const a=n[(i+points.length-1)%points.length], b=n[i];
      return [point[0]+(a[0]+b[0])*d, point[1]+(a[1]+b[1])*d];
    });
  }
  function convexCorners(points, d) {
    const n=normals(points), out=[];
    points.forEach((point,i) => {
      const a=n[(i+points.length-1)%points.length], b=n[i];
      if (a[0]*b[1]-a[1]*b[0] > 0) out.push({x:point[0]+(a[0]+b[0])*d, y:point[1]+(a[1]+b[1])*d});
    });
    return out;
  }
  const rectangle = (w,h) => [[0,0],[w,0],[w,h],[0,h]];
  // Card outlines; each card carries one small stepped corner.
  const recentCard = (w,h,p,m) => m
    ? [[0,0],[w-6*p,0],[w-6*p,.8*p],[w,.8*p],[w,h],[2*p,h],[2*p,h-.6*p],[0,h-.6*p]]
    : [[0,0],[w-10*p,0],[w-10*p,p],[w,p],[w,h],[3*p,h],[3*p,h-.8*p],[0,h-.8*p]];
  const labCard = (w,h,p,m) => m
    ? [[2*p,0],[w,0],[w,h-.8*p],[w-6*p,h-.8*p],[w-6*p,h],[0,h],[0,.6*p],[2*p,.6*p]]
    : [[3*p,0],[w,0],[w,h-p],[w-8*p,h-p],[w-8*p,h],[0,h],[0,.8*p],[3*p,.8*p]];
  function workCard(i,w,h,p,m) {
    const sx=(m?4:5)*p, sy=(m?.6:.8)*p;
    if (i===0) return [[0,0],[w-sx,0],[w-sx,sy],[w,sy],[w,h],[0,h]];
    if (i===1) return [[sx,0],[w,0],[w,h],[0,h],[0,sy],[sx,sy]];
    return [[0,0],[w,0],[w,h],[sx,h],[sx,h-sy],[0,h-sy]];
  }
  const shoulders = (w,h,sx,sy) => [[sx,0],[w-sx,0],[w-sx,sy],[w,sy],[w,h],[0,h],[0,sy],[sx,sy]];
  const heroOutline = (w,h,tabX,tabY) => [[0,0],[w,0],[w,h],[w-tabX,h],[w-tabX,h+tabY],[tabX,h+tabY],[tabX,h],[0,h]];
  const offsetOutline = (points,x,y) => points.map(p => [p[0]+x,p[1]+y]);

  // Wires leave steel plates through a flared joint and end on a round eyelet set into each card.
  // 11-11 ZH: denser holes (80 columns) with the content kept to the middle 66, OFF columns in from each side.
  let OFF = 0;
  function routes(m, p, mobile, R, F) {
    const {recent:C, label:L, cards:[c1,c2,c3], lab:A, contact:K, heroBottom:H} = m;
    const inset=R+(mobile?4:5), clips=[], end=r=>r.y+r.h;
    const clip=(x,y)=>{clips.push({x,y});};
    const top=(r,x)=>{const y=r.y+inset;clip(x,y);return [x,y-R+1];};
    const bottom=(r,x)=>{const y=end(r)-inset;clip(x,y);return [x,y+R-1];};
    const left=(r,y)=>{const x=r.x+inset;clip(x,y);return [x-R+1,y];};
    const right=(r,y)=>{const x=r.x+r.w-inset;clip(x,y);return [x+R-1,y];};
    const wire=(pts,a,b)=>({pts,flare:[a,b]});
    if (mobile) return {clips, traces:[
      // 11-14 ZH: only one wire clips onto the Recent Work card; the second bends out past its right edge and back, like the wide layout.
      wire([[11*p,H],top(C,11*p)],F,0), wire([[16*p,H],[16*p,H+.8*p],[23*p,H+2.2*p],[23*p,end(C)+.6*p],[16*p,end(C)+2*p],[16*p,L.y]],F,F),
      wire([[13*p,end(L)],top(c1,13*p)],F,0),
      wire([bottom(c1,8*p),[8*p,end(c1)+.4*p],[10.2*p,end(c1)+2.6*p],top(c2,10.2*p)],0,0),
      wire([bottom(c2,16*p),[16*p,end(c2)+.4*p],[13.8*p,end(c2)+2.6*p],top(c3,13.8*p)],0,0),
      wire([bottom(c3,14*p),top(A,14*p)],0,0), wire([bottom(A,14*p),[14*p,K.y]],0,F)],
      nodes:[{x:14*p,y:(end(c3)+A.y)/2}]};
    const X=n=>(n+OFF)*p, neck=c1.y+c1.h*.42, side=X(56);
    return {clips, traces:[
      wire([[X(20),H],top(C,X(20))],F,0),
      wire([[X(46),H],[X(46),H+1.5*p],[X(53),H+1.5*p],[side,H+4.5*p],top(c3,side)],F,0),
      wire([bottom(C,X(12)),[X(12),L.y]],0,F), wire([[X(10),end(L)],top(c1,X(10))],F,0),
      wire([right(c1,neck),left(c2,neck)],0,0), wire([right(c2,neck),left(c3,neck)],0,0),
      wire([bottom(c2,X(30)),[X(30),end(c2)+p],[X(34),end(c2)+5*p],top(A,X(34))],0,0),
      wire([bottom(c1,X(10)),[X(10),K.y]],0,F), wire([bottom(A,X(52)),[X(52),K.y]],0,F)],
      nodes:[{x:side,y:C.y+C.h*.55},{x:X(10),y:(end(c1)+K.y)/2}]};
  }

  function layout() {
    const mobile = matchMedia('(max-width:650px)').matches;
    const boardWidth = board.getBoundingClientRect().width;
    // Hole size stays about the same on every screen (~19.5px apart): wide screens get extra
    // columns on both sides of the 66-column content; narrow windows fall back to 66.
    OFF = mobile ? 0 : Math.max(0, Math.min(12, Math.round((boardWidth / 19.5 - 66) / 2)));
    const columns = mobile ? 24 : 66 + 2 * OFF;
    const pitch = boardWidth / columns;
    scene.style.setProperty('--p', `${pitch}px`);
    scene.style.setProperty('--off', `${OFF * pitch}px`);
    const tabX = (mobile ? 1 : 3) * pitch, tabY = (mobile ? 1 : 2) * pitch;   // 11-11: wider step so its two rounded corners don't pinch into a sharp sliver
    // The stepped lower edge and a strip of black wall stay inside the first screen.
    const heroHeight = Math.max(8, Math.floor((innerHeight - (board.getBoundingClientRect().top + scrollY) - tabY - 1.5 * pitch) / pitch)) * pitch;
    scene.style.setProperty('--hero-height', `${heroHeight}px`);
    // Use the available CSS space after zoom: compact boards get fewer rows of dots.
    const shortEdge = Math.min(boardWidth, heroHeight);
    const targetCells = Math.max(42, Math.min(60, 56 + (shortEdge - 620) / 32));
    const heroColumns = Math.max(24, Math.round(boardWidth / Math.max(4, shortEdge / targetCells)));
    const heroPitch = boardWidth / heroColumns;
    scene.style.setProperty('--hero-pitch', heroPitch + 'px');
    const contact = document.querySelector('.contact');
    contact.style.height = 'auto';
    const inner = contact.querySelector('.contact-inner').getBoundingClientRect();
    // One pitch from contact content to the row, and one more to the plate edge.
    const contactTail = contact.getBoundingClientRect().bottom - inner.bottom;
    content.style.paddingBottom = `${Math.max(0, 2 * pitch - contactTail)}px`;
    board.style.paddingBottom = '0px';

    const B = board.getBoundingClientRect();
    const box = el => { const r=el.getBoundingClientRect(); return {x:r.left-B.left, y:r.top-B.top, w:r.width, h:r.height}; };
    const firstHole = B.height - pitch;
    scene.style.setProperty('--bottom-first', `${firstHole}px`);
    scene.style.setProperty('--board-height', `${B.height}px`);
    scene.style.setProperty('--contact-y', `${contact.offsetTop}px`);
    scene.style.setProperty('--paper-y', `${paper.offsetTop}px`);
    scene.style.setProperty('--contact-start', `${contact.offsetTop}px`);
    scene.style.setProperty('--contact-end', `${contact.offsetTop + contact.offsetHeight}px`);

    const plateRadius = Math.min(18, pitch * .9);
    scene.style.setProperty('--card-radius', `${plateRadius}px`);
    const sx = (mobile ? 1 : 2) * pitch, sy = (mobile ? .8 : 1.1) * pitch;
    const plates = [];
    const hero = box(document.querySelector('.hero'));
    // Round through-holes sit where the rivets used to be. The top bevel narrows each
    // opening by 2px, so radii are the visible size plus that loss.
    const bevelLoss = 2;
    const ventCount = mobile ? 6 : 9, rowVent = (mobile ? .18 : .24) * pitch + bevelLoss, plateVent = .2 * pitch + bevelLoss;
    const ventColumns = Array.from({length: ventCount}, (_, i) => (Math.round((columns - 1) * (i + .5) / ventCount) + .5) * pitch);
    plates.push({outline: heroOutline(B.width, hero.h, tabX, tabY), r: plateRadius,
      vents: ventColumns.flatMap(x => [{x, y:pitch*.5, r:rowVent}, {x, y:hero.h+tabY-pitch*.5, r:rowVent}])});
    const recent = box(paper), lab = box(document.querySelector('.paper-lab-sheet'));
    const cardBoxes = [...document.querySelectorAll('.art-row .paper')].map(box);
    const label = box(document.querySelector('.plate-label'));
    const labelOutline = rectangle(label.w, label.h);
    plates.push({outline: offsetOutline(labelOutline, label.x, label.y), r: plateRadius,
      vents: convexCorners(labelOutline, pitch * .75).map(s => ({x:s.x+label.x, y:s.y+label.y, r:plateVent}))});

    const k = box(contact), contactPlate = {x:k.x, y:k.y, w:k.w, h:B.height-k.y};
    const contactOutline = shoulders(contactPlate.w, contactPlate.h, sx, sy);
    plates.push({outline: offsetOutline(contactOutline, k.x, k.y), r: plateRadius,
      vents: [...convexCorners(contactOutline, pitch * .75).filter(s => s.y < contactPlate.h / 2).map(s => ({x:s.x+k.x, y:s.y+k.y, r:plateVent})), ...ventColumns.map(x => ({x, y:firstHole, r:rowVent}))]});

    const clipRadius = (mobile ? .5 : .42) * pitch, clipOpening = (mobile ? .17 : .18) * pitch;
    const {traces, nodes, clips} = routes({recent, label, cards:cardBoxes, lab, contact:contactPlate, heroBottom:hero.h+tabY}, pitch, mobile, clipRadius, mobile?8:11);
    const stock = document.documentElement.dataset.look === 'light' ? '#ffffff' : '#f4f2ec';
    const cardShapes = [[recent, recentCard(recent.w,recent.h,pitch,mobile), stock], [lab, labCard(lab.w,lab.h,pitch,mobile), stock], ]
      .map(([r, outline, fill]) => ({fill, outline: offsetOutline(outline, r.x, r.y), r: plateRadius, punches: clips.filter(c => c.x>r.x && c.x<r.x+r.w && c.y>r.y && c.y<r.y+r.h)}));
    window.__zhModules = {pitch, columns, heroPitch, heroColumns, plates, cards:cardShapes, traces, nodes, clips, clipRadius, clipOpening, nodeRadius:pitch*.42, nodeHoleRadius:pitch*.17+2, perforatedBottom:hero.h+tabY, bottomRow:firstHole, traceWidth:mobile?2:3};
    window.dispatchEvent(new Event('zh-layout'));

    let bottomPattern = board.querySelector('.steel-bottom-pattern');
    if (!bottomPattern) {
      bottomPattern = document.createElement('div');
      bottomPattern.className = 'steel-bottom-pattern';
      bottomPattern.setAttribute('aria-hidden', 'true');
      board.appendChild(bottomPattern);
    }
    bottomPattern.replaceChildren();
    for (let col = 0; col < columns; col++) {
      const hole = document.createElement('i');
      hole.style.left = `${(col + .5) * pitch}px`;
      hole.style.top = `${firstHole}px`;
      bottomPattern.appendChild(hole);
    }
  }
  // Land with the first card centred below the header, or just under it when the window is too short.
  function recentStop() {
    const card = paper.getBoundingClientRect(), bar = header.offsetHeight, room = innerHeight - bar;
    const lead = bar + Math.max(12, (room - card.height) / 2);
    return Math.max(0, Math.min(document.documentElement.scrollHeight - innerHeight, card.top + scrollY - lead));
  }
  function animate(to) {
    moving = true;
    const from = scrollY, start = performance.now(), duration = 800;
    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      // Smooth S curve: accelerates from rest, then comes to rest gently.
      const eased = t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
      window.scrollTo(0, from + (to - from) * eased);
      if (t < 1) frame = requestAnimationFrame(step); else moving = false;
    }
    frame = requestAnimationFrame(step);
  }
  // Only the stroke between the first screen and Recent Work is animated; below it the page scrolls freely.
  // 11-14 ZH: the snap between the first screen and Recent Work is switched off; the page scrolls freely.
  const SNAP = false;
  function intercept(direction) {
    if (!SNAP || reduced.matches || !direction) return false;
    if (moving) return true;
    const target = recentStop(), y = scrollY;
    if (direction > 0 && y < target - 4) { animate(target); return true; }
    if (direction < 0 && y > 2 && y <= target + 4) { animate(0); return true; }
    return false;
  }
  // Trackpads keep sending wheel events after a flick; only a real pause allows the next step.
  let wheelLock = 0;
  addEventListener('wheel', e => {
    if (e.ctrlKey) return;
    const now = performance.now();
    if (moving || now < wheelLock) { e.preventDefault(); wheelLock = now + 140; return; }
    if (intercept(Math.sign(e.deltaY))) { e.preventDefault(); wheelLock = now + 140; }
  }, {passive:false});
  addEventListener('touchstart', e => { touchY = e.touches.length === 1 ? e.touches[0].clientY : null; }, {passive:true});
  addEventListener('touchmove', e => { if (touchY !== null && Math.abs(touchY - e.touches[0].clientY) > 8 && intercept(Math.sign(touchY - e.touches[0].clientY))) { e.preventDefault(); touchY = null; } else if (moving) e.preventDefault(); }, {passive:false});
  addEventListener('touchend', () => { touchY = null; }, {passive:true});
  addEventListener('keydown', () => { if (moving) { cancelAnimationFrame(frame); moving = false; } });
  let layoutTimer;
  let layoutWidth = innerWidth;
  addEventListener('resize', () => {
    if (matchMedia('(pointer:coarse)').matches && innerWidth === layoutWidth) return;
    layoutWidth = innerWidth;
    clearTimeout(layoutTimer); layoutTimer = setTimeout(layout, 120);
  }, {passive:true});
  // Light/dark switch beside About; the choice is remembered for the next visit.
  const page = document.documentElement, lookToggle = document.querySelector('.look-toggle');
  function labelLook() {
    if (!lookToggle) return;
    const light = page.dataset.look === 'light';
    // Browser chrome around the page follows the chosen look too.
    document.querySelector('meta[name=theme-color]').content = light ? '#f8f7f1' : '#0a0a0a';
    document.querySelector('meta[name=color-scheme]').content = light ? 'light' : 'dark';
    lookToggle.textContent = light ? 'Dark' : 'Light';
    lookToggle.setAttribute('aria-label', light ? '切换到深色' : '切换到浅色');
  }
  lookToggle?.addEventListener('click', () => {
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
    labelLook();
    layout();
    window.dispatchEvent(new Event('zh-look'));
  });
  labelLook();
  addEventListener('load', layout, {once:true});
  document.fonts?.ready.then(layout);
  layout();
  try {
    const kept = sessionStorage.getItem('zh-scroll');
    if (kept !== null) { sessionStorage.removeItem('zh-scroll'); scrollTo(0, Number(kept)); }
  } catch (_) {}
})();
