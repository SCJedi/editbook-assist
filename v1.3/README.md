# Edit Book Assist v1.3

USPS mail carrier case management tool — a Progressive Web App for organizing edit book data, equipment configuration, and route planning.

## Features

- Equipment configuration (4 positional slots: Left Wing, Center, Right Wing, Extension)
- Case view with shelf-level detail and zoom
- Edit book with address table, bulk import, and cell filling algorithm
- Street color coding with visual bands on case view
- Address annotations (tags, highlights, alerts with snooze/acknowledge)
- Save/load route data as JSON files
- CSV file upload for bulk address import
- Auto-backup to localStorage (max 5 snapshots)
- Works fully offline after first load (PWA)
- Installable on mobile and desktop
- Touch-optimized drag-to-resize cells

## Files

```
v1.3/
├── index.html          # Main HTML
├── style.css           # All styles
├── app.js              # App initialization
├── nav.js              # Navigation, click handlers, drag handlers
├── cellPopup.js        # Quick card modal (cell click)
├── addressDetail.js    # Full detail overlay
├── editbook.js         # Edit book table and bulk import
├── annotations.js      # Tags, highlights, alerts
├── streets.js          # Street color management
├── settings.js         # Theme and color presets
├── models.js           # Data models
├── datafile.js         # Save/load JSON files
├── sw.js               # Service worker (offline support)
├── manifest.json       # PWA manifest
├── offline.html        # Offline fallback page
└── icons/              # App icons
```

## Deployment

See `DEPLOYMENT.md` in the project root for detailed instructions covering:
- Apache with .htaccess
- Nginx configuration
- Vercel deployment
- Netlify deployment
- Service worker cache versioning
- Testing checklist

## Quick Start (Local Development)

Open `index.html` directly in a browser, or serve over HTTP for full PWA features:

```bash
# Python 3
python -m http.server 8000

# Then visit http://localhost:8000/v1.3/
```

## Browser Support

- Chrome / Edge 90+
- Safari 15+ (iOS and macOS)
- Firefox 90+

## Data Storage

All data stored in browser localStorage. Use **SAVE FILE** to export and **OPEN FILE** to import route data as JSON.
