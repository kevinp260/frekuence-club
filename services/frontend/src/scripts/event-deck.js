const touchQuery = window.matchMedia('(hover: none), (pointer: coarse), (max-width: 47.99rem)');

for (const deck of document.querySelectorAll('[data-event-deck]')) {
  if (!(deck instanceof HTMLElement)) continue;

  const cards = [...deck.querySelectorAll('[data-event-card]')].filter(
    (card) => card instanceof HTMLElement,
  );
  const toggles = [...deck.querySelectorAll('[data-card-toggle]')].filter(
    (toggle) => toggle instanceof HTMLButtonElement,
  );

  const setSelected = (selectedToggle) => {
    for (const toggle of toggles) {
      const isSelected = toggle === selectedToggle;
      const card = toggle.closest('[data-event-card]');
      toggle.setAttribute('aria-expanded', String(isSelected));
      const label = isSelected ? toggle.dataset.closeLabel : toggle.dataset.selectLabel;
      const labelElement = toggle.querySelector('span');
      if (labelElement) labelElement.textContent = label ?? '';
      if (card instanceof HTMLElement) card.toggleAttribute('data-card-selected', isSelected);
    }
  };

  const syncControls = () => {
    for (const toggle of toggles) toggle.hidden = !touchQuery.matches;
    if (!touchQuery.matches) setSelected(null);
  };

  deck.classList.add('event-deck--enhanced');
  syncControls();

  for (const toggle of toggles) {
    toggle.addEventListener('click', () => {
      setSelected(toggle.getAttribute('aria-expanded') === 'true' ? null : toggle);
    });
  }

  deck.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') setSelected(null);
  });

  document.addEventListener('click', (event) => {
    if (event.target instanceof Node && !deck.contains(event.target)) setSelected(null);
  });

  touchQuery.addEventListener('change', syncControls);

  for (const card of cards) card.removeAttribute('aria-hidden');
}
