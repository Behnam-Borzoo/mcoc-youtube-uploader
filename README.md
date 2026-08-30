# MCOC YouTube Uploader

آپلود خودکار VOD های تویچ به یوتیوب با زمان‌بندی، از طریق Google Drive به‌عنوان واسط.

## معماری

```
آپلود دستی فایل به پوشه مشخص در Google Drive
        ↓
اسکریپت روی VPS (با cron) پوشه رو چک می‌کنه
        ↓
فایل به‌صورت stream (بدون ذخیره کامل روی دیسک) به YouTube API پاس داده می‌شه
        ↓
آپلود با privacyStatus=private و publishAt (زمان‌بندی‌شده)
        ↓
بعد از آپلود موفق، فایل از Drive حذف/جابجا می‌شه
        ↓
یوتیوب سر وقت خودکار ویدیو رو Public می‌کنه
```

## راه‌اندازی اولیه

### ۱. Google Cloud Setup
- پروژه بساز در [console.cloud.google.com](https://console.cloud.google.com)
- فعال کن: **YouTube Data API v3** و **Google Drive API**
- OAuth Consent Screen رو تنظیم کن (External, خودت رو به‌عنوان Test User اضافه کن)
- یه OAuth Client ID از نوع **Desktop app** بساز و JSON رو دانلود کن

### ۲. گرفتن Refresh Token
```bash
npm install
cp .env.example .env
# GOOGLE_CLIENT_ID و GOOGLE_CLIENT_SECRET رو توی .env پر کن
npm run get-token
```
لینکی که چاپ می‌شه رو باز کن، لاگین کن، و `GOOGLE_REFRESH_TOKEN` رو توی `.env` بذار.

> این مرحله باید روی سیستمی با مرورگر انجام بشه (نه لزوماً VPS).

### ۳. تنظیم پوشه‌های Drive
- یه پوشه بساز برای فایل‌های در انتظار آپلود، ID اش رو بذار توی `DRIVE_WATCH_FOLDER_ID`
- (اختیاری) یه پوشه دیگه برای آرشیو فایل‌های آپلودشده، ID اش رو بذار توی `DRIVE_UPLOADED_FOLDER_ID`

ID پوشه از URL گرفته می‌شه:
`drive.google.com/drive/folders/`**`این-بخش`**

### ۴. تنظیم زمان‌بندی
توی `.env`:
- `CHECK_CRON`: هر چند وقت یک‌بار Drive چک بشه (پیش‌فرض: هر ساعت)
- `PUBLISH_HOUR` / `PUBLISH_MINUTE`: ساعت پابلیک‌شدن ویدیو
- `DAYS_BETWEEN_UPLOADS`: فاصله روزها بین هر ویدیو

### ۵. دیپلوی روی VPS
```bash
git clone https://github.com/Behnam-Borzoo/mcoc-youtube-uploader/blob/main/deploy.sh
cd mcoc-youtube-uploader
npm install --production
cp .env.example .env  # و پرش کن
pm2 start ecosystem.config.js
pm2 save
```

برای آپدیت‌های بعدی:
```bash
./deploy.sh
```

## استفاده روزمره

فقط کافیه VOD رو (به‌صورت mp4) توی پوشه Drive مشخص‌شده آپلود کنی. بقیه کار خودکاره.

نام‌گذاری فایل پیشنهادی: `YYYY-MM-DD_MCOC_Battlegrounds.mp4`
(این اسم مستقیم به‌عنوان عنوان ویدیوی یوتیوب استفاده می‌شه)

## نکات مهم

- **Quota روزانه YouTube API**: پیش‌فرض ۱۰,۰۰۰ واحد، هر آپلود ~۱۶۰۰ واحد مصرف می‌کنه (~۶ آپلود در روز)
- فایل باید **mimeType** ویدیویی داشته باشه تا در پوشه Drive شناسایی بشه
- اسکریپت در هر اجرای cron فقط **یک فایل** رو پردازش می‌کنه، تا کنترل‌شده باشه
