import { EQUIPMENT_SPECS, SHELF_COUNT, RESERVED_STATUS_CODES, FORM_3982_PER_SHELF } from './models.js';
import { slots } from './app.js';
import { getPlacedAddresses, getAddresses, resizeAddress } from './editbook.js';
import { getStreetColors, refreshStreetsList, hexToRgba } from './streets.js';
import { loadAnnotations, evaluateAlerts } from './annotations.js';
import { openDetail } from './addressDetail.js';
import { showCellPopup } from './cellPopup.js';
import { renderSettingsScreen } from './settings.js';

// Normalize street color for band display: hex colors get 60% default opacity
function bandColor(color) {
  if (!color) return color;
  if (color.startsWith('#')) return hexToRgba(color, 0.6);
  return color; // already rgba
}

let occupiedSlots = [];
let currentSection = 0;
let zoomedShelf = null; // null = case overview, number = zoomed into that shelf
let dragState = null;
let annotationsCache = null;

const POSITION_NAMES = ['LEFT WING', 'CENTER', 'RIGHT WING', 'EXTENSION'];

function getCachedAnnotations() {
  if (!annotationsCache) {
    annotationsCache = loadAnnotations();
  }
  return annotationsCache;
}

function invalidateAnnotationsCache() {
  annotationsCache = null;
}

export function initNav() {
  // Nav item click handlers
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const screenName = item.getAttribute('data-screen');
      switchToScreen(screenName);
    });
  });

  // Arrow navigation handlers
  const prevBtn = document.querySelector('.section-nav-btn.prev');
  const nextBtn = document.querySelector('.section-nav-btn.next');

  if (prevBtn) {
    prevBtn.addEventListener('click', prevSection);
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', nextSection);
  }

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    const caseViewActive = document.querySelector('.screen[data-screen="case-view"]')?.classList.contains('active');
    if (!caseViewActive) return;

    if (e.key === 'ArrowLeft') {
      prevSection();
    } else if (e.key === 'ArrowRight') {
      nextSection();
    }
  });

  // Touch swipe navigation for section-to-section on larger screens
  // On mobile, native scrolling handles horizontal movement within content
  const sectionContainer = document.querySelector('.section-container');
  if (sectionContainer) {
    let touchStartX = 0;
    let touchEndX = 0;
    let touchStartY = 0;

    sectionContainer.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    });

    sectionContainer.addEventListener('touchend', (e) => {
      // On mobile, don't intercept swipes - let native scroll work
      if (window.innerWidth <= 767) return;

      touchEndX = e.changedTouches[0].screenX;
      const touchEndY = e.changedTouches[0].screenY;
      handleSwipe(touchEndY);
    });

    function handleSwipe(touchEndY) {
      const swipeDistanceX = touchStartX - touchEndX;
      const swipeDistanceY = Math.abs(touchStartY - touchEndY);
      const threshold = 50;

      // Only trigger section navigation if horizontal swipe is dominant
      if (Math.abs(swipeDistanceX) > threshold && Math.abs(swipeDistanceX) > swipeDistanceY) {
        if (swipeDistanceX > 0) {
          // Swipe left = next
          nextSection();
        } else {
          // Swipe right = prev
          prevSection();
        }
      }
    }
  }

  // Delegated event handlers for cell clicks and drags (attached ONCE)
  const sectionContent = document.querySelector('.section-content');
  if (sectionContent) {
    sectionContent.addEventListener('click', handleDelegatedClick);
    sectionContent.addEventListener('mousedown', handleDelegatedMousedown);
    sectionContent.addEventListener('touchstart', handleDelegatedTouchstart, { passive: false });
  }

  // Set initial screen
  switchToScreen('equipment');
}

// Delegated click handler for address blocks
function handleDelegatedClick(e) {
  // Skip if this is a drag handle
  if (e.target.closest('.drag-handle')) return;

  const block = e.target.closest('.addr-block[data-addr-id]');
  if (!block) return;

  const addrId = block.dataset.addrId;
  if (!addrId) return;

  e.stopPropagation();

  // Both overview and zoom view: show quick card popup first
  // User can tap EDIT to go to full detail overlay
  showCellPopup(addrId, zoomedShelf !== null);
}

// Delegated mousedown handler for drag handles
function handleDelegatedMousedown(e) {
  // On mobile (narrow screens), disable drag to allow native scroll
  if (window.innerWidth <= 767) return;

  const handle = e.target.closest('.drag-handle');
  if (!handle) return;
  startDrag(e);
}

// Delegated touchstart handler for drag handles
function handleDelegatedTouchstart(e) {
  // On mobile (narrow screens), disable drag to allow native scroll
  if (window.innerWidth <= 767) return;

  const handle = e.target.closest('.drag-handle');
  if (!handle) return;
  startDrag(e);
}

export function switchToScreen(screenName) {
  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-screen') === screenName) {
      item.classList.add('active');
    }
  });

  // Update screens
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
    if (screen.getAttribute('data-screen') === screenName) {
      screen.classList.add('active');
    }
  });

  // Refresh case view if switching to it
  if (screenName === 'case-view') {
    refreshCaseView();
  }

  // Refresh streets list if switching to streets
  if (screenName === 'streets') {
    refreshStreetsList();
  }

  // Render settings screen if switching to settings
  if (screenName === 'settings') {
    renderSettingsScreen();
  }
}

export function refreshCaseView() {
  // Build occupiedSlots array
  occupiedSlots = [];
  for (let i = 0; i < 4; i++) {
    if (slots[i] !== null) {
      occupiedSlots.push({ slotIdx: i, type: slots[i] });
    }
  }

  currentSection = 0;
  zoomedShelf = null;

  const sectionContent = document.querySelector('.section-content');

  if (occupiedSlots.length === 0) {
    // Empty state
    sectionContent.innerHTML = '<div class="empty-state">NO EQUIPMENT CONFIGURED</div>';
    updateArrows();
    updateCounter();
    return;
  }

  renderSection();
  updateCounter();
}

/**
 * Refresh the current case view state, preserving zoom if applicable.
 * @param {boolean} wasZoom - If true, re-render the zoomed shelf; else re-render section.
 */
export function refreshCurrentView(wasZoom) {
  if (wasZoom && zoomedShelf !== null) {
    zoomIntoShelf(zoomedShelf);
  } else {
    renderSection();
  }
}

function renderSection() {
  if (occupiedSlots.length === 0) return;

  invalidateAnnotationsCache();

  const { slotIdx, type } = occupiedSlots[currentSection];
  const spec = EQUIPMENT_SPECS[type];
  const positionName = POSITION_NAMES[slotIdx];

  // Update section title
  const sectionTitle = document.querySelector('.case-header-title');
  if (sectionTitle) {
    sectionTitle.textContent = `${positionName} — ${esc(type)}`;
  }

  // Update counter
  updateCounter();

  // Find leftmost and rightmost occupied slots across ALL slots
  let leftmostIdx = null;
  let rightmostIdx = null;
  for (let i = 0; i < 4; i++) {
    if (slots[i] !== null) {
      if (leftmostIdx === null) leftmostIdx = i;
      rightmostIdx = i;
    }
  }

  const isLeftmost = slotIdx === leftmostIdx;
  const isRightmost = slotIdx === rightmostIdx;
  const statusCellCount = RESERVED_STATUS_CODES.reduce((sum, code) => sum + code.width, 0);

  // Info bar above the case
  const hasDesk = spec.hasDesk ? 'Yes' : 'No';
  let reservedNotes = '';
  if (isLeftmost) reservedNotes += 'Form 3982 (cell 1 each shelf)';
  if (isRightmost) {
    if (reservedNotes) reservedNotes += ' · ';
    reservedNotes += `Status codes (${statusCellCount} cells, shelf 1)`;
  }

  let infoHTML = `<div class="case-info-bar">`;
  infoHTML += `<span class="cib-item"><span class="cib-label">Type</span> ${esc(type)}</span>`;
  infoHTML += `<span class="cib-item"><span class="cib-label">Cells/Shelf</span> ${spec.cellsPerShelf}</span>`;
  infoHTML += `<span class="cib-item"><span class="cib-label">Total</span> ${spec.totalCells}</span>`;
  if (spec.hasDesk) infoHTML += `<span class="cib-item"><span class="cib-label">Desk</span> Yes</span>`;
  if (reservedNotes) infoHTML += `<span class="cib-item cib-reserved"><span class="cib-label">Reserved</span> ${reservedNotes}</span>`;
  infoHTML += `</div>`;

  // Build shelf rows with individual cell tick marks (shelf 6 at top, shelf 1 at bottom)
  let shelvesHTML = '<div class="case-visual">';
  for (let shelfNum = SHELF_COUNT; shelfNum >= 1; shelfNum--) {
    shelvesHTML += `<div class="case-shelf-row">`;
    shelvesHTML += `<button class="case-shelf-label" data-shelf="${shelfNum}" title="Zoom into shelf ${shelfNum}">S${shelfNum}<span class="shelf-zoom-icon">&#x2315;</span></button>`;
    shelvesHTML += `<div class="case-shelf-cells" data-cells="${spec.cellsPerShelf}">`;
    shelvesHTML += buildShelfCellsHTML(shelfNum, spec.cellsPerShelf, currentSection, isLeftmost, isRightmost);
    shelvesHTML += `</div>`; // .case-shelf-cells
    shelvesHTML += `</div>`; // .case-shelf-row
  }
  shelvesHTML += '</div>'; // .case-visual

  const sectionContent = document.querySelector('.section-content');
  if (sectionContent) {
    sectionContent.innerHTML = infoHTML + shelvesHTML;

    // Bind shelf label clicks for zoom
    sectionContent.querySelectorAll('.case-shelf-label').forEach(btn => {
      btn.addEventListener('click', () => {
        const shelfNum = parseInt(btn.dataset.shelf);
        zoomIntoShelf(shelfNum);
      });
    });

    // Add clickable class to overview blocks (delegated handler already attached)
    sectionContent.querySelectorAll('.addr-block[data-addr-id]').forEach(block => {
      if (!block.closest('.shelf-zoom-row')) {
        block.classList.add('clickable');
      }
    });

    applyAlertGlow();
  }

  updateArrows();
}

function prevSection() {
  if (currentSection > 0) {
    currentSection--;
    if (zoomedShelf !== null) {
      zoomIntoShelf(zoomedShelf);
    } else {
      renderSection();
    }
  }
}

function nextSection() {
  if (currentSection < occupiedSlots.length - 1) {
    currentSection++;
    if (zoomedShelf !== null) {
      zoomIntoShelf(zoomedShelf);
    } else {
      renderSection();
    }
  }
}

function updateArrows() {
  const prevBtn = document.querySelector('.section-nav-btn.prev');
  const nextBtn = document.querySelector('.section-nav-btn.next');

  if (prevBtn) {
    if (currentSection === 0 || occupiedSlots.length === 0) {
      prevBtn.setAttribute('disabled', '');
    } else {
      prevBtn.removeAttribute('disabled');
    }
  }

  if (nextBtn) {
    if (currentSection >= occupiedSlots.length - 1 || occupiedSlots.length === 0) {
      nextBtn.setAttribute('disabled', '');
    } else {
      nextBtn.removeAttribute('disabled');
    }
  }
}

function updateCounter() {
  const counterEl = document.querySelector('.case-header-counter');
  if (counterEl) {
    if (occupiedSlots.length === 0) {
      counterEl.textContent = '0 / 0';
    } else {
      counterEl.textContent = `${currentSection + 1} / ${occupiedSlots.length}`;
    }
  }
}

// ============================================================
// Shelf Zoom — 10 cells per row, top to bottom
// ============================================================

function zoomIntoShelf(shelfNum) {
  if (occupiedSlots.length === 0) return;
  zoomedShelf = shelfNum;

  invalidateAnnotationsCache();

  const { slotIdx, type } = occupiedSlots[currentSection];
  const spec = EQUIPMENT_SPECS[type];
  const positionName = POSITION_NAMES[slotIdx];

  // Find leftmost/rightmost for reserved logic
  let leftmostIdx = null;
  let rightmostIdx = null;
  for (let i = 0; i < 4; i++) {
    if (slots[i] !== null) {
      if (leftmostIdx === null) leftmostIdx = i;
      rightmostIdx = i;
    }
  }
  const isLeftmost = slotIdx === leftmostIdx;
  const isRightmost = slotIdx === rightmostIdx;
  const statusCellCount = RESERVED_STATUS_CODES.reduce((sum, code) => sum + code.width, 0);

  // Global cell offset: S1 across all sections L→R, then S2 across all, etc.
  // So shelf 1 of Left Wing, then shelf 1 of Center, then shelf 1 of Right Wing, etc.
  // then shelf 2 of Left Wing, shelf 2 of Center, ...
  let cellsBefore = 0;
  for (let s = 1; s < shelfNum; s++) {
    // All occupied sections' cells on shelves below this one
    for (let i = 0; i < 4; i++) {
      if (slots[i] !== null) {
        cellsBefore += EQUIPMENT_SPECS[slots[i]].cellsPerShelf;
      }
    }
  }
  // On this shelf, count occupied sections to the left of this one
  for (let i = 0; i < slotIdx; i++) {
    if (slots[i] !== null) {
      cellsBefore += EQUIPMENT_SPECS[slots[i]].cellsPerShelf;
    }
  }

  // Update title to show shelf
  const sectionTitle = document.querySelector('.case-header-title');
  if (sectionTitle) {
    sectionTitle.textContent = `${positionName} — ${esc(type)} — SHELF ${shelfNum}`;
  }

  // Split cells into rows of 10
  const rowCount = Math.ceil(spec.cellsPerShelf / 10);
  const ROW_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  // Calculate letter offset: count rows consumed by prior occupied sections on this shelf
  let letterOffset = 0;
  for (let i = 0; i < slotIdx; i++) {
    if (slots[i] !== null) {
      letterOffset += Math.ceil(EQUIPMENT_SPECS[slots[i]].cellsPerShelf / 10);
    }
  }

  // Build left sidebar: label with zoom-out icon for first row, plain labels for rest
  let sidebarHTML = '<div class="shelf-zoom-sidebar">';
  sidebarHTML += `<button class="shelf-zoom-label zoom-out" title="Zoom out to case">S${shelfNum}-${ROW_LETTERS[letterOffset]}<span class="shelf-zoom-icon">&#x2315;</span></button>`;
  for (let r = 1; r < rowCount; r++) {
    sidebarHTML += `<div class="shelf-zoom-label">S${shelfNum}-${ROW_LETTERS[letterOffset + r]}</div>`;
  }
  sidebarHTML += '</div>';

  // Build cell rows — address-aware
  let rowsHTML = '<div class="shelf-zoom-rows">';
  for (let r = 0; r < rowCount; r++) {
    const rowStart = r * 10 + 1;
    const rowEnd = Math.min(rowStart + 9, spec.cellsPerShelf);
    rowsHTML += `<div class="shelf-zoom-row" data-cells="${rowEnd - rowStart + 1}">`;
    rowsHTML += buildZoomRowCellsHTML(rowStart, rowEnd, shelfNum, currentSection, isLeftmost, isRightmost, spec.cellsPerShelf, cellsBefore);
    rowsHTML += '</div>';
  }
  rowsHTML += '</div>';

  // Wrap in case-visual container with row direction for zoom layout
  const html = `<div class="case-visual shelf-zoom">${sidebarHTML}${rowsHTML}</div>`;

  const sectionContent = document.querySelector('.section-content');
  if (sectionContent) {
    sectionContent.innerHTML = html;
    sectionContent.querySelector('.shelf-zoom-label.zoom-out').addEventListener('click', zoomOutOfShelf);
    // Drag and click handlers use event delegation (attached once in initNav)
    applyAlertGlow();
  }

  updateArrows();
  updateCounter();
}

function zoomOutOfShelf() {
  zoomedShelf = null;
  renderSection();
}

// ============================================================
// Drag-to-resize: annotate + render draggable dividers
// ============================================================

function annotateDraggableDividers(withDividers) {
  for (let i = 0; i < withDividers.length; i++) {
    const seg = withDividers[i];
    if (seg.type !== 'addr-divider') continue;

    const prev = withDividers[i - 1];
    if (!prev) continue;

    const prevIsAddr = prev.type === 'address' || prev.type === 'street-group';

    if (prevIsAddr) {
      // Draggable if there's an address on the left (can resize into empty space too)
      if (prev.type === 'street-group') {
        const lastInGroup = prev.addresses[prev.addresses.length - 1];
        seg.draggable = true;
        seg.leftAddrId = lastInGroup.address.id;
      } else {
        seg.draggable = true;
        seg.leftAddrId = prev.address.id;
      }
    }
  }
}

function renderDividerHTML(seg) {
  if (seg.draggable) {
    return `<div class="addr-divider draggable" data-left-addr-id="${seg.leftAddrId}"><div class="drag-handle"></div></div>`;
  }
  return '<div class="addr-divider"></div>';
}

// Drag handlers now use event delegation (attached once in initNav)

function startDrag(e) {
  // Double-check: on mobile, don't allow drag - let native scroll work
  if (window.innerWidth <= 767) return;

  e.preventDefault();
  e.stopPropagation();

  const divider = e.target.closest('.addr-divider.draggable');
  if (!divider) return;

  const addrId = divider.dataset.leftAddrId;
  const container = divider.closest('.case-shelf-cells') || divider.closest('.shelf-zoom-row');
  if (!container) return;

  const totalCells = parseInt(container.dataset.cells, 10);
  if (!totalCells) return;

  const cellWidthPx = container.getBoundingClientRect().width / totalCells;

  const addrs = getAddresses();
  const addr = addrs.find(a => a.id === addrId);
  if (!addr) return;

  // Create preview line
  const previewLine = document.createElement('div');
  previewLine.className = 'drag-preview-line';
  container.style.position = 'relative';
  container.appendChild(previewLine);

  // Position preview at the current divider location
  const containerRect = container.getBoundingClientRect();
  const dividerRect = divider.getBoundingClientRect();
  const initialLeft = dividerRect.left - containerRect.left;
  previewLine.style.left = initialLeft + 'px';

  // Handle both mouse and touch events
  const isTouch = e.type === 'touchstart';
  const startX = isTouch ? e.touches[0].clientX : e.clientX;

  dragState = {
    addrId,
    originalSize: addr.cellSize,
    cellWidthPx,
    startX,
    currentDelta: 0,
    previewLine,
    initialLeft,
    isTouch
  };

  document.body.style.cursor = 'col-resize';

  if (isTouch) {
    document.addEventListener('touchmove', onDrag, { passive: false });
    document.addEventListener('touchend', endDrag);
    document.addEventListener('touchcancel', endDrag);
  } else {
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', endDrag);
  }
}

function onDrag(e) {
  if (!dragState) return;

  // Prevent scrolling on touch
  if (e.type === 'touchmove') {
    e.preventDefault();
  }

  // Get clientX from touch or mouse event
  const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;

  const dx = clientX - dragState.startX;
  const cellDelta = Math.round(dx / dragState.cellWidthPx);
  const newSize = Math.max(1, dragState.originalSize + cellDelta);
  dragState.currentDelta = newSize - dragState.originalSize;

  // Move preview line to snapped position
  const snappedOffset = dragState.currentDelta * dragState.cellWidthPx;
  dragState.previewLine.style.left = (dragState.initialLeft + snappedOffset) + 'px';
}

function endDrag(e) {
  if (!dragState) return;

  // Remove preview line
  if (dragState.previewLine && dragState.previewLine.parentNode) {
    dragState.previewLine.remove();
  }

  document.body.style.cursor = '';

  // Clean up appropriate event listeners based on input type
  if (dragState.isTouch) {
    document.removeEventListener('touchmove', onDrag);
    document.removeEventListener('touchend', endDrag);
    document.removeEventListener('touchcancel', endDrag);
  } else {
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', endDrag);
  }

  if (dragState.currentDelta !== 0) {
    const newSize = dragState.originalSize + dragState.currentDelta;
    resizeAddress(dragState.addrId, newSize);
    if (zoomedShelf !== null) {
      zoomIntoShelf(zoomedShelf);
    } else {
      renderSection();
    }
  }

  dragState = null;
}

// ============================================================
// Annotation helpers
// ============================================================

function addrAnnotationHTML(addrId) {
  if (!addrId) return '';
  const all = getCachedAnnotations();
  const data = all[addrId];
  if (!data) return '';

  let html = '';

  // Highlight title (largest, centered)
  if (data.highlight && data.highlight.title) {
    html += `<span class="addr-highlight-title">${esc(data.highlight.title)}</span>`;
  }

  // Tags shown on case
  const visibleTags = (data.tags || []).filter(t => t.showOnCase);

  // Squares (top-right)
  const squares = visibleTags.filter(t => t.displayMode === 'square' || t.displayMode === 'both');
  if (squares.length > 0) {
    html += '<div class="addr-tag-squares">';
    for (const t of squares.slice(0, 4)) {
      html += `<div class="addr-tag-sq" style="background:${t.bgColor}"></div>`;
    }
    html += '</div>';
  }

  // Text tags
  const textTags = visibleTags.filter(t => t.displayMode === 'text' || t.displayMode === 'both');
  for (const t of textTags.slice(0, 2)) {
    html += `<span class="addr-tag-text" style="color:${t.fontColor}">${esc(t.title)}</span>`;
  }

  return html;
}

function addrBlockClasses(addrId) {
  if (!addrId) return '';
  const all = getCachedAnnotations();
  const data = all[addrId];
  if (!data) return '';

  let classes = '';

  if (data.highlight && data.highlight.bgColor && data.highlight.bgColor !== '#000000') {
    classes += ' highlighted';
  }

  return classes;
}

function addrBlockStyle(addrId, baseFlex) {
  let style = `flex:${baseFlex}`;
  if (!addrId) return style;

  const all = getCachedAnnotations();
  const data = all[addrId];
  if (!data) return style;

  if (data.highlight && data.highlight.bgColor && data.highlight.bgColor !== '#000000') {
    style += `;--highlight-color:${data.highlight.bgColor}`;
  }

  return style;
}

function applyAlertGlow() {
  const alerts = evaluateAlerts();
  const alertAddrIds = new Set(alerts.map(a => a.addrId));

  document.querySelectorAll('.addr-block[data-addr-id]').forEach(el => {
    const addrId = el.dataset.addrId;
    if (alertAddrIds.has(addrId)) {
      el.classList.add('has-alert');
      // Add alert dot if not already present
      if (!el.querySelector('.addr-alert-dot')) {
        const dot = document.createElement('div');
        dot.className = 'addr-alert-dot';
        el.appendChild(dot);
      }
    }
  });
}

// Cell click handlers now use event delegation (attached once in initNav)

// ============================================================
// Address-aware shelf cell rendering
// ============================================================

function buildShelfCellsHTML(shelfNum, cellsPerShelf, wingIdx, isLeftmost, isRightmost) {
  const placed = getPlacedAddresses();
  const addrs = getAddresses();
  const statusCellCount = RESERVED_STATUS_CODES.reduce((sum, code) => sum + code.width, 0);

  // Get placements for this wing and shelf
  const shelfP = (placed || [])
    .filter(p => p.wingIdx === wingIdx && p.shelfNum === shelfNum)
    .sort((a, b) => a.startCell - b.startCell);

  // No placements — simple cells
  if (shelfP.length === 0) {
    return buildSimpleCellsHTML(shelfNum, cellsPerShelf, isLeftmost, isRightmost, statusCellCount);
  }

  // Address lookup
  const addrMap = {};
  for (const a of (addrs || [])) addrMap[a.id] = a;

  // Build ordered segments
  const segments = [];
  let c = 1;
  let pIdx = 0;

  while (c <= cellsPerShelf) {
    // Check if next placement starts here
    if (pIdx < shelfP.length && c === shelfP[pIdx].startCell) {
      const p = shelfP[pIdx];
      segments.push({
        type: 'address',
        flex: p.cellSize,
        address: addrMap[p.addressId] || {},
        placement: p
      });
      c += p.cellSize;
      pIdx++;
      continue;
    }

    // Reserved 3982 (cell 1 on leftmost)
    if (isLeftmost && c === 1) {
      segments.push({ type: 'reserved', subtype: '3982', flex: 1, label: 'FORM\n3982' });
      c++;
      continue;
    }

    // Reserved status codes (last N cells on shelf 1 of rightmost)
    if (isRightmost && shelfNum === 1 && c > cellsPerShelf - statusCellCount) {
      // Find which status code this cell belongs to
      const sc = getStatusCodeAtCell(c, cellsPerShelf, statusCellCount);
      if (sc && c === sc.startCell) {
        segments.push({ type: 'reserved', subtype: 'status', flex: sc.width, label: sc.label });
        c += sc.width;
      } else {
        c++;
      }
      continue;
    }

    // Empty cell
    segments.push({ type: 'empty' });
    c++;
  }

  // Group consecutive same-street address segments
  const grouped = [];
  let idx = 0;
  while (idx < segments.length) {
    const seg = segments[idx];
    if (seg.type === 'address' && seg.address.streetName) {
      const street = seg.address.streetName;
      const group = [seg];
      while (idx + 1 < segments.length &&
             segments[idx + 1].type === 'address' &&
             segments[idx + 1].address.streetName === street) {
        idx++;
        group.push(segments[idx]);
      }
      if (group.length > 1) {
        grouped.push({
          type: 'street-group',
          streetName: street,
          addresses: group,
          flex: group.reduce((s, g) => s + g.flex, 0)
        });
      } else {
        grouped.push(seg);
      }
    } else {
      grouped.push(seg);
    }
    idx++;
  }

  // Insert addr-dividers at address boundaries
  const withDividers = [];
  for (let i = 0; i < grouped.length; i++) {
    const seg = grouped[i];
    const isAddr = seg.type === 'address' || seg.type === 'street-group';

    if (isAddr) {
      // Left boundary divider
      withDividers.push({ type: 'addr-divider' });
      withDividers.push(seg);
      // Right boundary divider only if next segment is NOT an address
      const next = grouped[i + 1];
      const nextIsAddr = next && (next.type === 'address' || next.type === 'street-group');
      if (!nextIsAddr) {
        withDividers.push({ type: 'addr-divider' });
      }
    } else {
      withDividers.push(seg);
    }
  }

  annotateDraggableDividers(withDividers);

  // Render HTML
  let html = '';
  for (const seg of withDividers) {
    switch (seg.type) {
      case 'addr-divider':
        html += renderDividerHTML(seg);
        break;
      case 'reserved':
        html += reservedCellHTML(seg);
        break;
      case 'empty':
        html += '<div class="case-cell"></div>';
        break;
      case 'address':
        html += addrBlockHTML(seg);
        break;
      case 'street-group':
        html += streetGroupHTML(seg);
        break;
    }
  }
  return html;
}

// ============================================================
// Address-aware zoom row rendering (10 cells per row)
// ============================================================

function buildZoomRowCellsHTML(rowStart, rowEnd, shelfNum, wingIdx, isLeftmost, isRightmost, cellsPerShelf, cellsBefore) {
  const placed = getPlacedAddresses();
  const addrs = getAddresses();
  const statusCellCount = RESERVED_STATUS_CODES.reduce((sum, code) => sum + code.width, 0);

  const shelfP = (placed || [])
    .filter(p => p.wingIdx === wingIdx && p.shelfNum === shelfNum)
    .sort((a, b) => a.startCell - b.startCell);

  if (shelfP.length === 0) {
    return buildSimpleZoomCells(rowStart, rowEnd, shelfNum, cellsPerShelf, isLeftmost, isRightmost, statusCellCount, cellsBefore);
  }

  const addrMap = {};
  for (const a of (addrs || [])) addrMap[a.id] = a;

  // Build segments for this row range
  const segments = [];
  let c = rowStart;

  while (c <= rowEnd) {
    // Find placement covering this cell
    const p = shelfP.find(pl => c >= pl.startCell && c < pl.startCell + pl.cellSize);

    if (p) {
      const addr = addrMap[p.addressId] || {};
      const addrEnd = p.startCell + p.cellSize - 1;
      const visEnd = Math.min(addrEnd, rowEnd);
      const visFlex = visEnd - c + 1;
      const isAddrStart = (c === p.startCell);

      segments.push({
        type: 'address',
        flex: visFlex,
        address: addr,
        placement: p,
        showLabel: isAddrStart || c === rowStart
      });
      c = visEnd + 1;
      continue;
    }

    // Reserved 3982
    if (isLeftmost && c === 1) {
      segments.push({ type: 'reserved', subtype: '3982', flex: 1, label: 'FORM\n3982', globalNum: cellsBefore + c });
      c++;
      continue;
    }

    // Reserved status
    if (isRightmost && shelfNum === 1 && c > cellsPerShelf - statusCellCount) {
      const sc = getStatusCodeAtCell(c, cellsPerShelf, statusCellCount);
      if (sc && c === sc.startCell) {
        segments.push({ type: 'reserved', subtype: 'status', flex: sc.width, label: sc.label, globalNum: cellsBefore + c });
        c += sc.width;
      } else {
        c++;
      }
      continue;
    }

    // Empty
    segments.push({ type: 'empty', globalNum: cellsBefore + c });
    c++;
  }

  // Group consecutive same-street address segments
  const grouped = [];
  let idx = 0;
  while (idx < segments.length) {
    const seg = segments[idx];
    if (seg.type === 'address' && seg.address.streetName) {
      const street = seg.address.streetName;
      const group = [seg];
      while (idx + 1 < segments.length &&
             segments[idx + 1].type === 'address' &&
             segments[idx + 1].address.streetName === street) {
        idx++;
        group.push(segments[idx]);
      }
      if (group.length > 1) {
        grouped.push({
          type: 'street-group',
          streetName: street,
          addresses: group,
          flex: group.reduce((s, g) => s + g.flex, 0)
        });
      } else {
        grouped.push(seg);
      }
    } else {
      grouped.push(seg);
    }
    idx++;
  }

  // Insert dividers
  const withDividers = [];
  for (let i = 0; i < grouped.length; i++) {
    const seg = grouped[i];
    const isAddr = seg.type === 'address' || seg.type === 'street-group';
    if (isAddr) {
      withDividers.push({ type: 'addr-divider' });
      withDividers.push(seg);
      const next = grouped[i + 1];
      const nextIsAddr = next && (next.type === 'address' || next.type === 'street-group');
      if (!nextIsAddr) {
        withDividers.push({ type: 'addr-divider' });
      }
    } else {
      withDividers.push(seg);
    }
  }

  annotateDraggableDividers(withDividers);

  // Render
  let html = '';
  for (const seg of withDividers) {
    switch (seg.type) {
      case 'addr-divider':
        html += renderDividerHTML(seg);
        break;
      case 'reserved':
        html += reservedCellHTML(seg);
        break;
      case 'empty':
        html += `<div class="case-cell"><span class="cell-num">${seg.globalNum}</span></div>`;
        break;
      case 'address':
        html += zoomAddrBlockHTML(seg);
        break;
      case 'street-group':
        html += zoomStreetGroupHTML(seg);
        break;
    }
  }
  return html;
}

function buildSimpleZoomCells(rowStart, rowEnd, shelfNum, cellsPerShelf, isLeftmost, isRightmost, statusCellCount, cellsBefore) {
  let html = '';
  let c = rowStart;
  while (c <= rowEnd) {
    if (isLeftmost && c === 1) {
      html += reservedCellHTML({ subtype: '3982', flex: 1, label: 'FORM\n3982', globalNum: cellsBefore + c });
      c++;
      continue;
    }
    if (isRightmost && shelfNum === 1 && c > cellsPerShelf - statusCellCount) {
      const sc = getStatusCodeAtCell(c, cellsPerShelf, statusCellCount);
      if (sc && c === sc.startCell) {
        html += reservedCellHTML({ subtype: 'status', flex: sc.width, label: sc.label, globalNum: cellsBefore + c });
        c += sc.width;
      } else {
        c++;
      }
      continue;
    }
    const globalNum = cellsBefore + c;
    html += `<div class="case-cell"><span class="cell-num">${globalNum}</span></div>`;
    c++;
  }
  return html;
}

function zoomAddrBlockHTML(seg) {
  const addr = seg.address;
  const flex = seg.flex;
  const colors = getStreetColors();

  let inner = '';
  if (seg.showLabel) {
    inner += `<span class="addr-num">${esc(addr.primaryAddress || '')}</span>`;
    inner += addrUnitHTML(addr);
    if (addr.streetName) {
      inner += `<span class="addr-street">${esc(addr.streetName)}</span>`;
    }
  }

  if (addr.streetName) {
    const color = colors[addr.streetName];
    if (color) {
      inner += `<div class="street-color-band" style="background:${bandColor(color)}"></div>`;
    }
  }

  for (let t = 1; t < flex; t++) {
    const pct = (t / flex * 100).toFixed(2);
    inner += `<div class="cell-tick" style="left:${pct}%"></div>`;
  }

  inner += addrAnnotationHTML(addr.id);

  return `<div class="addr-block clickable${addrBlockClasses(addr.id)}" style="${addrBlockStyle(addr.id, flex)}" data-addr-id="${addr.id || ''}">${inner}</div>`;
}

function zoomStreetGroupHTML(seg) {
  const colors = getStreetColors();
  const color = colors[seg.streetName];
  let inner = '';
  for (let i = 0; i < seg.addresses.length; i++) {
    if (i > 0) {
      const leftAddr = seg.addresses[i - 1].address;
      inner += `<div class="addr-divider internal draggable" data-left-addr-id="${leftAddr.id}"><div class="drag-handle"></div></div>`;
    }
    const a = seg.addresses[i];
    const addr = a.address;

    let block = '';
    if (a.showLabel) {
      block += `<span class="addr-num">${esc(addr.primaryAddress || '')}</span>`;
      block += addrUnitHTML(addr);
    }

    if (color) {
      block += `<div class="street-color-band" style="background:${bandColor(color)}"></div>`;
    }

    for (let t = 1; t < a.flex; t++) {
      const pct = (t / a.flex * 100).toFixed(2);
      block += `<div class="cell-tick" style="left:${pct}%"></div>`;
    }

    block += addrAnnotationHTML(addr.id);

    inner += `<div class="addr-block clickable${addrBlockClasses(addr.id)}" style="${addrBlockStyle(addr.id, a.flex)}" data-addr-id="${addr.id || ''}">${block}</div>`;
  }

  return `<div class="street-group" style="flex:${seg.flex}">` +
    `<div class="street-addrs">${inner}</div>` +
    `<span class="street-name">${esc(seg.streetName)}</span>` +
    `</div>`;
}

function buildSimpleCellsHTML(shelfNum, cellsPerShelf, isLeftmost, isRightmost, statusCellCount) {
  let html = '';
  let c = 1;
  while (c <= cellsPerShelf) {
    if (isLeftmost && c === 1) {
      html += reservedCellHTML({ subtype: '3982', flex: 1, label: 'FORM\n3982' });
      c++;
      continue;
    }
    if (isRightmost && shelfNum === 1 && c > cellsPerShelf - statusCellCount) {
      const sc = getStatusCodeAtCell(c, cellsPerShelf, statusCellCount);
      if (sc && c === sc.startCell) {
        html += reservedCellHTML({ subtype: 'status', flex: sc.width, label: sc.label });
        c += sc.width;
      } else {
        c++;
      }
      continue;
    }
    html += '<div class="case-cell"></div>';
    c++;
  }
  return html;
}

// ============================================================
// Reserved cell helpers
// ============================================================

function getStatusCodeAtCell(cellNum, cellsPerShelf, statusCellCount) {
  const statusStart = cellsPerShelf - statusCellCount + 1;
  let pos = statusStart;
  for (const sc of RESERVED_STATUS_CODES) {
    if (cellNum >= pos && cellNum < pos + sc.width) {
      return { ...sc, startCell: pos };
    }
    pos += sc.width;
  }
  return null;
}

function reservedCellHTML(seg) {
  const flex = seg.flex || 1;
  if (seg.subtype === '3982') {
    return `<div class="reserved-cell reserved-3982" style="flex:${flex}">` +
      `<span class="reserved-label reserved-label-stacked">FORM<br>3982</span></div>`;
  }
  // Status code cell
  let inner = `<span class="reserved-label">${esc(seg.label)}</span>`;
  // Add internal tick dividers for multi-cell status codes
  for (let t = 1; t < flex; t++) {
    const pct = (t / flex * 100).toFixed(2);
    inner += `<div class="cell-tick" style="left:${pct}%"></div>`;
  }
  return `<div class="reserved-cell reserved-status" style="flex:${flex}">${inner}</div>`;
}

function addrUnitHTML(addr) {
  const unit = addr.secyUnit || '';
  return unit ? `<span class="addr-unit">${esc(unit)}</span>` : '';
}

function addrBlockHTML(seg) {
  const addr = seg.address;
  const flex = seg.flex;
  const colors = getStreetColors();

  let inner = `<span class="addr-num">${esc(addr.primaryAddress || '')}</span>`;
  inner += addrUnitHTML(addr);

  if (addr.streetName) {
    inner += `<span class="addr-street">${esc(addr.streetName)}</span>`;
    const color = colors[addr.streetName];
    if (color) {
      inner += `<div class="street-color-band" style="background:${bandColor(color)}"></div>`;
    }
  }

  for (let t = 1; t < flex; t++) {
    const pct = (t / flex * 100).toFixed(2);
    inner += `<div class="cell-tick" style="left:${pct}%"></div>`;
  }

  inner += addrAnnotationHTML(addr.id);

  return `<div class="addr-block${addrBlockClasses(addr.id)}" style="${addrBlockStyle(addr.id, flex)}" data-addr-id="${addr.id || ''}">${inner}</div>`;
}

function streetGroupHTML(seg) {
  const colors = getStreetColors();
  const color = colors[seg.streetName];
  let inner = '';
  for (let i = 0; i < seg.addresses.length; i++) {
    if (i > 0) {
      const leftAddr = seg.addresses[i - 1].address;
      inner += `<div class="addr-divider internal draggable" data-left-addr-id="${leftAddr.id}"><div class="drag-handle"></div></div>`;
    }
    const a = seg.addresses[i];
    const addr = a.address;

    let block = `<span class="addr-num">${esc(addr.primaryAddress || '')}</span>`;
    block += addrUnitHTML(addr);

    if (color) {
      block += `<div class="street-color-band" style="background:${bandColor(color)}"></div>`;
    }

    for (let t = 1; t < a.flex; t++) {
      const pct = (t / a.flex * 100).toFixed(2);
      block += `<div class="cell-tick" style="left:${pct}%"></div>`;
    }

    block += addrAnnotationHTML(addr.id);

    inner += `<div class="addr-block${addrBlockClasses(addr.id)}" style="${addrBlockStyle(addr.id, a.flex)}" data-addr-id="${addr.id || ''}">${block}</div>`;
  }

  return `<div class="street-group" style="flex:${seg.flex}">` +
    `<div class="street-addrs">${inner}</div>` +
    `<span class="street-name">${esc(seg.streetName)}</span>` +
    `</div>`;
}

function esc(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
