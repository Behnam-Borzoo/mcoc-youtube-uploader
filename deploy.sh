#!/bin/bash
# deploy.sh
# Run this on the VPS to pull the latest changes and restart the service.

set -e

echo "Pulling latest changes from GitHub..."
git pull origin main

echo "Installing dependencies..."
npm install --production

echo "Restarting service with PM2..."
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js

echo "Done. Service status:"
pm2 status mcoc-youtube-uploader
