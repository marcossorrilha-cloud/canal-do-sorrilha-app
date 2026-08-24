#!/usr/bin/env node
// Atualiza trump.json com a aprovação de Trump (Silver Bulletin) lendo direto do
// gráfico oficial (Datawrapper) — confiável, sem raspar a página com paywall.
import { fetchTrump, writeIfChanged } from "./sources.mjs";

const obj = await fetchTrump();
const changed = writeIfChanged("trump.json", obj);
console.log(`trump: ${changed ? `atualizado -> ${obj.approval}/${obj.disapproval} (net ${obj.net})` : "sem mudança"}`);
