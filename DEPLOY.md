# Como consertar o repositório (versão "tudo na raiz")

Esta versão foi feita para ser **fácil de subir**: todos os arquivos ficam na raiz do
repositório (sem pastas), com **uma única exceção** — o arquivo de automação, que o
GitHub exige que fique dentro de `.github/workflows/`. Para esse único caso há um truque
que **não precisa arrastar pasta nenhuma**.

O seu repositório hoje está com os arquivos soltos na raiz (foi o que aconteceu no
upload). Esta versão aproveita exatamente isso: quase tudo já está no lugar certo.

---

## Passo 1 — Subir os arquivos corretos na raiz

1. **Descompacte** o `canal-do-sorrilha-flat.zip`. Ele NÃO tem subpastas de conteúdo —
   os arquivos ficam soltos (só existe a pasta `.github`, que tratamos no Passo 2).
2. No GitHub, no seu repositório: **Add file → Upload files**.
3. Clique em **choose your files** e selecione **todos os arquivos soltos** que saíram do
   zip: `index.html`, `simulador.html`, `logo.png`, `news.json`, `clipping.json`,
   `trump.json`, `fetch-news.mjs`, `fetch-clipping.mjs`, `fetch-trump.mjs`, `lib.mjs`,
   `package.json`, `README.md`, `DEPLOY.md`.
   - Aqui o botão "choose your files" funciona, porque são **arquivos**, não pastas.
   - Eles têm os mesmos nomes dos que já estão lá, então vão **substituir** os antigos
     (é isso mesmo que queremos — o `index.html` novo aponta para os caminhos certos).
4. Role até o fim e **Commit changes**.

## Passo 2 — Criar o arquivo de automação (sem arrastar pasta)

O GitHub cria pastas automaticamente quando você **digita a barra `/`** no nome do
arquivo. Vamos usar isso:

1. No repositório: **Add file → Create new file**.
2. No campo do nome (em cima), digite exatamente:
   ```
   .github/workflows/update.yml
   ```
   Repare que, ao digitar cada `/`, o GitHub vai transformando em "pasta" na sua frente.
3. Abra o arquivo `update.yml` que está dentro da pasta `.github/workflows/` do zip
   (pode abrir com o Bloco de Notas), **copie todo o conteúdo** e **cole** na área grande
   de edição do GitHub.
4. Clique em **Commit changes**.

## Passo 3 — Limpar os arquivos errados (opcional, mas recomendado)

No seu repositório atual há arquivos que **não servem** nesta versão e podem ser apagados
para não confundir. Para cada um: clique no arquivo → ícone de **lixeira** → **Commit**.
- `news.yml`, `clipping.yml`, `trump.yml` (os workflows antigos que estavam na raiz — o
  novo é o `update.yml` do Passo 2).
- `download` (arquivo solto sem uso).
- `LEIA-ME.txt` (se estiver lá).

## Passo 4 — Ligar a automação

1. Aba **Actions** → se aparecer aviso, clique
   **I understand my workflows, go ahead and enable them**.
2. **Settings → Actions → General → Workflow permissions** → marque
   **Read and write permissions** → **Save**. (Isso deixa o robô gravar os dados.)

Pronto. A partir daí, de hora em hora o robô busca notícias, clipping e a aprovação de
Trump e atualiza os arquivos sozinho.

## Passo 5 — Testar agora e conferir

1. Abra o site: `https://SEU-USUARIO.github.io/NOME-DO-REPO/` e dê **Ctrl+F5**.
   - As notícias e o clipping devem aparecer, e o **logo** entra no lugar do "CS".
2. Para forçar uma coleta na hora (sem esperar): aba **Actions** →
   **Atualizar conteúdo do app** → **Run workflow** → **Run workflow**. Em ~1 min ele
   roda; recarregue o site.

---

## Como fica a estrutura certa no fim

Na aba **Code**, a raiz do repositório deve mostrar (entre outros):
`index.html`, `simulador.html`, `logo.png`, `news.json`, `clipping.json`, `trump.json`,
`fetch-*.mjs`, `lib.mjs`, `package.json`, e a pasta **`.github`**.

## Ajustar a aprovação de Trump na mão (quando a coleta falhar)

Os números do Silver Bulletin vêm de gráficos, então a extração é "melhor esforço". Se
não achar valores novos, o site mantém os últimos bons e mostra um aviso ⚠. Para corrigir:
aba **Actions → Atualizar conteúdo do app → Run workflow**, preencha os campos de Trump
(Aprovação, Desaprovação, Saldo, Tendência) e rode. Alternativa: editar o `trump.json`
direto pelo GitHub (lápis → Commit).

## Trocar fontes/quantidade de notícias

No `fetch-news.mjs`: `MAX_ITEMS` controla a quantidade; a lista `SOURCES` define as fontes
(fontes sem RSS estável usam `gnews("dominio.com")`, via Google News).
