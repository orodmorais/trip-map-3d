# trip-map-3d

Describe your trip in one file, push, and get a website with a real 3D map, for anywhere in the world.

**English** · [Português](README.pt-BR.md)

![Opening a day of the trip: the route draws itself along real roads](docs/demo.gif)

![The same template building Europe, Rio, O'ahu and Utah](docs/screenshots/m4-site.jpg)

## What you get

- **A real 3D map** of each region: terrain, sea, rivers, roads, buildings and vegetation, all from open data.
- **An animated route for each day**, along real roads, framed automatically.
- **Long trips work:** Lisbon, Rome and the Alps become three maps joined by an overview.
- **Pins, cards, search and filters**, ignoring accents.
- **A day-by-day itinerary page**, made for reading on a phone.
- **Weather for each day**, with sunrise and sunset.
- **Today mode, blue dot and offline:** it installs as an app and works without internet.
- **Optional:** surf spots scored from 0 to 5, tides, and your own 3D landmarks.
- **English, Portuguese and Spanish**, with °C or °F, km or miles.

## Make your own, no code

1. Click **Use this template** and create your repository.
2. In **Settings → Pages**, set Source to **GitHub Actions**. This is the only manual step.
3. Edit `trip.yaml` on GitHub and commit.
4. Wait a few minutes. Your site appears at `https://YOUR-USER.github.io/YOUR-REPOSITORY`.

> **Careful:** on a free GitHub account, the repository and the site are public. Anyone with the link sees your itinerary and dates. Write only the neighborhood where you stay, never the full address.

Prefer to talk? Paste [MASTER_PROMPT.md](MASTER_PROMPT.md) into Claude, or use [SKILL.md](SKILL.md) in Claude Code.

## The trip file

Only three fields are required. The build works out the rest and prints it for you to review.

```yaml
title: "Toledo in a day"
dates: {start: 2027-04-18}
language: en

days:
  - items:
      - {text: "Cathedral", place: "Catedral de Toledo"}
      - {text: "Alcazar", place: "Alcazar de Toledo"}
```

Add the city to the place name. If the search gets it wrong, give `lat` and `lon` in `places:`. Every field is in [examples/trip.example.yaml](examples/trip.example.yaml).

## Customize

| What | How |
|---|---|
| Colors, fonts, map palette | `theme.yaml` next to `trip.yaml`, see [the example](examples/theme.example.yaml) |
| Ready-made theme | `preset: oahu`, `minimal` or `dark` |
| 3D landmark for a place | `model: bridge`, `lighthouse`, `temple`, `tower`, `waterfall`, `pier`, `islet`, `airport`, `house` or `ridge_stairs` |
| Models of your own | `landmarks: landmarks.js`, see [the O'ahu example](examples/oahu/landmarks.js) |
| Camera for a place | `camera: {zoom: 7, dir: [0.4, 0.6, 0.7]}` |
| Name of a map | `regions: {titles: {Lauterbrunnen: "Swiss Alps"}}` |
| Surf and tides | `modules: {surf: true, tides: true}` and `surf_spots: spots.yaml` |
| A route with no roads | `route: line` on the day |
| Your own servers | `services: {geocoder: ..., router: ...}` |

Full trips in [examples/](examples/): Rio, Lisbon + Rome + Alps, Utah's parks, a day trip and O'ahu.

## Run it on your computer

You need Python 3.12 or newer.

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

To publish on Cloudflare Pages instead of GitHub Pages, add the `CLOUDFLARE_PROJECT` variable and the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets to the repository.

## How it works

1. **Trip:** validates the file, finds the places and keeps the answers in `trip.lock.json`, so each name is looked up once.
2. **Regions:** joins the places with the shortest possible network and cuts the longest links. A road trip stays on one map; two places a thousand kilometers apart become two maps.
3. **Map:** combines terrain, land cover, roads and rivers into a texture painted with the theme's palette.
4. **Site:** generates a static three.js site, with no framework, that works offline.

A first build took 34 to 180 seconds in our tests; later ones reuse the downloaded data. See the [test report](docs/TEST_REPORT.md).

## Data and credits

Every generated site shows the credits the licenses require; do not remove them. Sources, limits and licenses are in [DATA_SOURCES.md](DATA_SOURCES.md).

- Terrain: Copernicus GLO-30 and AWS Terrain Tiles.
- Land cover: ESA WorldCover.
- Roads, buildings and towns: Overture Maps and OpenStreetMap (ODbL).
- Places and routes: Photon and FOSSGIS OSRM.
- Weather: Open-Meteo. The free tier is **non-commercial only**. Commercial users need a paid key, in `services.open_meteo_key`.

The code is [MIT](LICENSE). The map data inside each site stays under each source's license.
