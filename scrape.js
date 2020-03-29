puppeteer = require("puppeteer");
fs = require("fs");

async function scrape(state) {
  console.log("establish datasets & browser");
  states = ["Queensland", "New South Wales", "Victoria", "South Australia", "Western Australia", "Tasmania", "Northern Territory", "Australian Capital Territory"];
  state = 0;
  browser = await puppeteer.launch({headless: true}),
  page = await browser.newPage();
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
        pageNo = 1;
        pagesLeft = true;
        while (pagesLeft) {
          await page.waitFor(2000);
          console.log("evaluate page " + pageNo);
          let pageData = await page.evaluate(scrapeEntries);
          pageData.data
            .forEach(function(d) {
              d.state = states[state];
            });
          // console.log(pageData.data);
          insolvencyData = insolvencyData.concat(pageData.data);
          pageNo += 1;
          if (pageData.options.includes(pageNo)) {
            let clickTarget = pageData.options.indexOf(pageNo) + 1;
            await page.click(".NoticeTablePager tr td:nth-child(" + clickTarget + ")");
          } else if (pageData.options[pageData.options.length - 2] == "...") {
            let clickTarget = pageData.options.length - 1;
            await page.click(".NoticeTablePager tr td:nth-child(" + clickTarget + ")");
          } else {
            pagesLeft = false;
          }
        }
        state += 1;
        fs.writeFile("insolvencyData.json", JSON.stringify(insolvencyData), function(data) {
          console.log("insolvencyData.json updated");
        });
      }
      browser.close();
      return resolve(insolvencyData);
    } catch (error) {
      return reject(error);
    }
  });
}

function scrapeEntries() {
  let entries = document.querySelectorAll(".article-block");
  let pageData = { data: [], options: [] };
  entries.forEach(function(d) {
    let datum = {};
    datum.date = d.querySelector(".published-date").innerText.replace("Published: ", "");
    datum.business = d.querySelectorAll("p:nth-child(3)")[0].innerText;
    datum.acn = d.querySelector("dd").innerText;
    datum.status = d.querySelectorAll("dd:last-child")[0].innerText;
    datum.type = d.querySelector("h3").innerText;
    pageData.data = pageData.data.concat(datum);
  });
  document.querySelectorAll(".NoticeTablePager tr td")
    .forEach(function(d) { isNaN(d.innerText) ? pageData.options.push(d.innerText) : pageData.options.push(+d.innerText); });
  return pageData;
}

scrape()
  .then(console.log)
  .catch(console.error);
