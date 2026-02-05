/**
 * Edit Book Assist — Cell Editor Mode
 *
 * Edit address data, stickers, and street colors on individual cells.
 */

import { dispatch, getState, eventBus, getCellById, isReservedCell, STREET_COLORS, createSticker } from './models.js';
import { updateCells, highlightCell, unhighlightAll } from './renderer.js';

let panelEl = null;
let currentCellId = null;
let pendingChanges = null;

export function initCellEditor() {
  panelEl = document.getElementById('editPanel');

  // Listen for cell clicks
  eventBus.on('cell-click', ({ cellId }) => {
    const state = getState();
    if (state.mode !== 'cell-editor') return;
    openCellEditor(cellId);
  });

  // Setup form input handlers
  setupFormListeners();
}

export function activateCellEditorMode() {
  // Cells become clickable (default behavior)
}

export function deactivateCellEditorMode() {
  if (pendingChanges) saveCell();
  closeCellEditor();
}

export function openCellEditor(cellId) {
  const state = getState();
  const cell = getCellById(state.config, cellId);
  if (!cell) return;

  // Auto-save previous if open
  if (currentCellId && currentCellId !== cellId && pendingChanges) {
    saveCell();
  }

  currentCellId = cellId;
  pendingChanges = null;

  // Update selection
  unhighlightAll();
  highlightCell(cellId);
  dispatch('SET_SELECTION', { cellId });

  if (isReservedCell(cell)) {
    renderReservedInfo(cell);
  } else {
    renderCellEditor(cell);
  }

  panelEl?.classList.add('open');
}

export function closeCellEditor() {
  currentCellId = null;
  pendingChanges = null;
  unhighlightAll();
  dispatch('SET_SELECTION', { cellId: null });
  panelEl?.classList.remove('open');
}

export function saveCell() {
  if (!currentCellId || !pendingChanges) return;

  dispatch('EDIT_CELL', {
    cellId: currentCellId,
    address: pendingChanges.address,
    streetColor: pendingChanges.streetColor,
    widthInches: pendingChanges.widthInches,
    stickers: pendingChanges.stickers,
  });

  pendingChanges = null;
  eventBus.emit('cell-saved', { cellId: currentCellId });
}

export function navigateToNextCell() {
  if (!currentCellId) return;
  const nextId = getAdjacentCellId(currentCellId, 1);
  if (nextId) openCellEditor(nextId);
}

export function navigateToPreviousCell() {
  if (!currentCellId) return;
  const prevId = getAdjacentCellId(currentCellId, -1);
  if (prevId) openCellEditor(prevId);
}

// ============================================================
// Rendering
// ============================================================

function escAttr(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderCellEditor(cell) {
  if (!panelEl) return;

  const addr = cell.address || {};

  panelEl.innerHTML = `
    <div class="edit-panel-header">
      <div>
        <div class="edit-panel-title">CELL EDITOR</div>
        <div class="edit-panel-location">Shelf ${cell.shelfNumber} \u00B7 Pos ${cell.positionInShelf}</div>
      </div>
      <button class="close-btn" id="closePanelBtn">\u00D7</button>
    </div>

    <div class="form-group">
      <label>Address Number</label>
      <input type="text" id="editAddrNum" value="${escAttr(addr.addressNumber)}" placeholder="e.g. 1234">
    </div>

    <div class="form-group">
      <label>Street Name</label>
      <input type="text" id="editStreetName" value="${escAttr(addr.streetName)}" placeholder="e.g. Oak St">
    </div>

    <div class="form-group">
      <label>Unit / Apt</label>
      <input type="text" id="editUnit" value="${escAttr(addr.unit)}" placeholder="e.g. Apt 2B">
    </div>

    <div class="form-group">
      <label>Street Color</label>
      <div class="color-swatches" id="colorSwatches"></div>
    </div>

    <div class="form-group">
      <label>Cell Width</label>
      <select id="editWidth">
        <option value="1" ${cell.widthInches === 1 ? 'selected' : ''}>1 inch</option>
        <option value="2" ${cell.widthInches === 2 ? 'selected' : ''}>2 inches</option>
        <option value="3" ${cell.widthInches === 3 ? 'selected' : ''}>3 inches</option>
        <option value="4" ${cell.widthInches === 4 ? 'selected' : ''}>4 inches</option>
      </select>
    </div>

    <div class="cell-preview">
      <div class="cell-preview-label">Preview</div>
      <div class="cell-preview-inner" id="cellPreview" style="--preview-color: ${cell.streetColor || '#3d2e00'}">
        <div class="cell-preview-num">${addr.addressNumber || '---'}</div>
        <div class="cell-preview-street">${addr.streetName || ''}</div>
      </div>
    </div>

    <div class="stickers-section">
      <div class="stickers-section-header">
        <label>Stickers</label>
        <button class="btn btn-secondary btn-small" id="addStickerBtn">+ Add</button>
      </div>
      <div id="stickersList"></div>
      <div id="addStickerForm" class="add-sticker-form hidden"></div>
    </div>

    <div class="form-group">
      <label>Notes</label>
      <textarea id="editNotes" placeholder="Carrier notes...">${escAttr(addr.notes)}</textarea>
    </div>

    <div class="action-buttons">
      <button class="btn" id="saveBtn">Save</button>
      <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
      <button class="btn btn-danger btn-small" id="clearBtn">Clear</button>
    </div>
  `;

  // Initialize color swatches
  const swatchContainer = panelEl.querySelector('#colorSwatches');
  STREET_COLORS.forEach(color => {
    const swatch = document.createElement('div');
    swatch.className = `color-swatch${color === cell.streetColor ? ' selected' : ''}`;
    swatch.style.backgroundColor = color;
    swatch.dataset.color = color;
    swatch.addEventListener('click', () => selectColor(color));
    swatchContainer.appendChild(swatch);
  });

  // Render stickers
  renderStickers(cell.stickers || []);

  // Initialize pending changes
  pendingChanges = {
    address: { ...(cell.address || {}) },
    streetColor: cell.streetColor,
    widthInches: cell.widthInches,
    stickers: [...(cell.stickers || [])],
  };

  // Bind events
  bindEditorEvents();
}

function renderReservedInfo(cell) {
  if (!panelEl) return;

  const typeNames = {
    'form-3982': 'Form 3982 — Customer Special Instructions',
    'reserved-mach': 'Machineable Mail',
    'reserved-nonmach': 'Non-Machineable Mail',
    'reserved-utf': 'Unable to Forward',
    'reserved-ia': 'Insufficient Address',
    'reserved-nsn': 'No Such Number',
    'reserved-ank': 'Attempted Not Known',
    'reserved-other': 'Other Status Codes',
  };

  panelEl.innerHTML = `
    <div class="edit-panel-header">
      <div>
        <div class="edit-panel-title">RESERVED CELL</div>
        <div class="edit-panel-location">Shelf ${cell.shelfNumber} \u00B7 Pos ${cell.positionInShelf}</div>
      </div>
      <button class="close-btn" id="closePanelBtn">\u00D7</button>
    </div>

    <div class="reserved-info">
      <div class="reserved-info-title">${cell.reservedLabel || cell.type}</div>
      <div class="reserved-info-desc">${typeNames[cell.type] || 'This cell is reserved and cannot be edited.'}</div>
      <div class="reserved-info-desc mt-2" style="font-size: 11px;">
        Width: ${cell.widthInches}" \u00B7 Type: ${cell.type}
      </div>
    </div>

    <div class="action-buttons">
      <button class="btn btn-secondary" id="cancelBtn">Close</button>
    </div>
  `;

  panelEl.querySelector('#closePanelBtn')?.addEventListener('click', closeCellEditor);
  panelEl.querySelector('#cancelBtn')?.addEventListener('click', closeCellEditor);
}

function renderStickers(stickers) {
  const container = panelEl?.querySelector('#stickersList');
  if (!container) return;

  if (stickers.length === 0) {
    container.innerHTML = '<div class="opacity-50" style="font-size: 11px; padding: 8px 0;">No stickers</div>';
    return;
  }

  container.innerHTML = '';
  stickers.forEach((sticker, idx) => {
    const isExpired = sticker.expirationDate && new Date(sticker.expirationDate) < new Date();
    const item = document.createElement('div');
    item.className = `sticker-item${isExpired ? ' expired' : ''}`;
    item.innerHTML = `
      <div class="sticker-info">
        <div class="sticker-type-label">
          <span class="sticker-type-dot" style="background: ${sticker.color}"></span>
          ${sticker.label} \u2014 ${sticker.type}
        </div>
        <div class="sticker-details">
          ${sticker.expirationDate
            ? (isExpired
              ? `<span class="sticker-expired-text">EXPIRED ${sticker.expirationDate}</span>`
              : `Expires: ${sticker.expirationDate}`)
            : 'No expiration'}
        </div>
        ${sticker.details ? `<div class="sticker-details">${sticker.details}</div>` : ''}
        ${sticker.forwardAddress ? `<div class="sticker-details">To: ${sticker.forwardAddress}</div>` : ''}
      </div>
      <button class="btn btn-danger btn-small" data-sticker-idx="${idx}">\u00D7</button>
    `;
    container.appendChild(item);
  });

  // Bind remove buttons
  container.querySelectorAll('[data-sticker-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.stickerIdx);
      if (pendingChanges) {
        pendingChanges.stickers.splice(idx, 1);
        renderStickers(pendingChanges.stickers);
      }
    });
  });
}

function showAddStickerForm() {
  const form = panelEl?.querySelector('#addStickerForm');
  if (!form) return;

  form.classList.remove('hidden');
  form.innerHTML = `
    <div class="form-group mb-1">
      <label>Sticker Type</label>
      <select id="newStickerType">
        <option value="">Select type...</option>
        <option value="forward">Forward (FWD)</option>
        <option value="hold">Hold (HLD)</option>
        <option value="vacant">Vacant (VAC)</option>
        <option value="deceased">Deceased (DEC)</option>
        <option value="dog">Dog Warning (DOG)</option>
        <option value="custom">Custom (USR)</option>
      </select>
    </div>
    <div id="stickerTypeFields"></div>
    <div class="mt-1">
      <button class="btn btn-small" id="confirmAddSticker">Add</button>
      <button class="btn btn-secondary btn-small" id="cancelAddSticker">Cancel</button>
    </div>
  `;

  form.querySelector('#newStickerType')?.addEventListener('change', (e) => {
    renderStickerTypeFields(e.target.value);
  });

  form.querySelector('#confirmAddSticker')?.addEventListener('click', confirmAddSticker);
  form.querySelector('#cancelAddSticker')?.addEventListener('click', () => {
    form.classList.add('hidden');
  });
}

function renderStickerTypeFields(type) {
  const container = panelEl?.querySelector('#stickerTypeFields');
  if (!container) return;

  let html = '';
  switch (type) {
    case 'forward':
      html = `
        <div class="form-group mb-1">
          <label>Forward Address</label>
          <input type="text" id="stickerForwardAddr" placeholder="456 Pine St, Anytown 12345">
        </div>
        <div class="form-group mb-1">
          <label>Start Date</label>
          <input type="date" id="stickerStartDate">
        </div>
        <div class="form-group mb-1">
          <label>Expiration Date</label>
          <input type="date" id="stickerExpDate">
        </div>
      `;
      break;
    case 'hold':
      html = `
        <div class="form-group mb-1">
          <label>Start Date</label>
          <input type="date" id="stickerStartDate">
        </div>
        <div class="form-group mb-1">
          <label>Expiration Date</label>
          <input type="date" id="stickerExpDate">
        </div>
      `;
      break;
    case 'custom':
      html = `
        <div class="form-group mb-1">
          <label>Custom Label</label>
          <input type="text" id="stickerCustomLabel" placeholder="3 chars max" maxlength="3">
        </div>
        <div class="form-group mb-1">
          <label>Expiration Date (optional)</label>
          <input type="date" id="stickerExpDate">
        </div>
      `;
      break;
    default:
      html = `
        <div class="form-group mb-1">
          <label>Start Date</label>
          <input type="date" id="stickerStartDate">
        </div>
        <div class="form-group mb-1">
          <label>Notes</label>
          <input type="text" id="stickerNotes" placeholder="Additional info">
        </div>
      `;
  }
  container.innerHTML = html;
}

function confirmAddSticker() {
  const type = panelEl?.querySelector('#newStickerType')?.value;
  if (!type || !pendingChanges) return;

  const sticker = createSticker(type, {
    cellId: currentCellId,
    forwardAddress: panelEl?.querySelector('#stickerForwardAddr')?.value || null,
    startDate: panelEl?.querySelector('#stickerStartDate')?.value || null,
    expirationDate: panelEl?.querySelector('#stickerExpDate')?.value || null,
    details: panelEl?.querySelector('#stickerNotes')?.value || '',
    label: panelEl?.querySelector('#stickerCustomLabel')?.value || undefined,
  });

  pendingChanges.stickers.push(sticker);
  renderStickers(pendingChanges.stickers);
  panelEl?.querySelector('#addStickerForm')?.classList.add('hidden');
}

// ============================================================
// Form Binding
// ============================================================

function bindEditorEvents() {
  const panel = panelEl;
  if (!panel) return;

  panel.querySelector('#closePanelBtn')?.addEventListener('click', closeCellEditor);
  panel.querySelector('#saveBtn')?.addEventListener('click', () => { saveCell(); closeCellEditor(); });
  panel.querySelector('#cancelBtn')?.addEventListener('click', () => { pendingChanges = null; closeCellEditor(); });
  panel.querySelector('#clearBtn')?.addEventListener('click', () => {
    if (confirm('Clear this cell?')) {
      dispatch('CLEAR_CELL', { cellId: currentCellId });
      closeCellEditor();
    }
  });
  panel.querySelector('#addStickerBtn')?.addEventListener('click', showAddStickerForm);

  // Input change handlers
  const updatePending = () => {
    if (!pendingChanges) return;
    pendingChanges.address.addressNumber = panel.querySelector('#editAddrNum')?.value || '';
    pendingChanges.address.streetName = panel.querySelector('#editStreetName')?.value || '';
    pendingChanges.address.unit = panel.querySelector('#editUnit')?.value || null;
    pendingChanges.address.notes = panel.querySelector('#editNotes')?.value || '';
    pendingChanges.widthInches = parseInt(panel.querySelector('#editWidth')?.value) || 1;
    updatePreview();
  };

  ['editAddrNum', 'editStreetName', 'editUnit', 'editNotes', 'editWidth'].forEach(id => {
    panel.querySelector(`#${id}`)?.addEventListener('input', updatePending);
    panel.querySelector(`#${id}`)?.addEventListener('change', updatePending);
  });
}

function selectColor(color) {
  if (!pendingChanges) return;
  pendingChanges.streetColor = color;

  // Update swatch selection
  panelEl?.querySelectorAll('.color-swatch').forEach(s => {
    s.classList.toggle('selected', s.dataset.color === color);
  });

  updatePreview();
}

function updatePreview() {
  if (!panelEl || !pendingChanges) return;
  const previewEl = panelEl.querySelector('#cellPreview');
  const numEl = panelEl.querySelector('.cell-preview-num');
  const streetEl = panelEl.querySelector('.cell-preview-street');

  if (previewEl) previewEl.style.setProperty('--preview-color', pendingChanges.streetColor || '#3d2e00');
  if (numEl) numEl.textContent = pendingChanges.address.addressNumber || '---';
  if (streetEl) streetEl.textContent = pendingChanges.address.streetName || '';
}

function setupFormListeners() {
  // Handled in bindEditorEvents per panel render
}

// ============================================================
// Cell Navigation
// ============================================================

function getAdjacentCellId(cellId, direction) {
  const state = getState();
  const allCells = [];
  for (const wing of state.config.wings) {
    for (const shelf of wing.shelves) {
      for (const cell of shelf.cells) {
        if (cell.type === 'address') allCells.push(cell.id);
      }
    }
  }
  const idx = allCells.indexOf(cellId);
  if (idx === -1) return null;
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= allCells.length) return null;
  return allCells[newIdx];
}
