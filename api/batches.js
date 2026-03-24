import { connectToDatabase, getUserByToken, updateUserBatches } from './utils/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token required' });

    await connectToDatabase();
    const user = await getUserByToken(token);
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    try {
      const encodeHeader = (str) => {
        try {
          return btoa(unescape(encodeURIComponent(str)));
        } catch (e) {
          return "";
        }
      };

      const url = `${user.api_base}/get/mycoursev2?userid=${encodeURIComponent(user.user_id)}`;
      const headers = {
        "Client-Service": "Appx",
        "source": "website",
        "Auth-Key": "appxapi",
        "Authorization": user.token,
        "User-ID": encodeHeader(user.user_id)
      };

      const response = await fetch(url, { headers });
      const result = await response.json();

      if (result.data && result.data.length > 0) {
        const freshBatches = result.data.map(batch => ({
          batch_id: batch.id,
          batch_name: batch.course_name,
          thumbnail: batch.course_thumbnail,
          start_date: batch.start_date,
          end_date: batch.end_date
        }));

        await updateUserBatches(user.mobile, freshBatches);
        return res.status(200).json({ success: true, batches: freshBatches });
      }
    } catch (fetchError) {
      console.error('Error fetching fresh batches:', fetchError);
    }

    return res.status(200).json({ success: true, batches: user.purchased_batches || [], cached: true });

  } catch (error) {
    console.error('Batches error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}