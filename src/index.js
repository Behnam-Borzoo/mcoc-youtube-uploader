// src/index.js
// Main entry point. Runs two independent cron jobs:
//  1. checkAndUpload   - watches the import folder, uploads new files to YouTube,
//                        then moves them to the "uploaded" folder.
//  2. runCleanup       - deletes files from the "uploaded" folder once they've
//                        been sitting there longer than CLEANUP_AFTER_DAYS.

require('dotenv').config();
const cron = require('node-cron');

// Safety nets: without these, an error not caught anywhere else crashes the
// process silently (PM2 just shows a restart with no explanation in the logs).
process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err && err.message ? err.message : err);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err && err.message ? err.message : err);
});
const {
  listPendingVideos,
  getFileStream,
  moveToUploadedFolder,
  cleanupOldUploadedFiles,
} = require('./drive');
const { uploadVideo } = require('./youtube');
const { computeNextPublishSlot, commitPublishSlot } = require('./schedule');

// Turns a filename into YouTube-ready metadata.
// Example input: "2026-08-30_MCOC_Battlegrounds.mp4"
const YOUTUBE_TITLE_MAX_LENGTH = 100;
const SUFFIX = ' | BEHNAM BORZOO';

function buildMetadataFromFilename(filename) {
  const base = filename.replace(/\.[^/.]+$/, '').replace(/_/g, ' '); // strip extension, underscores -> spaces

  // YouTube rejects titles over 100 characters ("invalid or empty video title").
  // Truncate the base name so base + suffix always fits, and keep the full
  // original name in the description so nothing is lost.
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

async function processOneVideo(file) {
  console.log(`[${new Date().toISOString()}] Processing: ${file.name}`);

  const stream = await getFileStream(file.id);

  // IMPORTANT: without this listener, an error emitted by the Drive download
  // stream (auth failure, network hiccup, etc.) becomes an uncaught exception
  // and crashes the whole Node process silently.
  stream.on('error', (err) => {
    console.error(`  -> Drive stream error while reading "${file.name}":`, err.message);
  });

  const { title, description, tags } = buildMetadataFromFilename(file.name);
  const publishAt = computeNextPublishSlot();

  console.log(`  -> Scheduled publish time: ${publishAt}`);

  const result = await uploadVideo({
    fileStream: stream,
    title,
    description,
    tags,
    publishAt,
  });

  // Only now, after a confirmed successful upload, do we reserve the slot.
  commitPublishSlot(publishAt);

  console.log(`  -> Upload successful. Video ID: ${result.id}`);

  await moveToUploadedFolder(file.id);
  console.log(`  -> File moved to the "uploaded" folder.`);
}

async function checkAndUpload() {
  try {
    const pending = await listPendingVideos();

    if (pending.length === 0) {
      console.log(`[${new Date().toISOString()}] No new files to upload.`);
      return;
    }

    // Only process one file per run, to keep quota and bandwidth usage predictable.
    const nextFile = pending[0];
    await processOneVideo(nextFile);
  } catch (err) {
    console.error('Error during upload check:', err.message);
  }
}

async function runCleanup() {
  try {
    console.log(`[${new Date().toISOString()}] Running cleanup of old uploaded files...`);
    const deletedCount = await cleanupOldUploadedFiles();
    console.log(`  -> Cleanup done. ${deletedCount} file(s) deleted.`);
  } catch (err) {
    console.error('Error during cleanup:', err.message);
  }
}

const checkCron = process.env.CHECK_CRON || '0 9,21 * * *'; // default: twice a day
const cleanupCron = process.env.CLEANUP_CRON || '0 3 * * *'; // default: daily at 03:00

console.log(`YouTube uploader service started.`);
console.log(`  Upload check schedule: "${checkCron}"`);
console.log(`  Cleanup schedule: "${cleanupCron}"`);

cron.schedule(checkCron, checkAndUpload);
cron.schedule(cleanupCron, runCleanup);

// Run an initial check on startup too.
checkAndUpload();
