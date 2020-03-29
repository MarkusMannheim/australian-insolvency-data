puppeteer = require("puppeteer"),
d3 = require("d3"),
fs = require("fs");

async function scrape() {
  console.log("scrape()");
  browser = await puppeteer.launch({headless: true}),
  page = await browser.newPage();
  console.log("establish datasets");
  states = ["Queensland", "New South Wales", "Victoria", "South Australia", "Western Australia", "Tasmania", "Northern Territory", "Australian Capital Territory"];
  state = 0;
  insolvencyData = [];
  return new Promise(async function(resolve, reject) {
    try {
      while (state < states.length) {
        console.log("load notices for " + states[state]);
        await page.goto("https://insolvencynotices.asic.gov.au/browsesearch-notices/");
        await page.waitFor(2000);
        console.log("click advanced search");
        await page.click("#advanced-search");
        await page.waitFor(2000);
        console.log("click " + states[state]);
        await page.click("input[value='" + states[state] + "']");
        await page.waitFor(2000);
        console.log("click search");
        await page.click(".button.float-right");
        await page.waitFor(2000);
        console.log("evaluate page " + page);
        // page = 1;
        // pagesLeft = true;
        // while (pagesLeft) {
        let data = await page.evaluate(function() {
          let entries = document.querySelectorAll(".article-block");
          let response = { data: [], options: [] };
          entries.forEach(function(d) {
            let datum = {};
            datum.date = d.querySelector(".published-date").innerText.replace("Published: ", "");
            datum.business = d.querySelectorAll("p:nth-child(3)")[0].innerText;
            datum.acn = d.querySelector("dd").innerText;
            datum.status = d.querySelectorAll("dd:last-child")[0].innerText;
            datum.type = d.querySelector("h3").innerText;
            response.data = response.data.concat(datum);
          });
          document.querySelectorAll(".NoticeTablePager tr td")
            .forEach(function(d) { isNaN(d.innerText) ? response.options.push(d.innerText) : response.options.push(+d.innerText); });
          return response;
        });
        data.data
          .forEach(function(d) {
            d.state = states[state];
          });
        console.log(data.data);
        insolvencyData = insolvencyData.concat(data.data);
        console.log(data.options);
        // pagesLeft = false;
        // }
        state += 1;
      }
      browser.close();
      return resolve(insolvencyData);
    } catch (error) {
      return reject(error);
    }
  });
}

scrape()
  .then(console.log)
  .catch(console.error);
