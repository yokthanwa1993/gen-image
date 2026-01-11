const fs = require('fs');
const sharp = require('sharp');
const satori = require('satori').default;
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

// --- ฟังก์ชันสำหรับอัปโหลดรูปภาพ ---
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

// --- ฟังก์ชันหลักที่ใช้ Satori + Sharp ---
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

  try {
    console.log('   เริ่มสร้างภาพด้วย Satori + Sharp...');

    // คำนวณขนาดฟอนต์ที่เหมาะสม
    const optimalFontSize = autoSize
      ? findOptimalFontSize(text, { maxWidth })
      : fontSize || 100;

    // โหลดฟอนต์
    const fontData = fs.readFileSync(fontPath);

    // แยกข้อความเป็นบรรทัด
    const lines = wrapText(text, maxWidth, optimalFontSize);

    console.log('   กำลังสร้าง SVG ด้วย Satori...');

    // สร้าง SVG ด้วย Satori
    const svg = await satori(
      {
        type: 'div',
        props: {
          style: {
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#000000',
          },
          children: lines.map(line => ({
            type: 'div',
            props: {
              style: {
                color: 'white',
                fontSize: optimalFontSize,
                fontWeight: 'bold',
                lineHeight: lineHeight,
                textAlign: 'center',
              },
              children: line,
            },
          })),
        },
      },
      {
        width: 1080,
        height: 1080,
        fonts: [
          {
            name: 'ThaiFont',
            data: fontData,
            weight: 700,
            style: 'normal',
          },
        ],
      }
    );

    console.log('   กำลังแปลง SVG เป็น WebP...');

    // แปลง SVG เป็น WebP ด้วย Sharp
    const imageBuffer = await sharp(Buffer.from(svg))
      .webp({ quality })
      .toBuffer();

    console.log('   สร้างภาพสำเร็จ!');

    // แปลงเป็น base64 แล้วอัปโหลด
    const base64Image = imageBuffer.toString('base64');
    const imageUrl = await uploadToFreeimage(base64Image);

    return imageUrl;

  } catch (error) {
    console.error('   เกิดข้อผิดพลาด:', error.message);
    throw error;
  }
}

// --- ตัวอย่างการใช้งาน ---
async function main() {
  const imageUrl = await createWebPAndUpload({
    text: 'อยากกลับไป "เป็นเด็ก" แล้วรีเซ็ททางเดินชีวิต ของตัวเองใหม่',
    maxWidth: 700,
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
  wrapText,
  findOptimalFontSize
};
