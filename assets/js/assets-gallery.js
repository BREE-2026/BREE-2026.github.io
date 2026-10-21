(() => {
  const suite = document.querySelector('[data-task-suite]');
  if (!suite) return;

  const cards = [...suite.querySelectorAll('.task-suite__card')];
  const previous = suite.querySelector('[data-task-prev]');
  const next = suite.querySelector('[data-task-next]');
  let active = 0;

  const select = (index) => {
    active = (index + cards.length) % cards.length;
    cards.forEach((card, i) => {
      const isActive = i === active;
      card.classList.toggle('is-active', isActive);
      card.setAttribute('aria-current', isActive ? 'true' : 'false');
      card.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

  };

  cards.forEach((card, index) => card.addEventListener('click', () => select(index)));
  previous?.addEventListener('click', () => select(active - 1));
  next?.addEventListener('click', () => select(active + 1));
  suite.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      select(active - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      select(active + 1);
    }
  });

  select(0);
})();
