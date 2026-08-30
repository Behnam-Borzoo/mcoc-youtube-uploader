// src/youtube.js
// مسئول: آپلود resumable ویدیو به یوتیوب، با متادیتا و publishAt

const { google } = require('googleapis');
const { getAuthClient } = require('./auth');

function getYoutubeClient() {
  return google.youtube({ version: 'v3', auth: getAuthClient() });
}

/**
 * @param {object} opts
 * @param {ReadableStream} opts.fileStream - stream فایل ویدیو (از Drive میاد)
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
        privacyStatus: 'private', // اجباریه وقتی publishAt ست میشه
        publishAt,
        selfDeclaredMadeForKids: false,
      },
    },
    media: {
      body: fileStream,
    },
  });

  return res.data; // شامل video id و بقیه اطلاعات
}

module.exports = { uploadVideo };
