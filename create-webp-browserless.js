const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const axios = require('axios');
const FormData = require('form-data');

// --- ฟังก์ชัน Helper ---
function wrapText(text, maxWidth, fontSize) {
  const avgCharWidth = fontSize * 0.6;
  const maxCharsPerLine = Math.floor(maxWidth / avgCharWidth);
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        lines.push(word);
      }
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

// --- ฟังก์ชันหาขนาดฟอนต์อัตโนมัติ ---
function findOptimalFontSize(text, options = {}) {
  const {
    maxWidth = 700,
    maxLines = 7,
    maxFontSize = 120,
    minFontSize = 40
  } = options;

  let fontSize = maxFontSize;

  while (fontSize >= minFontSize) {
    const lines = wrapText(text, maxWidth, fontSize);
    if (lines.length <= maxLines) {
      console.log(`   เลือกขนาดฟอนต์ที่เหมาะสม: ${fontSize}px (${lines.length} บรรทัด)`);
      return fontSize;
    }
    fontSize -= 2;
  }

  console.log(`   ข้อความยาวเกินไป, ใช้ขนาดฟอนต์เล็กที่สุด: ${minFontSize}px`);
  return minFontSize;
}

function fontToBase64(fontPath) {
  try {
    // รองรับทั้ง relative และ absolute path
    const fullPath = path.isAbsolute(fontPath) ? fontPath : path.join(process.cwd(), fontPath);
    const fontBuffer = fs.readFileSync(fullPath);
    return fontBuffer.toString('base64');
  } catch (error) {
    console.error(`ไม่สามารถอ่านไฟล์ฟอนต์ ${fontPath}:`, error.message);
    return null;
  }
}

function createHTML(text, fontSize = 100, maxWidth = 700, lineHeight = 1.2, fontPath = "SFThonburi-Bold.ttf") {
  const lines = wrapText(text, maxWidth, fontSize);
  const fontBase64 = fontToBase64(fontPath);
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="UTF-8">
      <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap');
          ${fontBase64 ? `
          @font-face {
              font-family: 'SFThonburi-Bold';
              src: url('data:font/truetype;base64,${fontBase64}') format('truetype');
              font-weight: bold;
          }
          ` : ''}
          body {
              margin: 0;
              padding: 0;
              width: 1080px;
              height: 1080px;
              background-color: #000000;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: ${fontBase64 ? "'SFThonburi-Bold'," : ""} 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', Arial, sans-serif;
          }
          .text-container {
              text-align: center;
              color: white;
              font-size: ${fontSize}px;
              font-weight: bold;
              line-height: ${lineHeight};
          }
          .line {
              display: block;
              margin: 0;
          }
      </style>
  </head>
  <body>
      <div class="text-container">
          ${lines.map(line => `<div class="line">${line}</div>`).join('')}
      </div>
  </body>
  </html>`;
  return htmlContent;
}

async function uploadToFreeimage(base64Image) {
  const apiKey = '6d207e02198a847aa98d0a2a901485a5';
  const form = new FormData();
  form.append('key', apiKey);
  form.append('source', base64Image);
  form.append('format', 'json');

  try {
    console.log('   กำลังอัปโหลดไปยัง Freeimage.host...');
    const response = await axios.post('https://freeimage.host/api/1/upload', form, {
      headers: { ...form.getHeaders() }
    });

    if (response.data && response.data.status_code === 200) {
      console.log('   อัปโหลดสำเร็จ!');
      return response.data.image.url;
    } else {
      throw new Error(`API ตอบกลับมาพร้อมข้อผิดพลาด: ${response.data.status_txt || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('   เกิดข้อผิดพลาดระหว่างการอัปโหลด:', error.message);
    throw error;
  }
}

// --- ฟังก์ชันหลักที่ใช้ Browserless ---
async function createWebPAndUpload(options = {}) {
  const {
    text = "สวัสดีครับ",
    fontSize,
    maxWidth = 700,
    lineHeight = 1.2,
    quality = 90,
    fontPath = "SFThonburi-Bold.ttf",
    autoSize = true
  } = options;

  // ใช้ token จาก environment variable
  const browserlessToken = process.env.BROWSERLESS_TOKEN;
  const browserlessUrl = process.env.BROWSERLESS_URL || 'wss://browserless.lslly.com';

  if (!browserlessToken) {
    throw new Error('กรุณาตั้งค่า BROWSERLESS_TOKEN ใน environment variable');
  }

  // คำนวณขนาดฟอนต์ที่เหมาะสม
  const optimalFontSize = autoSize
    ? findOptimalFontSize(text, { maxWidth })
    : fontSize || 100;

  let browser;

  try {
    console.log('   กำลังเชื่อมต่อกับ Browserless...');

    browser = await puppeteer.connect({
      browserWSEndpoint: `${browserlessUrl}?token=${browserlessToken}`
    });

    const page = await browser.newPage();

    await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 1 });

    const htmlContent = createHTML(text, optimalFontSize, maxWidth, lineHeight, fontPath);

    console.log('   กำลังโหลดเนื้อหา...');
    await page.setContent(htmlContent, { waitUntil: 'load' });

    await page.evaluateHandle('document.fonts.ready');

    console.log('   กำลังถ่ายภาพหน้าจอ...');
    const imageBuffer = await page.screenshot({
      type: 'webp',
      quality: quality,
      encoding: 'base64'
    });

    await browser.close();
    browser = null;

    const imageUrl = await uploadToFreeimage(imageBuffer);

    return imageUrl;

  } catch (error) {
    console.error('   เกิดข้อผิดพลาด:', error.message);
    if (browser) {
      await browser.close();
    }
    throw error;
  }
}

// --- ตัวอย่างการใช้งาน ---
async function main() {
  const longText = `"มีจริงนะ!!คนที่คิด ไม่ดีกับ คนอื่นอิจฉาอยากให้ชีวิต เขาแย่ สุดท้าย..ตัวเองนั่นแหละจะ ล่มจม"`;

  const imageUrl = await createWebPAndUpload({
    text: longText,
    maxWidth: 800,
    quality: 90,
    fontPath: "SFThonburi-Bold.ttf"
  });

  if (imageUrl) {
    console.log('\n   สร้างและอัปโหลดรูปภาพเรียบร้อยแล้ว!');
    console.log('   URL ของรูปภาพ:', imageUrl);
  }
}

// --- ส่วนท้าย ---
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  createWebPAndUpload,
  createHTML,
  wrapText
};
