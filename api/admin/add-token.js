import { verifyAdmin, getUserByMobile, updateUserToken } from '../utils/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, password, mobile, token } = req.query;
    
    const isValid = await verifyAdmin(username, password);
    if (!isValid) return res.status(401).json({ error: 'Invalid admin credentials' });

    if (!mobile || !token) {
      return res.status(400).json({ error: 'Mobile and token required' });
    }

    const user = await getUserByMobile(mobile);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await updateUserToken(mobile, token);

    return res.status(200).json({
      success: true,
      message: 'Token added successfully',
      mobile
    });

  } catch (error) {
    console.error('Add token error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}