const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));
    
    const filePath = `file:///${path.resolve('walk-simulation.html').replace(/\\/g, '/')}`;
    console.log(`Opening ${filePath}...`);
    
    await page.goto(filePath, { waitUntil: 'networkidle0' });
    
    console.log('Done loading. Checking for elements...');
    const canvas = await page.$('#simCanvas');
    console.log('Canvas found:', !!canvas);
    
    await browser.close();
})();
