import sha1 from 'sha1';
import dbClient from '../utils/db';

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
    const hashedPassword = sha1(password);
    const result = await dbClient.usersCollection.insertOne({ email, password: hashedPassword });
    const createdUser = {
      id: result.insertedId,
      email,
    };
    return res.status(201).json(createdUser);
  }
}
