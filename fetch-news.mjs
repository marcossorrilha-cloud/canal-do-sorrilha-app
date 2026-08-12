// Coleta as principais manchetes de política americana e grava data/news.json.
// Seleção POR RECÊNCIA: junta todas as fontes e mantém as 10 mais recentes.
//
// Fontes com RSS nativo confiável: Politico, The Hill, NYT (Politics), WaPo (Politics).
// Fontes sem RSS estável (AP, Axios): usamos o RSS de busca do Google News com
// "site:dominio" — endpoint estável que devolve itens recentes daquele site.
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

// Cada fonte: rótulo exibido + uma ou mais URLs de feed.
// "gnews(dominio)" monta uma busca do Google News restrita ao site, últimas 48h.
const gnews = (site) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(
    `site:${site} when:2d`
  )}&hl=en-US&gl=US&ceid=US:en`;

const SOURCES = [
  { label: "Politico", feeds: ["https://rss.politico.com/politics-news.xml"] },
  { label: "The Hill", feeds: ["https://thehill.com/homenews/feed/"] },
  {
    label: "New York Times",
    feeds: ["https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml"],
  },
  {
    label: "Washington Post",
    feeds: ["https://feeds.washingtonpost.com/rss/politics"],
  },
  { label: "AP News", feeds: [gnews("apnews.com")] },
  { label: "Axios", feeds: [gnews("axios.com")] },
];

// Remove o sufixo " - Nome do Veículo" que o Google News acrescenta aos títulos.
function cleanTitle(title = "", label = "") {
  let t = stripHtml(title);
  t = t.replace(/\s+-\s+[^-]+$/, (m) =>
    m.toLowerCase().includes(label.toLowerCase().split(" ")[0]) ? "" : m
  );
  return t.trim();
}

async function fromSource(src) {
  const out = [];
  for (const url of src.feeds) {
    try {
      const feed = await parser.parseURL(url);
      for (const item of feed.items || []) {
        const title = cleanTitle(item.title || "", src.label);
        const link = item.link || "";
        if (!title || !link) continue;
        const rawSummary =
          item.contentSnippet || item.summary || item.content || "";
        out.push({
          source: src.label,
          title,
          link,
          summary: truncate(rawSummary, 180),
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

  // Remove duplicados por link e por título.
  const seen = new Set();
  items = items.filter((it) => {
    const key = (it.link + "|" + it.title).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Ordena por recência (mais novo primeiro) e mantém os 10 primeiros.
  items.sort((a, b) => b._t - a._t);
  const top = items.slice(0, MAX_ITEMS).map(({ _t, ...rest }) => rest);

  if (top.length === 0) {
    console.error("Nenhum item coletado — mantendo o news.json anterior.");
    process.exitCode = 1;
    return;
  }

  writeJson("data/news.json", {
    updatedAt: new Date().toISOString(),
    count: top.length,
    items: top,
  });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
