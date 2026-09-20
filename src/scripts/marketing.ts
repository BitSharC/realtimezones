import { getPlannerCompatibilityRedirect } from './core/route-compatibility';

const destination = getPlannerCompatibilityRedirect(
  window.location.pathname,
  window.location.search
);

if (destination) {
  window.location.replace(destination);
}

function initializeMobileMenu(): void {
  const header = document.querySelector<HTMLElement>('[data-marketing-header]');
  const button = document.querySelector<HTMLButtonElement>('[data-marketing-menu-button]');
  const menu = document.querySelector<HTMLElement>('[data-marketing-mobile-menu]');

  if (!header || !button || !menu) return;

  const setOpen = (open: boolean, returnFocus = false): void => {
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    header.toggleAttribute('data-menu-open', open);
    if (returnFocus) button.focus();
  };

  button.addEventListener('click', () => {
    setOpen(button.getAttribute('aria-expanded') !== 'true');
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('click', (event) => {
    if (button.getAttribute('aria-expanded') !== 'true') return;
    const target = event.target;
    if (target instanceof Node && !header.contains(target)) setOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') {
      setOpen(false, true);
    }
  });

  window.matchMedia('(min-width: 768px)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false);
  });
}

function initializeDurationComparison(): void {
  const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-duration-tab]'));
  const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-duration-panel]'));
  if (tabs.length === 0 || panels.length === 0) return;

  const activate = (index: number, focus = false): void => {
    tabs.forEach((tab, tabIndex) => {
      const selected = tabIndex === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.classList.toggle('is-active', selected);
      if (selected && focus) tab.focus();
    });
    panels.forEach((panel, panelIndex) => {
      panel.classList.toggle('is-active', panelIndex === index);
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(index));
    tab.addEventListener('keydown', (event) => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      activate(next, true);
    });
  });

  activate(Math.max(0, tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true')));
}

initializeMobileMenu();
initializeDurationComparison();
