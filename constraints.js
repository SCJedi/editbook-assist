/**
 * Edit Book Assist — Constraint Engine
 *
 * Pure validation logic. Called on every state mutation.
 * Validates proposed state and either allows, adjusts (snapping), or rejects.
 */

import { isReservedCell, getCellById } from './models.js';

// ============================================================
// Constraint Result
// ============================================================

/**
 * @typedef {Object} ConstraintResult
 * @property {boolean} valid
 * @property {string} [violation] - Type of violation
 * @property {string} [message] - Human-readable message
 * @property {Object} [suggestedFix] - How to resolve
 */

// ============================================================
// Individual Validators
// ============================================================

/**
 * Validate that a cell does not extend past the wing boundary.
 */
export function validateWingBoundary(cell, wing) {
  const cellEnd = cell.positionInShelf + cell.widthInches;
  const wingWidth = wing.cellsPerShelf;

  if (cellEnd > wingWidth) {
    return {
      valid: false,
      violation: 'wing-boundary',
      message: `Cell "${cell.address?.addressNumber || cell.id}" would extend ${cellEnd - wingWidth}" beyond wing boundary`,
      suggestedFix: {
        action: 'shrink',
        maxWidth: wingWidth - cell.positionInShelf,
      },
    };
  }
  return { valid: true };
}

/**
 * Validate that reserved cells are not modified.
 */
export function validateReservedProtection(mutation) {
  if (mutation.type === 'RESIZE_CELL' || mutation.type === 'EDIT_CELL' || mutation.type === 'CLEAR_CELL') {
    if (mutation.cell && isReservedCell(mutation.cell)) {
      return {
        valid: false,
        violation: 'reserved-cell',
        message: `Cannot modify reserved cell (${mutation.cell.type})`,
      };
    }
  }
  return { valid: true };
}

/**
 * Validate minimum cell width (1 inch).
 */
export function validateMinWidth(cell, proposedWidth) {
  if (proposedWidth < 1) {
    return {
      valid: false,
      violation: 'min-width',
      message: 'Cell width cannot be less than 1 inch',
      suggestedFix: { action: 'snap', width: 1 },
    };
  }
  return { valid: true };
}

/**
 * Validate total shelf width doesn't exceed wing capacity.
 */
export function validateShelfOverflow(shelf, wing) {
  const totalWidth = shelf.cells.reduce((sum, c) => sum + c.widthInches, 0);
  if (totalWidth > wing.cellsPerShelf) {
    return {
      valid: false,
      violation: 'shelf-overflow',
      message: `Shelf ${shelf.shelfNumber} total width (${totalWidth}") exceeds wing capacity (${wing.cellsPerShelf}")`,
      suggestedFix: {
        action: 'truncate',
        overflow: totalWidth - wing.cellsPerShelf,
      },
    };
  }
  return { valid: true };
}

// ============================================================
// Neighbor Displacement (Resize Logic)
// ============================================================

/**
 * Resolve neighbor displacement when a cell is resized.
 * Zero-sum operation within a wing's shelf row.
 *
 * @param {Object} config - Case configuration
 * @param {string} cellId - Cell being resized
 * @param {number} newWidth - Proposed new width
 * @returns {{ valid: boolean, adjustments: Array, maxWidth: number }}
 */
export function resolveNeighborDisplacement(config, cellId, newWidth) {
  const cell = getCellById(config, cellId);
  if (!cell) return { valid: false, adjustments: [], maxWidth: 0 };

  if (isReservedCell(cell)) {
    return { valid: false, adjustments: [], maxWidth: cell.widthInches, message: 'Cannot resize reserved cell' };
  }

  const minResult = validateMinWidth(cell, newWidth);
  if (!minResult.valid) {
    return { valid: false, adjustments: [], maxWidth: cell.widthInches, message: minResult.message };
  }

  const delta = newWidth - cell.widthInches;
  if (delta === 0) return { valid: true, adjustments: [], maxWidth: newWidth };

  // Find the shelf containing this cell
  let targetShelf = null;
  let targetWing = null;
  for (const wing of config.wings) {
    for (const shelf of wing.shelves) {
      if (shelf.cells.some(c => c.id === cellId)) {
        targetShelf = shelf;
        targetWing = wing;
        break;
      }
    }
    if (targetShelf) break;
  }

  if (!targetShelf) return { valid: false, adjustments: [], maxWidth: cell.widthInches };

  const cellIndex = targetShelf.cells.findIndex(c => c.id === cellId);
  const adjustments = [];

  if (delta > 0) {
    // Expanding: shrink neighbors to the right
    let remaining = delta;
    for (let i = cellIndex + 1; i < targetShelf.cells.length && remaining > 0; i++) {
      const neighbor = targetShelf.cells[i];
      if (isReservedCell(neighbor)) continue; // Can't shrink reserved cells

      const canShrink = neighbor.widthInches - 1; // Can shrink down to 1"
      if (canShrink <= 0) continue;

      const shrinkAmount = Math.min(remaining, canShrink);
      adjustments.push({
        cellId: neighbor.id,
        oldWidth: neighbor.widthInches,
        newWidth: neighbor.widthInches - shrinkAmount,
      });
      remaining -= shrinkAmount;
    }

    if (remaining > 0) {
      // Not enough room — clamp the expansion
      const actualExpansion = delta - remaining;
      return {
        valid: actualExpansion > 0,
        adjustments,
        maxWidth: cell.widthInches + actualExpansion,
        message: remaining > 0 ? `Can only expand by ${actualExpansion}" (neighbors at minimum width)` : undefined,
      };
    }
  } else {
    // Shrinking: expand the immediate right neighbor
    const shrinkAmount = Math.abs(delta);
    for (let i = cellIndex + 1; i < targetShelf.cells.length; i++) {
      const neighbor = targetShelf.cells[i];
      if (isReservedCell(neighbor)) continue;

      adjustments.push({
        cellId: neighbor.id,
        oldWidth: neighbor.widthInches,
        newWidth: neighbor.widthInches + shrinkAmount,
      });
      break; // Only expand the first non-reserved neighbor
    }
  }

  return {
    valid: true,
    adjustments,
    maxWidth: newWidth,
  };
}

// ============================================================
// Full Validation
// ============================================================

/**
 * Run all validators on the configuration.
 * Constraints checked in order (fail-fast):
 * 1. Reserved cell protection
 * 2. Minimum width
 * 3. Wing boundary
 * 4. Shelf overflow
 */
export function validateAll(config) {
  const violations = [];

  for (const wing of config.wings) {
    for (const shelf of wing.shelves) {
      // Check shelf total doesn't exceed wing
      const shelfResult = validateShelfOverflow(shelf, wing);
      if (!shelfResult.valid) violations.push(shelfResult);

      for (const cell of shelf.cells) {
        // Check min width
        const minResult = validateMinWidth(cell, cell.widthInches);
        if (!minResult.valid) violations.push({ ...minResult, cellId: cell.id });

        // Check wing boundary
        const boundaryResult = validateWingBoundary(cell, wing);
        if (!boundaryResult.valid) violations.push({ ...boundaryResult, cellId: cell.id });
      }
    }
  }

  return violations;
}

/**
 * Attempt to auto-resolve violations by applying suggested fixes.
 */
export function autoResolve(config, violations) {
  for (const v of violations) {
    if (!v.suggestedFix || !v.cellId) continue;

    const cell = getCellById(config, v.cellId);
    if (!cell) continue;

    switch (v.suggestedFix.action) {
      case 'snap':
        cell.widthInches = v.suggestedFix.width;
        break;
      case 'shrink':
        cell.widthInches = Math.max(1, v.suggestedFix.maxWidth);
        break;
    }
  }
}
