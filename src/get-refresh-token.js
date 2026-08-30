// src/get-refresh-token.js
// Run this ONCE, on a machine with a browser (not necessarily the VPS),
// to obtain a refresh token for YouTube + Drive API access.

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
  access_type: 'offline', // required to receive a refresh_token
  prompt: 'consent',      // forces Google to always issue a fresh refresh_token
  scope: SCOPES,
});

console.log('\n=== Step 1 ===');
console.log('Open this link in your browser and log in with your channel\'s Google account:\n');
console.log(authUrl);
console.log('\nWaiting for you to grant access...\n');

const server = http.createServer(async (req, res) => {
  if (req.url.startsWith('/oauth2callback')) {
    const qs = new url.URL(req.url, 'http://localhost:3000').searchParams;
    const code = qs.get('code');

    res.end('Success! You can close this tab and go back to the terminal.');
    server.close();

    try {
      const { tokens } = await oauth2Client.getToken(code);
      console.log('\n=== Success! ===\n');
      console.log('>>> Copy this line into your .env file on the VPS: <<<\n');
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('\n');
    } catch (err) {
      console.error('Error obtaining token:', err.message);
    }
  }
});

server.listen(3000, () => {
  console.log('Temporary server listening on port 3000, waiting for Google callback...');
});
