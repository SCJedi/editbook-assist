# Edit Book Assist — Deployment Guide

This document covers deployment options for Edit Book Assist, a static PWA (Progressive Web App) with offline support.

## Table of Contents

- [Requirements](#requirements)
- [Apache Deployment](#apache-deployment)
- [Nginx Deployment](#nginx-deployment)
- [Vercel Deployment](#vercel-deployment)
- [Netlify Deployment](#netlify-deployment)
- [Service Worker Cache Versioning](#service-worker-cache-versioning)
- [Testing Checklist](#testing-checklist)

---

## Requirements

- Static file hosting with HTTPS (required for service workers)
- Correct MIME types for JavaScript modules (`application/javascript`)
- Support for clean URLs (optional but recommended)

---

## Apache Deployment

### Basic Setup

1. Upload the `v1.3/` directory contents to your web root.
2. Create or modify `.htaccess` in the web root:

```apache
# Enable rewrite engine
RewriteEngine On

# Serve correct MIME type for JavaScript modules
AddType application/javascript .js

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive On

    # Cache service worker for short duration (needs fresh checks)
    <FilesMatch "sw\.js$">
        ExpiresDefault "access plus 0 seconds"
        Header set Cache-Control "no-cache, no-store, must-revalidate"
    </FilesMatch>

    # Cache other JS files
    <FilesMatch "\.js$">
        ExpiresDefault "access plus 1 week"
    </FilesMatch>

    # Cache CSS
    <FilesMatch "\.css$">
        ExpiresDefault "access plus 1 week"
    </FilesMatch>

    # Cache images
    <FilesMatch "\.(ico|png|jpg|jpeg|gif|svg|webp)$">
        ExpiresDefault "access plus 1 month"
    </FilesMatch>

    # Cache web fonts
    <FilesMatch "\.(woff|woff2|ttf|otf|eot)$">
        ExpiresDefault "access plus 1 year"
    </FilesMatch>
</IfModule>

# Enable gzip compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/css application/javascript application/json
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "SAMEORIGIN"
    Header set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>

# Prevent directory listing
Options -Indexes
```

### Virtual Host Configuration (Optional)

```apache
<VirtualHost *:443>
    ServerName editbook.example.com
    DocumentRoot /var/www/editbook-assist/v1.3

    <Directory /var/www/editbook-assist/v1.3>
        AllowOverride All
        Require all granted
    </Directory>

    # SSL configuration (use certbot or similar)
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/editbook.example.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/editbook.example.com/privkey.pem
</VirtualHost>
```

---

## Nginx Deployment

### Basic Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name editbook.example.com;
    root /var/www/editbook-assist/v1.3;
    index index.html;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/editbook.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/editbook.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # Gzip compression
    gzip on;
    gzip_types text/html text/css application/javascript application/json;
    gzip_min_length 1000;

    # Service worker - no cache
    location = /sw.js {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        expires 0;
    }

    # JavaScript and CSS - cache with revalidation
    location ~* \.(js|css)$ {
        expires 7d;
        add_header Cache-Control "public, max-age=604800, immutable";
    }

    # Images and fonts - long cache
    location ~* \.(ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|otf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # SPA fallback (optional - for clean URLs)
    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name editbook.example.com;
    return 301 https://$server_name$request_uri;
}
```

---

## Vercel Deployment

### Option 1: Git Integration

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Import the project in Vercel dashboard.
3. Set the **Root Directory** to `v1.3` (or deploy from project root if using symlinks).
4. Deploy.

### Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Navigate to v1.3 directory
cd v1.3

# Deploy
vercel

# For production deployment
vercel --prod
```

### vercel.json Configuration

Create `vercel.json` in your project root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "v1.3/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/sw.js",
      "headers": {
        "Cache-Control": "no-cache, no-store, must-revalidate"
      },
      "dest": "/v1.3/sw.js"
    },
    {
      "src": "/(.*)",
      "dest": "/v1.3/$1"
    }
  ]
}
```

---

## Netlify Deployment

### Option 1: Git Integration

1. Push your repository to GitHub, GitLab, or Bitbucket.
2. Import the project in Netlify dashboard.
3. Set **Publish directory** to `v1.3`.
4. Deploy.

### Option 2: Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Navigate to v1.3 directory
cd v1.3

# Deploy preview
netlify deploy

# Deploy to production
netlify deploy --prod
```

### netlify.toml Configuration

Create `netlify.toml` in your project root:

```toml
[build]
  publish = "v1.3"

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache, no-store, must-revalidate"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=604800"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=604800"

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "SAMEORIGIN"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

---

## Service Worker Cache Versioning

The service worker (`sw.js`) uses a cache version string to manage updates.

### How It Works

1. The service worker caches all app assets under a versioned cache name.
2. When you deploy updates, increment the cache version.
3. The browser detects the changed `sw.js` file and activates the new worker.
4. The new worker deletes old caches and caches fresh assets.

### Updating the Cache Version

In `v1.3/sw.js`, find and update the `CACHE_NAME` constant:

```javascript
// Before update
const CACHE_NAME = 'editbook-assist-v1';

// After update (increment version)
const CACHE_NAME = 'editbook-assist-v2';
```

### Best Practices

1. **Always increment the version** when deploying changes to cached files.
2. **Use semantic versioning** for major releases: `editbook-assist-v1`, `editbook-assist-v2`, etc.
3. **Test cache invalidation** by checking the browser DevTools > Application > Cache Storage.
4. **Notify users** of updates (the app already shows a toast when updates are detected).

### Force Update for Users

If users have stale caches:

1. They can manually clear site data: DevTools > Application > Clear Storage.
2. They can hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac).
3. They will automatically get updates within 24 hours (browser service worker update check).

---

## Testing Checklist

Before deploying to production, verify:

### Functionality

- [ ] Equipment selection works (all 4 slots)
- [ ] Case view renders correctly with addresses
- [ ] Shelf zoom navigation works
- [ ] Cell click popup appears (both overview and zoom)
- [ ] EDIT button opens full detail overlay
- [ ] Alert snooze/acknowledge buttons work
- [ ] Drag-to-resize works (mouse and touch)
- [ ] Street colors apply correctly
- [ ] Save/load data works (localStorage)
- [ ] Import/export JSON file works

### PWA Features

- [ ] Service worker registers successfully
- [ ] App works offline after first load
- [ ] "Add to Home Screen" prompt appears (mobile)
- [ ] App icon displays correctly when installed
- [ ] Update toast appears when new version is deployed

### Touch/Mobile

- [ ] Touch navigation (swipe left/right) works
- [ ] Drag handles are large enough on touch devices
- [ ] Bottom tab bar is accessible
- [ ] No horizontal scroll on mobile
- [ ] Forms are usable with virtual keyboard

### Cross-Browser

- [ ] Chrome (desktop and mobile)
- [ ] Firefox (desktop and mobile)
- [ ] Safari (desktop and iOS)
- [ ] Edge

### Performance

- [ ] First load under 3 seconds on 3G
- [ ] Subsequent loads instant (from cache)
- [ ] No layout shifts during load
- [ ] Smooth scrolling in edit book table

### Security

- [ ] HTTPS is enforced
- [ ] No mixed content warnings
- [ ] Security headers are set
- [ ] No console errors about blocked requests

---

## Troubleshooting

### Service Worker Not Updating

1. Check that `sw.js` has `Cache-Control: no-cache` header.
2. Verify `CACHE_NAME` was incremented.
3. Clear browser cache and reload.
4. Check DevTools > Application > Service Workers for status.

### JavaScript Module Errors

Ensure your server sends `.js` files with `Content-Type: application/javascript` (not `text/plain`).

### CORS Errors

If loading from a different domain, add appropriate CORS headers:
```
Access-Control-Allow-Origin: *
```

### Touch Drag Not Working

1. Check that `touch-action: none` is set on `.drag-handle`.
2. Verify touchstart listener is attached with `{ passive: false }`.
3. Test in DevTools mobile emulation mode.

---

## Support

For issues or questions, create a GitHub issue in the repository.
