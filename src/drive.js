// src/drive.js
// مسئول: پیدا کردن فایل‌های آماده آپلود توی پوشه Drive، استریم کردنشون،
// و پاک کردن (یا جابجایی) بعد از آپلود موفق.

const { google } = require('googleapis');
const { getAuthClient } = require('./auth');

function getDriveClient() {
  return google.drive({ version: 'v3', auth: getAuthClient() });
}

// لیست فایل‌های ویدیویی توی پوشه مشخص‌شده، مرتب‌شده بر اساس قدیمی‌ترین اول
// (تا ترتیب استریم‌هات حفظ بشه)
async function listPendingVideos() {
  const drive = getDriveClient();
  const folderId = process.env.DRIVE_WATCH_FOLDER_ID;

  const res = await drive.files.list({
    q: `'${folderId}' in parents and (mimeType contains 'video/') and trashed = false`,
    fields: 'files(id, name, size, createdTime, mimeType)',
    orderBy: 'createdTime',
  });

  return res.data.files || [];
}

// یه stream خوانا برمی‌گردونه که مستقیم به YouTube API پاس داده می‌شه
// (فایل کامل روی دیسک VPS ذخیره نمی‌شه)
async function getFileStream(fileId) {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return res.data;
}

async function deleteFile(fileId) {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}

async function moveToUploadedFolder(fileId) {
  const drive = getDriveClient();
  const uploadedFolderId = process.env.DRIVE_UPLOADED_FOLDER_ID;
  if (!uploadedFolderId) {
    // اگه پوشه "uploaded" تنظیم نشده، فایل رو مستقیم پاک کن
    return deleteFile(fileId);
  }

  const file = await drive.files.get({ fileId, fields: 'parents' });
  const previousParents = file.data.parents.join(',');

  await drive.files.update({
    fileId,
    addParents: uploadedFolderId,
    removeParents: previousParents,
  });
}

module.exports = { listPendingVideos, getFileStream, deleteFile, moveToUploadedFolder };
