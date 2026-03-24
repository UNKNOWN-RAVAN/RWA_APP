import { connectToDatabase, getUserByToken } from './utils/db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, batch_id, subject_id } = req.query;
    if (!token || !batch_id) return res.status(400).json({ error: 'Token and batch_id required' });

    await connectToDatabase();
    const user = await getUserByToken(token);
    if (!user) return res.status(401).json({ error: 'Invalid token' });

    const encodeHeader = (str) => {
      try {
        return btoa(unescape(encodeURIComponent(str)));
      } catch (e) {
        return "";
      }
    };

    if (subject_id) {
      const url = `${user.api_base}/get/alltopicfrmlivecourseclass?courseid=${batch_id}&subjectid=${subject_id}&start=-1`;
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
        const topics = result.data.map(topic => ({
          topic_id: topic.topicid,
          topic_name: topic.topic_name,
          description: topic.topic_description
        }));
        return res.status(200).json({ success: true, topics });
      }
      return res.status(404).json({ error: 'No topics found' });
    } else {
      const url = `${user.api_base}/get/allsubjectfrmlivecourseclass?courseid=${batch_id}&start=-1`;
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
        const subjects = result.data.map(subject => ({
          subject_id: subject.subjectid,
          subject_name: subject.subject_name,
          description: subject.subject_description
        }));
        return res.status(200).json({ success: true, subjects });
      }
      return res.status(404).json({ error: 'No subjects found' });
    }

  } catch (error) {
    console.error('Topics error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}