/**
 * Settings & Theme System
 * Manages CSS custom properties and JS color defaults with preset support
 */

// ============================================================
// Constants & Defaults
// ============================================================

const DEFAULT_THEME = {
  '--bg': '#000',
  '--bg-panel': '#0a0a00',
  '--text': '#daa520',
  '--text-dim': '#8b6914',
  '--text-bright': '#ffe082',
  '--amber': '#daa520',
  '--amber-bright': '#ffc107',
  '--amber-dim': '#8b6914',
  '--amber-faint': '#3d2e00',
  '--border': '#3d2e00'
};

const DEFAULT_JS_COLORS = {
  'tag-font': '#daa520',
  'tag-bg': '#3d2e00',
  'highlight-bg': '#ff6b6b',
  'highlight-font': '#ffffff'
};

const PROPERTY_LABELS = {
  '--bg': 'Background',
  '--bg-panel': 'Panel Background',
  '--text': 'Text',
  '--text-dim': 'Text (Dim)',
  '--text-bright': 'Text (Bright)',
  '--amber': 'Amber',
  '--amber-bright': 'Amber (Bright)',
  '--amber-dim': 'Amber (Dim)',
  '--amber-faint': 'Amber (Faint)',
  '--border': 'Border',
  'tag-font': 'Tag Font Color',
  'tag-bg': 'Tag Background',
  'highlight-bg': 'Highlight Background',
  'highlight-font': 'Highlight Font Color'
};

const STORAGE_KEYS = {
  theme: 'editbook-theme',
  presets: 'editbook-theme-presets',
  activePreset: 'editbook-theme-active-preset'
};

// Internal state
let currentJsColors = { ...DEFAULT_JS_COLORS };

// ============================================================
// Theme Application
// ============================================================

export function applyTheme(theme) {
  const root = document.documentElement;

  // Apply CSS custom properties
  for (const [key, value] of Object.entries(theme)) {
    if (key.startsWith('--')) {
      root.style.setProperty(key, value);
    } else {
      // JS colors stored in module state
      currentJsColors[key] = value;
    }
  }
}

export function getJsColor(key) {
  return currentJsColors[key] || DEFAULT_JS_COLORS[key];
}

// ============================================================
// Persistence
// ============================================================

export function loadTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.theme);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults for any missing keys
      const merged = { ...DEFAULT_THEME, ...DEFAULT_JS_COLORS, ...parsed };
      return merged;
    }
  } catch (e) {
    console.error('Failed to load theme:', e);
  }
  return { ...DEFAULT_THEME, ...DEFAULT_JS_COLORS };
}

export function saveTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, JSON.stringify(theme));
  } catch (e) {
    console.error('Failed to save theme:', e);
  }
}

function loadPresets() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.presets);
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.error('Failed to load presets:', e);
    return {};
  }
}

function savePresets(presets) {
  try {
    localStorage.setItem(STORAGE_KEYS.presets, JSON.stringify(presets));
  } catch (e) {
    console.error('Failed to save presets:', e);
  }
}

function getActivePreset() {
  try {
    return localStorage.getItem(STORAGE_KEYS.activePreset);
  } catch (e) {
    return null;
  }
}

function setActivePreset(name) {
  try {
    if (name === null) {
      localStorage.removeItem(STORAGE_KEYS.activePreset);
    } else {
      localStorage.setItem(STORAGE_KEYS.activePreset, name);
    }
  } catch (e) {
    console.error('Failed to save active preset:', e);
  }
}

// ============================================================
// Initialization
// ============================================================

export function initSettings() {
  const theme = loadTheme();
  applyTheme(theme);
}

// ============================================================
// Preset Management
// ============================================================

function getCurrentTheme() {
  const root = document.documentElement;
  const theme = {};

  // Get CSS custom properties
  for (const key of Object.keys(DEFAULT_THEME)) {
    theme[key] = root.style.getPropertyValue(key) || DEFAULT_THEME[key];
  }

  // Get JS colors
  for (const key of Object.keys(DEFAULT_JS_COLORS)) {
    theme[key] = currentJsColors[key] || DEFAULT_JS_COLORS[key];
  }

  return theme;
}

function saveCurrentAsPreset(name) {
  const presets = loadPresets();
  const theme = getCurrentTheme();

  presets[name] = theme;
  savePresets(presets);
  setActivePreset(name);
  saveTheme(theme);
}

function loadPreset(name) {
  const presets = loadPresets();
  const preset = presets[name];

  if (preset) {
    applyTheme(preset);
    saveTheme(preset);
    setActivePreset(name);
  }
}

function deletePreset(name) {
  const presets = loadPresets();
  delete presets[name];
  savePresets(presets);

  if (getActivePreset() === name) {
    setActivePreset(null);
  }
}

function renamePreset(oldName, newName) {
  const presets = loadPresets();

  if (presets[oldName]) {
    presets[newName] = presets[oldName];
    delete presets[oldName];
    savePresets(presets);

    if (getActivePreset() === oldName) {
      setActivePreset(newName);
    }
  }
}

function resetToDefaults() {
  const defaults = { ...DEFAULT_THEME, ...DEFAULT_JS_COLORS };
  applyTheme(defaults);
  saveTheme(defaults);
  setActivePreset(null);
}

// ============================================================
// UI Rendering
// ============================================================

export function renderSettingsScreen() {
  renderPresetBar();
  renderThemeColors();
  renderAnnotationColors();
}

function renderPresetBar() {
  const presets = loadPresets();
  const activePreset = getActivePreset();

  const select = document.getElementById('settingsPresetSelect');
  if (!select) return;

  // Build options
  let html = '<option value="">Custom</option>';
  for (const name of Object.keys(presets).sort()) {
    const selected = name === activePreset ? 'selected' : '';
    html += `<option value="${esc(name)}" ${selected}>${esc(name)}</option>`;
  }
  select.innerHTML = html;

  // Bind preset controls
  bindPresetControls();
}

function bindPresetControls() {
  const select = document.getElementById('settingsPresetSelect');
  const btnSave = document.getElementById('btnPresetSave');
  const btnSaveAs = document.getElementById('btnPresetSaveAs');
  const btnRename = document.getElementById('btnPresetRename');
  const btnDelete = document.getElementById('btnPresetDelete');
  const btnReset = document.getElementById('btnPresetReset');

  if (select) {
    select.addEventListener('change', () => {
      const name = select.value;
      if (name) {
        loadPreset(name);
        renderSettingsScreen();
      }
    });
  }

  if (btnSave) {
    btnSave.addEventListener('click', () => {
      const activePreset = getActivePreset();
      if (activePreset) {
        saveCurrentAsPreset(activePreset);
        showToast('Preset saved');
      } else {
        const name = prompt('Enter preset name:');
        if (name && name.trim()) {
          saveCurrentAsPreset(name.trim());
          renderSettingsScreen();
          showToast('Preset saved');
        }
      }
    });
  }

  if (btnSaveAs) {
    btnSaveAs.addEventListener('click', () => {
      const name = prompt('Enter new preset name:');
      if (name && name.trim()) {
        saveCurrentAsPreset(name.trim());
        renderSettingsScreen();
        showToast('Preset saved');
      }
    });
  }

  if (btnRename) {
    btnRename.addEventListener('click', () => {
      const activePreset = getActivePreset();
      if (!activePreset) {
        alert('No preset selected');
        return;
      }

      const newName = prompt('Enter new name:', activePreset);
      if (newName && newName.trim() && newName !== activePreset) {
        renamePreset(activePreset, newName.trim());
        renderSettingsScreen();
        showToast('Preset renamed');
      }
    });
  }

  if (btnDelete) {
    btnDelete.addEventListener('click', () => {
      const activePreset = getActivePreset();
      if (!activePreset) {
        alert('No preset selected');
        return;
      }

      if (confirm(`Delete preset "${activePreset}"?`)) {
        deletePreset(activePreset);
        renderSettingsScreen();
        showToast('Preset deleted');
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('Reset all colors to default?')) {
        resetToDefaults();
        renderSettingsScreen();
        showToast('Reset to defaults');
      }
    });
  }
}

function renderThemeColors() {
  const container = document.getElementById('settingsThemeColors');
  if (!container) return;

  const root = document.documentElement;
  let html = '';

  for (const [key, label] of Object.entries(PROPERTY_LABELS)) {
    if (!key.startsWith('--')) continue;

    const value = root.style.getPropertyValue(key) || DEFAULT_THEME[key];
    html += renderColorRow(key, label, value);
  }

  container.innerHTML = html;
  bindColorInputs();
}

function renderAnnotationColors() {
  const container = document.getElementById('settingsAnnotationColors');
  if (!container) return;

  let html = '';

  for (const [key, label] of Object.entries(PROPERTY_LABELS)) {
    if (key.startsWith('--')) continue;

    const value = currentJsColors[key] || DEFAULT_JS_COLORS[key];
    html += renderColorRow(key, label, value);
  }

  container.innerHTML = html;
  bindColorInputs();
}

function renderColorRow(key, label, value) {
  return `
    <div class="settings-color-row">
      <span class="settings-color-label">${esc(label)}</span>
      <input type="color" class="settings-color-input" data-key="${esc(key)}" value="${esc(value)}">
      <span class="settings-color-hex">${esc(value)}</span>
    </div>
  `;
}

function bindColorInputs() {
  document.querySelectorAll('.settings-color-input').forEach(input => {
    const key = input.dataset.key;

    // Live preview on input
    input.addEventListener('input', (e) => {
      const value = e.target.value;

      if (key.startsWith('--')) {
        document.documentElement.style.setProperty(key, value);
      } else {
        currentJsColors[key] = value;
      }

      // Update hex display
      const hexDisplay = input.parentElement.querySelector('.settings-color-hex');
      if (hexDisplay) hexDisplay.textContent = value;

      // Mark as custom
      setActivePreset(null);
      document.getElementById('settingsPresetSelect').value = '';
    });

    // Persist on change
    input.addEventListener('change', () => {
      const theme = getCurrentTheme();
      saveTheme(theme);
    });
  });
}

// ============================================================
// Utilities
// ============================================================

function esc(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showToast(message) {
  // Simple toast — import from datafile.js if available
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 400);
  }, 2000);
}
