import dbClient from '../utils/db';
import redisClient from '../utils/redis';

export default class AppController {
  static async getStatus(req, res) {
    const redisStatus = redisClient.isAlive();
    console.log(redisStatus, '========');
    const dbStatus = dbClient.isAlive();
    const status = { redis: redisStatus, db: dbStatus };
    res.status(200).json(status);
  }

  static async getStats(req, res) {
    const users = await dbClient.nbUsers();
    const files = await dbClient.nbFiles();
    const stats = { users, files };
    res.status(200).json(stats);
  }
}
