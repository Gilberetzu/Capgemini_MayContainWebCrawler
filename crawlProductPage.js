const fs = require('fs');
const axios = require('axios');
const mainMenuPage = require('./mainMenuPage.js');

async function getPageCount(page){
    //Get amount of pages in product section
    const paginationElement = (await page.$x('//*[@id="product-list"]/div[2]/div[5]/nav/ul'))[0];
    const pageCount = parseInt(await (await paginationElement.evaluateHandle(node => {
        const children = node.children;
        return children[children.length - 2].firstElementChild.text;
    })).jsonValue());
    return pageCount;
}

async function accessProductPage(pageNumber, page, productPageUrl){
    await page.goto(`${productPageUrl}?page=${pageNumber}`);
    await page.waitForXPath('//*[@class="product-list grid"]', {
        visible: true
    });
}

async function getProductCountInPage(pageNumber, page, porductPageUrl){
    await accessProductPage(pageNumber, page, porductPageUrl);
    const productGrid = (await page.$x('//*[@class="product-list grid"]'))[0];
        //Get Product Count
    const productCount = await (await productGrid.evaluateHandle(async node => {
        const children = node.children;
        return children.length;
    })).jsonValue();

    return productCount;
}

async function accessProductDetailsPage(productIndex, page){
    //Get the product grid again, to make sure it is not an stale element
    const productGrid = (await page.$x('//*[@class="product-list grid"]'))[0];
    //Get the element with index j and click it
    const productCard = await (await productGrid.evaluateHandle(async (node,index) => {
        const children = node.children;
        return children[index].querySelector('div > div > div > div > div > div > h3 > a');
    }, productIndex)).asElement();
    await productCard.click();

    await page.waitForXPath('//*[@class="product-details-tile__title"]',{
        visible: true
    });
}

async function getProductName(page){
    const productNameElement = (await page.$x('//*[@class="product-details-tile__title"]'))[0];
    const name = await (await productNameElement.evaluateHandle(node => {
        return node.innerText;
    })).jsonValue();
    return name;
}

async function getProductAllergens(page){
    const allergens = await (await page.evaluateHandle(() => {
        let allergens = new Set();

        const ingredientElement = document.getElementById('ingredients');
        if(ingredientElement != null){
            const ingredients = ingredientElement.getElementsByTagName('strong');
            for (const ingredient of ingredients) {
                let ingredientText = ingredient.innerText.toLowerCase();
                if(ingredientText.includes('ingredient')){
                    allergens.add(ingredient.innerText.toLowerCase());
                }
            }
        }

        const allergensElement = document.getElementById('allergens');
        if(allergensElement != null){
            //Get allergy lines
            const allergenLines = allergensElement.querySelector('ul').getElementsByTagName('li');
            const possibleStarts = [
                'may contain:',
                'contains:',
                'contains',
                'contain:',
                'contain',
            ];
            //Get allergies from each line
            for (const allergenLine of allergenLines) {
                let allergies = allergenLine.innerText.toLowerCase();
                for (const possible of possibleStarts) {
                    //Check if the allergy line has the correct start
                    if(allergies.slice(0, possible.length) == possible){
                        const possibleAllergies = [];
                        const allergyValues = allergies.slice(possible.length).split(',');
                        
                        for (const allergyValue of allergyValues) {
                            possibleAllergies.push(allergyValue.toLowerCase().trim());
                        }

                        //Recunstructing elements that have a parenthesis and commas
                        let possibleAllergy = "";
                        for (const allergyValue of possibleAllergies) {
                            if(possibleAllergy){
                                possibleAllergy += allergyValue;
                                if(allergyValue.includes(')')){
                                    allergens.add(possibleAllergy.toLowerCase().trim());
                                    possibleAllergy = "";
                                }else{
                                    possibleAllergy += ' , ';
                                }
                            }else{
                                if(allergyValue.includes('(')){
                                    possibleAllergy += allergyValue + ' , ';
                                }else{
                                    allergens.add(allergyValue.toLowerCase().trim());
                                }
                            }
                        }
                        break;
                    }
                }
            }
        }

        return Array.from(allergens);
    })).jsonValue();
    return allergens;
}

async function getProductImageSrc(page){
    const productImageElement = (await page.$x('//*[@class="product-image__container"]'))[0];
    const imageSrc = await (await productImageElement.evaluateHandle(node => {
        return node.firstElementChild.src;
    })).jsonValue();
    return imageSrc;
}

async function downloadProductImages(productInfoArray){
    const Axios = axios.default;
    for (let i = 0; i < productInfoArray.length; i++) {
        const product = productInfoArray[i];
        const response = await Axios.request({
            url:product.imageSrc,
            method: 'get',
            responseType: 'stream'
        });
        const productPath = __dirname + `/images/product${i}.png`;
        var writeStream = fs.createWriteStream(productPath);
        await response.data.pipe(writeStream);

        productInfoArray[i].imagePath = productPath.replace('\\\\','\\').replace('/', '\\');
    }
}

async function crawlProductPage(page, menuNumber, pageAmount = 0){
    await mainMenuPage.goToProductPage(page, menuNumber);
    
    const productPageUrl = await page.url();

    const pageCount = await getPageCount(page); //The amount of product pages

    //This is where all the information from all the products is going to be stored
    let productInfoArray = [];
    
    let pagesToCheckCount = pageAmount == 0? pageCount : pageAmount;
    for (let pageNumber = 1; pageNumber <= pagesToCheckCount; pageNumber++) {
        const productCount = await getProductCountInPage(pageNumber, page, productPageUrl)
        
        //Check each product
        for (let productIndex = 0; productIndex < productCount; productIndex++) {
            await accessProductPage(pageNumber, page, productPageUrl);
            await accessProductDetailsPage(productIndex, page);

            const productInformation = {};

            productInformation.name = await getProductName(page);
            productInformation.allergens = await getProductAllergens(page);
            productInformation.imageSrc = await getProductImageSrc(page);

            productInfoArray.push(productInformation);
        }
    }

    await downloadProductImages(productInfoArray);

    fs.writeFileSync(__dirname + '/productInfo.json', JSON.stringify(productInfoArray));
}

module.exports = {
    crawlProductPage: crawlProductPage
};