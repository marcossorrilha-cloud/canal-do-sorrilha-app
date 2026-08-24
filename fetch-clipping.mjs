#!/usr/bin/env node
// Coleta os posts mais recentes do Substack e grava clipping.json.
// Usa a API de arquivo (tempo real), com proxies de reserva para o 403 do Actions.
import { fetchClipping, writeIfChanged } from "./sources.mjs";

const obj = await fetchClipping();
const changed = writeIfChanged("clipping.json", obj);
console.log(`clipping: ${changed ? "atualizado -> " + (obj.items[0]?.date || "") : "sem mudança"}`);
