/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: NRMA section breaks + Section Metadata.
 *
 * The home template defines 4 top-level content sections (see
 * tools/importer/page-templates.json). This transformer inserts an <hr>
 * before every non-first section and emits a Section Metadata table for each
 * section carrying a "Background" row set to that section's hex.
 *
 * This project's section model reads a "background" field (data-background) and
 * scripts.js applies the colour + rounded corners — hence the cell key is
 * "Background" and the value is the hex held in section.style
 * (e.g. #010C66, #F7F1EA, #D7D667).
 *
 * Selectors come directly from page-templates.json section.selector arrays,
 * which were DOM-verified during page analysis (containers confirmed in
 * migration-work/cleaned.html at lines 3707/3871/4376/4462).
 *
 * Breaks are inserted in beforeTransform (while every section element still
 * exists, before block parsers replace them) using a temporary marker; the
 * Section Metadata is inserted in afterTransform anchored to that marker.
 * Sections are processed in reverse so live element references stay valid.
 */

const SECTION_MARKER_ATTR = 'data-excat-section-id';

// section.selector is an array of candidate selectors — try each in order, first match wins.
function querySection(root, selectors) {
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}

export default function transform(hookName, element, payload) {
  const sections = (payload.template && payload.template.sections) || [];

  if (hookName === 'beforeTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      // First section needs neither a leading break nor (if unstyled) metadata.
      if (i === 0 && !section.style) continue;
      const sectionEl = querySection(element, section.selector);
      if (!sectionEl) continue; // no selector matched — skip, never guess a replacement

      const hr = document.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || querySection(element, section.selector);
      if (!anchor) continue; // neither survived — skip, never guess

      const metadataBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { Background: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove(); // section 0 never gets a real leading break
      }
    }
  }
}
