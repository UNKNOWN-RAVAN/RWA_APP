import { verifyAdmin, createUser } from '../utils/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, password, mobile, pass, token, api } = req.query;
    
    const isValid = await verifyAdmin(username, password);
    if (!isValid) return res.status(401).json({ error: 'Invalid admin credentials' });

    if (!mobile || !pass) {
      return res.status(400).json({ error: 'Mobile and password required' });
    }

    const apiBase = api || 'https://rozgarapinew.teachx.in';
    const user = await createUser(mobile, pass, token || null, apiBase);

    return res.status(200).json({
      success: true,
      message: 'User created successfully',
      user: { mobile: user.mobile, user_id: user.user_id }
    });

  } catch (error) {
    console.error('Add user error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}