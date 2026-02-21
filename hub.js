const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");

const toast = document.getElementById("toast");
const coordEl = document.getElementById("coord");
const fpsEl = document.getElementById("fps");
const fadeEl = document.getElementById("fade");

let W = 0, H = 0, DPR = 1;

function resize() {
  DPR = Math.max(1, window.devicePixelRatio || 1);
  const r = canvas.getBoundingClientRect();
  W = r.width; H = r.height;
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  layoutWorld();
}
window.addEventListener("resize", resize);

/** =========================
 *  1) "맵을 크게" : 월드 좌표계 + 카메라
 * ========================= */
const WORLD = {
  w: 2200,
  h: 1500,
  margin: 120
};

const cam = {
  x: 0, y: 0,
  targetX: 0, targetY: 0
};

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function worldToScreen(wx, wy) {
  return { x: wx - cam.x, y: wy - cam.y };
}
function screenToWorld(sx, sy) {
  return { x: sx + cam.x, y: sy + cam.y };
}

function updateCamera(dt) {
  // 플레이어를 화면 중앙 근처로 따라오도록
  cam.targetX = player.x - W * 0.5;
  cam.targetY = player.y - H * 0.55;

  // 월드 범위 클램프
  cam.targetX = clamp(cam.targetX, 0, WORLD.w - W);
  cam.targetY = clamp(cam.targetY, 0, WORLD.h - H);

  // 스무딩(부드럽게)
  const k = 1 - Math.pow(0.001, dt); // dt에 따라 안정적으로
  cam.x += (cam.targetX - cam.x) * k;
  cam.y += (cam.targetY - cam.y) * k;
}

/** =========================
 *  2) 포탈 건물 6개 (크기 각각 다름 + 디자인 다양화)
 * ========================= */
const portals = [
  { key: "avoid",   label: "미니게임 피하기",   status: "open", url: "https://faglobalxgp2024-design.github.io/index.html/", type: "arcade", size: "L", x: 0, y: 0, w: 0, h: 0 },
  { key: "archery", label: "미니게임 양궁",     status: "open", url: "https://ttjdwls777-eng.github.io/XGP-MINI-GAME2/",      type: "tower",  size: "M", x: 0, y: 0, w: 0, h: 0 },
  { key: "janggi",  label: "미니게임 장기",     status: "open", url: "https://faglobalxgp2024-design.github.io/MINIGAME/",     type: "dojo",   size: "L", x: 0, y: 0, w: 0, h: 0 },

  { key: "jump",    label: "미니게임 점프하기", status: "soon", url: "", type: "gym",   size: "S", x: 0, y: 0, w: 0, h: 0 },
  { key: "snow",    label: "미니게임 눈굴리기", status: "soon", url: "", type: "igloo", size: "M", x: 0, y: 0, w: 0, h: 0 },
  { key: "omok",    label: "미니게임 오목",     status: "soon", url: "", type: "cafe",  size: "M", x: 0, y: 0, w: 0, h: 0 },
];

/** =========================
 *  3) 플레이어 (4방향)
 * ========================= */
const player = {
  x: 360,
  y: 360,
  r: 16,
  speed: 240,      // px/sec (월드 기준)
  moving: false,
  animT: 0,
  bobT: 0,
  dir: "down", // up/down/left/right
};

let activePortal = null;
let entering = false;

/** =========================
 *  입력(키보드 + 드래그/터치)
 *  - 드래그/터치는 "플레이어를 끌어" 움직이지만 사실상 월드에서 이동
 * ========================= */
const keys = new Set();
let dragging = false;
let dragOffset = { x: 0, y: 0 };

let pointer = { x: 0, y: 0, active: false, lastMoveAt: 0 };

window.addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());
  if ((e.key === "Enter" || e.key.toLowerCase() === "e") && activePortal) {
    tryEnter(activePortal);
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

canvas.addEventListener("pointerenter", () => pointer.active = true);
canvas.addEventListener("pointerleave", () => pointer.active = false);

canvas.addEventListener("pointerdown", (e) => {
  const p = getPointer(e);
  const w = screenToWorld(p.x, p.y);

  const dx = w.x - player.x, dy = w.y - player.y;
  if (dx * dx + dy * dy <= (player.r + 18) * (player.r + 18)) {
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
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
function isTouchDevice() {
  return (navigator.maxTouchPoints || 0) > 0;
}

function clampPlayerToWorld() {
  player.x = clamp(player.x, WORLD.margin, WORLD.w - WORLD.margin);
  player.y = clamp(player.y, WORLD.margin, WORLD.h - WORLD.margin);
}

/** =========================
 *  월드 배치 (맵 크게 + 도로/인도 레이아웃)
 * ========================= */
const roads = [];      // 도로 구간(사각/곡선 느낌)
const sidewalks = [];  // 인도 구간
const crossings = [];  // 횡단보도(줄무늬)

function layoutWorld() {
  // 월드 크기: 화면이 넓으면 조금 더 여유
  WORLD.w = Math.max(2200, Math.floor(W * 2.4));
  WORLD.h = Math.max(1500, Math.floor(H * 2.2));
  WORLD.margin = 120;

  // 플레이어 시작 위치
  if (player.x < WORLD.margin) player.x = WORLD.margin + 60;
  if (player.y < WORLD.margin) player.y = WORLD.margin + 60;

  // 포탈 크기(각각 다르게)
  const base = 210;
  const sizeMul = { S: 0.82, M: 1.00, L: 1.18 };

  for (const p of portals) {
    const m = sizeMul[p.size] || 1;
    p.w = base * 1.18 * m;
    p.h = base * 0.90 * m;
  }

  // 포탈 배치(마을처럼)
  // 왼쪽/중앙/오른쪽 구역 + 위/아래
  portalsByKey("jump").x = WORLD.w * 0.22; portalsByKey("jump").y = WORLD.h * 0.22;
  portalsByKey("archery").x = WORLD.w * 0.48; portalsByKey("archery").y = WORLD.h * 0.18;
  portalsByKey("omok").x = WORLD.w * 0.78; portalsByKey("omok").y = WORLD.h * 0.24;

  portalsByKey("avoid").x = WORLD.w * 0.20; portalsByKey("avoid").y = WORLD.h * 0.62;
  portalsByKey("janggi").x = WORLD.w * 0.75; portalsByKey("janggi").y = WORLD.h * 0.62;
  portalsByKey("snow").x = WORLD.w * 0.48; portalsByKey("snow").y = WORLD.h * 0.78;

  // 좌표는 "건물 좌상단" 기준이라 중심 정렬
  for (const p of portals) {
    p.x -= p.w / 2;
    p.y -= p.h / 2;
    // 월드 범위 안으로
    p.x = clamp(p.x, WORLD.margin, WORLD.w - WORLD.margin - p.w);
    p.y = clamp(p.y, WORLD.margin, WORLD.h - WORLD.margin - p.h);
  }

  // 도로/인도/횡단보도 구성 (현실감)
  roads.length = 0;
  sidewalks.length = 0;
  crossings.length = 0;

  // 메인 도로(가로)
  roads.push({ x: WORLD.w * 0.10, y: WORLD.h * 0.48, w: WORLD.w * 0.80, h: 120 });
  sidewalks.push({ x: WORLD.w * 0.10, y: WORLD.h * 0.48 - 44, w: WORLD.w * 0.80, h: 36 });
  sidewalks.push({ x: WORLD.w * 0.10, y: WORLD.h * 0.48 + 128, w: WORLD.w * 0.80, h: 36 });

  // 세로 도로(중앙)
  roads.push({ x: WORLD.w * 0.48 - 55, y: WORLD.h * 0.10, w: 110, h: WORLD.h * 0.80 });
  sidewalks.push({ x: WORLD.w * 0.48 - 55 - 42, y: WORLD.h * 0.10, w: 34, h: WORLD.h * 0.80 });
  sidewalks.push({ x: WORLD.w * 0.48 + 55 + 8, y: WORLD.h * 0.10, w: 34, h: WORLD.h * 0.80 });

  // 횡단보도(교차점)
  crossings.push({ x: WORLD.w * 0.48 - 70, y: WORLD.h * 0.48 + 24, w: 140, h: 56 });
  crossings.push({ x: WORLD.w * 0.48 - 70, y: WORLD.h * 0.48 - 80, w: 140, h: 56 });

  // 소품 재시드(월드 기준)
  seedProps();
}

/** =========================
 *  소품(나무/가로등/벤치 + 꽃/울타리 느낌)
 * ========================= */
const props = [];
function seedProps() {
  props.length = 0;

  // 도로 밖 잔디 구역에 배치되도록 몇 번 뽑아서 괜찮은 곳만
  const tries = 140;

  function isOnRoadLike(x, y) {
    for (const r of roads) {
      if (x >= r.x - 18 && x <= r.x + r.w + 18 && y >= r.y - 18 && y <= r.y + r.h + 18) return true;
    }
    return false;
  }

  for (let i = 0; i < tries; i++) {
    const x = WORLD.margin + Math.random() * (WORLD.w - WORLD.margin * 2);
    const y = WORLD.margin + Math.random() * (WORLD.h - WORLD.margin * 2);
    if (isOnRoadLike(x, y)) continue;

    const r = Math.random();
    if (r < 0.40) props.push({ kind: "tree", x, y, s: 0.75 + Math.random() * 0.75 });
    else if (r < 0.58) props.push({ kind: "lamp", x, y, s: 0.85 + Math.random() * 0.5 });
    else if (r < 0.70) props.push({ kind: "bench", x, y, s: 0.9 + Math.random() * 0.35 });
    else if (r < 0.88) props.push({ kind: "flower", x, y, s: 0.8 + Math.random() * 0.9 });
    else props.push({ kind: "fence", x, y, s: 0.9 + Math.random() * 0.5, a: (Math.random() < 0.5 ? 0 : Math.PI/2) });
  }

  // 포탈 근처에 포인트 소품
  for (const p of portals) {
    props.push({ kind: "flower", x: p.x + p.w * 0.15, y: p.y + p.h + 24, s: 1.2 });
    props.push({ kind: "flower", x: p.x + p.w * 0.85, y: p.y + p.h + 18, s: 1.0 });
  }
}

function portalsByKey(k) {
  return portals.find(p => p.key === k);
}

/** =========================
 *  충돌(포탈은 건물 "입구" 근처가 더 자연스럽게)
 *  - 건물 전체가 아니라, 문 앞 타일 부근만 활성 영역
 * ========================= */
function portalEnterZone(p) {
  // 문 위치(건물 하단 중앙)
  const zx = p.x + p.w * 0.50 - 26;
  const zy = p.y + p.h * 0.74;
  return { x: zx, y: zy, w: 52, h: 42 };
}

function circleRectHit(cx, cy, r, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX, dy = cy - closestY;
  return (dx * dx + dy * dy) <= r * r;
}

/** =========================
 *  입장
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
  fadeEl.classList.add("on");
  setTimeout(() => window.location.href = p.url, 380);
}

/** =========================
 *  방향
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
 *  파스텔 톤 다운 배경(너무 환하지 않게)
 * ========================= */
const clouds = Array.from({ length: 9 }, () => ({
  x: Math.random() * 2600,
  y: 40 + Math.random() * 220,
  s: 0.6 + Math.random() * 1.3,
  v: 10 + Math.random() * 18
}));

const sparkles = Array.from({ length: 65 }, () => ({
  x: Math.random(),
  y: Math.random(),
  t: Math.random() * 10,
  r: 1 + Math.random() * 2
}));

const birds = Array.from({ length: 5 }, () => ({
  x: 0, y: 0, p: Math.random() * 10, v: 24 + Math.random() * 18
}));

/** =========================
 *  깊이 정렬(발 위치)
 * ========================= */
function getFootY(entity) {
  if (entity.kind === "building") return entity.y + entity.h;
  if (entity.kind === "tree") return entity.y + 58 * entity.s;
  if (entity.kind === "lamp") return entity.y + 66 * entity.s;
  if (entity.kind === "bench") return entity.y + 32 * entity.s;
  if (entity.kind === "flower") return entity.y + 10 * entity.s;
  if (entity.kind === "fence") return entity.y + 18 * entity.s;
  if (entity.kind === "player") return entity.y + 22;
  return entity.y;
}

/** =========================
 *  Update / Draw
 * ========================= */
let lastT = performance.now();
let acc = 0, framesCount = 0, fps = 0;

function update(dt, t) {
  // 이동(속도는 px/sec)
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

  // 배경 구름(월드 기준으로 흘러가게)
  for (const c of clouds) {
    c.x += c.v * dt;
    if (c.x > WORLD.w + 300) {
      c.x = -300;
      c.y = 40 + Math.random() * 260;
      c.s = 0.6 + Math.random() * 1.3;
      c.v = 10 + Math.random() * 18;
    }
  }

  // 새(월드 상단에서)
  for (const b of birds) {
    b.x += b.v * dt;
    b.p += dt * 4.2;
    if (b.x > WORLD.w + 200) {
      b.x = -180;
      b.y = 70 + Math.random() * 160;
      b.v = 24 + Math.random() * 18;
      b.p = Math.random() * 10;
    }
  }

  // 포탈 충돌(입구 존만)
  activePortal = null;
  for (const p of portals) {
    const z = portalEnterZone(p);
    if (circleRectHit(player.x, player.y, player.r, z)) { activePortal = p; break; }
  }

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

  // 카메라 업데이트
  updateCamera(dt);

  // 좌표는 월드 좌표(현실감)
  coordEl.textContent = `x: ${Math.round(player.x)} · y: ${Math.round(player.y)}`;

  // fps
  acc += dt; framesCount++;
  if (acc >= 0.45) {
    fps = Math.round(framesCount / acc);
    fpsEl.textContent = `fps: ${fps}`;
    acc = 0; framesCount = 0;
  }
}

function draw(t) {
  ctx.clearRect(0, 0, W, H);

  // 카메라 기준으로 월드 렌더
  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  drawSkyWorld(t);
  drawSparklesWorld(t);
  drawCloudsWorld();
  drawGroundWorld(t);
  drawRoadsAndSidewalks(t);

  // ===== depth sorting 대상 =====
  const items = [];

  // 건물
  for (const p of portals) {
    items.push({ kind: "building", ref: p, footY: getFootY({ kind: "building", y: p.y, h: p.h }), y: p.y });
  }
  // 소품
  for (const pr of props) {
    items.push({ kind: pr.kind, ref: pr, footY: getFootY(pr), y: pr.y });
  }
  // 플레이어
  items.push({ kind: "player", ref: player, footY: getFootY({ kind: "player", y: player.y }), y: player.y });

  items.sort((a, b) => a.footY - b.footY);

  for (const it of items) {
    if (it.kind === "building") drawBuildingPortal(it.ref, t);
    else if (it.kind === "tree") drawTree(it.ref, t);
    else if (it.kind === "lamp") drawLamp(it.ref, t);
    else if (it.kind === "bench") drawBench(it.ref, t);
    else if (it.kind === "flower") drawFlower(it.ref, t);
    else if (it.kind === "fence") drawFence(it.ref, t);
    else if (it.kind === "player") drawMinimi(player.x, player.y, t);
  }

  // 전경 풀숲(덮개): 맵 하단을 따라 흐르는 느낌
  drawForegroundBush(t);

  // 월드 렌더 종료
  ctx.restore();

  // 커서(미니미 커서)
  if (!isTouchDevice() && pointer.active) {
    const idle = (performance.now() - pointer.lastMoveAt) > 1400;
    if (!idle) drawCursor(pointer.x, pointer.y, t);
  }

  vignette();
}

/** =========================
 *  "현실감" : 잔디 + 약한 그림자 + 그리드 없는 자연스런 땅
 *  (너무 환하지 않도록 톤 다운)
 * ========================= */
function drawSkyWorld(t) {
  // 하늘(톤 다운 파스텔)
  const g = ctx.createLinearGradient(0, 0, 0, WORLD.h);
  g.addColorStop(0, "#dbeff6");
  g.addColorStop(0.60, "#eaf3e3");
  g.addColorStop(1, "#f1e6ee");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WORLD.w, WORLD.h);

  // 부드러운 빛(밝기 낮춤)
  softBlob(WORLD.w*0.22, WORLD.h*0.18, 300, "rgba(255, 200, 225, 0.22)");
  softBlob(WORLD.w*0.78, WORLD.h*0.16, 330, "rgba(190, 235, 255, 0.22)");
  softBlob(WORLD.w*0.55, WORLD.h*0.30, 360, "rgba(170, 240, 210, 0.16)");

  // 새
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "rgba(26,34,64,0.55)";
  ctx.lineWidth = 2;
  for (const b of birds) {
    const y = b.y + Math.sin(b.p) * 6;
    const x = b.x;
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.quadraticCurveTo(x, y - 4, x + 6, y);
    ctx.stroke();
  }
  ctx.restore();
}

function softBlob(x,y,r,color){
  const rg = ctx.createRadialGradient(x,y,10,x,y,r);
  rg.addColorStop(0,color);
  rg.addColorStop(1,"rgba(255,255,255,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0,0,WORLD.w,WORLD.h);
}

function drawSparklesWorld(t) {
  ctx.save();
  for (const s of sparkles) {
    const x = s.x * WORLD.w;
    const y = s.y * WORLD.h * 0.50;
    const a = 0.04 + 0.14 * (0.5 + 0.5 * Math.sin(t * 1.3 + s.t));
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCloudsWorld() {
  for (const c of clouds) {
    cloud(c.x, c.y, 150 * c.s, 56 * c.s, 0.16);
  }
}

function cloud(x, y, w, h, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.38, h * 0.55, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.22, y - h * 0.15, w * 0.32, h * 0.52, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.45, y, w * 0.36, h * 0.52, 0, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawGroundWorld(t) {
  // 잔디(살짝 텍스처 느낌)
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "rgba(184, 243, 209, 0.16)";
  ctx.fillRect(0, WORLD.h * 0.40, WORLD.w, WORLD.h * 0.60);
  ctx.restore();

  // 아주 은은한 잔디 결
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = "rgba(26,34,64,0.30)";
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * WORLD.w;
    const y = WORLD.h * 0.42 + Math.random() * (WORLD.h * 0.55);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 6, y - 8);
    ctx.stroke();
  }
  ctx.restore();
}

/** =========================
 *  도로/인도/횡단보도 (현실감)
 * ========================= */
function drawRoadsAndSidewalks(t) {
  // 도로
  for (const r of roads) {
    // asphalt
    ctx.save();
    ctx.globalAlpha = 0.90;
    ctx.fillStyle = "rgba(26,34,64,0.22)";
    roundRect(r.x, r.y, r.w, r.h, 36);
    ctx.fill();

    // 도로 테두리 살짝
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 중앙 점선
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.strokeStyle = "rgba(255,255,255,0.70)";
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 16]);
    ctx.beginPath();
    ctx.moveTo(r.x + 24, r.y + r.h / 2);
    ctx.lineTo(r.x + r.w - 24, r.y + r.h / 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // 인도
  for (const s of sidewalks) {
    ctx.save();
    ctx.globalAlpha = 0.86;
    ctx.fillStyle = "rgba(255, 245, 235, 0.65)";
    roundRect(s.x, s.y, s.w, s.h, 18);
    ctx.fill();

    // 인도 타일 라인
    ctx.globalAlpha = 0.14;
    ctx.strokeStyle = "rgba(26,34,64,0.35)";
    ctx.lineWidth = 1;
    const step = 18;
    for (let x = s.x; x < s.x + s.w; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, s.y);
      ctx.lineTo(x, s.y + s.h);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 횡단보도
  for (const c of crossings) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(255,255,255,0.20)";
    roundRect(c.x, c.y, c.w, c.h, 14);
    ctx.fill();

    ctx.globalAlpha = 0.85;
    for (let i = 0; i < 9; i++) {
      const yy = c.y + 6 + i * 6;
      ctx.fillStyle = (i % 2 === 0) ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.12)";
      ctx.fillRect(c.x + 10, yy, c.w - 20, 4);
    }
    ctx.restore();
  }
}

/** =========================
 *  전경 풀숲(화면 하단에 현실감 있게)
 * ========================= */
function drawForegroundBush(t){
  const by = WORLD.h - 140;
  ctx.save();
  ctx.globalAlpha = 0.45;
  for (let i=0;i<28;i++){
    const x = (i/27)*WORLD.w + Math.sin(t*1.4 + i)*18;
    bushBlob(x, by + 18, 180, 70, "rgba(126, 230, 189, 0.22)");
  }
  ctx.restore();
}
function bushBlob(cx, cy, w, h, fill){
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(cx - w*0.18, cy, w*0.22, h*0.55, 0, 0, Math.PI*2);
  ctx.ellipse(cx + w*0.02, cy - h*0.10, w*0.26, h*0.60, 0, 0, Math.PI*2);
  ctx.ellipse(cx + w*0.22, cy, w*0.24, h*0.56, 0, 0, Math.PI*2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** =========================
 *  건물(포탈) - 더 다양 + 애니메이션 느낌
 *  - 간판 반짝, 창문 깜빡, 지붕/깃발/풍선/연기 등 타입별 애니
 * ========================= */
function buildingPalette(type){
  const pal = {
    arcade: { main:"#f6bfdc", roof:"#eea9cf", trim:"#ffffff", sign:"#7bbfe8" },
    tower:  { main:"#bfe7f6", roof:"#a7d8f1", trim:"#ffffff", sign:"#f2c77b" },
    dojo:   { main:"#c9f2dd", roof:"#aee7c8", trim:"#ffffff", sign:"#f3b1c0" },
    gym:    { main:"#f4e4b9", roof:"#f0d39a", trim:"#ffffff", sign:"#7bbfe8" },
    igloo:  { main:"#d6eefb", roof:"#c3e3f6", trim:"#ffffff", sign:"#aee7c8" },
    cafe:   { main:"#e7ccfb", roof:"#d9b4fb", trim:"#ffffff", sign:"#f2c77b" },
  };
  return pal[type] || pal.arcade;
}
function hash01(s){
  let h=2166136261;
  for(let i=0;i<s.length;i++){
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h>>>0) % 1000)/1000;
}

function drawBuildingPortal(p, t){
  const pal = buildingPalette(p.type);
  const isActive = (activePortal === p);
  const pulse = 0.55 + 0.45*Math.sin(t*3.0 + hash01(p.key)*6);
  const glow = isActive ? 1.0 : 0.55;

  // 건물 그림자
  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.fillStyle="rgba(26,34,64,0.22)";
  roundRect(p.x+10, p.y+p.h-18, p.w-20, 18, 12);
  ctx.fill();
  ctx.restore();

  // 본체
  ctx.save();
  ctx.fillStyle = pal.main;
  ctx.strokeStyle = "rgba(26,34,64,0.14)";
  ctx.lineWidth = 2;
  roundRect(p.x+18, p.y+40, p.w-36, p.h-54, 20);
  ctx.fill(); ctx.stroke();

  // 타입별 지붕/장식(애니)
  drawRoofByType(p, pal, t);

  // 창문(깜빡)
  for (let i=0;i<4;i++){
    const wx = p.x + p.w*0.24 + i*(p.w*0.13);
    const wy = p.y + p.h*0.54;
    const on = Math.sin(t*2.1 + i + hash01(p.key)*10) > 0.20;
    ctx.fillStyle = on ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.55)";
    roundRect(wx, wy, p.w*0.10, p.h*0.09, 8);
    ctx.fill();
  }

  // 문 + 입구 타일(현실감)
  ctx.fillStyle="rgba(255,255,255,0.78)";
  roundRect(p.x+p.w*0.43, p.y+p.h*0.66, p.w*0.14, p.h*0.20, 10);
  ctx.fill();

  ctx.globalAlpha = 0.45;
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  roundRect(p.x+p.w*0.40, p.y+p.h*0.86, p.w*0.20, 20, 10);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 간판(네온/반짝)
  const signY = p.y + 14;
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = pal.sign;
  roundRect(p.x+p.w*0.18, signY, p.w*0.64, 30, 14);
  ctx.fill();

  // 간판 하이라이트(애니)
  ctx.globalAlpha = (0.12 + 0.12*pulse) * glow;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  roundRect(p.x+p.w*0.20, signY+4, p.w*0.60, 10, 10);
  ctx.fill();

  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "rgba(26,34,64,0.88)";
  ctx.font = "900 13px system-ui";
  ctx.fillText(p.label, p.x+p.w*0.20, signY+20);

  // 준비중 배지
  if (p.status !== "open"){
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "rgba(255,255,255,0.90)";
    roundRect(p.x+p.w*0.58, signY+36, p.w*0.34, 24, 12);
    ctx.fill();
    ctx.fillStyle = "rgba(26,34,64,0.85)";
    ctx.font = "900 11px system-ui";
    ctx.fillText("오픈준비중", p.x+p.w*0.60, signY+53);
  }

  // 활성 glow
  ctx.globalAlpha = 0.08*glow + 0.10*glow*pulse;
  ctx.fillStyle = isActive ? "rgba(123,191,232,0.9)" : "rgba(242,199,123,0.7)";
  roundRect(p.x+8, p.y+10, p.w-16, p.h-18, 22);
  ctx.fill();

  // 활성 반짝
  if (isActive){
    ctx.globalAlpha = 0.60;
    for(let i=0;i<10;i++){
      const a = t*2.6 + i;
      const px = p.x + p.w*0.18 + (Math.sin(a*1.1+i)*0.5+0.5)*(p.w*0.64);
      const py = p.y + p.h*0.34 + (Math.cos(a*1.3+i)*0.5+0.5)*(p.h*0.50);
      const rr = 1.4 + 1.9*(0.5+0.5*Math.sin(a*2.0));
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath(); ctx.arc(px,py,rr,0,Math.PI*2); ctx.fill();
    }
  }

  ctx.restore();
}

function drawRoofByType(p, pal, t){
  const x=p.x, y=p.y, w=p.w, h=p.h;
  ctx.fillStyle = pal.roof;
  ctx.strokeStyle = "rgba(26,34,64,0.12)";
  ctx.lineWidth = 2;

  if (p.type === "tower"){
    // 탑 + 깃발 흔들
    roundRect(x+w*0.36, y+6, w*0.28, 60, 18);
    ctx.fill(); ctx.stroke();

    const sway = Math.sin(t*2.2)*7;
    ctx.strokeStyle="rgba(26,34,64,0.18)";
    ctx.beginPath();
    ctx.moveTo(x+w*0.50, y-6);
    ctx.lineTo(x+w*0.50, y+10);
    ctx.stroke();
    ctx.fillStyle="rgba(242,199,123,0.9)";
    ctx.beginPath();
    ctx.moveTo(x+w*0.50, y-6);
    ctx.lineTo(x+w*0.50 + 20 + sway, y-1);
    ctx.lineTo(x+w*0.50, y+4);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (p.type === "dojo"){
    // 곡선 지붕 + 기와 라인
    ctx.beginPath();
    ctx.moveTo(x+w*0.22, y+60);
    ctx.quadraticCurveTo(x+w*0.50, y+8, x+w*0.78, y+60);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.save();
    ctx.globalAlpha = 0.20;
    ctx.strokeStyle="rgba(26,34,64,0.14)";
    for(let i=0;i<6;i++){
      const yy = y+22+i*6;
      ctx.beginPath();
      ctx.moveTo(x+w*0.30, yy);
      ctx.lineTo(x+w*0.70, yy);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (p.type === "igloo"){
    // 돔 + 눈 라인 + “김(연기)” 살짝
    ctx.beginPath();
    ctx.arc(x+w*0.50, y+68, w*0.22, Math.PI, 0);
    ctx.lineTo(x+w*0.72, y+68);
    ctx.lineTo(x+w*0.28, y+68);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.save();
    ctx.globalAlpha=0.22;
    ctx.strokeStyle="rgba(26,34,64,0.12)";
    for(let i=0;i<5;i++){
      const yy = y+34+i*8;
      ctx.beginPath();
      ctx.moveTo(x+w*0.36, yy);
      ctx.lineTo(x+w*0.64, yy);
      ctx.stroke();
    }
    // 연기 애니
    const puff = 0.5+0.5*Math.sin(t*1.5 + hash01(p.key)*10);
    ctx.globalAlpha = 0.10 + 0.10*puff;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.ellipse(x+w*0.62, y+14 - puff*6, 10, 14, 0, 0, Math.PI*2);
    ctx.ellipse(x+w*0.64, y+0 - puff*10, 12, 16, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (p.type === "cafe"){
    // 카페 지붕 + 어닝 흔들(살짝)
    roundRect(x+w*0.22, y+22, w*0.56, 40, 18);
    ctx.fill(); ctx.stroke();

    const sway = Math.sin(t*2.0 + hash01(p.key)*10) * 2;
    ctx.save();
    ctx.globalAlpha=0.9;
    ctx.fillStyle="rgba(255,255,255,0.88)";
    roundRect(x+w*0.22, y+66 + sway, w*0.56, 24, 12);
    ctx.fill();

    ctx.globalAlpha=0.28;
    ctx.fillStyle="rgba(255,182,217,0.95)";
    for(let i=0;i<6;i++){
      const sx = x+w*0.22 + i*(w*0.56/6);
      ctx.fillRect(sx, y+66 + sway, w*0.56/12, 24);
    }
    ctx.restore();
    return;
  }

  if (p.type === "gym"){
    // 체육관 지붕 + 번개 아이콘 깜빡
    roundRect(x+w*0.22, y+22, w*0.56, 40, 18);
    ctx.fill(); ctx.stroke();

    const blink = Math.sin(t*3.2 + hash01(p.key)*10) > 0.2;
    ctx.save();
    ctx.globalAlpha = blink ? 0.85 : 0.45;
    ctx.fillStyle="rgba(26,34,64,0.55)";
    ctx.beginPath();
    ctx.moveTo(x+w*0.50, y+14);
    ctx.lineTo(x+w*0.46, y+32);
    ctx.lineTo(x+w*0.52, y+32);
    ctx.lineTo(x+w*0.48, y+48);
    ctx.lineTo(x+w*0.56, y+26);
    ctx.lineTo(x+w*0.50, y+26);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  // arcade 기본 + 하트 “두근”
  ctx.beginPath();
  ctx.moveTo(x+w*0.28, y+64);
  ctx.lineTo(x+w*0.50, y+18);
  ctx.lineTo(x+w*0.72, y+64);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  const beat = 0.9 + 0.15*(0.5+0.5*Math.sin(t*3.0 + hash01(p.key)*10));
  ctx.save();
  ctx.globalAlpha = 0.26;
  ctx.fillStyle="rgba(255,182,217,0.95)";
  const hx = x+w*0.50, hy = y+44;
  ctx.translate(hx, hy);
  ctx.scale(beat, beat);
  ctx.beginPath();
  ctx.moveTo(0,0);
  ctx.bezierCurveTo(-10,-10,-18,6,0,14);
  ctx.bezierCurveTo(18,6,10,-10,0,0);
  ctx.fill();
  ctx.restore();
}

/** =========================
 *  소품 렌더
 * ========================= */
function drawTree(o, t){
  const sway = Math.sin(t*1.4 + o.x*0.01) * 5;
  const x=o.x, y=o.y, s=o.s;

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle="rgba(26,34,64,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y+20*s, 22*s, 8*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle="rgba(26,34,64,0.18)";
  ctx.lineWidth=10*s;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(x, y-4*s);
  ctx.lineTo(x+sway, y+18*s);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.fillStyle="rgba(170, 240, 210, 0.68)";
  ctx.beginPath();
  ctx.ellipse(x-16*s+sway, y-12*s, 22*s, 18*s, 0, 0, Math.PI*2);
  ctx.ellipse(x+6*s+sway,  y-18*s, 26*s, 22*s, 0, 0, Math.PI*2);
  ctx.ellipse(x+22*s+sway, y-8*s, 22*s, 18*s, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.globalAlpha = 0.18;
  ctx.fillStyle="rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.ellipse(x-4*s+sway, y-24*s, 14*s, 10*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawLamp(o, t){
  const x=o.x, y=o.y, s=o.s;
  const pulse = 0.5+0.5*Math.sin(t*3.0 + x*0.01);

  ctx.save();
  ctx.strokeStyle="rgba(26,34,64,0.20)";
  ctx.lineWidth=6*s;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(x, y-36*s);
  ctx.lineTo(x, y+26*s);
  ctx.stroke();

  ctx.fillStyle="rgba(255,255,255,0.85)";
  roundRect(x-12*s, y-46*s, 24*s, 16*s, 8*s);
  ctx.fill();

  ctx.globalAlpha = 0.14 + 0.16*pulse;
  ctx.fillStyle="rgba(242,199,123,0.85)";
  ctx.beginPath();
  ctx.ellipse(x, y-20*s, 26*s, 38*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawBench(o, t){
  const x=o.x, y=o.y, s=o.s;

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle="rgba(26,34,64,0.20)";
  ctx.beginPath();
  ctx.ellipse(x, y+18*s, 26*s, 8*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.fillStyle="rgba(255,255,255,0.78)";
  ctx.strokeStyle="rgba(26,34,64,0.14)";
  ctx.lineWidth=2;
  roundRect(x-34*s, y-2*s, 68*s, 16*s, 10*s);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle="rgba(26,34,64,0.14)";
  roundRect(x-28*s, y+12*s, 10*s, 10*s, 4*s); ctx.fill();
  roundRect(x+18*s, y+12*s, 10*s, 10*s, 4*s); ctx.fill();
  ctx.restore();
}

function drawFlower(o, t){
  const x=o.x, y=o.y, s=o.s;
  const wig = Math.sin(t*2.2 + x*0.02)*2;

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle="rgba(26,34,64,0.20)";
  ctx.beginPath();
  ctx.ellipse(x, y+10*s, 10*s, 4*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle="rgba(26,34,64,0.12)";
  ctx.lineWidth=3*s;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(x, y+8*s);
  ctx.lineTo(x+wig, y-10*s);
  ctx.stroke();

  ctx.globalAlpha=0.9;
  ctx.fillStyle="rgba(255,182,217,0.85)";
  for (let i=0;i<5;i++){
    const a = (i/5)*Math.PI*2;
    ctx.beginPath();
    ctx.ellipse(x+wig+Math.cos(a)*6*s, y-14*s+Math.sin(a)*6*s, 5*s, 6*s, 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.fillStyle="rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(x+wig, y-14*s, 4*s, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawFence(o, t){
  const x=o.x, y=o.y, s=o.s;
  const a=o.a || 0;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.globalAlpha = 0.55;
  ctx.fillStyle="rgba(255,255,255,0.70)";
  ctx.strokeStyle="rgba(26,34,64,0.12)";
  ctx.lineWidth=2;

  roundRect(-26*s, -6*s, 52*s, 12*s, 6*s);
  ctx.fill(); ctx.stroke();

  ctx.globalAlpha = 0.35;
  ctx.fillStyle="rgba(26,34,64,0.10)";
  roundRect(-22*s, -2*s, 44*s, 4*s, 3*s);
  ctx.fill();

  ctx.restore();
}

/** =========================
 *  미니미(4방향)
 * ========================= */
function frameIndex(animT){ return Math.floor(animT*10) % 4; }

function drawMinimi(x, y, t){
  const bob = Math.sin(player.bobT) * (player.moving ? 1.1 : 1.7);
  const f = player.moving ? frameIndex(player.animT) : 0;

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle="rgba(26,34,64,0.30)";
  ctx.beginPath();
  ctx.ellipse(x, y+24, 18, 7, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  const dir = player.dir;
  const swing = player.moving ? Math.sin((f/4)*Math.PI*2) : 0;
  const arm = 4*swing;
  const leg = 5*swing;

  ctx.save();
  ctx.translate(x, y + bob);

  if (dir === "left") ctx.scale(-1, 1);

  ctx.fillStyle="rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(0, -18, 16, 0, Math.PI*2);
  ctx.fill();

  ctx.globalAlpha = 0.35;
  ctx.fillStyle="rgba(255,182,217,0.85)";
  ctx.beginPath();
  ctx.arc(-8, -28, 10, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle="rgba(123,191,232,0.95)";
  roundRectAt(-12, -2, 24, 26, 10);
  ctx.fill();

  if (dir === "down"){
    ctx.fillStyle="rgba(26,34,64,0.55)";
    ctx.beginPath();
    ctx.arc(-5, -20, 2.2, 0, Math.PI*2);
    ctx.arc(5, -20, 2.2, 0, Math.PI*2);
    ctx.fill();

    ctx.globalAlpha=0.25;
    ctx.fillStyle="rgba(255,140,170,0.9)";
    ctx.beginPath();
    ctx.arc(-9, -16, 3.0, 0, Math.PI*2);
    ctx.arc(9, -16, 3.0, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha=1;
  } else if (dir === "up"){
    ctx.globalAlpha=0.20;
    ctx.fillStyle="rgba(26,34,64,0.55)";
    roundRectAt(-8, 6, 16, 6, 4);
    ctx.fill();
    ctx.globalAlpha=1;
  } else {
    ctx.fillStyle="rgba(26,34,64,0.55)";
    ctx.beginPath();
    ctx.arc(4, -20, 2.2, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha=0.25;
    ctx.fillStyle="rgba(255,140,170,0.9)";
    ctx.beginPath();
    ctx.arc(10, -16, 3.0, 0, Math.PI*2);
    ctx.fill();
    ctx.globalAlpha=1;
  }

  ctx.strokeStyle="rgba(160,220,255,0.95)";
  ctx.lineWidth=5;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(-12, 6);
  ctx.lineTo(-20, 10 + arm);
  ctx.moveTo(12, 6);
  ctx.lineTo(20, 10 - arm);
  ctx.stroke();

  ctx.strokeStyle="rgba(123,191,232,0.95)";
  ctx.lineWidth=6;
  ctx.beginPath();
  ctx.moveTo(-6, 18);
  ctx.lineTo(-8, 26 + leg);
  ctx.moveTo(6, 18);
  ctx.lineTo(8, 26 - leg);
  ctx.stroke();

  ctx.restore();
}

/** =========================
 *  커서 (스크린 좌표)
 * ========================= */
function drawCursor(sx, sy, t){
  ctx.save();
  ctx.translate(sx+14, sy+16);
  const pulse = 0.6 + 0.4*(0.5+0.5*Math.sin(t*5));
  ctx.globalAlpha = 0.16 + 0.12*pulse;
  ctx.strokeStyle = "rgba(26,34,64,0.55)";
  ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.stroke();

  ctx.globalAlpha = 0.95;
  ctx.fillStyle="rgba(255,255,255,0.95)";
  ctx.beginPath(); ctx.arc(0, -6, 10, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle="rgba(123,191,232,0.95)";
  roundRectAt(-8, 4, 16, 16, 8);
  ctx.fill();
  ctx.restore();
}

function vignette(){
  ctx.save();
  const g = ctx.createRadialGradient(W*0.5,H*0.55,Math.min(W,H)*0.35, W*0.5,H*0.55,Math.min(W,H)*0.95);
  g.addColorStop(0,"rgba(255,255,255,0)");
  g.addColorStop(1,"rgba(26,34,64,0.10)");
  ctx.fillStyle=g;
  ctx.fillRect(0,0,W,H);
  ctx.restore();
}

/** ===== util ===== */
function roundRect(x,y,w,h,r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
}
function roundRectAt(x,y,w,h,r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
}

/** ===== loop ===== */
function loop(now){
  const t = now/1000;
  const dt = Math.min(0.033, (now-lastT)/1000);
  lastT = now;

  update(dt, t);
  draw(t);

  requestAnimationFrame(loop);
}

/** ===== start ===== */
resize();
// birds init
for (const b of birds){
  b.x = Math.random()*WORLD.w;
  b.y = 70 + Math.random()*160;
}
requestAnimationFrame(loop);
