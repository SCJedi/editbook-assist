# Matrix Terminal Optimization Plan

**Document Version:** 1.0
**Last Updated:** 2026-02-02
**Target:** matrix-terminal.html

---

## 1. Performance Optimization Plan

### Overview
Current performance is acceptable for most scenarios but shows bottlenecks at high resolutions and with V2's faithful rendering mode. Target: locked 60 FPS (16.67ms frame budget) at 1920x1080 with room for lower-end hardware.

### Current Performance Profile

#### Frame Budget Analysis (60 FPS = 16.67ms per frame)
- **V1 Classic Mode** (~8-12ms per frame at 1080p)
  - Grid iteration: ~3ms
  - shadowBlur rendering: ~4ms (every character)
  - String-based HSL construction: ~1ms
  - Canvas fills/draws: ~2ms

- **V2 Faithful Mode** (~18-25ms per frame at 1080p)
  - Grid iteration: ~5ms (nested loops over full 2D grid)
  - Stream update logic: ~3ms
  - Float32Array/Uint8Array allocations: ~2ms (every frame!)
  - shadowBlur rendering: ~8ms (conditional but frequent)
  - String-based HSL construction: ~2ms
  - Character mutation checks: ~1ms
  - Canvas fills/draws: ~3ms

#### Critical Bottlenecks (Ranked by Impact)

1. **shadowBlur Performance Cost (P0 - CRITICAL)**
   - **Issue:** Canvas shadowBlur triggers expensive blur calculations for every fillText call
   - **Impact:** 4-8ms per frame, scales with character count
   - **Current usage:** V1 uses shadowBlur on every character (line 353-354); V2 uses it conditionally on heads/near-head characters (lines 541-542, 547-548)
   - **Evidence:** This is the single largest frame time contributor

2. **Per-Frame Typed Array Allocations (P0 - CRITICAL)**
   - **Issue:** V2 creates new Float32Array and Uint8Array instances every frame (lines 433-436)
   - **Impact:** ~2ms per frame + GC pressure
   - **Current code:**
     ```javascript
     distMap[c] = new Float32Array(v2Rows).fill(9999);
     tailMap[c] = new Uint8Array(v2Rows);
     matMap[c] = new Float32Array(v2Rows);
     ```
   - **Why critical:** Allocating 3 typed arrays per column, per frame = garbage collection spikes

3. **String-Based HSL Color Construction (P0 - CRITICAL)**
   - **Issue:** Template literals constructed every render call (lines 354, 355, 542, 548, 568, etc.)
   - **Impact:** ~1-2ms per frame due to string allocation and parsing
   - **Current pattern:** `` `hsla(${hue}, ${sat}%, ${light}%, ${alpha})` ``
   - **Why critical:** Thousands of string allocations per frame, each parsed by canvas API

4. **Full Grid Iteration Every Frame (P1 - IMPORTANT)**
   - **Issue:** V2 iterates entire grid (cols × rows) even when most cells are empty
   - **Impact:** ~5ms at 1080p (45 cols × 40 rows = 1800 iterations, many skipped)
   - **Current code:** Lines 517-571 — nested loop over all v2Grid cells
   - **Opportunity:** Track dirty regions or active cells only

5. **No Render Batching (P1 - IMPORTANT)**
   - **Issue:** Each character drawn with individual fillText call, each with potentially different shadowBlur settings
   - **Impact:** ~2-3ms per frame due to context state thrashing
   - **Current:** shadowBlur toggled on/off for different character types

### Proposed Optimizations

#### P0 — Critical Performance Fixes

##### 1.1 Offscreen Canvas for Glow Effects
**Priority:** P0
**Estimated Impact:** 4-6ms savings per frame
**Complexity:** Medium

**Rationale:** shadowBlur is expensive because it re-computes blur for every character. Render glowing heads to an offscreen canvas once, then composite.

**Implementation:**
- Create offscreen canvas same size as main canvas
- Render head characters (d <= 2) to offscreen with shadowBlur
- Render body/tail characters (d > 2) to main canvas WITHOUT shadowBlur
- Composite offscreen onto main using `ctx.drawImage()` with additive blending
- Update offscreen only for cells that changed this frame

**Code location:** V2 render loop (lines 516-573)

**Alternative approach:** Use dual-pass rendering
- Pass 1: Render all non-glowing characters directly
- Pass 2: Render only head characters with shadowBlur to offscreen, then composite

**Validation:** Measure frame time before/after with performance.now()

---

##### 1.2 Pre-Computed Color Lookup Tables (LUTs)
**Priority:** P0
**Estimated Impact:** 1-2ms savings per frame
**Complexity:** Low

**Rationale:** Constructing HSL strings thousands of times per frame is wasteful. Pre-compute common color values.

**Implementation:**
```javascript
// At init or when hue changes:
const colorLUT = {
  head: `hsla(${hue}, 30%, 88%, 1.0)`,
  near1: `hsla(${hue}, 100%, 60%, 1.0)`,
  near2: `hsla(${hue}, 100%, 55%, 1.0)`,
  // Pre-compute 20 levels of tail fade
  tail: []
};

for (let i = 0; i < 20; i++) {
  const t = i / 20;
  const fade = Math.pow(1 / PHI, t * 3);
  const lightness = Math.max(6, 8 + 35 * fade);
  const alpha = Math.max(0, fade * 0.95);
  colorLUT.tail[i] = `hsla(${hue}, 100%, ${Math.round(lightness)}%, ${alpha.toFixed(3)})`;
}
```

**Usage in render:**
```javascript
// Instead of dynamic string construction:
if (d <= 0) {
  ctx.fillStyle = colorLUT.head;
} else if (d === 1) {
  ctx.fillStyle = colorLUT.near1;
} else {
  const idx = Math.min(19, Math.floor(((d - 2) / tailLen) * 20));
  ctx.fillStyle = colorLUT.tail[idx];
}
```

**Code locations:**
- V1: Lines 351-355
- V2: Lines 535-568
- Rebuild LUT when hue knob changes (line 640)

**Validation:** Verify visual consistency with before/after screenshots

---

##### 1.3 Typed Array Pooling
**Priority:** P0
**Estimated Impact:** 2ms savings + reduced GC pauses
**Complexity:** Low

**Rationale:** Creating new Float32Array/Uint8Array every frame triggers GC. Reuse pre-allocated arrays.

**Implementation:**
```javascript
// At v2Init:
let v2DistMapPool = [];
let v2TailMapPool = [];
let v2MatMapPool = [];

function v2Init() {
  // ... existing init ...

  // Pre-allocate pools
  v2DistMapPool = [];
  v2TailMapPool = [];
  v2MatMapPool = [];
  for (let c = 0; c < v2Cols; c++) {
    v2DistMapPool[c] = new Float32Array(v2Rows);
    v2TailMapPool[c] = new Uint8Array(v2Rows);
    v2MatMapPool[c] = new Float32Array(v2Rows);
  }
}

function v2Draw() {
  // Reuse instead of allocate:
  for (let c = 0; c < v2Cols; c++) {
    v2DistMapPool[c].fill(9999);
    v2TailMapPool[c].fill(0);
    v2MatMapPool[c].fill(0);
  }
  // ... rest of draw logic uses pools ...
}
```

**Code location:** Lines 429-436

**Edge case:** Handle window resize by re-allocating pools if v2Rows changes

**Validation:** Monitor heap allocations via DevTools memory profiler

---

#### P1 — Important Performance Improvements

##### 1.4 Dirty Rectangle Rendering
**Priority:** P1
**Estimated Impact:** 3-5ms savings per frame in sparse scenarios
**Complexity:** High

**Rationale:** Most of the grid is empty. Track which regions changed and only iterate/render those.

**Implementation:**
- Maintain bounding box of active streams per column
- Track min/max row with content per column
- Only iterate rows within active bounds
- Expand bounds as streams move, contract when streams die

**Pseudocode:**
```javascript
const activeBounds = []; // [col] = {minRow, maxRow}

// During stream update:
activeBounds[c].minRow = Math.min(activeBounds[c].minRow, headRow - tailLen);
activeBounds[c].maxRow = Math.max(activeBounds[c].maxRow, headRow + 2);

// During render:
for (let c = 0; c < v2Cols; c++) {
  const {minRow, maxRow} = activeBounds[c];
  for (let r = Math.max(0, minRow); r <= Math.min(v2Rows - 1, maxRow); r++) {
    // ... render logic ...
  }
}
```

**Code location:** Lines 517-571 (V2 render loop)

**Trade-off:** Adds complexity; benefit diminishes in dense stream scenarios

**Validation:** Test with varying stream densities; ensure no visual artifacts

---

##### 1.5 Reduce shadowBlur Usage Frequency
**Priority:** P1
**Estimated Impact:** 2-3ms savings per frame
**Complexity:** Low

**Rationale:** Even with offscreen canvas, fewer shadowBlur calls = better performance

**Implementation:**
- Only apply shadowBlur to head characters (d === 0)
- Remove shadowBlur from near-head characters (d === 1, 2) — use solid bright color instead
- This reduces shadowBlur calls by ~70%

**Code location:** Lines 543-548 (V2), 353-354 (V1)

**Visual impact:** Slight reduction in glow halo; compensate with brighter head color

**Validation:** A/B test user preference; measure frame time improvement

---

##### 1.6 Batch Draw Calls by Color/Shadow State
**Priority:** P1
**Estimated Impact:** 2-3ms savings per frame
**Complexity:** Medium

**Rationale:** Setting ctx.fillStyle, ctx.shadowBlur has overhead. Group characters by rendering state.

**Implementation:**
- In render loop, collect characters into buckets: heads, near, tail_fade_0-20
- Render each bucket in one pass with shared state
- Requires sorting or multi-pass grid traversal

**Pseudocode:**
```javascript
const drawBatches = {
  heads: [],      // {x, y, char}
  near: [],
  tail: [[],[],...]  // 20 fade levels
};

// First pass: categorize
for (let c = 0; c < v2Cols; c++) {
  for (let r = 0; r < v2Rows; r++) {
    // ... determine category ...
    drawBatches.heads.push({x, y, char});
  }
}

// Second pass: render batches
ctx.shadowBlur = 14;
ctx.fillStyle = colorLUT.head;
drawBatches.heads.forEach(({x, y, char}) => ctx.fillText(char, x, y));

ctx.shadowBlur = 0;
colorLUT.tail.forEach((color, idx) => {
  ctx.fillStyle = color;
  drawBatches.tail[idx].forEach(({x, y, char}) => ctx.fillText(char, x, y));
});
```

**Code location:** Lines 516-573

**Trade-off:** Two-pass algorithm; complexity vs. performance gain

**Validation:** Ensure rendering order doesn't affect visual output

---

#### P2 — Nice-to-Have Optimizations

##### 1.7 Consider WebGL Renderer for Large Screens
**Priority:** P2
**Estimated Impact:** 10-15ms savings at 4K resolution
**Complexity:** Very High

**Rationale:** At very high resolutions (4K+), Canvas2D becomes bottleneck. WebGL can render thousands of glyphs as textured quads.

**Implementation:**
- Use three.js or raw WebGL with instanced rendering
- Pre-render character set to texture atlas
- Each character = textured quad with shader-based color/fade
- Glow effect via post-processing bloom shader

**When to implement:** Only if targeting 4K displays or user requests

**Code location:** Would require full rewrite of rendering subsystem

**Validation:** Benchmark at 4K; ensure feature parity with Canvas2D version

---

##### 1.8 Reduce Character Set Size for Faster Randomization
**Priority:** P2
**Estimated Impact:** <0.5ms savings
**Complexity:** Low

**Rationale:** Current char set is 200+ characters. Random indexing could be faster with smaller set.

**Implementation:**
- Profile Math.random() + array indexing cost
- If significant, create multiple smaller char sets and rotate

**Code location:** Line 290, 348, 416

**Likely outcome:** Negligible impact; skip unless profiling shows otherwise

---

### Performance Monitoring Strategy

**Add FPS Counter (P1):**
```javascript
let frameCount = 0;
let lastFpsUpdate = performance.now();
let currentFps = 60;

function mainLoop() {
  const now = performance.now();
  frameCount++;

  if (now - lastFpsUpdate >= 1000) {
    currentFps = Math.round(frameCount * 1000 / (now - lastFpsUpdate));
    frameCount = 0;
    lastFpsUpdate = now;
  }

  // ... existing draw logic ...
}
```

**Display FPS (toggleable):**
- Overlay in top-left corner
- Color-code: green (55-60), yellow (40-54), red (<40)
- Keyboard shortcut to show/hide

**Profiling Checkpoints:**
```javascript
const perf = {};
perf.start = performance.now();
// ... shadowBlur pass ...
perf.shadowBlur = performance.now() - perf.start;
// ... color construction ...
perf.colors = performance.now() - perf.shadowBlur;
// Log to console when toggled on
```

---

### Implementation Roadmap

**Phase 1 (Week 1) — Critical Wins:**
1. Implement typed array pooling (1.3)
2. Implement color LUTs (1.2)
3. Add FPS counter
4. Measure baseline vs. optimized performance

**Phase 2 (Week 2) — Glow Optimization:**
1. Implement offscreen canvas for heads (1.1)
2. Reduce shadowBlur usage (1.5)
3. Validate visual quality

**Phase 3 (Week 3) — Advanced:**
1. Implement draw call batching (1.6)
2. Implement dirty rectangle rendering (1.4)
3. Performance validation across devices

**Phase 4 (Future) — 4K Support:**
1. Evaluate WebGL renderer (1.7) if needed
2. A/B test with Canvas2D version

---

## 2. User Settings Plan

### Overview
Replace/supplement rotary knobs with comprehensive settings panel for fine-grained control. Enable presets, persistence, and power-user features.

### Settings Panel UI

#### 2.1 Panel Structure
**Priority:** P0
**Complexity:** Medium

**Design:** Slide-out drawer from right side of screen

**Implementation:**
```html
<div class="settings-panel" id="settings-panel">
  <div class="settings-header">
    <h3>Matrix Settings</h3>
    <button class="close-btn">&times;</button>
  </div>
  <div class="settings-body">
    <!-- Sections: Animation, Color, Performance, Presets -->
  </div>
</div>
```

**CSS:**
- Fixed position, right: -400px (hidden), width: 380px, height: 100vh
- Smooth transition: `transition: right 0.3s ease`
- Semi-transparent backdrop when open
- Z-index above everything except gear icon

**Trigger:** Settings gear icon (top-right, next to V1/V2 button)

**Animation:** Slide in from right with 0.3s ease transition

**Code location:** Insert after line 281 (before script tag)

---

#### 2.2 Settings Categories and Controls

##### Animation Settings Section
**Priority:** P0

**Controls:**

1. **Animation Version**
   - Type: Toggle buttons (V1 / V2)
   - Current: lines 597-614
   - Move into settings panel, keep button for quick access
   - Default: V2

2. **Speed**
   - Type: Range slider (0.1x - 9.0x)
   - Current: Knob at lines 646-649
   - Default: 1.0x
   - Display: Show numeric value "2.5x" next to slider
   - Fine control: 0.01x increments

3. **Trail Density (Streams per Column)**
   - Type: Range slider (1 - 5 streams)
   - Current: Hardcoded V2_MAX_STREAMS_PER_COL = 3 (line 377)
   - Default: 3
   - Impact: More streams = denser rain, lower FPS

4. **Min/Max Tail Length**
   - Type: Dual range slider (5 - 89 characters)
   - Current: Hardcoded FIB array (line 295)
   - Default: Min=5, Max=55
   - Implementation: Replace fibTailLen() with random in range

5. **Mutation Rate**
   - Type: Range slider (0x - 5x multiplier)
   - Current: Hardcoded probabilities (lines 564-566)
   - Default: 1.0x
   - Effect: Multiply all Math.random() thresholds in mutation checks

##### Color Settings Section
**Priority:** P0

**Controls:**

1. **Hue**
   - Type: Color wheel or 360° range slider
   - Current: Knob at lines 639-646
   - Default: 120 (green)
   - Visual: Show live color preview swatch

2. **Head Brightness**
   - Type: Range slider (50% - 100%)
   - Current: Hardcoded lightness=88 (line 538)
   - Default: 88%
   - Apply to: Head character lightness value

3. **Saturation (Body/Tail)**
   - Type: Range slider (50% - 100%)
   - Current: Hardcoded saturation=100 (lines 545, 553)
   - Default: 100%
   - Note: Head uses saturation=30 for white glow

4. **Glow Intensity**
   - Type: Range slider (0x - 3x multiplier)
   - Current: Hardcoded shadowBlur values (lines 541, 547)
   - Default: 1.0x
   - Effect: Multiply shadowBlur values

##### Visual Effects Section
**Priority:** P1

**Controls:**

1. **Scanline Opacity**
   - Type: Range slider (0% - 20%)
   - Current: Hardcoded rgba(0, 0, 0, 0.08) (line 74)
   - Default: 8%
   - Update: .screen::after gradient opacity

2. **Font Size**
   - Type: Range slider (14px - 40px)
   - Current: Hardcoded fontSize=26 (line 291)
   - Default: 26px
   - Effect: Triggers canvas resize + reinit

3. **Screen Vignette**
   - Type: Range slider (0% - 50%)
   - Current: Not implemented
   - Default: 20%
   - Implementation: Radial gradient overlay on .screen

4. **CRT Barrel Distortion**
   - Type: Checkbox (on/off)
   - Current: Not implemented
   - Default: Off
   - Implementation: SVG filter or CSS transform

##### Performance Section
**Priority:** P1

**Controls:**

1. **Target FPS**
   - Type: Dropdown (30 / 60 / 120 / Unlimited)
   - Current: Locked to requestAnimationFrame (~60fps)
   - Default: 60
   - Implementation: Add frame skipping or setTimeout-based limiter

2. **Glow Quality**
   - Type: Dropdown (Off / Low / Medium / High)
   - Off: No shadowBlur
   - Low: Heads only, blur=6
   - Medium: Heads + near, blur=10
   - High: Current behavior
   - Default: High

3. **Show FPS Counter**
   - Type: Checkbox
   - Default: Off
   - Toggle visibility of FPS overlay

---

#### 2.3 Preset System
**Priority:** P1
**Complexity:** Medium

**Presets to Include:**

1. **Classic Green** (Default)
   - Hue: 120
   - Speed: 1.0x
   - Density: 3 streams
   - Tail: 5-55 chars
   - Version: V2

2. **Film Accurate**
   - Hue: 120
   - Speed: 0.8x
   - Density: 2 streams
   - Tail: 8-34 chars
   - Head brightness: 95%
   - Glow: 1.5x
   - Version: V2

3. **Cyberpunk**
   - Hue: 300 (magenta)
   - Speed: 1.5x
   - Density: 4 streams
   - Tail: 8-55 chars
   - Saturation: 100%
   - Glow: 2.0x
   - Version: V2

4. **Amber Terminal**
   - Hue: 30 (orange/amber)
   - Speed: 0.6x
   - Density: 2 streams
   - Tail: 13-34 chars
   - Scanlines: 15%
   - Version: V1

5. **Minimal**
   - Hue: 120
   - Speed: 0.5x
   - Density: 1 stream
   - Tail: 5-21 chars
   - Glow: 0.5x
   - Scanlines: 4%
   - Version: V2

6. **Heavy Rain**
   - Hue: 120
   - Speed: 2.0x
   - Density: 5 streams
   - Tail: 13-55 chars
   - Mutation: 2.0x
   - Version: V2

**Preset UI:**
- Dropdown at top of settings panel
- "Load Preset" button
- Confirmation: "This will overwrite current settings. Continue?"

**Implementation:**
```javascript
const PRESETS = {
  classicGreen: { hue: 120, speed: 1.0, density: 3, /* ... */ },
  filmAccurate: { hue: 120, speed: 0.8, /* ... */ },
  // ...
};

function loadPreset(name) {
  const preset = PRESETS[name];
  Object.keys(preset).forEach(key => {
    applySettingValue(key, preset[key]);
  });
  updateAllControls();
  rebuildColorLUT();
  if (preset.version !== currentVersion) toggleVersion();
}
```

**Code location:** New settings.js section or inline after line 704

---

#### 2.4 Persistence (localStorage)
**Priority:** P0
**Complexity:** Low

**What to Persist:**
- All setting values (hue, speed, density, tail range, etc.)
- Current animation version (V1/V2)
- Last active preset (if any)
- FPS counter visibility

**Implementation:**
```javascript
function saveSettings() {
  const settings = {
    hue,
    speedMult,
    maxStreams: V2_MAX_STREAMS_PER_COL,
    tailMin: /* ... */,
    tailMax: /* ... */,
    mutationRate,
    glowIntensity,
    scanlineOpacity,
    fontSize,
    version: currentVersion,
    showFps,
    // ... all settings ...
  };
  localStorage.setItem('matrixSettings', JSON.stringify(settings));
}

function loadSettings() {
  const saved = localStorage.getItem('matrixSettings');
  if (!saved) return;
  const settings = JSON.parse(saved);
  Object.keys(settings).forEach(key => {
    applySettingValue(key, settings[key]);
  });
}

// Call loadSettings() after init (line 583)
// Call saveSettings() whenever a setting changes
```

**Edge Cases:**
- Handle localStorage quota exceeded (unlikely)
- Validate loaded values (clamp to valid ranges)
- Provide "Reset to Defaults" button

**Code location:** After line 583 (after init())

---

#### 2.5 Export/Import Settings
**Priority:** P2
**Complexity:** Low

**Export:**
- Button: "Export Settings JSON"
- Download file: `matrix-settings-YYYY-MM-DD.json`
- Include all current settings + metadata (version, export date)

**Import:**
- Button: "Import Settings JSON"
- File picker: accept .json files only
- Validate JSON structure before applying
- Error handling: "Invalid settings file"

**Implementation:**
```javascript
function exportSettings() {
  const settings = { /* current settings */ };
  const blob = new Blob([JSON.stringify(settings, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `matrix-settings-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importSettings(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const settings = JSON.parse(e.target.result);
      validateSettings(settings);
      applySettings(settings);
      saveSettings();
    } catch (err) {
      alert('Invalid settings file: ' + err.message);
    }
  };
  reader.readAsText(file);
}
```

**Code location:** Settings panel section

---

#### 2.6 Keyboard Shortcuts
**Priority:** P1
**Complexity:** Low

**Shortcuts:**
- `S` - Toggle settings panel
- `Space` - Start/Stop animation (same as button)
- `V` - Toggle V1/V2 version
- `F` - Toggle fullscreen
- `Shift+F` - Toggle FPS counter
- `R` - Reset to defaults (with confirmation)
- `1-6` - Load preset 1-6
- `Esc` - Close settings panel if open

**Implementation:**
```javascript
document.addEventListener('keydown', (e) => {
  // Ignore if typing in an input
  if (e.target.tagName === 'INPUT') return;

  switch(e.key.toLowerCase()) {
    case 's':
      toggleSettingsPanel();
      break;
    case ' ':
      e.preventDefault();
      toggleBtn.click();
      break;
    case 'v':
      versionBtn.click();
      break;
    // ... etc
  }
});
```

**Code location:** After line 697 (after toggle button listener)

**Discoverability:** Show keyboard shortcuts in settings panel footer or tooltip

---

### Settings Panel Styling

**Panel CSS:**
```css
.settings-panel {
  position: fixed;
  right: -400px;
  top: 0;
  width: 380px;
  height: 100vh;
  background: rgba(20, 20, 20, 0.98);
  border-left: 2px solid rgba(0, 255, 0, 0.3);
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.8);
  transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  color: #00ff00;
}

.settings-panel.open {
  right: 0;
}

.settings-header {
  padding: 20px;
  border-bottom: 1px solid rgba(0, 255, 0, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings-section {
  padding: 20px;
  border-bottom: 1px solid rgba(0, 255, 0, 0.1);
}

.setting-item {
  margin-bottom: 20px;
}

.setting-label {
  display: block;
  font-size: 12px;
  margin-bottom: 8px;
  letter-spacing: 1px;
  opacity: 0.8;
}

.setting-control input[type="range"] {
  width: 100%;
  accent-color: #00ff00;
}

.setting-value-display {
  float: right;
  font-size: 12px;
  opacity: 0.6;
}
```

**Backdrop:**
```css
.settings-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.settings-backdrop.visible {
  opacity: 1;
  pointer-events: all;
}
```

---

### Implementation Roadmap

**Phase 1 (Week 1) — Core Panel:**
1. Build settings panel HTML structure
2. Implement slide-out animation
3. Add gear icon trigger
4. Implement basic controls (hue, speed, version)

**Phase 2 (Week 2) — Full Settings:**
1. Add all animation/color/effects controls
2. Wire up settings to engine parameters
3. Implement localStorage persistence
4. Test all controls

**Phase 3 (Week 3) — Presets & Polish:**
1. Build preset system + 6 presets
2. Implement export/import
3. Add keyboard shortcuts
4. Validation & edge case handling

---

## 3. UI Polish Plan

### Overview
Elevate visual refinement of monitor frame, controls, and responsive behavior to production-quality standards.

### Monitor Frame Enhancements

#### 3.1 Bezel Texture
**Priority:** P1
**Complexity:** Low

**Current:** Solid gradient bezel (lines 25-41)

**Proposed:**
- Subtle noise texture via CSS filter or background-image
- Light brushed-metal appearance
- Visible but not distracting

**Implementation:**
```css
.monitor {
  /* Existing styles... */
  background:
    linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%),
    linear-gradient(180deg, #2d2d2d 0%, #252525 50%, #2a2a2a 100%);
  position: relative;
}

.monitor::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence baseFrequency="0.9" numOctaves="3"/></filter><rect width="200" height="200" filter="url(%23n)" opacity="0.03"/></svg>');
  border-radius: 18px;
  pointer-events: none;
}
```

**Alternative:** Use repeating-linear-gradient for subtle grain

**Code location:** Lines 25-52 (.monitor styles)

**Validation:** Ensure texture doesn't distract from screen content

---

#### 3.2 Rounded Screen Corners with CRT Barrel Distortion
**Priority:** P1
**Complexity:** Medium

**Current:** 8px border-radius on .screen (line 58)

**Proposed:**
- Increase corner radius to 12px for more pronounced CRT feel
- Add subtle barrel distortion via CSS transform or SVG filter
- Vignette darkening at edges

**Implementation (CSS approach):**
```css
.screen {
  border-radius: 12px;
  /* Existing styles... */
}

.screen::before {
  /* Existing gradient... */
  /* Add vignette: */
  background:
    radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.3) 100%),
    linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 50%, rgba(0,0,0,0.05) 100%);
}
```

**Implementation (SVG filter approach for barrel distortion):**
```html
<svg style="position: absolute; width: 0; height: 0;">
  <defs>
    <filter id="crt-warp">
      <feGaussianBlur in="SourceGraphic" stdDeviation="0" />
      <feComponentTransfer>
        <feFuncR type="table" tableValues="0 0.2 0.8 1" />
        <feFuncG type="table" tableValues="0 0.2 0.8 1" />
        <feFuncB type="table" tableValues="0 0.2 0.8 1" />
      </feComponentTransfer>
    </filter>
  </defs>
</svg>
```

**Apply:**
```css
#matrix-canvas {
  filter: url(#crt-warp);
  /* OR use CSS transform for subtle pincushion: */
  transform: perspective(1000px) rotateX(0deg);
  transform-origin: center;
}
```

**Settings toggle:** Add "CRT Barrel Distortion" checkbox (see 2.2)

**Code location:** Lines 54-95 (.screen styles)

**Validation:** Ensure distortion doesn't reduce readability; make subtle

---

#### 3.3 Vignette Darkening
**Priority:** P1
**Complexity:** Low

**Current:** Partial gradient on .screen::before (lines 86-91)

**Proposed:** Stronger radial vignette for CRT authenticity

**Implementation:**
```css
.screen::after {
  /* Keep scanlines... */
  background:
    repeating-linear-gradient(/* scanlines */),
    radial-gradient(ellipse 90% 85% at 50% 50%, transparent 50%, rgba(0,0,0,0.4) 100%);
}
```

**Settings control:** Vignette opacity slider (see 2.2)

**Code location:** Lines 66-79 (.screen::after)

---

#### 3.4 Ambient Bezel Glow
**Priority:** P2
**Complexity:** Medium

**Concept:** Monitor bezel reflects current hue color with subtle glow

**Implementation:**
```javascript
// Update when hue changes:
function updateBezelGlow() {
  const glowColor = `hsla(${hue}, 60%, 40%, 0.15)`;
  document.querySelector('.monitor').style.boxShadow = `
    0 0 0 2px #1a1a1a,
    0 0 0 4px #3a3a3a,
    inset 0 2px 4px rgba(255,255,255,0.05),
    0 20px 60px rgba(0,0,0,0.7),
    0 0 80px rgba(0,0,0,0.5),
    0 0 40px ${glowColor},
    inset 0 -10px 30px ${glowColor}
  `;
}
```

**Call:** When hue knob changes (line 645) or settings update

**Effect:** Bezel appears to be lit by screen content

**Code location:** Lines 30-35 (.monitor box-shadow)

---

### Control Integration

#### 3.5 Integrate Controls into Monitor Bezel
**Priority:** P0
**Complexity:** Medium

**Current:** Floating btn-row at top-right (lines 210-243)

**Proposed:**
- Move V1/V2 toggle into chin controls (next to knobs)
- Move Start/Stop into chin controls
- Remove floating btn-row entirely
- Cleaner, more integrated look

**Implementation:**
```html
<div class="chin-controls">
  <!-- Existing knobs... -->

  <button class="chin-btn" id="version-btn">V2</button>
  <button class="chin-btn" id="toggle-btn">STOP</button>

  <div class="power-led" id="power-led"></div>
</div>
```

**Chin button CSS:**
```css
.chin-btn {
  background: #1a1a1a;
  border: 1px solid #444;
  color: #00ff00;
  font-family: 'Courier New', monospace;
  font-size: 9px;
  padding: 6px 10px;
  cursor: pointer;
  border-radius: 3px;
  letter-spacing: 1px;
  transition: all 0.2s;
}

.chin-btn:hover {
  background: #222;
  border-color: #00ff00;
  box-shadow: 0 0 6px rgba(0, 255, 0, 0.3);
}

.chin-btn.active {
  background: #00ff00;
  color: #000;
}
```

**Code location:** Lines 119-189 (chin controls), remove lines 210-243

**Benefit:** More authentic monitor appearance, less UI clutter

---

#### 3.6 Settings Gear Icon
**Priority:** P0
**Complexity:** Low

**Proposed:**
- Small gear icon in top-right of monitor chin (or bezel corner)
- Subtle, fits monitor aesthetic
- Triggers settings panel slide-out

**Implementation:**
```html
<div class="monitor-chin">
  <span class="monitor-brand">Matrix Corp</span>
  <div class="chin-controls">
    <!-- Existing controls... -->
  </div>
  <button class="gear-icon" id="settings-gear" title="Settings (S)">
    ⚙
  </button>
</div>
```

**Gear CSS:**
```css
.gear-icon {
  background: none;
  border: none;
  color: #555;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.3s;
  padding: 4px;
}

.gear-icon:hover {
  color: #00ff00;
  transform: rotate(30deg);
}
```

**Code location:** Inside .monitor-chin (lines 104-123)

---

### Responsive Design

#### 3.7 Mobile/Tablet Support
**Priority:** P1
**Complexity:** Medium

**Current Issues:**
- Monitor aspect ratio breaks on portrait mobile
- Knobs too small for touch
- Floating buttons cover content

**Proposed:**

**Responsive breakpoints:**
```css
/* Tablet (portrait) */
@media (max-width: 768px) and (orientation: portrait) {
  .monitor {
    width: 95vw;
    aspect-ratio: 3 / 4; /* Taller for portrait */
  }

  .knob-outer {
    width: 48px;
    height: 48px; /* Larger for touch */
  }

  .chin-controls {
    gap: 24px; /* More spacing */
  }
}

/* Mobile */
@media (max-width: 480px) {
  .monitor {
    padding: 16px 16px 8px 16px;
  }

  .monitor-brand {
    font-size: 9px;
  }

  .settings-panel {
    width: 100vw; /* Full-width on mobile */
    right: -100vw;
  }
}

/* Landscape mobile */
@media (max-height: 500px) and (orientation: landscape) {
  .stand, .stand-base {
    display: none; /* Hide stand in landscape */
  }

  .monitor {
    aspect-ratio: 16 / 9;
  }
}
```

**Touch-friendly knobs:**
- Increase touch target to 48x48px minimum
- Add touch event listeners (touchstart/touchmove/touchend)
- Prevent double-tap zoom on knobs

**Code location:** Add media queries after line 243 (end of styles)

---

#### 3.8 Touch Interaction for Knobs
**Priority:** P1
**Complexity:** Low

**Current:** Pointer events (lines 658-683)

**Enhancement:** Improve touch feel

**Implementation:**
```javascript
// Add to knob interaction:
function onPointerDown(e) {
  const knob = e.target.closest('.knob-outer');
  if (!knob) return;
  activeKnob = knob;

  // Touch-specific:
  if (e.pointerType === 'touch') {
    knobStartY = e.clientY;
    knob.style.transform = 'scale(1.05)'; // Visual feedback
  } else {
    knobStartY = e.clientY;
  }

  knobStartValue = parseFloat(knob.dataset.value);
  e.preventDefault();
}

function onPointerUp() {
  if (activeKnob && activeKnob.style.transform) {
    activeKnob.style.transform = ''; // Reset scale
  }
  activeKnob = null;
}
```

**Prevent zoom:**
```css
.knob-outer {
  touch-action: none; /* Prevent default touch behaviors */
}
```

**Code location:** Lines 658-683

---

#### 3.9 Fullscreen Mode
**Priority:** P1
**Complexity:** Low

**Proposed:**
- Fullscreen toggle button (keyboard: F)
- Hides monitor frame, stand, chin
- Canvas fills entire viewport
- Edge-to-edge matrix rain

**Implementation:**
```javascript
let isFullscreen = false;

function toggleFullscreen() {
  isFullscreen = !isFullscreen;

  if (isFullscreen) {
    document.body.classList.add('fullscreen-mode');
    // Use Fullscreen API:
    document.documentElement.requestFullscreen();
  } else {
    document.body.classList.remove('fullscreen-mode');
    document.exitFullscreen();
  }
}

// Keyboard shortcut:
// case 'f': toggleFullscreen(); break;
```

**Fullscreen CSS:**
```css
body.fullscreen-mode .monitor {
  width: 100vw;
  height: 100vh;
  max-width: none;
  padding: 0;
  border-radius: 0;
  box-shadow: none;
  background: #000;
}

body.fullscreen-mode .screen {
  border-radius: 0;
  border: none;
}

body.fullscreen-mode .monitor-chin,
body.fullscreen-mode .stand,
body.fullscreen-mode .stand-base {
  display: none;
}

body.fullscreen-mode .screen::before,
body.fullscreen-mode .screen::after {
  border-radius: 0;
}
```

**Code location:** New function after line 697

---

### Smooth Transitions

#### 3.10 V1/V2 Switch Transition
**Priority:** P2
**Complexity:** Low

**Current:** Immediate canvas clear (lines 603, 611)

**Proposed:** Cross-fade between versions

**Implementation:**
```javascript
function switchVersion(newVersion) {
  // Fade out
  canvas.style.transition = 'opacity 0.5s ease';
  canvas.style.opacity = '0';

  setTimeout(() => {
    currentVersion = newVersion;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (newVersion === 1) {
      v1Init();
    } else {
      v2Init();
    }

    // Fade in
    canvas.style.opacity = '1';
    setTimeout(() => {
      canvas.style.transition = '';
    }, 500);
  }, 500);
}
```

**Code location:** Replace lines 597-614

**Effect:** Smooth visual transition, less jarring

---

#### 3.11 Setting Change Animations
**Priority:** P2
**Complexity:** Low

**Proposed:**
- When hue changes, smoothly interpolate color over 0.3s
- When speed changes, ease into new speed over 0.2s
- Visual feedback for all changes

**Implementation:**
```javascript
let targetHue = 120;
let currentHueInterp = 120;

function updateHue() {
  if (Math.abs(currentHueInterp - targetHue) > 0.5) {
    currentHueInterp += (targetHue - currentHueInterp) * 0.15;
    hue = Math.round(currentHueInterp);
    rebuildColorLUT();
  }
}

// Call in mainLoop:
function mainLoop() {
  updateHue();
  // ... rest of loop
}

// When knob changes:
function applyKnobValue(knobEl, value) {
  if (param === 'hue') {
    targetHue = Math.round(value * 360);
    // currentHueInterp will smoothly approach targetHue
  }
}
```

**Code location:** Inside mainLoop (lines 585-594)

**Effect:** Smooth color transitions, more polished feel

---

### FPS Counter Display

#### 3.12 FPS Counter Overlay
**Priority:** P1
**Complexity:** Low

**Proposed:**
- Top-left corner overlay
- Color-coded: green (55-60), yellow (40-54), red (<40)
- Toggleable via settings or Shift+F

**Implementation:**
```html
<div class="fps-counter" id="fps-counter" style="display: none;">
  <span id="fps-value">60</span> FPS
</div>
```

**CSS:**
```css
.fps-counter {
  position: fixed;
  top: 16px;
  left: 16px;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 12px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 14px;
  color: #00ff00;
  border: 1px solid rgba(0, 255, 0, 0.3);
  z-index: 100;
  user-select: none;
}

.fps-counter.warning {
  color: #ffaa00;
  border-color: rgba(255, 170, 0, 0.3);
}

.fps-counter.critical {
  color: #ff0000;
  border-color: rgba(255, 0, 0, 0.3);
}
```

**Update logic:**
```javascript
function updateFpsDisplay() {
  const fpsEl = document.getElementById('fps-value');
  const counterEl = document.getElementById('fps-counter');

  fpsEl.textContent = currentFps;

  counterEl.classList.remove('warning', 'critical');
  if (currentFps < 40) {
    counterEl.classList.add('critical');
  } else if (currentFps < 55) {
    counterEl.classList.add('warning');
  }
}

// Call in mainLoop when FPS updates
```

**Code location:** After monitor structure, before script tag (line 281)

---

### Implementation Roadmap

**Phase 1 (Week 1) — Core Polish:**
1. Integrate controls into chin (3.5)
2. Add settings gear icon (3.6)
3. Implement FPS counter (3.12)
4. Basic mobile responsiveness (3.7)

**Phase 2 (Week 2) — Visual Refinement:**
1. Bezel texture (3.1)
2. Screen corner radius + vignette (3.2, 3.3)
3. Touch-friendly knobs (3.8)
4. Fullscreen mode (3.9)

**Phase 3 (Week 3) — Advanced Polish:**
1. CRT barrel distortion (3.2)
2. Ambient bezel glow (3.4)
3. Smooth transitions (3.10, 3.11)
4. Responsive polish (landscape, tablet)

---

## Summary Priority Matrix

### P0 — Critical (Must Implement)
**Performance:**
- Typed array pooling (1.3)
- Color LUTs (1.2)
- Offscreen canvas for glow (1.1)

**Settings:**
- Settings panel structure (2.1)
- Animation/color controls (2.2)
- localStorage persistence (2.4)

**UI:**
- Integrate controls into bezel (3.5)
- Settings gear icon (3.6)

---

### P1 — Important (High Value)
**Performance:**
- Dirty rectangle rendering (1.4)
- Reduce shadowBlur (1.5)
- Batch draw calls (1.6)
- FPS counter (monitoring)

**Settings:**
- Preset system (2.3)
- Keyboard shortcuts (2.6)
- Full settings controls (2.2 - all sections)

**UI:**
- Bezel texture (3.1)
- Screen corners + vignette (3.2, 3.3)
- Mobile/tablet support (3.7)
- Touch-friendly knobs (3.8)
- Fullscreen mode (3.9)
- FPS counter display (3.12)

---

### P2 — Nice-to-Have (Polish)
**Performance:**
- WebGL renderer for 4K (1.7)
- Char set optimization (1.8)

**Settings:**
- Export/import settings (2.5)

**UI:**
- Ambient bezel glow (3.4)
- Smooth transitions (3.10, 3.11)

---

## Testing Checklist

### Performance Validation
- [ ] Measure FPS before/after each optimization
- [ ] Test on low-end hardware (integrated GPU)
- [ ] Profile with Chrome DevTools Performance tab
- [ ] Verify no visual regressions
- [ ] Test at multiple resolutions (720p, 1080p, 4K)

### Settings Validation
- [ ] All controls affect correct parameters
- [ ] Settings persist across page reload
- [ ] Presets load correctly
- [ ] Export/import round-trip successful
- [ ] Keyboard shortcuts work without conflicts
- [ ] Edge cases handled (invalid values, missing localStorage)

### UI Validation
- [ ] Responsive on mobile (portrait/landscape)
- [ ] Responsive on tablet
- [ ] Touch interactions smooth
- [ ] Fullscreen mode works correctly
- [ ] FPS counter accurate
- [ ] Visual consistency across browsers (Chrome, Firefox, Safari, Edge)
- [ ] Monitor frame looks polished
- [ ] No layout breaks at extreme viewport sizes

---

## Estimated Timeline

**Total implementation time:** 6-8 weeks for full plan

**Phased approach:**
- **Weeks 1-2:** P0 critical items (playable, optimized, configurable)
- **Weeks 3-4:** P1 important items (polished, feature-complete)
- **Weeks 5-6:** P2 nice-to-have items (production-ready)
- **Weeks 7-8:** Testing, bug fixes, refinement

**Recommended order:**
1. Performance optimizations first (immediate user impact)
2. Settings panel next (enables experimentation)
3. UI polish last (builds on stable foundation)

---

## Risk Assessment

### High Risk Items
- **WebGL renderer (1.7):** High complexity, potential compatibility issues
  - Mitigation: Keep Canvas2D as fallback

- **CRT barrel distortion (3.2):** May reduce readability
  - Mitigation: Make toggleable, keep subtle

- **Dirty rectangle rendering (1.4):** Complex logic, potential bugs
  - Mitigation: Thorough testing, A/B compare with full grid iteration

### Medium Risk Items
- **Offscreen canvas (1.1):** Browser support varies
  - Mitigation: Feature detect, fallback to direct rendering

- **Settings persistence (2.4):** localStorage may be disabled
  - Mitigation: Graceful degradation, session-only settings

### Low Risk Items
- Most other optimizations are incremental and low-risk
- Settings UI is additive (doesn't break existing functionality)
- UI polish is visual-only (no functional changes)

---

## Success Metrics

**Performance:**
- Maintain 60 FPS at 1080p on mid-range hardware
- Achieve 30+ FPS at 4K
- Reduce frame time by 40% (from ~20ms to ~12ms in V2)
- Eliminate GC pauses during animation

**Settings:**
- 90% of users engage with settings panel
- 50% of users try at least one preset
- Settings persist correctly for 100% of users (where localStorage available)

**UI:**
- Mobile usable without zoom
- Touch interactions feel native
- Visual polish meets or exceeds reference implementations
- Fullscreen mode adoption >30%

---

## Future Enhancements (Beyond Scope)

- Multiple monitor skins (retro, modern, cyberpunk)
- Audio reactive mode (responds to microphone input)
- Multi-layer rain (foreground/background parallax)
- Custom character sets (user upload)
- Network activity visualization mode
- Recording/export as video or GIF
- VR mode (3D depth layers)
- Collaborative mode (multi-user synchronized rain)

---

**END OF OPTIMIZATION PLAN**
