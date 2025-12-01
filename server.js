// server.js

// 1. นำเข้า packages (แบบ ES Module)
import 'dotenv/config'; 
import express from 'express'; 
import cors from 'cors';
import OpenAI from 'openai';

const app = express();
const port = process.env.PORT || 3000; 

// 2. การตั้งค่า OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'YOUR_FALLBACK_KEY', 
});

// Assistant ID ที่ใช้ในการสร้าง Run
const ASSISTANT_ID = 'asst_u3CYocbChFJ74LdmICzvC5qB'; 

// 3. Middlewares
app.use(cors()); 
app.use(express.json()); 

// 4. Endpoint สำหรับการแชท
app.post('/chat', async (req, res) => {
  let currentThreadId = req.body.threadId || null; 
  const { message } = req.body;

  try {
    // 4.1 จัดการ Thread
    if (!currentThreadId) {
      const thread = await openai.beta.threads.create();
      currentThreadId = thread.id;
      console.log(`Created new thread: ${currentThreadId}`);
    }

    // 4.2 เพิ่มข้อความของผู้ใช้
    await openai.beta.threads.messages.create(currentThreadId, {
      role: "user", 
      content: message
    });

    
    // 4.3 สร้าง Run และรอให้เสร็จ
let run = await openai.beta.threads.runs.createAndPoll(currentThreadId, {
  assistant_id: ASSISTANT_ID
});

console.log(`Run completed with status: ${run.status}`);

if (run.status === 'failed' || run.status === 'expired' || run.status === 'cancelled') {
  throw new Error(`Run failed: ${run.last_error?.message || run.status}`);
}
    

// 4.5 ดึงข้อความตอบกลับ
    const messages = await openai.beta.threads.messages.list(currentThreadId, { 
      order: 'desc', 
      limit: 1 
    });
    const replyMessage = messages.data[0].content[0].text.value;

    // 4.6 ส่งคำตอบกลับไปที่ React Native
    res.json({
      reply: replyMessage,
      newThreadId: currentThreadId 
    });

  } catch (error) {
    console.error('Error processing chat request:', error);
    res.status(500).json({ error: 'Failed to communicate with GPT Assistant' });
  }
});

// 5. เริ่มต้น Server
app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});