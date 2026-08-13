# Transformar o site em app de loja (Android e iOS)

O seu site agora é um **PWA** (aplicativo web instalável). A partir dele dá para gerar um
app nativo para as lojas **sem programar**, usando o **PWABuilder** (ferramenta gratuita
da Microsoft). Este guia vai do zero até a loja.

> Resumo do caminho: (1) subir os arquivos de app ao repositório → (2) empacotar no
> PWABuilder → (3) enviar para a Google Play e/ou App Store.

---

## Etapa 0 — Subir os arquivos de app ao repositório

Antes de tudo, o repositório precisa ter os arquivos novos do PWA. Suba (Add file →
Upload files → choose your files) estes, todos na **raiz**, e dê Commit:

- `index.html` (versão nova, já com o PWA ligado — substitui o atual)
- `manifest.json`
- `service-worker.js`
- `icon-192.png`
- `icon-512.png`
- `icon-maskable-512.png`
- `apple-touch-icon.png`

Depois, confira no celular: abra o site no Chrome (Android) → menu ⋮ → deve aparecer
**"Instalar aplicativo" / "Adicionar à tela inicial"**. Se aparecer, o PWA está válido e
pronto para empacotar. (No computador, no Chrome/Edge, aparece um ícone de instalar na
barra de endereço.)

---

## Etapa 1 — Gerar o pacote no PWABuilder

1. Acesse **https://www.pwabuilder.com**.
2. Cole a URL do site: `https://marcossorrilha-cloud.github.io/canal-do-sorrilha-app/`
   e clique em **Start**.
3. Ele dá uma nota ao PWA e mostra um relatório. Se apontar algo faltando, geralmente é
   opcional; pode seguir.
4. Clique em **Package For Stores**. Escolha a plataforma:
   - **Android (Google Play)** — recomendado começar por aqui.
   - **iOS (App Store)** — ver Etapa 3.

---

## Etapa 2 — Publicar na Google Play (Android)

**O que você vai precisar:**
- Conta no **Google Play Console**: taxa **única de US$ 25** (uma vez na vida).
- Uma **política de privacidade** publicada numa URL (a Google exige). Dá para criar uma
  página simples e grátis; posso te gerar o texto.
- Alguns materiais: ícone (já temos), **capturas de tela** do app e uma **imagem de
  destaque** (1024×500).

**Passos:**
1. No PWABuilder, em Android, clique **Generate Package**. Baixe o `.zip` — dentro vem:
   - o arquivo **`.aab`** (é o app que você envia à Play);
   - uma pasta de **assinatura** (guarde bem — é a chave do app);
   - um arquivo **`assetlinks.json`**.
2. **Verificar o domínio (tira a barra de endereço de dentro do app):** coloque o
   `assetlinks.json` no seu repositório no caminho **`.well-known/assetlinks.json`**.
   - No GitHub: **Add file → Create new file**, digite no nome
     `.well-known/assetlinks.json`, cole o conteúdo do arquivo e Commit.
3. Crie a conta em **https://play.google.com/console** (paga a taxa de US$ 25).
4. **Create app** → preencha nome ("Canal do Sorrilha"), idioma, tipo (App), grátis.
5. Em **Production → Create new release**, envie o arquivo **`.aab`**.
6. Preencha a ficha da loja (**Store listing**): descrição, ícone, capturas de tela,
   imagem de destaque, categoria (Notícias), e a **URL da política de privacidade**.
7. Responda o **questionário de classificação de conteúdo** e o de segurança de dados.
8. Envie para revisão. A aprovação costuma levar de algumas horas a alguns dias.

> Depois disso, sempre que você quiser atualizar o app, na maioria das vezes **nem
> precisa reenviar** — como o app carrega o seu site, o conteúdo se atualiza sozinho.
> Só é necessário reenviar se mudar ícone, nome ou algo estrutural.

---

## Etapa 3 — Publicar na App Store (iOS) — opcional

É mais burocrático. Você vai precisar de:
- Um **Mac** com **Xcode** (o empacotamento e o envio só funcionam no macOS).
- Conta **Apple Developer**: **US$ 99 por ano**.

**Passos (resumo):**
1. No PWABuilder → iOS → **Generate Package** → baixe o projeto.
2. Abra no **Xcode** (no Mac), ajuste o identificador do app e assine com sua conta Apple.
3. Envie pelo Xcode para o **App Store Connect**.
4. No App Store Connect, preencha a ficha (descrição, capturas, política de privacidade)
   e envie para revisão. A Apple é mais rigorosa: às vezes pede que o app tenha função
   além de "só abrir um site" — o simulador e as abas ajudam nesse ponto.

Se você não tem Mac, dá para publicar só no Android agora e deixar o iOS para depois
(ou usar um serviço pago que empacota iOS na nuvem).

---

## Comparativo rápido

| | Google Play (Android) | App Store (iOS) |
|---|---|---|
| Custo | US$ 25 (uma vez) | US$ 99 / ano |
| Precisa de Mac? | Não | Sim (Xcode) |
| Dificuldade | Média | Alta |
| Ferramenta | PWABuilder | PWABuilder + Xcode |

---

## O que eu posso preparar para você

- O **texto da política de privacidade** e uma página pronta para hospedar (a Google exige).
- Um **texto de descrição** do app para a ficha da loja.
- As **capturas de tela** nos tamanhos certos, se você me mandar prints do app.

É só pedir.
