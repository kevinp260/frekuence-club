const mobileQuery = window.matchMedia('(max-width: 47.99rem)');
const header = document.querySelector('[data-site-header]');

if (header instanceof HTMLElement) {
  const button = header.querySelector('.nav-toggle');
  const navigation = header.querySelector('.primary-navigation');

  if (button instanceof HTMLButtonElement && navigation instanceof HTMLElement) {
    const firstLink = navigation.querySelector('a');

    const setOpen = (open, returnFocus = false) => {
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute(
        'aria-label',
        open ? (button.dataset.closeLabel ?? '') : (button.dataset.openLabel ?? ''),
      );
      navigation.hidden = mobileQuery.matches && !open;
      document.body.classList.toggle('navigation-open', open && mobileQuery.matches);

      if (open && firstLink instanceof HTMLAnchorElement) {
        firstLink.focus();
      } else if (returnFocus) {
        button.focus();
      }
    };

    const syncBreakpoint = () => {
      button.hidden = !mobileQuery.matches;
      setOpen(false);
    };

    header.dataset.enhanced = 'true';
    syncBreakpoint();

    button.addEventListener('click', () => {
      setOpen(button.getAttribute('aria-expanded') !== 'true');
    });

    navigation.addEventListener('click', (event) => {
      if (event.target instanceof HTMLAnchorElement && mobileQuery.matches) {
        setOpen(false);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
        setOpen(false, true);
      }
    });

    mobileQuery.addEventListener('change', syncBreakpoint);
  }
}
