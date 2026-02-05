# Edit Book Assist — UI Vision (User-Provided)

## Visual Style
- **Black background** (like an LED screen)
- **Yellow/amber case drawing** — computer-rendered outline of the physical case equipment
- **Glow effect** on hover — when mouse moves over each case piece, it glows
- Dark, technical, console-like aesthetic

## Interaction Model

### 1. Equipment Builder Mode
- Click on a **case body** (not address area) → context menu appears
- Menu options: "Remove this equipment" / "Change this equipment"
- Lets the carrier build out their case configuration (add/remove wings)
- Equipment types: 124-D, 143-D, 144-D

### 2. Cell Editor Mode
- Click on a **shelf cell** → edit panel opens
- Edit fields:
  - Address number
  - Street name
  - Street color highlight (color-coded streets)
  - Sticker(s) — small visual badges on cells

### 3. Stickers System
- Stickers are small visual indicators on cells
- Types: Forward info, Hold info, temporary instructions, etc.
- Stickers can be **popped open** to see full details
- Stickers can be **edited** or **removed**
- Stickers with dates (holds, forwards) can have **alert effects** when dates expire or approach

### 4. Drag-to-Resize Mode (Zoomed View)
- Zoom into a shelf area
- Drag cell edges to resize addresses (change cell width)
- **Violations snap to valid positions** — can't split across wing boundaries, can't overlap reserved cells
- Smart snapping ensures legal cell configurations at all times

### 5. Alert/Effect System
- Temporary items (holds, forwards) have expiration dates
- Visual effects when dates are approaching or expired
- Alerts on addresses that need attention

## Key UX Principles
- Equipment is the container — click body for equipment actions
- Cells are the content — click cells for address/data actions
- Stickers are metadata — pop open for details
- Resize is spatial — drag edges with constraint snapping
- Alerts are temporal — visual effects tied to dates
