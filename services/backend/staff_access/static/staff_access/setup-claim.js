(() => {
  const form = document.querySelector('[data-staff-setup-claim]');
  const status = document.querySelector('#setup-status');
  if (!(form instanceof HTMLFormElement)) return;

  const invitation = new URLSearchParams(window.location.hash.slice(1)).get('invite');
  window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);
  const input = form.elements.namedItem('invitation');
  if (invitation && input instanceof HTMLInputElement) {
    input.value = invitation;
    form.requestSubmit();
    return;
  }

  if (status) status.textContent = 'Paste the setup code from the link you received.';
  for (const element of form.querySelectorAll('[data-manual-invitation]')) {
    element.hidden = false;
  }
})();
