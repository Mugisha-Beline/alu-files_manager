export default class UsersController {
  static postNew(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email' });
    }
    return 4;
  }
}
