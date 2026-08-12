# App Canal do Sorrilha — versão "tudo na raiz"

Mesma coisa da versão original (4 abas: Início/notícias, Clipping do Substack, Simulador
e Popularidade de Trump, com coleta automática), mas com os arquivos **na raiz** para
facilitar o upload no GitHub. A única pasta é `.github/workflows/`, exigida pelo GitHub
para a automação.

**Para instalar, siga o [DEPLOY.md](DEPLOY.md).**

Arquivos:
- `index.html` — o app; lê `news.json`, `clipping.json`, `trump.json` e `logo.png` da raiz.
- `simulador.html` — o simulador (standalone).
- `fetch-news.mjs`, `fetch-clipping.mjs`, `fetch-trump.mjs`, `lib.mjs` — coleta.
- `news.json`, `clipping.json`, `trump.json` — dados (atualizados pelo robô).
- `.github/workflows/update.yml` — o cron (de hora em hora) que roda a coleta e commita.
- `package.json` — dependências (rss-parser, cheerio).

Rodar local (opcional): `npm install` e `npm run fetch:all`; sirva via http (ex.: `npx serve .`).
