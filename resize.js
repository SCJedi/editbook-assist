/**
 * Edit Book Assist — Drag-to-Resize Mode
 *
 * Adjust cell widths by dragging cell boundaries.
 * Only available in shelf detail zoom level.
 */

import { dispatch, getState, eventBus, getCellById, isReservedCell } from './models.js';
import { zoomToShelf, getViewLevel, getSVGElement, screenToSVG, fullRender, getFocusedShelf } from './renderer.js';
import { resolveNeighborDisplacement } from './constraints.js';

const INCH = 20; // SVG units per inch

let isDragging = false;
let dragState = null;

export function initResizeMode() {
  // Drag events are bound to the SVG element
  const svg = getSVGElement();
  if (!svg) return;

  svg.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

export function activateResizeMode() {
  document.querySelector('.app-container')?.classList.add('mode-resize');

  // Auto-zoom to shelf if in overview
  const state = getState();
  if (getViewLevel() === 'overview') {
    zoomToShelf(state, 1, null);
  }
}

export function deactivateResizeMode() {
  cancelDrag();
  document.querySelector('.app-container')?.classList.remove('mode-resize');
}

export function cancelDrag() {
  if (isDragging && dragState) {
    // Restore original width
    isDragging = false;
    dragState = null;
    fullRender(getState());
  }
}

// ============================================================
// Drag Handling
// ============================================================

function onMouseDown(e) {
  const state = getState();
  if (state.mode !== 'resize') return;

  // Check if clicking a drag handle
  const handle = e.target.closest('.drag-handle');
  if (!handle) return;

  const cellId = handle.dataset.cellId;
  if (!cellId) return;

  const cell = getCellById(state.config, cellId);
  if (!cell || isReservedCell(cell)) return;

  // Find neighbor to the right
  const neighbor = findRightNeighbor(state.config, cellId);

  const svgPt = screenToSVG(e.clientX, e.clientY);

  isDragging = true;
  dragState = {
    cellId,
    startX: svgPt.x,
    currentX: svgPt.x,
    originalWidth: cell.widthInches,
    neighborCellId: neighbor ? neighbor.id : null,
    neighborOriginalWidth: neighbor ? neighbor.widthInches : 0,
  };

  e.preventDefault();
  e.stopPropagation();
}

function onMouseMove(e) {
  if (!isDragging || !dragState) return;

  const svgPt = screenToSVG(e.clientX, e.clientY);
  dragState.currentX = svgPt.x;

  const deltaX = svgPt.x - dragState.startX;
  const deltaInches = Math.round(deltaX / INCH);

  if (deltaInches === 0) return;

  const newWidth = dragState.originalWidth + deltaInches;

  // Validate
  if (newWidth < 1) return;

  const state = getState();
  const result = resolveNeighborDisplacement(state.config, dragState.cellId, newWidth);

  if (result.valid) {
    // Apply preview (don't dispatch yet — that's on mouseup)
    const cell = getCellById(state.config, dragState.cellId);
    if (cell) {
      // Visual preview: update SVG elements directly
      updateDragPreview(dragState.cellId, result.maxWidth, result.adjustments);
    }
  }
}

function onMouseUp(e) {
  if (!isDragging || !dragState) return;

  const svgPt = screenToSVG(e.clientX, e.clientY);
  const deltaX = svgPt.x - dragState.startX;
  const deltaInches = Math.round(deltaX / INCH);

  if (deltaInches !== 0) {
    const newWidth = Math.max(1, dragState.originalWidth + deltaInches);
    const state = getState();
    const result = resolveNeighborDisplacement(state.config, dragState.cellId, newWidth);

    if (result.valid) {
      dispatch('RESIZE_CELL', {
        cellId: dragState.cellId,
        newWidth: result.maxWidth,
        adjustments: result.adjustments,
      });
    }

    fullRender(getState());
  }

  isDragging = false;
  dragState = null;
}

// ============================================================
// Visual Preview During Drag
// ============================================================

function updateDragPreview(cellId, newWidth, adjustments) {
  const svg = getSVGElement();
  if (!svg) return;

  // Highlight the dragged cell
  const cellEl = svg.querySelector(`[data-cell-id="${cellId}"].cell`);
  if (cellEl) {
    const bg = cellEl.querySelector('.cell-bg');
    if (bg) {
      bg.setAttribute('stroke', '#ffc107');
      bg.setAttribute('stroke-width', '2');
    }
  }

  // Dim the adjusted neighbors
  for (const adj of adjustments) {
    const neighborEl = svg.querySelector(`[data-cell-id="${adj.cellId}"].cell`);
    if (neighborEl) {
      const bg = neighborEl.querySelector('.cell-bg');
      if (bg) {
        bg.setAttribute('stroke', '#8b6914');
        bg.setAttribute('stroke-width', '1');
      }
    }
  }
}

// ============================================================
// Helpers
// ============================================================

function findRightNeighbor(config, cellId) {
  for (const wing of config.wings) {
    for (const shelf of wing.shelves) {
      const idx = shelf.cells.findIndex(c => c.id === cellId);
      if (idx !== -1 && idx < shelf.cells.length - 1) {
        const next = shelf.cells[idx + 1];
        if (!isReservedCell(next)) return next;
      }
    }
  }
  return null;
}
