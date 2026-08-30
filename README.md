# MCOC YouTube Uploader

Automated pipeline that uploads Twitch VODs to YouTube on a schedule, using Google Drive as an intermediary.

## Architecture

```
You drop a video file into the "import" folder on Google Drive
        ↓
The VPS script (on a cron schedule) checks that folder for new files
        ↓
The file is streamed (never fully written to disk) straight into the YouTube API
        ↓
Uploaded with privacyStatus=private and a scheduled publishAt time
        ↓
On success, the file is moved to the "uploaded" folder
        ↓
YouTube automatically makes the video public at the scheduled time
        ↓
After 3 days in the "uploaded" folder, a cleanup job deletes the file
```

## Initial Setup

### 1. Google Cloud Setup
- Create a project at [console.cloud.google.com](https://console.cloud.google.com)
- Enable: **YouTube Data API v3** and **Google Drive API**
- Configure the OAuth Consent Screen (External type, add yourself as a Test User)
- Create an OAuth Client ID of type **Desktop app** and download the JSON

### 2. Get a Refresh Token
```bash
npm install
cp .env.example .env
# fill in GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
npm run get-token
```
Open the printed link, log in, and copy `GOOGLE_REFRESH_TOKEN` into `.env`.

> This step needs a browser, so it doesn't have to run on the VPS.

### 3. Set Up Drive Folders
- Create an **import** folder for new VODs → put its ID in `DRIVE_IMPORT_FOLDER_ID`
- Create an **uploaded** folder for archived files → put its ID in `DRIVE_UPLOADED_FOLDER_ID`

Folder ID comes from the URL:
`drive.google.com/drive/folders/`**`THIS-PART`**

### 4. Configure Scheduling
In `.env`:
- `CHECK_CRON`: how often to check the import folder (default: twice a day, 09:00 and 21:00)
- `CLEANUP_CRON`: how often to run the cleanup job (default: daily at 03:00)
- `CLEANUP_AFTER_DAYS`: how many days a file stays in "uploaded" before deletion (default: 3)
- `PUBLISH_HOUR` / `PUBLISH_MINUTE`: time of day videos go public (default: 19:00)
- `PUBLISH_START_DATE`: date (YYYY-MM-DD) the very first video should go public — only affects the first video ever scheduled; every one after that follows automatically at `DAYS_BETWEEN_UPLOADS` intervals. Leave empty to start as soon as possible instead.
- `DAYS_BETWEEN_UPLOADS`: days between each scheduled video (default: 1, i.e. one video per day)

### 5. Deploy to VPS
```bash
git clone https://github.com/Behnam-Borzoo/mcoc-youtube-uploader.git
cd mcoc-youtube-uploader
npm install --production
cp .env.example .env  # and fill it in
pm2 start ecosystem.config.js
pm2 save
```

For later updates:
```bash
./deploy.sh
```

## Daily Usage

Just drop the VOD (as mp4) into the import folder on Drive. Everything else runs automatically:
1. Uploaded to YouTube (private + scheduled)
2. Moved to the "uploaded" folder
3. Deleted from "uploaded" after `CLEANUP_AFTER_DAYS` days

Suggested filename convention: `DD.MM.YYYY |Title Here` (e.g. `04.08.2026 |Marvel Contest of Champions Community - Live Gameplay - AQ, AW, Battlegrounds, Events & Arena.mp4`)
(this is used directly as the YouTube video title — it's automatically truncated to YouTube's 100-character limit if too long, with the full name kept in the video description)

## Notes

- **YouTube API daily quota**: default 10,000 units, each upload costs ~1,600 units (~6 uploads/day)
- The file needs a video **mimeType** to be detected in the import folder
- Each cron run processes only **one file**, to keep quota and bandwidth usage predictable
- The cleanup job checks Drive's `modifiedTime` on files in the "uploaded" folder, which updates automatically when a file is moved there
