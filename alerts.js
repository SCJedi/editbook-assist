/**
 * Edit Book Assist — Alert System
 *
 * Scans stickers for dates, computes alert states, applies visual effects.
 */

import { getState, eventBus } from './models.js';
import { updateAlertClasses } from './renderer.js';

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let alertPanelEl = null;
let alertBadgeEl = null;
let scanInterval = null;

export function initAlerts() {
  alertPanelEl = document.getElementById('alertPanel');
  alertBadgeEl = document.getElementById('alertBadge');

  // Initial scan
  const state = getState();
  if (state) {
    const alerts = scanAlerts(state.config);
    state.alerts = alerts;
    renderAlertPanel(alerts);
    updateAlertClasses(alerts);
  }

  // Re-scan on state changes
  eventBus.on('state-changed', () => {
    const state = getState();
    if (state) {
      const alerts = scanAlerts(state.config);
      state.alerts = alerts;
      renderAlertPanel(alerts);
      updateAlertClasses(alerts);
    }
  });

  // Periodic scan every 60 minutes
  scanInterval = setInterval(() => {
    const state = getState();
    if (state) {
      const alerts = scanAlerts(state.config);
      state.alerts = alerts;
      renderAlertPanel(alerts);
      updateAlertClasses(alerts);
    }
  }, 60 * 60 * 1000);
}

/**
 * Scan all stickers for approaching/expired dates.
 * @param {Object} config - Case configuration
 * @returns {Array} Alert objects sorted by urgency
 */
export function scanAlerts(config) {
  const now = new Date();
  const alerts = [];

  for (const wing of config.wings) {
    for (const shelf of wing.shelves) {
      for (const cell of shelf.cells) {
        if (!cell.stickers || cell.stickers.length === 0) continue;

        for (const sticker of cell.stickers) {
          if (!sticker.expirationDate) continue;

          const expiry = new Date(sticker.expirationDate);
          const daysUntil = Math.floor((expiry.getTime() - now.getTime()) / 86400000);

          if (daysUntil <= 7) {
            alerts.push({
              id: `alert-${sticker.id}`,
              stickerId: sticker.id,
              cellId: cell.id,
              type: daysUntil < 0 ? 'expired' : 'approaching-expiry',
              daysUntilExpiry: daysUntil,
              message: formatAlertMessage(sticker, daysUntil),
              addressNumber: cell.address?.addressNumber || 'Unknown',
              streetName: cell.address?.streetName || '',
              stickerType: sticker.type,
              stickerLabel: sticker.label,
              shelfNumber: cell.shelfNumber,
            });
          }
        }
      }
    }
  }

  return alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

function formatAlertMessage(sticker, daysUntil) {
  const typeLabel = sticker.label || sticker.type;
  if (daysUntil < 0) {
    return `${typeLabel} expired ${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? 's' : ''} ago`;
  } else if (daysUntil === 0) {
    return `${typeLabel} expires today`;
  } else {
    return `${typeLabel} expires in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`;
  }
}

/**
 * Render the alert panel UI.
 */
export function renderAlertPanel(alerts) {
  // Update badge
  if (alertBadgeEl) {
    if (alerts.length > 0) {
      alertBadgeEl.textContent = `${alerts.length} ALERT${alerts.length > 1 ? 'S' : ''}`;
      alertBadgeEl.classList.remove('hidden');
    } else {
      alertBadgeEl.classList.add('hidden');
    }
  }

  // Update panel
  if (!alertPanelEl) return;

  if (alerts.length === 0) {
    alertPanelEl.classList.remove('open');
    return;
  }

  const listEl = alertPanelEl.querySelector('.alert-panel-list');
  if (!listEl) return;

  listEl.innerHTML = '';

  alerts.forEach(alert => {
    const item = document.createElement('div');
    item.className = `alert-item ${alert.type === 'expired' ? 'expired' : 'approaching'}`;

    const severity = alert.daysUntilExpiry < 0 ? '\uD83D\uDD34' : // red circle
                     alert.daysUntilExpiry <= 3 ? '\uD83D\uDFE0' : // orange circle
                     '\uD83D\uDFE1'; // yellow circle

    item.innerHTML = `
      <span class="alert-severity">${severity}</span>
      <span class="alert-message">
        <strong>${esc(alert.addressNumber)} ${esc(alert.streetName)}</strong> \u2014 ${esc(alert.message)}
      </span>
      <button class="alert-navigate" data-cell-id="${esc(alert.cellId)}" data-shelf="${alert.shelfNumber}">\u2192</button>
    `;

    listEl.appendChild(item);
  });

  // Bind navigate buttons
  listEl.querySelectorAll('.alert-navigate').forEach(btn => {
    btn.addEventListener('click', () => {
      navigateToAlert({
        cellId: btn.dataset.cellId,
        shelfNumber: parseInt(btn.dataset.shelf),
      });
    });
  });
}

/**
 * Navigate to a specific alert's cell.
 */
export function navigateToAlert(alert) {
  eventBus.emit('navigate-to-cell', {
    cellId: alert.cellId,
    shelfNumber: alert.shelfNumber,
  });
}

export function toggleAlertPanel() {
  alertPanelEl?.classList.toggle('open');
}

export function destroyAlerts() {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
  }
}
