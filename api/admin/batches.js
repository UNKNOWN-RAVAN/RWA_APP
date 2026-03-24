import { connectToDatabase, getAllUsers, verifyAdmin } from '../utils/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, password, batch_id, mobile } = req.query;
    const isValid = await verifyAdmin(username, password);
    if (!isValid) return res.status(401).json({ error: 'Invalid admin credentials' });

    await connectToDatabase();
    const users = await getAllUsers();

    // Get specific user's batches
    if (mobile) {
      const user = users.find(u => u.mobile === mobile);
      if (!user) return res.status(404).json({ error: 'User not found' });

      return res.status(200).json({
        success: true,
        user: {
          mobile: user.mobile,
          user_id: user.user_id,
          batches: user.purchased_batches || []
        }
      });
    }

    // Get all users for a specific batch
    if (batch_id) {
      const usersWithBatch = users.filter(user =>
        user.purchased_batches?.some(b => b.batch_id === parseInt(batch_id))
      );

      const batchInfo = usersWithBatch.length > 0 ?
        usersWithBatch[0].purchased_batches?.find(b => b.batch_id === parseInt(batch_id)) : null;

      return res.status(200).json({
        success: true,
        batch_id: parseInt(batch_id),
        batch_name: batchInfo?.batch_name || 'Unknown',
        total_users: usersWithBatch.length,
        users: usersWithBatch.map(user => ({
          mobile: user.mobile,
          user_id: user.user_id,
          purchase_date: user.purchased_batches?.find(b => b.batch_id === parseInt(batch_id))?.purchase_date
        }))
      });
    }

    // Get all merged batches
    const mergedBatches = {};
    users.forEach(user => {
      (user.purchased_batches || []).forEach(batch => {
        if (!mergedBatches[batch.batch_id]) {
          mergedBatches[batch.batch_id] = {
            batch_id: batch.batch_id,
            batch_name: batch.batch_name,
            thumbnail: batch.thumbnail,
            total_users: 0,
            users: []
          };
        }
        mergedBatches[batch.batch_id].total_users++;
        mergedBatches[batch.batch_id].users.push({
          mobile: user.mobile,
          user_id: user.user_id,
          purchase_date: batch.purchase_date
        });
      });
    });

    return res.status(200).json({
      success: true,
      total_batches: Object.keys(mergedBatches).length,
      batches: Object.values(mergedBatches)
    });

  } catch (error) {
    console.error('Admin batches error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}