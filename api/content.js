import { connectToDatabase, getUserByToken } from './utils/db.js';
import { decryptContent, encryptUrl } from './utils/crypto.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { token, batch_id, subject_id, topic_id } = req.query;
    if (!token || !batch_id || !subject_id || !topic_id) {
      return res.status(400).json({ error: 'Token, batch_id, subject_id, and topic_id required' });
    }

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

    const url = `${user.api_base}/get/livecourseclassbycoursesubtopconceptapiv3?courseid=${batch_id}&subjectid=${subject_id}&topicid=${topic_id}&conceptid=&start=-1`;
    const headers = {
      "Client-Service": "Appx",
      "source": "website",
      "Auth-Key": "appxapi",
      "Authorization": user.token,
      "User-ID": encodeHeader(user.user_id)
    };

    const response = await fetch(url, { headers });
    const result = await response.json();
    const content = [];

    if (result.data && result.data.length > 0) {
      for (const material of result.data) {
        const title = material.Title || 'Untitled';

        if (material.id) {
          try {
            const videoUrl = `${user.api_base}/get/fetchVideoDetailsById?course_id=${batch_id}&video_id=${material.id}&ytflag=0&folder_wise_course=0`;
            const videoRes = await fetch(videoUrl, { headers });
            const videoData = await videoRes.json();

            if (videoData.data) {
              if (videoData.data.download_link) {
                const link = decryptContent(videoData.data.download_link);
                if (link && !link.includes('.pdf')) {
                  content.push({ title, type: 'video', url: encryptUrl(link) });
                }
              }
              if (videoData.data.video_id) {
                const ytId = decryptContent(videoData.data.video_id);
                if (ytId) {
                  content.push({ title, type: 'video', url: encryptUrl(`https://youtu.be/${ytId}`) });
                }
              }
            }
          } catch (e) {}
        }

        if (material.pdf_link) {
          const pdf = decryptContent(material.pdf_link);
          if (pdf) content.push({ title, type: 'pdf', url: encryptUrl(pdf) });
        }

        if (material.pdf_link2) {
          const pdf2 = decryptContent(material.pdf_link2);
          if (pdf2) content.push({ title, type: 'pdf', url: encryptUrl(pdf2) });
        }
      }
    }

    return res.status(200).json({ success: true, content });

  } catch (error) {
    console.error('Content error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}