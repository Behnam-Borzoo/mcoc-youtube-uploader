#!/bin/bash
# deploy.sh
# اجرا کن روی VPS برای آپدیت و ری‌استارت سرویس

set -e

echo "در حال دریافت آخرین تغییرات از GitHub..."
git pull origin main

echo "نصب dependencies..."
npm install --production

echo "ری‌استارت سرویس با PM2..."
pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js

echo "انجام شد. وضعیت سرویس:"
pm2 status moco-youtube-uploader
