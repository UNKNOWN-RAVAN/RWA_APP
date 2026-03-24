import { verifyAdmin } from '../utils/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let username, password;

    if (req.method === 'GET') {
      username = req.query.username;
      password = req.query.password;
    } else if (req.method === 'POST') {
      username = req.body.username;
      password = req.body.password;
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const isValid = await verifyAdmin(username, password);

    if (isValid) {
      return res.status(200).json({
        success: true,
        message: 'Admin login successful',
        admin: { username: process.env.ADMIN_USERNAME }
      });
    }

    return res.status(401).json({ error: 'Invalid admin credentials' });

  } catch (error) {
    console.error('Admin auth error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}