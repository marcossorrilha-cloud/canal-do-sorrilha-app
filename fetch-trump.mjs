// Atualiza data/trump.json com a aprovação de Trump segundo o Silver Bulletin.
//
// Os números do Silver Bulletin vêm de gráficos, não de uma API — então a extração
// por texto é BEST-EFFORT. A lógica é conservadora:
//   1. Se vierem valores manuais (variáveis de ambiente TRUMP_*), usa-os direto.
//   2. Senão, tenta ler a página/RSS e extrair aprovação, desaprovação e saldo líquido.
//   3. Se a extração falhar ou vier incompleta, MANTÉM os valores anteriores do JSON
//      e apenas marca "stale: true" para você revisar (fallback recomendado no README).
import { fetchText, stripHtml, readJson, writeJson } from "./lib.mjs";

const ARTICLE_URL =
  "https://www.natesilver.net/p/trump-approval-ratings-nate-silver-bulletin";
const FEED_URL = "https://www.natesilver.net/feed";
const SOURCE_LABEL = "Silver Bulletin";

const PREV = readJson("data/trump.json", {
  approval: 38,
  disapproval: 58,
  net: -20.4,
  trend: "Aprovação líquida de -20,4 (Silver Bulletin).",
});

function num(x) {
  const n = parseFloat(String(x).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

// Tenta extrair aprovação / desaprovação / saldo líquido de um bloco de texto.
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
    found = { ...e, ...found }; // prioriza o primeiro que encontrou (artigo)
  }
  return found;
}

async function main() {
  console.log("Atualizando aprovação de Trump…");

  // 1) Override manual via ambiente (usado pelo "Run workflow" com inputs).
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
      net =
        f.net != null
          ? f.net
          : +(approval - disapproval).toFixed(1);
      stale = false;
      const netStr = String(net).replace(".", ",");
      const dateStr = new Date().toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      });
      trend = `Aprovação líquida de ${netStr} (Silver Bulletin, ${dateStr}).`;
      console.log(`  · extraído: aprova ${approval} / desaprova ${disapproval} / líquido ${net}`);
    } else {
      console.warn("  ! não extraí números novos — mantendo os anteriores (stale).");
    }
  }

  writeJson("data/trump.json", {
    updatedAt: new Date().toISOString(),
    source: SOURCE_LABEL,
    sourceUrl: ARTICLE_URL,
    approval,
    disapproval,
    net,
    trend,
    stale, // true = extração falhou; revise/edite manualmente se quiser
  });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
