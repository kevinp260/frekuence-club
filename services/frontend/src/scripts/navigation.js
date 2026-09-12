const compactQuery = window.matchMedia('(max-width: 63.999rem)');
const header = document.querySelector('[data-site-header]');

if (header instanceof HTMLElement) {
  const button = header.querySelector('.nav-toggle');
  const closeButton = header.querySelector('[data-navigation-close]');
  const navigation = header.querySelector('[data-navigation-shell]');
  const overlayHeader = header.querySelector('.overlay-header');
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

    let wasCompact = compactQuery.matches;
    let lastFocusedNavigationControl = null;

    document.addEventListener('focusin', (event) => {
      const target = event.target;

      if (target instanceof HTMLElement && (navigation.contains(target) || target === button)) {
        lastFocusedNavigationControl = target;
      } else {
        lastFocusedNavigationControl = null;
      }
    });

    document.addEventListener('focusout', (event) => {
      const nextTarget = event.relatedTarget;
      const focusMovedOutsideNavigation = !(
        nextTarget instanceof HTMLElement &&
        (navigation.contains(nextTarget) || nextTarget === button)
      );
      const breakpointTransitionIsPending = compactQuery.matches !== wasCompact;

      // Chromium may move focus to the body before dispatching the media-query
      // change that hides a navigation control. Keep the last legitimate control
      // in that case, but discard it when focus deliberately moves elsewhere.
      if (focusMovedOutsideNavigation && !breakpointTransitionIsPending) {
        lastFocusedNavigationControl = null;
      }
    });

    const syncBreakpoint = () => {
      const isCompact = compactQuery.matches;
      const focusedElement = document.activeElement;
      const focusCandidate =
        focusedElement instanceof HTMLElement &&
        (navigation.contains(focusedElement) || focusedElement === button)
          ? focusedElement
          : lastFocusedNavigationControl;
      const focusWasInNavigation =
        focusCandidate instanceof HTMLElement && navigation.contains(focusCandidate);
      const focusWasInOverlayHeader =
        focusCandidate instanceof HTMLElement && overlayHeader?.contains(focusCandidate);

      setOpen(false);
      button.hidden = !isCompact;
      navigation.hidden = isCompact;

      if (isCompact && !wasCompact && focusWasInNavigation) {
        button.focus();
      } else if (!isCompact && wasCompact && focusWasInOverlayHeader) {
        if (firstDestination instanceof HTMLAnchorElement) firstDestination.focus();
      }

      wasCompact = isCompact;
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
