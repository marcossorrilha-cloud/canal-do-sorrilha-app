# Atualizar a aba Midterms (manual)

Fonte: **FiftyPlusOne** (equipe ex-538) — forecast **grátis de ler** no site:
- Câmara: <https://fiftyplusone.news/forecast/house>
- Senado: <https://fiftyplusone.news/forecast/senate>
- Corridas estado a estado (com % e rating): <https://fiftyplusone.news/forecast/senate> → seção **"By race"** (filtros Toss-Up / Lean Dem etc.). O número "X out of 100" é a chance de vitória daquele candidato.

Os dados legíveis por máquina (API) deles são pagos e as páginas usam JavaScript, então
**o robô não puxa sozinho** — esta aba é atualizada por você, editando o `midterms.json`.
Como o forecast muda devagar, basta atualizar a cada poucos dias. Você lê os números de
graça nas páginas acima e digita no arquivo.

## Como editar (pelo próprio GitHub, sem baixar nada)

1. No repositório, abra o arquivo **`midterms.json`**.
2. Clique no **lápis** (Edit this file).
3. Troque os números pelos atuais do FLIPR. **Commit changes**.
4. No app, dê `?N` ou janela anônima para ver.

## O que cada campo significa

```json
{
  "asOf": "15/08/2026",              // data que aparece no app ("Atualizado em…")
  "house": { "dem": 87, "rep": 13 }, // % de chance de cada partido na Câmara
  "senate": { "dem": 57, "rep": 43 },// % de chance de cada partido no Senado
  "states": [
    {
      "state": "Ohio",                         // nome do estado
      "office": "Senado",                       // Senado / Câmara / Governo
      "candidates": "Sherrod Brown (D) × Jon Husted (R)",  // opcional
      "favored": "D",                           // "D", "R" ou "" (empate técnico)
      "prob": 62,                               // % do favorito vencer (o "X out of 100")
      "rating": "Toss-Up"                       // rótulo da FiftyPlusOne: Toss-Up / Lean Dem / Lean Rep…
    }
  ]
}
```

Regras simples:
- Em `house`/`senate`, os dois números devem somar 100 (ex.: 87 + 13).
- Em cada estado, `favored` é só uma letra: `D`, `R`, ou vazio `""` para toss-up.
- `prob` é a chance (em %) do favorito — o app pinta a borda de azul (D) ou vermelho (R).
- Pode ter mais ou menos de 7 estados; o app mostra todos os que estiverem na lista.

## Dica

Sempre que a FiftyPlusOne atualizar o forecast, é só ajustar os dois toplines
(Câmara/Senado) e as odds dos estados que mudaram. Leva 1 minuto.

> Semeei com os números da FiftyPlusOne de 03/08/2026 (Câmara ~85% D, Senado ~55% D). As
> odds por estado são um ponto de partida — troque pelas exatas das páginas de forecast
> quando puder.
