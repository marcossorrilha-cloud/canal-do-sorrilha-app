#!/usr/bin/env node
// Atualiza midterms.json com o modelo Split Ticket (via The Argument), lendo os
// gráficos oficiais (Datawrapper): controle da Câmara e do Senado + probabilidade
// de vitória por estado. Apresentação (nomes em PT, candidatos) fica no sources.mjs.
import { fetchMidterms, writeIfChanged } from "./sources.mjs";

const obj = await fetchMidterms();
const changed = writeIfChanged("midterms.json", obj);
console.log(`midterms: ${changed ? "atualizado -> " + obj.asOf : "sem mudança"}`);
