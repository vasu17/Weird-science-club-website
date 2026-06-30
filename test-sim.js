const puppeteer = require('puppeteer');
const path = require('path');
const url = require('url');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-gpu',
            '--disable-software-rasterizer'
        ]
    });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));
    
    const filePath = url.pathToFileURL(path.resolve('fractal-simulation.html')).href;
    console.log(`Opening ${filePath}...`);
    
    await page.goto(filePath, { waitUntil: 'domcontentloaded' });
    
    console.log('Done loading. Checking for elements...');
    const canvas = await page.$('#simCanvas');
    console.log('Canvas found:', !!canvas);
    
    await browser.close();
})();
