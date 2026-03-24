import { connectToDatabase, getAllUsers, verifyAdmin } from '../utils/db.js';
import { decryptContent, encryptUrl } from '../utils/crypto.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, password, mobile, batch_id } = req.query;
    const isValid = await verifyAdmin(username, password);
    if (!isValid) return res.status(401).json({ error: 'Invalid admin credentials' });

    if (!mobile || !batch_id) {
      return res.status(400).json({ error: 'Mobile and batch_id required' });
    }

    await connectToDatabase();
    const users = await getAllUsers();
    const user = users.find(u => u.mobile === mobile);
    
    if (!user) return res.status(404).json({ error: 'User not found' });

    const batch = user.purchased_batches?.find(b => b.batch_id === parseInt(batch_id));
    if (!batch) return res.status(404).json({ error: 'Batch not found for this user' });

    const encodeHeader = (str) => {
      try {
        return btoa(unescape(encodeURIComponent(str)));
      } catch (e) {
        return "";
      }
    };

    const headers = {
      "Client-Service": "Appx",
      "source": "website",
      "Auth-Key": "appxapi",
      "Authorization": user.token,
      "User-ID": encodeHeader(user.user_id)
    };

    // Get all subjects
    const subjectsUrl = `${user.api_base}/get/allsubjectfrmlivecourseclass?courseid=${batch_id}&start=-1`;
    const subjectsRes = await fetch(subjectsUrl, { headers });
    const subjectsData = await subjectsRes.json();

    const allContent = [];

    if (subjectsData.data && subjectsData.data.length > 0) {
      for (const subject of subjectsData.data) {
        // Get topics for each subject
        const topicsUrl = `${user.api_base}/get/alltopicfrmlivecourseclass?courseid=${batch_id}&subjectid=${subject.subjectid}&start=-1`;
        const topicsRes = await fetch(topicsUrl, { headers });
        const topicsData = await topicsRes.json();

        if (topicsData.data && topicsData.data.length > 0) {
          for (const topic of topicsData.data) {
            // Get content for each topic
            const contentUrl = `${user.api_base}/get/livecourseclassbycoursesubtopconceptapiv3?courseid=${batch_id}&subjectid=${subject.subjectid}&topicid=${topic.topicid}&conceptid=&start=-1`;
            const contentRes = await fetch(contentUrl, { headers });
            const contentData = await contentRes.json();

            if (contentData.data && contentData.data.length > 0) {
              for (const material of contentData.data) {
                const title = material.Title || `${subject.subject_name} - ${topic.topic_name}`;

                if (material.id) {
                  try {
                    const videoUrl = `${user.api_base}/get/fetchVideoDetailsById?course_id=${batch_id}&video_id=${material.id}&ytflag=0&folder_wise_course=0`;
                    const videoRes = await fetch(videoUrl, { headers });
                    const videoData = await videoRes.json();

                    if (videoData.data) {
                      if (videoData.data.download_link) {
                        const link = decryptContent(videoData.data.download_link);
                        if (link && !link.includes('.pdf')) {
                          allContent.push({ 
                            title, 
                            type: 'video', 
                            url: encryptUrl(link), 
                            subject: subject.subject_name, 
                            topic: topic.topic_name 
                          });
                        }
                      }
                      if (videoData.data.video_id) {
                        const ytId = decryptContent(videoData.data.video_id);
                        if (ytId) {
                          allContent.push({ 
                            title, 
                            type: 'video', 
                            url: encryptUrl(`https://youtu.be/${ytId}`), 
                            subject: subject.subject_name, 
                            topic: topic.topic_name 
                          });
                        }
                      }
                    }
                  } catch (e) {}
                }

                if (material.pdf_link) {
                  const pdf = decryptContent(material.pdf_link);
                  if (pdf) allContent.push({ 
                    title, 
                    type: 'pdf', 
                    url: encryptUrl(pdf), 
                    subject: subject.subject_name, 
                    topic: topic.topic_name 
                  });
                }

                if (material.pdf_link2) {
                  const pdf2 = decryptContent(material.pdf_link2);
                  if (pdf2) allContent.push({ 
                    title, 
                    type: 'pdf', 
                    url: encryptUrl(pdf2), 