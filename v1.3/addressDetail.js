import { getAddresses } from './editbook.js';
import {
  getAnnotationsForAddress, addTag, updateTag, deleteTag,
  setHighlight, clearHighlight, setTagAlert, clearTagAlert,
  snoozeAlert, acknowledgeAlert, loadAnnotations
} from './annotations.js';
import { hexToRgba, extractOpacity, rgbaToHex } from './streets.js';

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

let currentAddrId = null;
let onCloseCallback = null;

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function initAddressDetail() {
  const btnDetailBack = document.getElementById('btnDetailBack');
  const btnDetailClose = document.getElementById('btnDetailClose');
  const btnAddTag = document.getElementById('btnAddTag');
  const btnHighlightClear = document.getElementById('btnHighlightClear');

  if (btnDetailBack) btnDetailBack.addEventListener('click', closeDetail);
  if (btnDetailClose) btnDetailClose.addEventListener('click', closeDetail);
  if (btnAddTag) btnAddTag.addEventListener('click', () => showTagForm(null));
  if (btnHighlightClear) btnHighlightClear.addEventListener('click', handleClearHighlight);

  const highlightBgColor = document.getElementById('highlightBgColor');
  const highlightTitle = document.getElementById('highlightTitle');
  const highlightStartDate = document.getElementById('highlightStartDate');
  const highlightEndDate = document.getElementById('highlightEndDate');
  const highlightNotes = document.getElementById('highlightNotes');

  if (highlightBgColor) highlightBgColor.addEventListener('change', autoSaveHighlight);
  if (highlightTitle) highlightTitle.addEventListener('blur', autoSaveHighlight);
  if (highlightStartDate) highlightStartDate.addEventListener('change', autoSaveHighlight);
  if (highlightEndDate) highlightEndDate.addEventListener('change', autoSaveHighlight);
  if (highlightNotes) highlightNotes.addEventListener('blur', autoSaveHighlight);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const overlay = document.getElementById('addressDetailOverlay');
      if (overlay && overlay.classList.contains('active')) {
        closeDetail();
      }
    }
  });

  const tagsList = document.getElementById('tagsList');
  if (tagsList) {
    tagsList.addEventListener('click', handleTagsListClick);
    tagsList.addEventListener('change', handleTagsListChange);
    tagsList.addEventListener('blur', handleTagsListBlur, true);
  }

  // Color palette swatch click delegation
  const detailBody = document.querySelector('.detail-body');
  if (detailBody) {
    detailBody.addEventListener('click', (e) => {
      const swatch = e.target.closest('.color-swatch');
      if (!swatch) return;
      const palette = swatch.closest('.color-palette');
      if (!palette) return;
      const targetId = palette.dataset.target;
      const input = document.getElementById(targetId);
      if (input) {
        input.value = swatch.dataset.color;
        input.dispatchEvent(new Event('change'));
      }
      // Update selected state
      palette.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      swatch.classList.add('selected');
    });
  }
}

export function openDetail(addrId, closeCb) {
  currentAddrId = addrId;
  onCloseCallback = closeCb;

  const addresses = getAddresses();
  const addr = addresses.find(a => a.id === addrId);
  if (!addr) return;

  const detailTitle = document.getElementById('detailTitle');
  const detailAddressInfo = document.getElementById('detailAddressInfo');
  const overlay = document.getElementById('addressDetailOverlay');

  if (detailTitle) {
    detailTitle.textContent = `${addr.primaryAddress} ${addr.streetName}`;
  }

  if (detailAddressInfo) {
    let html = `<span class="detail-addr-field"><span class="detail-addr-label">ADDR</span> ${esc(addr.primaryAddress)}</span>`;
    html += `<span class="detail-addr-field"><span class="detail-addr-label">STREET</span> ${esc(addr.streetName)}</span>`;

    if (addr.secyAbbr) {
      html += `<span class="detail-addr-field"><span class="detail-addr-label">SECY ABBR</span> ${esc(addr.secyAbbr)}</span>`;
    }
    if (addr.secyUnit) {
      html += `<span class="detail-addr-field"><span class="detail-addr-label">SECY UNIT</span> ${esc(addr.secyUnit)}</span>`;
    }
    if (addr.delvType) {
      html += `<span class="detail-addr-field"><span class="detail-addr-label">DELV TYPE</span> ${esc(addr.delvType)}</span>`;
    }
    if (addr.usgCode) {
      html += `<span class="detail-addr-field"><span class="detail-addr-label">USG CODE</span> ${esc(addr.usgCode)}</span>`;
    }
    if (addr.noStat) {
      html += `<span class="detail-addr-field"><span class="detail-addr-label">NO STAT</span> YES</span>`;
    }
    if (addr.vacInd) {
      html += `<span class="detail-addr-field"><span class="detail-addr-label">VAC IND</span> YES</span>`;
    }

    detailAddressInfo.innerHTML = html;
  }

  const annotations = getAnnotationsForAddress(addrId);
  populateHighlightControls(annotations.highlight);
  renderTagsList();

  if (overlay) {
    overlay.classList.add('active');
  }
}

export function closeDetail() {
  const overlay = document.getElementById('addressDetailOverlay');
  if (overlay) {
    overlay.classList.remove('active');
  }

  if (onCloseCallback) {
    onCloseCallback();
  }

  currentAddrId = null;
  onCloseCallback = null;
}

function populateHighlightControls(highlight) {
  const highlightBgColor = document.getElementById('highlightBgColor');
  const highlightTitle = document.getElementById('highlightTitle');
  const highlightStartDate = document.getElementById('highlightStartDate');
  const highlightEndDate = document.getElementById('highlightEndDate');
  const highlightNotes = document.getElementById('highlightNotes');

  const rawBgColor = highlight?.bgColor || '#000000';
  const hexBgColor = rgbaToHex(rawBgColor);
  const bgOpacity = extractOpacity(rawBgColor);

  if (highlightBgColor) highlightBgColor.value = hexBgColor;
  if (highlightTitle) highlightTitle.value = highlight?.title || '';
  if (highlightStartDate) highlightStartDate.value = highlight?.startDate || '';
  if (highlightEndDate) highlightEndDate.value = highlight?.endDate || '';
  if (highlightNotes) highlightNotes.value = highlight?.notes || '';

  // Insert highlight color palette if not already present
  if (highlightBgColor && !highlightBgColor.previousElementSibling?.classList.contains('color-palette')) {
    const paletteDiv = document.createElement('div');
    paletteDiv.className = 'color-palette';
    paletteDiv.dataset.target = 'highlightBgColor';
    const currentColor = hexBgColor.toLowerCase();
    paletteDiv.innerHTML = COLOR_PALETTE.map(c => {
      const sel = c.toLowerCase() === currentColor ? ' selected' : '';
      return `<div class="color-swatch${sel}" data-color="${c}" style="background:${c}"></div>`;
    }).join('');
    highlightBgColor.parentNode.insertBefore(paletteDiv, highlightBgColor);
  } else if (highlightBgColor) {
    // Update selection on existing palette
    const palette = highlightBgColor.previousElementSibling;
    if (palette && palette.classList.contains('color-palette')) {
      const currentColor = hexBgColor.toLowerCase();
      palette.querySelectorAll('.color-swatch').forEach(s => {
        s.classList.toggle('selected', s.dataset.color.toLowerCase() === currentColor);
      });
    }
  }

  // Insert highlight opacity slider if not already present
  let hlOpacityControl = document.getElementById('highlightBgOpacityControl');
  if (highlightBgColor && !hlOpacityControl) {
    const opCtrl = document.createElement('div');
    opCtrl.className = 'opacity-control';
    opCtrl.id = 'highlightBgOpacityControl';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'opacity-slider';
    slider.id = 'highlightBgOpacity';
    slider.min = '0';
    slider.max = '100';
    slider.value = String(Math.round(bgOpacity * 100));

    const valSpan = document.createElement('span');
    valSpan.className = 'opacity-value';
    valSpan.id = 'highlightBgOpacityVal';
    valSpan.textContent = `${slider.value}%`;

    slider.addEventListener('input', () => {
      valSpan.textContent = `${slider.value}%`;
      autoSaveHighlight();
    });

    opCtrl.appendChild(slider);
    opCtrl.appendChild(valSpan);
    highlightBgColor.parentNode.insertBefore(opCtrl, highlightBgColor.nextSibling);
  } else if (hlOpacityControl) {
    const slider = document.getElementById('highlightBgOpacity');
    const valSpan = document.getElementById('highlightBgOpacityVal');
    if (slider) slider.value = String(Math.round(bgOpacity * 100));
    if (valSpan) valSpan.textContent = `${Math.round(bgOpacity * 100)}%`;
  }
}

function autoSaveHighlight() {
  if (!currentAddrId) return;

  const highlightBgColor = document.getElementById('highlightBgColor');
  const highlightTitle = document.getElementById('highlightTitle');
  const highlightStartDate = document.getElementById('highlightStartDate');
  const highlightEndDate = document.getElementById('highlightEndDate');
  const highlightNotes = document.getElementById('highlightNotes');

  const bgColorHex = highlightBgColor?.value || '#000000';
  const hlOpacity = parseInt(document.getElementById('highlightBgOpacity')?.value || '60', 10) / 100;
  const bgColor = hexToRgba(bgColorHex, hlOpacity);
  const title = highlightTitle?.value || '';

  if (!title && bgColorHex === '#000000') {
    return;
  }

  setHighlight(currentAddrId, {
    bgColor: bgColor,
    fontColor: '#ffffff',
    title: title,
    notes: highlightNotes?.value || '',
    startDate: highlightStartDate?.value || null,
    endDate: highlightEndDate?.value || null
  });
}

function handleClearHighlight() {
  if (!currentAddrId) return;

  clearHighlight(currentAddrId);
  populateHighlightControls(null);

  if (onCloseCallback) {
    onCloseCallback();
  }
}

function renderTagsList() {
  if (!currentAddrId) return;

  const tagsList = document.getElementById('tagsList');
  if (!tagsList) return;

  const annotations = getAnnotationsForAddress(currentAddrId);
  const tags = annotations.tags || [];

  if (tags.length === 0) {
    tagsList.innerHTML = '<div class="tags-empty">No tags yet</div>';
    return;
  }

  let html = '';
  for (const tag of tags) {
    html += buildTagCardHTML(tag);
  }

  tagsList.innerHTML = html;
}

function buildTagCardHTML(tag) {
  let html = `<div class="tag-card" data-tag-id="${esc(tag.id)}">`;
  html += '<div class="tag-card-header">';
  html += '<div class="tag-card-preview">';

  if (tag.displayMode === 'square' || tag.displayMode === 'both') {
    html += `<span class="tag-preview-square" style="background:${esc(tag.bgColor)}"></span>`;
  }

  html += '</div>';
  html += `<div class="tag-card-title" style="color:${esc(tag.fontColor)}">${esc(tag.title)}</div>`;
  html += '<div class="tag-card-actions">';
  html += `<button class="btn-tag-edit" data-tag-id="${esc(tag.id)}">EDIT</button>`;
  html += `<button class="btn-tag-delete" data-tag-id="${esc(tag.id)}">DEL</button>`;
  html += '</div>';
  html += '</div>';

  html += '<label class="tag-show-case">';
  html += `<input type="checkbox" class="tag-show-check" data-tag-id="${esc(tag.id)}" ${tag.showOnCase ? 'checked' : ''}> Show on case`;
  html += '</label>';

  if (tag.notes) {
    html += `<button class="tag-notes-toggle" data-tag-id="${esc(tag.id)}">▸ Notes</button>`;
    html += `<div class="tag-notes-content" data-tag-id="${esc(tag.id)}">`;
    html += `<textarea class="tag-notes-textarea" data-tag-id="${esc(tag.id)}">${esc(tag.notes)}</textarea>`;
    html += '</div>';
  }

  if (tag.alert) {
    html += '<div class="tag-alert-section">';
    html += '<div class="tag-alert-info">';
    html += `🔔 ${tag.alert.type === 'reminder' ? 'Reminder' : 'Expires'}: ${esc(tag.alert.schedule.value)}`;
    if (tag.alert.snoozedUntil) {
      html += ' (SNOOZED)';
    }
    if (tag.alert.acknowledged) {
      html += ' (ACKNOWLEDGED)';
    }
    html += '</div>';
    html += '<div class="tag-snooze-row">';
    html += `<button class="btn-snooze" data-tag-id="${esc(tag.id)}" data-hours="1">1HR</button>`;
    html += `<button class="btn-snooze" data-tag-id="${esc(tag.id)}" data-hours="24">1DAY</button>`;
    html += `<button class="btn-snooze" data-tag-id="${esc(tag.id)}" data-hours="72">3DAY</button>`;
    html += `<button class="btn-snooze" data-tag-id="${esc(tag.id)}" data-hours="168">1WK</button>`;
    html += `<button class="btn-ack" data-tag-id="${esc(tag.id)}">GOT IT</button>`;
    html += `<button class="btn-clear-alert" data-tag-id="${esc(tag.id)}">REMOVE</button>`;
    html += '</div>';
    html += '</div>';
  }

  html += '</div>';
  return html;
}

function handleTagsListClick(e) {
  const editBtn = e.target.closest('.btn-tag-edit');
  if (editBtn) {
    const tagId = editBtn.dataset.tagId;
    showTagForm(tagId);
    return;
  }

  const deleteBtn = e.target.closest('.btn-tag-delete');
  if (deleteBtn) {
    const tagId = deleteBtn.dataset.tagId;
    if (confirm('Delete this tag?')) {
      deleteTag(currentAddrId, tagId);
      renderTagsList();
      if (onCloseCallback) onCloseCallback();
    }
    return;
  }

  const notesToggle = e.target.closest('.tag-notes-toggle');
  if (notesToggle) {
    const tagId = notesToggle.dataset.tagId;
    const notesContent = document.querySelector(`.tag-notes-content[data-tag-id="${tagId}"]`);
    if (notesContent) {
      notesContent.classList.toggle('expanded');
      notesToggle.textContent = notesContent.classList.contains('expanded') ? '▾ Notes' : '▸ Notes';
    }
    return;
  }

  const snoozeBtn = e.target.closest('.btn-snooze');
  if (snoozeBtn) {
    const tagId = snoozeBtn.dataset.tagId;
    const hours = parseInt(snoozeBtn.dataset.hours, 10);
    const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    snoozeAlert(currentAddrId, tagId, snoozedUntil);
    renderTagsList();
    if (onCloseCallback) onCloseCallback();
    return;
  }

  const ackBtn = e.target.closest('.btn-ack');
  if (ackBtn) {
    const tagId = ackBtn.dataset.tagId;
    acknowledgeAlert(currentAddrId, tagId);
    renderTagsList();
    if (onCloseCallback) onCloseCallback();
    return;
  }

  const clearAlertBtn = e.target.closest('.btn-clear-alert');
  if (clearAlertBtn) {
    const tagId = clearAlertBtn.dataset.tagId;
    clearTagAlert(currentAddrId, tagId);
    renderTagsList();
    if (onCloseCallback) onCloseCallback();
    return;
  }

  const cancelBtn = e.target.closest('#btnTagFormCancel');
  if (cancelBtn) {
    renderTagsList();
    return;
  }

  const saveBtn = e.target.closest('#btnTagFormSave');
  if (saveBtn) {
    handleTagFormSave();
    return;
  }
}

function handleTagsListChange(e) {
  const showCheck = e.target.closest('.tag-show-check');
  if (showCheck) {
    const tagId = showCheck.dataset.tagId;
    updateTag(currentAddrId, tagId, { showOnCase: showCheck.checked });
    if (onCloseCallback) onCloseCallback();
    return;
  }

  const alertEnabled = e.target.closest('#tagFormAlertEnabled');
  if (alertEnabled) {
    const alertFields = document.getElementById('tagAlertFields');
    if (alertFields) {
      alertFields.style.display = alertEnabled.checked ? 'block' : 'none';
    }
    return;
  }
}

function handleTagsListBlur(e) {
  const notesTextarea = e.target.closest('.tag-notes-textarea');
  if (notesTextarea) {
    const tagId = notesTextarea.dataset.tagId;
    updateTag(currentAddrId, tagId, { notes: notesTextarea.value });
    return;
  }
}

function showTagForm(tagId) {
  if (!currentAddrId) return;

  const tagsList = document.getElementById('tagsList');
  if (!tagsList) return;

  let tag = null;
  if (tagId) {
    const annotations = getAnnotationsForAddress(currentAddrId);
    tag = annotations.tags.find(t => t.id === tagId);
    if (!tag) return;
  }

  const formHTML = buildTagFormHTML(tag);

  if (tagId) {
    const tagCard = tagsList.querySelector(`.tag-card[data-tag-id="${tagId}"]`);
    if (tagCard) {
      tagCard.outerHTML = formHTML;
    }
  } else {
    tagsList.insertAdjacentHTML('afterbegin', formHTML);
  }

  // Wire up opacity slider display updates
  wireOpacitySlider('tagFormFontOpacity', 'tagFormFontOpacityVal');
  wireOpacitySlider('tagFormBgOpacity', 'tagFormBgOpacityVal');
}

function wireOpacitySlider(sliderId, valId) {
  const slider = document.getElementById(sliderId);
  const valEl = document.getElementById(valId);
  if (slider && valEl) {
    slider.addEventListener('input', () => {
      valEl.textContent = `${slider.value}%`;
    });
  }
}

function buildTagFormHTML(tag) {
  const isEdit = !!tag;
  const title = tag?.title || '';
  const displayMode = tag?.displayMode || 'text';
  const fontColorRaw = tag?.fontColor || '#daa520';
  const fontColor = rgbaToHex(fontColorRaw);
  const fontOpacity = extractOpacity(fontColorRaw);
  const bgColorRaw = tag?.bgColor || '#3d2e00';
  const bgColor = rgbaToHex(bgColorRaw);
  const bgOpacity = extractOpacity(bgColorRaw);
  const notes = tag?.notes || '';
  const alert = tag?.alert || null;
  const alertEnabled = !!alert;
  const alertDate = alert?.schedule?.value || '';
  const alertType = alert?.type || 'reminder';

  let html = '<div class="tag-edit-form"';
  if (isEdit) {
    html += ` data-edit-tag-id="${esc(tag.id)}"`;
  }
  html += '>';

  html += '<div class="tag-form-row">';
  html += '<div class="tag-form-field flex-1">';
  html += '<span class="tag-form-label">TITLE</span>';
  html += `<input type="text" id="tagFormTitle" value="${esc(title)}" placeholder="e.g. Smith M 12/20/27" maxlength="40">`;
  html += '</div>';
  html += '</div>';

  html += '<div class="tag-form-row">';
  html += '<div class="tag-form-field">';
  html += '<span class="tag-form-label">DISPLAY</span>';
  html += '<div class="display-mode-group">';
  html += `<label class="display-mode-option"><input type="radio" name="tagDisplayMode" value="text" ${displayMode === 'text' ? 'checked' : ''}> TEXT</label>`;
  html += `<label class="display-mode-option"><input type="radio" name="tagDisplayMode" value="square" ${displayMode === 'square' ? 'checked' : ''}> SQUARE</label>`;
  html += `<label class="display-mode-option"><input type="radio" name="tagDisplayMode" value="both" ${displayMode === 'both' ? 'checked' : ''}> BOTH</label>`;
  html += '</div>';
  html += '</div>';
  html += '</div>';

  html += '<div class="tag-form-row">';
  html += '<div class="tag-form-field flex-1">';
  html += '<span class="tag-form-label">FONT COLOR</span>';
  html += `<div class="color-palette" data-target="tagFormFontColor">`;
  for (const c of COLOR_PALETTE) {
    const sel = c.toLowerCase() === fontColor.toLowerCase() ? ' selected' : '';
    html += `<div class="color-swatch${sel}" data-color="${c}" style="background:${c}"></div>`;
  }
  html += `</div>`;
  html += `<input type="color" id="tagFormFontColor" value="${esc(fontColor)}" class="color-custom-input" title="Custom color">`;
  html += `<div class="opacity-control">`;
  html += `<input type="range" min="0" max="100" value="${Math.round(fontOpacity * 100)}" class="opacity-slider" id="tagFormFontOpacity">`;
  html += `<span class="opacity-value" id="tagFormFontOpacityVal">${Math.round(fontOpacity * 100)}%</span>`;
  html += `</div>`;
  html += '</div>';
  html += '</div>';

  html += '<div class="tag-form-row">';
  html += '<div class="tag-form-field flex-1">';
  html += '<span class="tag-form-label">BG COLOR</span>';
  html += `<div class="color-palette" data-target="tagFormBgColor">`;
  for (const c of COLOR_PALETTE) {
    const sel = c.toLowerCase() === bgColor.toLowerCase() ? ' selected' : '';
    html += `<div class="color-swatch${sel}" data-color="${c}" style="background:${c}"></div>`;
  }
  html += `</div>`;
  html += `<input type="color" id="tagFormBgColor" value="${esc(bgColor)}" class="color-custom-input" title="Custom color">`;
  html += `<div class="opacity-control">`;
  html += `<input type="range" min="0" max="100" value="${Math.round(bgOpacity * 100)}" class="opacity-slider" id="tagFormBgOpacity">`;
  html += `<span class="opacity-value" id="tagFormBgOpacityVal">${Math.round(bgOpacity * 100)}%</span>`;
  html += `</div>`;
  html += '</div>';
  html += '</div>';

  html += '<div class="tag-form-row">';
  html += '<div class="tag-form-field flex-1">';
  html += '<span class="tag-form-label">NOTES</span>';
  html += `<textarea id="tagFormNotes" rows="2" placeholder="Details...">${esc(notes)}</textarea>`;
  html += '</div>';
  html += '</div>';

  html += '<div class="tag-alert-section">';
  html += '<div class="tag-form-row">';
  html += '<label class="display-mode-option">';
  html += `<input type="checkbox" id="tagFormAlertEnabled" ${alertEnabled ? 'checked' : ''}> SET ALERT`;
  html += '</label>';
  html += '</div>';
  html += `<div id="tagAlertFields" style="display:${alertEnabled ? 'block' : 'none'}">`;
  html += '<div class="tag-alert-row">';
  html += '<span class="tag-form-label">DATE</span>';
  html += `<input type="date" id="tagFormAlertDate" value="${esc(alertDate)}">`;
  html += '</div>';
  html += '<div class="tag-alert-row">';
  html += '<div class="tag-alert-type-group">';
  html += `<label class="tag-alert-type-option"><input type="radio" name="tagAlertType" value="reminder" ${alertType === 'reminder' ? 'checked' : ''}> REMINDER</label>`;
  html += `<label class="tag-alert-type-option"><input type="radio" name="tagAlertType" value="expiration" ${alertType === 'expiration' ? 'checked' : ''}> EXPIRATION</label>`;
  html += '</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';

  html += '<div class="tag-form-actions">';
  html += '<button class="btn-action btn-small" id="btnTagFormCancel">CANCEL</button>';
  html += `<button class="btn-primary btn-small" id="btnTagFormSave">${isEdit ? 'SAVE' : 'CREATE'}</button>`;
  html += '</div>';

  html += '</div>';
  return html;
}

function handleTagFormSave() {
  if (!currentAddrId) return;

  const form = document.querySelector('.tag-edit-form');
  if (!form) return;

  const editTagId = form.dataset.editTagId || null;

  const title = document.getElementById('tagFormTitle')?.value || '';
  if (!title.trim()) {
    alert('Title is required');
    return;
  }

  const displayModeRadio = document.querySelector('input[name="tagDisplayMode"]:checked');
  const displayMode = displayModeRadio?.value || 'text';

  const fontColorHex = document.getElementById('tagFormFontColor')?.value || '#daa520';
  const fontOpacityVal = parseInt(document.getElementById('tagFormFontOpacity')?.value || '60', 10) / 100;
  const fontColor = hexToRgba(fontColorHex, fontOpacityVal);
  const bgColorHex = document.getElementById('tagFormBgColor')?.value || '#3d2e00';
  const bgOpacityVal = parseInt(document.getElementById('tagFormBgOpacity')?.value || '60', 10) / 100;
  const bgColor = hexToRgba(bgColorHex, bgOpacityVal);
  const notes = document.getElementById('tagFormNotes')?.value || '';

  const alertEnabled = document.getElementById('tagFormAlertEnabled')?.checked || false;
  let alertConfig = null;

  if (alertEnabled) {
    const alertDate = document.getElementById('tagFormAlertDate')?.value;
    if (!alertDate) {
      alert('Alert date is required when alert is enabled');
      return;
    }

    const alertTypeRadio = document.querySelector('input[name="tagAlertType"]:checked');
    const alertType = alertTypeRadio?.value || 'reminder';

    alertConfig = {
      type: alertType,
      schedule: { mode: 'one-time', value: alertDate },
      snoozedUntil: null,
      acknowledged: false,
      lastTriggered: null
    };
  }

  const tagData = {
    title,
    displayMode,
    fontColor,
    bgColor,
    notes,
    showOnCase: true
  };

  if (editTagId) {
    updateTag(currentAddrId, editTagId, tagData);
    if (alertEnabled) {
      setTagAlert(currentAddrId, editTagId, alertConfig);
    } else {
      clearTagAlert(currentAddrId, editTagId);
    }
  } else {
    const newTag = addTag(currentAddrId, tagData);
    if (alertEnabled && newTag) {
      setTagAlert(currentAddrId, newTag.id, alertConfig);
    }
  }

  renderTagsList();

  if (onCloseCallback) {
    onCloseCallback();
  }
}
