# USPS Mail Casing, Edit Books, and Carrier Sorting Equipment - Comprehensive Research Report

**Date:** January 29, 2026
**Purpose:** Research to inform building an interactive HTML tool for USPS carriers

---

## Table of Contents

1. [USPS Edit Books](#1-usps-edit-books)
2. [Physical Case Equipment & Dimensions](#2-physical-case-equipment--dimensions)
3. [Case Labels & Cell Layout](#3-case-labels--cell-layout)
4. [USPS Delivery & Sorting Systems](#4-usps-delivery--sorting-systems)
5. [Carrier Workflow & Pain Points](#5-carrier-workflow--pain-points)
6. [Existing Tools & Market Gap](#6-existing-tools--market-gap)
7. [Sources](#7-sources)

---

## 1. USPS Edit Books

### 1.1 Definition and Purpose

The **Edit Book** is a physical document provided to every route containing a current Route Listing Report. Each individual carrier is responsible for keeping their Edit Book accurate by adding and deleting addresses on the Route Listing Report and maintaining actual street delivery sequence.

The Edit Book is kept at the carrier case unless it has been submitted to the Address Management System (AMS) for updates. All routes nationwide must use the Edit Book process for updating the database.

### 1.2 Key Components

**Route Listing Report:**
- The most critical element of the Edit Book
- A hardcopy printout of every delivery point on a route
- Each row represents an individual delivery address
- Carriers must keep this accurate by adding/deleting addresses

**Report Heading:**
- Displays ZIP Code
- Carrier Route ID (CRID)
- Bundle type

### 1.3 Data Fields and Format

The Edit Book has evolved to include more detailed information:

**Original Format:**
- Single 2-character 1621 column

**Updated Format (as of 2005):**
- 5 separate columns, each displaying a single element
- County information
- Carrier route information
- Delivery point information
- L|F CELL column (for assigning cell sizes to each address)

**Report Types:**
- "Expanded Route Listing" (LFA220P2) → "Route Listing Report"
- "Route Listing" (LFA220P1) → "PO Box Listing Report"
- Delivery route edit sheet: landscape format
- PO Box edit sheet: portrait format

### 1.4 Generation and Update Process

**Edit Book Source:**
- Generated from current data in AMS (Address Management System)
- Every carrier route and every PO box unit has an Edit Book

**Update Process:**
1. Carriers record additions, deletions, and changes on the Route Listing Report (in RED)
2. Local management enters new deliveries into edit book and WEB EASE
3. Edit book is sent to AMS for verification by the 10th of each month
4. AMS verifies and updates the database
5. Updated data enters e4003 (mapping) system

**Equipment Information:**
- Last page of edit book includes equipment information for the route
- Tells AMS how many cases exist and what type
- Determines how many cells are available

### 1.5 Relationship to Delivery Systems

**Edit Book vs. DPS (Delivery Point Sequence):**
- Edit book is primarily for mail that must be manually cased by carriers
- DPS mail is pre-sorted by automated equipment in delivery sequence
- Carriers use edit books for non-DPS mail (flats, parcels, some letters)

### 1.6 Known Issues

**System Modernization Needs:**
- According to USPS Office of Inspector General audit, the AMS Edit Book Process needs modernization
- Process still relies on physical books requiring manual updates and submissions
- Carriers help maintain address quality by observing changes, noting in edit books, and submitting to management

---

## 2. Physical Case Equipment & Dimensions

### 2.1 Standard Carrier Case (Item 124-D)

**Primary Equipment:**
- Item 124-D: Standard carrier case
- **240 separations (cells)** at 1" wide each
- Dividers are removable for creating wider separations
- Management determines the type of carrier case equipment used on each route

**Case Configuration:**
- Multiple shelves
- Each shelf divided into individual separations (cells)
- Dividers made of hard plastic, black color
- Available divider heights: 3", 4", 5", 6", 7", 8"

**Cell Dividers:**
- 124-R57: 5" high (for use with Item 124-D and wings)
- 124-CII7: 4" high (for use with Item 124-D and wings)

### 2.2 Wing Cases (Additional Capacity)

**Wing Case Options:**
- **143-D: Swinging Wing Case** - 120 separations
- **144-D: Wing Case with Table** - 240 separations

### 2.3 Platform and Support Equipment

**Carrier Case Platform:**
- Example dimensions: 47-1/2"W x 32"D x 5"H (Wood construction)

**Label Holders:**
- C-channel label holder strips (4' strips common)
- Label holder dimensions: 3/4" x 45-3/4"
- Clips for attachment to shelves

### 2.4 Cell Size Configuration

**Standard Configuration:**
- Default: 1" wide separations
- Wider separations possible by removing dividers
- **Minimum separation width:** 2 inches (unless otherwise approved by postmaster/supervisor)

**Volume-Based Adjustment:**
- Management determines width of separations based on mail volume and mix
- Wider separations accommodate addresses receiving large volumes
- Added space for casing flat mail, magazines, and newspapers

### 2.5 Distribution Case Components

**For Letter Cases:**
- Cell dividers: 10" x 3" (plastic)

**For Flat Cases:**
- Cell dividers: 12" x 3" (plastic)

### 2.6 Current USPS Initiative

**Case Standardization:**
- USPS working to convert city routes to use one, six-shelf, evenly spaced 124 case
- Initiative to reduce casing equipment variations

### 2.7 Route Type Differences

**City Routes:**
- May use 1/2 inch separations

**Rural Routes:**
- Do NOT use 1/2 inch separations (always wider)
- Different configuration standards than city routes

### 2.8 Reference Materials

Detailed specifications can be found in:
- USPS Handbook PO-603
- M-39 Handbook (Management of Delivery Services)
- M-41 Handbook (City Delivery Carriers Duties and Responsibilities)

---

## 3. Case Labels & Cell Layout

### 3.1 Case Label Hardware

**Label Holders:**
- Made to USPS specifications
- Snap into Carrier Case C-channels
- Available in strips: 2', 4' lengths
- Pricing typically per foot
- Material: Plastic C-channel design

**Label Holder Types:**
- Standard strip holders (S1000000 series)
- C-Channel holders (3/4" width)
- Clip-style holders for squared-end shelves (N1030409)

### 3.2 Cell Numbering and Layout

**Delivery Sequence Numbering:**
- Box/cell numbers assigned in the sequence the carrier delivers the mail
- Numbering follows actual delivery order rather than street address order
- Creates sequential flow matching route progression

**Cell Assignment:**
- Management determines cell layout based on route characteristics
- Unless approved otherwise: minimum 2" wide separations
- Using the one-bundle system: manager determines width and number of addresses per separation

### 3.3 Label Content and Information

Based on edit book data, case labels contain:
- Address ranges for the cell
- Delivery sequence information
- Carrier route information
- May include ZIP+4 codes

**Special Cells:**
- Reserved cells for special purposes (e.g., PARS cards)
- Some carriers use 1 cell for all PARS cards in alphabetical order
- Separator cells between different sections

### 3.4 Label Generation and Printing

**Request Process:**
- Carriers/management can request specific label configurations
- Special requests noted with label request (e.g., extra cells for PARS)
- Labels printed based on edit book data and route configuration

**Format Considerations:**
- Labels must fit C-channel holders
- Must be readable from casing position
- Typically printed on label stock compatible with postal-grade label holders

### 3.5 Layout Patterns

**Case Organization:**
- Casing involves placing mail in delivery sequence
- Mail sorted into case with multiple shelves
- Each shelf divided into individual separations
- Flow pattern follows route delivery sequence

**Separations and Dividers:**
- "Separations" = individual cells/slots
- Dividers create physical boundaries between cells
- Adjustable to accommodate different mail volumes per delivery point

### 3.6 Practical Usage Notes

**From Carrier Forums:**
- New carriers report label configuration can affect casing speed
- No single "best" layout - varies by route volume and carrier preference
- Some carriers modify label density based on mail volume patterns
- Rural vs. City routes have different label/cell standards

---

## 4. USPS Delivery & Sorting Systems

### 4.1 DPS (Delivery Point Sequence)

**Definition:**
Automated mail sorting process that puts carrier routes into delivery order. Entails the automated sorting of letters that have been barcoded, with barcodes representing specific delivery points.

**Process:**
1. First pass: sequence the mail
2. Second pass: sort sequenced mail by each carrier
3. Letters presented to carriers ready for delivery in walk sequence

**Benefits:**
- Eliminates manual sorting of letters
- Reduces costs
- Improves accuracy and speed of delivery
- Contributes to improved customer satisfaction
- $5 billion in savings recognized over 15 years (as of reports)

**Coverage:**
- Over 99% of all City delivery routes receive DPS
- 86.5% of all Rural routes receive DPS
- On average, routes receive 87.6% of their letters in DPS

**Impact on Casing:**
- DPS letters bypass carrier casing process
- Carriers only case non-DPS mail manually
- Significantly reduced manual letter sorting time

### 4.2 AMS (Address Management System)

**Definition:**
USPS master database of deliverable addresses. Contains data for approximately 49 million rural addresses nationwide, plus all city addresses.

**Functions:**
- Maintains current address database
- Processes edit book submissions from carriers
- Generates route listing reports
- Updates delivery point information
- Feeds data to other USPS systems

**Integration Points:**
- Edit books submitted to AMS for updates
- Data flows from AMS to e4003 (mapping system)
- Provides data for carrier route products
- Powers address verification and ZIP+4 validation

**Access Methods:**
- AMS API: Software for address matching and verification
- Address Information System (AIS) Viewer: Look up addresses
- Carrier Route Product: Apply carrier route codes
- CASS certification process integration

### 4.3 FSS (Flats Sequencing System)

**Definition:**
Automated system using dual pass sort technique to sort flats (large envelopes, magazines, catalogs) to delivery sequence order.

**Historical Context:**
- Prior to FSS: flats machine-sorted to route level only
- FSS sorts to delivery point sequence (walk sequence)

**Goal:**
- Provide flat mail in "Delivery Point Sequence" (DPS) to all carriers
- Carriers receive delivery-point-sequenced flats ready for street delivery
- Reduce carrier casing time in the office

**Challenges:**
- "Leakage" of flats processed elsewhere requires additional manual sorting
- Problem incorporating cased letters/flats with sequenced volumes
- Possible solution: package DPS letters and FSS flats separately
- POV routes allowed to case FSS (could gain time)
- Implementation has fallen short of expectations (per OIG reports)

**Impact on Workflow:**
- When working: reduces casing time for flats
- When not working or incomplete: carriers must case non-FSS flats manually
- Mixed results on operational efficiency

### 4.4 CRIS (Carrier Route Information System)

**Definition:**
Official city delivery scheme listing all city and noncity delivery post offices in standardized format.

**Coverage:**
- Lists approximately 570,000 carrier routes
- City routes
- Rural routes
- Highway contract routes
- Post office box sections
- General delivery units

**Data Format:**
- Formatted by ZIP Code
- Street name
- Street number range
- Delivery statistics (possible deliveries) for each carrier route

**Modern Access:**
- Now part of USPS Address Information System (AIS) Carrier Route Product
- ZIP + 4 Retrieval option available
- Mailers can retrieve, view, and print hardcopy reports on demand
- Contact: 800-238-3150

**Purpose:**
- Provides reference information for applying carrier route codes
- Used for presort postage discounts
- Supports carrier route mapping and planning

### 4.5 System Integration Flow

```
Carrier Observations → Edit Book → AMS → Database Updates
                                    ↓
                         CRIS + e4003 (mapping)
                                    ↓
                    Route Configuration & Planning
                                    ↓
        Automated Sorting (DPS/FSS) + Manual Casing
                                    ↓
                            Street Delivery
```

**What Gets Cased Manually:**
- Letters not in DPS system
- Flats not in FSS system
- Parcels
- Special mail items
- Accountables
- Mail requiring special handling

**What's Automated:**
- DPS letters (87.6% of letters on average)
- FSS flats (where deployed and working)
- Pre-sorted business mail

---

## 5. Carrier Workflow & Pain Points

### 5.1 Daily Carrier Workflow

**Morning Start Times:**
- Carriers typically begin early morning
- Some start as early as 4:00 AM
- Common start: 6:30 AM
- Work hours: Full-time typically 8 hours/day, 5 days/week
- City Carrier Assistants (CCAs): May work up to 11.5 hours/day

**Morning Office Routine:**
1. **Arrival and Setup (base minimum: 5 minutes)**
   - Withdraw mail from distribution cases, trays, sacks, hampers

2. **Vehicle Inspection (base minimum: 3 minutes)**
   - Check vehicle condition and safety

3. **Personal Preparation (5 minutes allowed)**
   - First trip preparation
   - Obtain hat and coat from wall racks
   - Visit swing room for rain gear from locker
   - Personal needs

4. **Mail Casing**
   - Spend several hours arranging mail for delivery
   - Sort non-DPS mail into delivery sequence
   - Case flats, parcels, and special items
   - Integrate with DPS/FSS sequenced mail

5. **Final Preparation**
   - Pull down sorted mail from case
   - Bundle and organize for street delivery
   - Load vehicle

### 5.2 Time Investment in Casing

**Typical Casing Duration:**
- "Several hours" in the morning arranging mail
- Varies significantly by route volume and mail mix
- Experienced carriers faster than new carriers

**Learning Curve:**
- New carriers report being "terribly slow"
- May take 6 months to feel comfortable with the job
- Multiple methods tried with "very frustrating work days"

### 5.3 Major Pain Points

#### 5.3.1 Speed and Efficiency Challenges

**New Carrier Struggles:**
- Trying different methods with frustrating results
- Difficulty building speed
- Learning delivery sequence takes time
- No single "best way" - varies by route and individual thinking

#### 5.3.2 Safety Concerns

**On-Route Sorting:**
- Busy country routes: dangerous to flip through mail between boxes
- Carriers admit to sorting while driving: "Not safe!"
- Pressure to make time leads to unsafe practices

#### 5.3.3 Consolidated Casing Issues

**Recent USPS Initiative Problems:**
- Consolidated casing pilot program called "major disaster" on forums
- Heavy burden on local letter carriers
- Experienced employees retiring due to changes
- Carriers report:
  - Anxiety, stress, and frustration
  - Sleep deprivation from long hours
  - Daily schedule changes
  - Much less room in mornings at consolidation centers

#### 5.3.4 Space and Equipment Issues

**Physical Constraints:**
- Management not providing adequate casing space (carrier complaints)
- At consolidation centers: significantly less workspace
- Concerns about space before additional offices move in
- Insufficient case equipment for route needs

#### 5.3.5 Route Adjustments and Changes

**COR (Carrier Optimal Routing) Problems:**
- "Waiting Other" time disappears in COR system - cannot be recovered
- If adjustment team doesn't properly add extra routes, COR leaves assignments overburdened
- Only regular carrier's time can be used to evaluate/adjust route (M-39, Section 241.35)
- Management must document changes to carrier's base time due to operational changes

**Edit Book Update Challenges:**
- Monthly submission deadline (10th of month)
- Carriers must track all address changes
- Coordination with management and AMS
- Lag time between submission and implementation

### 5.4 Union (NALC) Perspective

**Training Resources:**
- NALC provides Route Protection Program
- COR Training Guide (M-01766)
- 2018 NALC Guide to Route Inspections
- Resources to identify contractual violations during route counts/inspections

**Common Issues Documented:**
- Inadequate case equipment
- Improper route adjustments
- Time allowance disputes
- Workspace and safety concerns

### 5.5 Carrier Methods and Techniques

**Individual Variation:**
- "There is no exact best way to handle flats and chunks"
- "Routes vary in volume, and our minds also think differently"
- "One size does not fit all"

**Experience-Based Learning:**
- Carriers develop personalized techniques
- Speed improves significantly with route familiarity
- Knowledge of delivery points crucial to efficiency

---

## 6. Existing Tools & Market Gap

### 6.1 USPS-Provided Technology

#### 6.1.1 Mobile Delivery Devices (MDD)

**Functionality:**
- Scan and transmit tracking data from parcels
- GPS technology for precise delivery tracking
- Real-time location timing
- Transmit data to local managers

**Usage:**
- GPS tracking of carriers for nearly 10 years
- GPS-tracked cell phones monitor employee status on routes
- TIAREAP uses Digital Street Review

#### 6.1.2 Transportation Management Systems (TMS)

**Capabilities:**
- Optimize delivery routes
- Account for variables: traffic patterns, weather, package requirements
- Transform planning, tracking, and optimization of transportation
- Improved route effectiveness
- Enhanced visibility into package movement

#### 6.1.3 Route Optimization Software

**Features:**
- Simplifies multi-route stops into quick, easy-to-follow pathways
- Determines dimensions and characteristics of postal routes
- Uses software and feedback from workers
- Accounts for: traffic, weather, construction, accidents

### 6.2 Carrier Route Data Products

**Available Tools:**
- AMS API for address verification
- Address Information System (AIS) Viewer
- Carrier Route Product (reference info for carrier route codes)
- ZIP + 4 Retrieval systems

**Purpose:**
- Mainly for mailers and presort operations
- Not carrier-facing tools
- Business/bulk mail optimization

### 6.3 Digital Edit Book Tools

**Search Results:**
No dedicated digital edit book tools found in public search. This represents a significant gap.

**Current State:**
- Edit books remain physical printed documents
- Updates done manually in red ink
- Submitted as physical books to AMS
- No digital interactive version for carriers

### 6.4 Training Tools

**USPS Carrier Academy:**
- 24 hours (3 days) classroom instruction using simulation
- 24 hours on-the-job training (OJT)
- Rural Carrier Academy: full 5 days including:
  - Practice casing
  - Practice loading
  - Practice delivery
  - Full course with actual delivery experience

**Training Materials:**
- Edit Book Training Manual (PDF, 2005)
- Instructor-led demonstrations
- Physical practice with real mail and cases
- **No software-based carrier case simulator found**

### 6.5 International Postal Technology

**Multi-Carrier Parcel Management Software:**

Several sophisticated international systems exist, though not USPS-specific:

1. **WallTech eTowerB2C**
   - End-to-end parcel logistics software
   - International e-commerce focus
   - Cloud-based solution
   - Origin to destination tracking

2. **ISS (EPG ONE)**
   - Over 280 carriers
   - 3,000+ shipping services worldwide
   - Connections in Europe, USA, Asia

3. **MercuryGate**
   - Transportation to import/export
   - Global sourcing, international logistics
   - Claims management

4. **Shipsy**
   - AI-powered logistics management platform
   - Cost reduction and service experience enhancement

**Common Features:**
- Multi-carrier integration
- Real-time tracking
- Customs management
- Rate shopping
- KPI monitoring

**Gap:** None of these address carrier case management or edit book simulation.

### 6.6 Third-Party Route Planning Tools

**Available Solutions:**
- Straightaway: USPS dynamic route optimization
- MyWay Route: Free USPS route planner app
- Various delivery optimization apps

**Focus:**
- Street delivery optimization
- Turn-by-turn navigation
- Stop sequencing

**Gap:** No tools for office casing process or case configuration.

### 6.7 Market Gap Analysis

#### What Exists:
- Street delivery route optimization
- Parcel tracking and management
- Address verification and CASS
- Bulk mailer presort tools
- Training manuals and PDFs

#### What Does NOT Exist:
- ✗ Interactive digital edit book viewer
- ✗ Carrier case configuration simulator
- ✗ Visual case layout tool
- ✗ Cell calculation and positioning tool
- ✗ Digital case label designer
- ✗ Edit book to case visualization
- ✗ Route adjustment impact simulator
- ✗ Casing efficiency analyzer
- ✗ New carrier training simulator for case setup

#### Opportunity Space:

An interactive HTML tool that provides:

1. **Visualization:** Display edit book data as interactive case layout
2. **Calculation:** Determine physical cell positions from edit book entries
3. **Simulation:** Allow carriers to practice casing virtually
4. **Planning:** Preview route adjustments and case reconfigurations
5. **Training:** Help new carriers learn delivery sequence and case organization
6. **Efficiency:** Analyze casing patterns and suggest optimizations

**Potential Value:**
- Reduce new carrier learning curve
- Visualize edit book changes before implementation
- Plan case reconfigurations efficiently
- Document case setups for backup carriers
- Train without physical mail and cases
- Remote route familiarization

---

## 7. Sources

### Edit Books and Systems
- [Edit Book Training Manual - NALC Branch 38](https://www.branch38nalc.com/sitebuildercontent/sitebuilderfiles/EDIT_BOOK_TRAINING_MANUAL.pdf)
- [Rural Carrier Guide to Edit Book Maintenance](https://www.ruralinfo.net/shared-files/131278/Rural-Carrier-Edit-Book-Guide.pdf)
- [Instructions for Completing The New Edit Sheet - NALC Branch 38](https://branch38nalc.com/sitebuildercontent/sitebuilderfiles/5_PSFORM_6558E.pdf)
- [Address Management System for Rural Routes - USPS OIG](https://www.uspsoig.gov/sites/default/files/reports/2023-09/22-200-r23.pdf)

### Physical Equipment
- [Rural Mail Talk - Rural Case Requirements](https://www.ruralmailtalk.com/threads/rural-case-requirements-and-where-can-i-find-them.14737/)
- [Carrier Case Products - Postal Products](https://www.postalproducts.com/AdvCat/Carrier-Case-Products.htm)
- [Carrier Case Components - Postal Products](http://www.postalproducts.com/group/Carrier-Case-Components.htm)
- [USPS looks to reduce letter carriers' casing equipment - NALC](https://www.nalc.org/news/nalc-updates/usps-looks-to-reduce-letter-carriers-casing-equipment)

### Case Labels
- [Rural Mail Talk - Case Labels Discussion](https://www.ruralmailtalk.com/threads/case-labels.5594/)
- [Rural Mail Talk - New RCAs and Casing](https://www.ruralmailtalk.com/threads/new-rcas-and-casing-case-label-thoughts.10450/)
- [Carrier Case Label Holder Products - Postal Products](https://www.postalproducts.com/product/S1000000.htm)

### USPS Systems
- [What's DPS? - USPS Employee News](https://news.usps.com/2016/02/23/whats-dps/)
- [Address Management System - Wikipedia](https://en.wikipedia.org/wiki/Address_Management_System)
- [Address Matching System API - PostalPro](https://postalpro.usps.com/address-quality/ams-api)
- [Flats Sequencing System - Wikipedia](https://en.wikipedia.org/wiki/Flats_Sequencing_System)
- [Carrier Route Information System - AllBusiness](https://www.allbusiness.com/dictionary-carrier-route-information-system-cris-4965532-1.html)
- [Carrier Route Product - PostalPro](https://postalpro.usps.com/address-quality/carrier-route-product)

### Carrier Workflow
- [Exhibit 121.12 Time Allowances for Carrier Office Work - NALC Branch 40](https://nalcbranch40.com/wp-content/uploads/2015/04/Exhibit-121.pdf)
- [CCA Tips and Training - NALC Branch 40](https://nalcbranch40.com/wp-content/uploads/2016/11/CCA_Tips__Training_I.pdf)
- [Rural Mail Talk - Casing and Pull Down](https://www.ruralmailtalk.com/threads/casing-and-pull-down-all-mounted-route.4273/)
- [USPS consolidated casing: the good, the bad and the ugly - NALC](https://www.nalc.org/news/the-postal-record/2019/november-2019/document/DCD.pdf)

### Route Adjustments
- [Route adjustments - NALC](https://www.nalc.org/workplace-issues/city-delivery/route-adjustments)
- [2018 NALC Guide to Route Inspections](https://www.nalc.org/workplace-issues/city-delivery/body/2018-nalc-guide-to-route-inspections.pdf)
- [A Guide for Using COR - NALC](http://mseries.nalc.org/M01766.pdf)

### Technology and Tools
- [Route management - USPS Employee News](https://news.usps.com/2022/07/11/route-management/)
- [USPS Carrier Route Mapping - Upper Inc](https://www.upperinc.com/guides/carrier-route-mapping/)
- [USPS dynamic route optimization - Straightaway](https://www.getstraightaway.com/usps)
- [Standard Training for City Letter Carriers - NALC](http://www.nalcbranch489.com/uploads/9/9/5/3/99537364/standard_training_for_city_letter_carrier_facilitator_guide.pdf)

### International Systems
- [eTowerB2C Parcel Logistics Management - WallTech](https://www.etowertech.com/etowerb2c-parcel-logistics-management/)
- [Global Multi-Carrier Parcel Software - EPG ONE](https://epg.com/us/supply-chain-solutions/global-multi-carrier-parcel-software-iss/)
- [50+ Carrier Management Software Examples - Wise Systems](https://www.wisesystems.com/blog/carrier-management-software-examples/)

---

**End of Research Report**
