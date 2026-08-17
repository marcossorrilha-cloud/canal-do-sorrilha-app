// Coleta os posts mais recentes do seu Substack e grava clipping.json.
//
// O Substack (Cloudflare) devolve HTTP 403 para o servidor do GitHub Actions.
// Por isso buscamos o feed por rotas intermediárias que rodam em outra rede:
//   1) rss2json  (API que lê o RSS e devolve JSON)
//   2) allorigins (proxy que devolve o XML cru)
//   3) acesso direto (último recurso; normalmente 403 no GitHub)
// Se TODAS falharem, mantém o clipping.json anterior e NÃO quebra o job.
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

function normalize({ title, link, date, note }) {
  return {
    title: (title || "").trim(),
    link: link || "",
    date: fmtDate(date),
    note: truncate(note || "", 150) || "Newsletter do Canal do Sorrilha",
    _t: toTime(date),
  };
}

// Quebra-cache: adiciona um parâmetro único ao feed a cada busca, para os proxies
// não devolverem uma versão em cache antiga (deixa o clipping novo aparecer mais rápido).
function bust() {
  return SUBSTACK_FEED + (SUBSTACK_FEED.includes("?") ? "&" : "?") + "nocache=" + Date.now();
}

// --- Estratégia 1: rss2json (devolve JSON já parseado) ---
async function viaRss2json() {
  const url =
    "https://api.rss2json.com/v1/api.json?count=10&rss_url=" +
    encodeURIComponent(bust());
  const data = JSON.parse(await fetchText(url));
  if (data.status !== "ok" || !Array.isArray(data.items)) {
    throw new Error("rss2json sem itens (status " + data.status + ")");
  }
  return data.items.map((it) =>
    normalize({
      title: it.title,
      link: it.link,
      date: it.pubDate,
      note: it.description || it.content,
    })
  );
}

// --- Estratégias via proxy que devolve o XML cru (allorigins / corsproxy) ---
function makeXmlProxy(buildUrl) {
  return async function () {
    const xml = await fetchText(buildUrl(bust()), { timeoutMs: 30000 });
    const feed = await parser.parseString(xml);
    return (feed.items || []).map((it) =>
      normalize({
        title: it.title,
        link: it.link,
        date: it.isoDate || it.pubDate,
        note: it.contentSnippet || it.contentEncoded,
      })
    );
  };
}

const viaAllorigins = makeXmlProxy(
  (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u)
);
const viaCorsproxy = makeXmlProxy(
  (u) => "https://corsproxy.io/?url=" + encodeURIComponent(u)
);
const viaJina = makeXmlProxy((u) => "https://r.jina.ai/" + u);

// --- Acesso direto (normalmente 403 no GitHub) ---
async function viaDireto() {
  const xml = await fetchText(bust(), {
    headers: { Accept: "application/rss+xml, application/xml, text/xml, */*" },
  });
  const feed = await parser.parseString(xml);
  return (feed.items || []).map((it) =>
    normalize({
      title: it.title,
      link: it.link,
      date: it.isoDate || it.pubDate,
      note: it.contentSnippet || it.contentEncoded,
    })
  );
}

async function main() {
  console.log("Coletando clipping do Substack…");

  const strategies = [
    ["rss2json", viaRss2json],
    ["allorigins", viaAllorigins],
    ["corsproxy", viaCorsproxy],
    ["jina", viaJina],
    ["direto", viaDireto],
  ];

  let items = [];
  for (const [name, fn] of strategies) {
    try {
      const got = await fn();
      if (got && got.length) {
        console.log(`  · sucesso via ${name}: ${got.length} itens`);
        items = got;
        break;
      }
      console.warn(`  ! ${name} não retornou itens`);
    } catch (e) {
      console.warn(`  ! ${name} falhou: ${e.message}`);
    }
  }

  items = items
    .filter((it) => it.title && it.link)
    .sort((a, b) => b._t - a._t)
    .slice(0, MAX_ITEMS)
    .map(({ _t, ...rest }) => rest);

  if (items.length === 0) {
    // Não quebra o job: mantém o clipping anterior e apenas avisa.
    console.warn("Nenhuma rota funcionou — mantendo o clipping.json anterior.");
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
  // Falha inesperada não deve pintar o job de vermelho; o dado anterior fica.
});
