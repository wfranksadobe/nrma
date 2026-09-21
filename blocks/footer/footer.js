import { loadFragment } from '../fragment/fragment.js';

// Image tokens the footer recognises. Each :token: in the content is replaced
// with its stored repo image. Social/app tokens live inside <a> links in the
// content, so authors control the destination URL from the content.
const ICON_TOKENS = {
  Acknowledgement: { src: '/icons/acknowledgement.png', alt: 'Acknowledgement of Country', cls: 'footer-ack-img' },
  facebook: { src: '/icons/facebook.svg', alt: 'Facebook', cls: 'footer-social-icon' },
  instagram: { src: '/icons/instagram.svg', alt: 'Instagram', cls: 'footer-social-icon' },
  x: { src: '/icons/x.svg', alt: 'X', cls: 'footer-social-icon' },
  youtube: { src: '/icons/youtube.svg', alt: 'YouTube', cls: 'footer-social-icon' },
  weixin: { src: '/icons/weixin.svg', alt: 'WeChat', cls: 'footer-social-icon' },
  app_store: { src: '/icons/app_store.svg', alt: 'Download on the App Store', cls: 'footer-store-icon' },
  play_store: { src: '/icons/play_store.svg', alt: 'Get it on Google Play', cls: 'footer-store-icon' },
};

const TOKEN_RE = /:([A-Za-z0-9_]+):/g;

// Case-insensitive lookup: EDS lowercases icon names (:Acknowledgement: ->
// icon-acknowledgement), so match tokens regardless of case.
const TOKEN_BY_LOWER = Object.fromEntries(
  Object.entries(ICON_TOKENS).map(([k, v]) => [k.toLowerCase(), v]),
);

/** Build the sized image element for a token definition. */
function buildIconImg(def, base) {
  const img = document.createElement('img');
  img.src = `${base}${def.src}`;
  img.alt = def.alt;
  img.loading = 'lazy';
  img.className = def.cls;
  return img;
}

/**
 * Resolve footer icon tokens to their repo images. Handles BOTH forms:
 *  1. already-decorated `span.icon.icon-<name>` — how the EDS/DA pipeline
 *     serves `:token:` (helix converts the text, decorateIcons adds a 16px img).
 *  2. raw `:token:` text in a text node — localhost / aem up.
 * Either way we emit the same correctly-sized, correctly-sourced image so the
 * footer looks identical on localhost and on the EDS instance.
 * @param {Element} root the footer root
 */
function resolveIconTokens(root) {
  const base = window.hlx && window.hlx.codeBasePath ? window.hlx.codeBasePath : '';

  // 1) Replace pre-decorated icon spans (EDS instance).
  root.querySelectorAll('span.icon').forEach((span) => {
    const iconClass = [...span.classList].find((c) => c.startsWith('icon-'));
    if (!iconClass) return;
    const def = TOKEN_BY_LOWER[iconClass.slice(5).toLowerCase()];
    if (def) span.replaceWith(buildIconImg(def, base));
  });

  // 2) Replace raw :token: text (localhost).
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  while (walker.nextNode()) {
    if (TOKEN_RE.test(walker.currentNode.nodeValue)) textNodes.push(walker.currentNode);
    TOKEN_RE.lastIndex = 0;
  }
  textNodes.forEach((node) => {
    const frag = document.createDocumentFragment();
    let last = 0;
    const text = node.nodeValue;
    let m;
    TOKEN_RE.lastIndex = 0;
    // eslint-disable-next-line no-cond-assign
    while ((m = TOKEN_RE.exec(text)) !== null) {
      const def = TOKEN_BY_LOWER[m[1].toLowerCase()];
      if (def) {
        if (m.index > last) frag.append(document.createTextNode(text.slice(last, m.index)));
        frag.append(buildIconImg(def, base));
        last = m.index + m[0].length;
      }
    }
    if (last < text.length) frag.append(document.createTextNode(text.slice(last)));
    node.replaceWith(frag);
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  // metadata-independent dual fetch: /content first (localhost), then root (DA/EDS prod)
  let fragment = await loadFragment('/content/footer');
  if (!fragment) fragment = await loadFragment('/footer');

  block.textContent = '';
  const footer = document.createElement('div');
  footer.className = 'footer-content';
  while (fragment && fragment.firstElementChild) footer.append(fragment.firstElementChild);

  // Tag the top-level sections in document order.
  const sectionClasses = ['footer-ack', 'footer-columns', 'footer-connect', 'footer-legal', 'footer-bottom'];
  const sections = [...footer.querySelectorAll(':scope > .section')];
  sections.forEach((sec, i) => { if (sectionClasses[i]) sec.classList.add(sectionClasses[i]); });

  // Footer links are plain links, never buttons. EDS auto-decorates a lone link
  // in a cell as class="button" (wrapped in .button-container) — strip that so
  // app-store / social icon links render without a coloured button pill.
  footer.querySelectorAll('a.button').forEach((a) => a.classList.remove('button', 'primary', 'secondary'));
  footer.querySelectorAll('.button-container').forEach((c) => c.classList.remove('button-container'));

  // Resolve all :token: images (acknowledgement, social, app stores).
  resolveIconTokens(footer);

  // Group each column heading + its following list in the columns section.
  const colsWrapper = footer.querySelector('.footer-columns .default-content-wrapper')
    || footer.querySelector('.footer-columns');
  if (colsWrapper) {
    const groups = [];
    let current = null;
    [...colsWrapper.children].forEach((el) => {
      if (el.tagName === 'P') {
        current = document.createElement('div');
        current.className = 'footer-column';
        current.append(el);
        groups.push(current);
      } else if (el.tagName === 'UL' && current) {
        current.append(el);
      }
    });
    groups.forEach((g) => colsWrapper.append(g));
  }

  block.append(footer);
}
