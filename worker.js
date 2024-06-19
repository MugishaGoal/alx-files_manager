import Bull from 'bull';
import fs from 'fs';
import path from 'path';
import imageThumbnail from 'image-thumbnail';
import dbClient from '../utils/db';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const fileQueue = new Bull('fileQueue');

fileQueue.process(async (job, done) => {
  const { userId, fileId } = job.data;

  if (!fileId) {
    return done(new Error('Missing fileId'));
  }
  if (!userId) {
    return done(new Error('Missing userId'));
  }

  const file = await dbClient.filesCollection().findOne({ _id: new dbClient.ObjectID(fileId), userId });

  if (!file) {
    return done(new Error('File not found'));
  }

  const filePath = file.localPath;

  if (!fs.existsSync(filePath)) {
    return done(new Error('File not found'));
  }

  const sizes = [500, 250, 100];
  for (const size of sizes) {
    try {
      const thumbnail = await imageThumbnail(filePath, { width: size });
      const thumbnailPath = `${filePath}_${size}`;
      fs.writeFileSync(thumbnailPath, thumbnail);
    } catch (error) {
      return done(error);
    }
  }

  return done();
});

export default fileQueue;
