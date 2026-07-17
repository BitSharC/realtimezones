#!/bin/bash
set -e

echo "=== Step 1: Installing dependencies (wrangler, etc.) ==="
npm install

echo "=== Step 2: Building the Astro website ==="
npm run build

echo "=== Step 3: Authenticating with Cloudflare ==="
echo "If you are already logged in, this will verify your session. Otherwise, it will open a browser window to log in."
npx wrangler login

echo "=== Step 4: Deploying to Cloudflare Pages ==="
npx wrangler pages deploy dist --project-name real-time-zones

echo "=== Done! ==="
