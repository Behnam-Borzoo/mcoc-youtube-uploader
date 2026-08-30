// src/schedule.js
// Figures out when the next uploaded video should go public.
// Keeps a small JSON file on disk to remember the last reserved slot,
// so multiple queued videos don't get scheduled for the same time.

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', 'schedule-state.json');

function readState() {
  if (!fs.existsSync(STATE_FILE)) {
    return { lastScheduledDate: null };
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Computes the next publish datetime based on .env settings, WITHOUT
// persisting it yet. Call commitPublishSlot() only after the upload
// actually succeeds, so failed attempts don't burn a slot.
function computeNextPublishSlot() {
  const state = readState();
  const hour = parseInt(process.env.PUBLISH_HOUR || '19', 10);
  const minute = parseInt(process.env.PUBLISH_MINUTE || '0', 10);
  const daysBetween = parseInt(process.env.DAYS_BETWEEN_UPLOADS || '1', 10);

  let baseDate;
  if (state.lastScheduledDate) {
    // Already scheduled at least one video before -> just add the interval.
    baseDate = new Date(state.lastScheduledDate);
    baseDate.setDate(baseDate.getDate() + daysBetween);
  } else if (process.env.PUBLISH_START_DATE) {
    // First video ever scheduled -> use the configured start date
    // (format: YYYY-MM-DD), e.g. PUBLISH_START_DATE=2026-09-01
    baseDate = new Date(`${process.env.PUBLISH_START_DATE}T00:00:00`);
  } else {
    baseDate = new Date();
    // If today's publish time has already passed, start from tomorrow.
    if (
      baseDate.getHours() > hour ||
      (baseDate.getHours() === hour && baseDate.getMinutes() >= minute)
    ) {
      baseDate.setDate(baseDate.getDate() + 1);
    }
  }

  baseDate.setHours(hour, minute, 0, 0);

  return baseDate.toISOString();
}

// Persists a slot as taken. Call this only after a successful upload.
function commitPublishSlot(isoDate) {
  writeState({ lastScheduledDate: isoDate });
}

module.exports = { computeNextPublishSlot, commitPublishSlot };
