import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const asyncFs = fs.promises;

export default class FilesController {
  static async postUpload(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.body.name) {
      return res.status(400).json({ error: 'Missing name' });
    }
    if (req.body.type !== 'folder' && req.body.type !== 'file' && req.body.type !== 'image') {
      return res.status(400).json({ error: 'Missing type' });
    }
    if (!req.body.data && req.body.type !== 'folder') {
      return res.status(400).json({ error: 'Missing data' });
    }
    const parentId = req.body.parentId || 0;
    if (req.body.parentId) {
      const parent = await dbClient.filesCollection.findOne({ parentId });
      if (!parent) {
        return res.status(400).json({ error: 'Parent not found' });
      }
      if (parent.type !== 'folder') {
        return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }
    if (req.body.type === 'folder') {
      const data = {
        userId,
        name: req.body.name,
        type: req.body.type,
        parentId,
        isPublic: req.body.isPublic || false,
      };
      const result = await dbClient.filesCollection.insertOne(data);
      const returnItem = {
        id: result.insertedId,
        userId,
        name: req.body.name,
        type: req.body.type,
        parentId,
      };
      return res.status(201).json(returnItem);
    }
    const item = {
      userId,
      name: req.body.name,
      type: req.body.type,
      parentId,
    };
    const topFolder = process.env.FOLDER_PATH || '/tmp/files_manager';
    const filename = uuidv4();
    const path = `${topFolder}/${filename}`;
    const { data } = req.body;
    const buff = Buffer.from(data, 'base64');
    asyncFs.mkdir(topFolder, { recursive: true });
    const writtenFile = asyncFs.writeFile(path, buff);
    if (!writtenFile) {
      return res.status(400).json({ error: 'Cannot write file' });
    }
    item.localPath = path;
    const result = await dbClient.filesCollection.insertOne({ item });
    const returnItem = {
      id: result.insertedId,
      userId,
      name: req.body.name,
      type: req.body.type,
      parentId,
    };
    return res.status(201).json(returnItem);
  }
}
