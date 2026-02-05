/**
 * Edit Book Assist — App Entry Point
 *
 * Equipment selection screen. Handles slot pickers, renders equipment
 * details, and updates the case info bar. Persists config to localStorage.
 */

import {
  EQUIPMENT_SPECS,
  EQUIPMENT_OPTIONS,
  SHELF_COUNT,
  RESERVED_STATUS_CODES,
  getCaseStats,
} from './models.js';

import { initSettings } from './settings.js';
import { initNav, refreshCaseView } from './nav.js';
import { initEditBook, getAddresses } from './editbook.js';
import { initStreets } from './streets.js';
import { initAddressDetail } from './addressDetail.js';
import { cleanupOrphans } from './annotations.js';
import { initDataFile } from './datafile.js';

// --- State: 4 equipment slots ---
export const slots = [null, null, null, null];

const STORAGE_KEY = 'editbook-equipment-config';

// --- SVG icons for equipment types ---
const ICONS = {
  null: `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="4" width="20" height="20" rx="2" stroke="#3d2e00" stroke-width="1.5" stroke-dasharray="3 3"/>
    <line x1="10" y1="14" x2="18" y2="14" stroke="#3d2e00" stroke-width="1.5"/>
  </svg>`,
  '124-D': `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="22" height="22" rx="2" stroke="#daa520" stroke-width="1.5"/>
    <line x1="3" y1="7" x2="25" y2="7" stroke="#8b6914" stroke-width="0.75"/>
    <line x1="3" y1="11" x2="25" y2="11" stroke="#8b6914" stroke-width="0.75"/>
    <line x1="3" y1="15" x2="25" y2="15" stroke="#8b6914" stroke-width="0.75"/>
    <line x1="3" y1="19" x2="25" y2="19" stroke="#8b6914" stroke-width="0.75"/>
    <line x1="3" y1="23" x2="25" y2="23" stroke="#8b6914" stroke-width="0.75"/>
  </svg>`,
  '143-D': `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="7" y="3" width="14" height="22" rx="2" stroke="#daa520" stroke-width="1.5"/>
    <line x1="7" y1="7" x2="21" y2="7" stroke="#8b6914" stroke-width="0.75"/>
    <line x1="7" y1="11" x2="21" y2="11" stroke="#8b6914" stroke-width="0.75"/>
    <line x1="7" y1="15" x2="21" y2="15" stroke="#8b6914" stroke-width="0.75"/>
    <line x1="7" y1="19" x2="21" y2="19" stroke="#8b6914" stroke-width="0.75"/>
    <line x1="7" y1="23" x2="21" y2="23" stroke="#8b6914" stroke-width="0.75"/>
  </svg>`,
  '144-D': `<svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="22" height="18" rx="2" stroke="#daa520" stroke-width="1.5"/>
    <line x1="3" y1="6.5" x2="25" y2="6.5" stroke="#8b6914" stroke-width="0.75"/>
    <line x1="3" y1="10" x2="25" y2="10" stroke="#8b6914" stroke-width="0.75"/>
    <line x1="3" y1="13.5" x2="25" y2="13.5" stroke="#8b6914" stroke-width="0.75"/>
    <line x1="3" y1="17" x2="25" y2="17" stroke="#8b6914" stroke-width="0.75"/>
    <rect x="3" y="22" width="22" height="4" rx="1" stroke="#daa520" stroke-width="1" fill="#1a1200"/>
  </svg>`,
};

// ============================================================
// localStorage Persistence
// ============================================================

function loadConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length === 4) {
        for (let i = 0; i < 4; i++) {
          const val = parsed[i];
          slots[i] = (val && EQUIPMENT_SPECS[val]) ? val : null;
        }
      }
    }
  } catch (e) {
    // Ignore corrupt data
  }
}

function saveConfig() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
  } catch (e) {
    // Ignore storage errors
  }
}

// ============================================================
// Boot
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  initSettings();
  loadConfig();
  bindPickers();
  bindSaveButton();
  renderAll();
  initNav();
  initEditBook(slots);
  initStreets();
  initAddressDetail();
  cleanupOrphans(getAddresses().map(a => a.id));
  initDataFile();
  
  // Register service worker for offline capability
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              // Import showToast if available
              import('./datafile.js').then(m => {
                m.showToast('App updated — reload for latest');
              });
            }
          });
        });
      })
      .catch(err => console.error('SW registration failed:', err));
  }
});

// ============================================================
// Save Button
// ============================================================

function bindSaveButton() {
  const btn = document.getElementById('btnSave');
  if (!btn) return;
  btn.addEventListener('click', () => {
    saveConfig();
    btn.textContent = 'SAVED';
    btn.classList.add('saved');
    setTimeout(() => {
      btn.textContent = 'SAVE';
      btn.classList.remove('saved');
    }, 2000);
  });
}

// ============================================================
// Picker Logic
// ============================================================

let openDropdown = null;
let openDropdownSlot = -1;

function bindPickers() {
  document.querySelectorAll('.equip-picker').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const slotIdx = parseInt(btn.dataset.slot);
      toggleDropdown(slotIdx);
    });
  });

  // Close dropdown on outside click
  document.addEventListener('click', () => {
    closeDropdown();
  });
}

function toggleDropdown(slotIdx) {
  const slotEl = document.querySelector(`.equip-slot[data-slot="${slotIdx}"]`);
  if (!slotEl) return;

  // If this slot's dropdown is already open, close it
  if (openDropdown && openDropdownSlot === slotIdx) {
    closeDropdown();
    return;
  }

  // Close any existing
  closeDropdown();

  const dropdown = document.createElement('div');
  dropdown.className = 'equip-options open';

  EQUIPMENT_OPTIONS.forEach(type => {
    const opt = document.createElement('div');
    opt.className = 'equip-option';
    if (type === slots[slotIdx]) opt.classList.add('selected');

    const label = type ? EQUIPMENT_SPECS[type].label : 'None';
    opt.textContent = label;

    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      slots[slotIdx] = type;
      closeDropdown();
      renderAll();
      saveConfig();
      refreshCaseView();
    });

    dropdown.appendChild(opt);
  });

  const pickerBtn = slotEl.querySelector('.equip-picker');
  pickerBtn.appendChild(dropdown);
  slotEl.classList.add('dropdown-open');
  openDropdown = dropdown;
  openDropdownSlot = slotIdx;
}

function closeDropdown() {
  if (openDropdown) {
    const slotEl = openDropdown.closest('.equip-slot');
    if (slotEl) slotEl.classList.remove('dropdown-open');
    openDropdown.remove();
    openDropdown = null;
    openDropdownSlot = -1;
  }
}

// ============================================================
// Rendering
// ============================================================

function renderAll() {
  renderSlots();
  renderCaseInfo();
}

function renderSlots() {
  for (let i = 0; i < 4; i++) {
    const slotEl = document.querySelector(`.equip-slot[data-slot="${i}"]`);
    if (!slotEl) continue;

    const type = slots[i];
    const spec = type ? EQUIPMENT_SPECS[type] : null;
    const picker = slotEl.querySelector('.equip-picker');
    const body = slotEl.querySelector('.equip-body');

    // Update picker icon + name
    const iconEl = picker.querySelector('.equip-icon');
    const nameEl = picker.querySelector('.equip-name');
    iconEl.innerHTML = ICONS[type] || ICONS[null];
    nameEl.textContent = spec ? type : 'NONE';

    // Toggle active state
    slotEl.classList.toggle('active', !!spec);

    // Render body
    if (!spec) {
      body.className = 'equip-body empty';
      body.innerHTML = '';
    } else {
      body.className = 'equip-body';
      body.innerHTML = renderEquipmentBody(i, type, spec);
    }
  }
}

function renderEquipmentBody(slotIdx, type, spec) {
  // Determine which reserved cells are on this slot
  const stats = getCaseStats(slots);
  const reserved = stats.reserved;

  // Check if this is the leftmost or rightmost occupied slot
  let isLeftmost = true;
  for (let j = 0; j < slotIdx; j++) {
    if (slots[j]) { isLeftmost = false; break; }
  }
  let isRightmost = true;
  for (let j = slotIdx + 1; j < 4; j++) {
    if (slots[j]) { isRightmost = false; break; }
  }

  let html = '';

  // Detail title
  html += `<div class="equip-detail-title">${esc(spec.label)}</div>`;

  // Detail grid
  html += `<div class="equip-detail-grid">`;
  html += `<span class="equip-detail-label">Type</span><span class="equip-detail-value">${esc(type)}</span>`;
  html += `<span class="equip-detail-label">Cells/Shelf</span><span class="equip-detail-value">${spec.cellsPerShelf}</span>`;
  html += `<span class="equip-detail-label">Total Cells</span><span class="equip-detail-value">${spec.totalCells}</span>`;
  html += `<span class="equip-detail-label">Desk</span><span class="equip-detail-value">${spec.hasDesk ? 'Yes' : 'No'}</span>`;
  html += `</div>`;

  // Visual shelves (6, top=shelf 6, bottom=shelf 1)
  html += `<div class="equip-shelves">`;
  for (let s = SHELF_COUNT; s >= 1; s--) {
    let shelfLabel = `S${s} \u2014 ${spec.cellsPerShelf} cells`;
    let reservedTag = '';
    let hasReserved = false;

    // Form 3982 on leftmost wing, all shelves
    if (isLeftmost) {
      reservedTag += `<span class="shelf-reserved-tag">3982</span>`;
      hasReserved = true;
    }

    // Status codes on rightmost wing, shelf 1
    if (isRightmost && s === 1) {
      const scWidth = RESERVED_STATUS_CODES.reduce((sum, r) => sum + r.width, 0);
      reservedTag += `<span class="shelf-reserved-tag">${scWidth} STATUS</span>`;
      hasReserved = true;
    }

    html += `<div class="equip-shelf${hasReserved ? ' has-reserved' : ''}">${shelfLabel}${reservedTag}</div>`;
  }
  html += `</div>`;

  return html;
}

function renderCaseInfo() {
  const stats = getCaseStats(slots);

  // Equipment names
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(`infoSlot${i}`);
    if (el) el.textContent = stats.slots[i];
  }

  // Cell counts
  setText('infoTotalCells', stats.totalCells);
  setText('infoUsableCells', stats.usableCells);
  setText('infoReservedCells', stats.reservedCells);
  setText('infoCellsAvailable', stats.cellsAvailable);
  setText('infoAddresses', stats.totalAddresses);

  // Reserved detail
  const reservedGrid = document.getElementById('infoReservedDetail');
  if (reservedGrid) {
    let html = '';
    const r = stats.reserved;

    if (r.form3982.count > 0) {
      html += `<div class="info-row"><span class="info-label">Form 3982</span><span class="info-value">${r.form3982.count} cells</span></div>`;
    }
    for (const sc of r.statusCodes) {
      html += `<div class="info-row"><span class="info-label">${esc(sc.label)}</span><span class="info-value">${sc.width}" &mdash; ${esc(sc.location)}</span></div>`;
    }
    if (!html) {
      html = `<div class="info-row"><span class="info-label">No equipment selected</span></div>`;
    }
    reservedGrid.innerHTML = html;
  }
}

// ============================================================
// Utilities
// ============================================================

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(value);
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
