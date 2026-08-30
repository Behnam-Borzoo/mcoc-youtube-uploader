// src/get-refresh-token.js
// این اسکریپت رو فقط یک‌بار، روی سیستمی که مرورگر داره (نه لزوماً VPS)، اجرا کن
// تا refresh token برای YouTube + Drive API بگیری.

require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const url = require('url');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/drive',
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES,
});

console.log('\n=== مرحله ۱ ===');
console.log('این لینک رو توی مرورگر باز کن و با اکانت گوگل کانالت لاگین کن:\n');
console.log(authUrl);
console.log('\nمنتظر می‌مونم تا اجازه بدی...\n');

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/oauth2callback')) {
    const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
    const code = qs.get('code');

    res.end('موفق بود! می‌تونی این تب رو ببندی و برگردی به ترمینال.');
    server.close();

    try {
      const { tokens } = await oauth2Client.getToken(code);
      console.log('\n=== موفقیت‌آمیز بود! ===\n');
      console.log('>>> این خط رو کپی کن و توی فایل .env روی VPS بذار: <<<\n');
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('\n');
    } catch (err) {
      console.error('خطا در گرفتن توکن:', err.message);
    }
  }
});

server.listen(3000, () => {
  console.log('سرور موقت روی پورت 3000 بالا اومد، منتظر callback از گوگل...');
});
