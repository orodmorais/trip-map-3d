# Decisões do projeto

Registro das decisões grandes do trip-map-3d. O "o quê" e as alternativas são factuais. O **porquê** é sempre escrito pelo Rodrigo, com as palavras dele: enquanto ele não responder, fica o marcador `[aguardando o Rodrigo]`.

## D1 · Repositório público
- **Decisão:** `orodmorais/trip-map-3d`, público.
- **Alternativa:** privado.
- **Por quê:** [aguardando o Rodrigo]

## D2 · Um mapa 3D por região
- **Decisão:** lugares distantes viram mapas separados, ligados por uma visão geral.
- **Alternativa:** um único mapa contínuo com a viagem inteira.
- **Por quê:** [aguardando o Rodrigo]

## D3 · Material pessoal fora do repo
- **Decisão:** a pasta de referência e os documentos de planejamento ficam só no Mac do dono. O exemplo de O'ahu público sai sem dados pessoais e sem as fotos baixadas da internet.
- **Alternativa:** publicar a referência como estava.
- **Por quê:** [aguardando o Rodrigo]

## D4 · Fontes de dados
- **Decisão:** Copernicus GLO-30 no relevo, ESA WorldCover para terra e mar, Overture para estradas e prédios, Photon para geocodificação. Medições em [DATA_SOURCES.md](DATA_SOURCES.md).
- **Alternativas:** Terrarium no relevo, polígonos OSM, Overpass e Nominatim.
- **Por quê:** [aguardando o Rodrigo]

## D5 · Arquivo de marcos 3D por viagem
- **Decisão:** cada viagem pode trazer um arquivo próprio de modelos 3D, além do kit genérico.
- **Alternativa:** ficar só com o kit genérico.
- **Por quê:** [aguardando o Rodrigo]

## D6 · Rotas por estrada
- **Decisão:** as rotas do dia vêm do OSRM, com endereço configurável e cache no `trip.lock.json`.
- **Alternativa:** curvas entre as paradas, ou pontos manuais em `route_via`.
- **Por quê:** [aguardando o Rodrigo]

## D7 · Regiões adaptáveis
- **Decisão:** em vez de um raio fixo, o build liga os lugares pela menor rede possível e corta o trecho mais longo enquanto o grupo passar de 400 km (`regions.max_km`) ou for quase todo vazio (trecho de 100 km ou mais, ocupando 60% ou mais do tamanho do grupo).
- **Alternativa:** raio fixo de 150 km, que partia o road trip de Utah ao meio.
- **Por quê:** [aguardando o Rodrigo]

## D8 · Dia que cruza regiões
- **Decisão:** o dia vira trechos, um por mapa visitado, na ordem da visita. Ao abrir, mostra a visão geral com o arco entre as regiões e a lista de trechos; clicar num trecho entra no mapa dele. Rota por estrada só existe dentro de um trecho. O mapa principal do dia é o que tem mais paradas; no empate, o primeiro visitado.
- **Alternativa:** abrir direto no mapa principal e esconder o deslocamento.
- **Por quê:** [aguardando o Rodrigo]

## D9 · Respostas salvas em arquivo
- **Decisão:** coordenadas, fusos e rotas ficam em `trip.lock.json`, versionado junto com a viagem, para cada nome ser buscado uma vez só.
- **Alternativa:** cache descartável, refazendo as buscas a cada build.
- **Por quê:** [aguardando o Rodrigo]
