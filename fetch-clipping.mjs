#!/usr/bin/env node
// Coleta os posts mais recentes do Substack (via RSS: rss2json ou proxies) e grava
// clipping.json. O Substack bloqueia IPs de datacenter, então nem sempre uma rota
// responde a partir do GitHub Actions — nesse caso NÃO falhamos o workflow: apenas
// mantemos o clipping.json atual (que o Marcos pode atualizar na mão ao publicar).
import { fetchClipping, writeIfChanged } from "./sources.mjs";

try {
  const obj = await fetchClipping();
  const changed = writeIfChanged("clipping.json", obj);
  console.log(`clipping: ${changed ? "atualizado -> " + (obj.items[0]?.date || "") : "sem mudança"}`);
} catch (e) {
  console.warn("clipping: fonte indisponível a partir do Actions; mantendo o atual. (" + e.message + ")");
  process.exit(0);
}
