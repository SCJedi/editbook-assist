/**
 * Edit Book Assist — Persistence
 *
 * localStorage auto-save, JSON import/export, route management.
 */

import { getState, dispatch, eventBus, createDefaultConfig, placeAddresses, getSampleAddresses } from './models.js';

const STORAGE_KEY = 'editbook-assist-state';
const STORAGE_VERSION = 1;

let saveTimer = null;

export function initPersistence() {
  // Auto-save on state changes (debounced 500ms)
  eventBus.on('state-changed', ({ action }) => {
    if (['SET_MODE', 'SET_VIEW', 'SET_SELECTION', 'SET_HOVER'].includes(action)) return;
    debouncedSave();
  });
}

// ============================================================
// Save / Load
// ============================================================

function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const state = getState();
    if (state) save(state);
  }, 500);
}

export function save(state) {
  try {
    const routeId = state.config.routeId || 'default';
    const key = `${STORAGE_KEY}-${routeId}`;

    const serialized = {
      version: STORAGE_VERSION,
      timestamp: new Date().toISOString(),
      config: state.config,
      alerts: state.alerts || [],
    };

    localStorage.setItem(key, JSON.stringify(serialized));
    return true;
  } catch (err) {
    console.error('Save failed:', err);
    return false;
  }
}

export function load(routeId) {
  try {
    const key = `${STORAGE_KEY}-${routeId || 'default'}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    if (parsed.version !== STORAGE_VERSION) {
      return migrate(parsed);
    }

    return parsed;
  } catch (err) {
    console.error('Load failed:', err);
    return null;
  }
}

function migrate(data) {
  // Future schema migrations go here
  // For now, return as-is
  return data;
}

export function forceSave() {
  const state = getState();
  if (state) {
    save(state);
    showToast('Configuration saved', 'success');
  }
}

// ============================================================
// Export
// ============================================================

export function exportJSON() {
  const state = getState();
  if (!state) return;

  const exportData = {
    version: '1.0',
    routeId: state.config.routeId,
    exportDate: new Date().toISOString(),
    configuration: {
      wings: state.config.wings.map(w => ({
        position: w.position,
        equipmentType: w.equipmentType,
        label: w.label,
      })),
    },
    addresses: [],
  };

  // Collect all addresses
  for (const wing of state.config.wings) {
    for (const shelf of wing.shelves) {
      for (const cell of shelf.cells) {
        if (cell.type === 'address' && cell.address) {
          exportData.addresses.push({
            sequence: cell.address.deliveryPointSequence,
            addressNumber: cell.address.addressNumber,
            streetName: cell.address.streetName,
            streetColor: cell.streetColor,
            unit: cell.address.unit,
            widthInches: cell.widthInches,
            notes: cell.address.notes,
            stickers: cell.stickers.map(s => ({
              type: s.type,
              label: s.label,
              details: s.details,
              startDate: s.startDate,
              expirationDate: s.expirationDate,
              forwardAddress: s.forwardAddress,
            })),
          });
        }
      }
    }
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `editbook-${state.config.routeId}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);

  showToast('Configuration exported', 'success');
}

// ============================================================
// Import
// ============================================================

export function importJSON(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      processImportedJSON(data);
    } catch (err) {
      showToast('Invalid JSON file', 'error');
      console.error('Import failed:', err);
    }
  };
  reader.readAsText(file);
}

function processImportedJSON(data) {
  if (!data.configuration || !data.addresses) {
    showToast('Invalid file format', 'error');
    return;
  }

  // Create config from imported data
  const config = createDefaultConfig();
  config.routeId = data.routeId || config.routeId;

  // Rebuild wings if specified
  if (data.configuration.wings) {
    // This is simplified — full implementation would rebuild wings
    // For now, we keep default wings and just place addresses
  }

  // Place addresses
  const addresses = data.addresses.map(a => ({
    seq: a.sequence || 0,
    number: a.addressNumber,
    street: a.streetName,
    color: a.streetColor || '#4488ff',
    width: a.widthInches || 1,
    stickers: (a.stickers || []).map(s => ({
      type: s.type,
      expirationDate: s.expirationDate,
      details: s.details,
      forwardAddress: s.forwardAddress,
    })),
  }));

  const displaced = placeAddresses(config, addresses);

  dispatch('REPLACE_CONFIG', { config });

  if (displaced.length > 0) {
    showToast(`Imported with ${displaced.length} displaced addresses`, 'error');
  } else {
    showToast(`Imported ${addresses.length} addresses`, 'success');
  }
}

export function importCSV(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const text = e.target.result;
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      const addresses = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        const row = {};
        headers.forEach((h, j) => { row[h] = cols[j] || ''; });

        addresses.push({
          seq: parseInt(row.sequence) || i,
          number: row.addressnumber || row.address || '',
          street: row.streetname || row.street || '',
          color: row.streetcolor || '#4488ff',
          width: parseInt(row.widthinches || row.width) || 1,
          stickers: [],
        });
      }

      const config = createDefaultConfig();
      const displaced = placeAddresses(config, addresses);
      dispatch('REPLACE_CONFIG', { config });

      if (displaced.length > 0) {
        showToast(`Imported ${addresses.length - displaced.length} addresses (${displaced.length} displaced)`, 'error');
      } else {
        showToast(`Imported ${addresses.length} addresses`, 'success');
      }
    } catch (err) {
      showToast('Invalid CSV file', 'error');
      console.error('CSV import failed:', err);
    }
  };
  reader.readAsText(file);
}

// ============================================================
// Route Management
// ============================================================

export function getRouteList() {
  const routes = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(STORAGE_KEY + '-')) {
      try {
        const data = JSON.parse(localStorage.getItem(key));
        const routeId = key.replace(STORAGE_KEY + '-', '');
        routes.push({
          routeId,
          modifiedAt: data.timestamp || 'Unknown',
        });
      } catch { /* skip invalid entries */ }
    }
  }
  return routes;
}

export function switchRoute(routeId) {
  // Save current first
  const state = getState();
  if (state) save(state);

  // Load target
  const data = load(routeId);
  if (data && data.config) {
    dispatch('REPLACE_CONFIG', { config: data.config });
    showToast(`Switched to route ${routeId}`, 'success');
  } else {
    showToast(`Route ${routeId} not found`, 'error');
  }
}

export function deleteRoute(routeId) {
  if (!confirm(`Delete saved route ${routeId}?`)) return;
  const key = `${STORAGE_KEY}-${routeId}`;
  localStorage.removeItem(key);
  showToast(`Route ${routeId} deleted`, 'success');
}

// ============================================================
// Toast Notifications
// ============================================================

function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 200ms ease-out';
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}
