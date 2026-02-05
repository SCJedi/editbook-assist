// datafile.js - Save/Load data file module for USPS Edit Book Assist

import { getRouteInfo, applyToCase } from './editbook.js';
import { refreshCaseView } from './nav.js';

const MAX_BACKUPS = 5;
const AUTOSAVE_INTERVAL = 120000; // 2 minutes
const BACKUPS_KEY = 'editbook-backups';
const PENDING_APPLY_KEY = 'editbook-pending-apply';

let currentFileName = '';
let lastSnapshotHash = '';

// Collect all app data into a single object
function collectSnapshot() {
  return {
    version: 1,
    exportDate: new Date().toISOString(),
    fileName: currentFileName,
    routeInfo: JSON.parse(localStorage.getItem('editbook-route-info') || '{}'),
    equipment: JSON.parse(localStorage.getItem('editbook-equipment-config') || '[null,null,null,null]'),
    addresses: JSON.parse(localStorage.getItem('editbook-addresses') || '[]'),
    annotations: JSON.parse(localStorage.getItem('editbook-address-annotations') || '{}'),
    streetColors: JSON.parse(localStorage.getItem('editbook-street-colors') || '{}')
  };
}

// Quick hash of current localStorage data to detect changes
function snapshotHash() {
  const keys = [
    'editbook-route-info', 'editbook-equipment-config', 'editbook-addresses',
    'editbook-address-annotations', 'editbook-street-colors'
  ];
  return keys.map(k => localStorage.getItem(k) || '').join('|');
}

// Store a backup snapshot in localStorage (max 5, oldest dropped)
function saveBackup() {
  try {
    const backups = JSON.parse(localStorage.getItem(BACKUPS_KEY) || '[]');
    backups.push({
      timestamp: new Date().toISOString(),
      fileName: currentFileName,
      data: collectSnapshot()
    });
    while (backups.length > MAX_BACKUPS) {
      backups.shift();
    }
    localStorage.setItem(BACKUPS_KEY, JSON.stringify(backups));
    lastSnapshotHash = snapshotHash();
  } catch (e) {
    // Storage quota exceeded — silently fail
  }
}

// Auto-save only if data changed since last snapshot
function autoSave() {
  const currentHash = snapshotHash();
  if (currentHash !== lastSnapshotHash) {
    saveBackup();
  }
}

/**
 * Initialize data file module
 */
export function initDataFile() {
  const btnSaveFile = document.getElementById('btnSaveFile');
  const btnOpenFile = document.getElementById('btnOpenFile');
  const fileInput = document.getElementById('fileInput');

  if (btnSaveFile) btnSaveFile.addEventListener('click', saveDataFile);

  if (btnOpenFile) {
    btnOpenFile.addEventListener('click', () => {
      if (fileInput) fileInput.click();
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) loadDataFile(file);
      e.target.value = '';
    });
  }

  // Load saved filename
  const savedFileName = localStorage.getItem('editbook-filename');
  if (savedFileName) currentFileName = savedFileName;

  // Auto-apply on every startup so case view is always populated
  const afterFileLoad = !!localStorage.getItem(PENDING_APPLY_KEY);
  if (afterFileLoad) localStorage.removeItem(PENDING_APPLY_KEY);

  const result = applyToCase();
  if (result) {
    refreshCaseView();
    if (afterFileLoad) {
      showToast(`Applied ${result.placed} of ${result.total} addresses to case`);
    }
  }

  // Initialize hash for change detection
  lastSnapshotHash = snapshotHash();

  // Periodic auto-save (every 2 minutes if data changed)
  setInterval(autoSave, AUTOSAVE_INTERVAL);

  // Auto-save when leaving/hiding page
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') autoSave();
  });
}

/**
 * Save all app data to JSON file and trigger download
 */
export function saveDataFile() {
  if (!currentFileName && !localStorage.getItem('editbook-filename')) {
    const baseName = prompt('Enter a name for this route (e.g., "MyRoute"):');
    if (!baseName) return;
    currentFileName = baseName.trim();
    localStorage.setItem('editbook-filename', currentFileName);
  } else if (!currentFileName) {
    currentFileName = localStorage.getItem('editbook-filename') || '';
  }

  const routeInfo = getRouteInfo();
  const zip = routeInfo.zip || '00000';

  const now = new Date();
  const y = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mi = String(now.getMinutes()).padStart(2, '0');
  const filename = `${currentFileName}_${zip}_${y}-${mo}-${d}_${h}${mi}.json`;

  const data = collectSnapshot();

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  // Also store as localStorage backup
  saveBackup();

  showToast(`File saved: ${filename}`);
}

/**
 * Load data from JSON file, write to localStorage, and reload page
 * @param {File} file
 */
export function loadDataFile(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.version) {
        showToast('Invalid file format');
        return;
      }

      // Backup current state before overwriting
      saveBackup();

      localStorage.setItem('editbook-route-info', JSON.stringify(data.routeInfo || {}));
      localStorage.setItem('editbook-equipment-config', JSON.stringify(data.equipment || [null, null, null, null]));
      localStorage.setItem('editbook-addresses', JSON.stringify(data.addresses || []));
      localStorage.setItem('editbook-address-annotations', JSON.stringify(data.annotations || {}));
      localStorage.setItem('editbook-street-colors', JSON.stringify(data.streetColors || {}));
      localStorage.setItem('editbook-filename', data.fileName || '');

      // Flag to auto-apply after reload
      localStorage.setItem(PENDING_APPLY_KEY, 'true');

      showToast(`File loaded: ${file.name}`);
      setTimeout(() => { location.reload(); }, 500);
    } catch (error) {
      showToast('Error loading file: ' + error.message);
    }
  };

  reader.onerror = () => { showToast('Error reading file'); };
  reader.readAsText(file);
}

/**
 * Show a temporary toast notification
 * @param {string} msg
 */
export function showToast(msg) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => { container.removeChild(toast); }, 400);
  }, 3000);
}
