const compactQuery = window.matchMedia('(max-width: 63.999rem)');
const header = document.querySelector('[data-site-header]');

if (header instanceof HTMLElement) {
  const button = header.querySelector('.nav-toggle');
  const closeButton = header.querySelector('[data-navigation-close]');
  const navigation = header.querySelector('[data-navigation-shell]');
  const firstDestination = header.querySelector('[data-navigation-link]');
  const backgroundRegions = () =>
    [
      document.querySelector('.skip-link'),
      document.querySelector('main'),
      document.querySelector('.site-footer'),
    ].filter((region) => region instanceof HTMLElement);

  if (
    button instanceof HTMLButtonElement &&
    closeButton instanceof HTMLButtonElement &&
    navigation instanceof HTMLElement
  ) {
    const isOpen = () => compactQuery.matches && button.getAttribute('aria-expanded') === 'true';

    const setBackgroundInert = (inert) => {
      for (const region of backgroundRegions()) {
        region.inert = inert;
        region.toggleAttribute('inert', inert);
      }
    };

    const setOpen = (open, returnFocus = false) => {
      const shouldOpen = open && compactQuery.matches;

      button.setAttribute('aria-expanded', String(shouldOpen));
      button.setAttribute(
        'aria-label',
        shouldOpen ? (button.dataset.closeLabel ?? '') : (button.dataset.openLabel ?? ''),
      );
      navigation.hidden = compactQuery.matches && !shouldOpen;

      if (shouldOpen) {
        navigation.setAttribute('role', 'dialog');
        navigation.setAttribute('aria-modal', 'true');
      } else {
        navigation.removeAttribute('role');
        navigation.removeAttribute('aria-modal');
      }

      document.body.classList.toggle('navigation-open', shouldOpen);
      setBackgroundInert(shouldOpen);

      if (shouldOpen && firstDestination instanceof HTMLAnchorElement) {
        firstDestination.focus();
      } else if (returnFocus && compactQuery.matches) {
        button.focus();
      }
    };

    const focusableElements = () =>
      [...navigation.querySelectorAll('a[href], button:not([disabled])')].filter(
        (element) => element instanceof HTMLElement && element.offsetParent !== null,
      );

    const syncBreakpoint = () => {
      const focusedElement = document.activeElement;
      const focusWasInNavigation =
        focusedElement instanceof HTMLElement && navigation.contains(focusedElement);

      setOpen(false);
      button.hidden = !compactQuery.matches;
      navigation.hidden = compactQuery.matches;

      if (!compactQuery.matches && focusWasInNavigation && focusedElement === closeButton) {
        if (firstDestination instanceof HTMLAnchorElement) firstDestination.focus();
      }
    };

    header.dataset.enhanced = 'true';
    syncBreakpoint();

    button.addEventListener('click', () => {
      setOpen(!isOpen(), isOpen());
    });

    closeButton.addEventListener('click', () => {
      setOpen(false, true);
    });

    navigation.addEventListener('click', (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest('a[href]') && compactQuery.matches) {
        setOpen(false);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (!isOpen()) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false, true);
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = focusableElements();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);

      if (!(first instanceof HTMLElement) || !(last instanceof HTMLElement)) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      } else if (!navigation.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    });

    compactQuery.addEventListener('change', syncBreakpoint);
    window.addEventListener('pagehide', () => setOpen(false));
    window.addEventListener('pageshow', syncBreakpoint);
  }
}
