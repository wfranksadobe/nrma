/*
 * Nav Promo block
 * A rounded-corner promo tile shown inside a megamenu panel.
 * Fields (in row order): image, headline, text, hex background colour.
 */

const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export default function decorate(block) {
  const rows = [...block.children];
  const [imageRow, headlineRow, textRow, colourRow] = rows;

  // Background colour (last row) — plain hex string, drives the tile background.
  const colour = colourRow?.textContent.trim();
  if (colour && HEX_RE.test(colour)) {
    block.style.setProperty('--nav-promo-bg', colour);
  }
  colourRow?.remove();

  // Image
  const picture = imageRow?.querySelector('picture, img');
  if (imageRow) {
    imageRow.className = 'nav-promo-image';
    imageRow.replaceChildren(picture || document.createElement('span'));
  }

  // Headline
  if (headlineRow) {
    headlineRow.className = 'nav-promo-headline';
    const inner = headlineRow.firstElementChild;
    headlineRow.replaceChildren(...(inner ? inner.childNodes : headlineRow.childNodes));
  }

  // Text (may be empty)
  if (textRow) {
    if (!textRow.textContent.trim()) {
      textRow.remove();
    } else {
      textRow.className = 'nav-promo-text';
      const inner = textRow.firstElementChild;
      textRow.replaceChildren(...(inner ? inner.childNodes : textRow.childNodes));
    }
  }
}
