// scrape.js
import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";

async function getLiveIPL() {
  const { data } = await axios.get("https://www.cricbuzz.com/cricket-match/live-scores");
  const $ = cheerio.load(data);

  let match = null;

  $("a[href*='ipl']").each((i, el) => {
    const parent = $(el).closest("div");

    if (parent.text().includes("LIVE")) {
      match = {
        title: $(el).text().trim(),
        link: "https://www.cricbuzz.com" + $(el).attr("href"),
        status: "LIVE"
      };
    }
  });

  if (!match) {
    match = { message: "No live IPL match" };
  }

  // save JSON
  fs.writeFileSync("live.json", JSON.stringify(match, null, 2));
}

getLiveIPL();