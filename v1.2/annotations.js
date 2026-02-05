import { getJsColor } from './settings.js';

const STORAGE_KEY = 'editbook-address-annotations';

function generateId(prefix) {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

export function loadAnnotations() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

export function saveAnnotations(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function getAnnotationsForAddress(addrId) {
  const all = loadAnnotations();
  if (!all[addrId]) {
    all[addrId] = { tags: [], highlight: null };
    saveAnnotations(all);
  }
  return all[addrId];
}

export function addTag(addrId, tagData) {
  const all = loadAnnotations();
  if (!all[addrId]) {
    all[addrId] = { tags: [], highlight: null };
  }

  const now = Date.now();
  const tag = {
    id: generateId('tag'),
    title: tagData.title || '',
    displayMode: tagData.displayMode || 'both',
    fontColor: tagData.fontColor || getJsColor('tag-font'),
    bgColor: tagData.bgColor || getJsColor('tag-bg'),
    notes: tagData.notes || '',
    showOnCase: tagData.showOnCase !== undefined ? tagData.showOnCase : true,
    createdAt: now,
    updatedAt: now,
    alert: tagData.alert || null
  };

  all[addrId].tags.push(tag);
  saveAnnotations(all);
  return tag;
}

export function updateTag(addrId, tagId, updates) {
  const all = loadAnnotations();
  if (!all[addrId]) return;

  const tag = all[addrId].tags.find(t => t.id === tagId);
  if (!tag) return;

  Object.assign(tag, updates);
  tag.updatedAt = Date.now();
  saveAnnotations(all);
  return tag;
}

export function deleteTag(addrId, tagId) {
  const all = loadAnnotations();
  if (!all[addrId]) return;

  all[addrId].tags = all[addrId].tags.filter(t => t.id !== tagId);
  saveAnnotations(all);
}

export function setHighlight(addrId, highlightData) {
  const all = loadAnnotations();
  if (!all[addrId]) {
    all[addrId] = { tags: [], highlight: null };
  }

  const now = Date.now();
  all[addrId].highlight = {
    bgColor: highlightData.bgColor || getJsColor('highlight-bg'),
    fontColor: highlightData.fontColor || getJsColor('highlight-font'),
    title: highlightData.title || '',
    notes: highlightData.notes || '',
    startDate: highlightData.startDate || null,
    endDate: highlightData.endDate || null,
    createdAt: highlightData.createdAt || now,
    updatedAt: now,
    alert: highlightData.alert || null
  };

  saveAnnotations(all);
  return all[addrId].highlight;
}

export function clearHighlight(addrId) {
  const all = loadAnnotations();
  if (!all[addrId]) return;

  all[addrId].highlight = null;
  saveAnnotations(all);
}

export function setTagAlert(addrId, tagId, alertConfig) {
  const all = loadAnnotations();
  if (!all[addrId]) return;

  const tag = all[addrId].tags.find(t => t.id === tagId);
  if (!tag) return;

  tag.alert = {
    type: alertConfig.type || 'reminder',
    schedule: alertConfig.schedule || { mode: 'one-time', value: null },
    snoozedUntil: alertConfig.snoozedUntil || null,
    acknowledged: alertConfig.acknowledged || false,
    lastTriggered: alertConfig.lastTriggered || null
  };
  tag.updatedAt = Date.now();
  saveAnnotations(all);
}

export function clearTagAlert(addrId, tagId) {
  const all = loadAnnotations();
  if (!all[addrId]) return;

  const tag = all[addrId].tags.find(t => t.id === tagId);
  if (!tag) return;

  tag.alert = null;
  tag.updatedAt = Date.now();
  saveAnnotations(all);
}

export function setHighlightAlert(addrId, alertConfig) {
  const all = loadAnnotations();
  if (!all[addrId] || !all[addrId].highlight) return;

  all[addrId].highlight.alert = {
    type: alertConfig.type || 'reminder',
    schedule: alertConfig.schedule || { mode: 'one-time', value: null },
    snoozedUntil: alertConfig.snoozedUntil || null,
    acknowledged: alertConfig.acknowledged || false,
    lastTriggered: alertConfig.lastTriggered || null
  };
  all[addrId].highlight.updatedAt = Date.now();
  saveAnnotations(all);
}

export function clearHighlightAlert(addrId) {
  const all = loadAnnotations();
  if (!all[addrId] || !all[addrId].highlight) return;

  all[addrId].highlight.alert = null;
  all[addrId].highlight.updatedAt = Date.now();
  saveAnnotations(all);
}

export function snoozeAlert(addrId, tagId, snoozedUntilTimestamp) {
  const all = loadAnnotations();
  if (!all[addrId]) return;

  if (tagId === null) {
    if (all[addrId].highlight && all[addrId].highlight.alert) {
      all[addrId].highlight.alert.snoozedUntil = snoozedUntilTimestamp;
      all[addrId].highlight.updatedAt = Date.now();
    }
  } else {
    const tag = all[addrId].tags.find(t => t.id === tagId);
    if (tag && tag.alert) {
      tag.alert.snoozedUntil = snoozedUntilTimestamp;
      tag.updatedAt = Date.now();
    }
  }

  saveAnnotations(all);
}

export function acknowledgeAlert(addrId, tagId) {
  const all = loadAnnotations();
  if (!all[addrId]) return;

  if (tagId === null) {
    if (all[addrId].highlight && all[addrId].highlight.alert) {
      all[addrId].highlight.alert.acknowledged = true;
      all[addrId].highlight.updatedAt = Date.now();
    }
  } else {
    const tag = all[addrId].tags.find(t => t.id === tagId);
    if (tag && tag.alert) {
      tag.alert.acknowledged = true;
      tag.updatedAt = Date.now();
    }
  }

  saveAnnotations(all);
}

export function evaluateAlerts() {
  const all = loadAnnotations();
  const activeAlerts = [];
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  for (const [addrId, data] of Object.entries(all)) {
    for (const tag of data.tags) {
      if (!tag.alert) continue;

      const alert = tag.alert;
      if (alert.snoozedUntil && alert.snoozedUntil > now) continue;

      if (alert.schedule.mode === 'one-time') {
        if (!alert.schedule.value) continue;

        const alertDate = new Date(alert.schedule.value);
        alertDate.setHours(0, 0, 0, 0);
        const alertDateMs = alertDate.getTime();

        const daysDiff = Math.floor((alertDateMs - todayMs) / (1000 * 60 * 60 * 24));

        let isActive = false;
        let isExpired = false;

        if (alert.type === 'reminder') {
          if (daysDiff >= -3 && daysDiff <= 7 && !alert.acknowledged) {
            isActive = true;
          }
        } else if (alert.type === 'expiration') {
          if (daysDiff <= 7 && !alert.acknowledged) {
            isActive = true;
            if (daysDiff < 0) {
              isExpired = true;
            }
          }
        }

        if (isActive) {
          activeAlerts.push({
            addrId,
            tagId: tag.id,
            title: tag.title,
            type: alert.type,
            isExpired,
            daysUntil: daysDiff
          });
        }
      }
    }

    if (data.highlight && data.highlight.alert) {
      const alert = data.highlight.alert;
      if (alert.snoozedUntil && alert.snoozedUntil > now) continue;

      if (alert.schedule.mode === 'one-time') {
        if (!alert.schedule.value) continue;

        const alertDate = new Date(alert.schedule.value);
        alertDate.setHours(0, 0, 0, 0);
        const alertDateMs = alertDate.getTime();

        const daysDiff = Math.floor((alertDateMs - todayMs) / (1000 * 60 * 60 * 24));

        let isActive = false;
        let isExpired = false;

        if (alert.type === 'reminder') {
          if (daysDiff >= -3 && daysDiff <= 7 && !alert.acknowledged) {
            isActive = true;
          }
        } else if (alert.type === 'expiration') {
          if (daysDiff <= 7 && !alert.acknowledged) {
            isActive = true;
            if (daysDiff < 0) {
              isExpired = true;
            }
          }
        }

        if (isActive) {
          activeAlerts.push({
            addrId,
            tagId: null,
            title: data.highlight.title,
            type: alert.type,
            isExpired,
            daysUntil: daysDiff
          });
        }
      }
    }
  }

  return activeAlerts;
}

export function cleanupOrphans(validAddressIds) {
  const all = loadAnnotations();
  const validSet = new Set(validAddressIds);

  const cleaned = {};
  for (const [addrId, data] of Object.entries(all)) {
    if (validSet.has(addrId)) {
      cleaned[addrId] = data;
    }
  }

  saveAnnotations(cleaned);
}
