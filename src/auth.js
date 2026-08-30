// src/auth.js
// یه OAuth2 client مشترک می‌سازه که هم برای Drive و هم YouTube API استفاده می‌شه.
// با استفاده از refresh_token خودش access_token تازه می‌گیره، نیازی به لاگین دستی دوباره نیست.

const { google } = require('googleapis');

function getAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return oauth2Client;
}

module.exports = { getAuthClient };
