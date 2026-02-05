# Edit Book Assist — Technical Design Document

**Version**: 1.0
**Date**: 2026-01-30
**Status**: Ready for competing build teams
**Audience**: Two independent implementation teams

---

## Table of Contents

1. [Architecture](#1-architecture)
2. [Visual Design Spec](#2-visual-design-spec)
3. [Interaction Design](#3-interaction-design)
4. [Constraint Engine](#4-constraint-engine)
5. [Data Flow](#5-data-flow)
6. [Alert System](#6-alert-system)
7. [Rendering Strategy](#7-rendering-strategy)

---

## 1. Architecture

### 1.1 Technology Stack

**Pure HTML/CSS/JS.** No frameworks. No build tools required. The deliverable is a single `index.html` file that references a `style.css` and `app.js` (or a single bundled HTML file with inline styles and script). This tool runs entirely client-side — no server, no backend.

**Why no framework**: The interaction model is spatial and direct-manipulation. React/Vue/Svelte add a virtual DOM reconciliation layer that fights against the kind of fine-grained pixel-level control needed for cell resizing, drag handles, and glow effects. The state is simple (a flat array of cells with metadata). The DOM node count is manageable (~800 elements). A framework would add bundle weight, build complexity, and abstraction overhead with no compensating benefit.

### 1.2 Rendering Decision: SVG

**Recommendation: SVG for the case rendering. DOM/HTML for all panels, menus, and editors.**

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **Canvas** | Fast for thousands of elements, full pixel control | No native hit testing (must implement manually), no CSS hover/focus, accessibility nightmare, text rendering requires manual measurement, no DOM events on individual cells | Reject |
| **Pure DOM** | Native events, accessibility, CSS styling | Box model fights against precise spatial layout, border-collapse issues at 1" cell scale, performance concerns with 720+ absolutely-positioned divs | Reject |
| **SVG** | Vector (scales perfectly for zoom), native hit testing on every element, CSS-styleable, supports filters/glow natively, `<title>` for accessibility, grouping with `<g>` maps to equipment/shelf/cell hierarchy | Slightly slower than canvas for very high element counts (not an issue at 720-960 elements) | **Select** |

**SVG wins because:**
1. Hit testing is free — every `<rect>` receives mouse events natively
2. CSS filters (`drop-shadow`, `feGaussianBlur`) give us the amber glow effect without JS
3. The hierarchical grouping (`<svg>` → `<g class="wing">` → `<g class="shelf">` → `<rect class="cell">`) mirrors the equipment data model exactly
4. Zoom is a single `viewBox` attribute change — no re-rendering
5. Text in cells is native `<text>` elements with automatic clipping via `<clipPath>`

### 1.3 Application Structure

```
index.html          — Shell: toolbar, mode switcher, panels
├── style.css       — All styling including SVG styles, animations, glow effects
├── app.js          — Entry point, mode controller, event bus
├── models.js       — Data model classes and state management
├── renderer.js     — SVG generation and update logic
├── equipment.js    — Equipment builder mode logic
├── celleditor.js   — Cell editor mode logic
├── resize.js       — Drag-to-resize mode logic
├── constraints.js  — Constraint engine (boundary enforcement, snap logic)
├── alerts.js       — Alert system (date tracking, visual effects)
└── persistence.js  — localStorage save/load, import/export
```

For single-file delivery, concatenate these with an IIFE wrapper. For development, use ES modules with `<script type="module">`.

### 1.4 State Management

No state management library. A single `AppState` object serves as the source of truth. All mutations go through a central `dispatch(action, payload)` function that:

1. Clones the current state onto the undo stack
2. Applies the mutation
3. Runs constraint validation
4. Triggers a re-render of affected SVG elements (not full re-render — targeted updates)
5. Persists to localStorage (debounced, 500ms)

```typescript
// Central state — the single source of truth
interface AppState {
  config: CaseConfiguration;
  mode: 'equipment' | 'cell-editor' | 'resize';
  view: ViewState;
  selection: SelectionState;
  undoStack: CaseConfiguration[];
  redoStack: CaseConfiguration[];
  alerts: Alert[];
}

interface ViewState {
  zoom: 'overview' | 'shelf';
  focusedShelf: number | null;    // 1-6, null = overview
  focusedWing: string | null;     // wing ID, null = all
  panX: number;
  panY: number;
}

interface SelectionState {
  selectedCellId: string | null;
  hoveredCellId: string | null;
  dragState: DragState | null;
}
```

### 1.5 Data Model

```typescript
// === Equipment Model ===

interface CaseConfiguration {
  id: string;
  routeId: string;
  wings: Wing[];                    // Ordered left to right
  casingDirection: 'left-to-right'; // Always L→R across all wings per shelf, bottom to top
  createdAt: string;                // ISO 8601
  modifiedAt: string;
}

interface Wing {
  id: string;
  position: number;                 // 0 = leftmost, 1 = middle, 2 = right, 3 = extra
  equipmentType: '124-D' | '143-D' | '144-D';
  label: string;                    // "Left Wing", "Middle Wing", etc.
  hasDesk: boolean;                 // true only for 144-D
  cellsPerShelf: number;           // 40 (124-D, 144-D) or 20 (143-D)
  totalCells: number;              // 240 (124-D, 144-D) or 120 (143-D)
  shelves: Shelf[];                // Always 6, indexed 0-5 (display as 1-6)
}

interface Shelf {
  id: string;
  wingId: string;
  shelfNumber: number;             // 1 (bottom) to 6 (top)
  cells: Cell[];                   // Ordered left to right within this wing's shelf
  totalWidthInches: number;        // Sum of all cell widths on this shelf segment
}

// === Cell Model ===

interface Cell {
  id: string;
  shelfId: string;
  wingId: string;
  shelfNumber: number;
  positionInShelf: number;         // 0-based index from left within this wing
  widthInches: number;             // Minimum 1, can be 1, 2, 3, 4...
  type: CellType;
  address: AddressData | null;     // null for reserved cells
  stickers: Sticker[];
  streetColor: string | null;      // Hex color for street highlight
}

type CellType =
  | 'address'                      // Normal address cell
  | 'form-3982'                    // Form 3982 (first cell of each shelf row)
  | 'reserved-mach'               // Machineable
  | 'reserved-nonmach'            // Non-machineable (2" wide)
  | 'reserved-utf'                // Unable to Forward
  | 'reserved-ia'                 // Insufficient Address
  | 'reserved-nsn'                // No Such Number
  | 'reserved-ank'                // Attempted Not Known
  | 'reserved-other';             // Other status codes

// === Address Model ===

interface AddressData {
  id: string;
  addressNumber: string;           // "1234" — string because leading zeros, ranges like "1234-1238"
  streetName: string;              // "OAK ST"
  streetColor: string;             // Hex color for street grouping highlight
  unit: string | null;             // Apt/Suite/Unit
  deliveryPointSequence: number;   // DPS order for route sequencing
  notes: string;                   // Free text carrier notes
}

// === Sticker Model ===

interface Sticker {
  id: string;
  cellId: string;
  type: StickerType;
  label: string;                   // Short display text: "FWD", "HOLD", "VAC"
  details: string;                 // Full details shown on pop-open
  startDate: string | null;        // ISO 8601
  expirationDate: string | null;   // ISO 8601
  forwardAddress: string | null;   // Only for forward stickers
  createdAt: string;
  color: string;                   // Sticker badge color
}

type StickerType =
  | 'forward'                      // Mail being forwarded
  | 'hold'                         // Mail hold
  | 'vacant'                       // Address vacant
  | 'deceased'                     // Addressee deceased
  | 'dog'                          // Dog warning
  | 'custom';                      // Carrier-defined

// === Alert Model ===

interface Alert {
  id: string;
  stickerId: string;
  cellId: string;
  type: 'approaching-expiry' | 'expired';
  daysUntilExpiry: number;         // Negative = already expired
  message: string;
}

// === Drag State ===

interface DragState {
  cellId: string;
  edge: 'left' | 'right';
  startX: number;
  currentX: number;
  originalWidth: number;
  neighborCellId: string | null;   // The cell being compressed/expanded on the other side
  snappedWidth: number;            // Width after constraint snapping
}
```

### 1.6 Module Responsibilities

| Module | Responsibility |
|--------|---------------|
| `app.js` | Boot sequence, event bus (`on`/`emit`), mode controller, keyboard shortcuts |
| `models.js` | `AppState` factory, `dispatch()`, undo/redo, state immutability helpers |
| `renderer.js` | Build SVG DOM from state, differential update (mark dirty cells, re-render only those) |
| `equipment.js` | Equipment builder: context menus, add/remove/swap wing, re-flow addresses after equipment change |
| `celleditor.js` | Cell editor panel: form rendering, address CRUD, sticker CRUD, street color picker |
| `resize.js` | Drag-to-resize: pointer events, drag math, real-time preview, commit on release |
| `constraints.js` | All validation: wing boundaries, reserved cell protection, min width, overflow detection |
| `alerts.js` | Scan stickers for dates, compute alert states, apply CSS classes for visual effects |
| `persistence.js` | `localStorage` get/set, JSON import/export, data migration for schema changes |

---

## 2. Visual Design Spec

### 2.1 Color Palette

The aesthetic is a **CRT/LED instrumentation display** — amber phosphor on black. Think oscilloscope, flight instrument, or early terminal.

| Token | Hex | Usage |
|-------|-----|-------|
| `--bg` | `#000000` | Page background, panel backgrounds |
| `--bg-surface` | `#0a0a0a` | Elevated surfaces (panels, menus) |
| `--bg-panel` | `#111111` | Editor panels, context menus |
| `--amber-dim` | `#3d2e00` | Inactive cell borders, subtle lines |
| `--amber` | `#b8860b` | Default cell borders, body outlines, text |
| `--amber-bright` | `#daa520` | Active/selected elements, primary text |
| `--amber-glow` | `#ffc107` | Hover glow, highlights, emphasis |
| `--amber-hot` | `#ffd700` | Maximum emphasis, alerts approaching |
| `--red-alert` | `#ff3333` | Expired alerts, errors |
| `--red-glow` | `#ff333366` | Alert glow (semi-transparent for shadow) |
| `--green-ok` | `#33ff33` | Success states, valid indicators |
| `--reserved-fill` | `#1a1200` | Reserved cell background tint |
| `--form3982-fill` | `#0d1a00` | Form 3982 cell background (slightly green-tinted) |
| `--text-primary` | `#daa520` | Primary text (amber-bright) |
| `--text-secondary` | `#8b6914` | Secondary/dimmed text |
| `--text-on-sticker` | `#000000` | Text on colored sticker badges |

### 2.2 Glow Effects

All glow is achieved via **SVG filters** combined with **CSS transitions**.

```css
/* Base glow filter defined once in SVG <defs> */
<filter id="glow-amber">
  <feGaussianBlur stdDeviation="2" result="blur" />
  <feFlood flood-color="#ffc107" flood-opacity="0.6" />
  <feComposite in2="blur" operator="in" />
  <feMerge>
    <feMergeNode />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>

/* CSS class application */
.cell:hover {
  filter: url(#glow-amber);
  transition: filter 0.15s ease-out;
}

.cell.selected {
  filter: url(#glow-amber);
  stroke: var(--amber-glow);
  stroke-width: 2;
}

/* Equipment body hover — stronger glow */
.wing-body:hover {
  filter: url(#glow-amber-strong);  /* stdDeviation="4" */
}
```

**Why SVG filters over CSS box-shadow**: SVG filters apply to the vector shape itself, not a bounding box. A `box-shadow` on an SVG element via CSS would create a rectangular shadow around the element's bounding box, which looks wrong for non-rectangular shapes. SVG `feGaussianBlur` follows the actual shape contour.

**Performance note**: SVG filters are GPU-accelerated in all modern browsers. The `will-change: filter` hint should be applied to hoverable groups. Limit simultaneous glowing elements to ~50 (only visible cells in viewport).

### 2.3 Typography

```css
:root {
  --font-mono: 'JetBrains Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  --font-size-cell: 7px;        /* Address text inside 1" cells */
  --font-size-cell-lg: 9px;     /* Address text in 2"+ cells */
  --font-size-label: 10px;      /* Shelf labels, wing labels */
  --font-size-panel: 13px;      /* Editor panel text */
  --font-size-heading: 16px;    /* Panel headings */
}
```

**Monospace is mandatory.** Cell content must align predictably. Proportional fonts cause text overflow at small sizes. Monospace also reinforces the instrumentation aesthetic.

**Font loading**: Use system monospace as fallback. Optionally load JetBrains Mono from a `<link>` or inline the woff2 as a base64 data URI for single-file deployment.

### 2.4 Cell Rendering Detail

Each cell is rendered as an SVG `<g>` group containing:

```xml
<g class="cell" data-cell-id="c_1_0_3" transform="translate(60, 0)">
  <!-- Cell background -->
  <rect class="cell-bg" x="0" y="0" width="20" height="80"
        fill="transparent" stroke="var(--amber-dim)" stroke-width="0.5" />

  <!-- Street color highlight bar (bottom 4px of cell) -->
  <rect class="street-color" x="1" y="76" width="18" height="3"
        fill="#4488ff" rx="1" />

  <!-- Address text (clipped to cell bounds) -->
  <clipPath id="clip-c_1_0_3">
    <rect x="1" y="1" width="18" height="60" />
  </clipPath>
  <g clip-path="url(#clip-c_1_0_3)">
    <text class="addr-number" x="10" y="14" text-anchor="middle"
          font-size="8" fill="var(--amber-bright)">1234</text>
    <text class="addr-street" x="10" y="24" text-anchor="middle"
          font-size="6" fill="var(--amber)">OAK</text>
  </g>

  <!-- Sticker badges (top-right corner, stacked) -->
  <g class="stickers" transform="translate(14, 2)">
    <rect class="sticker-badge" width="6" height="6" rx="1"
          fill="#ff9800" />
    <text x="3" y="5" text-anchor="middle"
          font-size="4" fill="#000">F</text>
  </g>
</g>
```

**Scaling**: At overview zoom (full case visible), each 1" cell renders at approximately 8-12px wide on a 1920px display. At this scale:
- Address numbers are legible (7-8px font)
- Street names are abbreviated to 3-4 chars
- Sticker badges are 4-6px colored dots (no text)
- Street color bars are 2px

At shelf zoom (single shelf fills viewport), each 1" cell renders at approximately 40-60px wide:
- Full address number visible
- Full street name visible
- Sticker badges show abbreviation text ("FWD", "HLD")
- Street color bar is 4px with rounded corners

### 2.5 Zoom Levels

Two discrete zoom levels (not continuous zoom — continuous zoom adds complexity without UX benefit for this use case):

#### Overview Mode (default)
- Entire case visible: all wings, all 6 shelves
- SVG `viewBox` set to encompass full case dimensions
- Wing labels visible above each wing section
- Shelf numbers visible on the left margin
- Cells show: address number only (truncated), street color bar, sticker dot
- Click a shelf → zooms to that shelf
- Click a cell → opens cell editor panel (no zoom change)

#### Shelf Detail Mode
- Single shelf row visible across all wings (or single wing if user narrows further)
- SVG `viewBox` set to that shelf's bounding box with padding
- Full cell detail visible: number, street, stickers with labels
- Drag handles visible on cell edges (resize mode only)
- Navigation: left/right arrows to move between shelves, "back to overview" button
- Transition: animated `viewBox` interpolation over 300ms using `requestAnimationFrame`

### 2.6 Layout Geometry

The SVG coordinate system maps inches to a unit grid:

```
1 inch = 20 SVG units (arbitrary but gives good sub-pixel precision)

Wing widths:
  124-D: 40 cells × 20 = 800 SVG units per shelf row
  143-D: 20 cells × 20 = 400 SVG units per shelf row
  144-D: 40 cells × 20 = 800 SVG units per shelf row

Shelf heights:
  Each shelf row = 80 SVG units (gives 4:1 width-to-height ratio per 1" cell)

Inter-wing gap: 30 SVG units (visual separator, no cells)
Inter-shelf gap: 10 SVG units

Full case (standard 3-wing):
  Width:  800 + 30 + 800 + 30 + 800 = 2460 SVG units
  Height: (80 + 10) × 6 - 10 = 530 SVG units

viewBox for overview: "-40 -40 2540 610" (with 40-unit padding)
```

**Shelf ordering in SVG**: Shelf 1 (bottom) is at the *bottom* of the SVG. Since SVG Y increases downward, shelf 1 gets the highest Y value. We render shelves top-to-bottom in SVG (shelf 6 at y=0, shelf 1 at y=450) so the visual matches the physical case where shelf 6 is at the top.

### 2.7 Responsive Considerations

The tool targets desktop (carriers work on office PCs). Minimum viewport: 1280x720.

- SVG scales naturally via `viewBox` — no media queries needed for the case rendering
- Editor panels use CSS grid, anchored to the right side of the viewport (320px fixed width)
- Toolbar across the top (48px height)
- On viewports < 1280px wide: panels overlay the SVG instead of sitting beside it
- No mobile support needed (this is an office tool)

---

## 3. Interaction Design

### 3.1 Mode System

Three mutually exclusive modes, selected via a toolbar toggle group (segmented button):

```
[🔧 Equipment] [📝 Cells] [↔ Resize]
```

Active mode has `--amber-glow` background; inactive modes have `--amber-dim` text on `--bg-panel`.

**Keyboard shortcuts**:
- `1` → Equipment mode
- `2` → Cell editor mode
- `3` → Resize mode
- `Escape` → Deselect current selection, close any open panel
- `Ctrl+Z` → Undo
- `Ctrl+Y` / `Ctrl+Shift+Z` → Redo

Mode switching is instant. Any open panel closes. Any drag operation cancels. Selection clears.

### 3.2 Equipment Builder Mode

**Purpose**: Add, remove, or swap wing equipment pieces.

#### Click Targets
- The **wing body** is the click target — the structural frame area around the cells, not the cells themselves. Rendered as a `<rect>` with class `wing-body` that sits behind the cell grid, extending 15 SVG units beyond the cell area on all sides (representing the case frame).
- Clicking a cell in equipment mode does nothing (cells are inert in this mode, visually dimmed with `opacity: 0.4`).
- Clicking empty space (no wing) shows an "Add Equipment" option if a slot is available.

#### Context Menu
On wing body click, a custom context menu appears at the click position:

```
┌──────────────────────────────┐
│  Left Wing — 124-D           │
│ ──────────────────────────── │
│  ▸ Change to 143-D           │
│  ▸ Change to 144-D           │
│ ──────────────────────────── │
│  ✕ Remove this wing          │
│ ──────────────────────────── │
│  ℹ 240 cells · 40/shelf      │
└──────────────────────────────┘
```

Styled with `--bg-panel` background, `--amber` borders, `--amber-bright` text. `--amber-glow` on hover.

#### Equipment Change Flow
1. User selects "Change to 143-D" on the right wing
2. **Constraint check**: Do current addresses fit? A 124-D→143-D change halves capacity (40→20 cells/shelf). If addresses overflow, show warning: "This change would displace 120 addresses. Proceed?"
3. **On confirm**:
   - Replace wing in data model
   - Re-flow addresses: displaced addresses push to the next available wing/shelf
   - If total overflow (no room anywhere), flag overflow addresses in red
4. **Re-render**: Animate wing resize (SVG width transition, 300ms)

#### Add Equipment
- Right-click or click empty space to the right of the last wing
- Menu: "Add 124-D" / "Add 143-D" / "Add 144-D"
- Maximum 4 wings enforced by constraint engine
- New wing appears with slide-in animation (300ms)

#### Remove Equipment
- "Remove this wing" in context menu
- Warning if wing contains addresses: "This wing has 238 addresses. They will be unassigned. Proceed?"
- On confirm: addresses become unassigned (stored in a "displaced" pool, shown in a sidebar list)
- Wing slides out with fade animation (300ms)

### 3.3 Cell Editor Mode

**Purpose**: Edit address data, stickers, and street colors on individual cells.

#### Click → Panel
Clicking any cell in this mode:
1. Selects the cell (amber glow applied, `selected` class)
2. Opens the **cell editor panel** on the right side of the screen

#### Cell Editor Panel Layout

```
┌─────────────────────────────────┐
│  CELL EDITOR                 ✕  │
│  Wing: Left · Shelf: 3 · Pos: 7│
│ ─────────────────────────────── │
│  Address Number                 │
│  ┌─────────────────────────┐    │
│  │ 1234                    │    │
│  └─────────────────────────┘    │
│                                 │
│  Street Name                    │
│  ┌─────────────────────────┐    │
│  │ OAK ST                  │    │
│  └─────────────────────────┘    │
│                                 │
│  Street Color                   │
│  [ ■ Blue ] [change]            │
│                                 │
│  Unit/Apt                       │
│  ┌─────────────────────────┐    │
│  │                         │    │
│  └─────────────────────────┘    │
│                                 │
│  Stickers                       │
│  ┌──────┐ ┌──────┐             │
│  │ FWD  │ │ HOLD │  [+ Add]    │
│  └──────┘ └──────┘             │
│                                 │
│  Notes                          │
│  ┌─────────────────────────┐    │
│  │ Dog at this address     │    │
│  └─────────────────────────┘    │
│                                 │
│  [Save]  [Cancel]  [Clear Cell] │
└─────────────────────────────────┘
```

**Panel styling**: `--bg-panel` background, `--amber` border, input fields have `--bg-surface` background with `--amber` text. Focus ring is `--amber-glow`.

**Street Color Picker**: A preset palette of 12-16 colors commonly used for street grouping (blue, red, green, purple, orange, etc.) — displayed as a grid of colored squares. Click to select. Custom hex input available but not primary.

**Save behavior**: Save commits changes to state (triggering undo snapshot). Cancel reverts. Both close the panel. Clicking a different cell saves the current and opens the new one.

#### Reserved Cell Behavior
- Clicking a Form 3982 cell: opens a read-only info panel ("Form 3982 — Customer Special Instructions. This cell is reserved.")
- Clicking a status code cell: opens a read-only info panel showing the status code name and description
- Reserved cells cannot be edited, only viewed
- Reserved cells have a distinct visual treatment: `--reserved-fill` background, dashed border

### 3.4 Sticker System

#### Visual Design
Stickers are small colored badges rendered in the top-right corner of a cell:

| Sticker Type | Badge Color | Label | Icon |
|-------------|-------------|-------|------|
| Forward | `#ff9800` (orange) | FWD | → |
| Hold | `#2196f3` (blue) | HLD | ⏸ |
| Vacant | `#9e9e9e` (gray) | VAC | ⊘ |
| Deceased | `#7b1fa2` (purple) | DEC | † |
| Dog | `#f44336` (red) | DOG | ⚠ |
| Custom | `#4caf50` (green) | USR | ★ |

At overview zoom: stickers are colored dots (4px circles), stacked vertically. Maximum 3 visible; a "+2" overflow indicator if more.

At shelf zoom: stickers show the 3-letter label inside a rounded rectangle (16x10 SVG units).

#### Pop-Open Behavior
Clicking a sticker badge (in cell editor mode) expands it into a detail card:

```
┌─────────────────────────────┐
│  FWD — Forward              │
│  To: 456 Pine St, Apt 2     │
│  Since: 01/15/2026          │
│  Expires: 07/15/2026        │
│  ████████░░ 65% elapsed     │
│                             │
│  [Edit] [Remove]            │
└─────────────────────────────┘
```

The card anchors to the sticker badge and appears as a tooltip-style popover. Click outside or press Escape to dismiss.

#### Add Sticker Flow
1. Click "[+ Add]" in cell editor panel
2. Sticker type selector appears (grid of the 6 types)
3. Selected type opens a mini-form:
   - **Forward**: Forward address (required), start date, expiration date
   - **Hold**: Start date (required), expiration date (required)
   - **Vacant/Deceased/Dog**: Start date, notes
   - **Custom**: Label (required), color picker, dates optional, notes
4. Save adds sticker to cell, re-renders

#### Edit/Remove Sticker
- Edit: Click sticker in panel → same form as add, pre-populated
- Remove: Click "Remove" in the pop-open card, or swipe-left gesture (stretch goal)
- Confirmation required for remove ("Remove FWD sticker?")

### 3.5 Drag-to-Resize Mode

**Purpose**: Adjust cell widths by dragging cell boundaries. This is the most technically complex interaction.

#### Prerequisites
- Only available in **shelf detail zoom** (not overview). If user activates resize mode while in overview, auto-zoom to shelf 1.
- Only address cells can be resized. Reserved cells are locked (drag handles do not appear on their edges).

#### Handle Rendering
When resize mode is active and the view is at shelf detail:
- A **drag handle** appears on the right edge of every resizable cell
- Handle visual: a vertical line (2px wide, full cell height) with a grip indicator (three horizontal dots)
- Handle color: `--amber-dim` by default, `--amber-glow` on hover
- Cursor changes to `col-resize` on handle hover

```xml
<line class="drag-handle" x1="40" y1="0" x2="40" y2="80"
      stroke="var(--amber-dim)" stroke-width="2"
      style="cursor: col-resize" />
<g class="grip-dots" transform="translate(38, 35)">
  <circle r="1" cy="0" fill="var(--amber)" />
  <circle r="1" cy="5" fill="var(--amber)" />
  <circle r="1" cy="10" fill="var(--amber)" />
</g>
```

#### Drag Physics

1. **mousedown** on handle: Record `startX`, `cellId`, `originalWidth`, identify neighbor cell
2. **mousemove**:
   - Calculate `deltaX` in SVG units, convert to inches (`deltaX / 20`)
   - Round to nearest 1" increment (cell widths are always whole inches)
   - Apply constraint engine (see section 4)
   - Show real-time preview: expanding cell gets brighter border, shrinking cell gets dimmer border
   - Width label appears above the dragged handle showing the proposed width: `"3""`
3. **mouseup**:
   - Commit the resize via `dispatch('RESIZE_CELL', { cellId, newWidth })`
   - Constraint engine resolves neighbor displacement
   - Undo snapshot captured

#### Snap Behavior
- Widths snap to whole inches only (no fractional cells)
- Minimum width: 1" (cannot shrink below 1 cell)
- When expanding a cell rightward, the neighbor to the right shrinks by the same amount
- When a neighbor would shrink below 1", the drag snaps to a stop (cannot compress further)
- At wing boundaries: the handle stops — cannot drag past the wing edge (see constraint engine)

#### Visual Feedback During Drag
- Expanding cell: `--amber-glow` fill, width label in `--amber-hot`
- Shrinking neighbor: `--amber-dim` fill, width label in `--text-secondary`
- Invalid position (would violate constraint): `--red-alert` flash on the handle, handle snaps back
- Wing boundary proximity: a red dashed line appears at the wing boundary

### 3.6 Mode Switching

| From → To | Behavior |
|-----------|----------|
| Equipment → Cells | Close context menu, cells become clickable, wing bodies become inert |
| Equipment → Resize | Close context menu, auto-zoom to shelf 1, show handles |
| Cells → Equipment | Close editor panel, save pending changes, cells dim, wing bodies become clickable |
| Cells → Resize | Close editor panel, save pending changes, auto-zoom to focused shelf (or shelf 1), show handles |
| Resize → Equipment | Cancel any active drag, zoom to overview, hide handles, wing bodies become clickable |
| Resize → Cells | Cancel any active drag, hide handles, cells become clickable |

Transition animation: 200ms opacity crossfade for handles and panel appearance/disappearance.

---

## 4. Constraint Engine

The constraint engine is called on every state mutation. It validates the proposed state and either allows it, adjusts it (snapping), or rejects it with an error message.

### 4.1 Wing Boundary Enforcement

**Rule**: No address cell may span across a wing boundary.

**Implementation**:
```typescript
function validateWingBoundary(cell: Cell, wing: Wing): ConstraintResult {
  const cellEndPosition = cell.positionInShelf + cell.widthInches;
  const wingWidth = wing.cellsPerShelf; // in inches (1 cell = 1 inch)

  if (cellEndPosition > wingWidth) {
    return {
      valid: false,
      violation: 'wing-boundary',
      message: `Address "${cell.address?.addressNumber}" would extend ${cellEndPosition - wingWidth}" beyond wing boundary`,
      suggestedFix: {
        action: 'shrink',
        maxWidth: wingWidth - cell.positionInShelf,
      }
    };
  }
  return { valid: true };
}
```

**During resize drag**: The handle cannot be dragged past the last inch of the current wing. The constraint engine returns a `maxWidth` that stops at the wing edge.

**During address placement** (e.g., after equipment change or import): If an address would cross a wing boundary, it is pushed to the first cell of the next wing. The remaining space at the wing boundary becomes dead space (rendered as empty cells with a subtle cross-hatch pattern in `--amber-dim`).

### 4.2 Reserved Cell Protection

**Rule**: Form 3982 cells and status code cells cannot be moved, resized, deleted, or overlapped.

**Implementation**:
- Reserved cells are flagged with `type !== 'address'` in the data model
- The constraint engine rejects any mutation targeting a reserved cell
- Drag handles do not appear on reserved cell edges
- Reserved cells are not selectable in cell editor mode (click shows info-only panel)
- When resizing an address cell adjacent to a reserved cell, the reserved cell acts as an immovable wall

```typescript
function isReservedCell(cell: Cell): boolean {
  return cell.type !== 'address';
}

function validateReservedProtection(mutation: Mutation): ConstraintResult {
  if (mutation.type === 'RESIZE_CELL' || mutation.type === 'EDIT_CELL') {
    const cell = getCell(mutation.cellId);
    if (isReservedCell(cell)) {
      return {
        valid: false,
        violation: 'reserved-cell',
        message: `Cannot modify reserved cell (${cell.type})`,
      };
    }
  }
  return { valid: true };
}
```

### 4.3 Minimum Cell Width

**Rule**: Every cell must be at least 1" wide.

**Implementation**: During resize, the constraint engine checks that neither the target cell nor its affected neighbor drops below 1". If a drag would cause a neighbor to go below 1", the drag snaps to the position where the neighbor is exactly 1".

```typescript
function validateMinWidth(cell: Cell, proposedWidth: number): ConstraintResult {
  if (proposedWidth < 1) {
    return {
      valid: false,
      violation: 'min-width',
      message: 'Cell width cannot be less than 1 inch',
      suggestedFix: { action: 'snap', width: 1 }
    };
  }
  return { valid: true };
}
```

### 4.4 Address Displacement (Neighbor Shift Logic)

When a cell is resized, the total width of cells on that shelf segment (within the wing) must remain constant. Resizing is a zero-sum operation within a wing's shelf row.

**Algorithm**:

```
Given: Cell A is being expanded by +N inches

1. Identify the neighbor chain to the RIGHT of Cell A (within the same wing)
2. Starting from the immediate right neighbor:
   a. Reduce its width by 1"
   b. If it's already at 1" (minimum), skip it and try the next neighbor
   c. Repeat until N inches have been absorbed
3. If not enough inches can be absorbed (all right neighbors at minimum):
   a. Snap Cell A's expansion to the maximum possible
   b. Return a partial result with a message
4. Displaced addresses (cells that were absorbed entirely) go to the displaced pool
```

**The inverse**: When Cell A is shrunk by -N inches, the immediate right neighbor grows by N inches.

**Visual during drag**: All affected cells highlight with a cascade effect — immediate neighbor glows most, further neighbors glow less.

### 4.5 Overflow Handling

**Scenario**: After an equipment change (e.g., removing a wing), addresses don't fit.

**Behavior**:
1. The constraint engine calculates total available address cells vs. total address cells needed
2. If overflow: addresses that don't fit are moved to a **Displaced Addresses** list
3. The displaced list appears in a sidebar panel with amber/red styling:

```
┌──────────────────────────────┐
│  ⚠ DISPLACED ADDRESSES (23) │
│ ──────────────────────────── │
│  1234 Oak St                 │
│  1235 Oak St                 │
│  1236 Oak St                 │
│  ...                         │
│                              │
│  [Auto-place]  [Export List] │
└──────────────────────────────┘
```

4. "Auto-place" attempts to fit displaced addresses into any remaining empty cells
5. If truly no room, addresses remain displaced and the user must add equipment or resize cells

### 4.6 Constraint Validation Order

Constraints are checked in this order (fail-fast):

1. Reserved cell protection (immediate reject if targeting reserved cell)
2. Minimum width (snap to 1" if below)
3. Wing boundary (snap to wing edge if crossing)
4. Neighbor displacement (calculate cascade)
5. Overflow detection (warn if total exceeds capacity)

---

## 5. Data Flow

### 5.1 Edit Book Data → Visual Cells

The **edit book** is the carrier's source of truth — a list of addresses in delivery sequence order. The tool maps this list to physical cell positions.

**Import process**:

```
Edit Book Data (ordered address list)
  → Parse addresses into AddressData objects
  → Assign to cells sequentially:
      Start at Shelf 1, Wing 0 (left), Position 1 (after Form 3982)
      Place each address in the next available cell (1" default)
      Skip reserved cells (Form 3982 at shelf starts, status codes at shelf 1 end)
      At wing boundary: jump to next wing, same shelf
      At end of shelf (last wing): jump to first wing, next shelf up
  → Result: CaseConfiguration with all addresses placed
```

**Key mapping rules**:
- Address sequence number determines placement order
- Default width is 1" per address
- Multi-inch addresses consume consecutive cells
- Wing boundaries are hard stops (see constraint engine)
- Shelves are filled bottom-to-top, left-to-right across all wings

### 5.2 Import/Export Format

**Primary format: JSON**

```json
{
  "version": "1.0",
  "routeId": "R072",
  "exportDate": "2026-01-30T14:30:00Z",
  "configuration": {
    "wings": [
      {
        "position": 0,
        "equipmentType": "124-D",
        "label": "Left Wing"
      },
      {
        "position": 1,
        "equipmentType": "144-D",
        "label": "Middle Wing"
      },
      {
        "position": 2,
        "equipmentType": "124-D",
        "label": "Right Wing"
      }
    ]
  },
  "addresses": [
    {
      "sequence": 1,
      "addressNumber": "100",
      "streetName": "MAIN ST",
      "streetColor": "#4488ff",
      "widthInches": 1,
      "stickers": [
        {
          "type": "forward",
          "forwardAddress": "456 Pine St",
          "startDate": "2026-01-15",
          "expirationDate": "2026-07-15"
        }
      ]
    }
  ]
}
```

**Secondary format: CSV import** (for carriers who have address lists in spreadsheets):

```csv
sequence,addressNumber,streetName,unit,widthInches
1,100,MAIN ST,,1
2,102,MAIN ST,,1
3,104,MAIN ST,APT A,2
```

CSV import creates addresses with default settings. Equipment configuration must be set up first via the equipment builder.

### 5.3 localStorage Persistence

**Auto-save**: Every state mutation is debounced (500ms) and saved to localStorage.

```typescript
const STORAGE_KEY = 'editbook-assist-state';
const STORAGE_VERSION = 1;

function save(state: AppState): void {
  const serialized = {
    version: STORAGE_VERSION,
    timestamp: new Date().toISOString(),
    config: state.config,
    alerts: state.alerts,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
}

function load(): AppState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  if (parsed.version !== STORAGE_VERSION) {
    return migrate(parsed); // Schema migration
  }
  return buildAppState(parsed);
}
```

**Storage budget**: A fully populated 4-wing case with stickers on every cell is approximately 200-400 KB of JSON. Well within localStorage limits (5-10 MB).

**Multiple routes**: Use `STORAGE_KEY + '-' + routeId` to support multiple saved configurations. A route selector dropdown in the toolbar lets the user switch.

### 5.4 Undo/Redo System

**Implementation**: Simple snapshot stack. Each mutation clones the current `CaseConfiguration` onto the undo stack before applying.

```typescript
const MAX_UNDO_DEPTH = 50;

function dispatch(action: string, payload: any): void {
  // Clone current config onto undo stack
  state.undoStack.push(structuredClone(state.config));
  if (state.undoStack.length > MAX_UNDO_DEPTH) {
    state.undoStack.shift(); // Drop oldest
  }
  state.redoStack = []; // Clear redo on new action

  // Apply mutation
  applyMutation(action, payload);

  // Validate constraints
  const violations = validateAll(state.config);
  if (violations.length > 0) {
    // Auto-fix what can be fixed, warn about the rest
    autoResolve(violations);
  }

  // Re-render and persist
  render(state);
  debouncedSave(state);
}

function undo(): void {
  if (state.undoStack.length === 0) return;
  state.redoStack.push(structuredClone(state.config));
  state.config = state.undoStack.pop()!;
  render(state);
  debouncedSave(state);
}

function redo(): void {
  if (state.redoStack.length === 0) return;
  state.undoStack.push(structuredClone(state.config));
  state.config = state.redoStack.pop()!;
  render(state);
  debouncedSave(state);
}
```

**Why snapshots over command pattern**: The state object is small (<400 KB). `structuredClone` is fast for this size. A command pattern (storing diffs/operations) would be more memory-efficient but requires inverse operations for every mutation type — significant additional complexity for minimal gain.

---

## 6. Alert System

### 6.1 Date Tracking

Stickers with `expirationDate` are tracked by the alert system. On each app load and on a 1-hour interval:

```typescript
function scanAlerts(config: CaseConfiguration): Alert[] {
  const now = new Date();
  const alerts: Alert[] = [];

  for (const wing of config.wings) {
    for (const shelf of wing.shelves) {
      for (const cell of shelf.cells) {
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
              message: daysUntil < 0
                ? `${sticker.type} expired ${Math.abs(daysUntil)} days ago`
                : `${sticker.type} expires in ${daysUntil} days`,
            });
          }
        }
      }
    }
  }

  return alerts.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}
```

### 6.2 Visual Effects

Alerts apply CSS classes to affected cells:

```css
/* Approaching expiry: pulsing amber glow */
.cell.alert-approaching {
  animation: pulse-amber 2s ease-in-out infinite;
}

@keyframes pulse-amber {
  0%, 100% { filter: none; }
  50% { filter: url(#glow-amber); }
}

/* Expired: pulsing red glow */
.cell.alert-expired {
  animation: pulse-red 1.5s ease-in-out infinite;
}

@keyframes pulse-red {
  0%, 100% { filter: none; }
  50% {
    filter: drop-shadow(0 0 4px var(--red-alert))
            drop-shadow(0 0 8px var(--red-glow));
  }
}

/* Sticker badge on expired items */
.sticker-badge.expired {
  animation: blink-red 1s step-end infinite;
}

@keyframes blink-red {
  0%, 50% { fill: var(--red-alert); }
  50.01%, 100% { fill: transparent; }
}
```

### 6.3 Alert Panel

A collapsible alert panel sits below the toolbar when alerts exist:

```
┌──────────────────────────────────────────────────────────────┐
│  ⚠ 3 ALERTS                                          [Hide] │
│ ──────────────────────────────────────────────────────────── │
│  🔴 EXPIRED: 1234 Oak St — FWD expired 5 days ago    [→]    │
│  🟡 EXPIRING: 5678 Pine St — HOLD expires in 2 days  [→]    │
│  🟡 EXPIRING: 9012 Elm St — FWD expires in 6 days    [→]    │
└──────────────────────────────────────────────────────────────┘
```

The `[→]` button navigates to that cell (zooms to its shelf, selects it, opens editor panel).

**Badge count**: A small red circle with the alert count appears on the toolbar near the app title, always visible even when the alert panel is collapsed.

### 6.4 Alert Thresholds

| Days Until Expiry | Classification | Visual |
|-------------------|----------------|--------|
| > 7 days | No alert | Normal rendering |
| 4-7 days | Approaching | Slow amber pulse (2s cycle) |
| 1-3 days | Imminent | Fast amber pulse (1s cycle) |
| 0 (today) | Expiring today | Red glow, steady |
| < 0 (past) | Expired | Red blink (1s cycle) |

---

## 7. Rendering Strategy

### 7.1 Overview Mode Rendering

**What gets drawn**:
- Wing body frames (`<rect>` per wing, `--amber-dim` stroke, 1px)
- Wing labels (`<text>` above each wing: "Left Wing — 124-D")
- Shelf row separators (horizontal `<line>` elements)
- Shelf number labels (left margin: "1" through "6")
- All cells as `<rect>` elements within their shelf groups
- Address number as `<text>` (truncated to fit)
- Street color bars as thin `<rect>` at cell bottom
- Sticker dots as `<circle>` elements (top-right of cell)
- Reserved cells with distinct fill (`--reserved-fill`) and dashed stroke
- Form 3982 cells with green-tinted fill (`--form3982-fill`)
- Alert effects (CSS animations on cells with alerts)

**Hit testing**: Native SVG. Each cell `<rect>` has a `click` event listener. The event handler reads `data-cell-id` from the target element and dispatches to the active mode handler.

**Performance**: 720-960 cells = 720-960 `<rect>` elements + 720-960 `<text>` elements + ~200 sticker elements + ~50 structural elements = ~2000 SVG elements total. This is well within SVG performance limits (browsers handle 10,000+ SVG elements without issue). No virtualization needed.

**Initial render**: Build the full SVG DOM once on load. Cost: ~50ms for DOM creation, ~16ms for first paint. Subsequent updates are differential (see below).

### 7.2 Shelf Detail Mode Rendering

**What gets drawn** (same elements as overview, but only for the focused shelf row across all wings):
- Wing body frames (only the focused shelf segment)
- All cells at full detail: address number, street name (full), unit
- Street color bars (4px height, rounded)
- Sticker badges with label text ("FWD", "HLD")
- Drag handles on cell edges (resize mode only)
- Width indicators above each cell ("1\"", "2\"", "3\"")
- Wing boundary markers (vertical dashed line between wings)
- Reserved cell labels (full name: "Form 3982", "MACHINEABLE", etc.)

**Hit testing**: Same as overview — native SVG events. Drag handles have their own `mousedown` listeners for resize mode.

**Transition**: Animate `viewBox` from overview bounds to shelf bounds over 300ms:

```javascript
function zoomToShelf(shelfNumber: number): void {
  const targetViewBox = calculateShelfViewBox(shelfNumber);
  const currentViewBox = getCurrentViewBox();

  animateViewBox(currentViewBox, targetViewBox, 300, 'ease-in-out');
}

function animateViewBox(from: number[], to: number[], durationMs: number, easing: string): void {
  const start = performance.now();

  function frame(now: number) {
    const t = Math.min((now - start) / durationMs, 1);
    const easedT = easeInOut(t);

    const current = from.map((v, i) => v + (to[i] - v) * easedT);
    svg.setAttribute('viewBox', current.join(' '));

    if (t < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
```

### 7.3 Differential Updates

Full SVG re-renders are unnecessary for most mutations. The renderer tracks which cells are "dirty" and updates only those:

```typescript
function render(state: AppState, dirtyIds?: Set<string>): void {
  if (!dirtyIds) {
    // Full re-render (initial load, equipment change, undo/redo)
    fullRender(state);
    return;
  }

  // Differential update
  for (const cellId of dirtyIds) {
    const cell = getCellById(state.config, cellId);
    const element = document.querySelector(`[data-cell-id="${cellId}"]`);

    if (!cell && element) {
      element.remove(); // Cell was deleted
    } else if (cell && !element) {
      createCellElement(cell); // Cell was added
    } else if (cell && element) {
      updateCellElement(element, cell); // Cell was modified
    }
  }
}
```

**When to full re-render**:
- Initial load
- Equipment add/remove/change (structural change)
- Undo/redo (arbitrary state change)
- Import data

**When to differential update**:
- Cell edit (address, stickers, street color)
- Cell resize (update width and neighbors)
- Sticker add/remove
- Alert state change

### 7.4 Animation Approach

| Animation | Technique | Duration | Easing |
|-----------|-----------|----------|--------|
| Hover glow | CSS `transition` on `filter` | 150ms | ease-out |
| Selection glow | CSS class toggle | 200ms | ease-in-out |
| View zoom | JS `viewBox` interpolation | 300ms | ease-in-out |
| Wing add/remove | JS `width` interpolation + opacity | 300ms | ease-out |
| Panel open/close | CSS `transform: translateX` | 200ms | ease-out |
| Alert pulse | CSS `@keyframes` animation | 1-2s | ease-in-out, infinite |
| Drag preview | Immediate (no animation, real-time) | 0ms | — |
| Context menu | CSS `opacity` + `transform: scale` | 100ms | ease-out |

**No animation library needed.** CSS transitions and `requestAnimationFrame` cover every case.

### 7.5 Performance Budget

| Metric | Target | Rationale |
|--------|--------|-----------|
| Initial render | < 100ms | 2000 SVG elements is trivial |
| Cell click → panel open | < 50ms | Event handler + DOM panel creation |
| Drag frame rate | 60fps | Only updating 2-3 elements per frame |
| Zoom transition | 300ms at 60fps | `viewBox` animation, no DOM changes |
| localStorage save | < 20ms | 200-400 KB JSON serialization |
| Import 700 addresses | < 200ms | Parse + place + render |

**If performance degrades** (unlikely but possible on very low-end hardware):
1. Reduce SVG filter complexity (remove blur, use solid colors)
2. Hide sticker badges in overview mode
3. Reduce animation to opacity-only (no filters)
4. Virtualize: only render cells in the current viewBox (requires intersection calculation)

These are fallbacks. For 720-960 cells, SVG performance will not be an issue on any hardware from the last decade.

---

## Appendix A: Reserved Cell Layout Reference

### Row 1 (Bottom Shelf) — Full Layout

```
Wing 0 (Left, 124-D, 40 cells):
[3982][addr][addr][addr]...[addr]  ← 1 reserved + 39 address = 40 cells
  1"    1"   1"   1"         1"

Wing 1 (Middle, 144-D, 40 cells):
[addr][addr][addr]...[addr]        ← 40 address cells
  1"   1"   1"         1"

Wing 2 (Right, 124-D, 40 cells):
[addr][addr]...[addr][MACH][NON ][MACH][UTF][IA][NSN][ANK][OTH]
  1"   1"        1"    1"    2"          1"  1"  1"   1"   1"
                              ↑ last 8 cells (8 inches) reserved
```

### Rows 2-6 — Full Layout

```
Wing 0 (Left):  [3982][addr]...[addr]     ← 1 + 39 = 40
Wing 1 (Middle): [addr]...[addr]          ← 40
Wing 2 (Right):  [addr]...[addr]          ← 40
Total per row: 120 cells, 1 reserved, 119 usable
```

---

## Appendix B: Keyboard Shortcut Reference

| Key | Action |
|-----|--------|
| `1` | Switch to Equipment mode |
| `2` | Switch to Cell Editor mode |
| `3` | Switch to Resize mode |
| `Escape` | Close panel / deselect / cancel drag |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+Shift+Z` | Redo (alternate) |
| `Ctrl+S` | Force save to localStorage |
| `Ctrl+E` | Export JSON |
| `Ctrl+I` | Import JSON |
| `←` / `→` | Navigate shelves (in shelf detail mode) |
| `↑` / `↓` | Navigate shelves (in shelf detail mode) |
| `Home` | Zoom to overview |
| `Tab` | Move to next cell (in cell editor mode) |
| `Shift+Tab` | Move to previous cell (in cell editor mode) |
| `Delete` | Clear selected cell (with confirmation) |

---

## Appendix C: File Size Estimates

| Component | Estimated Size |
|-----------|---------------|
| HTML shell | 2 KB |
| CSS (all styles, animations, variables) | 8 KB |
| JavaScript (all modules) | 40-60 KB |
| Inline font (optional JetBrains Mono subset) | 30 KB |
| **Total (no font)** | **~60 KB** |
| **Total (with font)** | **~90 KB** |

No external dependencies. No CDN requests. Runs entirely offline after first load.

---

## Appendix D: Browser Support

| Browser | Minimum Version | Notes |
|---------|----------------|-------|
| Chrome | 90+ | Primary target (USPS workstations often run Chrome) |
| Edge | 90+ | Chromium-based, same as Chrome |
| Firefox | 88+ | Full SVG filter support |
| Safari | 15+ | Not a priority (not used on USPS workstations) |

**Required browser features**: SVG filters, CSS custom properties, `structuredClone`, ES modules, `requestAnimationFrame`, localStorage. All available in browsers from 2021+.

---

**End of Technical Design Document**

*This document is the specification. Both build teams should implement from this spec independently. Divergences in implementation are acceptable; divergences in behavior are not. If the spec is ambiguous, ask for clarification rather than assuming.*
