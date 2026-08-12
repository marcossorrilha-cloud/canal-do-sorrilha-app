// Coleta os posts mais recentes do seu Substack e grava data/clipping.json.
// Mostra os 5 mais recentes; a aba tem link para o arquivo completo do Substack.
import Parser from "rss-parser";
import { writeJson, truncate, toTime } from "./lib.mjs";

const SUBSTACK_FEED = "https://marcossorrilha.substack.com/feed";
const ARCHIVE_URL = "https://marcossorrilha.substack.com/archive";
const MAX_ITEMS = 5;

const parser = new Parser({
  timeout: 20000,
  customFields: { item: [["content:encoded", "contentEncoded"]] },
});

// Formata a data como dd/mm/aaaa (fuso de Brasília).
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

async function main() {
  console.log("Coletando clipping do Substack…");
  const feed = await parser.parseURL(SUBSTACK_FEED);
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

  writeJson("data/clipping.json", {
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
