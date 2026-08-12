# Como colocar o app no ar (passo a passo)

Este projeto é um **site estático** (HTML/CSS/JS) com **coleta automática** feita pelo
GitHub Actions. Não precisa de servidor, banco de dados nem cartão de crédito — funciona
no plano gratuito do GitHub. Você faz o deploy uma vez; depois ele se atualiza sozinho.

Como funciona, em uma frase: robôs do GitHub (cron) rodam de tempos em tempos, buscam
as notícias / seu Substack / a aprovação do Trump, gravam os arquivos em `data/*.json`
e o site passa a mostrar os dados novos automaticamente.

---

## 1. Criar a conta e o repositório

1. Se ainda não tem, crie uma conta gratuita em <https://github.com>.
2. Clique em **New repository** (botão verde).
   - **Repository name**: `canal-do-sorrilha-app` (ou o nome que quiser).
   - Deixe como **Public** (obrigatório para o GitHub Actions ser gratuito com cron).
   - **Não** marque "Add a README".
   - Clique **Create repository**.

## 2. Subir os arquivos

Jeito mais fácil, sem usar terminal:

1. **Descompacte** o arquivo `canal-do-sorrilha-site.zip` no seu computador. Ele cria a
   pasta `canal-do-sorrilha-app` com tudo dentro.
2. Abra a **página do repositório** no GitHub. A tela de upload aparece por um destes
   dois caminhos (use o que você enxergar):
   - **Se o repositório estiver vazio** (acabou de criar), há um bloco cinza no meio da
     tela com o link **uploading an existing file** — clique nele.
   - **Caso não veja esse link** (o repositório já tem algum arquivo, ou a tela está
     diferente): clique no botão **Add file** (fica acima da lista de arquivos, à
     direita) e escolha **Upload files**. É o mesmo destino.
3. Já na tela de upload, você pode **arrastar os arquivos** para dentro da página
   **ou** clicar em **choose your files** para selecioná-los.
   - Entre na pasta `canal-do-sorrilha-app`, selecione **tudo o que está lá dentro**
     (inclusive as pastas `data/`, `scripts/`, `assets/` e `.github/`) e arraste/abra.
   - Importante: a pasta `.github` precisa subir junto — é ela que contém a automação.
     Se o seu sistema esconder pastas que começam com ponto, ative "mostrar arquivos
     ocultos" antes de selecionar.
   - Dica: no navegador Chrome dá para arrastar as pastas inteiras de uma vez; se o seu
     navegador não aceitar pastas, arraste os arquivos e, para as subpastas, repita o
     upload entrando em cada uma — o GitHub recria a estrutura pelo nome.
4. Role até o fim da página e clique no botão verde **Commit changes**.

> Se preferir usar o Git pelo terminal: `git init`, `git add .`,
> `git commit -m "primeira versão"`, `git branch -M main`,
> `git remote add origin <URL do seu repo>`, `git push -u origin main`.

## 3. Ligar o site (GitHub Pages)

1. No repositório, vá em **Settings** → **Pages** (menu à esquerda).
2. Em **Source**, escolha **Deploy from a branch**.
3. Em **Branch**, escolha **main** e a pasta **/ (root)**. Clique **Save**.
4. **Aguarde alguns minutos** (no primeiro deploy costuma levar de 2 a 5 min, às vezes
   mais) e **recarregue a página** (F5). Quando ficar pronto, aparece no topo dela a
   frase **"Your site is live at …"** com o link. O endereço segue sempre este padrão:
   `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`
   (troque pelo seu usuário e pelo nome que você deu ao repositório).

> **Não apareceu o link?** É normal ele demorar. Verifique, nesta ordem:
> - **Recarregue a página** de Settings → Pages depois de 2–3 min — o aviso só surge
>   quando o build termina.
> - Vá na aba **Actions**: deve haver um job chamado **pages build and deployment**.
>   Se estiver com bolinha amarela, ainda está publicando; espere o ✓ verde. Se estiver
>   vermelho, clique nele para ver o erro.
> - Confirme que o **`index.html` está na raiz** do repositório (na página inicial do
>   repo você deve ver `index.html`, e as pastas `data/`, `scripts/`, `assets/`,
>   `.github/`). Se os arquivos ficaram dentro de uma subpasta `canal-do-sorrilha-app/`,
>   o Pages não acha o site — refaça o upload entrando **dentro** dessa pasta primeiro.
> - Como o endereço é fixo, você pode **digitá-lo direto no navegador** já no padrão
>   acima, sem esperar o aviso aparecer.

Pronto — esse é o link do app. Abra e confira as 4 abas.

## 4. Ligar a automação (GitHub Actions)

1. Vá na aba **Actions** (menu superior do repositório).
2. Se aparecer um aviso pedindo para habilitar workflows, clique em
   **I understand my workflows, go ahead and enable them**.
3. Dê permissão de escrita aos robôs (para eles conseguirem gravar os dados):
   **Settings** → **Actions** → **General** → seção **Workflow permissions** →
   marque **Read and write permissions** → **Save**.

Só isso. A partir daí:

| O quê | Com que frequência | Arquivo que atualiza |
|---|---|---|
| Notícias (Politico, The Hill, NYT, WaPo, AP, Axios) | de hora em hora | `data/news.json` |
| Clipping (seu Substack) | a cada 3 horas | `data/clipping.json` |
| Aprovação de Trump (Silver Bulletin) | 1x por dia | `data/trump.json` |

## 5. Testar agora (sem esperar o horário)

Você pode disparar qualquer coleta na hora:

1. Aba **Actions** → escolha o workflow na lista à esquerda
   (ex.: "Atualizar notícias (de hora em hora)").
2. Botão **Run workflow** → **Run workflow**.
3. Em ~1 minuto ele roda, grava o JSON e o site se atualiza. Recarregue a página do app.

---

## Ajustes que você provavelmente vai querer

### Trocar o logo
Coloque um arquivo `logo.png` dentro da pasta `assets/` (substituindo o placeholder).
O cabeçalho já aponta para `assets/logo.png`; se não existir, aparece "CS" como reserva.

### Corrigir a aprovação do Trump manualmente
Os números do Silver Bulletin vêm de gráficos, então a extração automática é
"melhor esforço". Se algum dia ela não achar valores novos, o site mantém os últimos
bons e mostra um aviso (⚠). Para corrigir na mão:

1. Aba **Actions** → "Atualizar aprovação de Trump (Silver Bulletin)" → **Run workflow**.
2. Preencha os campos **Aprovação %**, **Desaprovação %**, **Saldo líquido** e
   (opcional) **Texto de tendência**. Deixe em branco o que não quiser mudar.
3. **Run workflow**. Os valores digitados entram direto no site.

> Alternativa: editar o arquivo `data/trump.json` direto pelo GitHub (lápis "Edit")
> e dar **Commit**.

### Mudar as fontes de notícias ou a quantidade
Abra `scripts/fetch-news.mjs`. No topo:
- `MAX_ITEMS` controla quantas manchetes aparecem (hoje 10).
- A lista `SOURCES` define as fontes. Cada uma tem um rótulo e uma URL de feed.
  Fontes sem RSS estável (AP, Axios) usam `gnews("dominio.com")`, que busca via
  Google News restrito àquele site. Para adicionar uma fonte nova com RSS próprio,
  acrescente `{ label: "Nome", feeds: ["https://.../feed.xml"] }`.

### Mudar os horários
Cada arquivo em `.github/workflows/` tem uma linha `cron:` no formato padrão
(`minuto hora dia mês dia-da-semana`, em UTC). Ex.: `0 * * * *` = toda hora cheia.

---

## Perguntas comuns

**Precisa deixar o computador ligado?** Não. Tudo roda nos servidores do GitHub.

**Tem custo?** Não, no plano gratuito para repositório público.

**O horário do cron atrasa às vezes?** Sim, o GitHub pode atrasar alguns minutos em
horários de pico. Para conteúdo diário/horário isso é irrelevante.

**Os feeds podem mudar de endereço?** Podem. Se uma fonte parar de aparecer, é provável
que a URL do feed dela mudou — basta atualizar em `scripts/fetch-news.mjs`.
