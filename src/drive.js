// src/drive.js
// Responsible for:
//  - finding new video files in the "import" folder
//  - streaming a file's content (for direct upload to YouTube)
//  - moving a file to the "uploaded" folder after a successful upload
//  - cleaning up (deleting) files from the "uploaded" folder after N days

const { google } = require('googleapis');
const { getAuthClient } = require('./auth');

function getDriveClient() {
  return google.drive({ version: 'v3', auth: getAuthClient() });
}

// Lists video files in the import folder, oldest first (so upload order
// matches the order streams were recorded).
async function listPendingVideos() {
  const drive = getDriveClient();
  const folderId = process.env.DRIVE_IMPORT_FOLDER_ID;

  const res = await drive.files.list({
    q: `'${folderId}' in parents and (mimeType contains 'video/') and trashed = false`,
    fields: 'files(id, name, size, createdTime, mimeType)',
    orderBy: 'createdTime',
  });

  return res.data.files || [];
}

// Returns a readable stream that is passed directly to the YouTube API
// (the file is never fully written to disk on the VPS).
async function getFileStream(fileId) {
  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  );
  return res.data;
}

// Moves a file from the import folder into the "uploaded" folder.
// Drive's modifiedTime gets updated automatically by this operation,
// which the cleanup job later uses to know how long it's been sitting there.
async function moveToUploadedFolder(fileId) {
  const drive = getDriveClient();
  const uploadedFolderId = process.env.DRIVE_UPLOADED_FOLDER_ID;

  const file = await drive.files.get({ fileId, fields: 'parents' });
  const previousParents = file.data.parents.join(',');

  await drive.files.update({
    fileId,
    addParents: uploadedFolderId,
    removeParents: previousParents,
  });
}

async function deleteFile(fileId) {
  const drive = getDriveClient();
  await drive.files.delete({ fileId });
}

// Lists files in the "uploaded" folder that are older than CLEANUP_AFTER_DAYS
// (based on the time they were moved there) and deletes them.
async function cleanupOldUploadedFiles() {
  const drive = getDriveClient();
  const uploadedFolderId = process.env.DRIVE_UPLOADED_FOLDER_ID;
  const cleanupAfterDays = parseInt(process.env.CLEANUP_AFTER_DAYS || '3', 10);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - cleanupAfterDays);
  const cutoffIso = cutoff.toISOString();

  const res = await drive.files.list({
    q: `'${uploadedFolderId}' in parents and modifiedTime < '${cutoffIso}' and trashed = false`,
    fields: 'files(id, name, modifiedTime)',
  });

  const oldFiles = res.data.files || [];

  for (const file of oldFiles) {
    await deleteFile(file.id);
    console.log(`  -> Deleted (older than ${cleanupAfterDays} days): ${file.name}`);
  }

  return oldFiles.length;
}

module.exports = {
  listPendingVideos,
  getFileStream,
  moveToUploadedFolder,
  deleteFile,
  cleanupOldUploadedFiles,
};
