import { ObjectID } from 'mongodb';
import fs from 'fs';
import mime from 'mime-types';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

const asyncFs = fs.promises;

const crypto = require('crypto');

export default class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }
    const user = await dbClient.usersCollection.findOne({ email });
    console.log(user);
    if (user) {
      return res.status(400).json({ error: 'Already exist' });
    }
    const hashedPassword = crypto.createHash('sha1').update(password).digest('hex');
    const result = await dbClient.usersCollection.insertOne({ email, password: hashedPassword });
    const createdUser = {
      id: result.insertedId,
      email,
    };
    return res.status(201).json(createdUser);
  }

  static async getMe(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const key = `auth_${token}`;
    const userId = await redisClient.get(key);
    console.log(userId);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await dbClient.usersCollection.findOne({ _id: ObjectID(userId) });
    console.log(user);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.status(200).json({ id: userId, email: user.email });
  }

  static async getFile(req, res) {
    const token = req.headers['x-token'];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = await dbClient.usersCollection.findOne({ _id: ObjectID(userId) });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = await dbClient.filesCollection.findOne({ _id: ObjectID(req.params.id) });
    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (!file.isPublic || file.userId.toString() !== userId) {
      return res.status(404).json({ error: 'Not found' });
    }
    if (file.type === 'folder') {
      return res.status(404).json({ error: 'A folder doesn\'t have content' });
    }
    try {
      const fileData = await asyncFs.readFile(file.localPath);
      const contentType = mime.contentType(file.name);
      return res.header('Content-Type', contentType).status(200).send(fileData);
    } catch (error) {
      return res.status(404).json({ error: 'Not found' });
    }
  }
}
