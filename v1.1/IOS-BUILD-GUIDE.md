# iOS Build Guide — For Claude Code

This guide is for a Claude Code session to follow when building the Edit Book Assist iOS app from the existing v1.1 web app. The human has already set up their MacBook with Xcode, Node.js, CocoaPods, and Claude Code per IOS-MACBOOK-SETUP.md.

---

## Prerequisites Check

Before starting, verify the environment:

```bash
xcodebuild -version    # Xcode 15+ required
node --version          # Node 20+ required
npm --version           # npm 10+ required
pod --version           # CocoaPods 1.x required
```

If any fail, stop and ask the user to complete the MacBook setup guide first.

---

## Overview

**Architecture:** Capacitor wraps the existing web app in a native WKWebView. The web files (HTML/CSS/JS) are bundled into the iOS app as local assets. localStorage works inside WKWebView. No server required.

**Why Capacitor over Cordova:** Capacitor is the modern successor. It generates a standard Xcode project you can open and modify directly. Better maintained, better iOS support.

**App Store Review Consideration:** Apple rejects apps that are "just a website in a wrapper" (guideline 4.2). To pass review, add native enhancements:
- Native haptic feedback on button taps
- Native share sheet for exporting JSON files (instead of blob download)
- Proper iOS status bar / safe area handling
- App icon and launch screen
- Native local notifications for alerts (existing feature in the web app)

---

## Step 1: Initialize the Capacitor Project

The v1.1 web files need to be in a directory that Capacitor considers the "web dir." Since there is no build step, the web files ARE the build output.

```bash
cd /path/to/editbook-assist/v1.1

# Initialize npm project (if not already)
npm init -y

# Install Capacitor core and CLI
npm install @capacitor/core @capacitor/cli

# Initialize Capacitor
npx cap init "Edit Book Assist" "com.editbookassist.app" --web-dir .
```

This creates capacitor.config.ts (or .json). Edit it to ensure proper configuration with webDir set to current directory and iOS-specific settings for black background and proper content mode.

**Important:** webDir set to "." tells Capacitor to use the current directory as the web assets (no build step needed).

---

## Step 2: Add iOS Platform

```bash
npm install @capacitor/ios
npx cap add ios
```

This creates an ios/ directory with a full Xcode project.

---

## Step 3: Install Native Plugins

These plugins add native functionality to pass App Store review:

```bash
# Haptic feedback
npm install @capacitor/haptics

# Native share sheet (for exporting JSON files)
npm install @capacitor/share

# Native file system (more robust than localStorage alone)
npm install @capacitor/filesystem

# Status bar control
npm install @capacitor/status-bar

# Splash screen
npm install @capacitor/splash-screen

# App info (version, build number)
npm install @capacitor/app
```

After installing plugins:
```bash
npx cap sync ios
```


---

## Step 4: Configure iOS Project

### 4a. Open in Xcode
```bash
npx cap open ios
```

### 4b. Set Bundle Identifier
In Xcode:
- Select the project in the navigator (top item)
- Select the "App" target
- Under "General" tab:
  - Bundle Identifier: com.editbookassist.app
  - Display Name: Edit Book Assist
  - Version: 1.1.0
  - Build: 1
- Under "Signing & Capabilities":
  - Check "Automatically manage signing"
  - Select the user Apple ID team

### 4c. Set Deployment Target
- Minimum deployment target: iOS 16.0
- This covers 95%+ of active iPhones

### 4d. App Icons
The Xcode project needs app icons. Create an asset catalog:

1. In Xcode, open App/Assets.xcassets/AppIcon
2. You need a 1024x1024 PNG icon (App Store)
3. Xcode 15+ auto-generates all sizes from the 1024px icon

**To generate the icon programmatically:** Create a simple HTML page that draws the amber shelf icon on a 1024x1024 canvas and lets the user right-click > save. Or use the existing SVG icons and convert with ImageMagick if available.

### 4e. Launch Screen
Configure the launch screen in Xcode:
1. Open ios/App/App/LaunchScreen.storyboard
2. Set background color to black
3. Add a centered label: "EDIT BOOK ASSIST" in amber, Courier New font


---

## Step 5: Add Native Enhancements to Web Code

These changes go in the v1.1 web files to use native capabilities when running in Capacitor, while still working as a regular web app in browsers.

### 5a. Detect Capacitor Environment

Create native.js with the following structure:

- Check if window.Capacitor exists to detect native environment
- Export async function hapticTap() that uses Capacitor Haptics plugin for light impact
- Export async function nativeShare(filename, jsonString) that writes file to cache directory and opens native share sheet
- Export async function configureStatusBar() that sets dark style and black background
- All functions should gracefully handle errors and return false/undefined if not available

### 5b. Integrate with datafile.js

Modify the saveDataFile() function:

- Import nativeShare from native.js
- After creating JSON string, try await nativeShare(filename, jsonString)
- If it returns true, skip the blob download
- If it returns false, fall back to existing blob download code for web browsers

### 5c. Add Haptic Feedback

Import hapticTap from native.js and add calls to it in UI event handlers:

- Nav item clicks
- Equipment picker selection
- Save file button
- Load file button
- Apply to case button
- New route confirmation

### 5d. Safe Area Handling

Add to style.css:

```css
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

@media (max-width: 767px) {
  .sidebar-nav {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

Also add to index.html head:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
```


---

## Step 6: Sync and Build

After all code changes:

```bash
npx cap sync ios
npx cap open ios
```

### Build for Simulator
1. In Xcode, select an iPhone simulator from the toolbar
2. Press Cmd+R (or click the Play button)
3. App should launch in the simulator

### Build for Physical Device
1. Connect iPhone via USB
2. Select your iPhone from the device list
3. First time: Xcode may need to download device support files
4. Press Cmd+R
5. On first run, iPhone may say "Untrusted Developer":
   - iPhone Settings > General > VPN & Device Management
   - Trust your developer certificate
6. Run again

---

## Step 7: Test Checklist

Run through these on the actual device:

- [ ] App launches with black background, amber UI
- [ ] Status bar is dark (white text on black)
- [ ] Safe areas handled (no content under notch/home indicator)
- [ ] Equipment screen: can select/change equipment
- [ ] Case View: shows populated case, swipe navigation works
- [ ] Edit Book: can add rows, edit cells, bulk import
- [ ] Streets: color picker works
- [ ] Save File: native share sheet appears with JSON file
- [ ] Open File: file picker opens, can select JSON
- [ ] New Route: confirmation dialog, clears data, reloads
- [ ] Offline: disable WiFi, app still works fully
- [ ] Annotations: tags, highlights, alerts all work
- [ ] Rotate device: layout adjusts
- [ ] Bottom tab bar: visible, no overlap with home indicator
- [ ] Haptic feedback: light tap on button presses


---

## Step 8: App Store Submission (When Ready)

### Prerequisites
- Apple Developer Program membership ($99/year)
- App icon: 1024x1024 PNG
- Screenshots: iPhone 6.7" and 6.5" minimum
- Privacy policy URL

### Create App Store Listing
1. Go to https://appstoreconnect.apple.com
2. My Apps > + > New App
3. Fill in:
   - Platform: iOS
   - Name: Edit Book Assist
   - Primary Language: English
   - Bundle ID: com.editbookassist.app
   - SKU: editbookassist

### Description Template
```
Edit Book Assist helps USPS mail carriers organize their delivery route case.

Features:
- Configure equipment slots (124-D, 143-D, 144-D cases)
- Visual case view with shelf-level detail and zoom
- Address edit book with bulk import
- Automatic cell filling algorithm
- Street color coding
- Address annotations (tags, highlights, alerts)
- Save and load route data as portable files
- Works fully offline

All data is stored locally on your device. No account required. No data leaves your phone.
```

### Privacy
- This app collects NO user data
- All data is stored locally in the app sandbox
- No analytics, no tracking, no network requests
- Privacy policy: "Edit Book Assist stores all data locally on your device. No data is collected, transmitted, or shared with any third party."

### Build for Distribution
1. In Xcode: Product > Archive
2. When archive completes, click "Distribute App"
3. Select "App Store Connect"
4. Follow prompts to upload
5. In App Store Connect, select the build and submit for review

### Review Notes for Apple
```
This is a specialized productivity tool for USPS mail carriers to organize their delivery route case equipment and addresses. The app provides native iOS features including haptic feedback, native file sharing via the share sheet, safe area handling, and offline functionality. All data is stored locally with no server component.
```


---

## Troubleshooting

### "No signing certificate found"
- Xcode > Settings > Accounts > Select your Apple ID > Manage Certificates > + > Apple Development

### "Could not find module @capacitor/core"
```bash
npx cap sync ios
```

### Build fails with CocoaPods error
```bash
cd ios/App
pod install --repo-update
cd ../..
```

### White flash on app launch
Set the launch screen background to black in LaunchScreen.storyboard

### localStorage not persisting after app restart
Capacitors WKWebView should persist localStorage. If it does not, add to capacitor.config.json:
```json
{
  "ios": {
    "allowsLinkPreview": false
  }
}
```

### App rejected by Apple for guideline 4.2
Ensure native enhancements are visible:
- Haptic feedback must be noticeable
- Share sheet must work for file export
- Mention specific native features in review notes
- Consider adding: native file import, dark mode integration, Siri shortcuts

---

## File Changes Summary

### New files to create:
- native.js — Capacitor native bridge (haptics, share, status bar)
- capacitor.config.json — Capacitor configuration
- package.json — npm dependencies
- ios/ directory — Generated Xcode project (auto-created by Capacitor)

### Files to modify:
- index.html — viewport-fit=cover meta tag
- style.css — safe area padding (env values)
- app.js — import native.js, configure status bar on init
- datafile.js — native share for save, haptic on save/load/new route

### Files unchanged:
- nav.js, editbook.js, models.js, streets.js, annotations.js, addressDetail.js
- manifest.json, sw.js, offline.html (still used for web version)
