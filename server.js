const express = require('express');
require('dotenv').config();

// เลือกใช้ local หรือ browserless ตาม environment
const useBrowserless = process.env.USE_BROWSERLESS === 'true' || process.env.BROWSERLESS_TOKEN;

const { createWebPAndUpload } = useBrowserless
  ? require('./create-webp-browserless.js')
  : require('./create-webp-puppeteer.js');

const app = express();
const port = process.env.PORT || 3000;

// Middleware สำหรับจัดการ error แบบรวมศูนย์
const asyncHandler = fn => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Route หลักสำหรับสร้างภาพ
app.get('/', asyncHandler(async (req, res) => {
    const {
        text,
        fontSize = 100,
        quality = 90,
        maxWidth = 700,
        lineHeight = 1.2,
        width = 1080,
        height = 1080
    } = req.query;

    if (!text) {
        return res.status(400).json({
            error: 'กรุณาระบุข้อความ (text parameter)',
            example: `http://localhost:${port}/?text=ทดสอบข้อความ`
        });
    }
    
    // แปลงข้อความที่เข้ารหัส URL กลับมา
    const decodedText = decodeURIComponent(text);

    console.log(`\n📥 ได้รับ request: "${decodedText}"`);
    
    // สร้างออบเจ็กต์ options สำหรับส่งให้ฟังก์ชัน
    const options = {
        text: decodedText,
        fontSize: parseInt(fontSize, 10),
        quality: parseInt(quality, 10),
        maxWidth: parseInt(maxWidth, 10),
        lineHeight: parseFloat(lineHeight),
        width: parseInt(width, 10),
        height: parseInt(height, 10)
    };

    // เรียกใช้ฟังก์ชันจาก puppeteer script
    const imageUrl = await createWebPAndUpload(options);

    // ส่งผลลัพธ์กลับไปเป็น JSON
    res.status(200).json({
        success: true,
        text: decodedText,
        imageUrl: imageUrl
    });
}));

// Route สำหรับหน้าแรก (Info)
app.get('/info', (req, res) => {
    res.status(200).json({
        message: 'Puppeteer Image Generator API',
        usage: `GET /?text=ข้อความ&fontSize=100&quality=90&width=1080&height=1080`,
        example: `http://localhost:${port}/?text=ทดสอบข้อความยาวๆ&width=720&height=1080`,
        aspectRatios: {
            '1:1': 'width=1080&height=1080 (default)',
            '2:3': 'width=720&height=1080',
            '9:16': 'width=1080&height=1920'
        }
    });
});

// Middleware สำหรับจัดการ Error สุดท้าย
app.use((err, req, res, next) => {
    console.error('❌ เกิดข้อผิดพลาดใน Server:', err.stack);
    res.status(500).json({ 
        success: false,
        error: 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์',
        message: err.message 
    });
});


// เริ่มต้น server
app.listen(port, () => {
    console.log(`🚀 Server เริ่มทำงานที่ http://localhost:${port}`);
    console.log(`📖 ดูข้อมูลการใช้งานที่ http://localhost:${port}/info`);
});

module.exports = app;
