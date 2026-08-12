// Atualiza trump.json com a aprovação de Trump segundo o Silver Bulletin.
// Extração best-effort + fallback manual (variáveis TRUMP_*).
import { fetchText, stripHtml, readJson, writeJson } from "./lib.mjs";

const ARTICLE_URL =
  "https://www.natesilver.net/p/trump-approval-ratings-nate-silver-bulletin";
const FEED_URL = "https://www.natesilver.net/feed";
const SOURCE_LABEL = "Silver Bulletin";

const PREV = readJson("trump.json", {
  approval: 38,
  disapproval: 58,
  net: -20.4,
  trend: "Aprovação líquida de -20,4 (Silver Bulletin).",
});

function num(x) {
  const n = parseFloat(String(x).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function extract(text) {
  const t = text.replace(/\s+/g, " ");
  const res = {};
  const net =
    t.match(/net approval(?: rating)?(?: of)?\s*(-?\d{1,2}(?:\.\d)?)/i) ||
    t.match(/approval\s*(?:is|of|at)?\s*(-\d{1,2}(?:\.\d)?)\s*(?:points|pts|net)/i);
  if (net) res.net = num(net[1]);
  const approve =
    t.match(/(\d{2}(?:\.\d)?)\s*%?\s*(?:approve|approval rating)/i) ||
    t.match(/approval rating[^0-9]{0,20}(\d{2}(?:\.\d)?)/i);
  if (approve) res.approval = num(approve[1]);
  const disapprove =
    t.match(/(\d{2}(?:\.\d)?)\s*%?\s*disapprove/i) ||
    t.match(/disapproval[^0-9]{0,20}(\d{2}(?:\.\d)?)/i);
  if (disapprove) res.disapproval = num(disapprove[1]);
  return res;
}

async function scrape() {
  const texts = [];
  for (const url of [ARTICLE_URL, FEED_URL]) {
    try {
      texts.push(stripHtml(await fetchText(url)));
    } catch (e) {
      console.warn(`  ! não consegui ler ${url}: ${e.message}`);
    }
  }
  let found = {};
  for (const txt of texts) {
    const e = extract(txt);
    found = { ...e, ...found };
  }
  return found;
}

async function main() {
  console.log("Atualizando aprovação de Trump…");

  const manual = {
    approval: num(process.env.TRUMP_APPROVAL),
    disapproval: num(process.env.TRUMP_DISAPPROVAL),
    net: num(process.env.TRUMP_NET),
    trend: process.env.TRUMP_TREND || null,
  };
  const hasManual =
    manual.approval != null || manual.disapproval != null || manual.net != null;

  let approval = PREV.approval;
  let disapproval = PREV.disapproval;
  let net = PREV.net;
  let stale = true;
  let trend = PREV.trend;

  if (hasManual) {
    if (manual.approval != null) approval = manual.approval;
    if (manual.disapproval != null) disapproval = manual.disapproval;
    net = manual.net != null ? manual.net : +(approval - disapproval).toFixed(1);
    stale = false;
    trend = manual.trend || `Aprovação líquida de ${net} (Silver Bulletin, ajuste manual).`;
    console.log("  · usando valores manuais.");
  } else {
    const f = await scrape();
    const gotBoth = f.approval != null && f.disapproval != null;
    if (gotBoth || f.net != null) {
      if (f.approval != null) approval = f.approval;
      if (f.disapproval != null) disapproval = f.disapproval;
      net = f.net != null ? f.net : +(approval - disapproval).toFixed(1);
      stale = false;
      const netStr = String(net).replace(".", ",");
      const dateStr = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
      trend = `Aprovação líquida de ${netStr} (Silver Bulletin, ${dateStr}).`;
      console.log(`  · extraído: aprova ${approval} / desaprova ${disapproval} / líquido ${net}`);
    } else {
      console.warn("  ! não extraí números novos — mantendo os anteriores (stale).");
    }
  }

  writeJson("trump.json", {
    updatedAt: new Date().toISOString(),
    source: SOURCE_LABEL,
    sourceUrl: ARTICLE_URL,
    approval,
    disapproval,
    net,
    trend,
    stale,
  });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
