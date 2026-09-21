import { decorateBlock, loadBlock } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

// media query match that indicates desktop width
const isDesktop = window.matchMedia('(min-width: 900px)');

/** Close all open megamenu panels. */
function closeAllPanels(nav, exceptBtn = null) {
  nav.querySelectorAll('.nav-primary > li').forEach((li) => {
    const btn = li.querySelector(':scope > button');
    if (btn && btn !== exceptBtn) {
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}

/** Decorate and load a custom block element (nav-promo / nav-help) in place. */
async function hydrateBlock(el) {
  decorateBlock(el);
  await loadBlock(el);
}

/**
 * Build the megamenu panel for one primary menu.
 * @param {HTMLElement} secondaryList the <ul> of section headings + links
 * @param {HTMLElement|null} promo the nav-promo block for this menu (or null)
 * @param {HTMLElement|null} help the nav-help block for this menu (or null)
 */
function buildPanel(secondaryList, promo, help) {
  const panel = document.createElement('div');
  panel.className = 'nav-panel';

  const inner = document.createElement('div');
  inner.className = 'nav-panel-inner';

  if (promo) {
    const promoCol = document.createElement('div');
    promoCol.className = 'nav-panel-promo';
    promoCol.append(promo);
    inner.append(promoCol);
  }

  const linksCol = document.createElement('div');
  linksCol.className = 'nav-panel-links';
  if (secondaryList) linksCol.append(secondaryList);
  inner.append(linksCol);

  if (help) {
    const helpCol = document.createElement('div');
    helpCol.className = 'nav-panel-help';
    helpCol.append(help);
    inner.append(helpCol);
  }

  panel.append(inner);
  return panel;
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // metadata-independent dual fetch: /content first (localhost/aem up), then root (DA/EDS prod)
  let fragment = await loadFragment('/content/nav');
  if (!fragment) fragment = await loadFragment('/nav');

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');
  while (fragment && fragment.firstElementChild) nav.append(fragment.firstElementChild);

  // The fragment sections arrive as .section wrappers. Classify by content.
  const sections = [...nav.querySelectorAll(':scope > .section')];
  const brandSection = sections[0];
  const navSection = sections[1];
  const promoBlocks = [...nav.querySelectorAll('.nav-promo')];
  const helpBlocks = [...nav.querySelectorAll('.nav-help')];

  // ---- Default header row: brand + CTAs + (injected) profile icon ----
  const brand = document.createElement('div');
  brand.className = 'nav-brand';
  if (brandSection) {
    const logo = brandSection.querySelector('picture, img');
    if (logo) {
      const home = document.createElement('a');
      home.href = '/';
      home.setAttribute('aria-label', 'NRMA Insurance home');
      home.append(logo.closest('picture') || logo);
      brand.append(home);
    }
  }

  const actions = document.createElement('div');
  actions.className = 'nav-actions';
  if (brandSection) {
    const ctaList = brandSection.querySelector('ul');
    if (ctaList) {
      ctaList.querySelectorAll('a').forEach((a, i) => {
        a.classList.add('nav-cta');
        a.classList.add(i === 0 ? 'nav-cta-primary' : 'nav-cta-secondary');
        actions.append(a);
      });
    }
  }
  // Profile icon — default inclusion, not authored in nav content.
  const profile = document.createElement('a');
  profile.className = 'nav-profile';
  profile.href = 'https://connect.nrma.com.au/welcome/login';
  profile.setAttribute('aria-label', 'Log in to your account');
  profile.innerHTML = '<span class="nav-profile-icon" aria-hidden="true"></span>';
  actions.append(profile);

  // Hamburger (mobile)
  const hamburger = document.createElement('button');
  hamburger.className = 'nav-hamburger';
  hamburger.type = 'button';
  hamburger.setAttribute('aria-controls', 'nav');
  hamburger.setAttribute('aria-label', 'Open navigation menu');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.innerHTML = '<span class="nav-hamburger-icon" aria-hidden="true"></span>';
  actions.append(hamburger);

  const topRow = document.createElement('div');
  topRow.className = 'nav-top';
  topRow.append(brand, actions);

  // ---- Primary + secondary nav ----
  const primaryList = navSection ? navSection.querySelector(':scope ul') : null;
  if (primaryList) primaryList.classList.add('nav-primary');

  let promoIdx = 0;
  let helpIdx = 0;
  if (primaryList) {
    [...primaryList.children].forEach((li) => {
      // The primary label is the leading text node; the secondary <ul> follows.
      const secondaryList = li.querySelector(':scope > ul');
      // Extract the primary label text (text before the nested ul).
      const labelText = [...li.childNodes]
        .filter((n) => n.nodeType === Node.TEXT_NODE || (n.nodeType === Node.ELEMENT_NODE && n.tagName !== 'UL'))
        .map((n) => n.textContent)
        .join(' ')
        .trim();

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-primary-trigger';
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-haspopup', 'true');
      btn.textContent = labelText;

      // Assign promo/help by document order (menu order). Menus without a promo
      // (e.g. Resources) get none — the promo list is shorter than the menu list.
      // We detect "has promo" by whether this menu had one in source order.
      let promo = null;
      let help = null;
      if (secondaryList) {
        // Heuristic: menus except the last (Resources) have promo + help.
        // Use presence flags stored on the list from the fragment order below.
        promo = promoBlocks[promoIdx] || null;
        help = helpBlocks[helpIdx] || null;
      }

      // Build the panel; move the secondary list into it.
      const panel = buildPanel(secondaryList, promo, help);

      // Clear the li and rebuild: trigger + panel
      li.textContent = '';
      li.classList.add('nav-primary-item');
      li.append(btn, panel);

      if (promo) promoIdx += 1;
      if (help) helpIdx += 1;

      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') === 'true';
        closeAllPanels(nav, open ? null : btn);
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
      });
    });
  }

  // Search — default inclusion, not authored in nav content.
  const tools = document.createElement('div');
  tools.className = 'nav-tools';
  const searchBtn = document.createElement('button');
  searchBtn.type = 'button';
  searchBtn.className = 'nav-search';
  searchBtn.setAttribute('aria-label', 'Search');
  searchBtn.innerHTML = '<span class="nav-search-icon" aria-hidden="true"></span><span class="nav-search-label">Search</span>';
  tools.append(searchBtn);

  const primaryRow = document.createElement('div');
  primaryRow.className = 'nav-primary-row';
  if (navSection) {
    navSection.className = 'nav-sections';
    navSection.append(tools);
    primaryRow.append(navSection);
  }

  nav.textContent = '';
  nav.append(topRow, primaryRow);

  // Hydrate the custom blocks now that they are in place.
  await Promise.all([
    ...promoBlocks.map((b) => hydrateBlock(b)),
    ...helpBlocks.map((b) => hydrateBlock(b)),
  ]);

  // Close panels when clicking outside.
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) closeAllPanels(nav);
  });
  // Close on Escape.
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape') closeAllPanels(nav);
  });

  // Mobile hamburger toggle.
  hamburger.addEventListener('click', () => {
    const open = hamburger.getAttribute('aria-expanded') === 'true';
    hamburger.setAttribute('aria-expanded', open ? 'false' : 'true');
    hamburger.setAttribute('aria-label', open ? 'Open navigation menu' : 'Close navigation menu');
    nav.classList.toggle('nav-mobile-open', !open);
    document.body.style.overflowY = open || isDesktop.matches ? '' : 'hidden';
  });

  // Reset state when crossing the desktop/mobile boundary.
  isDesktop.addEventListener('change', () => {
    closeAllPanels(nav);
    nav.classList.remove('nav-mobile-open');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.setAttribute('aria-label', 'Open navigation menu');
    document.body.style.overflowY = '';
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
