const compactQuery = window.matchMedia('(max-width: 63.999rem)');
const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const header = document.querySelector('[data-site-header]');

if (header instanceof HTMLElement) {
  const button = header.querySelector('.nav-toggle');
  const closeButton = header.querySelector('[data-navigation-close]');
  const navigation = header.querySelector('[data-navigation-shell]');
  const dialNavigation = header.querySelector('.dial-navigation');
  const overlayHeader = header.querySelector('.overlay-header');
  const firstDestination = header.querySelector('[data-navigation-link]');
  const dialCursor = header.querySelector('[data-dial-cursor]');
  const backgroundRegions = () =>
    [
      document.querySelector('.skip-link'),
      document.querySelector('main'),
      document.querySelector('.site-footer'),
    ].filter((region) => region instanceof HTMLElement);

  if (
    button instanceof HTMLButtonElement &&
    closeButton instanceof HTMLButtonElement &&
    navigation instanceof HTMLElement &&
    dialNavigation instanceof HTMLElement
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

    const cursorPositionClasses = [
      'dial-cursor--origin',
      'dial-cursor--station-0',
      'dial-cursor--station-1',
      'dial-cursor--station-2',
      'dial-cursor--station-3',
    ];
    let isTuning = false;

    const resetTuning = (resumeMotion = true) => {
      isTuning = false;
      delete dialNavigation.dataset.tuning;

      for (const station of navigation.querySelectorAll('.dial-station--tuning-target')) {
        station.classList.remove('dial-station--tuning-target');
      }

      if (!(dialCursor instanceof HTMLElement)) return;

      dialCursor.classList.add('dial-cursor--resetting');
      const stations = [...navigation.querySelectorAll('[data-dial-station]')];
      const activeIndex = stations.findIndex((station) =>
        station.classList.contains('dial-station--active'),
      );
      dialCursor.classList.remove(...cursorPositionClasses);
      dialCursor.classList.add(
        activeIndex >= 0 ? `dial-cursor--station-${activeIndex}` : 'dial-cursor--origin',
      );
      dialCursor.classList.toggle('dial-cursor--visible', activeIndex >= 0);

      if (resumeMotion) {
        window.requestAnimationFrame(() => dialCursor.classList.remove('dial-cursor--resetting'));
      }
    };

    const tuneToDestination = (event, link) => {
      if (
        !(link instanceof HTMLAnchorElement) ||
        !(dialCursor instanceof HTMLElement) ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        link.hasAttribute('download') ||
        (link.target !== '' && link.target !== '_self') ||
        reducedMotionQuery.matches
      ) {
        return false;
      }

      const destination = link.closest('[data-dial-station]');
      if (!(destination instanceof HTMLElement)) return false;

      const stations = [...navigation.querySelectorAll('[data-dial-station]')];
      const targetIndex = stations.indexOf(destination);
      const activeIndex = stations.findIndex((station) =>
        station.classList.contains('dial-station--active'),
      );
      const url = new window.URL(link.href, window.location.href);
      const isCurrentDocument =
        url.origin === window.location.origin &&
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash === window.location.hash;

      if (url.origin !== window.location.origin || targetIndex < 0 || targetIndex === activeIndex) {
        return false;
      }

      if (isCurrentDocument || isTuning) {
        event.preventDefault();
        return true;
      }

      event.preventDefault();
      isTuning = true;
      dialNavigation.dataset.tuning = 'true';
      destination.classList.add('dial-station--tuning-target');
      dialCursor.classList.add('dial-cursor--visible');

      const transitionProperty = compactQuery.matches ? 'top' : 'left';
      let fallbackTimer;
      let navigationStarted = false;

      const navigate = () => {
        if (navigationStarted) return;
        navigationStarted = true;
        window.clearTimeout(fallbackTimer);
        dialCursor.removeEventListener('transitionend', handleTransitionEnd);
        window.location.assign(url.href);
      };

      const handleTransitionEnd = (transitionEvent) => {
        if (
          transitionEvent.target === dialCursor &&
          transitionEvent.propertyName === transitionProperty
        ) {
          navigate();
        }
      };

      dialCursor.addEventListener('transitionend', handleTransitionEnd);
      dialCursor.getBoundingClientRect();

      window.requestAnimationFrame(() => {
        dialCursor.classList.remove(...cursorPositionClasses);
        dialCursor.classList.add(`dial-cursor--station-${targetIndex}`);
        fallbackTimer = window.setTimeout(navigate, 280);
      });

      return true;
    };

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
      const link = target instanceof HTMLElement ? target.closest('[data-navigation-link]') : null;

      if (link instanceof HTMLAnchorElement && tuneToDestination(event, link)) return;

      if (link instanceof HTMLAnchorElement && compactQuery.matches) {
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
    window.addEventListener('pagehide', () => {
      setOpen(false);
      resetTuning(false);
    });
    window.addEventListener('pageshow', () => {
      resetTuning();
      syncBreakpoint();
    });
  }
}
