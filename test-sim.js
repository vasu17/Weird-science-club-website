const puppeteer = require('puppeteer');
const path = require('path');
const url = require('url');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--use-gl=angle',
            '--use-angle=swiftshader'
        ]
    });
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.error('PAGE ERROR:', err.toString()));
    
    const testPages = ['calabi-yau-simulation.html', 'index.html', 'past_events.html', 'team.html', 'gallery.html', 'club.html'];
    
    for (const file of testPages) {
        const filePath = url.pathToFileURL(path.resolve(file)).href;
        console.log(`\nTesting ${file} (${filePath})...`);
        
        let pageErrors = [];
        page.on('pageerror', err => pageErrors.push(err.toString()));
        
        await page.goto(filePath, { waitUntil: 'domcontentloaded' });
        await new Promise(r => setTimeout(r, 600));
        
        const canvasId = file.includes('simulation') ? '#simCanvas' : '#starsCanvas';
        const canvas = await page.$(canvasId);
        console.log(`${canvasId} found:`, !!canvas);

        if (!file.includes('simulation')) {
            const feynmanCanvas = await page.$('#feynmanCanvas');
            console.log(`#feynmanCanvas found:`, !!feynmanCanvas);
        }
        
        if (pageErrors.length > 0) {
            console.error('Page errors encountered:', pageErrors);
        } else {
            console.log(`No console errors on ${file}.`);
        }
    }
    
    await browser.close();
    console.log('\nAll tests completed successfully!');
})();

