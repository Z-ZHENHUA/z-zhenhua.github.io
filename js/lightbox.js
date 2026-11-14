// Work pages: every image opens full size with a download link; the work's video starts by itself.
(() => {
  const imgs = [...document.querySelectorAll('#images img')].filter(i => !i.closest('svg'));
  if (imgs.length) {
    const box = document.createElement('div'); box.className = 'lb'; box.hidden = true;
    box.innerHTML = '<img alt=""><div class="lb-bar"><span class="lb-count"></span><a class="lb-dl" download>Download</a><button class="lb-close" type="button">Close</button></div><button class="lb-nav lb-prev" type="button" aria-label="上一张">‹</button><button class="lb-nav lb-next" type="button" aria-label="下一张">›</button>';
    document.body.appendChild(box);
    const big = box.querySelector('img'), dl = box.querySelector('.lb-dl'), count = box.querySelector('.lb-count');
    let at = 0;
    function show(i) {
      at = (i + imgs.length) % imgs.length;
      const full = imgs[at].dataset.full || imgs[at].currentSrc || imgs[at].src;
      big.src = full; dl.href = full; dl.setAttribute('download', decodeURIComponent(full.split('/').pop()));
      count.textContent = `${at + 1} / ${imgs.length}`;
      box.hidden = false; document.documentElement.classList.add('lb-open');
    }
    function close() { box.hidden = true; big.removeAttribute('src'); document.documentElement.classList.remove('lb-open'); }
    imgs.forEach((im, i) => { im.classList.add('lb-open-able'); im.addEventListener('click', () => show(i)); });
    box.querySelector('.lb-close').addEventListener('click', close);
    box.querySelector('.lb-prev').addEventListener('click', () => show(at - 1));
    box.querySelector('.lb-next').addEventListener('click', () => show(at + 1));
    box.addEventListener('click', e => { if (e.target === box) close(); });
    addEventListener('keydown', e => {
      if (box.hidden) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowLeft') show(at - 1); else if (e.key === 'ArrowRight') show(at + 1);
    });
  }
  const video = document.querySelector('.video-slot video'), sound = document.querySelector('.video-sound');
  if (video) {
    video.muted = false;
    const unmute = () => { video.muted = false; if (sound) sound.hidden = true; video.play().catch(() => {}); };
    video.play().catch(() => { video.muted = true; video.play().catch(() => {}); if (sound) sound.hidden = false; });
    // When it finishes, go back to the first image instead of the last frame.
    video.addEventListener('ended', () => { video.removeAttribute('autoplay'); video.load(); });
    if (sound) sound.addEventListener('click', unmute);
    // Browsers allow sound after the first interaction with the page.
    addEventListener('pointerdown', e => { if (video.muted && !e.target.closest('video')) unmute(); }, {once: true});
  }
})();
