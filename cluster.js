const fs = require('fs');
const { Cluster } = require('puppeteer-cluster');

fs.writeFile('results.csv','title,price,img\n', 
    (err) => {
        if (err) throw err;
    }
);

const urls = [
  "https://www.amazon.com/s?k=amazonbasics&pd_rd_r=03e5e33c-4faf-452d-8173-4a34efcf3524&pd_rd_w=EQNRr&pd_rd_wg=PygJX&pf_rd_p=9349ffb9-3aaa-476f-8532-6a4a5c3da3e7&pf_rd_r=8RYH7VRZ4HSKWWG0NEX3&ref=pd_gw_unk",
  "https://www.amazon.com/s?k=oculus&i=electronics-intl-ship&pd_rd_r=03e5e33c-4faf-452d-8173-4a34efcf3524&pd_rd_w=iMBhG&pd_rd_wg=PygJX&pf_rd_p=5c71b8eb-e4c7-4ea1-bf40-b57ee72e089f&pf_rd_r=8RYH7VRZ4HSKWWG0NEX3&ref=pd_gw_unk",
];

(async () => {

  const cluster = await Cluster.launch({
    concurrency: Cluster.CONCURRENCY_PAGE,
    maxConcurrency: 2,
    monitor: true,
    puppeteerOptions:{
      headless:false,
      defaultViewport:false
    }
  });

  await cluster.task(async ({ page, data: url }) => {

    await page.goto(url);

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
  });

  for (const url of urls) {
    await cluster.queue(url);
  }

  await cluster.idle();
  await cluster.close();
})();