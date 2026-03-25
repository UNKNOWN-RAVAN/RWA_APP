import { connectToDatabase, saveUser, getUserByMobile, logLoginActivity } from './utils/db.js';
import bcrypt from 'bcryptjs';

async function fetchUserBatches(apiBase, userId, token) {
  try {
    const encodeHeader = (str) => {
      try {
        return btoa(unescape(encodeURIComponent(str)));
      } catch (e) {
        return "";
      }
    };

    const url = `${apiBase}/get/mycoursev2?userid=${encodeURIComponent(userId)}`;
    const headers = {
      "Client-Service": "Appx",
      "source": "website",
      "Auth-Key": "appxapi",
      "Authorization": token,
      "User-ID": encodeHeader(userId)
    };

    const response = await fetch(url, { headers });
    const result = await response.json();

    if (result.data && result.data.length > 0) {
      return result.data.map(batch => ({
        batch_id: batch.id,
        batch_name: batch.course_name,
        thumbnail: batch.course_thumbnail,
        start_date: batch.start_date,
        end_date: batch.end_date,
        purchase_date: new Date()
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching batches:', error);
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { credentials, api } = req.query;
    if (!credentials) return res.status(400).json({ error: 'Credentials required' });

    const [mobile, password] = credentials.split('*');
    if (!mobile || !password) return res.status(400).json({ error: 'Invalid format' });

    const apiBase = api || 'https://rozgarapinew.teachx.in';

    let authResult;
    try {
      const loginUrl = `${apiBase}/post/userLogin`;
      const formData = new URLSearchParams();
      formData.append('email', mobile);
      formData.append('password', password);

      const authResponse = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Auth-Key': 'appxapi', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      authResult = await authResponse.json();
    } catch (error) {
      await logLoginActivity(mobile, 'mobile', 'failed');
      return res.status(500).json({ error: 'Authentication service unavailable' });
    }

    if (authResult.status !== 200) {
      await logLoginActivity(mobile, 'mobile', 'failed');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = authResult.data.token;
    const userId = authResult.data.userid;
    const batches = await fetchUserBatches(apiBase, userId, token);

    const existingUser = await getUserByMobile(mobile);
    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      mobile,
      password: hashedPassword,
      token,
      user_id: userId,
      api_base: apiBase,
      purchased_batches: batches,
      last_login: new Date(),
      login_count: existingUser ? (existingUser.login_count || 0) + 1 : 1,
      created_at: existingUser ? existingUser.created_at : new Date()
    };

    await saveUser(userData);
    await logLoginActivity(mobile, 'mobile', 'success');

    return res.status(200).json({
      success: true,
      token,
      user_id: userId,
      mobile,
      purchased_batches: batches
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}