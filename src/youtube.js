// src/youtube.js
// Handles the resumable upload to YouTube, with metadata and publishAt scheduling.

const { google } = require('googleapis');
const { getAuthClient } = require('./auth');

function getYoutubeClient() {
  return google.youtube({ version: 'v3', auth: getAuthClient() });
}

/**
 * @param {object} opts
 * @param {ReadableStream} opts.fileStream - video file stream (comes from Drive)
 * @param {string} opts.title
 * @param {string} opts.description
 * @param {string[]} opts.tags
 * @param {string} opts.publishAt - ISO 8601 datetime
 */
async function uploadVideo({ fileStream, title, description, tags, publishAt }) {
  const youtube = getYoutubeClient();

  const res = await youtube.videos.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title,
        description,
        tags,
        categoryId: '20', // Gaming
      },
      status: {
        privacyStatus: 'private', // required when publishAt is set
        publishAt,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fileStream,
    },
  });

  return res.data; // includes the new video's id
}

module.exports = { uploadVideo };
