# Manutenção do app — Canal do Sorrilha

Guia rápido para o dia a dia. Você não precisa saber programar: quase tudo é clicar no
GitHub. Endereço do site: `https://marcossorrilha-cloud.github.io/canal-do-sorrilha-app/`

---

## 1. Como funciona (em 30 segundos)

- O site é hospedado de graça no **GitHub Pages**.
- Um robô do **GitHub Actions** (o workflow "Atualizar conteúdo do app") roda **de hora
  em hora**, busca notícias, seu clipping e a aprovação de Trump, e salva nos arquivos
  `news.json`, `clipping.json` e `trump.json`. O site lê esses arquivos.
- **Você não precisa fazer nada** para ele atualizar — roda sozinho.

## 2. Cache: o pulo do gato ao conferir o site

Depois de qualquer mudança, o navegador costuma mostrar a versão **antiga**. Para ver a
real:
- Adicione algo no fim do endereço, ex.: `...canal-do-sorrilha-app/?2` (mude o número a
  cada vez: `?3`, `?4`…), **ou**
- Abra numa **janela anônima** (no Edge: `Ctrl+Shift+N`).

Isso é só para você conferir; o público que abre pela primeira vez vê a versão nova
normalmente.

## 3. Forçar uma atualização agora (sem esperar a hora)

1. No repositório, aba **Actions**.
2. À esquerda, **Atualizar conteúdo do app**.
3. Botão **Run workflow** → **Run workflow**.
4. Espere o ✓ verde (~30s) + ~1 min, e confira o site (com `?N` ou janela anônima).

## 4. Corrigir a aprovação de Trump na mão

Os números do Silver Bulletin vêm de gráfico; a coleta automática pega o **net approval**
(o número confiável) e valida para nunca mostrar valor absurdo. Se quiser cravar os
valores exatos de um dia:

1. **Actions → Atualizar conteúdo do app → Run workflow**.
2. Preencha os campos que aparecem (Aprovação %, Desaprovação %, Saldo líquido, Tendência).
   Deixe em branco o que não quiser mudar.
3. **Run workflow**. Os valores digitados entram direto no site.

Alternativa: editar o arquivo `trump.json` pelo GitHub (abra o arquivo → **lápis** →
mude os números → **Commit**).

## 5. Se o clipping parar de atualizar

O Substack bloqueia o servidor do GitHub, então o clipping é buscado por serviços
intermediários (rss2json, allorigins, corsproxy, jina). Se **todos** estiverem fora do ar
num momento, o clipping simplesmente mantém o último — não quebra. Costuma voltar sozinho
na próxima hora. Se demorar, você pode editar o `clipping.json` na mão (mesmo esquema:
abrir → lápis → Commit).

## 6. Trocar ou adicionar fontes de notícia / mudar a quantidade

Abra o arquivo **`fetch-news.mjs`** no GitHub (lápis para editar):
- **Quantidade**: no topo, `const MAX_ITEMS = 10;` — mude o número.
- **Fontes**: a lista `SOURCES`. Cada linha é uma fonte:
  - Com RSS próprio: `{ label: "Nome", feeds: ["https://.../feed.xml"] }`
  - Sem RSS estável (AP, Axios): `{ label: "AP News", feeds: [gnews("apnews.com")] }`
    (o `gnews("dominio.com")` busca via Google News restrito àquele site).
- Para adicionar uma fonte nova, copie uma linha existente e troque o `label` e a URL.
- **Commit** ao final. Na próxima rodada (ou via Run workflow) já entra.

## 7. Trocar o logo

Suba um arquivo chamado exatamente **`logo.png`** pela raiz do repositório
(**Add file → Upload files**), substituindo o atual. O cabeçalho já aponta para ele.

## 8. Mudar os horários da automação

Abra `.github/workflows/update.yml`. A linha `- cron: "0 * * * *"` define o horário
(formato: `minuto hora dia mês dia-da-semana`, em UTC). `0 * * * *` = toda hora cheia.
Ex.: `0 */2 * * *` = a cada 2 horas.

---

## Resumo de arquivos

| Arquivo | Para quê |
|---|---|
| `index.html` | O app (as 4 abas). Mudanças visuais são aqui. |
| `simulador.html` | O simulador (não precisa mexer). |
| `news.json`, `clipping.json`, `trump.json` | Dados — atualizados pelo robô. |
| `fetch-news.mjs` / `fetch-clipping.mjs` / `fetch-trump.mjs` | Os coletores. |
| `.github/workflows/update.yml` | O agendamento (cron) da automação. |
| `logo.png` | O logo do cabeçalho. |
