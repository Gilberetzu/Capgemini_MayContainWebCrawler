const puppeteer = require('puppeteer');
const crawlProductPage = require('./crawlProductPage.js').crawlProductPage;
const mainMenuPage = require('./mainMenuPage.js');



async function screenshotEachPage(page, menuNames){
    for (let i = 0; i < menuNames.length - 1; i++) {
        await goToProductPage(page, i);
        await page.screenshot({ path: `${menuNames[i]}.png` });
    }
}

(async () => {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();

    //Go to main page
    await page.goto('https://www.tesco.com/groceries/?icid=dchp_groceriesshopgroceries');
    const menuNames = await mainMenuPage.getMenuNames(page);

    /*await screenshotEachPage(page, menuNames);
    await browser.close();*/

    await crawlProductPage(page, 3, 1);
    await browser.close();
    //await crawlPage(page, 3);
})();