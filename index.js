const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
      headless:false,
      defaultViewport:false,
  });
  const page = await browser.newPage();
  await page.goto('https://www.amazon.com/s?i=computers-intl-ship&bbn=16225007011&rh=n%3A16225007011%2Cn%3A11036071%2Cp_36%3A1253503011&dc&fs=true&qid=1635596580&rnid=16225007011&ref=sr_pg_1',{
    waitUntil:'load'
  });

  fs.writeFile('results.csv', 'title,price,img\n', (err) => {
      if (err) throw err;
  });

  let Btn_disabled = false;
  while(!Btn_disabled){
      
      await page.waitForSelector('[data-cel-widget="search_result_0"]');
      const product_cards = await page.$$('div.s-main-slot.s-result-list.s-search-results.sg-row > .s-result-item');

      for (const product_card of product_cards ) {

        let price = "Null";
        let title = "Null";
        let img = "Null";

        try{
          title = await page.evaluate(el => el.querySelector('h2 > a > span').textContent , product_card );
        }catch(error){}

        try {
          price = await page.evaluate(el => el.querySelector('span.a-price > span.a-offscreen').textContent , product_card);
        } catch(error) {}

        try{
          img = await page.evaluate(el => el.querySelector('.s-image').getAttribute('src') , product_card );
        }catch(error){}

        if(title !== "Null") {
            fs.appendFile("results.csv",
              `${title.replace(/,/g, ".")},${price},${img}\n`,
              function(err){
                if(err) throw err
              }
            );
        }
      }

      await page.waitForSelector('.s-pagination-item.s-pagination-next',{visible:true});
      let next_disabled = await page.$('span.s-pagination-item.s-pagination-next.s-pagination-disabled') !== null;
      Btn_disabled = next_disabled;

      if(!next_disabled){
        await Promise.all([
          page.click('a.s-pagination-item.s-pagination-next.s-pagination-button.s-pagination-separator'),
          page.waitForNavigation({waitUntil:'networkidle2'})
        ]);
      }
  }

  await browser.close();
})();