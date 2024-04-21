/* eslint-disable consistent-return */
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import mime from 'mime-types';
import { ObjectID } from 'mongodb';
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
    if (req.body.parentId && req.body.parentId !== '0') {
      const parent = await dbClient.filesCollection.findOne({ _id: ObjectID(parentId) });
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
    await asyncFs.mkdir(topFolder, { recursive: true });
    const writtenFile = asyncFs.writeFile(path, buff);
    if (!writtenFile) {
      return res.status(400).json({ error: 'Cannot write file' });
    }
    item.localPath = path;
    const result = await dbClient.filesCollection.insertOne(item);
    const returnItem = {
      id: result.insertedId,
      userId,
      name: req.body.name,
      type: req.body.type,
      parentId,
      isPublic: req.body.isPublic || false,
    };
    return res.status(201).json(returnItem);
  }

  static async getShow(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const fileId = req.params.id;
    const file = await dbClient.filesCollection.findOne({
      _id: ObjectID(fileId),
      userId: ObjectID(userId),
    });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getIndex(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = parseInt(req.query.page || 0, 10);
    const limit = 20;
    const skip = page * limit;

    console.log('skip', skip);

    const query = {};
    if (req.query.parentId) {
      query.parentId = ObjectID(req.query.parentId);
    }

    const files = await dbClient.filesCollection
      .find(query)
      .sort({ _id: 1 }).limit(limit).skip(skip)
      .toArray();

    const result = files.map((file) => ({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    }));
    return res.status(200).json(result);
  }

  static async putPublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const fileId = req.params.id;
    const file = await dbClient.filesCollection.findOne({
      _id: ObjectID(fileId),
      userId: ObjectID(userId),
    });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    file.isPublic = true;
    await dbClient.filesCollection.updateOne({ _id: ObjectID(fileId) },
      { $set: { isPublic: true } });
    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async putUnpublish(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const fileId = req.params.id;
    const file = await dbClient.filesCollection.findOne({
      _id: ObjectID(fileId),
      userId: ObjectID(userId),
    });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    file.isPublic = false;
    await dbClient.filesCollection.updateOne({ _id: ObjectID(fileId) },
      { $set: { isPublic: false } });
    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
    });
  }

  static async getFile(req, res) {
    const file = await dbClient.filesCollection.findOne({ _id: ObjectID(req.params.id) });
    console.log(file, '=====');
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (file.isPublic) {
      if (file.type === 'folder') {
        return res.status(400).json({ error: 'A folder doesn\'t have content' });
      }
      try {
        const fileData = await asyncFs.readFile(file.localPath);
        const contentType = mime.contentType(file.name);
        return res.header('Content-Type', contentType).status(200).send(fileData);
      } catch (error) {
        return res.status(404).json({ error: 'Not found' });
      }
    } else {
      const token = req.headers['x-token'];
      if (!token) {
        return res.status(404).json({ error: 'Not found' });
      }
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(404).json({ error: 'Not found' });
      }
      const user = await dbClient.usersCollection.findOne({ _id: ObjectID(userId) });
      if (!user) {
        return res.status(404).json({ error: 'Not found' });
      }
      if (file.type === 'folder') {
        return res.status(400).json({ error: 'A folder doesn\'t have content' });
      }

      try {
        if (file.userId.toString() !== userId) {
          return res.status(404).json({ error: 'Not found' });
        }
        const fileData = await asyncFs.readFile(file.localPath);
        const contentType = mime.contentType(file.name);
        return res.header('Content-Type', contentType).status(200).send(fileData);
      } catch (error) {
        return res.status(404).json({ error: 'Not found' });
      }
    }
  }
}
