/**
 * Edit Book Assist — SVG Renderer
 *
 * Generates and updates SVG DOM from application state.
 * Supports overview and shelf detail zoom levels with animated transitions.
 */

import { isReservedCell, getWingIndex, EQUIPMENT_SPECS } from './models.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// SVG coordinate system: 1 inch = 20 SVG units
const INCH = 20;
const SHELF_HEIGHT = 80;
const SHELF_GAP = 10;
const WING_GAP = 30;
const PADDING = 40;
const SHELF_COUNT = 6;

let svgEl = null;
let defsEl = null;
let caseGroup = null;
let currentViewLevel = 'overview';
let currentShelfFocus = null;
let currentWingFocus = null;
let animFrameId = null;

// ============================================================
// Initialization
// ============================================================

export function initRenderer(container, state) {
  svgEl = document.createElementNS(SVG_NS, 'svg');
  svgEl.setAttribute('xmlns', SVG_NS);
  svgEl.setAttribute('class', 'case-svg');
  svgEl.style.width = '100%';
  svgEl.style.height = '100%';

  // Calculate viewBox from config
  const vb = calculateOverviewViewBox(state.config);
  svgEl.setAttribute('viewBox', vb.join(' '));
  svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // Defs (filters)
  defsEl = document.createElementNS(SVG_NS, 'defs');
  defsEl.innerHTML = `
    <filter id="glow-amber">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feFlood flood-color="#ffc107" flood-opacity="0.6"/>
      <feComposite in2="blur" operator="in"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-amber-strong">
      <feGaussianBlur stdDeviation="4" result="blur"/>
      <feFlood flood-color="#ffc107" flood-opacity="0.8"/>
      <feComposite in2="blur" operator="in"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow-red">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feFlood flood-color="#ff3333" flood-opacity="0.7"/>
      <feComposite in2="blur" operator="in"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  `;
  svgEl.appendChild(defsEl);

  // Case group
  caseGroup = document.createElementNS(SVG_NS, 'g');
  caseGroup.setAttribute('class', 'case-group');
  svgEl.appendChild(caseGroup);

  container.innerHTML = '';
  container.appendChild(svgEl);

  fullRender(state);
  return svgEl;
}

// ============================================================
// ViewBox Calculations
// ============================================================

function calculateOverviewViewBox(config) {
  const totalWidth = calculateTotalWidth(config);
  const totalHeight = (SHELF_HEIGHT + SHELF_GAP) * SHELF_COUNT - SHELF_GAP;
  return [
    -PADDING,
    -PADDING - 20, // extra space for wing labels
    totalWidth + PADDING * 2,
    totalHeight + PADDING * 2 + 20,
  ];
}

function calculateShelfViewBox(config, shelfNumber, wingId) {
  const totalWidth = wingId
    ? getWingWidth(config, wingId)
    : calculateTotalWidth(config);
  const shelfY = getShelfY(shelfNumber);
  const startX = wingId ? getWingX(config, wingId) : 0;

  return [
    startX - 20,
    shelfY - 20,
    totalWidth + 40,
    SHELF_HEIGHT + 40,
  ];
}

function calculateTotalWidth(config) {
  let width = 0;
  config.wings.forEach((wing, i) => {
    width += wing.cellsPerShelf * INCH;
    if (i < config.wings.length - 1) width += WING_GAP;
  });
  return width;
}

function getWingX(config, wingId) {
  let x = 0;
  for (const wing of config.wings) {
    if (wing.id === wingId) return x;
    x += wing.cellsPerShelf * INCH + WING_GAP;
  }
  return x;
}

function getWingWidth(config, wingId) {
  const wing = config.wings.find(w => w.id === wingId);
  return wing ? wing.cellsPerShelf * INCH : 0;
}

function getShelfY(shelfNumber) {
  // Shelf 6 at top (y=0), shelf 1 at bottom
  const invertedShelf = SHELF_COUNT - shelfNumber;
  return invertedShelf * (SHELF_HEIGHT + SHELF_GAP);
}

// ============================================================
// Full Render
// ============================================================

export function fullRender(state) {
  if (!caseGroup) return;
  caseGroup.innerHTML = '';

  const config = state.config;

  // Render shelf labels (left margin)
  for (let s = 1; s <= SHELF_COUNT; s++) {
    const y = getShelfY(s) + SHELF_HEIGHT / 2;
    const label = createSVG('text', {
      class: 'shelf-label',
      x: -15,
      y: y + 4,
      'text-anchor': 'end',
      'font-size': '12',
      fill: '#8b6914',
    });
    label.textContent = `S${s}`;
    caseGroup.appendChild(label);
  }

  // Render each wing
  let wingX = 0;
  config.wings.forEach((wing, wingIdx) => {
    const wingGroup = createSVG('g', {
      class: 'wing',
      'data-wing-id': wing.id,
      transform: `translate(${wingX}, 0)`,
    });

    const wingWidth = wing.cellsPerShelf * INCH;

    // Wing label (above)
    const wingLabel = createSVG('text', {
      class: 'wing-label',
      x: wingWidth / 2,
      y: -8,
      'text-anchor': 'middle',
      'font-size': '10',
      fill: '#8b6914',
    });
    wingLabel.textContent = `${wing.label} \u2014 ${wing.equipmentType}`;
    wingGroup.appendChild(wingLabel);

    // Wing body frame
    const bodyRect = createSVG('rect', {
      class: 'wing-body',
      x: -8,
      y: -4,
      width: wingWidth + 16,
      height: (SHELF_HEIGHT + SHELF_GAP) * SHELF_COUNT - SHELF_GAP + 8,
      rx: 3,
      fill: 'transparent',
      stroke: '#3d2e00',
      'stroke-width': 1,
      'data-wing-id': wing.id,
    });
    wingGroup.appendChild(bodyRect);

    // Render shelves
    wing.shelves.forEach((shelf) => {
      const shelfY = getShelfY(shelf.shelfNumber);
      const shelfGroup = createSVG('g', {
        class: 'shelf',
        'data-shelf': shelf.shelfNumber,
        transform: `translate(0, ${shelfY})`,
      });

      // Render cells
      let cellX = 0;
      shelf.cells.forEach((cell) => {
        const cellWidth = cell.widthInches * INCH;
        const cellGroup = renderCell(cell, cellX, cellWidth, wingIdx, shelf.shelfNumber);
        shelfGroup.appendChild(cellGroup);
        cellX += cellWidth;
      });

      wingGroup.appendChild(shelfGroup);
    });

    caseGroup.appendChild(wingGroup);
    wingX += wingWidth + WING_GAP;
  });
}

// ============================================================
// Cell Rendering
// ============================================================

function renderCell(cell, x, width, wingIdx, shelfNumber) {
  const g = createSVG('g', {
    class: getCellClasses(cell),
    'data-cell-id': cell.id,
    transform: `translate(${x}, 0)`,
  });

  // Cell background
  const bg = createSVG('rect', {
    class: 'cell-bg',
    x: 0.5,
    y: 0.5,
    width: width - 1,
    height: SHELF_HEIGHT - 1,
    rx: 1,
    fill: getCellFill(cell),
    stroke: getCellStroke(cell),
    'stroke-width': getCellStrokeWidth(cell),
    'stroke-dasharray': isReservedCell(cell) ? '4 2' : 'none',
  });
  g.appendChild(bg);

  // Street color bar (bottom of cell, for address cells)
  if (cell.type === 'address' && cell.streetColor) {
    const barHeight = 4;
    const bar = createSVG('rect', {
      class: 'street-color',
      x: 1,
      y: SHELF_HEIGHT - barHeight - 1,
      width: width - 2,
      height: barHeight,
      fill: cell.streetColor,
      rx: 1,
    });
    g.appendChild(bar);
  }

  // Cell text content
  if (cell.type === 'address' && cell.address) {
    // Clip path
    const clipId = `clip-${cell.id}`;
    const clipPath = createSVG('clipPath', { id: clipId });
    const clipRect = createSVG('rect', {
      x: 1, y: 1,
      width: width - 2,
      height: SHELF_HEIGHT - 10,
    });
    clipPath.appendChild(clipRect);
    g.appendChild(clipPath);

    const textGroup = createSVG('g', { 'clip-path': `url(#${clipId})` });

    // Address number
    const addrNum = createSVG('text', {
      class: 'addr-number',
      x: width / 2,
      y: 20,
      'text-anchor': 'middle',
      'font-size': width > 25 ? '9' : '7',
      fill: '#daa520',
      'font-weight': 'bold',
      'font-family': "'JetBrains Mono', 'Consolas', monospace",
    });
    addrNum.textContent = cell.address.addressNumber;
    textGroup.appendChild(addrNum);

    // Street name (abbreviated in overview)
    const streetText = currentViewLevel === 'overview'
      ? cell.address.streetName.substring(0, 4)
      : cell.address.streetName;
    const addrStreet = createSVG('text', {
      class: 'addr-street',
      x: width / 2,
      y: 32,
      'text-anchor': 'middle',
      'font-size': width > 25 ? '7' : '5',
      fill: '#b8860b',
      'font-family': "'JetBrains Mono', 'Consolas', monospace",
    });
    addrStreet.textContent = streetText;
    textGroup.appendChild(addrStreet);

    g.appendChild(textGroup);
  } else if (cell.type === 'form-3982') {
    const text = createSVG('text', {
      x: width / 2,
      y: SHELF_HEIGHT / 2 + 3,
      'text-anchor': 'middle',
      'font-size': '5',
      fill: '#8b6914',
      'font-family': "'JetBrains Mono', 'Consolas', monospace",
    });
    text.textContent = '3982';
    g.appendChild(text);
  } else if (isReservedCell(cell) && cell.type !== 'form-3982') {
    const text = createSVG('text', {
      x: width / 2,
      y: SHELF_HEIGHT / 2 + 3,
      'text-anchor': 'middle',
      'font-size': width > 25 ? '6' : '4',
      fill: '#8b6914',
      'font-family': "'JetBrains Mono', 'Consolas', monospace",
    });
    text.textContent = cell.reservedLabel || cell.type.replace('reserved-', '').toUpperCase();
    g.appendChild(text);
  }

  // Sticker badges
  if (cell.stickers && cell.stickers.length > 0) {
    const stickersGroup = createSVG('g', {
      class: 'stickers',
      transform: `translate(${width - 8}, 3)`,
    });

    cell.stickers.slice(0, 3).forEach((sticker, idx) => {
      const isExpired = sticker.expirationDate && new Date(sticker.expirationDate) < new Date();

      if (currentViewLevel === 'overview') {
        // Dot in overview
        const dot = createSVG('circle', {
          class: `sticker-badge${isExpired ? ' expired' : ''}`,
          cx: 0,
          cy: idx * 7,
          r: 3,
          fill: sticker.color,
          'data-sticker-id': sticker.id,
        });
        stickersGroup.appendChild(dot);
      } else {
        // Badge with label in shelf detail
        const badge = createSVG('rect', {
          class: `sticker-badge${isExpired ? ' expired' : ''}`,
          x: -8,
          y: idx * 12,
          width: 16,
          height: 10,
          rx: 2,
          fill: sticker.color,
          'data-sticker-id': sticker.id,
        });
        stickersGroup.appendChild(badge);

        const label = createSVG('text', {
          class: 'sticker-text',
          x: 0,
          y: idx * 12 + 7.5,
          'text-anchor': 'middle',
          'font-size': '5',
          fill: '#000',
          'font-weight': 'bold',
          'font-family': "'JetBrains Mono', 'Consolas', monospace",
        });
        label.textContent = sticker.label;
        stickersGroup.appendChild(label);
      }
    });

    // Overflow indicator
    if (cell.stickers.length > 3) {
      const overflow = createSVG('text', {
        x: 0,
        y: 3 * 7 + 5,
        'text-anchor': 'middle',
        'font-size': '5',
        fill: '#daa520',
        'font-family': "'JetBrains Mono', 'Consolas', monospace",
      });
      overflow.textContent = `+${cell.stickers.length - 3}`;
      stickersGroup.appendChild(overflow);
    }

    g.appendChild(stickersGroup);
  }

  // Drag handle (hidden by default, shown in resize mode)
  const handle = createSVG('line', {
    class: 'drag-handle',
    x1: width - 1,
    y1: 0,
    x2: width - 1,
    y2: SHELF_HEIGHT,
    stroke: '#3d2e00',
    'stroke-width': 2,
    'data-cell-id': cell.id,
  });
  g.appendChild(handle);

  // Grip dots for drag handle
  const gripGroup = createSVG('g', {
    class: 'grip-dots',
    transform: `translate(${width - 1}, ${SHELF_HEIGHT / 2 - 5})`,
  });
  for (let i = 0; i < 3; i++) {
    gripGroup.appendChild(createSVG('circle', {
      r: 1,
      cx: 0,
      cy: i * 5,
      fill: '#b8860b',
    }));
  }
  g.appendChild(gripGroup);

  return g;
}

function getCellClasses(cell) {
  const classes = ['cell'];
  if (cell.type === 'form-3982') classes.push('form3982-cell');
  else if (isReservedCell(cell)) classes.push('reserved-cell');
  else if (cell.type === 'address' && !cell.address) classes.push('empty-cell');
  return classes.join(' ');
}

function getCellFill(cell) {
  if (cell.type === 'form-3982') return '#0d1a00';
  if (isReservedCell(cell)) return '#1a1200';
  return 'transparent';
}

function getCellStroke(cell) {
  if (isReservedCell(cell)) return '#b8860b';
  return '#3d2e00';
}

function getCellStrokeWidth(cell) {
  if (isReservedCell(cell)) return 0.75;
  return 0.5;
}

// ============================================================
// Differential Updates
// ============================================================

export function updateCells(state, dirtyIds) {
  if (!dirtyIds || dirtyIds.size === 0) {
    fullRender(state);
    return;
  }

  for (const cellId of dirtyIds) {
    const el = svgEl.querySelector(`[data-cell-id="${cellId}"].cell`);
    const cell = findCellInConfig(state.config, cellId);

    if (!cell && el) {
      el.remove();
    } else if (cell && el) {
      // Re-render this cell in place
      const parent = el.parentNode;
      const transform = el.getAttribute('transform');
      const wingIdx = parseInt(cellId.split('_')[1]) || 0;
      const shelfNum = parseInt(cellId.split('_')[2]) + 1 || 1;
      const width = cell.widthInches * INCH;

      // Parse x from transform
      const match = transform.match(/translate\(([\d.]+)/);
      const x = match ? parseFloat(match[1]) : 0;

      const newEl = renderCell(cell, x, width, wingIdx, shelfNum);
      parent.replaceChild(newEl, el);
    }
  }
}

function findCellInConfig(config, cellId) {
  for (const wing of config.wings) {
    for (const shelf of wing.shelves) {
      for (const cell of shelf.cells) {
        if (cell.id === cellId) return cell;
      }
    }
  }
  return null;
}

// ============================================================
// Zoom / ViewBox Animation
// ============================================================

export function zoomToShelf(state, shelfNumber, wingId) {
  if (!svgEl) return;

  currentViewLevel = 'shelf';
  currentShelfFocus = shelfNumber;
  currentWingFocus = wingId || null;

  const target = calculateShelfViewBox(state.config, shelfNumber, wingId);
  const current = getCurrentViewBox();

  animateViewBox(current, target, 300);

  // Re-render with shelf detail level
  fullRender(state);
}

export function zoomToOverview(state) {
  if (!svgEl) return;

  currentViewLevel = 'overview';
  currentShelfFocus = null;
  currentWingFocus = null;

  const target = calculateOverviewViewBox(state.config);
  const current = getCurrentViewBox();

  animateViewBox(current, target, 300);

  fullRender(state);
}

function getCurrentViewBox() {
  const vb = svgEl.getAttribute('viewBox');
  return vb.split(' ').map(Number);
}

function animateViewBox(from, to, durationMs) {
  if (animFrameId) cancelAnimationFrame(animFrameId);

  const start = performance.now();

  function frame(now) {
    const t = Math.min((now - start) / durationMs, 1);
    // Ease in-out
    const easedT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    const current = from.map((v, i) => v + (to[i] - v) * easedT);
    svgEl.setAttribute('viewBox', current.join(' '));

    if (t < 1) {
      animFrameId = requestAnimationFrame(frame);
    } else {
      animFrameId = null;
    }
  }

  animFrameId = requestAnimationFrame(frame);
}

export function getViewLevel() {
  return currentViewLevel;
}

export function getFocusedShelf() {
  return currentShelfFocus;
}

// ============================================================
// Selection Highlighting
// ============================================================

export function highlightCell(cellId) {
  const el = svgEl?.querySelector(`[data-cell-id="${cellId}"].cell`);
  if (el) el.classList.add('selected');
}

export function unhighlightCell(cellId) {
  const el = svgEl?.querySelector(`[data-cell-id="${cellId}"].cell`);
  if (el) el.classList.remove('selected');
}

export function unhighlightAll() {
  svgEl?.querySelectorAll('.cell.selected').forEach(el => el.classList.remove('selected'));
}

// ============================================================
// Drag Handles
// ============================================================

export function showDragHandles(shelfNumber) {
  // Drag handles are always rendered but hidden via CSS (.drag-handle opacity: 0)
  // The mode-resize class on the app container makes them visible
}

export function hideDragHandles() {
  // Handled by removing mode-resize class from app container
}

// ============================================================
// Alert Classes
// ============================================================

export function updateAlertClasses(alerts) {
  if (!svgEl) return;

  // Remove all existing alert classes
  svgEl.querySelectorAll('.cell.alert-approaching, .cell.alert-imminent, .cell.alert-expired').forEach(el => {
    el.classList.remove('alert-approaching', 'alert-imminent', 'alert-expired');
  });

  // Apply alert classes
  for (const alert of alerts) {
    const el = svgEl.querySelector(`[data-cell-id="${alert.cellId}"].cell`);
    if (!el) continue;

    if (alert.daysUntilExpiry < 0) {
      el.classList.add('alert-expired');
    } else if (alert.daysUntilExpiry <= 3) {
      el.classList.add('alert-imminent');
    } else if (alert.daysUntilExpiry <= 7) {
      el.classList.add('alert-approaching');
    }
  }
}

// ============================================================
// SVG Coordinate Helpers
// ============================================================

/**
 * Convert screen coordinates to SVG coordinates.
 */
export function screenToSVG(screenX, screenY) {
  if (!svgEl) return { x: 0, y: 0 };
  const pt = svgEl.createSVGPoint();
  pt.x = screenX;
  pt.y = screenY;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const svgPt = pt.matrixTransform(ctm.inverse());
  return { x: svgPt.x, y: svgPt.y };
}

/**
 * Get SVG element reference.
 */
export function getSVGElement() {
  return svgEl;
}

// ============================================================
// Utility
// ============================================================

function createSVG(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, val] of Object.entries(attrs)) {
    el.setAttribute(key, val);
  }
  return el;
}
