// Coleta as principais manchetes de política americana e grava news.json.
//
// Regras (pedidas pelo Marcos):
//  - Fontes, em ordem de preferência: Politico > Axios > AP > The Hill > NYT > WSJ.
//  - Em caso de matéria repetida (mesmo assunto), NÃO poluir: manter só 1 representante,
//    preferindo fonte SEM paywall e, depois, a ordem de preferência acima.
//  - Exceção: quando o mesmo assunto tem cobertura de lados opostos (um veículo de
//    esquerda, ex. NYT, e um de direita, ex. WSJ), manter 2 — um de cada lado.
//  - A lista final é ordenada por recência (mais novo primeiro), top 10.
import Parser from "rss-parser";
import { writeJson, stripHtml, truncate, toTime, translateToPt } from "./lib.mjs";

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

// pref = ordem de preferência (menor = melhor). lean = viés (para a regra dos 2 lados).
// paywall = true quando a fonte costuma cobrar (usamos para preferir as gratuitas).
const SOURCES = [
  { label: "Politico", pref: 1, lean: "center", paywall: false, feeds: ["https://rss.politico.com/politics-news.xml"] },
  { label: "Axios", pref: 2, lean: "center", paywall: false, feeds: [gnews("axios.com")] },
  { label: "AP News", pref: 3, lean: "center", paywall: false, feeds: [gnews("apnews.com")] },
  { label: "The Hill", pref: 4, lean: "center", paywall: false, feeds: ["https://thehill.com/homenews/feed/"] },
  { label: "New York Times", pref: 5, lean: "left", paywall: true, feeds: ["https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml"] },
  { label: "Wall Street Journal", pref: 6, lean: "right", paywall: true, feeds: [gnews("wsj.com")] },
];

// ---- utilidades de "mesmo assunto" -------------------------------------------------
const STOP = new Set(
  ("a an the of to in on for and or but with without as at by from into over after "
    + "before under about against between during is are was were be been being it its this "
    + "that these those he she they them his her their you your we our us not no new says say "
    + "said will would can could may might has have had do does did than then so if up down out "
    + "off more most amid amid’s us u.s trump’s").split(/\s+/)
);

// tokens significativos do título (minúsculo, sem pontuação, sem stopwords, stem leve)
function tokens(title) {
  return [
    ...new Set(
      stripHtml(title)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !STOP.has(w))
        .map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w)) // plural leve
    ),
  ];
}

function sameTopic(a, b) {
  const A = new Set(a);
  let shared = 0;
  for (const w of b) if (A.has(w)) shared++;
  const jac = shared / (new Set([...a, ...b]).size || 1);
  return shared >= 3 || jac >= 0.5;
}

// melhor item de um conjunto: sem-paywall primeiro, depois ordem de preferência, depois recência
function best(items) {
  return [...items].sort(
    (x, y) =>
      Number(x.paywall) - Number(y.paywall) ||
      x.pref - y.pref ||
      y._t - x._t
  )[0];
}

// escolhe 1 ou 2 representantes por grupo (2 só quando há esquerda E direita)
function pick(group) {
  const left = group.filter((i) => i.lean === "left");
  const right = group.filter((i) => i.lean === "right");
  if (left.length && right.length) return [best(left), best(right)]; // pontos de vista discrepantes
  return [best(group)];
}

// ---- coleta ------------------------------------------------------------------------
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
          pref: src.pref,
          lean: src.lean,
          paywall: src.paywall,
          title,
          link,
          summary: truncate(item.contentSnippet || item.summary || item.content || "", 180),
          publishedAt: item.isoDate || item.pubDate || "",
          _t: toTime(item.isoDate || item.pubDate),
          _tok: tokens(title),
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

  // remove duplicados exatos (mesmo link)
  const seenLink = new Set();
  items = items.filter((it) => {
    if (seenLink.has(it.link)) return false;
    seenLink.add(it.link);
    return true;
  });

  // agrupa por assunto (greedy, na ordem de recência)
  items.sort((a, b) => b._t - a._t);
  const clusters = [];
  for (const it of items) {
    const c = clusters.find((cl) => sameTopic(cl.seed, it._tok));
    if (c) c.items.push(it);
    else clusters.push({ seed: it._tok, items: [it] });
  }

  // escolhe representantes de cada grupo
  let chosen = clusters.flatMap((c) => pick(c.items));

  // segurança: sem repetir link
  const seen2 = new Set();
  chosen = chosen.filter((it) => (seen2.has(it.link) ? false : seen2.add(it.link)));

  // ordena final por recência e corta em 10
  chosen.sort((a, b) => b._t - a._t);
  const picked = chosen.slice(0, MAX_ITEMS);

  if (picked.length === 0) {
    console.error("Nenhum item coletado — mantendo o news.json anterior.");
    process.exitCode = 1;
    return;
  }

  // Traduz os títulos para PT-BR; guarda o original em inglês. (Sem mini-resumo.)
  console.log("Traduzindo títulos…");
  const outItems = [];
  for (const it of picked) {
    const titlePt = await translateToPt(it.title);
    outItems.push({
      source: it.source,
      title: titlePt,
      titleOriginal: it.title,
      link: it.link,
      publishedAt: it.publishedAt,
    });
  }

  writeJson("news.json", { updatedAt: new Date().toISOString(), count: outItems.length, items: outItems });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
