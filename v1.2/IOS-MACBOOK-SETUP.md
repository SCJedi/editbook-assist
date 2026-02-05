# MacBook Air Setup Guide — iOS App Development

This guide prepares your MacBook Air with everything needed to build the Edit Book Assist iOS app. Follow each section in order. Most steps require an internet connection.

---

## 1. macOS Updates

Make sure your Mac is running macOS 14 (Sonoma) or later. Xcode requires a recent macOS.

1. Open **System Settings** > **General** > **Software Update**
2. Install any available updates
3. Restart if prompted

---

## 2. Install Xcode

Xcode is Apple's IDE — required for building any iOS app. It's large (~12 GB download, ~35 GB installed).

### Option A: App Store (Recommended)
1. Open the **App Store**
2. Search for "Xcode"
3. Click **Get** / **Install**
4. Wait for download and installation (can take 30-60 min on slower connections)
5. Open Xcode once after install — it will prompt to install additional components. Click **Install**.

### Option B: Apple Developer Site
1. Go to https://developer.apple.com/download/applications/
2. Sign in with your Apple ID
3. Download the latest Xcode release
4. Drag to Applications, open, install components

### Verify Xcode
Open Terminal and run:
```bash
xcode-select --version
# Should output: xcode-select version 2xxx or similar

xcodebuild -version
# Should output: Xcode 15.x or 16.x
```

### Install Xcode Command Line Tools
If the above commands fail:
```bash
xcode-select --install
```
Click "Install" in the dialog that appears.

---

## 3. Install Homebrew

Homebrew is the macOS package manager — makes installing everything else easy.

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Follow the on-screen instructions. It may ask for your password. After install, it will tell you to add Homebrew to your PATH. Run the commands it shows (usually something like):

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

Verify:
```bash
brew --version
# Should output: Homebrew 4.x.x
```

---

## 4. Install Node.js

Capacitor and its tooling require Node.js (LTS version).

```bash
brew install node
```

Verify:
```bash
node --version
# Should output: v20.x.x or v22.x.x (LTS)

npm --version
# Should output: 10.x.x
```

---

## 5. Install CocoaPods

CocoaPods manages iOS native dependencies. Capacitor uses it.

```bash
brew install cocoapods
```

Verify:
```bash
pod --version
# Should output: 1.x.x
```

---

## 6. Install Claude Code

Claude Code is the CLI tool that will do the actual iOS app build work in a future session.

```bash
npm install -g @anthropic-ai/claude-code
```

Verify:
```bash
claude --version
```

You'll need an Anthropic API key or to log in. Set it up:
```bash
claude
# Follow the login prompts
```

---

## 7. Apple Developer Account (When Ready)

To publish to the App Store, you need an Apple Developer Program membership ($99/year).

### For personal testing only (free):
- You can build and run on your own devices with just a free Apple ID
- Open Xcode > Settings > Accounts > Add your Apple ID
- This lets you test on your own iPhone via USB

### For App Store distribution ($99/year):
1. Go to https://developer.apple.com/programs/
2. Click "Enroll"
3. Sign in with your Apple ID
4. Follow enrollment steps (may take 24-48 hours for approval)
5. After enrollment, open Xcode > Settings > Accounts > Add your Apple ID
6. Your account will show as "Apple Developer Program" member

**Recommendation:** Start with the free tier to test on your phone first. Only pay $99 when you're ready to submit to the App Store.

---

## 8. Get the Project Files

Transfer the Edit Book Assist v1.1 files to your MacBook. Options:

### Option A: Git (if repo exists)
```bash
git clone <your-repo-url>
cd editbook-assist/v1.1
```

### Option B: Direct file transfer
- AirDrop the v1.1 folder from your PC
- Or USB drive
- Or cloud storage (iCloud, Google Drive, etc.)

Place the files somewhere convenient, e.g.:
```bash
mkdir -p ~/Projects
# Copy v1.1 folder into ~/Projects/editbook-assist/
```

---

## 9. Verify Everything

Run this checklist:

```bash
echo "=== Xcode ===" && xcodebuild -version
echo "=== Node ===" && node --version
echo "=== npm ===" && npm --version
echo "=== CocoaPods ===" && pod --version
echo "=== Claude Code ===" && claude --version
echo "=== Homebrew ===" && brew --version
```

All 6 should output version numbers without errors. If any fail, revisit that section.

---

## 10. Connect Your iPhone (Optional — For Testing)

1. Plug your iPhone into your MacBook via USB/USB-C cable
2. On your iPhone: tap "Trust This Computer" when prompted
3. Open Xcode > Window > Devices and Simulators
4. Your iPhone should appear in the list
5. If it says "device is not available for development":
   - On iPhone: Settings > Privacy & Security > Developer Mode > Enable
   - Restart iPhone

---

## What Happens Next

Once all the above is set up, start a Claude Code session in the project directory:

```bash
cd ~/Projects/editbook-assist
claude
```

Then tell Claude to read the `IOS-BUILD-GUIDE.md` file and follow it to create the iOS app. Claude will:
1. Initialize Capacitor in the v1.1 directory
2. Configure the iOS project
3. Add native enhancements (haptics, native file sharing, etc.)
4. Build the app
5. Guide you through testing on your iPhone
6. Prepare the App Store submission when you're ready

---

## Troubleshooting

### "xcode-select: error: command line tools are already installed"
This is fine — it means they're already installed.

### Xcode takes forever to download
Normal. It's a 12+ GB download. Use a stable connection.

### "pod: command not found" after installing CocoaPods
Close and reopen Terminal, or run:
```bash
source ~/.zprofile
```

### Node version too old
```bash
brew upgrade node
```

### MacBook Air storage concerns
You need at least 50 GB free for Xcode + iOS simulators + project files.
Check: Apple menu > About This Mac > Storage
