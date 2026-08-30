// src/auth.js
// Builds a shared OAuth2 client used by both the Drive and YouTube API clients.
// Uses the stored refresh_token to silently obtain fresh access tokens —
// no manual re-login required after the initial setup.

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
