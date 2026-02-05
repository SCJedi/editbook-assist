// streets.js - Street color management module
import { getAddresses } from './editbook.js';

const STORAGE_KEY = 'editbook-street-colors';

// --- Color opacity utility functions ---

export function hexToRgba(hex, opacity) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

export function extractOpacity(colorStr) {
  if (!colorStr) return 0.6;
  const m = colorStr.match(/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)$/i);
  if (m) return parseFloat(m[1]);
  return 0.6; // default for hex strings
}

export function rgbaToHex(colorStr) {
  if (!colorStr) return '#000000';
  if (colorStr.startsWith('#')) return colorStr;
  const m = colorStr.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) {
    const r = parseInt(m[1], 10).toString(16).padStart(2, '0');
    const g = parseInt(m[2], 10).toString(16).padStart(2, '0');
    const b = parseInt(m[3], 10).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  }
  return '#000000';
}

const COLOR_PALETTE = [
  '#000000', '#1a1a1a', '#3d2e00', '#4a2800',
  '#ffffff', '#cccccc', '#888888', '#444444',
  '#ff0000', '#cc0000', '#880000', '#ff6b6b',
  '#ff8c00', '#ff6600', '#cc5200', '#ffaa33',
  '#daa520', '#ffc107', '#8b6914', '#ffe082',
  '#00cc00', '#008800', '#00ff88', '#66ff66',
  '#0088ff', '#0055cc', '#00ccff', '#6688ff',
  '#aa00ff', '#8800cc', '#ff00ff', '#ff88ff',
];

let streetColors = {};

function loadStreetColors() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) { /* ignore */ }
  return {};
}

function saveStreetColors() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(streetColors));
  } catch (e) { /* ignore */ }
}

export function getStreetColors() {
  return streetColors;
}

export function refreshStreetsList() {
  const container = document.getElementById('streetsList');
  if (!container) return;

  const addrs = getAddresses() || [];
  const uniqueStreets = [...new Set(
    addrs.map(a => (a.streetName || '').trim()).filter(s => s.length > 0)
  )].sort();

  if (uniqueStreets.length === 0) {
    container.innerHTML = '<div class="empty-state">NO ADDRESSES IN EDIT BOOK</div>';
    return;
  }

  container.innerHTML = '';

  for (const street of uniqueStreets) {
    const row = document.createElement('div');
    row.className = 'street-row';

    const name = document.createElement('div');
    name.className = 'street-row-name';
    name.textContent = street;
    row.appendChild(name);

    const colorWrap = document.createElement('div');
    colorWrap.className = 'street-color-wrap';

    const palette = document.createElement('div');
    palette.className = 'color-palette';
    const storedColor = streetColors[street] || '';
    const currentHex = rgbaToHex(storedColor).toLowerCase();
    const currentOpacity = extractOpacity(storedColor);
    for (const c of COLOR_PALETTE) {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      if (c.toLowerCase() === currentHex && storedColor) swatch.classList.add('selected');
      swatch.dataset.color = c;
      swatch.style.background = c;
      swatch.addEventListener('click', () => {
        const opVal = parseInt(opacitySlider.value, 10) / 100;
        streetColors[street] = hexToRgba(c, opVal);
        saveStreetColors();
        picker.value = c;
        clearBtn.classList.remove('hidden');
        palette.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
        swatch.classList.add('selected');
      });
      palette.appendChild(swatch);
    }
    colorWrap.appendChild(palette);

    const picker = document.createElement('input');
    picker.type = 'color';
    picker.className = 'street-row-color';
    picker.value = currentHex || '#daa520';
    picker.title = 'Custom color';
    picker.addEventListener('input', () => {
      const opVal = parseInt(opacitySlider.value, 10) / 100;
      streetColors[street] = hexToRgba(picker.value, opVal);
      saveStreetColors();
      clearBtn.classList.remove('hidden');
      palette.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    });
    colorWrap.appendChild(picker);

    // Opacity slider
    const opacityControl = document.createElement('div');
    opacityControl.className = 'opacity-control';

    const opacitySlider = document.createElement('input');
    opacitySlider.type = 'range';
    opacitySlider.className = 'opacity-slider';
    opacitySlider.min = '0';
    opacitySlider.max = '100';
    opacitySlider.value = String(Math.round(currentOpacity * 100));

    const opacityValue = document.createElement('span');
    opacityValue.className = 'opacity-value';
    opacityValue.textContent = `${opacitySlider.value}%`;

    opacitySlider.addEventListener('input', () => {
      opacityValue.textContent = `${opacitySlider.value}%`;
      const opVal = parseInt(opacitySlider.value, 10) / 100;
      const hex = rgbaToHex(streetColors[street] || picker.value);
      streetColors[street] = hexToRgba(hex, opVal);
      saveStreetColors();
      clearBtn.classList.remove('hidden');
    });

    opacityControl.appendChild(opacitySlider);
    opacityControl.appendChild(opacityValue);
    colorWrap.appendChild(opacityControl);

    row.appendChild(colorWrap);

    const clearBtn = document.createElement('button');
    clearBtn.className = 'street-row-clear';
    if (!streetColors[street]) clearBtn.classList.add('hidden');
    clearBtn.textContent = '\u00d7';
    clearBtn.title = 'Remove color';
    clearBtn.addEventListener('click', () => {
      delete streetColors[street];
      saveStreetColors();
      picker.value = '#daa520';
      opacitySlider.value = '60';
      opacityValue.textContent = '60%';
      clearBtn.classList.add('hidden');
    });
    row.appendChild(clearBtn);

    container.appendChild(row);
  }
}

export function initStreets() {
  streetColors = loadStreetColors();
}
