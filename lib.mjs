// Utilidades compartilhadas pelos scripts de coleta (versão "tudo na raiz").
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Base = pasta onde o comando roda (no GitHub Actions, a raiz do repositório).
export const ROOT = process.cwd();

export const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/124.0 Safari/537.36 CanalDoSorrilhaBot/1.0";

export async function fetchText(url, { timeoutMs = 20000, headers = {} } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "*/*", ...headers },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} em ${url}`);
    return await res.text();
  } finally {
    clearTimeout(t);
  }
}

export function stripHtml(html = "") {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/&#8216;|&lsquo;/g, "‘")
    .replace(/&#8220;|&ldquo;/g, "“")
    .replace(/&#8221;|&rdquo;/g, "”")
    .replace(/&#8230;|&hellip;/g, "…")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text = "", n = 160) {
  const s = stripHtml(text);
  if (s.length <= n) return s;
  return s.slice(0, n).replace(/\s+\S*$/, "").trim() + "…";
}

export function readJson(relPath, fallback) {
  try {
    return JSON.parse(readFileSync(resolve(ROOT, relPath), "utf8"));
  } catch {
    return fallback;
  }
}

export function writeJson(relPath, data) {
  writeFileSync(resolve(ROOT, relPath), JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`✓ gravado ${relPath}`);
}

export function toTime(dateStr) {
  const t = Date.parse(dateStr || "");
  return Number.isFinite(t) ? t : 0;
}

// Traduz EN -> PT-BR. Ordem de qualidade: DeepL (se houver chave) > Google > MyMemory,
// e por fim o texto original (nunca quebra).
//
// Para usar o DeepL, defina a variável de ambiente DEEPL_API_KEY (no GitHub, um "secret").
// Chave gratuita termina em ":fx" e usa o host api-free; chave paga usa o host normal.
async function viaDeepL(text) {
  const key = (process.env.DEEPL_API_KEY || "").trim();
  if (!key) return null;
  const host = key.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(host + "/v2/translate", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: "DeepL-Auth-Key " + key,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ text, source_lang: "EN", target_lang: "PT-BR" }),
    });
    if (!res.ok) throw new Error("DeepL HTTP " + res.status);
    const json = await res.json();
    const out = json && json.translations && json.translations[0] && json.translations[0].text;
    return out ? out.trim() : null;
  } finally {
    clearTimeout(timer);
  }
}

export async function translateToPt(text) {
  const t = String(text || "").trim();
  if (!t) return "";

  // 1) DeepL (melhor qualidade; só se houver chave)
  try {
    const out = await viaDeepL(t);
    if (out) return out;
  } catch (e) {
    console.warn("  ! DeepL falhou: " + e.message);
  }

  // 2) Google (gtx, gratuito, sem chave)
  try {
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pt&dt=t&q=" +
      encodeURIComponent(t);
    const json = JSON.parse(await fetchText(url, { timeoutMs: 15000 }));
    const out = (json[0] || []).map((seg) => (seg && seg[0]) || "").join("").trim();
    if (out) return out;
  } catch {}

  // 3) MyMemory (gratuito, sem chave)
  try {
    const url =
      "https://api.mymemory.translated.net/get?langpair=en|pt-BR&q=" +
      encodeURIComponent(t);
    const json = JSON.parse(await fetchText(url, { timeoutMs: 15000 }));
    const out = (json && json.responseData && json.responseData.translatedText) || "";
    if (out && !/MYMEMORY WARNING|QUOTA/i.test(out)) return out.trim();
  } catch {}

  // 4) fallback: original em inglês
  return t;
}

// Traduz uma lista, com pequena pausa entre chamadas (evita rate-limit).
export async function translateAll(texts) {
  const out = [];
  for (const t of texts) {
    out.push(await translateToPt(t));
    await new Promise((r) => setTimeout(r, 150));
  }
  return out;
}
