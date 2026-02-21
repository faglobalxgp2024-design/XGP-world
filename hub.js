// =====================================================
// HBU.JS (FULL) - LEGO 3D BLOCK WORLD (AAA Upgrade)
// - (1) Baseplate studs grid locked to WORLD coords (no drift)
// - (2) Minifig faces: expression + directional printing
// - (3) Portal-themed LEGO decorations for all 6 portals
// =====================================================

const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");

const toast = document.getElementById("toast");
const coordEl = document.getElementById("coord");
const fpsEl = document.getElementById("fps");
const fadeEl = document.getElementById("fade");

let W = 0, H = 0, DPR = 1;

/** =========================
 *  VIEW(줌) - 줌아웃
 * ========================= */
const VIEW = { zoom: 0.88, w: 0, h: 0 };

function resize() {
  DPR = Math.max(1, window.devicePixelRatio || 1);
  const r = canvas.getBoundingClientRect();
  W = r.width; H = r.height;

  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);

  VIEW.w = W / VIEW.zoom;
  VIEW.h = H / VIEW.zoom;

  ctx.setTransform(DPR * VIEW.zoom, 0, 0, DPR * VIEW.zoom, 0, 0);

  layoutWorld();
}
window.addEventListener("resize", resize);

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep(a, b, t) { t = clamp((t - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
function rnd01(seed) {
  seed = (seed ^ 0x9e3779b9) >>> 0;
  seed = Math.imul(seed, 0x85ebca6b) >>> 0;
  seed = Math.imul(seed ^ (seed >>> 13), 0xc2b2ae35) >>> 0;
  return ((seed ^ (seed >>> 16)) >>> 0) / 4294967296;
}
function hash01(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}
function isTouchDevice() { return (navigator.maxTouchPoints || 0) > 0; }

/** =========================
 *  WORLD / CAMERA
 * ========================= */
const WORLD = { w: 2800, h: 2100, margin: 140 };

const cam = { x: 0, y: 0, targetX: 0, targetY: 0 };
function worldToScreen(wx, wy) { return { x: wx - cam.x, y: wy - cam.y }; }
function screenToWorld(sx, sy) { return { x: sx + cam.x, y: sy + cam.y }; }

function updateCamera(dt) {
  cam.targetX = player.x - VIEW.w * 0.5;
  cam.targetY = player.y - VIEW.h * 0.56;
  cam.targetX = clamp(cam.targetX, 0, WORLD.w - VIEW.w);
  cam.targetY = clamp(cam.targetY, 0, WORLD.h - VIEW.h);

  const k = 1 - Math.pow(0.0012, dt);
  cam.x += (cam.targetX - cam.x) * k;
  cam.y += (cam.targetY - cam.y) * k;
}

/** =========================
 *  PORTALS (6)
 * ========================= */
const portals = [
  { key: "avoid",   label: "미니게임 피하기",   status: "open", url: "https://faglobalxgp2024-design.github.io/index.html/", type: "arcade", size: "L", x: 0, y: 0, w: 0, h: 0 },
  { key: "archery", label: "미니게임 양궁",     status: "open", url: "https://ttjdwls777-eng.github.io/XGP-MINI-GAME2/",      type: "tower",  size: "M", x: 0, y: 0, w: 0, h: 0 },
  { key: "janggi",  label: "미니게임 장기",     status: "open", url: "https://faglobalxgp2024-design.github.io/MINIGAME/",     type: "dojo",   size: "L", x: 0, y: 0, w: 0, h: 0 },
  { key: "jump",    label: "미니게임 점프하기", status: "soon", url: "", type: "gym",   size: "S", x: 0, y: 0, w: 0, h: 0 },
  { key: "snow",    label: "미니게임 눈굴리기", status: "soon", url: "", type: "igloo", size: "M", x: 0, y: 0, w: 0, h: 0 },
  { key: "omok",    label: "미니게임 오목",     status: "soon", url: "", type: "cafe",  size: "M", x: 0, y: 0, w: 0, h: 0 },
];
function portalsByKey(k) { return portals.find(p => p.key === k); }

/** =========================
 *  PLAYER (LEGO MINIFIG)
 * ========================= */
const player = {
  x: 360, y: 360,
  r: 18,
  speed: 260,
  moving: false,
  animT: 0,
  bobT: 0,
  dir: "down",
  face: { mood: "smile", moodT: 0 }, // smile | wow | spark
};

let activePortal = null;
let entering = false;

/** =========================
 *  INPUT
 * ========================= */
const keys = new Set();
let dragging = false;
let dragOffset = { x: 0, y: 0 };
let pointer = { x: 0, y: 0, active: false, lastMoveAt: 0 };

window.addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());
  if ((e.key === "Enter" || e.key.toLowerCase() === "e") && activePortal) tryEnter(activePortal);
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

canvas.addEventListener("pointerenter", () => pointer.active = true);
canvas.addEventListener("pointerleave", () => pointer.active = false);

canvas.addEventListener("pointerdown", (e) => {
  const p = getPointer(e);
  const w = screenToWorld(p.x, p.y);
  const dx = w.x - player.x, dy = w.y - player.y;
  if (dx * dx + dy * dy <= (player.r + 20) * (player.r + 20)) {
    dragging = true;
    dragOffset.x = player.x - w.x;
    dragOffset.y = player.y - w.y;
    canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener("pointermove", (e) => {
  const p = getPointer(e);
  pointer.x = p.x; pointer.y = p.y;
  pointer.lastMoveAt = performance.now();

  if (!dragging) return;

  const prev = { x: player.x, y: player.y };
  const w = screenToWorld(p.x, p.y);
  player.x = w.x + dragOffset.x;
  player.y = w.y + dragOffset.y;
  clampPlayerToWorld();
  updateDirFromDelta(player.x - prev.x, player.y - prev.y);
  player.moving = true;
  player.animT += 1 / 60;
});
canvas.addEventListener("pointerup", () => {
  dragging = false;
  if (activePortal && isTouchDevice()) tryEnter(activePortal);
});

function getPointer(e) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - r.left) / VIEW.zoom,
    y: (e.clientY - r.top) / VIEW.zoom
  };
}

function clampPlayerToWorld() {
  player.x = clamp(player.x, WORLD.margin, WORLD.w - WORLD.margin);
  player.y = clamp(player.y, WORLD.margin, WORLD.h - WORLD.margin);
}

/** =========================
 *  ROADS / SIDEWALKS / CROSSINGS
 * ========================= */
const roads = [];
const sidewalks = [];
const crossings = [];

/** =========================
 *  CARS
 * ========================= */
const cars = [];
const CAR_COLORS = ["#ff3b30", "#ff9500", "#ffcc00", "#34c759", "#0a84ff", "#5856d6", "#ff2d55", "#ffffff"];

function seedCars() {
  cars.length = 0;
  const hr = roads[0];
  const vr = roads[1];
  if (!hr || !vr) return;

  const makeCar = (axis, idx) => {
    const col = CAR_COLORS[Math.floor(rnd01(1000 + idx * 77) * CAR_COLORS.length)];
    const speed = 110 + rnd01(2000 + idx * 33) * 110;

    if (axis === "h") {
      const lane = rnd01(3000 + idx) < 0.5 ? 0 : 1;
      const dir = rnd01(4000 + idx) < 0.5 ? 1 : -1;
      return {
        kind: "car",
        axis: "h",
        dir,
        color: col,
        speed,
        w: 58 + rnd01(5000 + idx) * 18,
        h: 28 + rnd01(6000 + idx) * 8,
        x: hr.x + rnd01(7000 + idx) * hr.w,
        y: hr.y + (lane === 0 ? hr.h * 0.37 : hr.h * 0.66),
        bob: rnd01(8000 + idx) * 10
      };
    } else {
      const lane = rnd01(9000 + idx) < 0.5 ? 0 : 1;
      const dir = rnd01(10000 + idx) < 0.5 ? 1 : -1; // +1 아래, -1 위
      return {
        kind: "car",
        axis: "v",
        dir,
        color: col,
        speed,
        w: 28 + rnd01(11000 + idx) * 10,
        h: 64 + rnd01(12000 + idx) * 18,
        x: vr.x + (lane === 0 ? vr.w * 0.37 : vr.w * 0.66),
        y: vr.y + rnd01(13000 + idx) * vr.h,
        bob: rnd01(14000 + idx) * 10
      };
    }
  };

  for (let i = 0; i < 8; i++) cars.push(makeCar("h", i));
  for (let i = 0; i < 7; i++) cars.push(makeCar("v", 100 + i));
}

/** =========================
 *  LEGO PATTERNS / BASEPLATE LOCK
 * ========================= */
let studPattern = null;
let brickPattern = null;

const STUD = 24; // ✅ (1) WORLD 기준 스터드 간격 고정

function makePattern(w, h, drawFn) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  drawFn(g, w, h);
  return ctx.createPattern(c, "repeat");
}

function buildPatterns() {
  studPattern = makePattern(STUD * 4, STUD * 4, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let y = STUD * 0.5; y < h; y += STUD) {
      for (let x = STUD * 0.5; x < w; x += STUD) {
        g.fillStyle = "rgba(255,255,255,0.18)";
        g.beginPath(); g.arc(x, y, 4.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = "rgba(0,0,0,0.10)";
        g.beginPath(); g.arc(x + 1.2, y + 1.2, 4.2, 0, Math.PI * 2); g.fill();
        g.fillStyle = "rgba(255,255,255,0.20)";
        g.beginPath(); g.arc(x - 1.2, y - 1.4, 2.0, 0, Math.PI * 2); g.fill();
      }
    }
  });

  brickPattern = makePattern(120, 80, (g, w, h) => {
    g.fillStyle = "rgba(255,255,255,0.05)";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(0,0,0,0.18)";
    g.lineWidth = 1;

    const bw = 30, bh = 14;
    for (let yy = 0; yy <= h + bh; yy += bh) {
      const off = (((yy / bh) | 0) % 2) ? bw / 2 : 0;
      for (let xx = -bw; xx <= w + bw; xx += bw) {
        g.strokeRect(xx + off + 1, yy + 1, bw - 2, bh - 2);
      }
    }

    g.globalAlpha = 0.20;
    g.strokeStyle = "rgba(255,255,255,0.20)";
    for (let i = 0; i < 45; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 10, y + 2);
      g.stroke();
    }
    g.globalAlpha = 1;
  });
}

/** =========================
 *  props / signs
 * ========================= */
const props = [];
const signs = [];

function seedProps() {
  props.length = 0;
  signs.length = 0;

  const isOnRoadLike = (x, y) => {
    for (const r of roads) {
      if (x >= r.x - 18 && x <= r.x + r.w + 18 && y >= r.y - 18 && y <= r.y + r.h + 18) return true;
    }
    return false;
  };

  for (let i = 0; i < 9; i++) {
    props.push({
      kind: "house",
      x: WORLD.w * 0.12 + rnd01(100 + i) * WORLD.w * 0.28,
      y: WORLD.h * 0.12 + rnd01(200 + i) * WORLD.h * 0.28,
      s: 0.95 + rnd01(300 + i) * 0.55,
      color: CAR_COLORS[(i * 3) % CAR_COLORS.length]
    });
  }
  for (let i = 0; i < 9; i++) {
    props.push({
      kind: "shop",
      x: WORLD.w * 0.58 + rnd01(400 + i) * WORLD.w * 0.30,
      y: WORLD.h * 0.12 + rnd01(500 + i) * WORLD.h * 0.30,
      s: 0.95 + rnd01(600 + i) * 0.65,
      color: CAR_COLORS[(i * 5 + 2) % CAR_COLORS.length]
    });
  }

  props.push({ kind: "ferris", x: WORLD.w * 0.84, y: WORLD.h * 0.78, s: 1.05 });
  props.push({ kind: "carousel", x: WORLD.w * 0.70, y: WORLD.h * 0.82, s: 1.0 });

  const tries = 260;
  for (let i = 0; i < tries; i++) {
    const x = WORLD.margin + rnd01(10000 + i) * (WORLD.w - WORLD.margin * 2);
    const y = WORLD.margin + rnd01(11000 + i) * (WORLD.h - WORLD.margin * 2);
    if (isOnRoadLike(x, y)) continue;

    const r = rnd01(12000 + i);
    if (r < 0.42) props.push({ kind: "tree", x, y, s: 0.90 + rnd01(13000 + i) * 0.95, v: rnd01(14000 + i) * 10 });
    else if (r < 0.56) props.push({ kind: "lamp", x, y, s: 0.90 + rnd01(15000 + i) * 0.55 });
    else if (r < 0.68) props.push({ kind: "bench", x, y, s: 0.95 + rnd01(16000 + i) * 0.35 });
    else if (r < 0.90) props.push({ kind: "flower", x, y, s: 0.85 + rnd01(17000 + i) * 1.0 });
    else props.push({ kind: "fence", x, y, s: 0.90 + rnd01(18000 + i) * 0.70, a: (rnd01(19000 + i) < 0.5 ? 0 : Math.PI / 2) });
  }

  for (const p of portals) {
    props.push({ kind: "flower", x: p.x + p.w * 0.22, y: p.y + p.h + 28, s: 1.35 });
    props.push({ kind: "flower", x: p.x + p.w * 0.78, y: p.y + p.h + 20, s: 1.15 });
  }

  const arch = portalsByKey("archery");
  const jang = portalsByKey("janggi");
  signs.push({ x: arch.x + arch.w * 0.5 - 10, y: arch.y + arch.h + 92, text: "양궁 →" });
  signs.push({ x: jang.x + jang.w * 0.5 + 10, y: jang.y + jang.h + 92, text: "← 장기" });
}

/** =========================
 *  particles / footprints
 * ========================= */
const particles = [];
function spawnPortalParticles(p, t) {
  const zx = p.x + p.w * 0.5;
  const zy = p.y + p.h * 0.78;
  const d = Math.hypot(player.x - zx, player.y - zy);
  if (d > 240) return;

  const rate = (activePortal === p) ? 14 : 6;
  const n = Math.random() < rate / 60 ? 1 : 0;
  for (let i = 0; i < n; i++) {
    particles.push({
      x: zx + (Math.random() - 0.5) * 76,
      y: zy - 14 + (Math.random() - 0.5) * 26,
      vx: (Math.random() - 0.5) * 20,
      vy: -36 - Math.random() * 34,
      life: 0.9 + Math.random() * 0.8,
      age: 0,
      r: 1.4 + Math.random() * 2.8,
      a: 0.65 + Math.random() * 0.25
    });
  }
}

const footprints = [];
let footStepAcc = 0;
function addFootprint(dt) {
  if (!player.moving) { footStepAcc = 0; return; }
  footStepAcc += dt * (player.speed / 220);
  if (footStepAcc < 0.11) return;
  footStepAcc = 0;

  let ox = 0, oy = 0;
  if (player.dir === "up") oy = 10;
  else if (player.dir === "down") oy = -6;
  else if (player.dir === "left") ox = 8;
  else if (player.dir === "right") ox = -8;

  footprints.push({
    x: player.x + ox + (Math.random() - 0.5) * 2,
    y: player.y + 26 + oy + (Math.random() - 0.5) * 2,
    life: 1.35,
    age: 0
  });
}

/** =========================
 *  portal enter zone
 * ========================= */
function portalEnterZone(p) {
  const zx = p.x + p.w * 0.50 - 28;
  const zy = p.y + p.h * 0.74;
  return { x: zx, y: zy, w: 56, h: 44 };
}
function circleRectHit(cx, cy, r, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX, dy = cy - closestY;
  return (dx * dx + dy * dy) <= r * r;
}

/** =========================
 *  enter
 * ========================= */
function tryEnter(p) {
  if (entering) return;
  if (p.status !== "open") {
    toast.hidden = false;
    toast.innerHTML = `<b>${p.label}</b> · 현재 <b>[오픈준비중]</b> 입니다 ✨`;
    setTimeout(() => { if (activePortal !== p) toast.hidden = true; }, 1200);
    return;
  }
  entering = true;
  player.face.mood = "wow"; // ✅ 입장 시 놀람 표정
  player.face.moodT = 0.55;
  fadeEl.classList.add("on");
  setTimeout(() => window.location.href = p.url, 380);
}

/** =========================
 *  direction helpers
 * ========================= */
function updateDirFromAxes(ax, ay) {
  if (Math.abs(ay) >= Math.abs(ax)) player.dir = ay < 0 ? "up" : "down";
  else player.dir = ax < 0 ? "left" : "right";
}
function updateDirFromDelta(dx, dy) {
  if (dx === 0 && dy === 0) return;
  updateDirFromAxes(dx, dy);
}

/** =========================
 *  background sky/clouds/birds
 * ========================= */
const clouds = Array.from({ length: 12 }, (_, i) => ({
  x: rnd01(70000 + i) * 3400,
  y: 44 + rnd01(71000 + i) * 260,
  s: 0.7 + rnd01(72000 + i) * 1.25,
  v: 10 + rnd01(73000 + i) * 18,
  layer: rnd01(74000 + i) < 0.5 ? 0 : 1
}));

const birds = Array.from({ length: 7 }, (_, i) => ({
  x: rnd01(80000 + i) * 3200,
  y: 70 + rnd01(81000 + i) * 180,
  p: rnd01(82000 + i) * 10,
  v: 24 + rnd01(83000 + i) * 24
}));

/** =========================
 *  depth sort
 * ========================= */
function getFootY(entity) {
  if (entity.kind === "building") return entity.y + entity.h;
  if (entity.kind === "car") return entity.y + entity.h;
  if (entity.kind === "tree") return entity.y + 68 * entity.s;
  if (entity.kind === "lamp") return entity.y + 74 * entity.s;
  if (entity.kind === "bench") return entity.y + 34 * entity.s;
  if (entity.kind === "flower") return entity.y + 12 * entity.s;
  if (entity.kind === "fence") return entity.y + 18 * entity.s;
  if (entity.kind === "house") return entity.y + 96 * entity.s;
  if (entity.kind === "shop") return entity.y + 98 * entity.s;
  if (entity.kind === "ferris") return entity.y + 190 * entity.s;
  if (entity.kind === "carousel") return entity.y + 130 * entity.s;
  if (entity.kind === "sign") return entity.y + 40;
  if (entity.kind === "player") return entity.y + 28;
  return entity.y;
}

/** =========================
 *  layout
 * ========================= */
function layoutWorld() {
  WORLD.w = Math.max(3200, Math.floor(W * 3.7));
  WORLD.h = Math.max(2350, Math.floor(H * 3.3));

  const base = 240;
  const mul = { S: 0.82, M: 1.00, L: 1.26 };
  for (const p of portals) {
    const m = mul[p.size] || 1;
    p.w = base * 1.22 * m;
    p.h = base * 0.92 * m;
  }

  portalsByKey("jump").x = WORLD.w * 0.22; portalsByKey("jump").y = WORLD.h * 0.22;
  portalsByKey("archery").x = WORLD.w * 0.50; portalsByKey("archery").y = WORLD.h * 0.18;
  portalsByKey("omok").x = WORLD.w * 0.78; portalsByKey("omok").y = WORLD.h * 0.24;

  portalsByKey("avoid").x = WORLD.w * 0.20; portalsByKey("avoid").y = WORLD.h * 0.62;
  portalsByKey("janggi").x = WORLD.w * 0.78; portalsByKey("janggi").y = WORLD.h * 0.62;
  portalsByKey("snow").x = WORLD.w * 0.50; portalsByKey("snow").y = WORLD.h * 0.80;

  for (const p of portals) {
    p.x -= p.w / 2;
    p.y -= p.h / 2;
    p.x = clamp(p.x, WORLD.margin, WORLD.w - WORLD.margin - p.w);
    p.y = clamp(p.y, WORLD.margin, WORLD.h - WORLD.margin - p.h);
  }

  roads.length = 0; sidewalks.length = 0; crossings.length = 0;

  roads.push({ x: WORLD.w * 0.10, y: WORLD.h * 0.48, w: WORLD.w * 0.80, h: 144 });
  sidewalks.push({ x: WORLD.w * 0.10, y: WORLD.h * 0.48 - 52, w: WORLD.w * 0.80, h: 40 });
  sidewalks.push({ x: WORLD.w * 0.10, y: WORLD.h * 0.48 + 156, w: WORLD.w * 0.80, h: 40 });

  roads.push({ x: WORLD.w * 0.50 - 70, y: WORLD.h * 0.10, w: 140, h: WORLD.h * 0.82 });
  sidewalks.push({ x: WORLD.w * 0.50 - 70 - 52, y: WORLD.h * 0.10, w: 38, h: WORLD.h * 0.82 });
  sidewalks.push({ x: WORLD.w * 0.50 + 70 + 14, y: WORLD.h * 0.10, w: 38, h: WORLD.h * 0.82 });

  crossings.push({ x: WORLD.w * 0.50 - 102, y: WORLD.h * 0.48 + 36, w: 204, h: 62 });
  crossings.push({ x: WORLD.w * 0.50 - 102, y: WORLD.h * 0.48 - 94, w: 204, h: 62 });

  buildPatterns();
  seedCars();
  seedProps();

  player.x = clamp(player.x, WORLD.margin + 90, WORLD.w - WORLD.margin - 90);
  player.y = clamp(player.y, WORLD.margin + 90, WORLD.h - WORLD.margin - 90);
}

/** =========================
 *  palettes
 * ========================= */
function buildingPalette(type) {
  const pal = {
    arcade: { main: "#ff79b0", roof: "#ff2d55", accent: "#0a84ff", trim: "#ffffff" },
    tower:  { main: "#6be4ff", roof: "#0a84ff", accent: "#ffcc00", trim: "#ffffff" },
    dojo:   { main: "#40e6a6", roof: "#34c759", accent: "#ff3b30", trim: "#ffffff" },
    gym:    { main: "#ffd166", roof: "#ff9500", accent: "#5856d6", trim: "#ffffff" },
    igloo:  { main: "#cfe9ff", roof: "#6be4ff", accent: "#34c759", trim: "#ffffff" },
    cafe:   { main: "#c6a3ff", roof: "#5856d6", accent: "#ffcc00", trim: "#ffffff" },
  };
  return pal[type] || pal.arcade;
}

/** =========================
 *  LEGO 3D utils
 * ========================= */
function roundRect(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function shadeHex(hex, amt) {
  const h = hex.replace("#", "");
  const r = clamp(parseInt(h.slice(0, 2), 16) + amt, 0, 255);
  const g = clamp(parseInt(h.slice(2, 4), 16) + amt, 0, 255);
  const b = clamp(parseInt(h.slice(4, 6), 16) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}

function glossy(x, y, w, h, a = 0.20) {
  ctx.save();
  ctx.globalAlpha = a;
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, "rgba(255,255,255,0.80)");
  g.addColorStop(0.35, "rgba(255,255,255,0.20)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  roundRect(x + 6, y + 6, w - 12, Math.max(18, h * 0.40), 14);
  ctx.fill();
  ctx.restore();
}

function groundAO(x, y, rx, ry, a = 0.22) {
  ctx.save();
  const g = ctx.createRadialGradient(x, y, 8, x, y, Math.max(rx, ry));
  g.addColorStop(0, `rgba(0,0,0,${a})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function brick3D(x, y, w, h, color, r = 14) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 2;
  roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.22)";
  roundRect(x + 2, y + 2, w - 4, Math.max(8, h * 0.20), Math.max(2, r - 2));
  ctx.fill();

  ctx.fillStyle = "rgba(0,0,0,0.14)";
  roundRect(x + w - 10, y + 2, 8, h - 4, Math.max(2, r - 2));
  ctx.fill();

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = brickPattern || "rgba(255,255,255,0.08)";
  roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.restore();

  if (w > 40 && h > 26) {
    const cols = Math.max(1, Math.floor(w / 26));
    const rows = Math.max(1, Math.floor(h / 26));
    const sx0 = x + w * 0.12;
    const sy0 = y + h * 0.18;
    const dx = (w * 0.76) / cols;
    const dy = (h * 0.56) / rows;

    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        const cx = sx0 + ix * dx + dx * 0.5;
        const cy = sy0 + iy * dy + dy * 0.5;

        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        ctx.beginPath(); ctx.arc(cx - 1.6, cy - 1.8, 3.4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(0,0,0,0.16)";
        ctx.beginPath(); ctx.arc(cx + 1.0, cy + 1.2, 3.6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.beginPath(); ctx.arc(cx - 1.2, cy - 1.2, 2.0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  glossy(x, y, w, h, 0.16);
  ctx.restore();
}

function windowLego(x, y, w, h) {
  brick3D(x - 3, y - 3, w + 6, h + 6, "#ffffff", 10);
  ctx.save();
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, "rgba(120,220,255,0.95)");
  g.addColorStop(1, "rgba(0,0,0,0.10)");
  ctx.fillStyle = g;
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 2;
  roundRect(x, y, w, h, 9);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  roundRect(x + 2, y + 2, w * 0.45, 6, 6);
  ctx.fill();
  ctx.restore();
}

/** =========================
 *  SKY / CLOUDS / GROUND
 * ========================= */
function drawSkyWorld(t) {
  const g = ctx.createLinearGradient(0, 0, 0, WORLD.h);
  g.addColorStop(0, "#89d2ff");
  g.addColorStop(0.42, "#b9f0ff");
  g.addColorStop(0.70, "#bdf6c8");
  g.addColorStop(1, "#f7d0ff");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  ctx.save();
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 8; i++) {
    const x = (i / 8) * WORLD.w;
    ctx.fillRect(x, WORLD.h * 0.04, WORLD.w / 12, WORLD.h * 0.26);
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "rgba(0,0,0,0.50)";
  for (const b of birds) {
    const yy = b.y + Math.sin(b.p) * 6;
    const xx = b.x;
    ctx.fillRect(xx - 7, yy, 5, 2);
    ctx.fillRect(xx + 2, yy, 5, 2);
    ctx.fillRect(xx, yy - 2, 2, 2);
  }
  ctx.restore();
}

function legoCloud(x, y, w, h, a) {
  ctx.save();
  ctx.globalAlpha = a;
  const parts = 6;
  for (let i = 0; i < parts; i++) {
    const px = x + (i - parts / 2) * (w / parts) * 0.75;
    const py = y + ((i % 2) ? -h * 0.15 : h * 0.05);
    brick3D(px, py, w / parts + 14, h + 18, "#ffffff", 16);
  }
  ctx.restore();
}

function drawCloudsWorld() {
  for (const c of clouds) {
    const alpha = (c.layer === 0 ? 0.90 : 0.74);
    legoCloud(c.x, c.y, 170 * c.s, 58 * c.s, alpha);
  }
}

// ✅ (1) WORLD 기준 격자 고정 플레이트 렌더링
function drawBaseplateStuds(x0, y0, x1, y1) {
  // view 범위만 그려 성능 유지
  const startX = Math.floor(x0 / STUD) * STUD;
  const startY = Math.floor(y0 / STUD) * STUD;
  const endX = Math.ceil(x1 / STUD) * STUD;
  const endY = Math.ceil(y1 / STUD) * STUD;

  ctx.save();
  ctx.globalAlpha = 0.22;

  for (let y = startY; y <= endY; y += STUD) {
    for (let x = startX; x <= endX; x += STUD) {
      // studs: tiny bevel
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath(); ctx.arc(x + STUD * 0.5 - 1.2, y + STUD * 0.5 - 1.4, 4.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,0.11)";
      ctx.beginPath(); ctx.arc(x + STUD * 0.5 + 0.8, y + STUD * 0.5 + 1.0, 4.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.14)";
      ctx.beginPath(); ctx.arc(x + STUD * 0.5 - 1.8, y + STUD * 0.5 - 2.0, 2.1, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function drawGroundWorld() {
  ctx.save();
  ctx.fillStyle = "#43d17a";
  ctx.fillRect(0, WORLD.h * 0.30, WORLD.w, WORLD.h * 0.70);

  // studs locked (WORLD coords)
  drawBaseplateStuds(0, WORLD.h * 0.30, WORLD.w, WORLD.h);

  ctx.globalAlpha = 0.12;
  const sh = ctx.createLinearGradient(0, WORLD.h * 0.30, 0, WORLD.h);
  sh.addColorStop(0, "rgba(0,0,0,0.00)");
  sh.addColorStop(1, "rgba(0,0,0,0.40)");
  ctx.fillStyle = sh;
  ctx.fillRect(0, WORLD.h * 0.30, WORLD.w, WORLD.h * 0.70);
  ctx.restore();
}

/** =========================
 *  roads / sidewalks / crossings
 * ========================= */
function drawRoadsAndSidewalks(t) {
  for (const r of roads) {
    groundAO(r.x + r.w * 0.52, r.y + r.h * 0.65, r.w * 0.55, r.h * 0.40, 0.18);
    brick3D(r.x, r.y, r.w, r.h, "#2c2f3a", 44);

    ctx.save();
    ctx.globalAlpha = 0.80;
    ctx.fillStyle = "#ffffff";
    const dash = 26, gap = 20;
    for (let x = r.x + 42; x < r.x + r.w - 42; x += dash + gap) {
      roundRect(x, r.y + r.h * 0.50 - 3, dash, 6, 4);
      ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "#ffffff";
    roundRect(r.x + 10, r.y + 10, r.w - 20, r.h * 0.25, 30);
    ctx.fill();
    ctx.restore();
  }

  for (const s of sidewalks) {
    groundAO(s.x + s.w * 0.52, s.y + s.h * 0.70, s.w * 0.52, s.h * 0.55, 0.12);
    brick3D(s.x, s.y, s.w, s.h, "#ffe9d6", 20);

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    const step = 20;
    for (let x = s.x + 8; x < s.x + s.w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, s.y + 6);
      ctx.lineTo(x, s.y + s.h - 6);
      ctx.stroke();
    }
    ctx.restore();
  }

  for (const c of crossings) {
    groundAO(c.x + c.w * 0.5, c.y + c.h * 0.65, c.w * 0.55, c.h * 0.45, 0.12);
    brick3D(c.x, c.y, c.w, c.h, "#2c2f3a", 16);

    ctx.save();
    ctx.globalAlpha = 0.92;
    for (let i = 0; i < 9; i++) {
      const yy = c.y + 8 + i * 6.5;
      ctx.fillStyle = (i % 2 === 0) ? "#ffffff" : "rgba(255,255,255,0.10)";
      ctx.fillRect(c.x + 14, yy, c.w - 28, 4);
    }
    ctx.restore();
  }
}

/** =========================
 *  sign
 * ========================= */
function drawSign(s, t) {
  const sway = Math.sin(t * 1.6 + s.x * 0.01) * 1.2;

  ctx.save();
  ctx.translate(s.x, s.y + sway);

  groundAO(0, 26, 22, 8, 0.16);
  brick3D(-6, -20, 12, 48, "#cfd5dd", 8);
  brick3D(-62, -58, 124, 38, "#ffffff", 16);
  brick3D(-60, -56, 120, 34, "#0a84ff", 14);

  ctx.fillStyle = "rgba(0,0,0,0.90)";
  ctx.font = "900 14px system-ui";
  ctx.fillText(s.text, -44, -34);

  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "#ffcc00";
  ctx.beginPath(); ctx.arc(50, -38, 5, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}

/** =========================
 *  car draw
 * ========================= */
function drawCar(c, t) {
  const bounce = Math.sin(c.bob) * 0.6;
  ctx.save();
  ctx.translate(c.x, c.y + bounce);

  if (c.axis === "h") {
    if (c.dir < 0) ctx.scale(-1, 1);
    const w = c.w, h = c.h;

    groundAO(0, h * 0.62, w * 0.60, h * 0.28, 0.20);
    brick3D(-w * 0.54, -h * 0.44, w * 1.08, h * 0.86, c.color, 12);

    brick3D(-w * 0.18, -h * 0.78, w * 0.46, h * 0.40, "#ffffff", 10);
    windowLego(-w * 0.14, -h * 0.68, w * 0.30, h * 0.22);

    ctx.save();
    ctx.fillStyle = "#1a1a1a";
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(-w * 0.30, h * 0.40, h * 0.22, 0, Math.PI * 2);
    ctx.arc(w * 0.30, h * 0.40, h * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.arc(-w * 0.32, h * 0.36, h * 0.08, 0, Math.PI * 2);
    ctx.arc(w * 0.28, h * 0.36, h * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#ffffff";
    roundRect(w * 0.44, -h * 0.08, 8, 10, 4);
    ctx.fill();
    ctx.restore();

    ctx.restore();
    return;
  }

  const w = c.w, h = c.h;
  const goingDown = c.dir > 0;

  groundAO(0, h * 0.46, w * 0.75, h * 0.22, 0.20);
  brick3D(-w * 0.60, -h * 0.54, w * 1.20, h * 1.08, c.color, 14);
  windowLego(-w * 0.34, -h * 0.32, w * 0.68, h * 0.55);

  ctx.save();
  ctx.fillStyle = "#1a1a1a";
  ctx.globalAlpha = 0.95;
  roundRect(-w * 0.72, -h * 0.18, w * 0.16, h * 0.18, 6);
  roundRect(w * 0.56,  -h * 0.18, w * 0.16, h * 0.18, 6);
  roundRect(-w * 0.72,  h * 0.02, w * 0.16, h * 0.18, 6);
  roundRect(w * 0.56,   h * 0.02, w * 0.16, h * 0.18, 6);
  ctx.fill();
  ctx.restore();

  // ✅ FIX: 위로 갈 때는 위쪽에 테일라이트(뒷모습)
  if (goingDown) {
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "#ffffff";
    roundRect(-w * 0.24, h * 0.46, w * 0.18, h * 0.10, 8);
    roundRect(w * 0.06,  h * 0.46, w * 0.18, h * 0.10, 8);
    ctx.fill();
    ctx.restore();
  } else {
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "#ff2d55";
    roundRect(-w * 0.24, -h * 0.56, w * 0.18, h * 0.10, 8);
    roundRect(w * 0.06,  -h * 0.56, w * 0.18, h * 0.10, 8);
    ctx.fill();

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#ffffff";
    roundRect(-w * 0.38, -h * 0.52, w * 0.76, h * 0.06, 10);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}

/** =========================
 *  portal roof
 * ========================= */
function drawPortalRoofLego(p, pal, t) {
  const x = p.x, y = p.y, w = p.w;

  if (p.type === "tower") {
    brick3D(x + w * 0.38, y + 6, w * 0.24, 70, pal.roof, 18);

    const sway = Math.sin(t * 2.2 + hash01(p.key) * 10) * 8;
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.50, y - 10);
    ctx.lineTo(x + w * 0.50, y + 14);
    ctx.stroke();

    ctx.fillStyle = "#ffcc00";
    ctx.beginPath();
    ctx.moveTo(x + w * 0.50, y - 10);
    ctx.lineTo(x + w * 0.50 + 24 + sway, y - 6);
    ctx.lineTo(x + w * 0.50, y - 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  if (p.type === "dojo") {
    brick3D(x + w * 0.18, y + 28, w * 0.64, 46, pal.roof, 22);
    brick3D(x + w * 0.26, y + 14, w * 0.48, 36, shadeHex(pal.roof, +12), 22);
    return;
  }

  if (p.type === "igloo") {
    const cx = x + w * 0.5;
    for (let i = 0; i < 5; i++) {
      const ww = w * (0.52 - i * 0.08);
      brick3D(cx - ww * 0.5, y + 18 + i * 12, ww, 22, pal.roof, 18);
    }
    const puff = 0.5 + 0.5 * Math.sin(t * 1.6 + hash01(p.key) * 10);
    ctx.save();
    ctx.globalAlpha = 0.20 + 0.18 * puff;
    brick3D(cx + 20, y - 8 - puff * 6, 22, 22, "#ffffff", 14);
    ctx.restore();
    return;
  }

  if (p.type === "cafe" || p.type === "gym") {
    brick3D(x + w * 0.18, y + 18, w * 0.64, 46, pal.roof, 18);

    if (p.type === "cafe") {
      const sway = Math.sin(t * 2.0 + hash01(p.key) * 10) * 2;
      brick3D(x + w * 0.18, y + 68 + sway, w * 0.64, 26, "#ffffff", 14);
      ctx.save();
      ctx.globalAlpha = 0.80;
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = (i % 2 === 0) ? "#ff79b0" : "#ffcc00";
        ctx.fillRect(x + w * 0.18 + i * (w * 0.64 / 7), y + 68 + sway, w * 0.64 / 14, 26);
      }
      ctx.restore();
    } else {
      const blink = Math.sin(t * 3.2 + hash01(p.key) * 10) > 0.2;
      ctx.save();
      ctx.globalAlpha = blink ? 0.95 : 0.55;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath();
      ctx.moveTo(x + w * 0.52, y + 10);
      ctx.lineTo(x + w * 0.48, y + 30);
      ctx.lineTo(x + w * 0.54, y + 30);
      ctx.lineTo(x + w * 0.50, y + 46);
      ctx.lineTo(x + w * 0.58, y + 24);
      ctx.lineTo(x + w * 0.52, y + 24);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    return;
  }

  brick3D(x + w * 0.20, y + 28, w * 0.60, 50, pal.roof, 20);

  const beat = 0.9 + 0.15 * (0.5 + 0.5 * Math.sin(t * 3.0 + hash01(p.key) * 10));
  ctx.save();
  ctx.globalAlpha = 0.90;
  ctx.translate(x + w * 0.50, y + 46);
  ctx.scale(beat, beat);
  ctx.fillStyle = "#ff2d55";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(-10, -10, -18, 6, 0, 14);
  ctx.bezierCurveTo(18, 6, 10, -10, 0, 0);
  ctx.fill();
  ctx.restore();
}

/** =========================
 *  ✅ (3) Portal Theme Decorations
 * ========================= */
function drawPortalDecorations(p, t) {
  const cx = p.x + p.w * 0.5;
  const baseY = p.y + p.h + 18;
  const pulse = 0.5 + 0.5 * Math.sin(t * 3.0 + hash01(p.key) * 12);

  // small platform
  ctx.save();
  groundAO(cx, baseY + 18, 110, 18, 0.12);
  brick3D(cx - 120, baseY, 240, 26, "#ffffff", 16);
  ctx.restore();

  if (p.key === "archery") {
    // target + arrow
    const tx = cx - 74, ty = baseY - 76;
    brick3D(tx, ty, 148, 70, "#ffffff", 18);
    // rings
    const rings = ["#ff2d55", "#ffffff", "#0a84ff", "#ffffff", "#ffcc00"];
    for (let i = 0; i < rings.length; i++) {
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = rings[i];
      roundRect(tx + 12 + i * 10, ty + 10 + i * 6, 124 - i * 20, 50 - i * 12, 16);
      ctx.fill();
      ctx.restore();
    }
    // arrow
    brick3D(cx + 62, baseY - 52, 70, 12, "#cfd5dd", 10);
    brick3D(cx + 120, baseY - 56, 12, 20, "#ffcc00", 10);
  }

  if (p.key === "janggi") {
    // janggi board + pieces
    const bx = cx - 92, by = baseY - 70;
    brick3D(bx, by, 184, 66, "#ffe9d6", 14);

    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "rgba(0,0,0,0.65)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 8; i++) {
      const x = bx + 16 + i * 19;
      ctx.beginPath(); ctx.moveTo(x, by + 10); ctx.lineTo(x, by + 56); ctx.stroke();
    }
    for (let j = 0; j <= 4; j++) {
      const y = by + 12 + j * 11;
      ctx.beginPath(); ctx.moveTo(bx + 16, y); ctx.lineTo(bx + 168, y); ctx.stroke();
    }
    ctx.restore();

    // pieces
    const piece = (x, y, col) => {
      brick3D(x - 12, y - 12, 24, 24, "#ffffff", 12);
      brick3D(x - 10, y - 10, 20, 20, col, 12);
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.80)";
      ctx.font = "900 10px system-ui";
      ctx.fillText("將", x - 7, y + 4);
      ctx.restore();
    };
    piece(cx - 52, baseY - 34, "#ff2d55");
    piece(cx - 12, baseY - 46, "#0a84ff");
    piece(cx + 30, baseY - 34, "#34c759");
  }

  if (p.key === "omok") {
    // omok board + stones
    const bx = cx - 92, by = baseY - 70;
    brick3D(bx, by, 184, 66, "#d4a06a", 14);

    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "rgba(0,0,0,0.70)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const x = bx + 18 + i * 17;
      ctx.beginPath(); ctx.moveTo(x, by + 10); ctx.lineTo(x, by + 56); ctx.stroke();
    }
    for (let j = 0; j < 5; j++) {
      const y = by + 12 + j * 11;
      ctx.beginPath(); ctx.moveTo(bx + 16, y); ctx.lineTo(bx + 168, y); ctx.stroke();
    }
    ctx.restore();

    const stone = (x, y, col) => {
      groundAO(x, y + 10, 10, 4, 0.12);
      brick3D(x - 10, y - 10, 20, 20, col, 12);
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = studPattern;
      ctx.fillRect(x - 10, y - 10, 20, 20);
      ctx.restore();
    };
    stone(cx - 40, baseY - 40, "#111111");
    stone(cx - 10, baseY - 30, "#ffffff");
    stone(cx + 22, baseY - 42, "#111111");
  }

  if (p.key === "snow") {
    // snowman + snowball
    const sx = cx - 38, sy = baseY - 76;
    brick3D(sx - 10, sy + 24, 56, 32, "#ffffff", 18);
    brick3D(sx,      sy,      36, 30, "#ffffff", 18);

    // face dots
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    ctx.beginPath();
    ctx.arc(sx + 14, sy + 12, 1.6, 0, Math.PI * 2);
    ctx.arc(sx + 22, sy + 12, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(sx + 18, sy + 18, 5, 0, Math.PI * 0.9);
    ctx.stroke();
    ctx.restore();

    brick3D(cx + 56, baseY - 34, 32, 32, "#ffffff", 16);
    // sparkle
    ctx.save();
    ctx.globalAlpha = 0.10 + 0.12 * pulse;
    ctx.fillStyle = "rgba(10,132,255,0.85)";
    ctx.beginPath();
    ctx.ellipse(cx + 72, baseY - 18, 32, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (p.key === "jump") {
    // trampoline / jump pad
    const px = cx - 92, py = baseY - 66;
    brick3D(px, py, 184, 26, "#5856d6", 16);
    brick3D(px + 10, py + 6, 164, 14, "#0a84ff", 14);

    // springs
    ctx.save();
    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 6; i++) {
      brick3D(px + 14 + i * 28, py + 30, 12, 10, "#ffcc00", 10);
    }
    ctx.restore();
  }

  if (p.key === "avoid") {
    // cones + hurdles (obstacle course)
    const ox = cx - 96, oy = baseY - 62;
    const cone = (x, y) => {
      brick3D(x, y, 22, 22, "#ff9500", 12);
      brick3D(x + 4, y - 16, 14, 18, "#ffcc00", 10);
    };
    cone(ox + 10, oy + 24);
    cone(ox + 52, oy + 14);
    cone(ox + 96, oy + 22);

    // hurdle
    brick3D(cx + 40, baseY - 44, 80, 12, "#ffffff", 12);
    brick3D(cx + 44, baseY - 64, 12, 32, "#cfd5dd", 10);
    brick3D(cx + 104, baseY - 64, 12, 32, "#cfd5dd", 10);
  }
}

/** =========================
 *  portal building
 * ========================= */
function drawBuildingPortal(p, t) {
  const pal = buildingPalette(p.type);
  const isActive = (activePortal === p);
  const pulse = 0.55 + 0.45 * Math.sin(t * 3.2 + hash01(p.key) * 6);
  const glow = isActive ? 1.0 : 0.55;

  groundAO(p.x + p.w * 0.5, p.y + p.h * 0.88, p.w * 0.40, p.h * 0.18, 0.25);

  const zx = p.x + p.w * 0.5;
  const zy = p.y + p.h * 0.86;
  ctx.save();
  ctx.globalAlpha = (isActive ? 0.30 : 0.16) + 0.10 * pulse * glow;
  ctx.fillStyle = (p.status === "open") ? "rgba(10,132,255,0.92)" : "rgba(255,149,0,0.86)";
  ctx.beginPath();
  ctx.ellipse(zx, zy, 70, 22, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const bodyX = p.x + 16;
  const bodyY = p.y + 54;
  const bodyW = p.w - 32;
  const bodyH = p.h - 82;

  const brickH = 18;
  const rows = Math.max(4, Math.floor(bodyH / brickH));
  for (let i = 0; i < rows; i++) {
    const y = bodyY + i * brickH;
    const col = (i % 2 === 0) ? pal.main : shadeHex(pal.main, -10);
    brick3D(bodyX, y, bodyW, brickH + 2, col, 16);

    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(bodyX + 8, y + brickH - 2, bodyW - 16, 2);
    ctx.restore();
  }

  drawPortalRoofLego(p, pal, t);

  const winRowY = p.y + p.h * 0.54;
  for (let i = 0; i < 4; i++) {
    const wx = p.x + p.w * 0.18 + i * (p.w * 0.16);
    windowLego(wx, winRowY, p.w * 0.12, p.h * 0.10);
  }

  const dx = p.x + p.w * 0.43;
  const dy = p.y + p.h * 0.66;
  const dw = p.w * 0.14;
  const dh = p.h * 0.22;
  brick3D(dx - 4, dy - 4, dw + 8, dh + 8, "#ffffff", 12);
  brick3D(dx, dy, dw, dh, "#ffe9d6", 10);
  windowLego(dx + dw * 0.16, dy + dh * 0.12, dw * 0.68, dh * 0.40);

  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#ffcc00";
  ctx.beginPath();
  ctx.arc(dx + dw * 0.80, dy + dh * 0.56, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const signY = p.y + 14;
  const sx = p.x + p.w * 0.16;
  const sw = p.w * 0.68;
  brick3D(sx - 4, signY - 4, sw + 8, 42, "#ffffff", 18);
  brick3D(sx, signY, sw, 34, pal.accent, 16);

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.92)";
  ctx.font = "900 13px system-ui";
  ctx.fillText(p.label, sx + 12, signY + 22);
  ctx.restore();

  if (p.status !== "open") {
    brick3D(sx + sw * 0.60, signY + 38, sw * 0.36, 26, "#ffffff", 14);
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.86)";
    ctx.font = "900 11px system-ui";
    ctx.fillText("오픈준비중", sx + sw * 0.62, signY + 56);
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = (0.06 + 0.12 * pulse) * glow;
  ctx.fillStyle = isActive ? "rgba(10,132,255,0.85)" : "rgba(255,149,0,0.65)";
  roundRect(p.x + 10, p.y + 12, p.w - 20, p.h - 22, 22);
  ctx.fill();
  ctx.restore();

  // ✅ (3) portal themed decorations
  drawPortalDecorations(p, t);
}

/** =========================
 *  props draw (house/shop/etc.)
 * ========================= */
function drawHouse(o, t) {
  const x = o.x, y = o.y, s = o.s;
  const wob = Math.sin(t * 1.2 + x * 0.01) * 1.0;
  const w = 130 * s, h = 90 * s;

  groundAO(x, y + 72 * s, w * 0.55, 22 * s, 0.20);
  ctx.save(); ctx.translate(0, wob);

  brick3D(x - w * 0.5, y, w, h, o.color || "#ffcc00", 18);
  brick3D(x - w * 0.55, y - 42 * s, w * 1.10, 44 * s, "#5856d6", 18);

  windowLego(x - 40 * s, y + 26 * s, 28 * s, 22 * s);
  windowLego(x + 12 * s, y + 26 * s, 28 * s, 22 * s);
  brick3D(x - 10 * s, y + 44 * s, 20 * s, 40 * s, "#ffffff", 12);

  ctx.restore();
}

function drawShop(o, t) {
  const x = o.x, y = o.y, s = o.s;
  const wob = Math.sin(t * 1.05 + x * 0.02) * 1.0;
  const w = 150 * s, h = 98 * s;

  groundAO(x, y + 78 * s, w * 0.60, 24 * s, 0.20);
  ctx.save(); ctx.translate(0, wob);

  brick3D(x - w * 0.5, y, w, h, o.color || "#0a84ff", 18);
  brick3D(x - w * 0.38, y - 30 * s, w * 0.76, 26 * s, "#ffffff", 14);
  brick3D(x - w * 0.36, y - 28 * s, w * 0.72, 22 * s, "#ff9500", 12);
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.90)";
  ctx.font = "900 12px system-ui";
  ctx.fillText("SHOP", x - 18 * s, y - 12 * s);
  ctx.restore();

  windowLego(x - w * 0.40, y + 30 * s, w * 0.80, 36 * s);

  ctx.restore();
}

function drawFerris(o, t) {
  const x = o.x, y = o.y, s = o.s;
  const rot = t * 0.35;

  groundAO(x, y + 122 * s, 170 * s, 32 * s, 0.18);
  brick3D(x - 86 * s, y + 46 * s, 28 * s, 90 * s, "#ffffff", 16);
  brick3D(x + 58 * s, y + 46 * s, 28 * s, 90 * s, "#ffffff", 16);

  ctx.save();
  ctx.translate(x, y + 18 * s);
  ctx.rotate(rot);

  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 6 * s;
  ctx.beginPath();
  ctx.arc(0, 0, 92 * s, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.70;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 4 * s;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * 92 * s, Math.sin(a) * 92 * s);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.95;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const gx = Math.cos(a) * 92 * s;
    const gy = Math.sin(a) * 92 * s;
    const col = (i % 2 === 0) ? "#ffcc00" : "#ff79b0";
    brick3D(gx - 10 * s, gy - 8 * s, 20 * s, 16 * s, col, 10);
  }

  ctx.restore();
}

function drawCarousel(o, t) {
  const x = o.x, y = o.y, s = o.s;
  const bob = Math.sin(t * 2.0) * 2;

  groundAO(x, y + 76 * s, 150 * s, 26 * s, 0.18);
  brick3D(x - 98 * s, y + 46 * s, 196 * s, 42 * s, "#ffffff", 18);

  brick3D(x - 90 * s, y + 16 * s + bob, 180 * s, 30 * s, "#ff79b0", 18);
  brick3D(x - 70 * s, y - 10 * s + bob, 140 * s, 30 * s, "#ff2d55", 18);

  for (let i = 0; i < 6; i++) {
    const px = x - 72 * s + i * (28 * s);
    brick3D(px - 4 * s, y + 14 * s, 8 * s, 46 * s, "#ffffff", 10);
  }

  ctx.save();
  ctx.globalAlpha = 0.92;
  for (let i = 0; i < 7; i++) {
    const px = x - 62 * s + i * (22 * s);
    const py = y + 34 * s + Math.sin(t * 2 + i) * 3;
    const col = (i % 2 === 0) ? "#0a84ff" : "#ffcc00";
    brick3D(px - 8 * s, py - 6 * s, 16 * s, 12 * s, col, 10);
  }
  ctx.restore();
}

function drawTree(o, t) {
  const x = o.x, y = o.y, s = o.s;
  const sway = Math.sin(t * 1.4 + (o.v || 0)) * (7.0 * s);

  groundAO(x, y + 24 * s, 30 * s, 10 * s, 0.20);
  brick3D(x - 7 * s, y - 14 * s, 14 * s, 44 * s, "#8b5a2b", 10);

  const cx = x + sway;
  brick3D(cx - 42 * s, y - 52 * s, 48 * s, 34 * s, "#34c759", 18);
  brick3D(cx - 10 * s, y - 64 * s, 56 * s, 40 * s, "#2fe06f", 18);
  brick3D(cx + 26 * s, y - 48 * s, 44 * s, 32 * s, "#34c759", 18);

  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.fillStyle = studPattern;
  ctx.fillRect(cx - 52 * s, y - 74 * s, 132 * s, 86 * s);
  ctx.restore();
}

function drawLamp(o, t) {
  const x = o.x, y = o.y, s = o.s;
  const pulse = 0.5 + 0.5 * Math.sin(t * 3.0 + x * 0.01);

  groundAO(x, y + 18 * s, 18 * s, 10 * s, 0.16);
  brick3D(x - 6 * s, y - 40 * s, 12 * s, 72 * s, "#cfd5dd", 10);
  brick3D(x - 16 * s, y - 58 * s, 32 * s, 20 * s, "#ffffff", 12);

  ctx.save();
  ctx.globalAlpha = 0.10 + 0.25 * pulse;
  ctx.fillStyle = "rgba(255,204,0,0.90)";
  ctx.beginPath();
  ctx.ellipse(x, y - 16 * s, 34 * s, 54 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBench(o, t) {
  const x = o.x, y = o.y, s = o.s;
  groundAO(x, y + 12 * s, 34 * s, 10 * s, 0.14);

  brick3D(x - 42 * s, y - 2 * s, 84 * s, 20 * s, "#ffffff", 12);
  brick3D(x - 36 * s, y + 8 * s, 72 * s, 6 * s, "#cfd5dd", 10);

  brick3D(x - 30 * s, y + 14 * s, 14 * s, 12 * s, "#cfd5dd", 8);
  brick3D(x + 16 * s, y + 14 * s, 14 * s, 12 * s, "#cfd5dd", 8);
}

function drawFlower(o, t) {
  const x = o.x, y = o.y, s = o.s;
  const wig = Math.sin(t * 2.2 + x * 0.02) * 2;

  groundAO(x, y + 10 * s, 12 * s, 4 * s, 0.14);
  brick3D(x - 2 * s, y - 14 * s, 4 * s, 22 * s, "#34c759", 6);

  brick3D(x - 12 * s + wig, y - 24 * s, 10 * s, 10 * s, "#ff79b0", 8);
  brick3D(x + 2 * s + wig,  y - 24 * s, 10 * s, 10 * s, "#ff79b0", 8);
  brick3D(x - 5 * s + wig,  y - 32 * s, 10 * s, 10 * s, "#ff79b0", 8);
  brick3D(x - 4 * s + wig, y - 25 * s, 8 * s, 8 * s, "#ffcc00", 8);
}

function drawFence(o, t) {
  const x = o.x, y = o.y, s = o.s;
  const a = o.a || 0;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);

  groundAO(0, 12 * s, 22 * s, 6 * s, 0.12);
  brick3D(-30 * s, -8 * s, 60 * s, 16 * s, "#ffffff", 10);
  ctx.restore();
}

/** =========================
 *  ✅ (2) Minifig face printing
 * ========================= */
function drawMinifigFace(dir, mood, t) {
  // face plane at (-12,-40) size 24x22 (head)
  const fx = -12, fy = -40, fw = 24, fh = 22;

  if (dir === "up") {
    // back printing: neck line + hair seam
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    roundRect(fx + 4, fy + 6, fw - 8, 6, 4);
    ctx.fill();
    ctx.globalAlpha = 0.14;
    roundRect(fx + 6, fy + 14, fw - 12, 4, 4);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (dir === "left" || dir === "right") {
    // side face: one eye + mouth line
    const sgn = (dir === "right") ? 1 : -1;
    const ex = sgn * 4;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.85)";
    ctx.beginPath();
    ctx.arc(ex + 2, -31, 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(0,0,0,0.85)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(ex - 2, -27);
    ctx.lineTo(ex + 4, -26);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // down: front face with moods
  const sparkle = (mood === "spark") ? (0.5 + 0.5 * Math.sin(t * 6.0)) : 0;
  const wow = (mood === "wow") ? 1 : 0;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  // eyes
  ctx.beginPath();
  ctx.arc(-4, -31, 1.4 + wow * 0.5, 0, Math.PI * 2);
  ctx.arc(4, -31, 1.4 + wow * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // mouth
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.lineWidth = 1.6;
  if (wow) {
    ctx.beginPath();
    ctx.arc(0, -25, 3.5, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, -27, 4, 0, Math.PI);
    ctx.stroke();
  }

  // cheeks
  ctx.globalAlpha = 0.30;
  ctx.fillStyle = "#ff79b0";
  ctx.beginPath();
  ctx.arc(-8, -28, 2.2, 0, Math.PI * 2);
  ctx.arc(8, -28, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // sparkle in eyes near portal
  if (mood === "spark") {
    ctx.globalAlpha = 0.35 + 0.25 * sparkle;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(-2.6, -32.2, 0.9, 0, Math.PI * 2);
    ctx.arc(5.6, -32.2, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawMinifig(x, y, t) {
  const bob = Math.sin(player.bobT) * (player.moving ? 1.0 : 1.4);
  const dir = player.dir;
  const swing = player.moving ? Math.sin(player.animT * 10) : 0;
  const arm = 4 * swing;

  groundAO(x, y + 28, 20, 8, 0.22);

  ctx.save();
  ctx.translate(x, y + bob);

  // flip for left to reuse drawing
  let faceDir = dir;
  if (dir === "left") {
    ctx.scale(-1, 1);
    faceDir = "right";
  }

  // legs
  brick3D(-10, 6, 9, 18, "#0a84ff", 8);
  brick3D(1, 6, 9, 18, "#0a84ff", 8);

  // hip
  brick3D(-12, 0, 24, 10, "#0a84ff", 10);

  // torso
  brick3D(-14, -20, 28, 22, "#ffcc00", 12);

  // straps print
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(-10, -18, 3, 18);
  ctx.fillRect(7, -18, 3, 18);
  ctx.restore();

  // arms
  brick3D(-22, -18, 8, 20, "#ffcc00", 8);
  brick3D(14, -18, 8, 20, "#ffcc00", 8);

  // hands
  brick3D(-23, -2 + arm, 10, 8, "#ffd1a4", 8);
  brick3D(13, -2 - arm, 10, 8, "#ffd1a4", 8);

  // head + hair
  brick3D(-12, -40, 24, 22, "#ffd1a4", 12);
  brick3D(-14, -50, 28, 12, "#1a1a1a", 10);
  brick3D(-12, -54, 24, 8, "#1a1a1a", 10);

  // ✅ (2) face printing
  drawMinifigFace(faceDir === "right" && dir === "left" ? "left" : dir, player.face.mood, t);

  // tiny backpack when moving
  if (player.moving) {
    ctx.save();
    ctx.globalAlpha = 0.92;
    brick3D(-16, -18, 10, 16, "#ffffff", 10);
    ctx.restore();
  }

  ctx.restore();
}

/** =========================
 *  cursor/vignette/title
 * ========================= */
function drawCursor(sx, sy, t) {
  ctx.save();
  ctx.translate(sx + 14, sy + 16);
  const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 5));
  ctx.globalAlpha = 0.16 + 0.12 * pulse;
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.stroke();

  ctx.globalAlpha = 0.95;
  brick3D(-8, -14, 16, 16, "#ffffff", 10);
  brick3D(-8, 2, 16, 16, "#0a84ff", 10);
  ctx.restore();
}

function vignette(strength = 0.075) {
  ctx.save();
  const g = ctx.createRadialGradient(
    VIEW.w * 0.5, VIEW.h * 0.55, Math.min(VIEW.w, VIEW.h) * 0.35,
    VIEW.w * 0.5, VIEW.h * 0.55, Math.min(VIEW.w, VIEW.h) * 0.98
  );
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.restore();
}

function drawWorldTitle() {
  const text = "FA미니월드";
  const padX = 18;

  ctx.save();
  ctx.globalAlpha = 0.96;
  ctx.font = "900 20px system-ui";
  const tw = ctx.measureText(text).width;
  const bw = tw + padX * 2;
  const bh = 40;

  const x = VIEW.w * 0.5 - bw * 0.5;
  const y = 14;

  brick3D(x, y, bw, bh, "#ffffff", 18);
  brick3D(x + 3, y + 3, bw - 6, bh - 6, "#ffffff", 16);

  ctx.fillStyle = "rgba(0,0,0,0.90)";
  ctx.fillText(text, x + padX, y + 27);

  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "#0a84ff";
  ctx.beginPath();
  ctx.arc(x + bw - 18, y + 20, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/** =========================
 *  footprints/particles draw
 * ========================= */
function drawFootprints() {
  ctx.save();
  for (const f of footprints) {
    const a = 0.16 * (1 - f.age / f.life);
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(0,0,0,0.75)";
    roundRect(f.x - 6, f.y - 2, 10, 4, 3);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  for (const p of particles) {
    const k = 1 - (p.age / p.life);
    ctx.globalAlpha = p.a * k;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (0.8 + 0.7 * k), 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha *= 0.65;
    ctx.fillStyle = "rgba(10,132,255,0.95)";
    ctx.beginPath();
    ctx.arc(p.x + 2, p.y + 1, p.r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** =========================
 *  UPDATE / DRAW
 * ========================= */
let lastT = performance.now();
let acc = 0, framesCount = 0, fps = 0;

function update(dt, t) {
  let ax = 0, ay = 0;
  if (!dragging) {
    if (keys.has("a") || keys.has("arrowleft")) ax -= 1;
    if (keys.has("d") || keys.has("arrowright")) ax += 1;
    if (keys.has("w") || keys.has("arrowup")) ay -= 1;
    if (keys.has("s") || keys.has("arrowdown")) ay += 1;

    const moving = (ax !== 0 || ay !== 0);
    player.moving = moving;

    if (moving) {
      updateDirFromAxes(ax, ay);
      const len = Math.hypot(ax, ay) || 1;
      player.x += (ax / len) * player.speed * dt;
      player.y += (ay / len) * player.speed * dt;
      clampPlayerToWorld();
      player.animT += dt;
    } else {
      player.animT *= 0.90;
    }
  }

  player.bobT += dt * 6.0;
  addFootprint(dt);

  // cars
  for (const c of cars) {
    c.bob += dt * 3.0;
    if (c.axis === "h") {
      c.x += c.dir * c.speed * dt;
      const hr = roads[0];
      if (c.dir > 0 && c.x > hr.x + hr.w + 160) c.x = hr.x - 160;
      if (c.dir < 0 && c.x < hr.x - 160) c.x = hr.x + hr.w + 160;
    } else {
      c.y += c.dir * c.speed * dt;
      const vr = roads[1];
      if (c.dir > 0 && c.y > vr.y + vr.h + 160) c.y = vr.y - 160;
      if (c.dir < 0 && c.y < vr.y - 160) c.y = vr.y + vr.h + 160;
    }
  }

  // clouds/birds
  for (const c of clouds) {
    c.x += c.v * (c.layer === 0 ? 1.0 : 0.75) * dt;
    if (c.x > WORLD.w + 520) {
      c.x = -520;
      c.y = 44 + Math.random() * 280;
      c.s = 0.7 + Math.random() * 1.2;
      c.v = 10 + Math.random() * 18;
      c.layer = Math.random() < 0.5 ? 0 : 1;
    }
  }
  for (const b of birds) {
    b.x += b.v * dt;
    b.p += dt * 4.2;
    if (b.x > WORLD.w + 260) {
      b.x = -220;
      b.y = 70 + Math.random() * 180;
      b.v = 24 + Math.random() * 24;
      b.p = Math.random() * 10;
    }
  }

  // portal collision
  activePortal = null;
  for (const p of portals) {
    const z = portalEnterZone(p);
    if (circleRectHit(player.x, player.y, player.r, z)) { activePortal = p; break; }
  }

  // ✅ (2) mood control: near portal -> sparkle mood
  if (player.face.moodT > 0) player.face.moodT -= dt;
  if (player.face.moodT <= 0) {
    if (activePortal && activePortal.status === "open") player.face.mood = "spark";
    else player.face.mood = "smile";
  }

  // toast
  if (activePortal) {
    toast.hidden = false;
    if (activePortal.status === "open") {
      toast.innerHTML = `입장: <b>${activePortal.label}</b> · PC는 <b>Enter/E</b> · 모바일은 <b>손 떼기</b>`;
    } else {
      toast.innerHTML = `<b>${activePortal.label}</b> · 현재 <b>[오픈준비중]</b> 입니다 ✨`;
    }
  } else {
    toast.hidden = true;
  }

  // particles
  for (const p of portals) spawnPortalParticles(p, t);

  for (let i = particles.length - 1; i >= 0; i--) {
    const q = particles[i];
    q.age += dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vy += 24 * dt;
    if (q.age >= q.life) particles.splice(i, 1);
  }
  for (let i = footprints.length - 1; i >= 0; i--) {
    const f = footprints[i];
    f.age += dt;
    if (f.age >= f.life) footprints.splice(i, 1);
  }

  updateCamera(dt);

  coordEl.textContent = `x: ${Math.round(player.x)} · y: ${Math.round(player.y)}`;

  acc += dt; framesCount++;
  if (acc >= 0.45) {
    fps = Math.round(framesCount / acc);
    fpsEl.textContent = `fps: ${fps}`;
    acc = 0; framesCount = 0;
  }
}

function draw(t) {
  ctx.clearRect(0, 0, VIEW.w, VIEW.h);

  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  drawSkyWorld(t);
  drawCloudsWorld();
  drawGroundWorld();
  drawRoadsAndSidewalks(t);
  drawFootprints();

  const items = [];
  for (const p of portals) items.push({ kind: "building", ref: p, footY: getFootY({ kind: "building", y: p.y, h: p.h }) });
  for (const c of cars) items.push({ kind: "car", ref: c, footY: getFootY(c) });
  for (const pr of props) items.push({ kind: pr.kind, ref: pr, footY: getFootY(pr) });
  for (const s of signs) items.push({ kind: "sign", ref: s, footY: getFootY({ kind: "sign", y: s.y }) });
  items.push({ kind: "player", ref: player, footY: getFootY({ kind: "player", y: player.y }) });

  items.sort((a, b) => a.footY - b.footY);

  for (const it of items) {
    if (it.kind === "building") drawBuildingPortal(it.ref, t);
    else if (it.kind === "car") drawCar(it.ref, t);
    else if (it.kind === "tree") drawTree(it.ref, t);
    else if (it.kind === "lamp") drawLamp(it.ref, t);
    else if (it.kind === "bench") drawBench(it.ref, t);
    else if (it.kind === "flower") drawFlower(it.ref, t);
    else if (it.kind === "fence") drawFence(it.ref, t);
    else if (it.kind === "house") drawHouse(it.ref, t);
    else if (it.kind === "shop") drawShop(it.ref, t);
    else if (it.kind === "ferris") drawFerris(it.ref, t);
    else if (it.kind === "carousel") drawCarousel(it.ref, t);
    else if (it.kind === "sign") drawSign(it.ref, t);
    else if (it.kind === "player") drawMinifig(player.x, player.y, t);
  }

  drawParticles();
  ctx.restore();

  drawWorldTitle();

  if (!isTouchDevice() && pointer.active) {
    const idle = (performance.now() - pointer.lastMoveAt) > 1400;
    if (!idle) drawCursor(pointer.x, pointer.y, t);
  }

  vignette(0.075);
}

/** =========================
 *  LOOP
 * ========================= */
function loop(now) {
  const t = now / 1000;
  const dt = Math.min(0.033, (now - lastT) / 1000);
  lastT = now;

  update(dt, t);
  draw(t);

  requestAnimationFrame(loop);
}

/** =========================
 *  START
 * ========================= */
resize();
requestAnimationFrame(loop);
