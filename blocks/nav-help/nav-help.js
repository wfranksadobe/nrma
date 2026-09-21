/*
 * Nav Help block
 * A single rich-text region shown inside a megamenu panel.
 * Authors enter whatever links they need. Two link styles are supported:
 *  - text links: links inside a list (<ul><li><a>…) render as plain text links.
 *  - button links: standalone links (a link that is the only child of a <p>)
 *    render as filled buttons.
 */

function isButtonLink(anchor) {
  const parent = anchor.parentElement;
  if (!parent || parent.tagName !== 'P') return false;
  // standalone link: the paragraph's only meaningful content is this link
  return parent.textContent.trim() === anchor.textContent.trim();
}

export default function decorate(block) {
  // Unwrap the single rich-text cell into the block root.
  const cell = block.querySelector(':scope > div > div') || block.querySelector(':scope > div');
  if (cell) {
    block.replaceChildren(...cell.childNodes);
  }

  block.querySelectorAll('a').forEach((a) => {
    if (isButtonLink(a)) {
      a.classList.add('nav-help-button');
    } else {
      a.classList.add('nav-help-text-link');
    }
  });
}
