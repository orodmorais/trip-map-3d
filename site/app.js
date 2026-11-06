// Interface: camera, routes, pins, framing, search and cards. One 3D map is alive at a time.
import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { buildWorld } from './world.js';
import { MODEL_HEIGHT } from './landmarks.js';
import { createFraming } from './framing.js';
import { initSearch } from './search.js';
import { initWeather } from './weather.js';
import { initLive } from './live.js';

const T = window.TRIP;
const $ = selector => document.querySelector(selector);
const esc = text =>
  String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
const WHEEL_FIELDS = [
  'deltaX',
  'deltaY',
  'deltaZ',
  'deltaMode',
  'clientX',
  'clientY',
  'screenX',
  'screenY',
  'ctrlKey',
  'shiftKey',
  'altKey',
  'metaKey',
];
const MOBILE_WIDTH = 860;

applyText(document);

/* ---------------- pin types ---------------- */
const TYPE_COLORS = {
  home: '#D9553B',
  surf: '#1F7FA6',
  jump: '#E0662C',
  hike: '#3F7A3A',
  food: '#9A4E26',
  spot: '#0E7C86',
  sight: '#6D4BA0',
  travel: '#4E5A63',
  booking: '#4E5A63',
  maybe: '#7A7468',
  hotel: '#8C4A6B',
  beach: '#C99A2E',
  museum: '#5A4FA0',
  shop: '#B0477C',
  nightlife: '#3D3A7C',
};
const ICON = {
  spot: 'M3 14c3-5 7-5 9 0s6 5 9 0M3 19c3-3 7-3 9 0s6 3 9 0',
  home: 'M5 11l7-6 7 6M7 10v9h10v-9',
  surf: 'M3 14c3-5 7-5 9 0s6 5 9 0',
  jump: 'M12 3v10M8 9l4 4 4-4M4 20c3-2 5-2 8 0s5 2 8 0',
  hike: 'M3 19l6-10 4 6 2-3 6 7z',
  food: 'M4 12a8 6 0 0016 0zM8 8V5M12 8V4M16 8V5',
  sight: 'M12 3l2.5 6h6l-5 4 2 6-5.5-3.5L6.5 19l2-6-5-4h6z',
  travel: 'M3 13l18-5v2l-8 4 2 6h-2l-4-5-6 1z',
  booking: 'M5 5h14v14H5zM5 10h14',
  maybe: 'M9 9a3 3 0 116 0c0 2-3 2-3 5M12 18v.5',
  hotel: 'M4 18V8M4 13h16v5M8 13v-3h8a4 4 0 014 3',
  beach: 'M4 20h16M12 20L7 6M3 9c3-4 9-5 13-2z',
  museum: 'M4 9l8-5 8 5M6 10v7M10 10v7M14 10v7M18 10v7M4 19h16',
  shop: 'M6 8h12l1 12H5zM9 8a3 3 0 016 0',
  nightlife: 'M6 4h12l-6 8zM12 12v7M8 20h8',
  cafe: 'M5 8h11l-1 10H6zM16 10c3 0 3 4 0 4',
};
const FOOD_TYPES = ['food', 'cafe', 'plate', 'poke', 'musubi', 'shaveice'];
const iconPath = type =>
  ICON[T.pins[type]?.icon] ||
  ICON[T.pins[type]?.icon?.toLowerCase?.()] ||
  ICON[type] ||
  (FOOD_TYPES.includes(type) ? ICON.food : ICON.sight);
const typeColor = type =>
  T.pins[type]?.color || TYPE_COLORS[type] || (FOOD_TYPES.includes(type) ? TYPE_COLORS.food : TYPE_COLORS.sight);
const typeName = type => T.pins[type]?.label || typeLabel(type);
const tagBackground = type => typeColor(type) + '26';
const icon = type => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${iconPath(type)}"/></svg>`;
const USED_TYPES = [...new Set(T.places.filter(p => p.type !== 'home').map(p => p.type))];

const placeById = Object.fromEntries(T.places.map(p => [p.id, p]));
const storyById = Object.fromEntries(T.stories.map(s => [s.id, s]));
const mapById = Object.fromEntries(T.maps.map(m => [m.id, m]));
const OVERVIEW = { id: 'overview', title: t('all'), places: [] };
const dayByNumber = n => T.days[n - 1];
T.days.forEach(day => {
  day.items.forEach(item => {
    item.time = fmtTime(item.time);
  });
});
T.places.forEach(place =>
  place.items.forEach(item => {
    item.time = fmtTime(item.time);
  }),
);

/* ---------------- scene ---------------- */
const canvas = $('#gl');
const SMALL = innerWidth < 760;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(SMALL ? 1.75 : 2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(T.palette.bg);
scene.fog = new THREE.Fog(T.palette.bg, 170, 300);
const camera = new THREE.PerspectiveCamera(30, 1, 0.3, 700);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = 1.25;
controls.minDistance = 2.2;
controls.maxDistance = 320;
controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.touches = { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE };
controls.screenSpacePanning = false;
controls.zoomToCursor = true;
scene.add(new THREE.HemisphereLight('#FFFFFF', '#8C8463', 1.15));
const sun = new THREE.DirectionalLight('#FFF1DC', 2.6);
sun.position.set(-34, 40, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(SMALL ? 2048 : 4096, SMALL ? 2048 : 4096);
Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 34, bottom: -34, near: 1, far: 160 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun);
const worldRoot = new THREE.Group();
scene.add(worldRoot);

let WORLD = null;
let activeMap = null;
let activePlaces = [];
let showToken = 0;

/* ---------------- camera ---------------- */
const DEF_DIR = new THREE.Vector3(0, 0.74, 0.67);
const PORTRAIT = 0.8;
const NEAR_SHARE = 0.2;
const MAX_HOME_DISTANCE = 290;
const NORTH_UP = new THREE.Vector3(0, 0.78, 0.62).normalize();
const SIDEWAYS = new THREE.Vector3(0.56, 0.78, 0.25).normalize();
const HOME_DIRECTIONS = { portrait: [SIDEWAYS, NORTH_UP], landscape: [NORTH_UP] };
const HOME = { target: new THREE.Vector3(0, 0, 0), dir: new THREE.Vector3(0, 0.78, 0.62).normalize(), dist: 92 };
const card = $('#card');
const state = { day: null, sel: null, story: null, groups: new Set(USED_TYPES) };
let fly = null;

function flyTo(target, dist, ms = 900, shift = true, forceDir = null) {
  const t0 = performance.now(),
    a = { t: controls.target.clone(), p: camera.position.clone() };
  let goal = target;
  if (shift && innerWidth > MOBILE_WIDTH && !card.hidden) {
    const right = forceDir
      ? new THREE.Vector3(-forceDir.z, 0, forceDir.x).normalize().negate()
      : new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    right.y = 0;
    right.normalize();
    goal = target.clone().addScaledVector(right, -dist * 0.15);
  }
  const dir = forceDir ? forceDir.clone().normalize() : camera.position.clone().sub(controls.target).normalize();
  if (dir.y < 0.45) {
    dir.y = 0.62;
    dir.normalize();
  }
  fly = { t0, ms, a, b: { t: goal.clone(), p: goal.clone().addScaledVector(dir, dist) } };
}

const { freeRect, fitView, layoutFor } = createFraming({ camera, card, placeById, defaultDirection: DEF_DIR, $ });

function setHomeView() {
  if (!WORLD) return;
  const span =
    activeMap === OVERVIEW ? T.maps.map(m => WORLD.W3(m.center[0], m.center[1])) : activePlaces.map(p => p.v);
  const x0 = Math.min(...span.map(p => p.x)),
    x1 = Math.max(...span.map(p => p.x)),
    z0 = Math.min(...span.map(p => p.z)),
    z1 = Math.max(...span.map(p => p.z));
  const padX = Math.max((x1 - x0) * 0.12, 4),
    padZ = Math.max((z1 - z0) * 0.12, 4);
  const corners = [
    [x0 - padX, z0 - padZ],
    [x1 + padX, z0 - padZ],
    [x0 - padX, z1 + padZ],
    [x1 + padX, z1 + padZ],
  ].map(([x, z]) => new THREE.Vector3(x, 0, z));
  const wasHidden = card.hidden;
  card.hidden = true;
  // a wide island reads better turned sideways on a tall screen; a tall city does not
  const options = HOME_DIRECTIONS[innerWidth / innerHeight < PORTRAIT ? 'portrait' : 'landscape'].map(dir => ({
    dir,
    ...fitView(corners, dir),
  }));
  const view = options.reduce((best, option) => (option.dist < best.dist ? option : best));
  card.hidden = wasHidden;
  HOME.dir.copy(view.dir);
  HOME.target.copy(view.target);
  HOME.dist = Math.min(view.dist, MAX_HOME_DISTANCE);
}

function resize() {
  const w = innerWidth,
    h = innerHeight,
    portrait = w / h < PORTRAIT;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  DEF_DIR.copy(portrait ? new THREE.Vector3(0.52, 0.74, 0.24) : new THREE.Vector3(0, 0.74, 0.67)).normalize();
  camera.updateProjectionMatrix();
  setHomeView();
}
addEventListener('resize', resize);
let resizeTimer;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (state.day && !state.sel && !state.story && !card.hidden) placeFor(dayLine(state.day), dayStops(state.day));
  }, 250);
});

function placeFor(route, pinIds, animate = true) {
  const L = layoutFor(route, pinIds);
  card.style.cssText = `left:${L.card.x}px;top:${L.card.y}px;width:${L.card.w}px;max-height:${L.card.h}px;right:auto;bottom:auto`;
  if (animate) flyTo(L.target, L.dist, 1000, false, DEF_DIR.clone());
}
function stepFly(now) {
  if (!fly) return;
  let k = Math.min(1, (now - fly.t0) / fly.ms);
  k = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  controls.target.lerpVectors(fly.a.t, fly.b.t, k);
  camera.position.lerpVectors(fly.a.p, fly.b.p, k);
  if (k >= 1) fly = null;
}
controls.addEventListener('start', () => {
  fly = null;
});
$('#zin').onclick = () =>
  flyTo(controls.target, Math.max(2.5, camera.position.distanceTo(controls.target) * 0.6), 450, false);
$('#zout').onclick = () =>
  flyTo(controls.target, Math.min(300, camera.position.distanceTo(controls.target) * 1.6), 450, false);
$('#zhome').onclick = () => go(activeMap && activeMap !== OVERVIEW ? 'mapa-' + activeMap.id : '');

/* ---------------- routes ---------------- */
const routes = [];
let routeAnimation = null;
const LINE_LIFT = 0.3;
const TUBE_NEAR = 42; // closer than this, the thick route would cover the map

function tube(points, radius, material, drop = 0) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p.x, p.y - drop, p.z)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve, points.length, radius, 10, false), material);
}
function addRoute(day, base, color, lifted = true) {
  const curve = new THREE.CatmullRomCurve3(base, false, 'centripetal');
  const points = curve
    .getSpacedPoints(Math.max(200, base.length * 8))
    .map(v => new THREE.Vector3(v.x, lifted ? Math.max(0, WORLD.yAt(v.x, v.z)) + LINE_LIFT : v.y, v.z));
  const material = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, roughness: 0.5 });
  const outline = new THREE.MeshStandardMaterial({ color: T.palette.card, roughness: 0.6 });
  const parts = [
    tube(points, 0.17, material),
    tube(points, 0.27, outline, 0.14),
    tube(points, 0.07, material, 0.2),
    tube(points, 0.115, outline, 0.27),
  ];
  parts.forEach(part => {
    part.visible = false;
    worldRoot.add(part);
  });
  parts[0].castShadow = lifted;
  routes.push({
    day,
    parts,
    on: false,
    total: parts[0].geometry.index.count,
    pts: points.filter((_, i) => i % 12 === 0),
  });
}
function buildRoutes() {
  routes.length = 0;
  if (activeMap === OVERVIEW) return buildTripArcs();
  for (const day of T.days)
    for (const leg of day.legs) {
      if (leg.map !== activeMap.id || leg.line.length < 2) continue;
      addRoute(
        day.n,
        leg.line.map(([lat, lon]) => {
          const v = WORLD.W3(lat, lon);
          return new THREE.Vector3(v.x, 0, v.z);
        }),
        day.color,
      );
    }
}
function buildTripArcs() {
  const seen = new Set();
  for (const day of T.days) {
    const previous = T.days[day.n - 2];
    const chain = [...(previous ? [previous.legs.at(-1)?.map ?? previous.map] : []), ...day.legs.map(leg => leg.map)];
    for (let i = 1; i < chain.length; i++) {
      const key = chain[i - 1] + chain[i];
      if (chain[i - 1] === chain[i] || seen.has(key)) continue;
      seen.add(key);
      const a = WORLD.W3(...mapById[chain[i - 1]].center),
        b = WORLD.W3(...mapById[chain[i]].center);
      const middle = a.clone().add(b).multiplyScalar(0.5);
      middle.y = Math.max(a.y, b.y) + a.distanceTo(b) * 0.25;
      addRoute(day.n, [a, middle, b], day.color, false);
    }
  }
}
function showRoute(n) {
  routeAnimation = null;
  for (const route of routes) {
    route.on = route.day === n;
    if (route.on) {
      route.parts.forEach(part => part.geometry.setDrawRange(0, 0));
      routeAnimation = { t0: performance.now() };
    }
  }
}
function routeDetail(cameraDistance) {
  const near = cameraDistance < TUBE_NEAR;
  const showAllArcs = activeMap === OVERVIEW && !state.day;
  for (const route of routes) {
    const visible = route.on || showAllArcs;
    route.parts[0].visible = route.parts[1].visible = visible && !near;
    route.parts[2].visible = route.parts[3].visible = visible && near;
  }
}
const dayLine = n => {
  const line = routes.filter(route => route.day === n).flatMap(route => route.pts);
  return line.length ? line : dayStops(n).map(id => placeById[id].v);
};

/* ---------------- overlays ---------------- */
const overlay = $('#overlay'),
  leaders = $('#leaders');
const pinEls = {},
  regionEls = {};
const clusterPool = [],
  nodeTowns = [],
  calloutPool = [];
const screenPoint = new THREE.Vector3();
function scr(vector) {
  screenPoint.copy(vector).project(camera);
  return {
    x: ((screenPoint.x + 1) / 2) * innerWidth,
    y: ((1 - screenPoint.y) / 2) * innerHeight,
    ok: screenPoint.z < 1 && screenPoint.z > -1,
  };
}
for (const place of T.places) {
  const pin = document.createElement('button');
  pin.type = 'button';
  pin.className = 'pin' + (place.type === 'home' ? ' home' : '');
  pin.style.display = 'none';
  pin.innerHTML = `<span class="ic" style="background:${typeColor(place.type)}">${icon(place.type)}</span><span class="lb">${esc(place.type === 'home' ? t('home') : place.name)}</span>`;
  pin.setAttribute('aria-label', place.name);
  pin.onclick = event => {
    event.stopPropagation();
    go('lugar-' + place.id);
  };
  overlay.appendChild(pin);
  pinEls[place.id] = pin;
}
function clusterEl(i) {
  if (!clusterPool[i]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pin cluster';
    overlay.appendChild(button);
    clusterPool[i] = button;
  }
  return clusterPool[i];
}
function regionLabel(id, text, aria, route) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'region';
  button.style.display = 'none';
  button.textContent = text;
  button.setAttribute('aria-label', aria);
  button.onclick = event => {
    event.stopPropagation();
    go(route);
  };
  overlay.appendChild(button);
  regionEls[id] = button;
}
T.stories.forEach(story =>
  regionLabel(story.id, story.title, t('storyAria', { t: story.title }), 'regiao-' + story.id),
);
if (T.overview) T.maps.forEach(m => regionLabel(m.id, m.title, t('viewMap', { t: m.title }), 'mapa-' + m.id));
function calloutEl(i) {
  if (!calloutPool[i]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'callout';
    overlay.appendChild(button);
    calloutPool[i] = button;
  }
  return calloutPool[i];
}
const regions = () =>
  activeMap === OVERVIEW
    ? T.maps.map(m => ({ id: m.id, v: WORLD.W3(m.center[0], m.center[1], 0.5), near: 0 }))
    : T.stories
        .filter(story => story.map === activeMap.id)
        .map(story => ({ id: story.id, v: WORLD.W3(story.lat, story.lon, 0.5), near: 30 }));

const dayOrderCache = {};
function dayOrder(n) {
  if (!dayOrderCache[n])
    dayOrderCache[n] = [
      ...new Set(
        dayByNumber(n)
          .items.map(i => i.place)
          .filter(Boolean),
      ),
    ];
  return dayOrderCache[n];
}
const dayStops = n => dayOrder(n).filter(id => placeById[id].map === activeMap.id);
const inDay = place =>
  !state.day ||
  dayByNumber(state.day).legs.some(leg => leg.stops.includes(place.id)) ||
  place.items.some(i => i.day === state.day);
const visible = place => place.type === 'home' || state.groups.has(place.type);

let regionsNow = [];
function layout() {
  const dist = camera.position.distanceTo(controls.target),
    labels = dist < 36,
    points = [];
  for (const place of activePlaces) {
    const element = pinEls[place.id],
      s = scr(place.v);
    if (!visible(place) || !s.ok) {
      element.style.display = 'none';
      continue;
    }
    points.push({ p: place, s, el: element });
  }
  const used = new Set(),
    singles = [],
    clusterBoxes = [],
    gap = 34;
  let clusters = 0;
  for (const a of points) {
    if (used.has(a.p.id)) continue;
    used.add(a.p.id);
    const members = [a];
    if (a.p.type !== 'home' && a.p.id !== state.sel)
      for (const b of points) {
        if (used.has(b.p.id) || b.p.type === 'home' || b.p.id === state.sel) continue;
        if (Math.hypot(a.s.x - b.s.x, a.s.y - b.s.y) < gap) {
          members.push(b);
          used.add(b.p.id);
        }
      }
    if (members.length === 1) {
      const { el, s, p } = a,
        top = scr(p.vt),
        stem = Math.max(14, Math.min(160, s.y - top.y + 10));
      el.style.display = '';
      el.style.transform = `translate(${s.x}px,${s.y - stem}px) translate(-${p.type === 'home' ? 19 : 16}px,-100%)`;
      el.style.setProperty('--stem', stem + 'px');
      const want = labels || p.id === state.sel || (state.day && inDay(p) && dist < 70);
      a.box = { x: s.x - 18, y: s.y - stem - 34, w: want ? 42 + p.name.length * 7.2 : 34, h: 34, want };
      el.classList.toggle('dim', !!state.day && !inDay(p));
      el.classList.toggle('sel', p.id === state.sel);
      singles.push(a);
      const order = state.day ? dayOrder(state.day).indexOf(p.id) : -1;
      if (el.dataset.ord !== String(order)) {
        el.dataset.ord = String(order);
        let number = el.querySelector('.num');
        if (order < 0) number?.remove();
        else {
          if (!number) {
            number = document.createElement('span');
            number.className = 'num';
            el.appendChild(number);
          }
          number.textContent = order + 1;
        }
      }
    } else {
      members.forEach(m => {
        m.el.style.display = 'none';
      });
      const cluster = clusterEl(clusters++),
        x = members.reduce((sum, m) => sum + m.s.x, 0) / members.length,
        y = members.reduce((sum, m) => sum + m.s.y, 0) / members.length;
      cluster.style.display = '';
      cluster.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
      clusterBoxes.push({ x: x - 32, y: y - 17, w: 64, h: 34 });
      cluster.innerHTML = `<span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M4 12h16M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg></span>${members.length}`;
      cluster.setAttribute(
        'aria-label',
        t('places', { n: members.length, list: members.map(m => m.p.name).join(', ') }),
      );
      cluster.classList.toggle('dim', !!state.day && !members.some(m => inDay(m.p)));
      cluster.onclick = event => {
        event.stopPropagation();
        const box = new THREE.Box3();
        members.forEach(m => box.expandByPoint(m.p.v));
        const size = box.getSize(new THREE.Vector3());
        flyTo(box.getCenter(new THREE.Vector3()), Math.max(9, Math.max(size.x, size.z) * 3.2 + 6), 700);
      };
    }
  }
  for (let i = clusters; i < clusterPool.length; i++) clusterPool[i].style.display = 'none';
  // labels without overlap: selected first, then home, then the day's stops
  const priority = a => (a.p.id === state.sel ? 0 : a.p.type === 'home' ? 1 : state.day && inDay(a.p) ? 2 : 3);
  singles.sort((a, b) => priority(a) - priority(b) || a.s.y - b.s.y);
  const taken = [...clusterBoxes],
    strong = [];
  const selected = singles.find(a => a.p.id === state.sel);
  if (selected && selected.p.model && dist < 14)
    taken.push({ x: selected.s.x - 110, y: selected.s.y - 120, w: 220, h: 170 });
  const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  for (const a of singles) {
    let show = a.box.want;
    if (show && priority(a) > 0) show = !taken.some(box => overlaps(a.box, box));
    a.el.classList.toggle('show-label', show);
    const box = show ? a.box : { ...a.box, w: 34 };
    taken.push(box);
    if (priority(a) <= 2) strong.push(box);
    a.el.style.zIndex = String(10 - priority(a));
  }
  for (const town of nodeTowns) {
    const s = scr(town.v),
      on = s.ok && dist > 12 && dist < 80;
    if (!on) {
      town.el.style.display = 'none';
      continue;
    }
    const w = town.n.length * 7.6 + 14,
      box = { x: s.x - w / 2, y: s.y - 11, w, h: 22 };
    if (taken.some(other => overlaps(box, other))) {
      town.el.style.display = 'none';
      continue;
    }
    taken.push(box);
    town.el.style.display = '';
    town.el.style.transform = `translate(${s.x}px,${s.y}px) translate(-50%,-50%)`;
  }
  const labelled = [];
  for (const region of regionsNow) {
    const element = regionEls[region.id],
      s = scr(region.v);
    const box = { x: s.x - element.offsetWidth / 2, y: s.y - 16, w: element.offsetWidth || 160, h: 32 };
    const show =
      s.ok &&
      !state.day &&
      dist > region.near &&
      dist < (SMALL ? 240 : 300) &&
      !labelled.some(other => overlaps(box, other));
    element.style.display = show ? '' : 'none';
    if (!show) continue;
    labelled.push(box);
    element.style.transform = `translate(${s.x}px,${s.y}px) translate(-50%,-50%)`;
  }
  layoutCallouts(strong);
  live.layout();
}
function layoutCallouts(strong) {
  let lines = '',
    used = 0;
  if (state.day && innerWidth > MOBILE_WIDTH && !state.sel && !state.story && activeMap !== OVERVIEW) {
    const W = 204,
      H = 196,
      placed = [];
    const blocked = [
      { x: innerWidth - 232, y: 60, w: 232, h: 220 },
      { x: innerWidth / 2 - 370, y: innerHeight - 80, w: 740, h: 80 },
    ];
    if (!card.hidden) {
      const box = card.getBoundingClientRect();
      blocked.push({ x: box.left - 10, y: box.top - 10, w: box.width + 20, h: box.height + 20 });
    }
    const line = [];
    const points = dayLine(state.day).map(scr);
    points.forEach((a, i) => {
      const b = points[Math.min(i + 1, points.length - 1)];
      for (let k = 0; k < 6; k++) line.push({ x: a.x + ((b.x - a.x) * k) / 6, y: a.y + ((b.y - a.y) * k) / 6 });
    });
    const hits = r =>
      placed
        .concat(blocked, strong)
        .some(box => r.x < box.x + box.w && box.x < r.x + r.w && r.y < box.y + box.h && box.y < r.y + r.h);
    for (const place of dayStops(state.day)
      .map(id => placeById[id])
      .filter(p => p.photo)
      .slice(0, 3)) {
      const s = scr(place.v);
      if (!s.ok) continue;
      let pick = null;
      for (const [ox, oy] of [
        [70, -H - 40],
        [-W - 70, -H - 40],
        [90, -H / 2],
        [-W - 90, -H / 2],
        [70, 40],
        [-W - 70, 40],
        [230, -H - 20],
        [-W - 230, -H - 20],
        [260, 20],
        [-W - 260, 20],
      ]) {
        const r = { x: s.x + ox, y: s.y + oy, w: W, h: H };
        if (r.x < 16 || r.y < 76 || r.x + W > innerWidth - 12 || r.y + H > innerHeight - 12 || hits(r)) continue;
        if (line.some(q => q.x > r.x - 8 && q.x < r.x + W + 8 && q.y > r.y - 8 && q.y < r.y + H + 8)) continue;
        pick = r;
        break;
      }
      if (!pick) continue;
      placed.push(pick);
      const callout = calloutEl(used);
      callout.style.display = '';
      callout.style.transform = `translate(${pick.x}px,${pick.y}px)`;
      if (callout.dataset.id !== place.id) {
        callout.dataset.id = place.id;
        callout.innerHTML = `<b>${esc(place.name)}</b><img src="img/${place.id}.jpg" alt="" style="object-position:${esc(place.photo_focus || 'center')}"><small>${esc(
          place.items
            .filter(i => i.day === state.day)
            .map(i => i.time)
            .join(' · '),
        )}</small>`;
        callout.onclick = event => {
          event.stopPropagation();
          go('lugar-' + place.id);
        };
      }
      const ax = pick.x + (s.x > pick.x + W ? W : s.x < pick.x ? 0 : W / 2),
        ay = pick.y + (s.y > pick.y + H ? H : s.y < pick.y ? 0 : H / 2);
      lines += `<line x1="${ax}" y1="${ay}" x2="${s.x}" y2="${s.y}"/>`;
      used++;
    }
  }
  for (let i = used; i < calloutPool.length; i++) calloutPool[i].style.display = 'none';
  leaders.innerHTML = lines;
}

/* ---------------- switching maps ---------------- */
async function showMap(id) {
  const wanted = id === 'overview' ? OVERVIEW : mapById[id];
  if (activeMap === wanted) return true;
  const token = ++showToken;
  $('#loading').classList.remove('done');
  Object.values(pinEls).forEach(el => {
    el.style.display = 'none';
  });
  Object.values(regionEls).forEach(el => {
    el.style.display = 'none';
  });
  nodeTowns.splice(0).forEach(town => town.el.remove());
  WORLD?.dispose();
  WORLD = null;
  const places = wanted === OVERVIEW ? [] : T.places.filter(p => p.map === wanted.id);
  const world = await buildWorld(
    worldRoot,
    renderer,
    SMALL,
    wanted.id,
    places,
    T.custom_landmarks && wanted !== OVERVIEW,
  );
  if (token !== showToken) {
    world.dispose();
    return false;
  }
  WORLD = world;
  activeMap = wanted;
  activePlaces = places;
  for (const place of places) {
    place.v = WORLD.W3(place.lat, place.lon, 0.02);
    const height = place.camera?.height ?? MODEL_HEIGHT[place.model] ?? 0.1;
    place.vt = WORLD.W3(place.lat, place.lon, height);
    place.focus = WORLD.focus[place.id] || null;
  }
  regionsNow = regions();
  for (const [name, lat, lon] of WORLD.towns) {
    const el = document.createElement('div');
    el.className = 'town';
    el.textContent = name;
    el.style.display = 'none';
    overlay.insertBefore(el, overlay.firstChild);
    nodeTowns.push({ n: name, v: WORLD.W3(lat, lon, 0.05), el });
  }
  buildRoutes();
  setHomeView();
  $('#loading').classList.add('done');
  return true;
}

/* ---------------- main loop ---------------- */
function frame(now) {
  requestAnimationFrame(frame);
  if (!WORLD) return;
  stepFly(now);
  controls.update();
  const distance = camera.position.distanceTo(controls.target);
  // the sea has layers very close together: a near plane that follows the camera keeps depth precise
  const near = Math.max(0.3, distance * NEAR_SHARE);
  if (Math.abs(near - camera.near) > camera.near * 0.05) {
    camera.near = near;
    camera.updateProjectionMatrix();
  }
  scene.fog.near = distance + 70;
  scene.fog.far = distance + 300;
  routeDetail(distance);
  WORLD.tick(now, distance);
  if (routeAnimation) {
    const k = Math.min(1, (now - routeAnimation.t0) / 1600);
    for (const route of routes)
      if (route.on) {
        const count = Math.floor((route.total * k) / 3) * 3;
        route.parts.forEach(part => part.geometry.setDrawRange(0, count));
      }
    if (k >= 1) routeAnimation = null;
  }
  renderer.render(scene, camera);
  layout();
}

/* ---------------- hint ---------------- */
{
  const hint = $('#hint');
  $('#hintText').textContent = t(matchMedia('(pointer:coarse)').matches ? 'hintTouch' : 'hintMouse');
  const hide = () => hint.classList.add('gone');
  $('#hintX').onclick = hide;
  setTimeout(hide, 12000);
  controls.addEventListener('start', () => setTimeout(hide, 1500), { once: true });
}

/* ---------------- legend ---------------- */
const legendBody = $('#legendBody');
for (const type of USED_TYPES) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.type = type;
  button.setAttribute('aria-pressed', 'true');
  const color = typeColor(type),
    count = T.places.filter(p => p.type === type).length;
  button.innerHTML = `<span class="dot" style="border-color:${color};background:${color}"></span>${esc(typeName(type))}<span class="count">${count}</span>`;
  button.onclick = () => {
    const on = button.getAttribute('aria-pressed') === 'true';
    button.setAttribute('aria-pressed', on ? 'false' : 'true');
    if (on) state.groups.delete(type);
    else state.groups.add(type);
  };
  legendBody.appendChild(button);
}
$('#legendToggle').onclick = () => {
  const open = $('#legend').classList.toggle('open');
  $('#legendToggle').setAttribute('aria-expanded', open);
};

/* ---------------- day bar ---------------- */
const daysNav = $('#days');
function dayButton(label, color, key, target) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.key = key;
  button.innerHTML = (color ? `<i style="background:${color}"></i>` : '') + esc(label);
  button.onclick = () => go(target);
  daysNav.appendChild(button);
}
dayButton(T.overview ? t('all') : t('allMap'), null, 'all', '');
if (T.overview) T.maps.forEach(m => dayButton(m.title, null, m.id, 'mapa-' + m.id));
T.days.forEach(day => dayButton(t('day', { n: day.n }), day.color, day.n, 'dia-' + day.n));
function pressDay(key) {
  daysNav
    .querySelectorAll('button')
    .forEach(button => button.setAttribute('aria-pressed', button.dataset.key === String(key) ? 'true' : 'false'));
}

/* ---------------- cards ---------------- */
const tag = type => `<span class="tag" style="background:${tagBackground(type)}">${esc(typeName(type))}</span>`;
function bindGo(element) {
  element.querySelectorAll('[data-go]').forEach(button => {
    button.onclick = () => go(button.dataset.go);
  });
}
function openCard(content, photo, focus) {
  card.hidden = false;
  card.style.cssText = '';
  card.className = 'card' + (photo ? '' : ' nophoto');
  card.innerHTML =
    (photo
      ? `<div class="ph"><img src="img/${photo}.jpg" alt="" style="object-position:${esc(focus || 'center')}"></div>`
      : '') +
    `<div class="body">${content}</div><button type="button" class="close" id="closeCard" aria-label="${esc(t('close'))}">✕</button>`;
  document.body.classList.add('card-open');
  $('#closeCard').onclick = closeCard;
  bindGo(card);
}
function closeCard() {
  card.hidden = true;
  document.body.classList.remove('card-open');
  // closing a place goes back to where the user came from: the day's route or the whole map
  if (state.sel || state.story) go(state.day ? 'dia-' + state.day : homeHash());
}
const homeHash = () => (activeMap && activeMap !== OVERVIEW ? 'mapa-' + activeMap.id : '');
function cardPlace(place) {
  const items = place.items.slice().sort((a, b) => a.day - b.day);
  const tags = [
    tag(place.type),
    ...[...new Set(items.map(i => i.day))].map(
      n => `<span class="tag" style="background:#F1EEE6">${esc(t('day', { n }))}</span>`,
    ),
  ];
  const when = items.length
    ? `<ul class="when">${items.map(i => `<li><button type="button" data-go="dia-${i.day}" style="background:${dayByNumber(i.day).color}">${esc(t('day', { n: i.day }))}${i.time ? ' · ' + esc(i.time) : ''}</button><span>${esc(i.text)}</span></li>`).join('')}</ul>`
    : '';
  openCard(
    `<p class="kicker">${esc(typeName(place.type))}</p><h2 id="cardTitle">${esc(place.name)}</h2>${place.desc ? `<p>${esc(place.desc)}</p>` : ''}
    <div id="cpl">${surf?.placeHTML(place) ?? ''}</div>
    ${place.tip ? `<p style="color:var(--ink)"><b>${esc(t('tip'))}</b> ${esc(place.tip)}</p>` : ''}
    <div class="tags">${tags.join('')}</div>${when}
    <div class="actions"><a class="btn primary" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.maps)}" target="_blank" rel="noopener">${esc(t('openMaps'))}</a><a class="btn" href="https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lon}&travelmode=driving" target="_blank" rel="noopener">${esc(t('routeHere'))}</a></div>`,
    place.photo ? place.id : null,
    place.photo_focus,
  );
}
function cardStory(story) {
  openCard(
    `<p class="kicker">${esc(t('storyOf'))}</p><h2 id="cardTitle">${esc(story.title)}</h2>${story.story.map(s => `<p>${esc(s)}</p>`).join('')}
    <div class="tags">${(story.places || [])
      .filter(id => placeById[id])
      .map(
        id =>
          `<button type="button" class="tag" style="background:#EEF4E2;cursor:pointer" data-go="lugar-${id}">${esc(placeById[id].name)}</button>`,
      )
      .join('')}</div>`,
    null,
  );
}
function cardDay(n) {
  const day = dayByNumber(n);
  const items = day.items
    .map(
      i =>
        `<li><span class="t">${esc(i.time)}</span><span><span class="chip" style="background:${typeColor(i.type)}">${esc(typeName(i.type))}</span>${i.place ? `<button type="button" data-go="lugar-${i.place}">${esc(i.text)}</button>` : esc(i.text)}</span></li>`,
    )
    .join('');
  const legs = day.crosses
    ? `<p>${esc(t('crossing'))}</p><div class="tags">${day.legs.map(leg => `<button type="button" class="tag" style="background:#EEF4E2;cursor:pointer" data-go="dia-${n}-${leg.map}">${esc(mapById[leg.map].title)}</button>`).join('')}</div>`
    : '';
  const title = `<span style="color:${day.color}">${esc(t('day', { n }))}</span>${day.title ? ' · ' + esc(day.title) : ''}`;
  openCard(
    `<p class="kicker">${esc(fmtDate(day.date))} · ${esc(day.area)}</p><h2 id="cardTitle">${title}</h2><div id="chj">${live.dayHTML(n)}</div><div id="cdy">${weather.dayHTML(n)}</div>${legs}
    <ul class="list">${items}</ul>
    <div class="actions">${n > 1 ? `<button type="button" class="btn" data-go="dia-${n - 1}">← ${esc(t('day', { n: n - 1 }))}</button>` : ''}${n < T.days.length ? `<button type="button" class="btn" data-go="dia-${n + 1}">${esc(t('day', { n: n + 1 }))} →</button>` : ''}<a class="btn primary" href="roteiro.html#dia-${n}">${esc(t('viewItinerary'))}</a></div>`,
    null,
  );
  card.classList.add('is-day');
  live.decorateDayList(n);
}
addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (search.isOpen()) {
    search.hide();
    return;
  }
  if (!$('#credits').hidden) {
    $('#credits').hidden = true;
    return;
  }
  if (!card.hidden) {
    closeCard();
    return;
  }
  if (weather.isOpen()) weather.close();
});
// the wheel over pins and labels keeps zooming the map; clicking the map never closes a card
overlay.addEventListener(
  'wheel',
  event => {
    event.preventDefault();
    canvas.dispatchEvent(
      new WheelEvent('wheel', {
        ...Object.fromEntries(WHEEL_FIELDS.map(k => [k, event[k]])),
        bubbles: true,
        cancelable: true,
      }),
    );
  },
  { passive: false },
);

/* ---------------- credits ---------------- */
{
  const panel = $('#credits');
  $('#creditsList').innerHTML = T.credits
    .map(c => `<li><a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.text)}</a></li>`)
    .join('');
  $('#creditsBtn').onclick = () => {
    panel.hidden = !panel.hidden;
  };
  $('#creditsX').onclick = () => {
    panel.hidden = true;
  };
}

const search = initSearch({ T, $, esc, go, typeName, typeColor });

/* ---------------- camera direction for a place ---------------- */
// look from the side where the ground is lower, so a mountain never hides the place
function placeDirection(place) {
  if (place.camera?.dir) return new THREE.Vector3(...place.camera.dir).normalize();
  const reach = (place.camera?.zoom || 9) * 0.25;
  let lowest = null,
    floor = Infinity,
    top = -Infinity;
  for (let k = 0; k < 8; k++) {
    const angle = (k * Math.PI) / 4,
      x = place.v.x + Math.sin(angle) * reach,
      z = place.v.z + Math.cos(angle) * reach,
      height = WORLD.yAt(x, z);
    top = Math.max(top, height);
    if (height < floor) {
      floor = height;
      lowest = angle;
    }
  }
  if (top - floor < 0.5) return DEF_DIR.clone();
  return new THREE.Vector3(Math.sin(lowest) * 0.66, 0.62, Math.cos(lowest) * 0.66).normalize();
}

/* ---------------- URL routes ---------------- */
function go(hash) {
  if (location.hash.replace('#', '') === hash) route();
  else location.hash = hash;
}
function openHome() {
  state.day = null;
  state.sel = null;
  pressDay(activeMap === OVERVIEW || !T.overview ? 'all' : activeMap.id);
  showRoute(null);
  card.hidden = true;
  document.body.classList.remove('card-open');
  flyTo(HOME.target, HOME.dist, 900, false, HOME.dir);
}
async function route() {
  if (innerWidth <= MOBILE_WIDTH && weather.isOpen() && location.hash.length > 1) weather.close();
  const hash = decodeURIComponent(location.hash.replace(/^#/, ''));
  let match;
  state.story = null;
  if ((match = hash.match(/^dia-(\d+)(?:-(map-\d+))?$/)) && dayByNumber(+match[1])) {
    const n = +match[1],
      day = dayByNumber(n);
    const target = match[2] && mapById[match[2]] ? match[2] : day.crosses && T.overview ? 'overview' : day.map;
    if (!(await showMap(target))) return;
    state.day = n;
    state.sel = null;
    pressDay(n);
    showRoute(n);
    cardDay(n);
    placeFor(dayLine(n), dayStops(n));
  } else if ((match = hash.match(/^lugar-(.+)$/)) && placeById[match[1]]) {
    const place = placeById[match[1]];
    if (!(await showMap(place.map))) return;
    state.sel = place.id;
    if (state.day && !inDay(place)) {
      state.day = null;
      pressDay('all');
      showRoute(null);
    }
    state.groups.add(place.type);
    legendBody
      .querySelectorAll('button')
      .forEach(button => button.setAttribute('aria-pressed', state.groups.has(button.dataset.type)));
    cardPlace(place);
    const zoom = place.camera?.zoom || 9,
      offset = new THREE.Vector3(0, 0, innerWidth > MOBILE_WIDTH ? 1 : 4).multiplyScalar((zoom / 9) * 0.4);
    const auto = !place.camera?.dir;
    flyTo(
      (place.focus || place.v).clone().add(auto ? offset : new THREE.Vector3()),
      zoom,
      900,
      true,
      placeDirection(place),
    );
  } else if ((match = hash.match(/^regiao-(.+)$/)) && storyById[match[1]]) {
    const story = storyById[match[1]];
    if (!(await showMap(story.map))) return;
    state.story = story.id;
    state.sel = null;
    cardStory(story);
    placeFor(
      [WORLD.W3(story.lat, story.lon, 0.5)],
      (story.places || []).filter(id => placeById[id]?.map === story.map),
    );
  } else if ((match = hash.match(/^mapa-(.+)$/)) && mapById[match[1]]) {
    if (!(await showMap(match[1]))) return;
    openHome();
  } else {
    if (!(await showMap(T.overview ? 'overview' : T.maps[0].id))) return;
    openHome();
  }
}

/* ---------------- start ---------------- */
let surf = null;
function moduleChanged() {
  weather.update();
  surf?.decoratePins(pinEls);
  const box = $('#cpl');
  if (box && state.sel) box.innerHTML = surf?.placeHTML(placeById[state.sel]) ?? '';
}
const weather = initWeather({
  T,
  placeById,
  go,
  esc,
  $,
  bindGo,
  isDayOpen: () => state.day && !state.sel,
  onOpen() {
    if (innerWidth <= MOBILE_WIDTH && !card.hidden) {
      card.hidden = true;
      document.body.classList.remove('card-open');
    }
  },
});
const live = initLive({
  T,
  placeById,
  go,
  esc,
  $,
  bindGo,
  flyTo,
  scr,
  state,
  overlay,
  mapById,
  activeMap: () => activeMap,
  world: () => WORLD,
  overview: OVERVIEW,
  onOnline: () => weather.reload(),
});
if (T.modules.surf && T.places.some(place => place.spot)) {
  const { initSurf } = await import('./surf.js');
  surf = initSurf({ T, go, esc, bindGo, onChange: moduleChanged });
  weather.addExtra(surf);
}
if (T.modules.tides) {
  const { initTides } = await import('./tides.js');
  weather.addExtra(initTides({ T, esc, onChange: moduleChanged }));
}
resize();
camera.position.set(0, 80, 60);
controls.target.set(0, 0, 0);
controls.update();
await route();
if (WORLD) {
  camera.position.copy(controls.target).addScaledVector(HOME.dir, HOME.dist);
  if (!location.hash) {
    controls.target.copy(HOME.target);
    camera.position.copy(HOME.target).addScaledVector(HOME.dir, HOME.dist);
    fly = null;
  }
}
requestAnimationFrame(frame);
addEventListener('hashchange', route);
live.autoToday();
window.__ready = true;
