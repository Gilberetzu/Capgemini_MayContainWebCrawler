async function goToProductPage(page, index){
    await page.goto('https://www.tesco.com/groceries/?icid=dchp_groceriesshopgroceries');
    await clickMainMenuElement(page, index);
    await clickSubMenuElement(page);
    await new Promise(resolve => setTimeout(resolve, 5000));
}

async function getMenuNames(page){
    //Get the groceries menu element
    const menu = await page.$('#content > div > div > div.header-wrapper > div > header > div > div.brand-header__navigation > nav > ul > li:nth-child(1) > div > div > ul');
    //Get the element count;
    const elementCount = await menu.evaluateHandle(node => {
        const children = node.children;
        let elements = [];
        for (const child of children) {
            const text = child.firstElementChild.firstElementChild.innerText;
            const lines = text.split('\n');
            elements.push(lines[1]);
        }
        return elements;
    });
    return await elementCount.jsonValue();
}

async function clickMainMenuElement(page, index){
    //Get the groceries menu element
    const menu = await page.$('#content > div > div > div.header-wrapper > div > header > div > div.brand-header__navigation > nav > ul > li:nth-child(1) > div > div > ul');
    //Get the first childern of the menu element
    const clickableMenu = await menu.evaluateHandle((node, index) => {
        const children = node.children;
        return children[index].firstElementChild;
    }, index);
    await clickableMenu.click();
}

async function clickSubMenuElement(page){
    //Get the sub menu element
    await page.waitForXPath('//*[@class="menu menu-department"]', {
        visible: true
    });
    const childMenu = (await page.$x('//*[@class="menu menu-department"]'))[0];
    //Get the fisrt childen of the sub menu element
    const groceriesMenu = await childMenu.evaluateHandle(node => {
        const children = node.children;
        return children[0].firstElementChild;
    });
    await groceriesMenu.click();
}

module.exports = {
    goToProductPage: goToProductPage,
    getMenuNames: getMenuNames,
    clickMainMenuElement: clickMainMenuElement,
    clickSubMenuElement: clickSubMenuElement
}