/**
 * Cell Modal — centered popup for case view cell clicks (both overview and zoom)
 * Shows quick summary with alert management options.
 * EDIT button opens full detail overlay.
 */

import { getAddresses, getPlacedAddresses } from './editbook.js';
import { getAnnotationsForAddress, evaluateAlerts, snoozeAlert, acknowledgeAlert, loadAnnotations, saveAnnotations } from './annotations.js';
import { openDetail } from './addressDetail.js';

let overlayEl = null;
let currentAddrId = null;
let isZoomView = false;
let onRefreshCb = null;

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Initialize cell popup system.
 * @param {Function} refreshCallback - Called after alert actions or edit to refresh case view
 */
export function initCellPopup(refreshCallback) {
  onRefreshCb = refreshCallback;

  // Create overlay + modal structure
  overlayEl = document.createElement('div');
  overlayEl.className = 'cell-modal-overlay';
  overlayEl.innerHTML = `
    <div class="cell-modal">
      <div class="cell-modal-header">
        <div class="cell-modal-title"></div>
        <button class="cell-modal-close">&times;</button>
      </div>
      <div class="cell-modal-body"></div>
      <div class="cell-modal-alerts"></div>
      <div class="cell-modal-actions">
        <button class="cell-modal-edit-btn">EDIT</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlayEl);

  // Dismiss on backdrop click
  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl) {
      hideCellPopup();
    }
  });

  // Close button
  overlayEl.querySelector('.cell-modal-close').addEventListener('click', hideCellPopup);

  // EDIT button — opens full detail overlay
  overlayEl.querySelector('.cell-modal-edit-btn').addEventListener('click', () => {
    const id = currentAddrId;
    const wasZoom = isZoomView;
    hideCellPopup();
    if (id) {
      openDetail(id, () => {
        // After detail closes, refresh case view
        if (onRefreshCb) onRefreshCb(wasZoom);
      });
    }
  });

  // Delegated click handlers for alert buttons
  overlayEl.querySelector('.cell-modal-alerts').addEventListener('click', handleAlertClick);

  // Dismiss on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlayEl.classList.contains('visible')) {
      hideCellPopup();
    }
  });
}

/**
 * Show cell popup for an address.
 * @param {string} addrId - Address ID
 * @param {boolean} fromZoom - Whether this was triggered from zoom view
 */
export function showCellPopup(addrId, fromZoom = false) {
  if (!overlayEl) return;

  const addresses = getAddresses();
  const addr = addresses.find(a => a.id === addrId);
  if (!addr) return;

  currentAddrId = addrId;
  isZoomView = fromZoom;

  // Find placement info
  const placed = getPlacedAddresses() || [];
  const placement = placed.find(p => p.addressId === addrId);

  // Get annotations
  const annotations = getAnnotationsForAddress(addrId);

  // Populate header
  const titleEl = overlayEl.querySelector('.cell-modal-title');
  titleEl.textContent = `${addr.primaryAddress} ${addr.streetName}`;

  // Populate body
  let html = '';

  if (placement) {
    html += `<div class="cell-modal-row"><span class="cell-modal-label">Cell</span><span class="cell-modal-value">${placement.startCell}</span></div>`;
    html += `<div class="cell-modal-row"><span class="cell-modal-label">Shelf</span><span class="cell-modal-value">S${placement.shelfNum}</span></div>`;
  }

  if (addr.delvType) {
    html += `<div class="cell-modal-row"><span class="cell-modal-label">Delv Type</span><span class="cell-modal-value">${esc(addr.delvType)}</span></div>`;
  }

  if (addr.secyAbbr) {
    html += `<div class="cell-modal-row"><span class="cell-modal-label">SECY</span><span class="cell-modal-value">${esc(addr.secyAbbr)}</span></div>`;
  }

  if (addr.secyUnit) {
    html += `<div class="cell-modal-row"><span class="cell-modal-label">Unit</span><span class="cell-modal-value">${esc(addr.secyUnit)}</span></div>`;
  }

  if (annotations.highlight && annotations.highlight.title) {
    html += `<div class="cell-modal-row"><span class="cell-modal-label">Status</span><span class="cell-modal-value">${esc(annotations.highlight.title)}</span></div>`;
  }

  const visibleTags = (annotations.tags || []).filter(t => t.showOnCase);
  if (visibleTags.length > 0) {
    html += `<div class="cell-modal-row"><span class="cell-modal-label">Tags</span><span class="cell-modal-value">${visibleTags.map(t => esc(t.title)).join(', ')}</span></div>`;
  }

  overlayEl.querySelector('.cell-modal-body').innerHTML = html;

  // Populate alerts section
  const alertsHtml = buildAlertsSection(addrId, annotations);
  overlayEl.querySelector('.cell-modal-alerts').innerHTML = alertsHtml;

  // Show with fade-in
  overlayEl.classList.add('visible');
}

export function hideCellPopup() {
  if (overlayEl) {
    overlayEl.classList.remove('visible');
    currentAddrId = null;
    isZoomView = false;
  }
}

/**
 * Build HTML for alert management section
 */
function buildAlertsSection(addrId, annotations) {
  // Get active alerts for this address
  const allAlerts = evaluateAlerts();
  const addressAlerts = allAlerts.filter(a => a.addrId === addrId);

  if (addressAlerts.length === 0) {
    return ''; // No alerts, no section
  }

  let html = '<div class="cell-modal-alerts-inner">';
  html += '<div class="cell-modal-alerts-header">ALERTS</div>';

  for (const alert of addressAlerts) {
    const tagId = alert.tagId; // null if highlight alert
    const source = tagId ? 'tag' : 'highlight';

    html += '<div class="cell-modal-alert-item">';
    html += `<div class="cell-modal-alert-title">${esc(alert.title)}</div>`;
    html += `<div class="cell-modal-alert-info">${alert.type === 'reminder' ? 'Reminder' : 'Expires'}: `;

    if (alert.daysUntil < 0) {
      html += `<span class="alert-expired">${Math.abs(alert.daysUntil)} day(s) ago</span>`;
    } else if (alert.daysUntil === 0) {
      html += '<span class="alert-today">TODAY</span>';
    } else {
      html += `in ${alert.daysUntil} day(s)`;
    }
    html += '</div>';

    html += '<div class="cell-modal-alert-actions">';
    html += `<button class="btn-alert-snooze" data-source="${source}" data-tag-id="${tagId || ''}" data-hours="1">1HR</button>`;
    html += `<button class="btn-alert-snooze" data-source="${source}" data-tag-id="${tagId || ''}" data-hours="24">1DAY</button>`;
    html += `<button class="btn-alert-ack" data-source="${source}" data-tag-id="${tagId || ''}">GOT IT</button>`;
    html += '</div>';
    html += '</div>';
  }

  // Clear all alerts button if more than one
  if (addressAlerts.length > 1) {
    html += '<div class="cell-modal-alert-clear-all">';
    html += '<button class="btn-alert-clear-all">CLEAR ALL ALERTS</button>';
    html += '</div>';
  }

  html += '</div>';
  return html;
}

/**
 * Handle clicks on alert buttons
 */
function handleAlertClick(e) {
  if (!currentAddrId) return;

  const snoozeBtn = e.target.closest('.btn-alert-snooze');
  if (snoozeBtn) {
    const tagId = snoozeBtn.dataset.tagId || null;
    const hours = parseInt(snoozeBtn.dataset.hours, 10);
    const snoozedUntil = Date.now() + hours * 60 * 60 * 1000;
    snoozeAlert(currentAddrId, tagId === '' ? null : tagId, snoozedUntil);
    refreshPopup();
    return;
  }

  const ackBtn = e.target.closest('.btn-alert-ack');
  if (ackBtn) {
    const tagId = ackBtn.dataset.tagId || null;
    acknowledgeAlert(currentAddrId, tagId === '' ? null : tagId);
    refreshPopup();
    return;
  }

  const clearAllBtn = e.target.closest('.btn-alert-clear-all');
  if (clearAllBtn) {
    clearAllAlertsForAddress(currentAddrId);
    refreshPopup();
    return;
  }
}

/**
 * Clear all alerts for an address by acknowledging them
 */
function clearAllAlertsForAddress(addrId) {
  const allAlerts = evaluateAlerts();
  const addressAlerts = allAlerts.filter(a => a.addrId === addrId);

  for (const alert of addressAlerts) {
    acknowledgeAlert(addrId, alert.tagId);
  }
}

/**
 * Refresh the popup after alert action
 */
function refreshPopup() {
  if (currentAddrId) {
    const wasZoom = isZoomView;
    const id = currentAddrId;

    // Re-show popup with updated data
    showCellPopup(id, wasZoom);

    // Refresh case view to update alert glows
    if (onRefreshCb) {
      onRefreshCb(wasZoom);
    }
  }
}
