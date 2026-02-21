// HUB.JS
const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");

const toast = document.getElementById("toast");
const coordEl = document.getElementById("coord");
const fpsEl = document.getElementById("fps");
const fadeEl = document.getElementById("fade");

let W = 0, H = 0, DPR = 1;

/** =========================
 *  VIEW(줌) - 화면을 더 넓게 보이게(줌 아웃)
 * ========================= */
const VIEW = { zoom: 0.88, w: 0, h: 0 }; // 0.82~0.92 사이로 취향 조절

function resize() {
  DPR = Math.max(1, window.devicePixelRatio || 1);
  const r = canvas.getBoundingClientRect();
  W = r.width; H = r.height;

  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);

  // 줌 적용: 논리 좌표계가 더 넓어짐(더 많이 보임)
  VIEW.w = W / VIEW.zoom;
  VIEW.h = H / VIEW.zoom;

  ctx.setTransform(DPR * VIEW.zoom, 0, 0, DPR * VIEW.zoom, 0, 0);
  layoutWorld();
}
window.addEventListener("resize", resize);

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

/** =========================
 *  월드 + 카메라(맵 크게/스크롤)
 * ========================= */
const WORLD = { w: 2400, h: 1700, margin: 120 };

const cam = { x: 0, y: 0, targetX: 0, targetY: 0 };
function worldToScreen(wx, wy) { return { x: wx - cam.x, y: wy - cam.y }; }
function screenToWorld(sx, sy) { return { x: sx + cam.x, y: sy + cam.y }; }

function updateCamera(dt) {
  cam.targetX = player.x - VIEW.w * 0.5;
  cam.targetY = player.y - VIEW.h * 0.56;
  cam.targetX = clamp(cam.targetX, 0, WORLD.w - VIEW.w);
  cam.targetY = clamp(cam.targetY, 0, WORLD.h - VIEW.h);

  // 스무딩
  const k = 1 - Math.pow(0.0012, dt);
  cam.x += (cam.targetX - cam.x) * k;
  cam.y += (cam.targetY - cam.y) * k;
}

/** =========================
 *  포탈 건물 6개(크기 다름)
 * ========================= */
const portals = [
  { key:"avoid",   label:"미니게임 피하기",   status:"open", url:"https://faglobalxgp2024-design.github.io/index.html/", type:"arcade", size:"L", x:0,y:0,w:0,h:0 },
  { key:"archery", label:"미니게임 양궁",     status:"open", url:"https://ttjdwls777-eng.github.io/XGP-MINI-GAME2/",      type:"tower",  size:"M", x:0,y:0,w:0,h:0 },
  { key:"janggi",  label:"미니게임 장기",     status:"open", url:"https://faglobalxgp2024-design.github.io/MINIGAME/",     type:"dojo",   size:"L", x:0,y:0,w:0,h:0 },

  { key:"jump",    label:"미니게임 점프하기", status:"soon", url:"", type:"gym",   size:"S", x:0,y:0,w:0,h:0 },
  { key:"snow",    label:"미니게임 눈굴리기", status:"soon", url:"", type:"igloo", size:"M", x:0,y:0,w:0,h:0 },
  { key:"omok",    label:"미니게임 오목",     status:"soon", url:"", type:"cafe",  size:"M", x:0,y:0,w:0,h:0 },
];

function portalsByKey(k){ return portals.find(p=>p.key===k); }

/** =========================
 *  플레이어
 * ========================= */
const player = {
  x: 360, y: 360,
  r: 16,
  speed: 250,
  moving: false,
  animT: 0,
  bobT: 0,
  dir: "down",
};

let activePortal = null;
let entering = false;

/** =========================
 *  입력
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
  if (dx*dx + dy*dy <= (player.r+18)*(player.r+18)) {
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
  player.animT += 1/60;
});
canvas.addEventListener("pointerup", () => {
  dragging = false;
  if (activePortal && isTouchDevice()) tryEnter(activePortal);
});

function getPointer(e){
  const r = canvas.getBoundingClientRect();
  // 줌 반영(포인터/드래그 정확도 유지)
  return {
    x: (e.clientX - r.left) / VIEW.zoom,
    y: (e.clientY - r.top) / VIEW.zoom
  };
}
function isTouchDevice(){ return (navigator.maxTouchPoints || 0) > 0; }

function clampPlayerToWorld(){
  player.x = clamp(player.x, WORLD.margin, WORLD.w - WORLD.margin);
  player.y = clamp(player.y, WORLD.margin, WORLD.h - WORLD.margin);
}

/** =========================
 *  현실감: 도로/인도/횡단보도
 * ========================= */
const roads = [];
const sidewalks = [];
const crossings = [];

/** =========================
 *  자동차(도로 주행)
 * ========================= */
const cars = [];
const CAR_COLORS = ["#ff6b6b","#ffd93d","#6bcBef","#95e06c","#b49bff","#ff9bd6","#ffffff"];

function seedCars(){
  cars.length = 0;

  const hr = roads[0];
  const vr = roads[1];
  if (!hr || !vr) return;

  const makeCar = (kind)=>{
    const col = CAR_COLORS[Math.floor(Math.random()*CAR_COLORS.length)];
    const speed = 90 + Math.random()*70;

    if (kind==="h"){
      const lane = Math.random()<0.5 ? 0 : 1;
      const dir = Math.random()<0.5 ? 1 : -1;
      return {
        kind:"car",
        axis:"h",
        dir,
        color: col,
        speed,
        w: 44 + Math.random()*18,
        h: 20 + Math.random()*6,
        x: hr.x + Math.random()*hr.w,
        y: hr.y + (lane===0 ? hr.h*0.38 : hr.h*0.66),
        bob: Math.random()*10
      };
    } else {
      const lane = Math.random()<0.5 ? 0 : 1;
      const dir = Math.random()<0.5 ? 1 : -1;
      return {
        kind:"car",
        axis:"v",
        dir,
        color: col,
        speed,
        w: 22 + Math.random()*6,
        h: 46 + Math.random()*18,
        x: vr.x + (lane===0 ? vr.w*0.38 : vr.w*0.66),
        y: vr.y + Math.random()*vr.h,
        bob: Math.random()*10
      };
    }
  };

  const nH = 7;
  const nV = 5;
  for(let i=0;i<nH;i++) cars.push(makeCar("h"));
  for(let i=0;i<nV;i++) cars.push(makeCar("v"));
}

/** =========================
 *  “뿌연 느낌” 제거: 잔디 텍스처는 1회 생성 후 패턴 재사용
 * ========================= */
let grassPattern = null;
function buildGrassPattern(){
  const c = document.createElement("canvas");
  c.width = 220; c.height = 220;
  const g = c.getContext("2d");

  // 베이스 잔디
  g.fillStyle = "rgba(170, 230, 200, 0.35)";
  g.fillRect(0,0,c.width,c.height);

  // 잔디 결(고정)
  g.globalAlpha = 0.18;
  g.strokeStyle = "rgba(26,34,64,0.28)";
  g.lineWidth = 1;

  for(let i=0;i<520;i++){
    const x = Math.random()*c.width;
    const y = Math.random()*c.height;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 5, y - 7);
    g.stroke();
  }

  // 작은 꽃 점
  g.globalAlpha = 0.20;
  for(let i=0;i<70;i++){
    const x = Math.random()*c.width;
    const y = Math.random()*c.height;
    g.fillStyle = (i%2===0) ? "rgba(255,182,217,0.55)" : "rgba(255,255,255,0.55)";
    g.beginPath();
    g.arc(x,y,1.2,0,Math.PI*2);
    g.fill();
  }

  // 흙/길 점(현실감)
  g.globalAlpha = 0.10;
  for(let i=0;i<120;i++){
    const x = Math.random()*c.width;
    const y = Math.random()*c.height;
    g.fillStyle = (i%3===0) ? "rgba(26,34,64,0.25)" : "rgba(240,193,115,0.22)";
    g.beginPath();
    g.arc(x,y,0.9+Math.random()*1.3,0,Math.PI*2);
    g.fill();
  }

  grassPattern = ctx.createPattern(c, "repeat");
}

/** =========================
 *  “마을 + 놀이공원” 디테일 props
 * ========================= */
const props = [];
function seedProps(){
  props.length = 0;

  // 마을(주택/상가) 구역
  for (let i=0;i<8;i++){
    props.push({
      kind:"house",
      x: WORLD.w*0.10 + Math.random()*WORLD.w*0.30,
      y: WORLD.h*0.12 + Math.random()*WORLD.h*0.28,
      s: 0.95 + Math.random()*0.45,
      style: (Math.random()<0.5 ? "roof" : "flat")
    });
  }
  for (let i=0;i<7;i++){
    props.push({
      kind:"shop",
      x: WORLD.w*0.58 + Math.random()*WORLD.w*0.32,
      y: WORLD.h*0.12 + Math.random()*WORLD.h*0.30,
      s: 0.95 + Math.random()*0.55,
      style: (Math.random()<0.5 ? "awning" : "sign")
    });
  }

  // 놀이공원 구역(우하단)
  props.push({ kind:"ferris", x: WORLD.w*0.84, y: WORLD.h*0.78, s: 1.05 });
  props.push({ kind:"carousel", x: WORLD.w*0.70, y: WORLD.h*0.82, s: 1.00 });

  // 나무/가로등/벤치/꽃/울타리
  const tries = 160;
  const isOnRoadLike = (x,y)=>{
    for(const r of roads){
      if (x>=r.x-14 && x<=r.x+r.w+14 && y>=r.y-14 && y<=r.y+r.h+14) return true;
    }
    return false;
  };

  for(let i=0;i<tries;i++){
    const x = WORLD.margin + Math.random()*(WORLD.w - WORLD.margin*2);
    const y = WORLD.margin + Math.random()*(WORLD.h - WORLD.margin*2);
    if (isOnRoadLike(x,y)) continue;

    const r = Math.random();
    if (r < 0.38) props.push({ kind:"tree", x,y, s:0.85 + Math.random()*0.85 });
    else if (r < 0.54) props.push({ kind:"lamp", x,y, s:0.9 + Math.random()*0.55 });
    else if (r < 0.64) props.push({ kind:"bench", x,y, s:0.9 + Math.random()*0.35 });
    else if (r < 0.86) props.push({ kind:"flower", x,y, s:0.8 + Math.random()*0.9 });
    else props.push({ kind:"fence", x,y, s:0.9 + Math.random()*0.6, a:(Math.random()<0.5?0:Math.PI/2) });
  }

  // 포탈 주변 포인트 꽃
  for (const p of portals){
    props.push({ kind:"flower", x:p.x+p.w*0.20, y:p.y+p.h+26, s:1.3 });
    props.push({ kind:"flower", x:p.x+p.w*0.80, y:p.y+p.h+18, s:1.1 });
  }

  // 표지판(양궁/장기 안내)
  const arch = portalsByKey("archery");
  const jang = portalsByKey("janggi");
  signs.length = 0;

  signs.push({
    x: arch.x + arch.w*0.5 - 10, y: arch.y + arch.h + 90,
    text: "양궁 →", dir: "right"
  });
  signs.push({
    x: jang.x + jang.w*0.5 + 10, y: jang.y + jang.h + 90,
    text: "← 장기", dir: "left"
  });
}

/** =========================
 *  표지판
 * ========================= */
const signs = [];

/** =========================
 *  건물 근처 파티클/조명 + 발자국
 * ========================= */
const particles = [];
function spawnPortalParticles(p, t){
  // 플레이어가 포탈 근처면 파티클 생성
  const zx = p.x + p.w*0.5;
  const zy = p.y + p.h*0.78;
  const d = Math.hypot(player.x - zx, player.y - zy);
  if (d > 220) return;

  const rate = (activePortal === p) ? 10 : 4;
  const n = Math.random() < rate/60 ? 1 : 0;
  for(let i=0;i<n;i++){
    particles.push({
      x: zx + (Math.random()-0.5)*70,
      y: zy - 12 + (Math.random()-0.5)*24,
      vx: (Math.random()-0.5)*18,
      vy: -30 - Math.random()*30,
      life: 0.9 + Math.random()*0.6,
      age: 0,
      r: 1.2 + Math.random()*2.0,
      a: 0.55 + Math.random()*0.25
    });
  }
}

const footprints = [];
let footStepAcc = 0;
function addFootprint(dt){
  if (!player.moving) { footStepAcc = 0; return; }
  footStepAcc += dt * (player.speed/200);
  if (footStepAcc < 0.10) return;
  footStepAcc = 0;

  // 발자국은 플레이어 뒤쪽에 남김
  let ox = 0, oy = 0;
  if (player.dir === "up") oy = 10;
  else if (player.dir === "down") oy = -6;
  else if (player.dir === "left") ox = 8;
  else if (player.dir === "right") ox = -8;

  footprints.push({
    x: player.x + ox + (Math.random()-0.5)*2,
    y: player.y + 22 + oy + (Math.random()-0.5)*2,
    life: 1.4,
    age: 0
  });
}

/** =========================
 *  포탈 입장 존
 * ========================= */
function portalEnterZone(p){
  const zx = p.x + p.w*0.50 - 26;
  const zy = p.y + p.h*0.74;
  return { x: zx, y: zy, w: 52, h: 42 };
}
function circleRectHit(cx, cy, r, rect){
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX, dy = cy - closestY;
  return (dx*dx + dy*dy) <= r*r;
}

/** =========================
 *  입장
 * ========================= */
function tryEnter(p){
  if (entering) return;
  if (p.status !== "open"){
    toast.hidden = false;
    toast.innerHTML = `<b>${p.label}</b> · 현재 <b>[오픈준비중]</b> 입니다 ✨`;
    setTimeout(()=>{ if(activePortal!==p) toast.hidden=true; }, 1200);
    return;
  }
  entering = true;
  fadeEl.classList.add("on");
  setTimeout(()=> window.location.href = p.url, 380);
}

/** =========================
 *  방향
 * ========================= */
function updateDirFromAxes(ax, ay){
  if (Math.abs(ay) >= Math.abs(ax)) player.dir = ay < 0 ? "up" : "down";
  else player.dir = ax < 0 ? "left" : "right";
}
function updateDirFromDelta(dx, dy){
  if (dx===0 && dy===0) return;
  updateDirFromAxes(dx, dy);
}

/** =========================
 *  톤다운 배경(뿌연 오버레이 줄임)
 * ========================= */
const clouds = Array.from({length:9}, ()=>({
  x: Math.random()*2600,
  y: 40 + Math.random()*220,
  s: 0.7 + Math.random()*1.1,
  v: 10 + Math.random()*18
}));

const sparkles = Array.from({length:40}, ()=>({
  x: Math.random(),
  y: Math.random(),
  t: Math.random()*10,
  r: 1 + Math.random()*2
}));

const birds = Array.from({length:5}, ()=>({
  x: 0, y: 0, p: Math.random()*10, v: 24 + Math.random()*18
}));

function hash01(s){
  let h=2166136261;
  for(let i=0;i<s.length;i++){
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h>>>0) % 1000)/1000;
}

/** =========================
 *  깊이 정렬(발 위치)
 * ========================= */
function getFootY(entity){
  if (entity.kind === "building") return entity.y + entity.h;
  if (entity.kind === "tree") return entity.y + 60 * entity.s;
  if (entity.kind === "lamp") return entity.y + 68 * entity.s;
  if (entity.kind === "bench") return entity.y + 32 * entity.s;
  if (entity.kind === "flower") return entity.y + 10 * entity.s;
  if (entity.kind === "fence") return entity.y + 18 * entity.s;
  if (entity.kind === "house") return entity.y + 88 * entity.s;
  if (entity.kind === "shop") return entity.y + 92 * entity.s;
  if (entity.kind === "ferris") return entity.y + 180 * entity.s;
  if (entity.kind === "carousel") return entity.y + 120 * entity.s;
  if (entity.kind === "sign") return entity.y + 40;
  if (entity.kind === "player") return entity.y + 22;
  return entity.y;
}

/** =========================
 *  월드 레이아웃
 * ========================= */
function layoutWorld(){
  // 월드 자체도 더 크게
  WORLD.w = Math.max(2800, Math.floor(W * 3.2));
  WORLD.h = Math.max(1900, Math.floor(H * 2.8));

  // 포탈 크기(각각 다르게)
  const base = 220;
  const mul = { S: 0.82, M: 1.00, L: 1.22 };
  for (const p of portals){
    const m = mul[p.size] || 1;
    p.w = base * 1.22 * m;
    p.h = base * 0.92 * m;
  }

  // 포탈 배치
  portalsByKey("jump").x = WORLD.w*0.22; portalsByKey("jump").y = WORLD.h*0.22;
  portalsByKey("archery").x = WORLD.w*0.50; portalsByKey("archery").y = WORLD.h*0.18;
  portalsByKey("omok").x = WORLD.w*0.78; portalsByKey("omok").y = WORLD.h*0.24;

  portalsByKey("avoid").x = WORLD.w*0.20; portalsByKey("avoid").y = WORLD.h*0.62;
  portalsByKey("janggi").x = WORLD.w*0.78; portalsByKey("janggi").y = WORLD.h*0.62;
  portalsByKey("snow").x = WORLD.w*0.50; portalsByKey("snow").y = WORLD.h*0.80;

  for (const p of portals){
    p.x -= p.w/2;
    p.y -= p.h/2;
    p.x = clamp(p.x, WORLD.margin, WORLD.w - WORLD.margin - p.w);
    p.y = clamp(p.y, WORLD.margin, WORLD.h - WORLD.margin - p.h);
  }

  // 도로/인도
  roads.length = 0; sidewalks.length = 0; crossings.length = 0;

  // 메인 도로(가로)
  roads.push({ x: WORLD.w*0.10, y: WORLD.h*0.48, w: WORLD.w*0.80, h: 128 });
  sidewalks.push({ x: WORLD.w*0.10, y: WORLD.h*0.48 - 46, w: WORLD.w*0.80, h: 36 });
  sidewalks.push({ x: WORLD.w*0.10, y: WORLD.h*0.48 + 138, w: WORLD.w*0.80, h: 36 });

  // 세로 도로(중앙)
  roads.push({ x: WORLD.w*0.50 - 62, y: WORLD.h*0.10, w: 124, h: WORLD.h*0.82 });
  sidewalks.push({ x: WORLD.w*0.50 - 62 - 44, y: WORLD.h*0.10, w: 34, h: WORLD.h*0.82 });
  sidewalks.push({ x: WORLD.w*0.50 + 62 + 10, y: WORLD.h*0.10, w: 34, h: WORLD.h*0.82 });

  // 횡단보도(교차점)
  crossings.push({ x: WORLD.w*0.50 - 88, y: WORLD.h*0.48 + 30, w: 176, h: 56 });
  crossings.push({ x: WORLD.w*0.50 - 88, y: WORLD.h*0.48 - 86, w: 176, h: 56 });

  // 잔디 패턴 생성
  buildGrassPattern();

  // 자동차 생성(도로 기준)
  seedCars();

  // props/표지판
  seedProps();

  // 플레이어 시작 보정
  player.x = clamp(player.x, WORLD.margin+80, WORLD.w - WORLD.margin-80);
  player.y = clamp(player.y, WORLD.margin+80, WORLD.h - WORLD.margin-80);
}

/** =========================
 *  팔레트(조금 더 선명)
 * ========================= */
function buildingPalette(type){
  const pal = {
    arcade: { main:"#f4b9d8", roof:"#eaa6cd", trim:"#ffffff", sign:"#6fb7e6" },
    tower:  { main:"#b9e3f5", roof:"#9fd3f0", trim:"#ffffff", sign:"#f0c173" },
    dojo:   { main:"#c2f0d7", roof:"#a6e4c5", trim:"#ffffff", sign:"#f2a7ba" },
    gym:    { main:"#f2e0ae", roof:"#eecf93", trim:"#ffffff", sign:"#6fb7e6" },
    igloo:  { main:"#cfe9f7", roof:"#bde0f4", trim:"#ffffff", sign:"#a6e4c5" },
    cafe:   { main:"#e2c4fb", roof:"#d3a8fb", trim:"#ffffff", sign:"#f0c173" },
  };
  return pal[type] || pal.arcade;
}

/** =========================
 *  Update / Draw
 * ========================= */
let lastT = performance.now();
let acc=0, framesCount=0, fps=0;

function update(dt, t){
  // 이동
  let ax=0, ay=0;
  if (!dragging){
    if (keys.has("a") || keys.has("arrowleft")) ax -= 1;
    if (keys.has("d") || keys.has("arrowright")) ax += 1;
    if (keys.has("w") || keys.has("arrowup")) ay -= 1;
    if (keys.has("s") || keys.has("arrowdown")) ay += 1;

    const moving = (ax!==0 || ay!==0);
    player.moving = moving;

    if (moving){
      updateDirFromAxes(ax, ay);
      const len = Math.hypot(ax, ay) || 1;
      player.x += (ax/len) * player.speed * dt;
      player.y += (ay/len) * player.speed * dt;
      clampPlayerToWorld();
      player.animT += dt;
    } else {
      player.animT *= 0.90;
    }
  }
  player.bobT += dt*6.0;

  // 발자국
  addFootprint(dt);

  // 자동차 이동
  for (const c of cars){
    c.bob += dt*3.0;

    if (c.axis === "h"){
      c.x += c.dir * c.speed * dt;
      const hr = roads[0];
      if (!hr) continue;
      if (c.dir > 0 && c.x > hr.x + hr.w + 120) c.x = hr.x - 120;
      if (c.dir < 0 && c.x < hr.x - 120) c.x = hr.x + hr.w + 120;
    } else {
      c.y += c.dir * c.speed * dt;
      const vr = roads[1];
      if (!vr) continue;
      if (c.dir > 0 && c.y > vr.y + vr.h + 120) c.y = vr.y - 120;
      if (c.dir < 0 && c.y < vr.y - 120) c.y = vr.y + vr.h + 120;
    }
  }

  // 구름(월드)
  for (const c of clouds){
    c.x += c.v*dt;
    if (c.x > WORLD.w + 320){
      c.x = -320;
      c.y = 40 + Math.random()*240;
      c.s = 0.7 + Math.random()*1.1;
      c.v = 10 + Math.random()*18;
    }
  }

  // 새(월드 상단)
  for (const b of birds){
    b.x += b.v*dt;
    b.p += dt*4.2;
    if (b.x > WORLD.w + 200){
      b.x = -180;
      b.y = 70 + Math.random()*160;
      b.v = 24 + Math.random()*18;
      b.p = Math.random()*10;
    }
  }

  // 포탈 충돌(입구만)
  activePortal = null;
  for (const p of portals){
    const z = portalEnterZone(p);
    if (circleRectHit(player.x, player.y, player.r, z)){ activePortal = p; break; }
  }

  // 토스트
  if (activePortal){
    toast.hidden = false;
    if (activePortal.status === "open"){
      toast.innerHTML = `입장: <b>${activePortal.label}</b> · PC는 <b>Enter/E</b> · 모바일은 <b>손 떼기</b>`;
    } else {
      toast.innerHTML = `<b>${activePortal.label}</b> · 현재 <b>[오픈준비중]</b> 입니다 ✨`;
    }
  } else {
    toast.hidden = true;
  }

  // 포탈 파티클(근처)
  for (const p of portals) spawnPortalParticles(p, t);

  // 파티클/발자국 수명
  for (let i=particles.length-1;i>=0;i--){
    const q = particles[i];
    q.age += dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vy += 22 * dt; // 살짝 아래로
    if (q.age >= q.life) particles.splice(i,1);
  }
  for (let i=footprints.length-1;i>=0;i--){
    const f = footprints[i];
    f.age += dt;
    if (f.age >= f.life) footprints.splice(i,1);
  }

  // 카메라
  updateCamera(dt);

  coordEl.textContent = `x: ${Math.round(player.x)} · y: ${Math.round(player.y)}`;

  acc += dt; framesCount++;
  if (acc >= 0.45){
    fps = Math.round(framesCount/acc);
    fpsEl.textContent = `fps: ${fps}`;
    acc=0; framesCount=0;
  }
}

function draw(t){
  ctx.clearRect(0,0,VIEW.w,VIEW.h);

  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  drawSkyWorld(t);
  drawSparklesWorld(t);
  drawCloudsWorld();
  drawGroundWorld();
  drawRoadsAndSidewalks(t);

  // 발자국(바닥)
  drawFootprints();

  // ===== depth sorting =====
  const items = [];

  for (const p of portals) items.push({ kind:"building", ref:p, footY:getFootY({kind:"building", y:p.y, h:p.h}) });
  for (const c of cars) items.push({ kind:"car", ref:c, footY:(c.axis==="h" ? c.y + 12 : c.y + c.h) });
  for (const pr of props) items.push({ kind:pr.kind, ref:pr, footY:getFootY(pr) });
  for (const s of signs) items.push({ kind:"sign", ref:s, footY:getFootY({kind:"sign", y:s.y}) });
  items.push({ kind:"player", ref:player, footY:getFootY({kind:"player", y:player.y}) });

  items.sort((a,b)=>a.footY-b.footY);

  for (const it of items){
    if (it.kind==="building") drawBuildingPortal(it.ref, t);
    else if (it.kind==="car") drawCar(it.ref, t);
    else if (it.kind==="tree") drawTree(it.ref, t);
    else if (it.kind==="lamp") drawLamp(it.ref, t);
    else if (it.kind==="bench") drawBench(it.ref, t);
    else if (it.kind==="flower") drawFlower(it.ref, t);
    else if (it.kind==="fence") drawFence(it.ref, t);
    else if (it.kind==="house") drawHouse(it.ref, t);
    else if (it.kind==="shop") drawShop(it.ref, t);
    else if (it.kind==="ferris") drawFerris(it.ref, t);
    else if (it.kind==="carousel") drawCarousel(it.ref, t);
    else if (it.kind==="sign") drawSign(it.ref, t);
    else if (it.kind==="player") drawMinimi(player.x, player.y, t);
  }

  // 파티클(위쪽 레이어로)
  drawParticles();

  ctx.restore();

  // 월드 상단 타이틀
  drawWorldTitle();

  // 커서
  if (!isTouchDevice() && pointer.active){
    const idle = (performance.now() - pointer.lastMoveAt) > 1400;
    if (!idle) drawCursor(pointer.x, pointer.y, t);
  }

  // 비네팅 약하게(선명도 위해)
  vignette(0.06);
}

/** =========================
 *  배경(선명/톤다운, 뿌연 블랍 최소화)
 * ========================= */
function drawSkyWorld(t){
  const g = ctx.createLinearGradient(0,0,0,WORLD.h);
  g.addColorStop(0, "#cfe7f2");
  g.addColorStop(0.55, "#dce9d7");
  g.addColorStop(1, "#e6d6e2");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,WORLD.w,WORLD.h);

  // 블랍 알파 확 낮춤(뿌연 느낌 제거 핵심)
  softBlob(WORLD.w*0.22, WORLD.h*0.18, 320, "rgba(255, 200, 225, 0.10)");
  softBlob(WORLD.w*0.78, WORLD.h*0.16, 350, "rgba(190, 235, 255, 0.10)");
  softBlob(WORLD.w*0.55, WORLD.h*0.30, 380, "rgba(170, 240, 210, 0.08)");

  // 새
  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.strokeStyle = "rgba(26,34,64,0.58)";
  ctx.lineWidth = 2;
  for (const b of birds){
    const y = b.y + Math.sin(b.p)*6;
    const x = b.x;
    ctx.beginPath();
    ctx.moveTo(x-6, y);
    ctx.quadraticCurveTo(x, y-4, x+6, y);
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
function drawSparklesWorld(t){
  ctx.save();
  for (const s of sparkles){
    const x = s.x*WORLD.w;
    const y = s.y*WORLD.h*0.46;
    const a = 0.02 + 0.08*(0.5+0.5*Math.sin(t*1.2+s.t));
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(x,y,s.r,0,Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}
function drawCloudsWorld(){
  for (const c of clouds) cloud(c.x, c.y, 150*c.s, 56*c.s, 0.14);
}
function cloud(x,y,w,h,alpha){
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.ellipse(x, y, w*0.38, h*0.55, 0, 0, Math.PI*2);
  ctx.ellipse(x + w*0.22, y - h*0.15, w*0.32, h*0.52, 0, 0, Math.PI*2);
  ctx.ellipse(x + w*0.45, y, w*0.36, h*0.52, 0, 0, Math.PI*2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/** =========================
 *  땅(패턴으로 선명하게)
 * ========================= */
function drawGroundWorld(){
  ctx.save();
  ctx.fillStyle = grassPattern || "rgba(170,230,200,0.28)";
  ctx.fillRect(0, WORLD.h*0.36, WORLD.w, WORLD.h*0.64);
  ctx.restore();
}

/** =========================
 *  도로/인도/횡단보도(현실감)
 * ========================= */
function drawRoadsAndSidewalks(t){
  // 도로
  for (const r of roads){
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "rgba(26,34,64,0.24)";
    roundRect(r.x, r.y, r.w, r.h, 38);
    ctx.fill();

    // 가장자리 밝은 라인
    ctx.globalAlpha = 0.20;
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // 중앙 점선
    ctx.save();
    ctx.globalAlpha = 0.38;
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 4;
    ctx.setLineDash([18, 16]);
    ctx.beginPath();
    ctx.moveTo(r.x + 26, r.y + r.h/2);
    ctx.lineTo(r.x + r.w - 26, r.y + r.h/2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // 인도
  for (const s of sidewalks){
    ctx.save();
    ctx.globalAlpha = 0.88;
    ctx.fillStyle = "rgba(255, 245, 235, 0.72)";
    roundRect(s.x, s.y, s.w, s.h, 18);
    ctx.fill();

    // 타일 라인
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "rgba(26,34,64,0.40)";
    ctx.lineWidth = 1;
    const step = 18;
    for(let x=s.x; x<s.x+s.w; x+=step){
      ctx.beginPath();
      ctx.moveTo(x, s.y);
      ctx.lineTo(x, s.y+s.h);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 횡단보도
  for (const c of crossings){
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    roundRect(c.x, c.y, c.w, c.h, 14);
    ctx.fill();

    ctx.globalAlpha = 0.85;
    for(let i=0;i<9;i++){
      const yy = c.y + 6 + i*6;
      ctx.fillStyle = (i%2===0) ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.12)";
      ctx.fillRect(c.x+10, yy, c.w-20, 4);
    }
    ctx.restore();
  }
}

/** =========================
 *  발자국
 * ========================= */
function drawFootprints(){
  ctx.save();
  for (const f of footprints){
    const a = 0.22 * (1 - f.age/f.life);
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(26,34,64,0.55)";
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, 4.6, 2.2, 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

/** =========================
 *  파티클(건물 근처)
 * ========================= */
function drawParticles(){
  ctx.save();
  for (const p of particles){
    const k = 1 - (p.age/p.life);
    ctx.globalAlpha = p.a * k;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r*(0.7+0.6*k), 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

/** =========================
 *  자동차 그리기
 * ========================= */
function drawCar(c, t){
  const bounce = Math.sin(c.bob)*0.8;

  ctx.save();
  ctx.translate(c.x, c.y + bounce);

  // 진행 방향에 따라 뒤집기/회전
  if (c.axis === "h" && c.dir < 0) ctx.scale(-1,1);
  if (c.axis === "v"){
    ctx.rotate(c.dir > 0 ? Math.PI/2 : -Math.PI/2);
  }

  const w = c.w, h = c.h;

  // 그림자
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "rgba(26,34,64,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, h*0.55, w*0.52, h*0.32, 0, 0, Math.PI*2);
  ctx.fill();

  // 차체(그라데이션)
  const g = ctx.createLinearGradient(-w*0.5, -h*0.6, w*0.5, h*0.6);
  g.addColorStop(0, "rgba(255,255,255,0.85)");
  g.addColorStop(0.15, c.color);
  g.addColorStop(1, "rgba(26,34,64,0.10)");
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = g;
  ctx.strokeStyle = "rgba(26,34,64,0.18)";
  ctx.lineWidth = 2;
  roundRectAt(-w*0.52, -h*0.42, w*1.04, h*0.84, 10);
  ctx.fill(); ctx.stroke();

  // 유리
  ctx.globalAlpha = 0.80;
  ctx.fillStyle = "rgba(180,230,255,0.65)";
  roundRectAt(-w*0.22, -h*0.34, w*0.44, h*0.30, 8);
  ctx.fill();

  // 하이라이트
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  roundRectAt(-w*0.46, -h*0.36, w*0.55, h*0.16, 8);
  ctx.fill();

  // 바퀴
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgba(26,34,64,0.75)";
  ctx.beginPath();
  ctx.ellipse(-w*0.30, h*0.38, w*0.16, h*0.14, 0, 0, Math.PI*2);
  ctx.ellipse(w*0.30,  h*0.38, w*0.16, h*0.14, 0, 0, Math.PI*2);
  ctx.fill();

  // 라이트(앞쪽)
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.ellipse(w*0.50, -h*0.08, w*0.06, h*0.12, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

/** =========================
 *  표지판(양궁/장기 안내)
 * ========================= */
function drawSign(s, t){
  const sway = Math.sin(t*1.6 + s.x*0.01) * 1.5;

  ctx.save();
  ctx.translate(s.x, s.y + sway);

  // 그림자
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "rgba(26,34,64,0.30)";
  ctx.beginPath();
  ctx.ellipse(0, 26, 18, 6, 0, 0, Math.PI*2);
  ctx.fill();

  // 기둥
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(26,34,64,0.18)";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(0, -22);
  ctx.stroke();

  // 판
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.strokeStyle = "rgba(26,34,64,0.14)";
  ctx.lineWidth = 2;
  roundRect(-56, -52, 112, 34, 14);
  ctx.fill(); ctx.stroke();

  // 글자
  ctx.fillStyle = "rgba(26,34,64,0.88)";
  ctx.font = "900 14px system-ui";
  ctx.fillText(s.text, -42, -30);

  // 작은 화살 장식
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = "rgba(111,183,230,0.85)";
  ctx.beginPath();
  ctx.arc(44, -36, 5, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

/** =========================
 *  건물(포탈) + 조명(글로우) 강화
 * ========================= */
function drawBuildingPortal(p, t){
  const pal = buildingPalette(p.type);
  const isActive = (activePortal === p);
  const pulse = 0.55 + 0.45*Math.sin(t*3.0 + hash01(p.key)*6);
  const glow = isActive ? 1.0 : 0.55;

  // 바닥 조명(건물 앞에 조명 풀)
  const zx = p.x + p.w*0.5;
  const zy = p.y + p.h*0.86;
  ctx.save();
  ctx.globalAlpha = (isActive ? 0.26 : 0.14) + 0.10*pulse*glow;
  ctx.fillStyle = (p.status==="open") ? "rgba(111,183,230,0.85)" : "rgba(240,193,115,0.75)";
  ctx.beginPath();
  ctx.ellipse(zx, zy, 56, 18, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // 그림자
  ctx.save();
  ctx.globalAlpha = 0.24;
  ctx.fillStyle = "rgba(26,34,64,0.22)";
  roundRect(p.x+10, p.y+p.h-18, p.w-20, 18, 12);
  ctx.fill();
  ctx.restore();

  // 본체(그라데이션으로 입체감)
  ctx.save();
  const bodyG = ctx.createLinearGradient(p.x+18, p.y+40, p.x+p.w-18, p.y+p.h-14);
  bodyG.addColorStop(0, "rgba(255,255,255,0.65)");
  bodyG.addColorStop(0.12, pal.main);
  bodyG.addColorStop(1, "rgba(26,34,64,0.10)");

  ctx.fillStyle = bodyG;
  ctx.strokeStyle = "rgba(26,34,64,0.16)";
  ctx.lineWidth = 2;
  roundRect(p.x+18, p.y+40, p.w-36, p.h-54, 20);
  ctx.fill(); ctx.stroke();

  drawRoofByType(p, pal, t);

  // 창문 깜빡
  for(let i=0;i<4;i++){
    const wx = p.x + p.w*0.24 + i*(p.w*0.13);
    const wy = p.y + p.h*0.54;
    const on = Math.sin(t*2.1 + i + hash01(p.key)*10) > 0.20;
    ctx.fillStyle = on ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.55)";
    roundRect(wx, wy, p.w*0.10, p.h*0.09, 8);
    ctx.fill();
  }

  // 문
  ctx.fillStyle="rgba(255,255,255,0.78)";
  roundRect(p.x+p.w*0.43, p.y+p.h*0.66, p.w*0.14, p.h*0.20, 10);
  ctx.fill();

  // 입구 타일
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "rgba(255,255,255,0.70)";
  roundRect(p.x+p.w*0.40, p.y+p.h*0.86, p.w*0.20, 20, 10);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 간판
  const signY = p.y + 14;
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = pal.sign;
  roundRect(p.x+p.w*0.18, signY, p.w*0.64, 30, 14);
  ctx.fill();

  // 간판 하이라이트(반짝)
  ctx.globalAlpha = (0.10 + 0.12*pulse) * glow;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  roundRect(p.x+p.w*0.20, signY+4, p.w*0.60, 10, 10);
  ctx.fill();

  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "rgba(26,34,64,0.88)";
  ctx.font = "900 13px system-ui";
  ctx.fillText(p.label, p.x+p.w*0.20, signY+20);

  if (p.status !== "open"){
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    roundRect(p.x+p.w*0.58, signY+36, p.w*0.34, 24, 12);
    ctx.fill();
    ctx.fillStyle = "rgba(26,34,64,0.85)";
    ctx.font = "900 11px system-ui";
    ctx.fillText("오픈준비중", p.x+p.w*0.60, signY+53);
  }

  // 활성 외곽 glow(과하지 않게)
  ctx.globalAlpha = 0.06*glow + 0.08*glow*pulse;
  ctx.fillStyle = isActive ? "rgba(111,183,230,0.9)" : "rgba(240,193,115,0.7)";
  roundRect(p.x+8, p.y+10, p.w-16, p.h-18, 22);
  ctx.fill();

  ctx.restore();
}

function drawRoofByType(p, pal, t){
  const x=p.x, y=p.y, w=p.w, h=p.h;
  ctx.fillStyle = pal.roof;
  ctx.strokeStyle = "rgba(26,34,64,0.12)";
  ctx.lineWidth = 2;

  if (p.type === "tower"){
    roundRect(x+w*0.36, y+6, w*0.28, 60, 18);
    ctx.fill(); ctx.stroke();
    const sway = Math.sin(t*2.2)*7;
    ctx.strokeStyle="rgba(26,34,64,0.18)";
    ctx.beginPath(); ctx.moveTo(x+w*0.50, y-6); ctx.lineTo(x+w*0.50, y+10); ctx.stroke();
    ctx.fillStyle="rgba(240,193,115,0.92)";
    ctx.beginPath();
    ctx.moveTo(x+w*0.50, y-6);
    ctx.lineTo(x+w*0.50 + 20 + sway, y-1);
    ctx.lineTo(x+w*0.50, y+4);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (p.type === "dojo"){
    ctx.beginPath();
    ctx.moveTo(x+w*0.22, y+60);
    ctx.quadraticCurveTo(x+w*0.50, y+8, x+w*0.78, y+60);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    ctx.save();
    ctx.globalAlpha = 0.18;
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
    ctx.beginPath();
    ctx.arc(x+w*0.50, y+68, w*0.22, Math.PI, 0);
    ctx.lineTo(x+w*0.72, y+68);
    ctx.lineTo(x+w*0.28, y+68);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // 연기
    const puff = 0.5+0.5*Math.sin(t*1.5 + hash01(p.key)*10);
    ctx.save();
    ctx.globalAlpha = 0.08 + 0.10*puff;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.ellipse(x+w*0.62, y+14 - puff*6, 10, 14, 0, 0, Math.PI*2);
    ctx.ellipse(x+w*0.64, y+0  - puff*10, 12, 16, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (p.type === "cafe"){
    roundRect(x+w*0.22, y+22, w*0.56, 40, 18);
    ctx.fill(); ctx.stroke();

    // 어닝 흔들
    const sway = Math.sin(t*2.0 + hash01(p.key)*10)*2;
    ctx.save();
    ctx.globalAlpha=0.9;
    ctx.fillStyle="rgba(255,255,255,0.90)";
    roundRect(x+w*0.22, y+66 + sway, w*0.56, 24, 12);
    ctx.fill();
    ctx.globalAlpha=0.26;
    ctx.fillStyle="rgba(255,182,217,0.95)";
    for(let i=0;i<6;i++){
      const sx = x+w*0.22 + i*(w*0.56/6);
      ctx.fillRect(sx, y+66 + sway, w*0.56/12, 24);
    }
    ctx.restore();
    return;
  }

  if (p.type === "gym"){
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

  // arcade
  ctx.beginPath();
  ctx.moveTo(x+w*0.28, y+64);
  ctx.lineTo(x+w*0.50, y+18);
  ctx.lineTo(x+w*0.72, y+64);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  // 하트 “두근”
  const beat = 0.9 + 0.15*(0.5+0.5*Math.sin(t*3.0 + hash01(p.key)*10));
  ctx.save();
  ctx.globalAlpha = 0.22;
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
 *  마을 주택/상가
 * ========================= */
function drawHouse(o,t){
  const x=o.x, y=o.y, s=o.s;
  const wob = Math.sin(t*1.2 + x*0.01)*1.5;

  ctx.save();
  // 그림자
  ctx.globalAlpha=0.18;
  ctx.fillStyle="rgba(26,34,64,0.22)";
  roundRect(x-46*s, y+62*s, 92*s, 18*s, 12*s);
  ctx.fill();

  // 본체
  ctx.globalAlpha=0.95;
  ctx.fillStyle="rgba(255,255,255,0.70)";
  ctx.strokeStyle="rgba(26,34,64,0.14)";
  ctx.lineWidth=2;
  roundRect(x-48*s, y-10*s + wob, 96*s, 74*s, 16*s);
  ctx.fill(); ctx.stroke();

  // 지붕
  ctx.fillStyle="rgba(226,196,251,0.75)";
  if (o.style==="roof"){
    ctx.beginPath();
    ctx.moveTo(x-52*s, y-8*s + wob);
    ctx.lineTo(x, y-44*s + wob);
    ctx.lineTo(x+52*s, y-8*s + wob);
    ctx.closePath();
    ctx.fill();
  } else {
    roundRect(x-52*s, y-34*s + wob, 104*s, 28*s, 16*s);
    ctx.fill();
  }

  // 창문/문
  ctx.fillStyle="rgba(255,255,255,0.78)";
  roundRect(x-28*s, y+14*s + wob, 20*s, 16*s, 6*s); ctx.fill();
  roundRect(x+8*s,  y+14*s + wob, 20*s, 16*s, 6*s); ctx.fill();
  ctx.fillStyle="rgba(111,183,230,0.45)";
  roundRect(x-6*s, y+30*s + wob, 12*s, 28*s, 8*s); ctx.fill();

  ctx.restore();
}

function drawShop(o,t){
  const x=o.x, y=o.y, s=o.s;
  const wob = Math.sin(t*1.1 + x*0.02)*1.2;

  ctx.save();
  // 그림자
  ctx.globalAlpha=0.18;
  ctx.fillStyle="rgba(26,34,64,0.22)";
  roundRect(x-54*s, y+70*s, 108*s, 18*s, 12*s);
  ctx.fill();

  // 본체
  ctx.globalAlpha=0.96;
  ctx.fillStyle="rgba(255,245,235,0.72)";
  ctx.strokeStyle="rgba(26,34,64,0.14)";
  ctx.lineWidth=2;
  roundRect(x-56*s, y-6*s + wob, 112*s, 82*s, 18*s);
  ctx.fill(); ctx.stroke();

  // 간판/어닝
  if (o.style==="awning"){
    const sway = Math.sin(t*2.0 + x*0.01)*2;
    ctx.fillStyle="rgba(255,255,255,0.86)";
    roundRect(x-54*s, y-26*s + wob, 108*s, 22*s, 12*s);
    ctx.fill();

    ctx.globalAlpha=0.34;
    ctx.fillStyle="rgba(244,185,216,0.95)";
    for(let i=0;i<7;i++){
      ctx.fillRect(x-54*s + i*(108*s/7), y-6*s + wob + sway, (108*s/14), 20*s);
    }
    ctx.globalAlpha=0.96;
  } else {
    ctx.fillStyle="rgba(111,183,230,0.70)";
    roundRect(x-42*s, y-30*s + wob, 84*s, 24*s, 12*s);
    ctx.fill();
    ctx.fillStyle="rgba(26,34,64,0.86)";
    ctx.font="900 12px system-ui";
    ctx.fillText("SHOP", x-18*s, y-13*s + wob);
  }

  // 쇼윈도
  ctx.fillStyle="rgba(255,255,255,0.82)";
  roundRect(x-44*s, y+16*s + wob, 88*s, 32*s, 10*s);
  ctx.fill();
  ctx.restore();
}

/** =========================
 *  놀이공원(관람차/회전목마)
 * ========================= */
function drawFerris(o,t){
  const x=o.x, y=o.y, s=o.s;
  const rot = t*0.35;

  ctx.save();
  // 그림자
  ctx.globalAlpha=0.15;
  ctx.fillStyle="rgba(26,34,64,0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y+130*s, 120*s, 22*s, 0, 0, Math.PI*2);
  ctx.fill();

  // 프레임
  ctx.globalAlpha=0.9;
  ctx.strokeStyle="rgba(26,34,64,0.18)";
  ctx.lineWidth=4*s;
  ctx.beginPath();
  ctx.moveTo(x-70*s, y+120*s); ctx.lineTo(x, y-40*s);
  ctx.moveTo(x+70*s, y+120*s); ctx.lineTo(x, y-40*s);
  ctx.stroke();

  // 바퀴
  ctx.translate(x, y+20*s);
  ctx.rotate(rot);
  ctx.strokeStyle="rgba(255,255,255,0.78)";
  ctx.lineWidth=5*s;
  ctx.beginPath();
  ctx.arc(0,0,90*s,0,Math.PI*2);
  ctx.stroke();

  // 스포크
  ctx.globalAlpha=0.55;
  ctx.strokeStyle="rgba(111,183,230,0.75)";
  for(let i=0;i<8;i++){
    const a=(i/8)*Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(Math.cos(a)*90*s, Math.sin(a)*90*s);
    ctx.stroke();
  }

  // 곤돌라
  ctx.globalAlpha=0.85;
  for(let i=0;i<10;i++){
    const a=(i/10)*Math.PI*2;
    const gx=Math.cos(a)*90*s;
    const gy=Math.sin(a)*90*s;
    ctx.fillStyle = (i%2===0) ? "rgba(240,193,115,0.85)" : "rgba(244,185,216,0.85)";
    roundRect(gx-8*s, gy-6*s, 16*s, 12*s, 6*s);
    ctx.fill();
  }

  ctx.restore();
}

function drawCarousel(o,t){
  const x=o.x, y=o.y, s=o.s;
  const bob = Math.sin(t*2.0)*2;

  ctx.save();
  // 그림자
  ctx.globalAlpha=0.16;
  ctx.fillStyle="rgba(26,34,64,0.22)";
  ctx.beginPath();
  ctx.ellipse(x, y+78*s, 90*s, 18*s, 0, 0, Math.PI*2);
  ctx.fill();

  // 받침
  ctx.globalAlpha=0.92;
  ctx.fillStyle="rgba(255,255,255,0.72)";
  ctx.strokeStyle="rgba(26,34,64,0.14)";
  ctx.lineWidth=2;
  roundRect(x-86*s, y+42*s, 172*s, 36*s, 18*s);
  ctx.fill(); ctx.stroke();

  // 천막(지붕)
  ctx.fillStyle="rgba(244,185,216,0.78)";
  ctx.beginPath();
  ctx.moveTo(x-80*s, y+44*s + bob);
  ctx.lineTo(x, y-26*s + bob);
  ctx.lineTo(x+80*s, y+44*s + bob);
  ctx.closePath();
  ctx.fill();

  // 기둥
  ctx.strokeStyle="rgba(26,34,64,0.16)";
  ctx.lineWidth=4*s;
  for(let i=0;i<6;i++){
    const px = x-70*s + i*(28*s);
    ctx.beginPath();
    ctx.moveTo(px, y+44*s);
    ctx.lineTo(px, y+10*s);
    ctx.stroke();
  }

  // 말(점으로 귀엽게)
  ctx.globalAlpha=0.85;
  for(let i=0;i<6;i++){
    const px = x-60*s + i*(24*s);
    const py = y+28*s + Math.sin(t*2 + i)*3;
    ctx.fillStyle = (i%2===0) ? "rgba(111,183,230,0.75)" : "rgba(240,193,115,0.75)";
    ctx.beginPath();
    ctx.ellipse(px, py, 7*s, 5*s, 0, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.restore();
}

/** =========================
 *  소품(나무 흔들 더 강하게)
 * ========================= */
function drawTree(o,t){
  const x=o.x, y=o.y, s=o.s;
  const sway = Math.sin(t*1.6 + x*0.01) * (6.5*s);

  // 그림자
  ctx.save();
  ctx.globalAlpha=0.16;
  ctx.fillStyle="rgba(26,34,64,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y+20*s, 24*s, 9*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // 줄기
  ctx.save();
  ctx.strokeStyle="rgba(26,34,64,0.18)";
  ctx.lineWidth=10*s;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(x, y-4*s);
  ctx.lineTo(x+sway, y+18*s);
  ctx.stroke();
  ctx.restore();

  // 잎
  ctx.save();
  ctx.globalAlpha=0.88;
  ctx.fillStyle="rgba(170, 240, 210, 0.70)";
  ctx.beginPath();
  ctx.ellipse(x-18*s+sway, y-14*s, 24*s, 20*s, 0, 0, Math.PI*2);
  ctx.ellipse(x+6*s+sway,  y-20*s, 28*s, 24*s, 0, 0, Math.PI*2);
  ctx.ellipse(x+24*s+sway, y-10*s, 24*s, 20*s, 0, 0, Math.PI*2);
  ctx.fill();

  // 하이라이트
  ctx.globalAlpha=0.16;
  ctx.fillStyle="rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.ellipse(x-4*s+sway, y-28*s, 14*s, 10*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawLamp(o,t){
  const x=o.x, y=o.y, s=o.s;
  const pulse = 0.5+0.5*Math.sin(t*3.0 + x*0.01);

  ctx.save();
  // 기둥
  ctx.strokeStyle="rgba(26,34,64,0.20)";
  ctx.lineWidth=6*s;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(x, y-36*s);
  ctx.lineTo(x, y+26*s);
  ctx.stroke();

  // 등
  ctx.fillStyle="rgba(255,255,255,0.86)";
  roundRect(x-12*s, y-46*s, 24*s, 16*s, 8*s);
  ctx.fill();

  // 빛(조금 선명)
  ctx.globalAlpha = 0.12 + 0.18*pulse;
  ctx.fillStyle="rgba(240,193,115,0.90)";
  ctx.beginPath();
  ctx.ellipse(x, y-18*s, 28*s, 44*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawBench(o,t){
  const x=o.x, y=o.y, s=o.s;

  ctx.save();
  ctx.globalAlpha=0.16;
  ctx.fillStyle="rgba(26,34,64,0.20)";
  ctx.beginPath();
  ctx.ellipse(x, y+18*s, 26*s, 8*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha=0.92;
  ctx.fillStyle="rgba(255,255,255,0.80)";
  ctx.strokeStyle="rgba(26,34,64,0.14)";
  ctx.lineWidth=2;
  roundRect(x-34*s, y-2*s, 68*s, 16*s, 10*s);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle="rgba(26,34,64,0.14)";
  roundRect(x-28*s, y+12*s, 10*s, 10*s, 4*s); ctx.fill();
  roundRect(x+18*s, y+12*s, 10*s, 10*s, 4*s); ctx.fill();
  ctx.restore();
}

function drawFlower(o,t){
  const x=o.x, y=o.y, s=o.s;
  const wig = Math.sin(t*2.2 + x*0.02)*2;

  ctx.save();
  ctx.globalAlpha=0.12;
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
  ctx.fillStyle="rgba(244,185,216,0.85)";
  for(let i=0;i<5;i++){
    const a=(i/5)*Math.PI*2;
    ctx.beginPath();
    ctx.ellipse(x+wig+Math.cos(a)*6*s, y-14*s+Math.sin(a)*6*s, 5*s, 6*s, 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.fillStyle="rgba(255,255,255,0.88)";
  ctx.beginPath();
  ctx.arc(x+wig, y-14*s, 4*s, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function drawFence(o,t){
  const x=o.x, y=o.y, s=o.s;
  const a=o.a || 0;

  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(a);
  ctx.globalAlpha=0.55;
  ctx.fillStyle="rgba(255,255,255,0.72)";
  ctx.strokeStyle="rgba(26,34,64,0.12)";
  ctx.lineWidth=2;

  roundRect(-26*s, -6*s, 52*s, 12*s, 6*s);
  ctx.fill(); ctx.stroke();

  ctx.globalAlpha=0.28;
  ctx.fillStyle="rgba(26,34,64,0.10)";
  roundRect(-22*s, -2*s, 44*s, 4*s, 3*s);
  ctx.fill();

  ctx.restore();
}

/** =========================
 *  미니미(4방향) - 멜빵바지 디테일
 * ========================= */
function frameIndex(animT){ return Math.floor(animT*10) % 4; }

function drawMinimi(x,y,t){
  const bob = Math.sin(player.bobT) * (player.moving ? 1.1 : 1.7);
  const f = player.moving ? frameIndex(player.animT) : 0;
  const dir = player.dir;

  // 그림자
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle="rgba(26,34,64,0.32)";
  ctx.beginPath();
  ctx.ellipse(x, y+24, 18, 7, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  const swing = player.moving ? Math.sin((f/4)*Math.PI*2) : 0;
  const arm = 4*swing;
  const leg = 5*swing;

  ctx.save();
  ctx.translate(x, y + bob);

  if (dir==="left") ctx.scale(-1, 1);

  // 머리
  ctx.fillStyle="rgba(255,255,255,0.95)";
  ctx.beginPath(); ctx.arc(0,-18,16,0,Math.PI*2); ctx.fill();

  // 머리장식
  ctx.globalAlpha=0.35;
  ctx.fillStyle="rgba(244,185,216,0.85)";
  ctx.beginPath(); ctx.arc(-8,-28,10,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1;

  // 몸통(멜빵바지)
  // 셔츠
  ctx.fillStyle="rgba(255,255,255,0.92)";
  roundRectAt(-12,-2,24,26,10);
  ctx.fill();

  // 멜빵바지(데님)
  const denim = ctx.createLinearGradient(-12,-2,12,24);
  denim.addColorStop(0, "rgba(111,183,230,0.98)");
  denim.addColorStop(1, "rgba(26,34,64,0.10)");
  ctx.fillStyle = denim;
  roundRectAt(-12,4,24,20,10);
  ctx.fill();

  // 멜빵 끈
  ctx.strokeStyle="rgba(26,34,64,0.22)";
  ctx.lineWidth=3;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(-8, 6); ctx.lineTo(-3, 14);
  ctx.moveTo(8, 6);  ctx.lineTo(3, 14);
  ctx.stroke();

  // 단추
  ctx.fillStyle="rgba(255,255,255,0.85)";
  ctx.beginPath();
  ctx.arc(-8,6,2.1,0,Math.PI*2);
  ctx.arc(8,6,2.1,0,Math.PI*2);
  ctx.fill();

  // 앞주머니
  ctx.globalAlpha=0.35;
  ctx.strokeStyle="rgba(26,34,64,0.35)";
  ctx.lineWidth=2;
  roundRectAt(-7, 14, 14, 10, 5);
  ctx.stroke();
  ctx.globalAlpha=1;

  // 얼굴/등
  if (dir==="down"){
    ctx.fillStyle="rgba(26,34,64,0.55)";
    ctx.beginPath(); ctx.arc(-5,-20,2.2,0,Math.PI*2); ctx.arc(5,-20,2.2,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=0.25;
    ctx.fillStyle="rgba(255,140,170,0.9)";
    ctx.beginPath(); ctx.arc(-9,-16,3,0,Math.PI*2); ctx.arc(9,-16,3,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
  } else if (dir==="up"){
    ctx.globalAlpha=0.20;
    ctx.fillStyle="rgba(26,34,64,0.55)";
    roundRectAt(-8,6,16,6,4); ctx.fill();
    ctx.globalAlpha=1;
  } else {
    ctx.fillStyle="rgba(26,34,64,0.55)";
    ctx.beginPath(); ctx.arc(4,-20,2.2,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=0.25;
    ctx.fillStyle="rgba(255,140,170,0.9)";
    ctx.beginPath(); ctx.arc(10,-16,3,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
  }

  // 팔
  ctx.strokeStyle="rgba(160,220,255,0.95)";
  ctx.lineWidth=5; ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(-12,6); ctx.lineTo(-20,10+arm);
  ctx.moveTo(12,6);  ctx.lineTo(20,10-arm);
  ctx.stroke();

  // 다리
  ctx.strokeStyle="rgba(111,183,230,0.95)";
  ctx.lineWidth=6;
  ctx.beginPath();
  ctx.moveTo(-6,18); ctx.lineTo(-8,26+leg);
  ctx.moveTo(6,18);  ctx.lineTo(8,26-leg);
  ctx.stroke();

  ctx.restore();
}

/** =========================
 *  커서
 * ========================= */
function drawCursor(sx, sy, t){
  ctx.save();
  ctx.translate(sx+14, sy+16);
  const pulse = 0.6 + 0.4*(0.5+0.5*Math.sin(t*5));
  ctx.globalAlpha = 0.14 + 0.10*pulse;
  ctx.strokeStyle="rgba(26,34,64,0.55)";
  ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.stroke();

  ctx.globalAlpha=0.95;
  ctx.fillStyle="rgba(255,255,255,0.95)";
  ctx.beginPath(); ctx.arc(0,-6,10,0,Math.PI*2); ctx.fill();
  ctx.fillStyle="rgba(111,183,230,0.95)";
  roundRectAt(-8,4,16,16,8); ctx.fill();
  ctx.restore();
}

/** =========================
 *  비네팅(약하게)
 * ========================= */
function vignette(strength=0.06){
  ctx.save();
  const g = ctx.createRadialGradient(
    VIEW.w*0.5, VIEW.h*0.55, Math.min(VIEW.w,VIEW.h)*0.35,
    VIEW.w*0.5, VIEW.h*0.55, Math.min(VIEW.w,VIEW.h)*0.95
  );
  g.addColorStop(0,"rgba(255,255,255,0)");
  g.addColorStop(1,`rgba(26,34,64,${strength})`);
  ctx.fillStyle=g;
  ctx.fillRect(0,0,VIEW.w,VIEW.h);
  ctx.restore();
}

/** =========================
 *  월드 상단 타이틀
 * ========================= */
function drawWorldTitle(){
  const text = "FA미니월드";
  const padX = 18;

  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.font = "900 20px system-ui";
  const tw = ctx.measureText(text).width;
  const bw = tw + padX*2;
  const bh = 40;

  const x = VIEW.w*0.5 - bw*0.5;
  const y = 14;

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.strokeStyle = "rgba(26,34,64,0.12)";
  ctx.lineWidth = 2;
  roundRect(x, y, bw, bh, 18);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle = "rgba(26,34,64,0.88)";
  ctx.fillText(text, x + padX, y + 27);

  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "rgba(111,183,230,0.85)";
  ctx.beginPath();
  ctx.arc(x + bw - 18, y + 20, 5, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

/** =========================
 *  util: roundRect
 * ========================= */
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

/** =========================
 *  LOOP
 * ========================= */
function loop(now){
  const t = now/1000;
  const dt = Math.min(0.033, (now-lastT)/1000);
  lastT = now;

  update(dt, t);
  draw(t);

  requestAnimationFrame(loop);
}

/** =========================
 *  START
 * ========================= */
resize();
for (const b of birds){
  b.x = Math.random()*WORLD.w;
  b.y = 70 + Math.random()*160;
}
requestAnimationFrame(loop);
