# R&D Findings - USPS Edit Book Assistant Tool
## Executive Summary

**Date:** January 29, 2026
**Research Lead:** Edit Book R&D Team
**Purpose:** Inform development of interactive HTML tool for USPS carrier case simulation

---

## Key Discovery: Major Market Gap Identified

**We found NO existing digital tools for carrier case management, edit book visualization, or casing simulation.** This represents a significant opportunity to build something genuinely useful and novel.

---

## What We Know: Critical Technical Specs

### 1. Edit Book Structure

**Confirmed:**
- Edit books are physical printed documents (landscape format for delivery routes)
- Generated from AMS (Address Management System) database
- Contains Route Listing Report with individual delivery points
- Each row = one delivery address
- Updated monthly (submission deadline: 10th of month)

**Data Fields Available:**
- ZIP Code
- Carrier Route ID (CRID)
- County
- Carrier route information
- Delivery point information
- **L|F CELL column** - assigns cell size to each address
- Address ranges
- Delivery sequence numbers

**Format:**
- Available as PDF from AMS
- 5 separate columns (expanded from original 2-character format)
- Edit Book Training Manual from 2005 provides detailed format specs

### 2. Physical Case Equipment - EXACT SPECIFICATIONS

**Standard Carrier Case (Item 124-D):**
- **240 separations (cells)** at **1" wide each** (default)
- **6 shelves** (USPS standardizing to this)
- Dividers removable to create wider cells
- **Minimum cell width: 2 inches** (unless special approval)

**Wing Cases (Add-on Capacity):**
- 143-D Swinging Wing: **120 additional cells**
- 144-D Wing with Table: **240 additional cells**

**Cell Dividers Available Heights:**
- 3", 4", 5", 6", 7", 8" heights
- Letter case dividers: 10" x 3"
- Flat case dividers: 12" x 3"

**Platform Dimensions (Example):**
- 47.5" W x 32" D x 5" H

**Critical Finding:** Rural routes and city routes use different cell widths. Rural carriers do NOT use 1/2" cells (city only).

### 3. Cell Numbering and Layout Logic

**Numbering System:**
- Cells numbered in **delivery sequence order** (NOT street address order)
- Follows actual route walking/driving pattern
- Creates sequential flow matching carrier's route progression

**Cell Assignment:**
- Management determines based on mail volume and route characteristics
- L|F CELL column in edit book specifies cell size per address
- Adjustable based on volume needs

### 4. Label System

**Hardware:**
- C-channel label holders (snap-in design)
- Typically 4' strips or 2' strips
- 3/4" width C-channel

**Label Content:**
- Address ranges for the cell
- Delivery sequence info
- Carrier route data
- Possibly ZIP+4 codes

**Special Cells:**
- Some reserved cells (e.g., PARS cards)
- Separator cells between sections
- Not all cells in edit book (some auto-generated/reserved)

### 5. USPS Systems Integration

**DPS (Delivery Point Sequence):**
- 87.6% of letters arrive pre-sorted in delivery sequence
- Carriers DON'T case DPS letters
- Edit book primarily for non-DPS mail

**What Gets Manually Cased:**
- Non-DPS letters
- Flats (magazines, large envelopes)
- Parcels
- Special handling items
- Accountables

**AMS (Address Management System):**
- Master database feeding edit books
- 49 million+ rural addresses, all city addresses
- Monthly update cycle
- Integration with e4003 mapping system

---

## What We Still Need to Learn

### 1. Edit Book File Format Details

**Unknown:**
- Exact digital file format from AMS (CSV? XML? Proprietary?)
- API access to AMS data (likely restricted to USPS internal)
- Precise column specifications and data types
- How reserved/special cells are coded

**Next Step:** Obtain sample edit book PDF or data file to reverse-engineer format.

### 2. Case Layout Algorithm

**Unknown:**
- Exact algorithm for translating edit book entries to physical case positions
- How system calculates which shelf and which position
- Rules for shelf-to-shelf flow (serpentine? left-to-right then down?)
- How reserved cells affect positioning

**Next Step:** Interview carriers or managers about case layout methodology.

### 3. Label Auto-Generation Rules

**Unknown:**
- What separator labels are auto-inserted?
- Frequency and placement of divider cells
- Special cell types and their positions
- How system handles route beginning/end markers

**Next Step:** Examine actual printed case labels from USPS facility.

### 4. Route Type Variations

**Partially Known:**
- Rural vs. city differences confirmed (cell widths differ)
- Different configurations for different route types

**Unknown:**
- Specific configuration rules per route type
- PO Box section layouts
- Highway contract route differences
- Cluster box route handling

**Next Step:** Research M-39/M-41 handbooks for detailed specifications.

---

## Carrier Pain Points = Feature Opportunities

### Pain Point 1: Route Adjustments are Confusing
**Problem:** When routes change, carriers struggle to visualize new case layout
**Opportunity:** Preview tool showing before/after case configuration

### Pain Point 2: New Carrier Learning Curve (6 months!)
**Problem:** Takes 6 months to feel comfortable, lots of frustration
**Opportunity:** Interactive training simulator to learn delivery sequence and casing virtually

### Pain Point 3: Calculating Cell Positions is Cumbersome
**Problem:** No easy way to figure out which physical cell corresponds to an address
**Opportunity:** Address search → highlights exact case position

### Pain Point 4: Consolidated Casing Causing Anxiety
**Problem:** Less space, long hours, schedule changes
**Opportunity:** Optimize case layout for space efficiency, visualize crowding issues

### Pain Point 5: No Digital Reference
**Problem:** Edit books are physical, easily damaged, hard to share
**Opportunity:** Digital backup/reference accessible on phone/tablet

---

## Recommended Tool Features

### Phase 1: Core Visualization (MVP)

1. **Edit Book Parser**
   - Upload PDF or CSV edit book data
   - Parse address entries and cell assignments
   - Handle L|F CELL column sizing

2. **Case Layout Renderer**
   - Display interactive case with correct number of shelves
   - Show 240 cells (or custom configuration)
   - Visual representation of cell widths

3. **Address-to-Cell Mapping**
   - Click address → highlight corresponding cell
   - Click cell → show address(es) assigned
   - Search function: enter address, find cell

4. **Label Preview**
   - Generate visual case labels from edit book
   - Print-ready format matching C-channel dimensions
   - Include separator/reserved cells

### Phase 2: Advanced Features

5. **Route Comparison**
   - Upload old and new edit book
   - Show differences (moved addresses, new cells, deleted cells)
   - Highlight changes for route adjustments

6. **Casing Simulator**
   - Virtual "practice mode" with sample mail
   - Drag-and-drop letters to correct cells
   - Timed practice for speed training
   - Scoring based on accuracy

7. **Configuration Builder**
   - Specify number of cases (main + wings)
   - Adjust cell widths
   - Model different route configurations
   - Export configuration specs

8. **Mobile-Friendly View**
   - Responsive design for phone/tablet
   - Quick reference at carrier case
   - Offline capability

### Phase 3: Integration & Analytics

9. **Volume Analysis**
   - Track mail volume by cell over time
   - Suggest cell size optimizations
   - Identify overburdened cells

10. **Multi-Route Management**
    - Handle multiple routes/carriers
    - Compare configurations
    - Bulk label printing

11. **Export/Share**
    - Print case diagrams
    - Share with backup carriers
    - Generate training materials

---

## Technical Architecture Recommendations

### Frontend: Pure HTML/CSS/JavaScript
**Why:**
- No server required (can run locally or from file://)
- Easy for carriers to use without IT approval
- Works offline
- Simple deployment

**Key Libraries:**
- HTML5 Canvas or SVG for case rendering
- PDF.js for parsing edit book PDFs
- LocalStorage for saving configurations
- Print CSS for label generation

### Data Input Options

1. **Manual Entry**
   - Form-based input for small routes
   - Good for testing/prototyping

2. **PDF Upload**
   - Parse existing edit book PDFs
   - Extract data from Route Listing Report format
   - Requires PDF parsing logic

3. **CSV Import**
   - Simple comma-separated format
   - Template provided for manual data entry
   - Easy integration if USPS provides data

4. **API Integration (Future)**
   - If AMS ever provides public API
   - Real-time data sync
   - Not likely in near term

---

## Open Questions for User

1. **Data Source:** Do you have access to sample edit book files we can use for testing? (PDF or any digital format)

2. **Route Type Focus:** Should we focus on city routes, rural routes, or make it configurable for both?

3. **Cell Width Handling:** Should the tool:
   - Auto-calculate cell widths based on L|F CELL column?
   - Let users manually adjust cell widths?
   - Both?

4. **Layout Algorithm:** Do you know the actual shelf-filling pattern used by USPS? (e.g., left-to-right row 1, then left-to-right row 2, or serpentine, or other?)

5. **Reserved Cells:** Do you know which cell positions are typically reserved or auto-generated (not in edit book)?

6. **Use Case Priority:** What's most important first?
   - Training new carriers
   - Visualizing route adjustments
   - Label printing
   - Address lookup

7. **Hardware Testing:** Do you have access to actual USPS case equipment to verify measurements and take photos/measurements?

8. **Carrier Feedback:** Can we interview or survey actual carriers about their needs and pain points?

---

## Market Opportunity Assessment

### Strengths
- **Zero competition** - no existing tools found
- **Clear pain points** - carriers frustrated with current process
- **Measurable value** - reduce 6-month learning curve
- **Modernization need** - USPS OIG identified edit book system needs updating
- **Union support potential** - NALC provides training materials, could partner

### Challenges
- **Data access** - AMS data may be USPS-internal only
- **Format variations** - different route types have different configs
- **Algorithm unknowns** - need to reverse-engineer or learn layout logic
- **Testing access** - may be hard to validate without USPS partnership

### Target Users
1. **Primary:** New carrier assistants (CCAs, RCAs) for training
2. **Secondary:** Regular carriers during route adjustments
3. **Tertiary:** Postal managers for route planning
4. **Potential:** NALC for training programs

### Monetization Options (If Applicable)
- Free version: Basic visualization
- Paid version: Advanced features (simulation, analytics)
- USPS/NALC licensing: Official training tool
- SaaS for postal managers: Multi-route management

---

## Next Steps

### Immediate (This Week)
1. ✅ Complete research (DONE)
2. Obtain sample edit book file for parsing
3. Create mockup of case layout UI
4. Prototype basic cell renderer

### Short-Term (Next 2 Weeks)
1. Build MVP: Edit book parser + case visualization
2. Implement address-to-cell mapping
3. Test with sample data
4. Get carrier feedback on prototype

### Medium-Term (Next Month)
1. Add label generation feature
2. Implement route comparison
3. Create mobile-responsive version
4. User testing with carriers

### Long-Term (2-3 Months)
1. Build casing simulator
2. Add volume analytics
3. Polish UI/UX
4. Consider NALC/USPS partnership

---

## Success Metrics

**How We'll Know This Tool is Valuable:**

1. **Training Time Reduction:** New carriers comfortable in < 3 months instead of 6
2. **Adoption Rate:** Carriers actually use it (track active users)
3. **Accuracy Improvement:** Fewer mis-cased letters in training
4. **Time Savings:** Faster route adjustment planning
5. **User Satisfaction:** Positive feedback from carriers/managers

**Minimum Viable Success:**
- Tool correctly visualizes at least one sample route
- Carriers can find addresses via search
- Labels can be generated and printed
- At least 5 carriers find it helpful

---

## Resources Compiled

All research sources documented in: `USPS-RESEARCH.md`

**Key Reference Documents:**
- Edit Book Training Manual (2005) - PDF available
- M-39 Management of Delivery Services Handbook
- M-41 City Delivery Carriers Duties and Responsibilities Handbook
- NALC Route Protection Program materials
- NALC COR Training Guide (M-01766)

**Technical Specs Confirmed:**
- Standard case: 240 cells @ 1" width = 240" total (~20 feet)
- 6 shelves standard
- Cell minimum: 2" wide
- Numbering: Delivery sequence order

---

**Bottom Line:** This tool has real potential to help carriers. The market gap is genuine, the pain points are clear, and the technical requirements are achievable. Next critical step is obtaining sample edit book data to build a working prototype.
