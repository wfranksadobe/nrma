/*
 * Tile block
 * A promotional tile: content on the left (heading, text, CTAs) and an image
 * on the right. The whole tile has a hex background.
 *
 * Fields (row order): image, imageAlt, heading, backgroundColor, text (rich).
 *
 * The CTAs live inside the rich text as trailing link-only paragraphs: the
 * first becomes the primary pill button, a second becomes the secondary text
 * link. (Keeping links in richtext is what survives the XWALK/JCR round-trip.)
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
  // Identify rows by content, not position — the row count differs between the
  // local plain.html (imageAlt folded onto the <img>) and the AEM/JCR render
  // (imageAlt as its own row). Robust to both.
  const rows = [...block.children];

  // AEM may deliver a hex value auto-linked as a URL fragment (e.g.
  // <a href=".../index.plain.html#91BF9E">#91BF9E</a>); pull the trailing hex.
  const extractHex = (raw) => {
    const m = (raw || '').trim().match(/#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);
    return m ? m[0] : null;
  };

  const imageRow = rows.find((r) => r.querySelector('picture, img'));
  // colour row = a short row whose visible text is just a hex code
  const colourRow = rows.find((r) => r !== imageRow
    && HEX_RE.test(r.textContent.trim()));
  // text row = the rich body: it has a link, a promo-code pipe, or more than one
  // paragraph. (EDS wraps the plain heading in a single <p>, so a bare
  // "has a <p>" test would wrongly match the heading — hence the stricter test.)
  const textRow = rows.find((r) => r !== imageRow && r !== colourRow
    && (r.querySelector('a[href], ul')
      || r.textContent.includes('|')
      || r.querySelectorAll('p').length > 1));
  // heading = first remaining non-empty row
  const used = new Set([imageRow, colourRow, textRow]);
  const headingRow = rows.find((r) => !used.has(r) && r.textContent.trim());

  // Background colour
  const colour = extractHex(colourRow?.textContent);
  if (colour) block.style.setProperty('--tile-bg', colour);

  // ---- Right: image ----
  const picture = imageRow?.querySelector('picture, img');
  const media = document.createElement('div');
  media.className = 'tile-media';
  if (picture) media.append(picture);

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

    // Pull out trailing link-only paragraphs → CTA actions row.
    // A paragraph whose only content is a single <a> is treated as a CTA.
    const ctaLinks = [];
    [...body.querySelectorAll(':scope > p')].forEach((p) => {
      const links = p.querySelectorAll('a');
      const onlyLink = links.length === 1 && p.textContent.trim() === links[0].textContent.trim();
      if (onlyLink) {
        ctaLinks.push(links[0]);
        p.remove();
      }
    });

    decoratePromoCodes(body);
    content.append(body);

    if (ctaLinks.length) {
      const actions = document.createElement('div');
      actions.className = 'tile-actions';
      // A "Learn more" is always the secondary underlined link; any other CTA
      // (e.g. "Get offer") is the primary pill. This keeps styling correct even
      // when a tile has only a single "Learn more" link (tile 2).
      const isSecondary = (a) => /learn more/i.test(a.textContent.trim());
      ctaLinks.forEach((a) => {
        a.className = isSecondary(a) ? 'tile-cta-secondary' : 'tile-cta';
        actions.append(a);
      });
      content.append(actions);
    }
  }

  // Rebuild the block: content (left) + media (right)
  block.replaceChildren(content, media);
}
