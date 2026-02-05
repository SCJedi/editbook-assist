// streets.js - Street color management module
import { getAddresses } from './editbook.js';

const STORAGE_KEY = 'editbook-street-colors';

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
    const currentColor = (streetColors[street] || '').toLowerCase();
    for (const c of COLOR_PALETTE) {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      if (c.toLowerCase() === currentColor) swatch.classList.add('selected');
      swatch.dataset.color = c;
      swatch.style.background = c;
      swatch.addEventListener('click', () => {
        streetColors[street] = c;
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
    picker.value = streetColors[street] || '#daa520';
    picker.title = 'Custom color';
    picker.addEventListener('input', () => {
      streetColors[street] = picker.value;
      saveStreetColors();
      clearBtn.classList.remove('hidden');
      palette.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
    });
    colorWrap.appendChild(picker);

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
      clearBtn.classList.add('hidden');
    });
    row.appendChild(clearBtn);

    container.appendChild(row);
  }
}

export function initStreets() {
  streetColors = loadStreetColors();
}
