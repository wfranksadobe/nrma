/* eslint-disable */
/* global WebImporter */
/**
 * Parser for variant: hero  (base block: hero)
 * Source: https://www.nrma.com.au/  — section ".cmp-container--background-primary-colour"
 * Library convention: 1 column, 3 rows (name row, optional background-image row, text row
 *   holding title + subheading + CTA). Never more than 3 rows.
 * UE model (blocks/hero/_hero.json): image (reference), imageAlt (collapsed → img@alt), text (richtext).
 * Generated for NRMA homepage migration.
 */
export default function parse(element, { document }) {
  // Field-hinted cell (xwalk): comment BEFORE content; collapsed fields (Alt/Text/…) never get a hint.
  const fieldCell = (fieldName, ...nodes) => {
    const frag = document.createDocumentFragment();
    frag.appendChild(document.createComment(` field:${fieldName} `));
    nodes.filter(Boolean).forEach((n) => frag.appendChild(n));
    return frag;
  };

  // Scope to the hero content within the navy section. Only replace THIS hero
  // sub-element (not the whole section container) so sibling offer cards in the
  // same section survive for the cards parser. Fall back to the section itself
  // only when no dedicated hero wrapper exists.
  const hero = element.querySelector('.bentohero, .cmp-bento__hero') || element;
  const replaceTarget = hero !== element ? hero : element;

  // image: first image in the hero (mobile hero pictogram). Optional background image row.
  const image = hero.querySelector('img');

  // heading + supporting attribution copy
  const heading = hero.querySelector('.cmp-bento__hero__content h1, .cmp-title h1, h1, h2');
  const attribution = hero.querySelector('.cmp-bento__hero__content p, p');

  // quick-quote tiles: product name + CTA (only real <a href> links survive as anchors)
  const tiles = Array.from(hero.querySelectorAll('.cmp-bento__action__card'));

  // Empty-block guard.
  if (!heading && !attribution && !tiles.length) {
    replaceTarget.replaceWith(...replaceTarget.childNodes);
    return;
  }

  // Build the richtext content for the text field (title + subheading + CTAs).
  const textNodes = [];
  if (heading) textNodes.push(heading);
  if (attribution) textNodes.push(attribution);
  if (tiles.length) {
    const ul = document.createElement('ul');
    tiles.forEach((tile) => {
      const name = tile.querySelector('.cmp-bento__action__card__name');
      const anchor = tile.querySelector('a[href]');
      const li = document.createElement('li');
      const label = (name && name.textContent.trim()) || tile.textContent.trim();
      if (anchor) {
        const a = document.createElement('a');
        a.setAttribute('href', anchor.getAttribute('href'));
        const ctaText = anchor.textContent.trim() || 'Get a quote';
        a.textContent = label ? `${label} — ${ctaText}` : ctaText;
        li.appendChild(a);
      } else {
        li.textContent = label;
      }
      ul.appendChild(li);
    });
    textNodes.push(ul);
  }

  const cells = [];

  // Row 2: background image (1 column). Keep the row even when empty so the slot exists.
  if (image) {
    if (!image.getAttribute('alt')) image.setAttribute('alt', '');
    cells.push([fieldCell('image', image)]);
  } else {
    cells.push(['']);
  }

  // Row 3: text (1 column richtext) — title + subheading + CTA.
  cells.push([fieldCell('text', ...textNodes)]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero', cells });
  element.replaceWith(block);
}
