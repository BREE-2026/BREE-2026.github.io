(() => {
  const toc = document.querySelector('.page-toc');
  if (!toc) return;

  const links = [...toc.querySelectorAll('[data-toc-link]')];
  const items = links
    .map((link) => {
      const selector = link.dataset.tocTarget || link.getAttribute('href');
      const target = selector ? document.querySelector(selector) : null;
      return target ? { link, target } : null;
    })
    .filter(Boolean);
  if (!items.length) return;

  let active = items[0];
  const setActive = (item) => {
    if (!item || item === active) return;
    active = item;
    items.forEach(({ link }) => link.classList.toggle('active', link === item.link));
  };

  const update = () => {
    const threshold = window.innerHeight * 0.34;
    let current = items[0];
    items.forEach((item) => {
      if (item.target.getBoundingClientRect().top <= threshold) current = item;
    });
    setActive(current);
  };

  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      const item = items.find(({ link: candidate }) => candidate === link);
      if (!item) return;
      event.preventDefault();
      setActive(item);
      item.target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', link.getAttribute('href'));
    });
  });

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  }, { passive: true });

  update();
})();
