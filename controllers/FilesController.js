import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';
import Bull from 'bull';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
const fileQueue = new Bull('fileQueue');

class FilesController {
  static async postUpload(req, res) {
    const token = req.header('X-Token');
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name, type, parentId = 0, isPublic = false, data } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (!type || !['folder', 'file', 'image'].includes(type)) {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (type !== 'folder' && !data) {
      return res.status(400).json({ error: 'Missing data' });
    }

    if (parentId) {
      const parentFile = await dbClient.filesCollection().findOne({ _id: new dbClient.ObjectID(parentId) });
      if (!parentFile) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parentFile.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const newFile = {
      userId,
      name,
      type,
      isPublic,
      parentId,
    };

    if (type !== 'folder') {
      const filePath = path.join(FOLDER_PATH, uuidv4());
      const fileBuffer = Buffer.from(data, 'base64');
      fs.mkdirSync(FOLDER_PATH, { recursive: true });
      fs.writeFileSync(filePath, fileBuffer);
      newFile.localPath = filePath;
    }

    const result = await dbClient.filesCollection().insertOne(newFile);
    newFile.id = result.insertedId.toString();

    if (type === 'image') {
      fileQueue.add({ userId, fileId: newFile.id });
    }

    delete newFile.localPath; // Don't return localPath in the response

    return res.status(201).json(newFile);
  }

  static async getFile(req, res) {
    const fileId = req.params.id;
    const size = req.query.size;
    const file = await dbClient.filesCollection().findOne({ _id: new dbClient.ObjectID(fileId) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    const token = req.header('X-Token');
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);

    if (!file.isPublic && (!userId || file.userId !== userId)) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    let filePath = file.localPath;
    if (size) {
      const validSizes = [100, 250, 500];
      if (!validSizes.includes(parseInt(size, 10))) {
        return res.status(400).json({ error: 'Invalid size' });
      }
      filePath = `${filePath}_${size}`;
    }

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const mimeType = mime.lookup(file.name);
    res.setHeader('Content-Type', mimeType);
    const fileContent = fs.readFileSync(filePath);
    return res.send(fileContent);
  }
}

export default FilesController;
