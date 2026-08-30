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

// Computes the next publish datetime based on .env settings.
function getNextPublishSlot() {
  const state = readState();
  const hour = parseInt(process.env.PUBLISH_HOUR || '18', 10);
  const minute = parseInt(process.env.PUBLISH_MINUTE || '0', 10);
  const daysBetween = parseInt(process.env.DAYS_BETWEEN_UPLOADS || '1', 10);

  let baseDate;
  if (state.lastScheduledDate) {
    baseDate = new Date(state.lastScheduledDate);
    baseDate.setDate(baseDate.getDate() + daysBetween);
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

  writeState({ lastScheduledDate: baseDate.toISOString() });

  return baseDate.toISOString();
}

module.exports = { getNextPublishSlot };
