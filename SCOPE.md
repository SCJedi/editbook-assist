# Edit Book Assist Tool — Full Scope

## Domain: USPS Mail Casing

This tool is for **USPS mail carriers** working with **edit books** and **mail sorting cases** (the physical equipment at post offices where carriers sort mail into cells/slots before going out on routes).

---

## What is an Edit Book?

An **edit book** is a USPS reference document that tells mail carriers which addresses/delivery points go into which cells on their physical sorting case. It maps addresses to case positions so carriers can efficiently sort mail for their route.

## Key Concepts

### Case Labels
- Labels affixed to cells on the physical sorting case
- Show address ranges, delivery point info, or route segments
- Generated/managed through USPS systems

### Cell Sizing
- Cells on the case are physical slots/compartments
- Cell sizes can vary depending on mail volume for that group of addresses
- Edit book affects how case labels are arranged and which cells are assigned to which addresses

### Hidden/Reserved Cells
- **Not everything on the case comes from the edit book**
- Some cells have auto-generated/system-reserved labels that print on case labels but are NOT shown to the carrier in the edit book
- These reserved cells are "hidden" from the carrier's perspective — they exist on the physical case but the edit book doesn't reference them
- Carriers need to understand which cells are theirs vs reserved

### The Calculation Problem
- It is **cumbersome to calculate** where cells will physically land on a piece of equipment
- The mapping from edit book data → physical case layout is non-trivial
- Carriers and supervisors struggle to visualize how changes in the edit book affect the physical case

---

## What We're Building

### Vision
A **super-smart HTML-based tool** that lets carriers interact with a **simulated mail sorting case** in the browser.

### Core Capabilities

1. **Simulated Physical Case**
   - Visual representation of the actual sorting case/equipment
   - Accurate cell layout matching real physical dimensions
   - Shows all cells — both edit-book-visible AND reserved/hidden ones
   - Distinguishes visually between carrier-accessible cells and reserved cells

2. **Interactive Cell Adjustment**
   - Carrier can **physically drag/adjust cells** on the simulated case
   - Resize cells (adjust for more/less mail volume)
   - Reorder cells
   - See real-time impact of changes on the overall case layout

3. **Data Visibility**
   - See the address data / delivery point info in each cell
   - View which addresses map to which cell
   - See reserved/hidden cell info (what's auto-included but not in edit book)

4. **Edit Book View**
   - Toggle between "physical case view" and "edit book view"
   - Edit book view shows the carrier-facing version (no hidden cells)
   - Physical case view shows everything including reserved cells
   - Compare the two views side-by-side

5. **Smart Calculations**
   - Auto-calculate where cells land on the physical equipment
   - Handle equipment dimensions and constraints
   - Show overflow/fit warnings
   - Optimize cell placement suggestions

---

## User: Mail Carrier (Primary)

The primary user is a **USPS mail carrier** who needs to:
- Understand their case layout
- See how edit book changes affect their physical case
- Adjust cells to match real-world mail volume patterns
- Identify reserved/hidden cells
- Print or reference an optimized layout

## Secondary Users
- **Supervisors** managing route adjustments
- **Route examiners** optimizing case configurations

---

## Current Status

- **Phase**: R&D Research — understanding USPS edit book specs, case equipment dimensions, cell standards, data formats
- **Next**: Research results → scope refinement → build plan → iterate with user

---

## Equipment Specifications (From User + Research)

This section documents the physical equipment specifications that the tool must simulate.

### Confirmed USPS Rural Carrier Case Equipment

#### Item 124-D: Main Carrier Case
- **Total Cells**: 240 separations (1" wide each)
- **Shelves**: 6 shelves
- **Cells Per Shelf**: 40 cells (240 ÷ 6)
- **Total Width**: 240 inches of usable casing space
- **Features**: Removable dividers; cells can be widened for high-volume addresses
- **Source**: USPS Handbook PO-603

#### Item 143-D: Swinging Wing Case
- **Total Cells**: 120 separations
- **Shelves**: 6 shelves
- **Cells Per Shelf**: 20 cells (120 ÷ 6)
- **Total Width**: 120 inches
- **Source**: USPS Handbook PO-603

#### Item 144-D: Wing Case with Table (Desk)
- **Total Cells**: 240 separations (1" wide each)
- **Shelves**: 6 shelves
- **Cells Per Shelf**: 40 cells (240 ÷ 6)
- **Total Width**: 240 inches
- **Features**: Includes integrated desk/work surface for carrier
- **Source**: USPS Handbook PO-603

### Typical Rural Route Configuration
- **Equipment Count**: 3 pieces of case equipment per route
- **Total Capacity**: 720 cells (3 × 240)
- **Reserved Cells**: ~20 cells for administrative purposes (Form 3982, mail status codes, A-Z rework)
- **Net Usable for Addresses**: ~700 cells

### Physical Layout (User-Provided)
- **3-Wing U-Shape**: Left wing + Middle wing (with desk) + Right wing
- **Carrier Position**: Stands in center of U
- **Wings**: Outer wings fold in to create the U-shape
- **Optional**: Additional full or half wing can be added on right side

### Casing Direction (Delivery Sequence)
- **Start**: Bottom-left cell (Shelf 1, left wing)
- **Pattern**: Serpentine/spiral upward (left → right on each shelf, moving up through shelves 1-6)
- **End**: Top-right cell (Shelf 6, right wing)
- **Constraint**: Address cells CANNOT split across equipment boundaries
  - Example: A 4" address must fit entirely on one wing; cannot be 2" on one wing and 2" on the next

### Reserved Cells

#### Form 3982 Cells
- **Purpose**: Customer special instructions, address changes
- **Width**: 1" per cell
- **Placement**: At start or end of each shelf row (user reports; needs verification)
- **Potential Total**: 6 cells per wing if on every shelf

#### First-Shelf Mail Status Code Cells
At the end of the first shelf, cells are reserved for undeliverable mail status codes:
- **NSN** (No Such Number) — 1" cell
- **ANK** (Attempted Not Known) — 1" cell
- **VAC** (Vacant) — 1" cell
- **UTF** (Unable to Forward) — 1" cell
- **DEC** (Deceased) — 1" cell
- **Additional codes possible**: Box Closed, Insufficient Address, NDA, Missorts, Box Mail

### Cell Sizing Rules
- **Base Unit**: 1 inch per cell
- **Multi-Cell Addresses**: Addresses can span multiple cells (2", 4", etc.) for high mail volume
- **Adjustability**: Dividers are removable; managers can configure cell widths per route needs
- **Letter Mail**: Cased vertically (standard 1" cells)
- **Flat Mail**: Cased horizontally (wider separations, up to 10" mentioned in specs)

### What's Still Unknown
- Exact Form 3982 cell placement (start vs. end of rows)
- Complete list of all reserved status code cells
- Exact casing flow pattern (true serpentine zigzag vs. uniform left-to-right)
- Physical dimensions (height, width, depth) of each equipment piece
- Specifications for optional "half wing" add-on
- How casing flow transitions between wings

**For complete research findings, see**: `CASE-EQUIPMENT-SPECS.md`
