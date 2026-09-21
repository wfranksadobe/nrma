import { decorateBlock, loadBlock } from '../../scripts/aem.js';

/**
 * Convert a nested block <table> (as emitted for blocks placed inside a columns
 * cell) into a real EDS block element, then decorate + load it. EDS only
 * auto-decorates top-level section blocks, so blocks authored inside a columns
 * cell arrive as raw tables and must be built here.
 * @param {HTMLTableElement} table
 * @returns {Promise<void>}
 */
async function hydrateNestedBlockTable(table) {
  const rows = [...table.rows];
  if (!rows.length) return;
  const name = (rows[0].textContent || '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!name) return;

  const wrapper = document.createElement('div');
  const blockEl = document.createElement('div');
  blockEl.className = name;
  // body rows (skip the header/name row) → block rows/cells
  rows.slice(1).forEach((tr) => {
    const rowDiv = document.createElement('div');
    [...tr.cells].forEach((td) => {
      const cellDiv = document.createElement('div');
      cellDiv.append(...td.childNodes);
      rowDiv.append(cellDiv);
    });
    blockEl.append(rowDiv);
  });
  wrapper.append(blockEl);
  table.replaceWith(wrapper);

  decorateBlock(blockEl);
  await loadBlock(blockEl);
}

export default async function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }
    });
  });

  // hydrate any nested block tables authored inside a column (e.g. Promo, Cards)
  const nestedTables = [...block.querySelectorAll(':scope > div > div table')];
  await Promise.all(nestedTables.map((t) => hydrateNestedBlockTable(t)));
}
