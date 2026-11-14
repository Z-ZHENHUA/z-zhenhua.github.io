(() => {
  const params = new URLSearchParams(location.search), root = document.documentElement;
  for (const [key, allowed] of Object.entries({accent:['1','2','3'], font:['1','2'], light:['2'], logo:['2','a','b','c','d','a2','b2','c2','d2','e','f','g','h','g2','g2b','g2c','g3']})) {
    if (allowed.includes(params.get(key))) root.dataset[key] = params.get(key);
  }
  const logo = params.get('logo');
  const logos = {a:'logo-zh-a.svg', b:'logo-zh-b.svg', c:'logo-zh-c.svg', d:'logo-zh-d.svg', '2':'zh-dot-logo.svg', a2:'logo-zh-a2.svg', b2:'logo-zh-b2.svg', c2:'logo-zh-c2.svg', d2:'logo-zh-d2.svg', e:'logo-zh-e.webp', f:'logo-zh-f.webp', g:'logo-zh-g.webp', h:'logo-zh-h.webp', g2:'logo-zh-g2.svg', g2b:'logo-zh-g2b.svg', g2c:'logo-zh-g2c.svg', g3:'logo-zh-g3.svg'};
  const identityIcon = document.querySelector('.identity-icon');
  if (Object.prototype.hasOwnProperty.call(logos, logo)) {
    identityIcon.src = `assets/${logos[logo]}`;
    identityIcon.classList.toggle('identity-icon-new', ['a2','b2','c2','d2','e','f','g','h','g2','g2b','g2c','g3'].includes(logo));
    if (['e','f','g','h'].includes(logo)) identityIcon.srcset = `assets/logo-zh-${logo}@2x.webp 2x`;
  }
  const board = document.querySelector('.board');
  const top = document.querySelector('.fasteners-top');
  const bottom = document.querySelector('.fasteners-bottom');
  function layout() {
    const mobile = matchMedia('(max-width: 600px)').matches;
    const width = board.getBoundingClientRect().width;
    const viewportWidth = document.documentElement.clientWidth;
    const referencePitch = mobile ? (viewportWidth - 28) / 16 : viewportWidth * .9 / 44;
    const columns = Math.max(1, Math.round(width / referencePitch));
    const pitch = width / columns;
    const target = Math.max(window.innerHeight * 2, 1600);
    const rows = Math.ceil(target / pitch);
    document.querySelector('.scene').style.setProperty('--p', `${pitch}px`);
    board.style.height = `${rows * pitch}px`;
    const referenceIndices = mobile ? [1,5,10,14] : [2,10,18,25,33,41];
    const referenceColumns = mobile ? 16 : 44;
    const indices = referenceIndices.map(index => Math.min(columns - 1, Math.floor((index + .5) * columns / referenceColumns)));
    for (const row of [top,bottom]) {
      row.replaceChildren(...indices.map(index => {
        const rivet = document.createElement('span');
        rivet.className = 'fastener';
        rivet.style.left = `${(index + .5) * pitch}px`;
        rivet.style.setProperty('--rivet-light', `${params.get('light') === '2' ? 1 - 0.12 * Math.abs((index + .5) / columns - .5) * 2 : 1 - 0.12 * index / (columns - 1)}`);
        return rivet;
      }));
    }
  }
  layout();
  window.addEventListener('resize', layout, {passive:true});
})();
