# Deployment Checklist

## Pre-Deployment
- [ ] Test app locally (open index.html in browser)
- [ ] Verify all features work:
  - [ ] Equipment configuration
  - [ ] Case view rendering
  - [ ] Edit book import
  - [ ] Street color coding
  - [ ] Save/load files
  - [ ] Address annotations
- [ ] Check browser console for errors
- [ ] Review manifest.json - update name/description if needed

## Choose Deployment Method

### GitHub Pages (Recommended for personal use)
- [ ] Create GitHub repository
- [ ] Upload all v1.1 files
- [ ] Enable GitHub Pages in Settings
- [ ] Wait for deployment (1-2 min)
- [ ] Test at `https://username.github.io/repo-name/`

### Netlify (Recommended for quick deployment)
- [ ] Sign up at netlify.com
- [ ] Drag-drop v1.1 folder
- [ ] Wait for deployment (~30 sec)
- [ ] Test at provided URL

### Self-Hosted
- [ ] Set up nginx/Apache with HTTPS
- [ ] Upload files via rsync/FTP
- [ ] Configure server (see README.md)
- [ ] Test at your domain

## Post-Deployment Verification
- [ ] Open app in browser
- [ ] Verify HTTPS is active (required for PWA)
- [ ] Open DevTools → Application → Service Workers
  - [ ] Service worker registered and activated
- [ ] Test offline mode:
  - [ ] DevTools → Network → Offline
  - [ ] Reload page - should still work
- [ ] Test PWA install:
  - [ ] Desktop: Install button in address bar appears
  - [ ] Mobile: "Add to Home Screen" works
- [ ] Test core functionality:
  - [ ] Create equipment configuration
  - [ ] Add addresses to edit book
  - [ ] Save file
  - [ ] Reload page
  - [ ] Load saved file
  - [ ] Verify data integrity

## Sharing
- [ ] Share URL with users
- [ ] Provide instructions for PWA installation (README.md)
- [ ] Note: Users' data stays on their device (localStorage)

## Maintenance
- [ ] Monitor browser console for errors
- [ ] Update version number in manifest.json when changes made
- [ ] Clear service worker cache after updates:
  - DevTools → Application → Service Workers → Unregister
  - Or bump version in sw.js CACHE_NAME

## Optional Enhancements
- [ ] Replace SVG icons with PNG (see DEPLOYMENT.md)
- [ ] Add custom domain
- [ ] Set up analytics (if needed)
- [ ] Add favicon.ico for older browsers
