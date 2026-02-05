/**
 * Edit Book Assist — Models
 *
 * Equipment specs, reserved cell definitions, case state.
 */

export const SHELF_COUNT = 6;

export const EQUIPMENT_SPECS = {
  '124-D': { cellsPerShelf: 40, totalCells: 240, hasDesk: false, label: 'Item 124-D', desc: '6-shelf carrier case, 40 cells/shelf' },
  '143-D': { cellsPerShelf: 20, totalCells: 120, hasDesk: false, label: 'Item 143-D', desc: '6-shelf half-width case, 20 cells/shelf' },
  '144-D': { cellsPerShelf: 40, totalCells: 240, hasDesk: true,  label: 'Item 144-D',  desc: '6-shelf carrier case with desk, 40 cells/shelf' },
};

export const EQUIPMENT_OPTIONS = [null, '124-D', '143-D', '144-D'];

export const RESERVED_STATUS_CODES = [
  { label: 'MACH',     fullName: 'Machineable',         width: 1 },
  { label: 'NON-MACH', fullName: 'Non-Machineable',     width: 2 },
  { label: 'UTF',      fullName: 'Unable to Forward',   width: 1 },
  { label: 'IA',       fullName: 'Insufficient Address', width: 1 },
  { label: 'NSN',      fullName: 'No Such Number',      width: 1 },
  { label: 'ANK',      fullName: 'Attempted Not Known', width: 1 },
  { label: 'OTHER',    fullName: 'Other',               width: 1 },
];

// Form 3982 reserved cells: 1 per shelf on the leftmost wing (position 0)
export const FORM_3982_PER_SHELF = 1;

/**
 * Reserved cell counts derived from equipment configuration.
 * - Form 3982: 1 cell per shelf on the leftmost occupied wing (6 total)
 * - Status codes: occupy end of shelf 1 on the rightmost occupied wing
 */
export function getReservedInfo(slots) {
  const reserved = {
    form3982: { count: 0, location: null },
    statusCodes: [],
    totalReservedCells: 0,
  };

  // Find leftmost and rightmost occupied slots
  let leftmost = -1;
  let rightmost = -1;
  for (let i = 0; i < 4; i++) {
    if (slots[i]) {
      if (leftmost === -1) leftmost = i;
      rightmost = i;
    }
  }

  if (leftmost === -1) return reserved; // no equipment

  // Form 3982: 1 cell per shelf on leftmost wing
  reserved.form3982.count = SHELF_COUNT;
  reserved.form3982.location = `Slot ${leftmost + 1}, all shelves`;

  // Status codes: end of shelf 1 on rightmost wing
  let statusCellCount = 0;
  for (const sc of RESERVED_STATUS_CODES) {
    reserved.statusCodes.push({
      ...sc,
      location: `Slot ${rightmost + 1}, shelf 1`,
    });
    statusCellCount += sc.width;
  }

  reserved.totalReservedCells = reserved.form3982.count + statusCellCount;
  return reserved;
}

/**
 * Compute full case stats from slot selections.
 */
export function getCaseStats(slots) {
  let totalCells = 0;
  const equipmentNames = [];

  for (let i = 0; i < 4; i++) {
    const type = slots[i];
    if (type && EQUIPMENT_SPECS[type]) {
      totalCells += EQUIPMENT_SPECS[type].totalCells;
      equipmentNames.push(EQUIPMENT_SPECS[type].label);
    } else {
      equipmentNames.push('None');
    }
  }

  const reserved = getReservedInfo(slots);
  const usableCells = totalCells - reserved.totalReservedCells;

  return {
    slots: equipmentNames,
    totalCells,
    reservedCells: reserved.totalReservedCells,
    usableCells,
    cellsAvailable: usableCells, // no addresses placed yet at this zoom level
    totalAddresses: 0,
    reserved,
  };
}
