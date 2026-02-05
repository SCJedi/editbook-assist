# Deployment Guide for Edit Book Assist v1.1

## Quick Start

### Option 1: GitHub Pages (Free, HTTPS included)
1. Create a new GitHub repository
2. Upload all files from `v1.1/` directory
3. Go to Settings → Pages
4. Select "Deploy from branch" → main/master → root
5. Wait 1-2 minutes for deployment
6. Access at `https://yourusername.github.io/repo-name/`

### Option 2: Netlify (Free, HTTPS included)
1. Sign up at netlify.com
2. Drag and drop the `v1.1/` folder into Netlify
3. Site will deploy in ~30 seconds
4. Access at `https://random-name.netlify.app` (customizable)

### Option 3: Self-Hosted (nginx)
See detailed nginx configuration in README.md

## PWA Installation

Once deployed over HTTPS:
- **Desktop**: Click the install icon in browser address bar
- **iOS Safari**: Tap Share → Add to Home Screen
- **Android Chrome**: Tap menu → Install App

## File Checklist

Before deployment, verify these files exist:
- `index.html` ✓
- `app.css` ✓
- `app.js` ✓
- `manifest.json` ✓
- `sw.js` ✓
- `icons/icon-192.svg` ✓
- `icons/icon-512.svg` ✓
- `README.md` ✓
- `.gitignore` ✓

## Post-Deployment Testing

1. Open app in browser
2. Open DevTools → Application → Service Workers
   - Verify service worker is registered
3. Go offline (DevTools → Network → Offline)
   - Reload page — should still work
4. Check for install prompt (desktop/Android)
5. Test save/load functionality
6. Test equipment configuration
7. Test edit book import

## Troubleshooting

**PWA won't install:**
- Verify site is served over HTTPS
- Check manifest.json is accessible at `/manifest.json`
- Check icons are accessible at `/icons/icon-192.svg` and `/icons/icon-512.svg`
- Open DevTools → Application → Manifest to see any errors

**Service worker won't register:**
- Verify `sw.js` is at root level (not in subdirectory)
- Check for JavaScript errors in console
- Clear browser cache and try again

**App doesn't work offline:**
- Wait 1-2 minutes after first load for service worker to cache files
- Check DevTools → Application → Cache Storage to see cached files
- Verify all resources are same-origin (no external CDN dependencies)

## Icon Replacement (Optional)

The current icons are SVG placeholders. For better compatibility:

1. Create 192×192 and 512×512 PNG icons
2. Replace `icons/icon-192.svg` and `icons/icon-512.svg`
3. Update `manifest.json` to change `.svg` to `.png` in icon paths
4. Redeploy

Tools for icon generation:
- [RealFaviconGenerator](https://realfavicongenerator.net/)
- [PWA Asset Generator](https://github.com/onderceylan/pwa-asset-generator)
