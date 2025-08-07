const puppeteer = require('puppeteer');

async function testBrowserless() {
  const BROWSERLESS_URL = 'wss://browserless.lslly.com';
  const BROWSERLESS_TOKEN = '77482ddfd0ec44d1c1a8b55ddf352d98';
  
  let browser;

  console.log(`🚀 กำลังเชื่อมต่อไปยัง ${BROWSERLESS_URL}...`);

  try {
    browser = await puppeteer.connect({
      browserWSEndpoint: `${BROWSERLESS_URL}?token=${BROWSERLESS_TOKEN}`,
    });

    console.log('✅ เชื่อมต่อสำเร็จ!');
    
    const page = await browser.newPage();
    
    console.log('📝 กำลังเปิดหน้าเว็บ example.com...');
    await page.goto('https://example.com');
    
    console.log('📸 กำลังถ่ายภาพหน้าจอ...');
    await page.screenshot({ path: 'test-output.webp', type: 'webp' });

    console.log('🎉 ทดสอบสำเร็จ! สร้างไฟล์ test-output.webp เรียบร้อยแล้ว');

  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดระหว่างการทดสอบ:', error.message);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🚪 ปิดการเชื่อมต่อแล้ว');
    }
  }
}

testBrowserless();

