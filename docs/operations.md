# Operação e verificação

Este documento descreve a execução local do MVP Portugal Live e os limites
atuais da preparação para uma publicação estática com um broker separado. Não
é um guia de deployment público: a publicação do broker e de credenciais
partilhadas continua a exigir uma revisão própria.

## Requisitos

- Node.js `>=24 <27`.
- Dependências instaladas com `npm ci` a partir do `package-lock.json`.
- Um token Cesium ion pode ser usado no browser; é opcional para a inicialização
  do mapa, embora recursos alojados no ion possam não estar disponíveis sem ele.
- Credenciais de fornecedores brokered são opcionais para arrancar a aplicação.

## Configuração local

Copie `.env.example` para `.env.local` e, se necessário, preencha:

```dotenv
VITE_CESIUM_ION_TOKEN=
VITE_BROKER_BASE_URL=http://127.0.0.1:8787
```

Copie `.env.broker.example` para `.env.broker.local` e preencha apenas as
credenciais que possui:

```dotenv
FOGOS_API_KEY=
FOGOS_USER_AGENT=PortugalLive/0.1 (+https://github.com/gpirescampos/portugal-live)
FIRMS_MAP_KEY=
OPENSKY_CREDENTIALS_FILE=.secrets/opensky-credentials.json
BROKER_PORT=8787
BROKER_ALLOWED_ORIGIN=http://localhost:4173
```

O token `VITE_CESIUM_ION_TOKEN` é deliberadamente visível no bundle do browser;
deve ser restringido de acordo com as capacidades do Cesium ion. `VITE_*` não é
um mecanismo para segredos.

Estas credenciais são exclusivamente do broker e nunca devem ser colocadas em
`.env.local`, em variáveis `VITE_*`, no código frontend ou em assets estáticos:

- `FOGOS_API_KEY`;
- `FIRMS_MAP_KEY`;
- `OPENSKY_CLIENT_ID` e `OPENSKY_CLIENT_SECRET`, se forem usados;
- o conteúdo de `.secrets/opensky-credentials.json`.

`.env.local`, `.env.broker.local`, `.env.*` reais e `.secrets/` estão excluídos
do Git. Só os ficheiros de exemplo, com placeholders vazios, devem ser
versionados.

## Executar localmente

Num terminal, iniciar o broker:

```bash
npm run broker:dev
```

Num segundo terminal, iniciar o frontend:

```bash
npm run dev -- --host 127.0.0.1
```

Abrir o URL mostrado pelo Vite, normalmente `http://localhost:4173`. O broker
aceita por defeito esse origin através de `BROKER_ALLOWED_ORIGIN`. Se o Vite
for iniciado noutra porta, o valor deve corresponder exatamente ao origin do
browser, por exemplo `http://localhost:4174`.

Para testar o build estático:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

O broker continua a ser um processo separado. O frontend estático não contém
o broker nem as suas credenciais.

## Rotas e limites do broker

O processo local expõe apenas as rotas implementadas para fornecedores:

- `GET /api/providers/fogos/incidents`;
- `GET /api/providers/opensky/states`;
- `GET /api/providers/firms/detections`;
- `GET /api/providers/qualar/observations`;
- `GET /api/providers/cameras/viaverde/catalogue`.

As rotas aceitam `OPTIONS` para CORS e `GET` para dados. Os fornecedores
brokered usam um origin exato em `BROKER_ALLOWED_ORIGIN`; o helper nunca emite
`Access-Control-Allow-Origin: *`. Um valor `*`, vazio ou inválido recua para
`http://localhost:4173`. Se o frontend correr noutra origem, configura o origin
completo (esquema, host e porta). O broker usa allowlists de upstream, limites
de tamanho, timeouts e caches em memória específicos do processo. Não é um
proxy HTTP genérico.

## Dados diretos e dados brokered

O IPMA e as observações de maré do Instituto Hidrográfico são consumidos
diretamente pelo browser quando a origem permite. Numa
verificação local de 2026-09-23, sismicidade e avisos responderam com o broker
apontado para uma porta sem serviço; as respostas foram parciais por linhas do
fornecedor inválidas, não por dependência do broker. Repetir este teste nos
browsers e origens de publicação escolhidos antes de considerar o MVP pronto.

OpenSky, Fogos.pt e NASA FIRMS passam pelo broker por causa de credenciais,
CORS, quotas ou requisitos de headers. Sem a credencial correspondente, o
dataset apresenta um estado de configuração necessária e os restantes layers
devem continuar utilizáveis. As observações de qualidade do ar da EEA e o
catálogo de câmaras da Via Verde também passam pelo broker, mas não exigem
credenciais de fornecedor.

Os estados de indisponibilidade não equivalem a zero ocorrências:

- `ready/live`: foi obtida uma resposta utilizável;
- `partial`: apenas parte da cobertura ou dos dados foi atualizada;
- `stale`: é mostrado o último retrato válido, marcado como desatualizado;
- `rate-limited`: o fornecedor pediu uma pausa;
- `configuration-required`: falta configuração local;
- `error/unavailable`: não existe um retrato utilizável.

As legendas, detalhes selecionados e estados dos layers devem manter a fonte e
a idade da informação distinguíveis de uma observação em tempo real. Os
estados do layer indicam disponibilidade, dados parciais ou desatualizados e a
hora da última consulta ou atualização conhecida da origem; os detalhes
selecionados mostram o instante próprio da observação. Uma
detecção térmica FIRMS é uma anomalia observada por satélite; não é, por si só,
uma confirmação de incêndio. O movimento interpolado de aeronaves também é
uma estimativa visual entre observações ADS-B.

## Verificação automática

Executar a sequência mínima antes de uma alteração ser considerada pronta:

```bash
npm run typecheck
npm test
npm run build
npm run check:client-secrets
git diff --check
```

Os testes atuais são sobretudo unitários, com fixtures e transporte simulado.
Os testes live contra APIs externas não são um requisito para o comando
`npm test`; devem ser tratados como verificações manuais separadas.

O workflow `.github/workflows/quality.yml` executa os mesmos typechecks,
testes unitários, build e scan de segredos em CI. A revisão visual da interface
é manual e usa a checklist abaixo.

Os resultados atuais e questões pendentes dos fornecedores estão no
[registo de proveniência](providers/provenance.md).

A verificação visual manual desta sessão cobriu Chrome em 320×568, 375×812,
430×932 e 1440×900; confirmou ausência de scroll horizontal e que os layers
continuam acessíveis. Em ecrãs móveis baixos, várias legendas são consultáveis
numa área com scroll próprio para não cobrirem os controlos do mapa.

## Checklist manual do browser

Registar o browser, viewport, data e resultado. Não considerar apenas a ausência
de uma exceção JavaScript como prova de sucesso.

### Desktop

- arrancar sem uma ou mais credenciais e confirmar que a aplicação continua a
  inicializar;
- ativar e desativar repetidamente cada layer e confirmar que os markers,
  legendas e timers desaparecem ou param;
- ativar um layer e confirmar que os seus markers aparecem sem redimensionar o
  mapa; selecionar e desselecionar markers de cada tipo e confirmar que o realce
  de seleção é aplicado e removido sem ocultar o ícone;
- desligar o broker e confirmar que IPMA direto continua funcional;
- selecionar um evento de cada tipo ativo e confirmar detalhe, fonte, idade e
  unidade corretos;
- provocar ou simular resposta vazia, inválida, timeout, HTTP 429 e resposta
  parcial; confirmar estados explícitos e ausência de dados inventados;
- verificar que as fontes NASA FIRMS, OpenSky, Fogos.pt e IPMA são visíveis
  junto da informação relevante;
- usar teclado para alcançar layers, controlos, seletor de territórios,
  detalhes e fechar; confirmar foco visível e ordem compreensível;
- confirmar que os créditos Cesium permanecem visíveis.

### Mobile baseline

Testar pelo menos uma viewport estreita em orientação vertical e horizontal:

- mapa pode ser deslocado e inclinado com toque;
- zoom, reposição de vista e layers continuam alcançáveis;
- legendas múltiplas não saem do viewport nem escondem completamente os
  controlos;
- detalhes selecionados são legíveis e podem ser fechados;
- não há scroll horizontal acidental.

Paridade total de funcionalidades e performance mobile continua fora do MVP.

### Performance

Usar DevTools numa máquina de referência e registar, em vez de assumir, o
resultado:

- tempo até o mapa utilizável;
- tamanho do build e payloads por provider;
- contagem de entidades Cesium;
- frame time/FPS com cada combinação de layers;
- long tasks, memória e comportamento ao fim de pelo menos 10 minutos;
- comportamento ao ocultar e reabrir o separador;
- número de pedidos após refresh, falha e reativação de um layer.

Os limites numéricos finais continuam pendentes da primeira medição comparável.
Não aumentar frequências de polling apenas para melhorar a animação visual.

## Privacidade e higiene de segredos

Antes de publicar um build, inspecionar `dist/` e procurar apenas canários ou
nomes conhecidos, sem imprimir valores reais. Nunca colocar tokens reais na
saída de comandos, screenshots, fixtures ou logs. Confirmar também que pedidos
do browser não incluem `FOGOS_API_KEY`, `FIRMS_MAP_KEY` ou credenciais OAuth.

O script `npm run check:client-secrets` procura no build nomes e valores de
segredos configurados sem os imprimir. É executado localmente e pelo workflow
de CI; a inspeção manual continua a ser necessária quando se introduzem novas
credenciais.

## Cabeçalhos de segurança e CSP

O frontend estático deve ser servido por HTTPS e o host escolhido deve permitir
definir cabeçalhos de resposta. Antes de impor uma Content Security Policy
(CSP), executar primeiro em modo `Content-Security-Policy-Report-Only` no build
e browser de destino e registar os pedidos legítimos. A aplicação usa Cesium,
fontes Google e IPMA direto; os recursos do Cesium ion variam com a configuração.
Por isso, não copiar uma allowlist presumida nem usar curingas amplos: enumerar
as origens observadas para `connect-src`, `img-src`, `font-src` e `worker-src`.
Cesium pode exigir workers e imagens `blob:`/`data:` conforme o build; confirmar
cada exceção com o teste real antes de a adicionar. Evitar `'unsafe-eval'` e
`'unsafe-inline'`; se a configuração atual exigir uma exceção, documentar o
motivo e procurar removê-la antes de uma publicação pública.

O catálogo NetMadeira tem 28 marcadores que ligam às páginas oficiais individuais.
O iframe publicado pelo operador retorna o placeholder de indisponibilidade e
não deve ser exibido. As páginas individuais expõem imagens assinadas, mas o
browser recebe-as com tipo de conteúdo incorreto; Portugal Live não as consome
diretamente nem usa um broker para as normalizar. Por isso, câmaras NetMadeira
e outros feeds sem incorporação funcional mostram apenas a ligação, sem uma
área de vídeo vazia. Se a política CSP for configurada no alojamento, só os
players confirmados continuam a precisar de `frame-src` para as respetivas
origens. O estado do catálogo é revisto manualmente e guarda a hora da última
verificação por catálogo.
Os catálogos de Porto de Lisboa, Clube Naval de Santa Maria, MEO Beachcam,
MeteoEstrela, Madeira-Web, Via Verde/Brisa, VR1 Madeira e Município do Funchal são independentes. O índice MEO lista 185 páginas individuais,
que abrem por ligação até que cada reprodutor seja confirmado. Porto de Lisboa
usa os dois reprodutores YouTube publicados na página oficial, e Clube Naval
incorpora a página de reprodução ligada pelo clube. MeteoEstrela disponibiliza
imagens JPEG públicas que são atualizadas enquanto a seleção está visível. O
Madeira-Web inclui 30 vistas fixas; quatro usam os reprodutores YouTube
publicados pelo operador e as restantes abrem a página de origem. Via Verde/Brisa
acrescenta 100 localizações A1–A4 através do broker de catálogo; como as imagens
amostradas não tinham atualização recente verificável, a seleção abre a página
oficial sem mostrar um frame potencialmente desatualizado. O controlo
VR1 acrescenta 71 marcadores rodoviários com coordenadas do operador, mas os
endpoints de imagem testados devolvem HTTP 403. Funchal acrescenta três vistas
municipais, cujos endpoints atualmente devolvem um SVG de fallback. Ambos abrem
a página oficial sem pré-visualizador. O controlo Câmaras gere nove fornecedores.

Ponto de partida a avaliar no host (não é configuração pronta a copiar):

- `default-src 'self'`; `object-src 'none'`; `base-uri 'self'`;
  `frame-ancestors 'none'`;
- `X-Content-Type-Options: nosniff` e uma `Referrer-Policy` restritiva;
- desativar via `Permissions-Policy` funcionalidades não usadas, como câmara,
  microfone e geolocalização;
- ativar HSTS apenas quando todo o domínio estiver corretamente servido por
  HTTPS;
- manter a política CORS do broker limitada ao origin exato do frontend, sem
  credenciais CORS e sem `Access-Control-Allow-Origin: *`.

Repetir a validação CSP depois de alterar Cesium, fontes, providers ou host. Uma
política que bloqueie workers ou pedidos pode deixar a interface visível mas
degradar silenciosamente o mapa, pelo que verificar consola, rede e créditos.

## Portabilidade para static + edge

O router comum e o adapter `createEdgeBroker` usam `Request`/`Response` e
recebem credenciais/configuração por bindings. Os testes de contrato executam o
mesmo cenário contra o router local e o adapter edge com upstreams simulados.
Isto prova a portabilidade do contrato Fetch no runtime Node usado nos testes,
mas não substitui execução no runtime edge específico escolhido.

Não existe um deployment edge nem deve ser feito deployment público como parte
desta verificação. Antes dessa decisão, validar no runtime escolhido CORS,
timeouts, limites de resposta, caching em instâncias, logs e disponibilidade de
APIs do runtime. A configuração de OpenSky por ficheiro é Node-only; no edge,
as credenciais devem vir de bindings secretos do host.
