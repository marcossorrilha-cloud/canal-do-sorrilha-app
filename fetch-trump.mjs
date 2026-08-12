// Atualiza trump.json com a aprovação de Trump segundo o Silver Bulletin.
//
// A raspagem é best-effort e VALIDADA: nunca aceita valor implausível (foi o que
// deixou "12%" aparecer). Prioriza o "net approval" (número que o Silver Bulletin
// escreve no texto). Se nada confiável for extraído, mantém o último valor bom e
// marca stale=true. Também aceita override manual pelas variáveis TRUMP_*.
import { fetchText, stripHtml, readJson, writeJson } from "./lib.mjs";

const ARTICLE_URL =
  "https://www.natesilver.net/p/trump-approval-ratings-nate-silver-bulletin";
const FEED_URL = "https://www.natesilver.net/feed";
const SOURCE_LABEL = "Silver Bulletin";

// Faixas plausíveis (aprovação de um presidente moderno raramente sai disso).
const OK_APPROVAL = (v) => v != null && v >= 25 && v <= 60;
const OK_DISAPPROVAL = (v) => v != null && v >= 35 && v <= 70;
const OK_NET = (v) => v != null && v >= -45 && v <= 20;

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
    t.match(/net approval(?: rating)?(?: of| is| at| stands at)?\s*(-?\d{1,2}(?:\.\d)?)/i) ||
    t.match(/approval\s*(?:of|at)?\s*(-\d{1,2}(?:\.\d)?)\s*(?:points|pts)/i);
  if (net) res.net = num(net[1]);
  const approve = t.match(/(\d{2}(?:\.\d)?)\s*%\s*(?:approve|approval)/i);
  if (approve) res.approval = num(approve[1]);
  const disapprove = t.match(/(\d{2}(?:\.\d)?)\s*%\s*disapprove/i);
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
    found = { ...e, ...found }; // prioriza o primeiro (artigo)
  }
  return found;
}

function fmtDate() {
  return new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

async function main() {
  console.log("Atualizando aprovação de Trump…");

  // Começa dos valores anteriores (bons) e só troca o que for validado.
  let approval = PREV.approval;
  let disapproval = PREV.disapproval;
  let net = PREV.net;
  let trend = PREV.trend;
  let stale = true;

  // 1) Override manual (Run workflow com inputs).
  const m = {
    approval: num(process.env.TRUMP_APPROVAL),
    disapproval: num(process.env.TRUMP_DISAPPROVAL),
    net: num(process.env.TRUMP_NET),
    trend: process.env.TRUMP_TREND || null,
  };
  if (m.approval != null || m.disapproval != null || m.net != null) {
    if (m.approval != null) approval = m.approval;
    if (m.disapproval != null) disapproval = m.disapproval;
    net = m.net != null ? m.net : +(approval - disapproval).toFixed(1);
    trend = m.trend || `Aprovação líquida de ${String(net).replace(".", ",")} (Silver Bulletin, ajuste manual).`;
    stale = false;
    console.log("  · usando valores manuais.");
  } else {
    // 2) Raspagem validada.
    const f = await scrape();

    // Só aceita o par aprovação/desaprovação se AMBOS forem plausíveis
    // e coerentes (desaprovação > aprovação, como é o caso do Trump).
    if (OK_APPROVAL(f.approval) && OK_DISAPPROVAL(f.disapproval) && f.disapproval > f.approval) {
      approval = f.approval;
      disapproval = f.disapproval;
      stale = false;
      console.log(`  · split aceito: ${approval} / ${disapproval}`);
    } else if (f.approval != null || f.disapproval != null) {
      console.warn(`  ! split rejeitado (implausível): ${f.approval} / ${f.disapproval}`);
    }

    // net: aceita se plausível; senão deriva do split atual.
    if (OK_NET(f.net)) {
      net = f.net;
      stale = false;
      console.log(`  · net aceito: ${net}`);
    } else if (!stale) {
      net = +(approval - disapproval).toFixed(1);
    }

    if (!stale) {
      trend = `Aprovação líquida de ${String(net).replace(".", ",")} (Silver Bulletin, ${fmtDate()}).`;
    } else {
      console.warn("  ! nada confiável extraído — mantendo o valor anterior (stale).");
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
