const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = 3, delayMs = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${url}: ${error.message}. Retrying...`);
      if (i < retries - 1) {
        await delay(delayMs);
      } else {
        throw error;
      }
    }
  }
}

async function fetchSGF(startPage, endPage) {
  const baseUrl = "https://kifudepot.net/index.php?page=";
  const sgfData = [];

  for (let page = startPage; page <= endPage; page++) {
    const url = `${baseUrl}${page}`;
    console.log(`Fetching main page: ${url}`);

    try {
      const html = await fetchWithRetry(url);
      const $ = cheerio.load(html);

      const links = [];
      $("a[href^='kifucontents.php?id=']").each((_, el) => {
        if (!$(el).closest("div.popularKifu").length) {
          links.push($(el).attr("href"));
        }
      });

      console.log(`Found ${links.length} links on page ${page}`);

      for (const link of links) {
        const detailUrl = `https://kifudepot.net/${link}`;
        console.log(`Fetching detail page: ${detailUrl}`);

        const detailHtml = await fetchWithRetry(detailUrl);
        const $$ = cheerio.load(detailHtml);

        const sgf = $$("textarea#sgf").text().trim();
        if (sgf) {
          const hash = Buffer.from(sgf).toString("base64");
          if (!sgfData[hash]) {
            sgfData[hash] = { detailUrl, sgf };
            const outputFilePath = `./data/sgf_data.json`;
            const fileContent = fs.readFileSync(outputFilePath, "utf-8");
            currentData = fileContent.trim() ? JSON.parse(fileContent) : [];
            currentData.push(sgfData[hash]);
            fs.writeFileSync(outputFilePath, JSON.stringify(currentData, null, 2), "utf-8");
            console.log(`New SGF added from ${detailUrl}`);
          } else {
            console.log(`Duplicate SGF skipped for ${detailUrl}`);
          }
        } else {
          console.log(`No SGF data found for: ${detailUrl}`);
        }
      }
    } catch (error) {
      console.error(`Error fetching page ${page}: ${error.message}`);
    }

    // サーバーへの負荷軽減のために待機
    await delay(1000);
  }
}

// 実行
(async () => {
  const startPage = 1; // 開始ページ
  const endPage = 3; // 終了ページ

  await fetchSGF(startPage, endPage);
})();