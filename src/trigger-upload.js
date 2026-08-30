// src/trigger-upload.js
// Manual, one-off trigger for testing.
// Runs a single upload check and exits — does NOT start the cron scheduler.
// Usage: node src/trigger-upload.js

require('dotenv').config();
const { listPendingVideos, getFileStream, moveToUploadedFolder } = require('./drive');
const { uploadVideo, addVideoToPlaylist } = require('./youtube');
const { computeNextPublishSlot, commitPublishSlot } = require('./schedule');

const YOUTUBE_TITLE_MAX_LENGTH = 100;
const SUFFIX = ' | BEHNAM BORZOO';

function buildMetadataFromFilename(filename) {
  const base = filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');

  const maxBaseLength = YOUTUBE_TITLE_MAX_LENGTH - SUFFIX.length;
  const truncatedBase =
    base.length > maxBaseLength ? base.slice(0, maxBaseLength - 1).trim() + '…' : base;
  const title = `${truncatedBase}${SUFFIX}`;

  const description = [
    base,
    '',
    'MCOC (Marvel Contest of Champions) stream VOD - Battlegrounds / Arena',
    '',
    'Follow on Twitch: twitch.tv/BehnamBorzoo',
  ].join('\n');
  const tags = [
    'MCOC',
    'Marvel Contest of Champions',
    'Battlegrounds',
    'Arena',
    'BehnamBorzoo',
    'AW',
    'AQ',
    'Alliance War',
    'Alliance Quest',
    'Kabam',
    'MCOC Gameplay',
    'Twitch VOD',
    'Gaming Livestream',
    'Mobile Gaming',
    'Marvel Games',
    'MCOC Tips',
    'MCOC Strategy',
  ];
  return { title, description, tags };
}

async function main() {
  console.log('Manual trigger: checking import folder...');
  const pending = await listPendingVideos();

  if (pending.length === 0) {
    console.log('No new files to upload.');
    return;
  }

  const file = pending[0];
  console.log(`Processing: ${file.name}`);

  const stream = await getFileStream(file.id);
  stream.on('error', (err) => {
    console.error(`Drive stream error while reading "${file.name}":`, err.message);
  });

  const { title, description, tags } = buildMetadataFromFilename(file.name);
  const publishAt = computeNextPublishSlot();

  console.log(`  -> Scheduled publish time: ${publishAt}`);

  const result = await uploadVideo({ fileStream: stream, title, description, tags, publishAt });
  commitPublishSlot(publishAt);
  console.log(`  -> Upload successful. Video ID: ${result.id}`);

  const playlistId = process.env.YOUTUBE_PLAYLIST_ID;
  if (playlistId) {
    try {
      await addVideoToPlaylist(result.id, playlistId);
      console.log(`  -> Added to playlist.`);
    } catch (err) {
      console.error(`  -> Failed to add video to playlist:`, err.message);
    }
  }

  await moveToUploadedFolder(file.id);
  console.log(`  -> File moved to the "uploaded" folder.`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
