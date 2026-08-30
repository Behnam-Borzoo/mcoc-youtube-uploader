// src/index.js
// نقطه ورود اصلی. با cron هر چند وقت یک‌بار Drive رو چک می‌کنه،
// اگه فایل جدید بود، آپلودش می‌کنه به یوتیوب و بعد پاکش می‌کنه.

require('dotenv').config();
const cron = require('node-cron');
const { listPendingVideos, getFileStream, moveToUploadedFolder } = require('./drive');
const { uploadVideo } = require('./youtube');
const { getNextPublishSlot } = require('./schedule');

// اسم فایل رو تبدیل به یه عنوان قابل‌قبول برای یوتیوب می‌کنه
// مثال ورودی: "2026-08-30_MCOC_Battlegrounds.mp4"
function buildMetadataFromFilename(filename) {
  const base = filename.replace(/\.[^/.]+$/, ''); // حذف پسوند
  const title = `${base.replace(/_/g, ' ')} | BEHNAM BORZOO`;
  const description = [
    'ویدیوی استریم MCOC (Marvel Contest of Champions) - Battlegrounds / Arena',
    '',
    'دنبال کن روی تویچ: twitch.tv/BehnamBorzoo',
  ].join('\n');
  const tags = ['MCOC', 'Marvel Contest of Champions', 'Battlegrounds', 'Arena', 'BehnamBorzoo'];

  return { title, description, tags };
}

async function processOneVideo(file) {
  console.log(`[${new Date().toISOString()}] در حال پردازش: ${file.name}`);

  const stream = await getFileStream(file.id);
  const { title, description, tags } = buildMetadataFromFilename(file.name);
  const publishAt = getNextPublishSlot();

  console.log(`  -> زمان‌بندی publish: ${publishAt}`);

  const result = await uploadVideo({
    fileStream: stream,
    title,
    description,
    tags,
    publishAt,
  });

  console.log(`  -> آپلود موفق. Video ID: ${result.id}`);

  await moveToUploadedFolder(file.id);
  console.log(`  -> فایل از Drive حذف/جابجا شد.`);
}

async function checkAndUpload() {
  try {
    const pending = await listPendingVideos();

    if (pending.length === 0) {
      console.log(`[${new Date().toISOString()}] فایل جدیدی برای آپلود نیست.`);
      return;
    }

    // فقط یکی رو در هر اجرا پردازش کن، تا quota و پهنای باند کنترل‌شده بمونه
    const nextFile = pending[0];
    await processOneVideo(nextFile);
  } catch (err) {
    console.error('خطا در پردازش:', err.message);
  }
}

const cronExpr = process.env.CHECK_CRON || '0 * * * *'; // پیش‌فرض: هر ساعت
console.log(`سرویس آپلود یوتیوب شروع شد. زمان‌بندی چک: "${cronExpr}"`);

cron.schedule(cronExpr, checkAndUpload);

// یه چک اولیه هم موقع استارت انجام بده
checkAndUpload();
