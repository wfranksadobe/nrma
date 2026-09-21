import { loadFragment } from '../fragment/fragment.js';

// Image tokens the footer recognises. Each :token: in the content is replaced
// with its stored repo image. Social/app tokens live inside <a> links in the
// content, so authors control the destination URL from the content.
const ICON_TOKENS = {
  Acknowledgement: { src: '/icons/acknowledgement.webp', alt: 'Acknowledgement of Country', cls: 'footer-ack-img' },
  facebook: { src: '/icons/facebook.svg', alt: 'Facebook', cls: 'footer-social-icon' },
  instagram: { src: '/icons/instagram.svg', alt: 'Instagram', cls: 'footer-social-icon' },
  x: { src: '/icons/x.svg', alt: 'X', cls: 'footer-social-icon' },
  youtube: { src: '/icons/youtube.svg', alt: 'YouTube', cls: 'footer-social-icon' },
  weixin: { src: '/icons/weixin.svg', alt: 'WeChat', cls: 'footer-social-icon' },
  app_store: { src: '/icons/app_store.svg', alt: 'Download on the App Store', cls: 'footer-store-icon' },
  play_store: { src: '/icons/play_store.svg', alt: 'Get it on Google Play', cls: 'footer-store-icon' },
};

const TOKEN_RE = /:([A-Za-z0-9_]+):/g;

/**
 * Replace :token: text with its image. Works on text nodes so tokens inside
 * links (social/app icons) keep their surrounding <a>. codeBasePath prefixes
 * the icon src so it resolves on localhost and DA/EDS.
 * @param {Element} root the footer root
 */
function resolveIconTokens(root) {
  const base = window.hlx && window.hlx.codeBasePath ? window.hlx.codeBasePath : '';
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
      const def = ICON_TOKENS[m[1]];
      if (def) {
        if (m.index > last) frag.append(document.createTextNode(text.slice(last, m.index)));
        const img = document.createElement('img');
        img.src = `${base}${def.src}`;
        img.alt = def.alt;
        img.loading = 'lazy';
        img.className = def.cls;
        frag.append(img);
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
