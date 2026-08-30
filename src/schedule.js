// src/schedule.js
// مسئول محاسبه اینکه ویدیوی بعدی باید کِی پابلیک بشه.
// یه فایل ساده JSON روی دیسک نگه می‌داره که آخرین اسلات رزرو شده رو یادش بمونه
// (تا اگه چند ویدیو پشت سر هم صف شدن، روی هم نیفتن).

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

// تاریخ/ساعت بعدی publish رو بر اساس تنظیمات .env محاسبه می‌کنه
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
    // اگه امروز از ساعت publish گذشته، از فردا شروع کن
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
