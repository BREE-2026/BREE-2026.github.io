(() => {
  const root = document.documentElement;
  const sequence = document.querySelector('.sequence');
  const captionIndex = document.querySelector('.cap-index');
  const captionCopy = document.querySelector('.cap-copy');
  const tabs = [...document.querySelectorAll('.track-tabs button')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const previewProgress = Number.parseFloat(new URLSearchParams(location.search).get('preview'));
  const captions = [
    ['01', 'A complete workcell, specified as an experimental instrument.'],
    ['02', 'Structure, illumination and dual-arm geometry are standardized together.'],
    ['03', 'Quantitative calibration registers the physical node to the protocol.'],
    ['04', 'One real task becomes a family of comparable task observations.'],
    ['05', 'Independent nodes contribute to one extensible benchmark and dataset.']
  ];

  const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
  const range = (p, start, end) => clamp((p - start) / (end - start));
  const smooth = n => n * n * (3 - 2 * n);

  function setProgress() {
    const rect = sequence.getBoundingClientRect();
    const distance = sequence.offsetHeight - window.innerHeight;
    const p = Number.isFinite(previewProgress) ? clamp(previewProgress) : (reduceMotion ? 0 : clamp(-rect.top / Math.max(distance, 1)));

    const explodeIn = smooth(range(p, .10, .26));
    const explodeOut = 1 - smooth(range(p, .36, .50));
    const explode = explodeIn * explodeOut;
    const copyOpacity = 1 - smooth(range(p, .13, .27));
    const alignOpacity = smooth(range(p, .49, .61)) * (1 - smooth(range(p, .72, .79)));
    const mosaicOpacity = smooth(range(p, .72, .83));
    const rigOpacity = 1 - smooth(range(p, .49, .60));
    const rigScale = 1 + smooth(range(p, .38, .60)) * .72;
    const alignScale = 1.09 - smooth(range(p, .49, .66)) * .09;
    const mosaicScale = 1.24 - smooth(range(p, .72, .91)) * .24;

    root.style.setProperty('--progress', p.toFixed(4));
    root.style.setProperty('--explode', explode.toFixed(4));
    root.style.setProperty('--copy-opacity', copyOpacity.toFixed(4));
    root.style.setProperty('--label-opacity', clamp(explode * 1.4).toFixed(4));
    root.style.setProperty('--rig-opacity', rigOpacity.toFixed(4));
    root.style.setProperty('--rig-scale', rigScale.toFixed(4));
    root.style.setProperty('--align-opacity', alignOpacity.toFixed(4));
    root.style.setProperty('--align-scale', alignScale.toFixed(4));
    root.style.setProperty('--mosaic-opacity', mosaicOpacity.toFixed(4));
    root.style.setProperty('--mosaic-scale', mosaicScale.toFixed(4));
    root.style.setProperty('--scroll-opacity', (1 - range(p, .02, .12)).toFixed(4));

    const step = Math.min(4, Math.floor(p * 5.15));
    captionIndex.textContent = captions[step][0];
    captionCopy.textContent = captions[step][1];
  }

  let ticking = false;
  addEventListener('scroll', () => {
    if (!ticking) requestAnimationFrame(() => { setProgress(); ticking = false; });
    ticking = true;
  }, { passive: true });

  addEventListener('pointermove', event => {
    if (reduceMotion) return;
    const x = (event.clientX / innerWidth - .5) * 2;
    const y = (event.clientY / innerHeight - .5) * 2;
    root.style.setProperty('--pointer-x', x.toFixed(3));
    root.style.setProperty('--pointer-y', y.toFixed(3));
  }, { passive: true });

  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(item => item.classList.toggle('active', item === tab));
  }));

  setProgress();
})();
