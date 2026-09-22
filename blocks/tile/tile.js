/*
 * Tile block
 * A promotional tile: content on the left (heading, text, CTA) and an image
 * occupying the right ~34% of the tile. The whole tile has a hex background.
 *
 * Fields (row order): heading, text (rich), ctaText, ctaLink, image, imageAlt,
 * backgroundColor.
 *
 * Promo-code chip: within the text, any value wrapped in pipes — e.g. |150CAR| —
 * renders as a one-click "copy" chip. Clicking it copies the code (150CAR) to
 * the clipboard.
 */

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Build the copy-to-clipboard promo-code chip.
 * @param {string} code the promo code value (e.g. "150CAR")
 * @returns {HTMLElement}
 */
function buildPromoChip(code) {
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'tile-promo-code';
  chip.setAttribute('aria-label', `Copy promo code ${code}`);

  const value = document.createElement('span');
  value.className = 'tile-promo-code-value';
  value.textContent = code;

  const icon = document.createElement('span');
  icon.className = 'tile-promo-code-icon';
  icon.setAttribute('aria-hidden', 'true');

  chip.append(value, icon);

  chip.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (e) {
      // clipboard API unavailable — fall back to a hidden textarea
      const ta = document.createElement('textarea');
      ta.value = code;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.append(ta);
      ta.select();
      try { document.execCommand('copy'); } catch (err) { /* noop */ }
      ta.remove();
    }
    chip.classList.add('tile-promo-code-copied');
    setTimeout(() => chip.classList.remove('tile-promo-code-copied'), 1500);
  });

  return chip;
}

/**
 * Replace |CODE| tokens in the text with copy-to-clipboard chips. Runs across
 * text nodes so surrounding rich markup (links, bold, etc.) is preserved.
 * @param {HTMLElement} root
 */
function decoratePromoCodes(root) {
  const CODE_RE = /\|([^|]+)\|/g;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets = [];
  while (walker.nextNode()) {
    if (walker.currentNode.nodeValue.includes('|')) targets.push(walker.currentNode);
  }
  targets.forEach((node) => {
    const text = node.nodeValue;
    CODE_RE.lastIndex = 0;
    if (!CODE_RE.test(text)) return;
    CODE_RE.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0;
    let m;
    // eslint-disable-next-line no-cond-assign
    while ((m = CODE_RE.exec(text)) !== null) {
      if (m.index > last) frag.append(document.createTextNode(text.slice(last, m.index)));
      const label = document.createElement('span');
      label.className = 'tile-promo-label';
      label.textContent = 'Copy promo code';
      frag.append(label, buildPromoChip(m[1].trim()));
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.append(document.createTextNode(text.slice(last)));
    node.replaceWith(frag);
  });
}

export default function decorate(block) {
  const rows = [...block.children];
  const [
    headingRow, textRow, ctaTextRow, ctaLinkRow,
    secondaryTextRow, secondaryLinkRow, imageRow, imageAltRow, colourRow,
  ] = rows;

  // Background colour
  const colour = colourRow?.textContent.trim();
  if (colour && HEX_RE.test(colour)) block.style.setProperty('--tile-bg', colour);
  colourRow?.remove();

  // ---- Right: image ----
  const picture = imageRow?.querySelector('picture, img');
  const alt = imageAltRow?.textContent.trim();
  const media = document.createElement('div');
  media.className = 'tile-media';
  if (picture) {
    const img = picture.tagName === 'IMG' ? picture : picture.querySelector('img');
    if (img && alt) img.setAttribute('alt', alt);
    media.append(picture);
  }
  imageRow?.remove();
  imageAltRow?.remove();

  // ---- Left: content ----
  const content = document.createElement('div');
  content.className = 'tile-content';

  if (headingRow && headingRow.textContent.trim()) {
    const h = document.createElement('h3');
    h.className = 'tile-heading';
    const inner = headingRow.firstElementChild;
    h.append(...(inner ? inner.childNodes : headingRow.childNodes));
    content.append(h);
  }

  if (textRow && textRow.textContent.trim()) {
    const body = document.createElement('div');
    body.className = 'tile-text';
    const inner = textRow.firstElementChild;
    body.append(...(inner ? inner.childNodes : textRow.childNodes));
    decoratePromoCodes(body);
    content.append(body);
  }

  // CTA row: primary pill + optional secondary text link
  const ctaText = ctaTextRow?.textContent.trim();
  const ctaLink = ctaLinkRow?.querySelector('a')?.getAttribute('href')
    || ctaLinkRow?.textContent.trim();
  const secondaryText = secondaryTextRow?.textContent.trim();
  const secondaryLink = secondaryLinkRow?.querySelector('a')?.getAttribute('href')
    || secondaryLinkRow?.textContent.trim();

  if (ctaText || secondaryText) {
    const actions = document.createElement('div');
    actions.className = 'tile-actions';
    if (ctaText) {
      const cta = document.createElement('a');
      cta.className = 'tile-cta';
      cta.textContent = ctaText;
      if (ctaLink) cta.setAttribute('href', ctaLink);
      actions.append(cta);
    }
    if (secondaryText) {
      const sec = document.createElement('a');
      sec.className = 'tile-cta-secondary';
      sec.textContent = secondaryText;
      if (secondaryLink) sec.setAttribute('href', secondaryLink);
      actions.append(sec);
    }
    content.append(actions);
  }
  ctaTextRow?.remove();
  ctaLinkRow?.remove();
  secondaryTextRow?.remove();
  secondaryLinkRow?.remove();

  // Rebuild the block: content (left) + media (right)
  block.replaceChildren(content, media);
}
