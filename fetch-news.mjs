// Coleta as principais manchetes de política americana e grava news.json.
// Seleção POR RECÊNCIA: junta todas as fontes e mantém as 10 mais recentes.
import Parser from "rss-parser";
import { writeJson, stripHtml, truncate, toTime } from "./lib.mjs";

const MAX_ITEMS = 10;
const parser = new Parser({
  timeout: 20000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  },
});

const gnews = (site) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(
    `site:${site} when:2d`
  )}&hl=en-US&gl=US&ceid=US:en`;

const SOURCES = [
  { label: "Politico", feeds: ["https://rss.politico.com/politics-news.xml"] },
  { label: "The Hill", feeds: ["https://thehill.com/homenews/feed/"] },
  { label: "New York Times", feeds: ["https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml"] },
  { label: "Washington Post", feeds: ["https://feeds.washingtonpost.com/rss/politics"] },
  { label: "AP News", feeds: [gnews("apnews.com")] },
  { label: "Axios", feeds: [gnews("axios.com")] },
];

function cleanTitle(title = "") {
  return stripHtml(title).replace(/\s+-\s+[^-]+$/, "").trim();
}

async function fromSource(src) {
  const out = [];
  for (const url of src.feeds) {
    try {
      const feed = await parser.parseURL(url);
      for (const item of feed.items || []) {
        const title = cleanTitle(item.title || "");
        const link = item.link || "";
        if (!title || !link) continue;
        out.push({
          source: src.label,
          title,
          link,
          summary: truncate(item.contentSnippet || item.summary || item.content || "", 180),
          publishedAt: item.isoDate || item.pubDate || "",
          _t: toTime(item.isoDate || item.pubDate),
        });
      }
      console.log(`  · ${src.label}: ${feed.items?.length || 0} itens`);
    } catch (err) {
      console.warn(`  ! ${src.label} falhou (${url}): ${err.message}`);
    }
  }
  return out;
}

async function main() {
  console.log("Coletando notícias…");
  const results = await Promise.all(SOURCES.map(fromSource));
  let items = results.flat();

  const seen = new Set();
  items = items.filter((it) => {
    const key = (it.link + "|" + it.title).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  items.sort((a, b) => b._t - a._t);
  const top = items.slice(0, MAX_ITEMS).map(({ _t, ...rest }) => rest);

  if (top.length === 0) {
    console.error("Nenhum item coletado — mantendo o news.json anterior.");
    process.exitCode = 1;
    return;
  }

  writeJson("news.json", { updatedAt: new Date().toISOString(), count: top.length, items: top });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
