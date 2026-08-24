// Fontes de dados do app Canal do Sorrilha (clipping, Trump, midterms).
// Formato de saída idêntico ao que o Marcos monta na mão. Só grava (e portanto
// só gera commit) quando o conteúdo muda de verdade — updatedAt não conta.
//
// Robustez: o Substack devolve 403 para os IPs do GitHub Actions, então as buscas
// tentam rotas alternativas (proxies) antes de desistir. O Datawrapper (Trump e
// midterms) costuma responder direto, com proxy como reserva.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const UA = "Mozilla/5.0 (compatible; canal-do-sorrilha-bot/1.0; +https://github.com/marcossorrilha-cloud/canal-do-sorrilha-app)";

// ---------- utilidades ----------
const nowIso = () => new Date().toISOString().replace(/\.\d+Z$/, ".000Z");
const round1 = (x) => Math.round(Number(x) * 10) / 10;
const virg = (x) => Number(x).toFixed(1).replace(".", ",");

export function dateBr(d = new Date()) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric",
  }).format(d);
}

const MESES = {
  janeiro: "01", fevereiro: "02", "março": "03", marco: "03", abril: "04",
  maio: "05", junho: "06", julho: "07", agosto: "08", setembro: "09",
  outubro: "10", novembro: "11", dezembro: "12",
};
function dateFromTitle(title, postDate) {
  const m = String(title || "").match(/(\d{1,2})\s+de\s+([A-Za-zçÇ]+)\s+de\s+(\d{4})/i);
  if (m) {
    const mm = MESES[m[2].toLowerCase()];
    if (mm) return `${m[1].padStart(2, "0")}/${mm}/${m[3]}`;
  }
  return dateBr(new Date(postDate));
}

async function tryText(url, headers) {
  try { const r = await fetch(url, { headers }); if (!r.ok) return null; return await r.text(); }
  catch { return null; }
}
async function tryJson(url, headers) {
  const t = await tryText(url, headers);
  if (t == null) return null;
  try { return JSON.parse(t); } catch { return null; }
}
// Proxies para driblar o 403 do Substack aos IPs do GitHub Actions. Ordem por
// confiabilidade observada; se um estiver fora do ar, tenta o próximo.
const PROXIES = [
  (u) => "https://api.codetabs.com/v1/proxy/?quest=" + encodeURIComponent(u),
  (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
  (u) => "https://corsproxy.io/?url=" + encodeURIComponent(u),
  (u) => "https://thingproxy.freeboard.io/fetch/" + u,
];
async function getText(url) {
  let t = await tryText(url, { "user-agent": UA, accept: "*/*" });
  if (t != null) return t;
  for (const p of PROXIES) {
    t = await tryText(p(url), { "user-agent": UA });
    if (t != null && t.length) return t;
  }
  // allorigins "get" devolve { contents: "<corpo>" }
  const g = await tryJson("https://api.allorigins.win/get?url=" + encodeURIComponent(url), { "user-agent": UA });
  if (g && typeof g.contents === "string") return g.contents;
  throw new Error("falha ao buscar texto: " + url);
}
async function getJson(url) {
  const txt = await getText(url).catch(() => null);
  if (txt != null) { try { return JSON.parse(txt); } catch { /* corpo não-JSON */ } }
  throw new Error("falha ao buscar JSON: " + url);
}

async function datawrapperCsv(id) {
  const base = await getText(`https://datawrapper.dwcdn.net/${id}/`);
  const m = base.match(new RegExp(`${id}/(\\d+)/`));
  if (!m) throw new Error(`versão do Datawrapper não encontrada para ${id}`);
  return getText(`https://datawrapper.dwcdn.net/${id}/${m[1]}/dataset.csv`);
}
const csvRows = (csv) => csv.trim().split(/\r?\n/).map((r) => r.split(","));

export function writeIfChanged(file, obj) {
  const next = JSON.stringify(obj, null, 2) + "\n";
  if (existsSync(file)) {
    try {
      const cur = JSON.parse(readFileSync(file, "utf8"));
      const a = { ...cur }; delete a.updatedAt;
      const b = { ...obj }; delete b.updatedAt;
      if (JSON.stringify(a) === JSON.stringify(b)) return false;
    } catch { /* arquivo inválido: regrava */ }
  }
  writeFileSync(file, next);
  return true;
}

// ---------- CLIPPING (Substack) ----------
export function buildClipping(archive) {
  const items = archive.slice(0, 5).map((p) => ({
    title: String(p.title || "").trim(),
    link: "https://marcossorrilha.substack.com/p/" + p.slug,
    date: dateFromTitle(p.title, p.post_date),
    note: p.subtitle || "",
  }));
  return {
    updatedAt: nowIso(),
    newestTs: Date.parse(archive[0].post_date),
    archiveUrl: "https://marcossorrilha.substack.com/archive",
    count: items.length,
    items,
  };
}
export async function fetchClipping() {
  const url = "https://marcossorrilha.substack.com/api/v1/archive?sort=new&limit=12&offset=0";
  const archive = await getJson(url);
  if (!Array.isArray(archive) || !archive.length) throw new Error("arquivo do Substack vazio");
  return buildClipping(archive);
}

// ---------- TRUMP (Silver Bulletin) ----------
export function buildTrump(csv, today = dateBr()) {
  const rows = csvRows(csv);
  const h = rows[0];
  const iA = h.indexOf("approve"), iD = h.indexOf("disapprove");
  const last = rows[rows.length - 1];
  const approval = round1(last[iA]);
  const disapproval = round1(last[iD]);
  const net = round1(approval - disapproval);
  return {
    updatedAt: nowIso(),
    source: "Silver Bulletin",
    sourceUrl: "https://www.natesilver.net/p/trump-approval-ratings-nate-silver-bulletin",
    approval, disapproval, net,
    trend: `Aprovação líquida de ${virg(net)} (Silver Bulletin, ${today}).`,
    stale: false,
  };
}
export async function fetchTrump() {
  return buildTrump(await datawrapperCsv("kSCt4"));
}

// ---------- MIDTERMS (Split Ticket) ----------
const STATE_MAP = {
  "Texas": { pt: "Texas", cand: "James Talarico (D) × Ken Paxton (R)" },
  "Alaska": { pt: "Alasca", cand: "Mary Peltola (D) × Dan Sullivan (R)" },
  "Ohio": { pt: "Ohio", cand: "Sherrod Brown (D) × Jon Husted (R)" },
  "Maine": { pt: "Maine", cand: "Troy Jackson (D) × Susan Collins (R)" },
  "Iowa": { pt: "Iowa", cand: "Josh Turek (D) × Ashley Hinson (R)" },
  "Michigan": { pt: "Michigan", cand: "Abdul El-Sayed (D) × Mike Rogers (R)", demName: "El-Sayed" },
  "North Carolina": { pt: "Carolina do Norte", cand: "Roy Cooper (D) × Michael Whatley (R)" },
  "Florida": { pt: "Flórida", cand: "Alexander Vindman (D) × Ashley Moody (R)" },
  "Georgia": { pt: "Geórgia", cand: "Jon Ossoff (D) × Mike Collins (R)" },
  "Nebraska": { pt: "Nebraska", cand: "Dan Osborn (Ind) × Pete Ricketts (R)" },
  "New Hampshire": { pt: "New Hampshire", cand: "Chris Pappas (D) × John Sununu (R)" },
  "Minnesota": { pt: "Minnesota", cand: "A definir (D × R)", demName: "Democrata", repName: "Republicano" },
};
const RATING = { "Tossup": "Toss-up", "Lean D": "Lean D", "Lean R": "Lean R", "Likely D": "Likely D", "Likely R": "Likely R" };
function surname(name) {
  const clean = String(name || "").replace(/\([^)]*\)/g, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}
function control(csv) {
  const map = Object.fromEntries(csvRows(csv).slice(1).map((r) => [r[0].trim(), Number(r[1])]));
  return { dem: round1(map["Democrats"]), rep: round1(map["Republicans"]) };
}
export function buildMidterms(senCtrlCsv, houseCtrlCsv, racesCsv, today = dateBr()) {
  const senate = control(senCtrlCsv);
  const house = control(houseCtrlCsv);
  const rows = csvRows(racesCsv);
  const head = rows[0];
  const data = rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
  const comp = data.filter((d) => !/Safe/i.test(d.bucket));
  comp.sort((a, b) => Math.abs(50 - Number(a.win_prob_d)) - Math.abs(50 - Number(b.win_prob_d)));
  const states = comp.map((d) => {
    const map = STATE_MAP[d.State] || {};
    const wpD = Number(d.win_prob_d), wpR = Number(d.win_prob_r);
    const favored = wpD > wpR ? "D" : wpR > wpD ? "R" : "";
    const prob = favored === "R" ? wpR : wpD;
    let name = "";
    if (favored === "D") name = map.demName || surname(d.dem_name);
    else if (favored === "R") name = map.repName || surname(d.rep_name);
    return {
      state: map.pt || d.State,
      office: "Senado",
      candidates: map.cand || `${d.dem_name} (D) × ${d.rep_name} (R)`,
      favored, prob, name,
      rating: RATING[d.bucket] || d.bucket,
    };
  });
  return {
    updatedAt: nowIso(),
    source: "Split Ticket",
    sourceUrl: "https://www.theargumentmag.com/p/split-ticket-2026-midterms-model",
    asOf: today,
    note:
      `Fonte: Split Ticket (modelo publicado no The Argument), leitura de ${today}. ` +
      "Câmara e Senado mostram a chance de cada partido conquistar a maioria; nos estados, " +
      "a probabilidade de vitória do candidato favorito. Modelo probabilístico com simulação de Monte Carlo.",
    house, senate, states,
  };
}
export async function fetchMidterms() {
  const [sen, house, races] = await Promise.all([
    datawrapperCsv("toEMi"),
    datawrapperCsv("5UEYH"),
    datawrapperCsv("Hus3x"),
  ]);
  return buildMidterms(sen, house, races);
}
