# trip-map-3d

Descreva sua viagem em um arquivo, dê push e receba um site com mapa 3D de verdade, para qualquer lugar do mundo.

[English](README.md) · **Português**

![Abrindo um dia da viagem: a rota se desenha pelas estradas reais](docs/demo.gif)

![O mesmo template gerando Europa, Rio, O'ahu e Utah](docs/screenshots/m4-site.jpg)

## O que você recebe

- **Mapa 3D real** de cada região: relevo, mar, rios, estradas, prédios e vegetação, tudo a partir de dados abertos.
- **Rota animada de cada dia**, seguindo as estradas, com o enquadramento ajustado sozinho.
- **Viagens longas funcionam:** Lisboa, Roma e Alpes viram três mapas ligados por uma visão geral.
- **Pinos, cartões, busca e filtros**, sem diferenciar acentos.
- **Página de roteiro** dia a dia, para ler no celular.
- **Clima de cada dia**, com nascer e pôr do sol.
- **Modo Hoje, ponto azul e offline:** instala como app e funciona sem internet.
- **Opcionais:** picos de surf com nota de 0 a 5, marés e marcos 3D próprios.
- **Inglês, português e espanhol**, com °C ou °F, km ou milhas.

## Faça o seu, sem código

1. Clique em **Use this template** e crie seu repositório.
2. Em **Settings → Pages**, escolha **GitHub Actions** em Source. É o único passo manual.
3. Edite o `trip.yaml` no próprio GitHub e faça commit.
4. Espere alguns minutos. Seu site aparece em `https://SEU-USUARIO.github.io/SEU-REPOSITORIO`.

> **Atenção:** na conta grátis do GitHub, o repositório e o site são públicos. Quem tiver o link vê seu roteiro e suas datas. Use só o bairro de onde você fica, nunca o endereço completo.

Prefere conversar? Cole o [MASTER_PROMPT.md](MASTER_PROMPT.md) no Claude, ou use o [SKILL.md](SKILL.md) no Claude Code.

## O arquivo da viagem

Só três campos são obrigatórios. O resto o build descobre sozinho e imprime para você conferir.

```yaml
title: "Toledo em um dia"
dates: {start: 2027-04-18}
language: pt-BR

days:
  - items:
      - {text: "Catedral", place: "Catedral de Toledo"}
      - {text: "Alcázar", place: "Alcazar de Toledo"}
```

Coloque a cidade junto do nome do lugar. Se a busca errar, informe `lat` e `lon` em `places:`. Todos os campos estão em [examples/trip.example.yaml](examples/trip.example.yaml).

## Personalização

| O quê | Como |
|---|---|
| Cores, fontes, paleta do mapa | `theme.yaml` ao lado do `trip.yaml`, veja [o exemplo](examples/theme.example.yaml) |
| Tema pronto | `preset: oahu`, `minimal` ou `dark` |
| Marco 3D de um lugar | `model: bridge`, `lighthouse`, `temple`, `tower`, `waterfall`, `pier`, `islet`, `airport`, `house` ou `ridge_stairs` |
| Modelos só seus | `landmarks: landmarks.js`, veja [o exemplo de O'ahu](examples/oahu/landmarks.js) |
| Câmera de um lugar | `camera: {zoom: 7, dir: [0.4, 0.6, 0.7]}` |
| Nome de um mapa | `regions: {titles: {Lauterbrunnen: "Alpes Suíços"}}` |
| Surf e marés | `modules: {surf: true, tides: true}` e `surf_spots: picos.yaml` |
| Rota sem estrada | `route: line` no dia |
| Seus próprios servidores | `services: {geocoder: ..., router: ...}` |

Exemplos completos em [examples/](examples/): Rio, Lisboa + Roma + Alpes, parques de Utah, um bate-volta e O'ahu.

## Rodar no seu computador

Precisa de Python 3.12 ou mais novo.

```bash
python -m pip install -r requirements.txt
```

```bash
python -m pipeline check trip.yaml
```

```bash
python -m pipeline build trip.yaml --out dist
```

```bash
python -m http.server --directory dist
```

Para publicar no Cloudflare Pages em vez do GitHub Pages, crie a variável `CLOUDFLARE_PROJECT` e os segredos `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID` no repositório.

## Como funciona

1. **Viagem:** valida o arquivo, encontra os lugares e guarda as respostas em `trip.lock.json`, para cada nome ser buscado uma vez só.
2. **Regiões:** liga os lugares pela menor rede possível e corta os trechos mais longos. Um road trip fica em um mapa; dois lugares a mil quilômetros viram dois mapas.
3. **Mapa:** junta relevo, cobertura do solo, estradas e rios numa textura pintada com a paleta do tema.
4. **Site:** gera um site estático em three.js, sem framework, que funciona offline.

O primeiro build levou de 34 a 180 segundos nos nossos testes; os seguintes reaproveitam os dados baixados. Veja o [relatório de testes](docs/TEST_REPORT.md).

## Dados e créditos

Cada site gerado mostra os créditos exigidos pelas licenças; não os remova. Fontes, limites e licenças em [DATA_SOURCES.md](DATA_SOURCES.md).

- Relevo: Copernicus GLO-30 e AWS Terrain Tiles.
- Cobertura do solo: ESA WorldCover.
- Estradas, prédios e cidades: Overture Maps e OpenStreetMap (ODbL).
- Lugares e rotas: Photon e FOSSGIS OSRM.
- Clima: Open-Meteo. O plano grátis é só para **uso não comercial**. Quem usa comercialmente precisa de uma chave paga, em `services.open_meteo_key`.

O código é [MIT](LICENSE). Os dados de mapa dentro de cada site seguem as licenças de cada fonte.
