/**
 * Edit Book Assist — Equipment Builder Mode
 *
 * Add, remove, or swap wing equipment pieces.
 */

import { dispatch, getState, eventBus, EQUIPMENT_SPECS } from './models.js';
import { fullRender } from './renderer.js';

let contextMenuEl = null;
let activeWingId = null;

export function initEquipmentMode() {
  contextMenuEl = document.getElementById('contextMenu');

  // Close context menu on click outside
  document.addEventListener('click', (e) => {
    if (contextMenuEl && !contextMenuEl.contains(e.target)) {
      hideContextMenu();
    }
  });

  // Listen for wing body clicks
  eventBus.on('wing-body-click', ({ wingId, x, y }) => {
    if (getState().mode === 'equipment') {
      showContextMenu(wingId, x, y);
    }
  });
}

export function activateEquipmentMode() {
  document.querySelector('.app-container')?.classList.add('mode-equipment');
}

export function deactivateEquipmentMode() {
  document.querySelector('.app-container')?.classList.remove('mode-equipment');
  hideContextMenu();
}

export function showContextMenu(wingId, x, y) {
  if (!contextMenuEl) return;
  activeWingId = wingId;

  const state = getState();
  const wing = state.config.wings.find(w => w.id === wingId);
  if (!wing) return;

  // Build menu content
  const otherTypes = Object.keys(EQUIPMENT_SPECS).filter(t => t !== wing.equipmentType);

  let html = `<div class="context-menu-title">${wing.label} \u2014 ${wing.equipmentType}</div>`;

  otherTypes.forEach(type => {
    const spec = EQUIPMENT_SPECS[type];
    html += `<div class="context-menu-item" data-action="change" data-type="${type}">Change to ${type} (${spec.cellsPerShelf}/shelf)</div>`;
  });

  html += `<div class="context-menu-divider"></div>`;

  if (state.config.wings.length > 1) {
    html += `<div class="context-menu-item danger" data-action="remove">Remove this wing</div>`;
  }

  if (state.config.wings.length < 4) {
    html += `<div class="context-menu-divider"></div>`;
    Object.keys(EQUIPMENT_SPECS).forEach(type => {
      html += `<div class="context-menu-item" data-action="add" data-type="${type}">Add ${type} wing</div>`;
    });
  }

  const cellCount = wing.shelves.reduce((sum, s) => sum + s.cells.filter(c => c.address).length, 0);
  html += `<div class="context-menu-info">${wing.totalCells} cells \u00B7 ${wing.cellsPerShelf}/shelf \u00B7 ${cellCount} addresses</div>`;

  contextMenuEl.innerHTML = html;
  contextMenuEl.style.left = `${x}px`;
  contextMenuEl.style.top = `${y}px`;
  contextMenuEl.classList.add('show');

  // Bind click handlers
  contextMenuEl.querySelectorAll('.context-menu-item').forEach(item => {
    item.addEventListener('click', handleContextMenuClick);
  });
}

export function hideContextMenu() {
  if (contextMenuEl) {
    contextMenuEl.classList.remove('show');
    activeWingId = null;
  }
}

function handleContextMenuClick(e) {
  const action = e.target.dataset.action;
  const type = e.target.dataset.type;

  switch (action) {
    case 'change':
      changeEquipment(activeWingId, type);
      break;
    case 'remove':
      removeWing(activeWingId);
      break;
    case 'add':
      addWing(type);
      break;
  }

  hideContextMenu();
}

function changeEquipment(wingId, newType) {
  const state = getState();
  const wing = state.config.wings.find(w => w.id === wingId);
  if (!wing) return;

  const addressCount = wing.shelves.reduce((sum, s) =>
    sum + s.cells.filter(c => c.address).length, 0);

  const newSpec = EQUIPMENT_SPECS[newType];
  const oldSpec = EQUIPMENT_SPECS[wing.equipmentType];

  if (newSpec.cellsPerShelf < oldSpec.cellsPerShelf && addressCount > 0) {
    const willDisplace = addressCount - (newSpec.cellsPerShelf * 6);
    if (willDisplace > 0 && !confirm(`This change may displace up to ${willDisplace} addresses. Proceed?`)) {
      return;
    }
  }

  dispatch('CHANGE_EQUIPMENT', { wingId, equipmentType: newType });
  fullRender(state);
}

function removeWing(wingId) {
  const state = getState();
  const wing = state.config.wings.find(w => w.id === wingId);
  if (!wing) return;

  const addressCount = wing.shelves.reduce((sum, s) =>
    sum + s.cells.filter(c => c.address).length, 0);

  if (addressCount > 0) {
    if (!confirm(`This wing has ${addressCount} addresses. They will be unassigned. Proceed?`)) {
      return;
    }
  }

  dispatch('REMOVE_WING', { wingId });
  fullRender(state);
}

function addWing(equipmentType) {
  const state = getState();
  const pos = state.config.wings.length;
  const labels = ['Left Wing', 'Middle Wing', 'Right Wing', 'Extra Wing'];

  dispatch('ADD_WING', {
    equipmentType,
    label: labels[pos] || `Wing ${pos + 1}`,
  });
  fullRender(state);
}
