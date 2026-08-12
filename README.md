# App Canal do Sorrilha

Site sobre política americana com 4 abas — **Início** (notícias), **Clipping Diário**
(seu Substack), **Simulador de Eleições** e **Popularidade de Trump** — com **coleta
automática** de conteúdo via GitHub Actions.

👉 **Para colocar no ar, siga o [DEPLOY.md](DEPLOY.md).**

## Como está organizado

```
index.html            → o app (4 abas). Lê os dados de data/*.json.
simulador.html        → o simulador de eleições (standalone, D3/topojson via CDN).
assets/               → logo e imagens (coloque seu logo.png aqui).
data/
  news.json           → manchetes atuais (gerado pelo robô, de hora em hora)
  clipping.json       → posts recentes do Substack (a cada 3h)
  trump.json          → aprovação de Trump (1x/dia)
scripts/
  lib.mjs             → utilidades compartilhadas
  fetch-news.mjs      → coleta e ordena as notícias por recência (top 10)
  fetch-clipping.mjs  → lê o RSS do seu Substack (5 mais recentes)
  fetch-trump.mjs     → extrai a aprovação do Silver Bulletin (+ fallback manual)
.github/workflows/    → os 3 crons (news, clipping, trump)
package.json          → dependências (rss-parser, cheerio)
```

## Arquitetura

```
[Cron do GitHub Actions] → [scripts Node buscam feeds] → [gravam data/*.json no repo]
        → [GitHub Pages serve o site] → [index.html lê os JSON no navegador]
```

Nada roda no seu computador; o site é estático e os dados são atualizados por commits
automáticos dos robôs. Os botões "Atualizar agora" no app recarregam o JSON já publicado
(não vão à fonte original — quem faz isso é o cron).

## Fontes

- **Notícias** (recência): Politico, The Hill, NYT (Politics) e Washington Post
  (Politics) via RSS nativo; AP News e Axios via Google News (`site:`), pois não têm
  RSS estável.
- **Clipping**: `https://marcossorrilha.substack.com/feed`.
- **Aprovação de Trump**: página do Silver Bulletin (extração por texto, best-effort,
  com fallback manual — ver DEPLOY.md).

## Rodar/testar localmente (opcional)

```bash
npm install
npm run fetch:all      # busca tudo e regrava data/*.json
# depois sirva a pasta, ex.: npx serve .  (abrir via http, não file://)
```

## Créditos

Layout e paleta conforme o design original do Canal do Sorrilha (Oswald + Barlow;
navy #153a63, red #c8332b, blue #2a5db0).
