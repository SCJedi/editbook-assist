# Edit Book Assist v1.1

USPS mail carrier case management tool — a Progressive Web App for organizing edit book data, equipment configuration, and route planning.

## Features
- Equipment configuration (4 positional slots: Left Wing, Center, Right Wing, Extension)
- Case view with shelf-level detail and zoom
- Edit book with address table, bulk import, and cell filling algorithm
- Street color coding with visual bands on case view
- Address annotations (tags, highlights, alerts)
- Save/load route data as JSON files
- Auto-backup to localStorage (max 5 snapshots)
- Works fully offline after first load (PWA)
- Installable on mobile and desktop

## Deployment (Self-Hosted)

### Prerequisites
- Web server (nginx or Apache)
- HTTPS certificate (required for PWA — use Let's Encrypt)

### Upload Files
```
rsync -avz v1.1/ user@server:/var/www/editbook-assist/
```

### nginx Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name editbook.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/editbook.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/editbook.yourdomain.com/privkey.pem;

    root /var/www/editbook-assist;
    index index.html;

    # Static assets: long cache
    location ~* \.(css|js|png|jpg|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Service worker: never cache
    location = /sw.js {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
    }

    # HTML: no cache
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
}
```

### Enable HTTPS
```
sudo certbot --nginx -d editbook.yourdomain.com
```

## Local Development
Simply open `index.html` in a web browser. For full PWA features (service worker, install prompt), serve over HTTPS using a local server:

```
# Python 3
python -m http.server 8000

# Or use any static file server
```

Then visit `http://localhost:8000`

## Browser Support
- Chrome / Edge 90+
- Safari 15+ (iOS and macOS)
- Firefox 90+

## Data Storage
All data stored in browser localStorage. Use **SAVE FILE** to export and **OPEN FILE** to import route data as JSON.

## Icons
The included icons are simple SVG placeholders. For production deployment, replace `icons/icon-192.svg` and `icons/icon-512.svg` with PNG versions (192×192 and 512×512) for better PWA compatibility across all devices.
