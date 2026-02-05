// editbook.js - Edit Book module for USPS Case Equipment Manager
import { EQUIPMENT_SPECS, SHELF_COUNT, RESERVED_STATUS_CODES, FORM_3982_PER_SHELF } from './models.js';

// Module state
let addresses = [];
let placements = [];
let routeInfo = { zip: '', routeNum: '001', routeType: 'R' };
let slotsRef = null; // set by initEditBook to avoid circular import

const STORAGE_KEY = 'editbook-addresses';
const ROUTE_KEY = 'editbook-route-info';

// Utility function for HTML escaping
function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Persistence functions
function loadAddresses() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.error('Failed to load addresses:', e);
  }
  return [];
}

function saveAddresses() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
  } catch (e) {
    console.error('Failed to save addresses:', e);
  }
}

function loadRouteInfo() {
  try {
    const data = localStorage.getItem(ROUTE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return {
        zip: parsed.zip || '',
        routeNum: parsed.routeNum || '001',
        routeType: parsed.routeType || 'R',
      };
    }
  } catch (e) { /* ignore */ }
  return { zip: '', routeNum: '001', routeType: 'R' };
}

function saveRouteInfo() {
  try {
    localStorage.setItem(ROUTE_KEY, JSON.stringify(routeInfo));
  } catch (e) { /* ignore */ }
}

function bindRouteFields() {
  const zipEl = document.getElementById('routeZip');
  const numEl = document.getElementById('routeNum');
  const typeEl = document.getElementById('routeType');

  if (zipEl) {
    zipEl.value = routeInfo.zip;
    zipEl.addEventListener('input', () => {
      routeInfo.zip = zipEl.value.replace(/\D/g, '').slice(0, 5);
      zipEl.value = routeInfo.zip;
      saveRouteInfo();
    });
  }

  if (numEl) {
    numEl.value = routeInfo.routeNum;
    numEl.addEventListener('input', () => {
      let raw = numEl.value.replace(/\D/g, '').slice(0, 3);
      routeInfo.routeNum = raw.padStart(3, '0');
      saveRouteInfo();
    });
    numEl.addEventListener('blur', () => {
      numEl.value = routeInfo.routeNum;
    });
  }

  if (typeEl) {
    typeEl.value = routeInfo.routeType;
    typeEl.addEventListener('input', () => {
      let raw = typeEl.value.replace(/[^A-Za-z]/g, '').slice(0, 1).toUpperCase();
      routeInfo.routeType = raw || 'R';
      typeEl.value = routeInfo.routeType;
      saveRouteInfo();
    });
  }
}

// Create new address object with defaults
function createAddress() {
  return {
    id: 'addr-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    primaryAddress: '',
    streetName: '',
    secyAbbr: '',
    secyUnit: '',
    delvType: '',
    usgCode: '',
    noStat: false,
    vacInd: false,
    addressSort: 1,
    cellSize: 1
  };
}

// Table rendering
function renderTable() {
  const tbody = document.querySelector('#editBookTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '';

  addresses.forEach((addr, idx) => {
    const row = document.createElement('tr');
    row.dataset.index = idx;

    // Seq# (readonly)
    const seqCell = document.createElement('td');
    seqCell.textContent = idx + 1;
    seqCell.className = 'seq-cell';
    row.appendChild(seqCell);

    // Primary Address
    const primaryCell = document.createElement('td');
    primaryCell.contentEditable = 'true';
    primaryCell.textContent = addr.primaryAddress;
    primaryCell.dataset.field = 'primaryAddress';
    row.appendChild(primaryCell);

    // Street Name
    const streetCell = document.createElement('td');
    streetCell.contentEditable = 'true';
    streetCell.textContent = addr.streetName;
    streetCell.dataset.field = 'streetName';
    row.appendChild(streetCell);

    // Secy Abbr
    const secyAbbrCell = document.createElement('td');
    secyAbbrCell.contentEditable = 'true';
    secyAbbrCell.textContent = addr.secyAbbr;
    secyAbbrCell.dataset.field = 'secyAbbr';
    row.appendChild(secyAbbrCell);

    // Secy Unit
    const secyUnitCell = document.createElement('td');
    secyUnitCell.contentEditable = 'true';
    secyUnitCell.textContent = addr.secyUnit;
    secyUnitCell.dataset.field = 'secyUnit';
    row.appendChild(secyUnitCell);

    // Delv Type
    const delvTypeCell = document.createElement('td');
    delvTypeCell.contentEditable = 'true';
    delvTypeCell.textContent = addr.delvType;
    delvTypeCell.dataset.field = 'delvType';
    row.appendChild(delvTypeCell);

    // USG Code
    const usgCodeCell = document.createElement('td');
    usgCodeCell.contentEditable = 'true';
    usgCodeCell.textContent = addr.usgCode;
    usgCodeCell.dataset.field = 'usgCode';
    row.appendChild(usgCodeCell);

    // No Stat (checkbox)
    const noStatCell = document.createElement('td');
    const noStatCheck = document.createElement('input');
    noStatCheck.type = 'checkbox';
    noStatCheck.checked = addr.noStat;
    noStatCheck.dataset.field = 'noStat';
    noStatCell.appendChild(noStatCheck);
    row.appendChild(noStatCell);

    // Vac Ind (checkbox)
    const vacIndCell = document.createElement('td');
    const vacIndCheck = document.createElement('input');
    vacIndCheck.type = 'checkbox';
    vacIndCheck.checked = addr.vacInd;
    vacIndCheck.dataset.field = 'vacInd';
    vacIndCell.appendChild(vacIndCheck);
    row.appendChild(vacIndCell);

    // Address Sort
    const sortCell = document.createElement('td');
    const sortInput = document.createElement('input');
    sortInput.type = 'number';
    sortInput.value = addr.addressSort;
    sortInput.dataset.field = 'addressSort';
    sortInput.min = '1';
    sortCell.appendChild(sortInput);
    row.appendChild(sortCell);

    // Cell Size
    const sizeCell = document.createElement('td');
    const sizeInput = document.createElement('input');
    sizeInput.type = 'number';
    sizeInput.value = addr.cellSize;
    sizeInput.dataset.field = 'cellSize';
    sizeInput.min = '0';
    sizeCell.appendChild(sizeInput);
    row.appendChild(sizeCell);

    // Delete button
    const deleteCell = document.createElement('td');
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete-row';
    deleteBtn.textContent = 'DELETE';
    deleteCell.appendChild(deleteBtn);
    row.appendChild(deleteCell);

    tbody.appendChild(row);
  });

  // Attach event handlers
  attachTableHandlers();
}

function attachTableHandlers() {
  const tbody = document.querySelector('#editBookTable tbody');
  if (!tbody) return;

  // Handle contenteditable blur
  tbody.querySelectorAll('[contenteditable="true"]').forEach(cell => {
    cell.addEventListener('blur', handleCellBlur);
    cell.addEventListener('keydown', handleCellKeydown);
  });

  // Handle checkbox changes
  tbody.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.addEventListener('change', handleCheckboxChange);
  });

  // Handle number input changes
  tbody.querySelectorAll('input[type="number"]').forEach(input => {
    input.addEventListener('change', handleNumberChange);
  });

  // Handle delete buttons
  tbody.querySelectorAll('.btn-delete-row').forEach(btn => {
    btn.addEventListener('click', handleDeleteRow);
  });
}

function handleCellBlur(e) {
  const cell = e.target;
  const row = cell.closest('tr');
  const idx = parseInt(row.dataset.index, 10);
  const field = cell.dataset.field;

  if (idx >= 0 && idx < addresses.length && field) {
    addresses[idx][field] = cell.textContent.trim();
    saveAddresses();
  }
}

function handleCellKeydown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const cell = e.target;
    cell.blur(); // Save current cell

    // Move to next editable cell
    const row = cell.closest('tr');
    const cells = Array.from(row.querySelectorAll('[contenteditable="true"], input[type="number"]'));
    const currentIdx = cells.indexOf(cell);

    if (currentIdx >= 0 && currentIdx < cells.length - 1) {
      // Next cell in same row
      cells[currentIdx + 1].focus();
    } else {
      // First cell of next row
      const nextRow = row.nextElementSibling;
      if (nextRow) {
        const firstEditable = nextRow.querySelector('[contenteditable="true"]');
        if (firstEditable) firstEditable.focus();
      }
    }
  }
}

function handleCheckboxChange(e) {
  const checkbox = e.target;
  const row = checkbox.closest('tr');
  const idx = parseInt(row.dataset.index, 10);
  const field = checkbox.dataset.field;

  if (idx >= 0 && idx < addresses.length && field) {
    addresses[idx][field] = checkbox.checked;
    saveAddresses();
  }
}

function handleNumberChange(e) {
  const input = e.target;
  const row = input.closest('tr');
  const idx = parseInt(row.dataset.index, 10);
  const field = input.dataset.field;

  if (idx >= 0 && idx < addresses.length && field) {
    const value = parseInt(input.value, 10);
    addresses[idx][field] = isNaN(value) ? 1 : value;
    saveAddresses();
  }
}

function handleDeleteRow(e) {
  const row = e.target.closest('tr');
  const idx = parseInt(row.dataset.index, 10);

  if (idx >= 0 && idx < addresses.length) {
    addresses.splice(idx, 1);
    saveAddresses();
    renderTable();
  }
}

// Add row handler
function handleAddRow() {
  const newAddr = createAddress();
  addresses.push(newAddr);
  saveAddresses();
  renderTable();

  // Focus first editable cell of new row
  const tbody = document.querySelector('#editBookTable tbody');
  if (tbody) {
    const lastRow = tbody.lastElementChild;
    if (lastRow) {
      const firstEditable = lastRow.querySelector('[contenteditable="true"]');
      if (firstEditable) {
        setTimeout(() => firstEditable.focus(), 50);
      }
    }
  }
}

// Bulk import handlers
function handleBulkImport() {
  const dialog = document.getElementById('bulkImportDialog');
  if (dialog) dialog.classList.add('active');
}

function handleImportCancel() {
  const dialog = document.getElementById('bulkImportDialog');
  if (dialog) dialog.classList.remove('active');
}

function handleImportConfirm() {
  const textarea = document.getElementById('bulkImportText');
  if (!textarea) return;

  const text = textarea.value.trim();
  if (!text) {
    handleImportCancel();
    return;
  }

  const lines = text.split('\n').map(line => line.trim()).filter(line => line);
  if (lines.length === 0) {
    handleImportCancel();
    return;
  }

  // Detect delimiter
  const hasTab = lines.some(line => line.includes('\t'));
  const delimiter = hasTab ? '\t' : ',';

  // Check for header row
  let startIdx = 0;
  if (lines[0].toLowerCase().includes('seq')) {
    startIdx = 1;
  }

  // Parse rows
  for (let i = startIdx; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim());
    if (cols.length < 2) continue; // Skip invalid rows

    const addr = createAddress();

    // Skip seq (col 0)
    addr.primaryAddress = cols[1] || '';
    addr.streetName = cols[2] || '';
    addr.secyAbbr = cols[3] || '';
    addr.secyUnit = cols[4] || '';
    addr.delvType = cols[5] || '';
    addr.usgCode = cols[6] || '';

    // Parse boolean fields
    const noStatVal = (cols[7] || '').toLowerCase();
    addr.noStat = noStatVal === 'y' || noStatVal === '1' || noStatVal === 'true';

    const vacIndVal = (cols[8] || '').toLowerCase();
    addr.vacInd = vacIndVal === 'y' || vacIndVal === '1' || vacIndVal === 'true';

    // Parse numeric fields
    const sortVal = parseInt(cols[9], 10);
    addr.addressSort = isNaN(sortVal) ? 1 : sortVal;

    const sizeVal = parseInt(cols[10], 10);
    addr.cellSize = isNaN(sizeVal) ? 1 : sizeVal;

    addresses.push(addr);
  }

  saveAddresses();
  renderTable();

  // Close dialog and clear textarea
  textarea.value = '';
  handleImportCancel();
}

// Cell filling algorithm
function fillCells() {
  const wings = [];

  slotsRef.forEach((slotType, slotIdx) => {
    if (slotType && EQUIPMENT_SPECS[slotType]) {
      wings.push({
        slotIdx,
        type: slotType,
        cellsPerShelf: EQUIPMENT_SPECS[slotType].cellsPerShelf
      });
    }
  });

  if (wings.length === 0) {
    placements = [];
    return placements;
  }

  const totalStatusWidth = RESERVED_STATUS_CODES.reduce((sum, sc) => sum + sc.width, 0);

  // Track next free cell and max usable cell per wing-shelf
  // Form 3982 reserves cell 1 (start), status codes reserve last N cells (end)
  const nextFree = {};
  const maxUsable = {};

  wings.forEach((wing, wingIdx) => {
    for (let shelf = 1; shelf <= SHELF_COUNT; shelf++) {
      const key = `${wingIdx}-${shelf}`;
      let start = 1;
      let end = wing.cellsPerShelf;

      if (wingIdx === 0) {
        start += FORM_3982_PER_SHELF;
      }
      if (wingIdx === wings.length - 1 && shelf === 1) {
        end -= totalStatusWidth;
      }

      nextFree[key] = start;
      maxUsable[key] = end;
    }
  });

  // Place addresses shelf by shelf, wings L→R
  const newPlacements = [];
  const placed = new Set();
  const addressesToPlace = addresses.filter(a => a.cellSize > 0);

  for (let shelf = 1; shelf <= SHELF_COUNT; shelf++) {
    for (const addr of addressesToPlace) {
      if (placed.has(addr.id)) continue;

      for (let wingIdx = 0; wingIdx < wings.length; wingIdx++) {
        const key = `${wingIdx}-${shelf}`;
        const available = Math.max(0, maxUsable[key] - nextFree[key] + 1);

        if (available >= addr.cellSize) {
          newPlacements.push({
            addressId: addr.id,
            wingIdx,
            shelfNum: shelf,
            startCell: nextFree[key],
            cellSize: addr.cellSize
          });
          nextFree[key] += addr.cellSize;
          placed.add(addr.id);
          break;
        }
      }
    }
  }

  placements = newPlacements;
  return placements;
}

// Apply to case handler
function showStatus(msg) {
  const statusEl = document.getElementById('applyStatus');
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.style.display = 'block';
  clearTimeout(showStatus._timer);
  showStatus._timer = setTimeout(() => { statusEl.style.display = 'none'; }, 5000);
}

function handleApplyToCase() {
  // Check prerequisites
  const hasEquipment = slotsRef && slotsRef.some(s => s !== null);
  if (!hasEquipment) {
    showStatus('NO EQUIPMENT CONFIGURED — SET UP EQUIPMENT FIRST');
    return;
  }

  const totalAddresses = addresses.filter(a => a.cellSize > 0).length;
  if (totalAddresses === 0) {
    showStatus('NO ADDRESSES TO PLACE — ADD ADDRESSES FIRST');
    return;
  }

  const results = fillCells();
  const placed = results.length;
  const displaced = totalAddresses - placed;

  if (displaced > 0) {
    showStatus(`PLACED ${placed} OF ${totalAddresses} ADDRESSES. ${displaced} DISPLACED.`);
  } else {
    showStatus(`PLACED ${placed} OF ${totalAddresses} ADDRESSES.`);
  }

  saveAddresses();
}

// Public API
export function initEditBook(slots) {
  slotsRef = slots;
  addresses = loadAddresses();
  routeInfo = loadRouteInfo();
  bindRouteFields();
  renderTable();

  // Bind buttons
  const btnAddRow = document.getElementById('btnAddRow');
  if (btnAddRow) btnAddRow.addEventListener('click', handleAddRow);

  const btnBulkImport = document.getElementById('btnBulkImport');
  if (btnBulkImport) btnBulkImport.addEventListener('click', handleBulkImport);

  const btnImportCancel = document.getElementById('btnImportCancel');
  if (btnImportCancel) btnImportCancel.addEventListener('click', handleImportCancel);

  const btnImportConfirm = document.getElementById('btnImportConfirm');
  if (btnImportConfirm) btnImportConfirm.addEventListener('click', handleImportConfirm);

  const btnApplyToCase = document.getElementById('btnApplyToCase');
  if (btnApplyToCase) btnApplyToCase.addEventListener('click', handleApplyToCase);
}

export function getAddresses() {
  return addresses;
}

export function getPlacedAddresses() {
  return placements;
}

export function resizeAddress(addrId, newCellSize) {
  const addr = addresses.find(a => a.id === addrId);
  if (!addr) return;
  addr.cellSize = Math.max(1, newCellSize);
  saveAddresses();
  fillCells();
  renderTable();
}

export function getRouteInfo() {
  return routeInfo;
}

export function applyToCase() {
  const hasEquipment = slotsRef && slotsRef.some(s => s !== null);
  if (!hasEquipment) return null;
  const toPlace = addresses.filter(a => a.cellSize > 0);
  if (toPlace.length === 0) return null;
  const results = fillCells();
  saveAddresses();
  return { placed: results.length, total: toPlace.length };
}
