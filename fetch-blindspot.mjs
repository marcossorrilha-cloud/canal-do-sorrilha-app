// "Blind Spot" — aproximação da ideia do Ground News com fontes próprias.
//
// Método: puxa vários veículos de ESQUERDA e de DIREITA (via Google News), agrupa por
// assunto e procura histórias muito cobertas por um lado e IGNORADAS pelo outro:
//   - "Ponto cego da direita": >= N fontes de esquerda cobriram e 0 de direita
//     (a mídia conservadora ignorou -> o público de direita não viu).
//   - "Ponto cego da esquerda": >= N fontes de direita cobriram e 0 de esquerda.
// Mostra 1 de cada lado e TRAVA por dia (só muda uma vez ao dia). Se num dia não houver
// candidato de um lado, mantém o do dia anterior para não ficar vazio.
//
// É uma ESTIMATIVA (não os dados oficiais do Ground News): o rótulo de viés é por veículo
// e a ausência do outro lado pode, às vezes, ser só falta de indexação do Google News.
import Parser from "rss-parser";
import { readJson, writeJson, stripHtml, truncate, toTime, translateToPt } from "./lib.mjs";

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

// Domínios por lado (usados só para o Blind Spot; não entram na lista principal).
const LEFT = {
  "nytimes.com": "New York Times",
  "washingtonpost.com": "Washington Post",
  "cnn.com": "CNN",
  "msnbc.com": "MSNBC",
  "vox.com": "Vox",
  "theguardian.com": "The Guardian",
  "huffpost.com": "HuffPost",
};
const RIGHT = {
  "foxnews.com": "Fox News",
  "wsj.com": "Wall Street Journal",
  "nypost.com": "New York Post",
  "washingtonexaminer.com": "Washington Examiner",
  "nationalreview.com": "National Review",
  "breitbart.com": "Breitbart",
  "dailywire.com": "Daily Wire",
};

// --- agrupamento por assunto (igual ao de notícias) ---
const STOP = new Set(
  ("a an the of to in on for and or but with without as at by from into over after before "
    + "under about against between during is are was were be been being it its this that these "
    + "those he she they them his her their you your we our us not no new says say said will "
    + "would can could may might has have had do does did than then so if up down out off more "
    + "most amid trump’s us").split(/\s+/)
);
function tokens(title) {
  return [
    ...new Set(
      stripHtml(title)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !STOP.has(w))
        .map((w) => (w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w))
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
function cleanTitle(t = "") {
  return stripHtml(t).replace(/\s+-\s+[^-]+$/, "").trim();
}

// Só interessam histórias de POLÍTICA (evita eclipse, esporte, celebridade...).
// Mantém itens cujo título tenha algum termo político.
const POLITICS = [
  "trump", "biden", "harris", "vance", "newsom", "desantis", "obama", "pelosi",
  "mcconnell", "johnson", "schumer", "aoc", "musk",
  "congress", "senate", "house", "senator", "representative", "lawmaker",
  "republican", "democrat", "gop", "maga", "bipartisan",
  "election", "campaign", "midterm", "primary", "ballot", "vote", "voter",
  "poll", "approval", "caucus", "redistrict",
  "white house", "president", "presidential", "administration", "cabinet",
  "governor", "mayor", "attorney general", "secretary",
  "supreme court", "scotus", "justice", "court", "doj", "fbi", "indict",
  "impeach", "subpoena", "pardon", "grand jury", "lawsuit",
  "immigration", "ice", "border", "deportation", "asylum", "migrant",
  "tariff", "sanction", "trade war", "shutdown", "budget", "spending",
  "debt ceiling", "filibuster", "veto", "executive order", "legislation",
  "bill", "law", "policy", "politic", "capitol", "federal", "nomination",
  "confirmation", "senate hearing", "congressional",
  "foreign policy", "state department", "pentagon", "nato", "ukraine",
  "israel", "gaza", "iran", "china", "russia", "putin", "zelensky",
  "abortion", "guns", "gun control", "healthcare", "medicare", "medicaid",
  "epstein", "diplomacy", "sanctions", "treaty", "national guard",
];
function isPolitics(title = "") {
  const t = title.toLowerCase();
  return POLITICS.some((k) => t.includes(k));
}

async function collect(map, side) {
  const out = [];
  for (const [domain, name] of Object.entries(map)) {
    try {
      const feed = await parser.parseURL(gnews(domain));
      for (const item of feed.items || []) {
        const title = cleanTitle(item.title || "");
        const link = item.link || "";
        if (!title || !link) continue;
        out.push({
          side,
          domain,
          source: name,
          title,
          link,
          summary: truncate(item.contentSnippet || item.content || "", 160),
          _t: toTime(item.isoDate || item.pubDate),
          _tok: tokens(title),
        });
      }
    } catch (e) {
      console.warn(`  ! ${name} (${domain}) falhou: ${e.message}`);
    }
  }
  return out;
}

// escolhe o melhor candidato de um lado: mais fontes cobrindo, depois mais recente
function chooseBlindspot(clusters, coveredSide, ignoredSide) {
  const cands = [];
  for (const c of clusters) {
    const coveredDomains = new Set(c.items.filter((i) => i.side === coveredSide).map((i) => i.domain));
    const ignoredDomains = new Set(c.items.filter((i) => i.side === ignoredSide).map((i) => i.domain));
    if (ignoredDomains.size === 0 && coveredDomains.size >= 2) {
      // artigo representante = mais recente do lado que cobriu
      const rep = c.items
        .filter((i) => i.side === coveredSide)
        .sort((a, b) => b._t - a._t)[0];
      cands.push({ coverage: coveredDomains.size, t: rep._t, rep });
    }
  }
  // prioriza os que exigem >=3 fontes (sinal mais forte); depois cobertura; depois recência
  cands.sort(
    (a, b) =>
      Number(b.coverage >= 3) - Number(a.coverage >= 3) ||
      b.coverage - a.coverage ||
      b.t - a.t
  );
  return cands[0] || null;
}

// "slot" de meio período: AAAA-MM-DD-AM (00h–11h) ou -PM (12h–23h), fuso de Brasília.
// Assim o Blind Spot muda no máximo 2x por dia (uma de manhã, uma de tarde).
function slotNow() {
  const now = new Date();
  const date = now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "numeric",
    hour12: false,
  }).formatToParts(now);
  let h = Number(parts.find((p) => p.type === "hour").value);
  if (h === 24) h = 0;
  return date + (h < 12 ? "-AM" : "-PM");
}

async function main() {
  const slot = slotNow();
  const prev = readJson("blindspot.json", null);

  // Trava de meio período: se já calculamos neste período (manhã/tarde), não mexe.
  if (prev && prev.slot === slot) {
    console.log("Blind Spot já atualizado neste período — mantendo.");
    return;
  }

  console.log("Calculando Blind Spot…");
  const [left, right] = await Promise.all([collect(LEFT, "left"), collect(RIGHT, "right")]);
  const items = [...left, ...right].sort((a, b) => b._t - a._t);

  // mantém só política e remove duplicados por link
  const seen = new Set();
  const uniq = items.filter((i) => {
    if (!isPolitics(i.title)) return false;
    if (seen.has(i.link)) return false;
    seen.add(i.link);
    return true;
  });
  console.log(`  · itens de política: ${uniq.length} (de ${items.length})`);
  const clusters = [];
  for (const it of uniq) {
    const c = clusters.find((cl) => sameTopic(cl.seed, it._tok));
    if (c) c.items.push(it);
    else clusters.push({ seed: it._tok, items: [it] });
  }

  const forRight = chooseBlindspot(clusters, "left", "right"); // republicanos não viram
  const forLeft = chooseBlindspot(clusters, "right", "left"); // democratas não viram

  const prevItems = Object.fromEntries((prev?.items || []).map((i) => [i.audience, i]));

  async function build(audience, label, note, cand) {
    if (cand) {
      return {
        audience,
        label,
        note,
        title: await translateToPt(cand.rep.title), // título em PT
        titleOriginal: cand.rep.title, // original em inglês
        link: cand.rep.link,
        source: cand.rep.source,
        coverage: cand.coverage,
      };
    }
    return prevItems[audience] || null; // sem candidato hoje: mantém o anterior
  }

  const out = (
    await Promise.all([
      build(
        "right",
        "Ponto cego da direita",
        "Muito coberto pela imprensa de esquerda e ignorado pela direita.",
        forRight
      ),
      build(
        "left",
        "Ponto cego da esquerda",
        "Muito coberto pela imprensa de direita e ignorado pela esquerda.",
        forLeft
      ),
    ])
  ).filter(Boolean);

  if (out.length === 0) {
    console.warn("Nenhum blindspot encontrado e sem histórico — mantendo arquivo anterior.");
    return;
  }

  writeJson("blindspot.json", { updatedAt: new Date().toISOString(), slot, items: out });
}

main().catch((e) => {
  console.error(e);
  // não quebra o job; o Blind Spot é secundário
});
