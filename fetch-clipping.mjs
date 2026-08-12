// Coleta os posts mais recentes do seu Substack e grava clipping.json.
// Busca o feed com User-Agent de navegador (o Substack rejeita requisições "cruas")
// e faz o parse do texto — mais robusto que deixar o rss-parser buscar sozinho.
import Parser from "rss-parser";
import { fetchText, writeJson, truncate, toTime } from "./lib.mjs";

const SUBSTACK_FEED = "https://marcossorrilha.substack.com/feed";
const ARCHIVE_URL = "https://marcossorrilha.substack.com/archive";
const MAX_ITEMS = 5;

const parser = new Parser({
  customFields: { item: [["content:encoded", "contentEncoded"]] },
});

function fmtDate(dateStr) {
  const t = toTime(dateStr);
  if (!t) return "";
  return new Date(t).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

async function loadFeed() {
  // 1) tenta buscar o XML com nosso User-Agent e parsear o texto
  try {
    const xml = await fetchText(SUBSTACK_FEED, {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    return await parser.parseString(xml);
  } catch (e) {
    console.warn(`  ! fetch direto falhou (${e.message}); tentando parseURL…`);
  }
  // 2) fallback: deixa o rss-parser buscar
  return parser.parseURL(SUBSTACK_FEED);
}

async function main() {
  console.log("Coletando clipping do Substack…");
  const feed = await loadFeed();
  const items = (feed.items || [])
    .map((item) => ({
      title: (item.title || "").trim(),
      link: item.link || "",
      date: fmtDate(item.isoDate || item.pubDate),
      note:
        truncate(item.contentSnippet || item.contentEncoded || "", 150) ||
        "Newsletter do Canal do Sorrilha",
      _t: toTime(item.isoDate || item.pubDate),
    }))
    .filter((it) => it.title && it.link)
    .sort((a, b) => b._t - a._t)
    .slice(0, MAX_ITEMS)
    .map(({ _t, ...rest }) => rest);

  if (items.length === 0) {
    console.error("Nenhum post encontrado — mantendo o clipping.json anterior.");
    process.exitCode = 1;
    return;
  }

  writeJson("clipping.json", {
    updatedAt: new Date().toISOString(),
    archiveUrl: ARCHIVE_URL,
    count: items.length,
    items,
  });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
