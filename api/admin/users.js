import { connectToDatabase, getAllUsers, verifyAdmin } from '../utils/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, password } = req.query;
    const isValid = await verifyAdmin(username, password);
    if (!isValid) return res.status(401).json({ error: 'Invalid admin credentials' });

    await connectToDatabase();
    const users = await getAllUsers();

    const sanitizedUsers = users.map(user => ({
      mobile: user.mobile,
      user_id: user.user_id,
      token: user.token || null,
      purchased_batches: user.purchased_batches || [],
      login_count: user.login_count || 0,
      last_login: user.last_login,
      created_at: user.created_at,
      api_base: user.api_base
    }));

    return res.status(200).json({
      success: true,
      total_users: users.length,
      users: sanitizedUsers
    });

  } catch (error) {
    console.error('Admin users error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}