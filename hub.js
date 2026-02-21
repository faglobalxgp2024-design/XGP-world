// HUB.JS (FULL)
// - 전체 3D 톤업(가짜 3D: 상단면/측면/하이라이트/AO/텍스처 패턴)
// - 나무/건물/배경 디테일 업
// - 자동차: 세로 이동 시 위로 갈 때 뒷모습(테일라이트) 표시 FIX
// - 상단 타이틀: FA미니월드
// - 화면 더 넓게(줌아웃)

const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");

const toast = document.getElementById("toast");
const coordEl = document.getElementById("coord");
const fpsEl = document.getElementById("fps");
const fadeEl = document.getElementById("fade");

let W = 0, H = 0, DPR = 1;

/** =========================
 *  VIEW(줌) - 화면 더 넓게(줌 아웃)
 * ========================= */
const VIEW = { zoom: 0.86, w: 0, h: 0 }; // 0.82~0.92 취향 조절

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
function lerp(a,b,t){ return a + (b-a)*t; }

/** =========================
 *  월드 + 카메라
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

  const k = 1 - Math.pow(0.0012, dt);
  cam.x += (cam.targetX - cam.x) * k;
  cam.y += (cam.targetY - cam.y) * k;
}

/** =========================
 *  포탈 건물 6개
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
 *  도로/인도/횡단보도
 * ========================= */
const roads = [];
const sidewalks = [];
const crossings = [];

/** =========================
 *  자동차
 * ========================= */
const cars = [];
const CAR_COLORS = ["#ff6b6b","#ffd93d","#6bcBef","#95e06c","#b49bff","#ff9bd6","#ffffff"];

function seedCars(){
  cars.length = 0;
  const hr = roads[0];
  const vr = roads[1];
  if (!hr || !vr) return;

  const makeCar = (axis)=>{
    const col = CAR_COLORS[Math.floor(Math.random()*CAR_COLORS.length)];
    const speed = 95 + Math.random()*80;

    if (axis==="h"){
      const lane = Math.random()<0.5 ? 0 : 1;
      const dir = Math.random()<0.5 ? 1 : -1;
      return {
        kind:"car",
        axis:"h",
        dir,
        color: col,
        speed,
        w: 48 + Math.random()*18,
        h: 22 + Math.random()*6,
        x: hr.x + Math.random()*hr.w,
        y: hr.y + (lane===0 ? hr.h*0.38 : hr.h*0.66),
        bob: Math.random()*10
      };
    } else {
      const lane = Math.random()<0.5 ? 0 : 1;
      const dir = Math.random()<0.5 ? 1 : -1; // +1 아래, -1 위
      return {
        kind:"car",
        axis:"v",
        dir,
        color: col,
        speed,
        w: 22 + Math.random()*6,
        h: 52 + Math.random()*18,
        x: vr.x + (lane===0 ? vr.w*0.38 : vr.w*0.66),
        y: vr.y + Math.random()*vr.h,
        bob: Math.random()*10
      };
    }
  };

  for(let i=0;i<7;i++) cars.push(makeCar("h"));
  for(let i=0;i<6;i++) cars.push(makeCar("v"));
}

/** =========================
 *  패턴/텍스처(한번 생성)
 * ========================= */
let grassPattern = null;
let brickPattern = null;
let roofPattern = null;
let gravelPattern = null;
let leafPattern = null;

function makePattern(w,h,drawFn){
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  drawFn(g, w, h);
  return ctx.createPattern(c, "repeat");
}

function buildPatterns(){
  // 잔디
  grassPattern = makePattern(240,240,(g,w,h)=>{
    g.fillStyle = "rgba(170, 230, 200, 0.32)";
    g.fillRect(0,0,w,h);

    g.globalAlpha = 0.18;
    g.strokeStyle = "rgba(26,34,64,0.28)";
    g.lineWidth = 1;
    for(let i=0;i<560;i++){
      const x = Math.random()*w;
      const y = Math.random()*h;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 5, y - 7);
      g.stroke();
    }

    g.globalAlpha = 0.18;
    for(let i=0;i<90;i++){
      const x = Math.random()*w;
      const y = Math.random()*h;
      g.fillStyle = (i%2===0) ? "rgba(255,182,217,0.48)" : "rgba(255,255,255,0.48)";
      g.beginPath();
      g.arc(x,y,1.2,0,Math.PI*2);
      g.fill();
    }

    // 잔디 음영 점
    g.globalAlpha = 0.10;
    for(let i=0;i<160;i++){
      const x = Math.random()*w;
      const y = Math.random()*h;
      g.fillStyle = (i%3===0) ? "rgba(26,34,64,0.22)" : "rgba(240,193,115,0.18)";
      g.beginPath();
      g.arc(x,y,0.8+Math.random()*1.4,0,Math.PI*2);
      g.fill();
    }
  });

  // 벽돌
  brickPattern = makePattern(120,80,(g,w,h)=>{
    g.fillStyle = "rgba(255,255,255,0.08)";
    g.fillRect(0,0,w,h);
    g.globalAlpha = 0.25;
    g.strokeStyle = "rgba(26,34,64,0.22)";
    g.lineWidth = 1;

    const bw = 28, bh = 14;
    for(let y=0;y<h+bh;y+=bh){
      const offset = ((y/bh)|0)%2 ? bw/2 : 0;
      for(let x=-bw;x<w+bw;x+=bw){
        g.strokeRect(x+offset+1, y+1, bw-2, bh-2);
      }
    }

    g.globalAlpha = 0.10;
    for(let i=0;i<50;i++){
      g.fillStyle = "rgba(26,34,64,0.18)";
      g.beginPath();
      g.arc(Math.random()*w, Math.random()*h, 0.8+Math.random()*1.6, 0, Math.PI*2);
      g.fill();
    }
  });

  // 지붕(슁글)
  roofPattern = makePattern(160,100,(g,w,h)=>{
    g.fillStyle = "rgba(255,255,255,0.08)";
    g.fillRect(0,0,w,h);
    g.globalAlpha = 0.18;
    g.strokeStyle = "rgba(26,34,64,0.25)";
    g.lineWidth = 1;
    const stepX = 18, stepY = 14;
    for(let y=0;y<h+stepY;y+=stepY){
      const off = ((y/stepY)|0)%2 ? stepX*0.5 : 0;
      for(let x=-stepX;x<w+stepX;x+=stepX){
        g.beginPath();
        g.moveTo(x+off, y);
        g.lineTo(x+off+stepX, y);
        g.lineTo(x+off+stepX-3, y+stepY);
        g.lineTo(x+off+3, y+stepY);
        g.closePath();
        g.stroke();
      }
    }
  });

  // 자갈(도로 테두리/흙)
  gravelPattern = makePattern(180,180,(g,w,h)=>{
    g.fillStyle = "rgba(255,255,255,0.08)";
    g.fillRect(0,0,w,h);
    for(let i=0;i<260;i++){
      const r = 0.8+Math.random()*2.8;
      g.globalAlpha = 0.12 + Math.random()*0.10;
      g.fillStyle = (i%3===0) ? "rgba(26,34,64,0.25)" : "rgba(255,255,255,0.25)";
      g.beginPath();
      g.arc(Math.random()*w, Math.random()*h, r, 0, Math.PI*2);
      g.fill();
    }
  });

  // 잎 결(나무 잎 디테일)
  leafPattern = makePattern(140,140,(g,w,h)=>{
    g.fillStyle = "rgba(170,240,210,0.10)";
    g.fillRect(0,0,w,h);
    g.globalAlpha = 0.22;
    for(let i=0;i<220;i++){
      const x = Math.random()*w;
      const y = Math.random()*h;
      g.fillStyle = (i%4===0) ? "rgba(255,255,255,0.12)" : "rgba(26,34,64,0.10)";
      g.beginPath();
      g.ellipse(x,y, 1.6+Math.random()*2.2, 1.2+Math.random()*1.8, Math.random(), 0, Math.PI*2);
      g.fill();
    }
  });
}

/** =========================
 *  props (마을 + 놀이공원)
 * ========================= */
const props = [];
const signs = [];

function seedProps(){
  props.length = 0;

  // 주택
  for (let i=0;i<10;i++){
    props.push({
      kind:"house",
      x: WORLD.w*0.10 + Math.random()*WORLD.w*0.32,
      y: WORLD.h*0.10 + Math.random()*WORLD.h*0.30,
      s: 0.95 + Math.random()*0.50,
      style: (Math.random()<0.55 ? "roof" : "flat")
    });
  }
  // 상가
  for (let i=0;i<9;i++){
    props.push({
      kind:"shop",
      x: WORLD.w*0.56 + Math.random()*WORLD.w*0.34,
      y: WORLD.h*0.10 + Math.random()*WORLD.h*0.32,
      s: 0.95 + Math.random()*0.60,
      style: (Math.random()<0.55 ? "awning" : "sign")
    });
  }

  // 놀이공원
  props.push({ kind:"ferris", x: WORLD.w*0.84, y: WORLD.h*0.78, s: 1.05 });
  props.push({ kind:"carousel", x: WORLD.w*0.70, y: WORLD.h*0.82, s: 1.00 });

  // 소품
  const tries = 220;
  const isOnRoadLike = (x,y)=>{
    for(const r of roads){
      if (x>=r.x-18 && x<=r.x+r.w+18 && y>=r.y-18 && y<=r.y+r.h+18) return true;
    }
    return false;
  };

  for(let i=0;i<tries;i++){
    const x = WORLD.margin + Math.random()*(WORLD.w - WORLD.margin*2);
    const y = WORLD.margin + Math.random()*(WORLD.h - WORLD.margin*2);
    if (isOnRoadLike(x,y)) continue;

    const r = Math.random();
    if (r < 0.40) props.push({ kind:"tree", x,y, s:0.85 + Math.random()*0.95, v: Math.random()*10 });
    else if (r < 0.55) props.push({ kind:"lamp", x,y, s:0.9 + Math.random()*0.55 });
    else if (r < 0.65) props.push({ kind:"bench", x,y, s:0.9 + Math.random()*0.35 });
    else if (r < 0.88) props.push({ kind:"flower", x,y, s:0.8 + Math.random()*1.0 });
    else props.push({ kind:"fence", x,y, s:0.9 + Math.random()*0.7, a:(Math.random()<0.5?0:Math.PI/2) });
  }

  // 포탈 주변 꽃
  for (const p of portals){
    props.push({ kind:"flower", x:p.x+p.w*0.20, y:p.y+p.h+26, s:1.3 });
    props.push({ kind:"flower", x:p.x+p.w*0.80, y:p.y+p.h+18, s:1.1 });
  }

  // 표지판
  const arch = portalsByKey("archery");
  const jang = portalsByKey("janggi");
  signs.length = 0;
  signs.push({ x: arch.x + arch.w*0.5 - 10, y: arch.y + arch.h + 90, text: "양궁 →", dir: "right" });
  signs.push({ x: jang.x + jang.w*0.5 + 10, y: jang.y + jang.h + 90, text: "← 장기", dir: "left" });
}

/** =========================
 *  파티클/발자국
 * ========================= */
const particles = [];
function spawnPortalParticles(p, t){
  const zx = p.x + p.w*0.5;
  const zy = p.y + p.h*0.78;
  const d = Math.hypot(player.x - zx, player.y - zy);
  if (d > 220) return;

  const rate = (activePortal === p) ? 12 : 5;
  const n = Math.random() < rate/60 ? 1 : 0;
  for(let i=0;i<n;i++){
    particles.push({
      x: zx + (Math.random()-0.5)*70,
      y: zy - 12 + (Math.random()-0.5)*24,
      vx: (Math.random()-0.5)*18,
      vy: -30 - Math.random()*30,
      life: 0.9 + Math.random()*0.7,
      age: 0,
      r: 1.2 + Math.random()*2.2,
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
 *  배경 요소(원근 레이어)
 * ========================= */
const clouds = Array.from({length:10}, ()=>({
  x: Math.random()*3200,
  y: 40 + Math.random()*230,
  s: 0.7 + Math.random()*1.2,
  v: 9 + Math.random()*16,
  layer: Math.random()<0.5 ? 0 : 1
}));

const sparkles = Array.from({length:44}, ()=>({
  x: Math.random(),
  y: Math.random(),
  t: Math.random()*10,
  r: 1 + Math.random()*2
}));

const birds = Array.from({length:6}, ()=>({
  x: 0, y: 0, p: Math.random()*10, v: 22 + Math.random()*20
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
 *  Depth sorting
 * ========================= */
function getFootY(entity){
  if (entity.kind === "building") return entity.y + entity.h;
  if (entity.kind === "car") return entity.y + entity.h;
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
  WORLD.w = Math.max(3200, Math.floor(W * 3.6));
  WORLD.h = Math.max(2300, Math.floor(H * 3.2));

  // 포탈 크기
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
  roads.push({ x: WORLD.w*0.10, y: WORLD.h*0.48, w: WORLD.w*0.80, h: 132 });
  sidewalks.push({ x: WORLD.w*0.10, y: WORLD.h*0.48 - 48, w: WORLD.w*0.80, h: 38 });
  sidewalks.push({ x: WORLD.w*0.10, y: WORLD.h*0.48 + 142, w: WORLD.w*0.80, h: 38 });

  // 세로 도로
  roads.push({ x: WORLD.w*0.50 - 64, y: WORLD.h*0.10, w: 128, h: WORLD.h*0.82 });
  sidewalks.push({ x: WORLD.w*0.50 - 64 - 46, y: WORLD.h*0.10, w: 34, h: WORLD.h*0.82 });
  sidewalks.push({ x: WORLD.w*0.50 + 64 + 12, y: WORLD.h*0.10, w: 34, h: WORLD.h*0.82 });

  // 횡단보도
  crossings.push({ x: WORLD.w*0.50 - 92, y: WORLD.h*0.48 + 32, w: 184, h: 58 });
  crossings.push({ x: WORLD.w*0.50 - 92, y: WORLD.h*0.48 - 88, w: 184, h: 58 });

  // 패턴
  buildPatterns();

  // cars/props
  seedCars();
  seedProps();

  // 플레이어 시작 보정
  player.x = clamp(player.x, WORLD.margin+80, WORLD.w - WORLD.margin-80);
  player.y = clamp(player.y, WORLD.margin+80, WORLD.h - WORLD.margin-80);
}

/** =========================
 *  팔레트
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
 *  3D 유틸
 * ========================= */
function shade(hex, amt){
  const h = hex.replace("#","");
  const r = clamp(parseInt(h.slice(0,2),16) + amt, 0, 255);
  const g = clamp(parseInt(h.slice(2,4),16) + amt, 0, 255);
  const b = clamp(parseInt(h.slice(4,6),16) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}

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

function glossyHighlight(x,y,w,h,alpha=0.16){
  ctx.save();
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(x, y, x+w, y+h);
  g.addColorStop(0, "rgba(255,255,255,0.85)");
  g.addColorStop(0.35, "rgba(255,255,255,0.22)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  roundRect(x+6, y+6, w-12, Math.max(18, h*0.38), 14);
  ctx.fill();
  ctx.restore();
}

// Ambient occlusion(접지 음영)
function groundAO(x,y,w,h,alpha=0.18){
  ctx.save();
  const g = ctx.createRadialGradient(x+w*0.5,y+h*0.8, 10, x+w*0.5,y+h*0.8, Math.max(w,h)*0.7);
  g.addColorStop(0, `rgba(26,34,64,${alpha})`);
  g.addColorStop(1, "rgba(26,34,64,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x-80, y-80, w+160, h+160);
  ctx.restore();
}

// 3D 박스(전면/윗면/옆면)
function drawBox3D(x,y,w,h,depth, face, edge="rgba(26,34,64,0.14)"){
  // front
  ctx.fillStyle = face.front;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  roundRect(x, y, w, h, 18);
  ctx.fill(); ctx.stroke();

  // top
  ctx.fillStyle = face.top;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x+depth, y-depth);
  ctx.lineTo(x+w+depth, y-depth);
  ctx.lineTo(x+w, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // side
  ctx.fillStyle = face.side;
  ctx.beginPath();
  ctx.moveTo(x+w, y);
  ctx.lineTo(x+w+depth, y-depth);
  ctx.lineTo(x+w+depth, y+h-depth);
  ctx.lineTo(x+w, y+h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** =========================
 *  Update / Draw loop
 * ========================= */
let lastT = performance.now();
let acc=0, framesCount=0, fps=0;

function update(dt, t){
  // 플레이어 이동
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
  addFootprint(dt);

  // 자동차 이동
  for (const c of cars){
    c.bob += dt*3.0;
    if (c.axis === "h"){
      c.x += c.dir * c.speed * dt;
      const hr = roads[0];
      if (c.dir > 0 && c.x > hr.x + hr.w + 140) c.x = hr.x - 140;
      if (c.dir < 0 && c.x < hr.x - 140) c.x = hr.x + hr.w + 140;
    } else {
      c.y += c.dir * c.speed * dt;
      const vr = roads[1];
      if (c.dir > 0 && c.y > vr.y + vr.h + 140) c.y = vr.y - 140;
      if (c.dir < 0 && c.y < vr.y - 140) c.y = vr.y + vr.h + 140;
    }
  }

  // 구름(레이어별 속도 차이)
  for (const c of clouds){
    c.x += c.v * (c.layer===0 ? 1.0 : 0.75) * dt;
    if (c.x > WORLD.w + 420){
      c.x = -420;
      c.y = 40 + Math.random()*260;
      c.s = 0.7 + Math.random()*1.2;
      c.v = 9 + Math.random()*16;
      c.layer = Math.random()<0.5 ? 0 : 1;
    }
  }

  // 새
  for (const b of birds){
    b.x += b.v*dt;
    b.p += dt*4.2;
    if (b.x > WORLD.w + 240){
      b.x = -200;
      b.y = 70 + Math.random()*160;
      b.v = 22 + Math.random()*20;
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

  // 포탈 파티클
  for (const p of portals) spawnPortalParticles(p, t);

  // 파티클/발자국 수명
  for (let i=particles.length-1;i>=0;i--){
    const q = particles[i];
    q.age += dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vy += 22 * dt;
    if (q.age >= q.life) particles.splice(i,1);
  }
  for (let i=footprints.length-1;i>=0;i--){
    const f = footprints[i];
    f.age += dt;
    if (f.age >= f.life) footprints.splice(i,1);
  }

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
  drawDistantHills(t);
  drawSparklesWorld(t);
  drawCloudsWorld();
  drawGroundWorld();
  drawRoadsAndSidewalks(t);
  drawFootprints();

  // depth sorting
  const items = [];
  for (const p of portals) items.push({ kind:"building", ref:p, footY:getFootY({kind:"building", y:p.y, h:p.h}) });
  for (const c of cars) items.push({ kind:"car", ref:c, footY:getFootY(c) });
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

  drawParticles();
  ctx.restore();

  drawWorldTitle();

  if (!isTouchDevice() && pointer.active){
    const idle = (performance.now() - pointer.lastMoveAt) > 1400;
    if (!idle) drawCursor(pointer.x, pointer.y, t);
  }

  vignette(0.07);
}

/** =========================
 *  배경(더 깊이감: 하늘+산+안개)
 * ========================= */
function drawSkyWorld(t){
  const g = ctx.createLinearGradient(0,0,0,WORLD.h);
  g.addColorStop(0, "#cfe7f2");
  g.addColorStop(0.55, "#dce9d7");
  g.addColorStop(1, "#e6d6e2");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,WORLD.w,WORLD.h);

  // 안개 블랍(더 자연스럽게)
  softBlob(WORLD.w*0.22, WORLD.h*0.18, 380, "rgba(255, 200, 225, 0.08)");
  softBlob(WORLD.w*0.78, WORLD.h*0.16, 420, "rgba(190, 235, 255, 0.08)");
  softBlob(WORLD.w*0.55, WORLD.h*0.30, 420, "rgba(170, 240, 210, 0.06)");

  // 새
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = "rgba(26,34,64,0.55)";
  ctx.lineWidth = 2;
  for (const b of birds){
    const yy = b.y + Math.sin(b.p)*6;
    const xx = b.x;
    ctx.beginPath();
    ctx.moveTo(xx-6, yy);
    ctx.quadraticCurveTo(xx, yy-4, xx+6, yy);
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
function drawDistantHills(t){
  // 원근 산 레이어 2개
  const baseY1 = WORLD.h*0.30;
  const baseY2 = WORLD.h*0.34;

  // far
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "rgba(26,34,64,0.18)";
  ctx.beginPath();
  ctx.moveTo(0, baseY1);
  for(let i=0;i<=18;i++){
    const x = (i/18)*WORLD.w;
    const y = baseY1 - 40 - 30*Math.sin(i*0.8 + t*0.12);
    ctx.quadraticCurveTo(x, y, x, baseY1);
  }
  ctx.lineTo(WORLD.w, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();

  // mid
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = "rgba(170,240,210,0.20)";
  ctx.beginPath();
  ctx.moveTo(0, baseY2);
  for(let i=0;i<=16;i++){
    const x = (i/16)*WORLD.w;
    const y = baseY2 - 24 - 26*Math.sin(i*0.9 + t*0.10);
    ctx.quadraticCurveTo(x, y, x, baseY2);
  }
  ctx.lineTo(WORLD.w, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
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
  for (const c of clouds){
    const par = (c.layer===0 ? 1.0 : 0.75);
    cloud(c.x, c.y, 160*c.s, 60*c.s, 0.12 + 0.05*par);
  }
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
 *  땅(3D 느낌: 경사/그라운드 쉐이드)
 * ========================= */
function drawGroundWorld(){
  // 상단은 살짝 안개, 아래는 선명 잔디
  ctx.save();
  const gg = ctx.createLinearGradient(0, WORLD.h*0.32, 0, WORLD.h);
  gg.addColorStop(0, "rgba(255,255,255,0.30)");
  gg.addColorStop(0.20, "rgba(255,255,255,0.08)");
  gg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gg;
  ctx.fillRect(0, WORLD.h*0.30, WORLD.w, WORLD.h*0.70);
  ctx.restore();

  // 잔디 패턴
  ctx.save();
  ctx.fillStyle = grassPattern || "rgba(170,230,200,0.28)";
  ctx.fillRect(0, WORLD.h*0.34, WORLD.w, WORLD.h*0.66);
  ctx.restore();

  // 원근 음영(아래쪽이 더 어둡게: 깊이감)
  ctx.save();
  const sh = ctx.createLinearGradient(0, WORLD.h*0.34, 0, WORLD.h);
  sh.addColorStop(0, "rgba(26,34,64,0.00)");
  sh.addColorStop(1, "rgba(26,34,64,0.06)");
  ctx.fillStyle = sh;
  ctx.fillRect(0, WORLD.h*0.34, WORLD.w, WORLD.h*0.66);
  ctx.restore();

  // 작은 흙길/자갈 패치(마을 느낌)
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = gravelPattern || "rgba(26,34,64,0.06)";
  for(let i=0;i<14;i++){
    const x = WORLD.w*0.12 + Math.random()*WORLD.w*0.76;
    const y = WORLD.h*0.38 + Math.random()*WORLD.h*0.54;
    ctx.beginPath();
    ctx.ellipse(x, y, 50+Math.random()*120, 18+Math.random()*44, Math.random()*0.6, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

/** =========================
 *  도로/인도/횡단보도(턱/높이감)
 * ========================= */
function drawRoadsAndSidewalks(t){
  // 도로
  for (const r of roads){
    // 턱(3D)
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    roundRect(r.x-6, r.y-6, r.w+12, r.h+12, 42);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = "rgba(26,34,64,0.26)";
    roundRect(r.x, r.y, r.w, r.h, 38);
    ctx.fill();

    // 도로 하이라이트
    ctx.globalAlpha = 0.10;
    const hg = ctx.createLinearGradient(r.x, r.y, r.x, r.y+r.h);
    hg.addColorStop(0, "rgba(255,255,255,0.55)");
    hg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hg;
    roundRect(r.x+6, r.y+6, r.w-12, r.h*0.35, 26);
    ctx.fill();

    // 외곽 라인
    ctx.globalAlpha = 0.18;
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
    // 턱
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = "rgba(26,34,64,0.25)";
    roundRect(s.x+2, s.y+4, s.w, s.h, 18);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "rgba(255, 245, 235, 0.74)";
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

    // 상단 하이라이트
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    roundRect(s.x+4, s.y+3, s.w-8, Math.max(8, s.h*0.35), 14);
    ctx.fill();
    ctx.restore();
  }

  // 횡단보도
  for (const c of crossings){
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    roundRect(c.x, c.y, c.w, c.h, 14);
    ctx.fill();

    ctx.globalAlpha = 0.88;
    for(let i=0;i<9;i++){
      const yy = c.y + 6 + i*6;
      ctx.fillStyle = (i%2===0) ? "rgba(255,255,255,0.84)" : "rgba(255,255,255,0.10)";
      ctx.fillRect(c.x+10, yy, c.w-20, 4);
    }
    ctx.restore();
  }
}

/** =========================
 *  발자국/파티클
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
 *  표지판(조금 더 입체)
 * ========================= */
function drawSign(s, t){
  const sway = Math.sin(t*1.6 + s.x*0.01) * 1.5;

  ctx.save();
  ctx.translate(s.x, s.y + sway);

  // 그림자
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "rgba(26,34,64,0.30)";
  ctx.beginPath();
  ctx.ellipse(0, 26, 20, 6, 0, 0, Math.PI*2);
  ctx.fill();

  // 기둥
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "rgba(26,34,64,0.20)";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 20);
  ctx.lineTo(0, -22);
  ctx.stroke();

  // 판(3D)
  ctx.fillStyle = "rgba(255,255,255,0.86)";
  ctx.strokeStyle = "rgba(26,34,64,0.14)";
  ctx.lineWidth = 2;
  roundRect(-58, -54, 116, 36, 14);
  ctx.fill(); ctx.stroke();
  glossyHighlight(-58, -54, 116, 36, 0.14);

  // 글자
  ctx.fillStyle = "rgba(26,34,64,0.90)";
  ctx.font = "900 14px system-ui";
  ctx.fillText(s.text, -42, -31);

  // 포인트
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = "rgba(111,183,230,0.85)";
  ctx.beginPath();
  ctx.arc(46, -36, 5, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

/** =========================
 *  자동차 - FIX 포함
 * ========================= */
function drawCar(c, t){
  const bounce = Math.sin(c.bob)*0.7;

  ctx.save();
  ctx.translate(c.x, c.y + bounce);

  if (c.axis === "h"){
    // 옆모습
    if (c.dir < 0) ctx.scale(-1,1);

    const w = c.w, h = c.h;

    // 그림자
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = "rgba(26,34,64,0.35)";
    ctx.beginPath();
    ctx.ellipse(0, h*0.55, w*0.52, h*0.32, 0, 0, Math.PI*2);
    ctx.fill();

    // 바디
    const g = ctx.createLinearGradient(-w*0.5, -h*0.6, w*0.5, h*0.6);
    g.addColorStop(0, "rgba(255,255,255,0.85)");
    g.addColorStop(0.15, c.color);
    g.addColorStop(1, "rgba(26,34,64,0.10)");
    ctx.globalAlpha = 0.96;
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

    // 앞 라이트
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.ellipse(w*0.50, -h*0.08, w*0.06, h*0.12, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
    return;
  }

  // 세로 이동: 탑뷰(위로 갈때 뒷모습=테일라이트)
  const w = c.w, h = c.h;
  const goingDown = c.dir > 0; // + 아래로

  // 그림자
  ctx.save();
  ctx.globalAlpha = 0.20;
  ctx.fillStyle = "rgba(26,34,64,0.35)";
  ctx.beginPath();
  ctx.ellipse(0, h*0.40, w*0.70, h*0.22, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // 바디
  ctx.save();
  const bodyG = ctx.createLinearGradient(-w*0.6, -h*0.5, w*0.6, h*0.5);
  bodyG.addColorStop(0, "rgba(255,255,255,0.85)");
  bodyG.addColorStop(0.18, c.color);
  bodyG.addColorStop(1, "rgba(26,34,64,0.12)");

  ctx.globalAlpha = 0.96;
  ctx.fillStyle = bodyG;
  ctx.strokeStyle = "rgba(26,34,64,0.18)";
  ctx.lineWidth = 2;
  roundRectAt(-w*0.55, -h*0.52, w*1.10, h*1.04, 12);
  ctx.fill(); ctx.stroke();

  // 유리
  const glassG = ctx.createLinearGradient(0, -h*0.35, 0, h*0.20);
  glassG.addColorStop(0, "rgba(200,245,255,0.78)");
  glassG.addColorStop(1, "rgba(26,34,64,0.10)");
  ctx.fillStyle = glassG;
  roundRectAt(-w*0.34, -h*0.34, w*0.68, h*0.54, 10);
  ctx.fill();

  // 하이라이트
  ctx.globalAlpha = 0.14;
  ctx.fillStyle="rgba(255,255,255,0.92)";
  roundRectAt(-w*0.45, -h*0.46, w*0.55, h*0.18, 10);
  ctx.fill();
  ctx.globalAlpha = 0.96;

  // 바퀴
  ctx.fillStyle = "rgba(26,34,64,0.70)";
  ctx.beginPath();
  ctx.ellipse(-w*0.58, -h*0.18, w*0.14, h*0.10, 0, 0, Math.PI*2);
  ctx.ellipse(w*0.58,  -h*0.18, w*0.14, h*0.10, 0, 0, Math.PI*2);
  ctx.ellipse(-w*0.58,  h*0.18, w*0.14, h*0.10, 0, 0, Math.PI*2);
  ctx.ellipse(w*0.58,   h*0.18, w*0.14, h*0.10, 0, 0, Math.PI*2);
  ctx.fill();

  if (goingDown){
    // 아래가 앞(헤드라이트 아래쪽)
    ctx.globalAlpha = 0.70;
    ctx.fillStyle = "rgba(255,255,255,0.90)";
    ctx.beginPath();
    ctx.ellipse(-w*0.22, h*0.52, w*0.10, h*0.08, 0, 0, Math.PI*2);
    ctx.ellipse(w*0.22,  h*0.52, w*0.10, h*0.08, 0, 0, Math.PI*2);
    ctx.fill();
  } else {
    // 위가 뒤(테일라이트 위쪽) => "위로갈때 뒷모습"
    ctx.globalAlpha = 0.82;
    ctx.fillStyle = "rgba(255,90,110,0.88)";
    ctx.beginPath();
    ctx.ellipse(-w*0.22, -h*0.52, w*0.10, h*0.08, 0, 0, Math.PI*2);
    ctx.ellipse(w*0.22,  -h*0.52, w*0.10, h*0.08, 0, 0, Math.PI*2);
    ctx.fill();

    // 트렁크 라인
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "rgba(255,255,255,0.90)";
    ctx.beginPath();
    ctx.ellipse(0, -h*0.50, w*0.50, h*0.10, 0, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.restore();
  ctx.restore();
}

/** =========================
 *  포탈 건물(3D + 텍스처 + AO)
 * ========================= */
function drawBuildingPortal(p, t){
  const pal = buildingPalette(p.type);
  const isActive = (activePortal === p);
  const pulse = 0.55 + 0.45*Math.sin(t*3.0 + hash01(p.key)*6);
  const glow = isActive ? 1.0 : 0.55;

  // AO + 그림자
  groundAO(p.x+10, p.y+p.h-22, p.w-20, 26, 0.18);

  // 바닥 조명
  const zx = p.x + p.w*0.5;
  const zy = p.y + p.h*0.86;
  ctx.save();
  ctx.globalAlpha = (isActive ? 0.26 : 0.14) + 0.10*pulse*glow;
  ctx.fillStyle = (p.status==="open") ? "rgba(111,183,230,0.85)" : "rgba(240,193,115,0.75)";
  ctx.beginPath();
  ctx.ellipse(zx, zy, 62, 20, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // 본체 3D
  ctx.save();
  const depth = Math.max(10, Math.min(24, p.w*0.06));
  drawBox3D(p.x+18, p.y+44, p.w-36, p.h-64, depth, {
    front: pal.main,
    top: shade(pal.main, +18),
    side: shade(pal.main, -22)
  }, "rgba(26,34,64,0.16)");

  // 벽 텍스처(살짝)
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = brickPattern || "rgba(255,255,255,0.12)";
  roundRect(p.x+18, p.y+44, p.w-36, p.h-64, 18);
  ctx.fill();
  ctx.restore();

  // 전면 그라데이션(빛 방향)
  ctx.save();
  const gx = ctx.createLinearGradient(p.x+18, 0, p.x+p.w-18, 0);
  gx.addColorStop(0, "rgba(255,255,255,0.22)");
  gx.addColorStop(0.20, "rgba(255,255,255,0.05)");
  gx.addColorStop(1, "rgba(26,34,64,0.12)");
  ctx.fillStyle = gx;
  roundRect(p.x+18, p.y+44, p.w-36, p.h-64, 18);
  ctx.fill();
  ctx.restore();

  // 지붕 + 지붕 텍스처
  drawRoofByType(p, pal, t);

  // 창문(프레임+유리+반사)
  const winY = p.y + p.h*0.56;
  for(let i=0;i<4;i++){
    const wx = p.x + p.w*0.24 + i*(p.w*0.13);
    const wy = winY;

    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "rgba(255,255,255,0.78)";
    roundRect(wx-2, wy-2, p.w*0.10+4, p.h*0.09+4, 9);
    ctx.fill();

    const on = Math.sin(t*2.1 + i + hash01(p.key)*10) > 0.20;
    const glass = ctx.createLinearGradient(wx, wy, wx+p.w*0.10, wy+p.h*0.09);
    glass.addColorStop(0, on ? "rgba(210,245,255,0.90)" : "rgba(210,245,255,0.62)");
    glass.addColorStop(1, "rgba(26,34,64,0.10)");
    ctx.fillStyle = glass;
    roundRect(wx, wy, p.w*0.10, p.h*0.09, 8);
    ctx.fill();

    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    roundRect(wx+2, wy+2, p.w*0.10-4, 6, 6);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 문(입체)
  const dx = p.x+p.w*0.43;
  const dy = p.y+p.h*0.66;
  const dw = p.w*0.14;
  const dh = p.h*0.20;

  ctx.fillStyle="rgba(255,255,255,0.78)";
  roundRect(dx-3, dy-3, dw+6, dh+6, 12);
  ctx.fill();

  const doorG = ctx.createLinearGradient(dx, dy, dx+dw, dy+dh);
  doorG.addColorStop(0, "rgba(255,255,255,0.94)");
  doorG.addColorStop(1, "rgba(26,34,64,0.10)");
  ctx.fillStyle = doorG;
  roundRect(dx, dy, dw, dh, 10);
  ctx.fill();

  // 손잡이
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = "rgba(240,193,115,0.95)";
  ctx.beginPath();
  ctx.arc(dx+dw*0.78, dy+dh*0.55, 2.8, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 입구 타일
  ctx.globalAlpha = 0.62;
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  roundRect(p.x+p.w*0.38, p.y+p.h*0.86, p.w*0.24, 22, 10);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 간판(입체)
  const signY = p.y + 14;
  const sx = p.x+p.w*0.18;
  const sw = p.w*0.64;

  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  roundRect(sx-3, signY-3, sw+6, 36, 16);
  ctx.fill();

  const signG = ctx.createLinearGradient(sx, signY, sx+sw, signY+30);
  signG.addColorStop(0, shade(pal.sign, +18));
  signG.addColorStop(1, shade(pal.sign, -18));
  ctx.fillStyle = signG;
  roundRect(sx, signY, sw, 30, 14);
  ctx.fill();

  glossyHighlight(sx, signY, sw, 30, (0.12 + 0.10*pulse)*glow);

  ctx.fillStyle = "rgba(26,34,64,0.92)";
  ctx.font = "900 13px system-ui";
  ctx.fillText(p.label, sx+10, signY+20);

  if (p.status !== "open"){
    ctx.globalAlpha = 0.96;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    roundRect(sx+sw*0.62, signY+34, sw*0.34, 24, 12);
    ctx.fill();
    ctx.fillStyle = "rgba(26,34,64,0.86)";
    ctx.font = "900 11px system-ui";
    ctx.fillText("오픈준비중", sx+sw*0.64, signY+51);
    ctx.globalAlpha = 1;
  }

  // 활성 글로우
  ctx.globalAlpha = (0.05 + 0.10*pulse) * glow;
  ctx.fillStyle = isActive ? "rgba(111,183,230,0.92)" : "rgba(240,193,115,0.80)";
  roundRect(p.x+10, p.y+12, p.w-20, p.h-22, 22);
  ctx.fill();

  ctx.restore();
}

/** =========================
 *  지붕(텍스처 추가)
 * ========================= */
function drawRoofByType(p, pal, t){
  const x=p.x, y=p.y, w=p.w, h=p.h;
  ctx.fillStyle = pal.roof;
  ctx.strokeStyle = "rgba(26,34,64,0.12)";
  ctx.lineWidth = 2;

  if (p.type === "tower"){
    roundRect(x+w*0.36, y+6, w*0.28, 60, 18);
    ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.globalAlpha=0.25;
    ctx.fillStyle = roofPattern || "rgba(255,255,255,0.10)";
    roundRect(x+w*0.36, y+6, w*0.28, 60, 18);
    ctx.fill();
    ctx.restore();

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
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = roofPattern || "rgba(255,255,255,0.10)";
    ctx.beginPath();
    ctx.moveTo(x+w*0.22, y+60);
    ctx.quadraticCurveTo(x+w*0.50, y+8, x+w*0.78, y+60);
    ctx.closePath();
    ctx.fill();
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

    ctx.save();
    ctx.globalAlpha=0.14;
    ctx.strokeStyle="rgba(26,34,64,0.16)";
    for(let i=0;i<5;i++){
      ctx.beginPath();
      ctx.arc(x+w*0.50, y+68, w*0.10 + i*6, Math.PI, 0);
      ctx.stroke();
    }
    ctx.restore();

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

  if (p.type === "cafe" || p.type === "gym"){
    roundRect(x+w*0.22, y+22, w*0.56, 40, 18);
    ctx.fill(); ctx.stroke();

    ctx.save();
    ctx.globalAlpha=0.22;
    ctx.fillStyle = roofPattern || "rgba(255,255,255,0.10)";
    roundRect(x+w*0.22, y+22, w*0.56, 40, 18);
    ctx.fill();
    ctx.restore();

    if (p.type === "cafe"){
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
    } else {
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
    }
    return;
  }

  // arcade
  ctx.beginPath();
  ctx.moveTo(x+w*0.28, y+64);
  ctx.lineTo(x+w*0.50, y+18);
  ctx.lineTo(x+w*0.72, y+64);
  ctx.closePath();
  ctx.fill(); ctx.stroke();

  ctx.save();
  ctx.globalAlpha=0.22;
  ctx.fillStyle = roofPattern || "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.moveTo(x+w*0.28, y+64);
  ctx.lineTo(x+w*0.50, y+18);
  ctx.lineTo(x+w*0.72, y+64);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 하트
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
 *  집/상점(3D + 텍스처)
 * ========================= */
function drawHouse(o,t){
  const x=o.x, y=o.y, s=o.s;
  const wob = Math.sin(t*1.2 + x*0.01)*1.0;
  const w = 112*s, h = 84*s;
  const depth = 10*s;

  // AO
  groundAO(x-w*0.55, y+60*s, w*1.10, 24*s, 0.16);

  ctx.save();
  ctx.translate(0, wob);

  // 본체
  drawBox3D(x-w*0.5, y-6*s, w, h, depth, {
    front: "rgba(255,255,255,0.76)",
    top: "rgba(255,255,255,0.84)",
    side: "rgba(26,34,64,0.06)"
  }, "rgba(26,34,64,0.14)");
  glossyHighlight(x-w*0.5, y-6*s, w, h, 0.12);

  // 벽 텍스처
  ctx.save();
  ctx.globalAlpha = 0.20;
  ctx.fillStyle = brickPattern || "rgba(255,255,255,0.12)";
  roundRect(x-w*0.5, y-6*s, w, h, 18);
  ctx.fill();
  ctx.restore();

  // 지붕
  const roof = "rgba(226,196,251,0.80)";
  const roofTop = "rgba(244,215,255,0.70)";
  const roofSide = "rgba(160,120,210,0.18)";

  if (o.style==="roof"){
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(x-w*0.55, y-8*s);
    ctx.lineTo(x, y-50*s);
    ctx.lineTo(x+w*0.55, y-8*s);
    ctx.closePath();
    ctx.fill();

    ctx.save();
    ctx.globalAlpha=0.22;
    ctx.fillStyle = roofPattern || "rgba(255,255,255,0.10)";
    ctx.beginPath();
    ctx.moveTo(x-w*0.55, y-8*s);
    ctx.lineTo(x, y-50*s);
    ctx.lineTo(x+w*0.55, y-8*s);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = roofTop;
    ctx.beginPath();
    ctx.moveTo(x-w*0.55, y-8*s);
    ctx.lineTo(x-w*0.55+depth, y-8*s-depth);
    ctx.lineTo(x+depth, y-50*s-depth);
    ctx.lineTo(x, y-50*s);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = roofSide;
    ctx.beginPath();
    ctx.moveTo(x+w*0.55, y-8*s);
    ctx.lineTo(x+w*0.55+depth, y-8*s-depth);
    ctx.lineTo(x+depth, y-50*s-depth);
    ctx.lineTo(x, y-50*s);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillStyle = roof;
    roundRect(x-w*0.55, y-38*s, w*1.10, 32*s, 16*s);
    ctx.fill();
    ctx.save();
    ctx.globalAlpha=0.22;
    ctx.fillStyle = roofPattern || "rgba(255,255,255,0.10)";
    roundRect(x-w*0.55, y-38*s, w*1.10, 32*s, 16*s);
    ctx.fill();
    ctx.restore();
  }

  // 창문/문
  const win = (wx,wy,ww,wh)=>{
    ctx.fillStyle="rgba(255,255,255,0.80)";
    roundRect(wx-2, wy-2, ww+4, wh+4, 7*s);
    ctx.fill();
    const g = ctx.createLinearGradient(wx,wy,wx+ww,wy+wh);
    g.addColorStop(0,"rgba(200,245,255,0.76)");
    g.addColorStop(1,"rgba(26,34,64,0.10)");
    ctx.fillStyle=g;
    roundRect(wx,wy,ww,wh,6*s);
    ctx.fill();
    ctx.globalAlpha=0.16;
    ctx.fillStyle="rgba(255,255,255,0.95)";
    roundRect(wx+2, wy+2, ww-4, 5*s, 5*s);
    ctx.fill();
    ctx.globalAlpha=1;
  };

  win(x-34*s, y+16*s, 22*s, 18*s);
  win(x+12*s, y+16*s, 22*s, 18*s);

  const dx = x-7*s, dy = y+34*s, dw = 14*s, dh = 32*s;
  ctx.fillStyle="rgba(255,255,255,0.82)";
  roundRect(dx-2, dy-2, dw+4, dh+4, 8*s);
  ctx.fill();
  const dg = ctx.createLinearGradient(dx,dy,dx+dw,dy+dh);
  dg.addColorStop(0,"rgba(111,183,230,0.58)");
  dg.addColorStop(1,"rgba(26,34,64,0.10)");
  ctx.fillStyle=dg;
  roundRect(dx, dy, dw, dh, 7*s);
  ctx.fill();

  ctx.restore();
}

function drawShop(o,t){
  const x=o.x, y=o.y, s=o.s;
  const wob = Math.sin(t*1.1 + x*0.02)*1.0;
  const w = 132*s, h = 92*s;
  const depth = 11*s;

  groundAO(x-w*0.55, y+70*s, w*1.10, 24*s, 0.16);

  ctx.save();
  ctx.translate(0, wob);

  drawBox3D(x-w*0.5, y-6*s, w, h, depth, {
    front: "rgba(255,245,235,0.78)",
    top: "rgba(255,255,255,0.86)",
    side: "rgba(26,34,64,0.07)"
  }, "rgba(26,34,64,0.14)");
  glossyHighlight(x-w*0.5, y-6*s, w, h, 0.12);

  // 벽 텍스처
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = brickPattern || "rgba(255,255,255,0.10)";
  roundRect(x-w*0.5, y-6*s, w, h, 18);
  ctx.fill();
  ctx.restore();

  // 간판/어닝
  if (o.style==="awning"){
    const sway = Math.sin(t*2.0 + x*0.01)*2;

    ctx.globalAlpha=0.96;
    ctx.fillStyle="rgba(255,255,255,0.88)";
    roundRect(x-w*0.46, y-34*s, w*0.92, 22*s, 12*s);
    ctx.fill();
    glossyHighlight(x-w*0.46, y-34*s, w*0.92, 22*s, 0.14);

    ctx.globalAlpha=0.92;
    ctx.fillStyle="rgba(255,255,255,0.92)";
    roundRect(x-w*0.46, y-10*s + sway, w*0.92, 24*s, 12*s);
    ctx.fill();

    ctx.globalAlpha=0.28;
    ctx.fillStyle="rgba(244,185,216,0.95)";
    for(let i=0;i<7;i++){
      const sx = (x-w*0.46) + i*(w*0.92/7);
      ctx.fillRect(sx, y-10*s + sway, w*0.92/14, 24*s);
    }
    ctx.globalAlpha=1;
  } else {
    const signW = w*0.72, signH = 26*s;
    const sx = x-signW*0.5, sy = y-40*s;

    ctx.globalAlpha=0.96;
    ctx.fillStyle="rgba(255,255,255,0.82)";
    roundRect(sx-3, sy-3, signW+6, signH+6, 12*s);
    ctx.fill();

    const sg = ctx.createLinearGradient(sx, sy, sx+signW, sy+signH);
    sg.addColorStop(0, "rgba(111,183,230,0.82)");
    sg.addColorStop(1, "rgba(26,34,64,0.10)");
    ctx.fillStyle=sg;
    roundRect(sx, sy, signW, signH, 12*s);
    ctx.fill();
    glossyHighlight(sx, sy, signW, signH, 0.14);

    ctx.fillStyle="rgba(26,34,64,0.90)";
    ctx.font="900 12px system-ui";
    ctx.fillText("SHOP", sx+signW*0.40, sy+17*s);
    ctx.globalAlpha=1;
  }

  // 쇼윈도
  const wx = x-w*0.40, wy = y+18*s;
  const ww = w*0.80, wh = 36*s;

  ctx.fillStyle="rgba(255,255,255,0.84)";
  roundRect(wx-2, wy-2, ww+4, wh+4, 10*s);
  ctx.fill();

  const glass = ctx.createLinearGradient(wx, wy, wx+ww, wy+wh);
  glass.addColorStop(0,"rgba(200,245,255,0.76)");
  glass.addColorStop(1,"rgba(26,34,64,0.12)");
  ctx.fillStyle=glass;
  roundRect(wx, wy, ww, wh, 10*s);
  ctx.fill();

  ctx.globalAlpha = 0.16;
  ctx.fillStyle="rgba(255,255,255,0.95)";
  roundRect(wx+4, wy+4, ww*0.44, 8*s, 8*s);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();
}

/** =========================
 *  놀이공원 props
 * ========================= */
function drawFerris(o,t){
  const x=o.x, y=o.y, s=o.s;
  const rot = t*0.35;

  groundAO(x-150*s, y+120*s, 300*s, 40*s, 0.14);

  ctx.save();
  ctx.globalAlpha=0.92;
  ctx.strokeStyle="rgba(26,34,64,0.18)";
  ctx.lineWidth=4*s;
  ctx.beginPath();
  ctx.moveTo(x-70*s, y+120*s); ctx.lineTo(x, y-40*s);
  ctx.moveTo(x+70*s, y+120*s); ctx.lineTo(x, y-40*s);
  ctx.stroke();

  ctx.translate(x, y+20*s);
  ctx.rotate(rot);

  ctx.strokeStyle="rgba(255,255,255,0.78)";
  ctx.lineWidth=5*s;
  ctx.beginPath();
  ctx.arc(0,0,90*s,0,Math.PI*2);
  ctx.stroke();

  ctx.globalAlpha=0.55;
  ctx.strokeStyle="rgba(111,183,230,0.75)";
  for(let i=0;i<10;i++){
    const a=(i/10)*Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.lineTo(Math.cos(a)*90*s, Math.sin(a)*90*s);
    ctx.stroke();
  }

  ctx.globalAlpha=0.85;
  for(let i=0;i<12;i++){
    const a=(i/12)*Math.PI*2;
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

  groundAO(x-120*s, y+70*s, 240*s, 36*s, 0.14);

  ctx.save();
  ctx.globalAlpha=0.94;
  ctx.fillStyle="rgba(255,255,255,0.74)";
  ctx.strokeStyle="rgba(26,34,64,0.14)";
  ctx.lineWidth=2;
  roundRect(x-90*s, y+44*s, 180*s, 38*s, 18*s);
  ctx.fill(); ctx.stroke();

  ctx.fillStyle="rgba(244,185,216,0.80)";
  ctx.beginPath();
  ctx.moveTo(x-84*s, y+46*s + bob);
  ctx.lineTo(x, y-30*s + bob);
  ctx.lineTo(x+84*s, y+46*s + bob);
  ctx.closePath();
  ctx.fill();

  // 지붕 텍스처
  ctx.save();
  ctx.globalAlpha=0.18;
  ctx.fillStyle = roofPattern || "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.moveTo(x-84*s, y+46*s + bob);
  ctx.lineTo(x, y-30*s + bob);
  ctx.lineTo(x+84*s, y+46*s + bob);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // 기둥
  ctx.strokeStyle="rgba(26,34,64,0.16)";
  ctx.lineWidth=4*s;
  for(let i=0;i<6;i++){
    const px = x-72*s + i*(28*s);
    ctx.beginPath();
    ctx.moveTo(px, y+46*s);
    ctx.lineTo(px, y+12*s);
    ctx.stroke();
  }

  // 말
  ctx.globalAlpha=0.85;
  for(let i=0;i<7;i++){
    const px = x-62*s + i*(22*s);
    const py = y+30*s + Math.sin(t*2 + i)*3;
    ctx.fillStyle = (i%2===0) ? "rgba(111,183,230,0.78)" : "rgba(240,193,115,0.78)";
    ctx.beginPath();
    ctx.ellipse(px, py, 7*s, 5*s, 0, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.restore();
}

/** =========================
 *  소품(나무/가로등/벤치/꽃/울타리) - 디테일 강화
 * ========================= */
function drawTree(o,t){
  const x=o.x, y=o.y, s=o.s;
  const sway = Math.sin(t*1.4 + (o.v||0)) * (7.5*s);

  // 접지 AO
  ctx.save();
  ctx.globalAlpha=0.18;
  ctx.fillStyle="rgba(26,34,64,0.32)";
  ctx.beginPath();
  ctx.ellipse(x, y+22*s, 26*s, 10*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // 줄기(그라데이션)
  ctx.save();
  const tg = ctx.createLinearGradient(x-6*s, y-16*s, x+8*s, y+24*s);
  tg.addColorStop(0, "rgba(26,34,64,0.18)");
  tg.addColorStop(0.45, "rgba(240,193,115,0.40)");
  tg.addColorStop(1, "rgba(26,34,64,0.22)");
  ctx.strokeStyle = tg;
  ctx.lineWidth = 11*s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y-6*s);
  ctx.lineTo(x+sway*0.55, y+20*s);
  ctx.stroke();

  // 나뭇가지
  ctx.lineWidth = 5*s;
  ctx.globalAlpha = 0.80;
  ctx.beginPath();
  ctx.moveTo(x+sway*0.15, y);
  ctx.lineTo(x-10*s, y-10*s);
  ctx.moveTo(x+sway*0.25, y+2*s);
  ctx.lineTo(x+12*s, y-12*s);
  ctx.stroke();
  ctx.restore();

  // 잎(레이어 3개 + 텍스처)
  ctx.save();
  ctx.globalAlpha=0.92;
  const leafBase = "rgba(170, 240, 210, 0.72)";
  ctx.fillStyle = leafBase;

  // 뭉치
  const cx = x+sway;
  ctx.beginPath();
  ctx.ellipse(cx-22*s, y-16*s, 26*s, 22*s, 0, 0, Math.PI*2);
  ctx.ellipse(cx+6*s,  y-24*s, 30*s, 26*s, 0, 0, Math.PI*2);
  ctx.ellipse(cx+26*s, y-12*s, 26*s, 22*s, 0, 0, Math.PI*2);
  ctx.fill();

  // 텍스처
  ctx.globalAlpha=0.25;
  ctx.fillStyle = leafPattern || "rgba(255,255,255,0.10)";
  ctx.beginPath();
  ctx.ellipse(cx-22*s, y-16*s, 26*s, 22*s, 0, 0, Math.PI*2);
  ctx.ellipse(cx+6*s,  y-24*s, 30*s, 26*s, 0, 0, Math.PI*2);
  ctx.ellipse(cx+26*s, y-12*s, 26*s, 22*s, 0, 0, Math.PI*2);
  ctx.fill();

  // 하이라이트
  ctx.globalAlpha=0.14;
  ctx.fillStyle="rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.ellipse(cx-4*s, y-34*s, 16*s, 11*s, 0, 0, Math.PI*2);
  ctx.fill();

  // 아래쪽 음영
  ctx.globalAlpha=0.10;
  ctx.fillStyle="rgba(26,34,64,0.45)";
  ctx.beginPath();
  ctx.ellipse(cx+10*s, y-4*s, 28*s, 16*s, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function drawLamp(o,t){
  const x=o.x, y=o.y, s=o.s;
  const pulse = 0.5+0.5*Math.sin(t*3.0 + x*0.01);

  groundAO(x-20*s, y+20*s, 40*s, 20*s, 0.12);

  ctx.save();
  // 기둥
  const pg = ctx.createLinearGradient(x-4*s, y-40*s, x+6*s, y+26*s);
  pg.addColorStop(0,"rgba(255,255,255,0.30)");
  pg.addColorStop(1,"rgba(26,34,64,0.22)");
  ctx.strokeStyle=pg;
  ctx.lineWidth=7*s;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(x, y-38*s);
  ctx.lineTo(x, y+26*s);
  ctx.stroke();

  // 등 상자
  ctx.globalAlpha=0.95;
  ctx.fillStyle="rgba(255,255,255,0.90)";
  ctx.strokeStyle="rgba(26,34,64,0.14)";
  ctx.lineWidth=2;
  roundRect(x-13*s, y-50*s, 26*s, 18*s, 9*s);
  ctx.fill(); ctx.stroke();
  glossyHighlight(x-13*s, y-50*s, 26*s, 18*s, 0.16);

  // 빛
  ctx.globalAlpha = 0.10 + 0.22*pulse;
  ctx.fillStyle="rgba(240,193,115,0.92)";
  ctx.beginPath();
  ctx.ellipse(x, y-18*s, 30*s, 48*s, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function drawBench(o,t){
  const x=o.x, y=o.y, s=o.s;

  groundAO(x-30*s, y+12*s, 60*s, 18*s, 0.12);

  ctx.save();
  ctx.globalAlpha=0.95;
  ctx.fillStyle="rgba(255,255,255,0.84)";
  ctx.strokeStyle="rgba(26,34,64,0.14)";
  ctx.lineWidth=2;
  roundRect(x-36*s, y-2*s, 72*s, 18*s, 10*s);
  ctx.fill(); ctx.stroke();
  glossyHighlight(x-36*s, y-2*s, 72*s, 18*s, 0.12);

  ctx.globalAlpha=0.22;
  ctx.fillStyle="rgba(26,34,64,0.16)";
  roundRect(x-30*s, y+6*s, 60*s, 4*s, 4*s);
  ctx.fill();

  // 다리
  ctx.globalAlpha=0.25;
  ctx.fillStyle="rgba(26,34,64,0.18)";
  roundRect(x-26*s, y+14*s, 12*s, 10*s, 4*s); ctx.fill();
  roundRect(x+14*s, y+14*s, 12*s, 10*s, 4*s); ctx.fill();

  ctx.restore();
}

function drawFlower(o,t){
  const x=o.x, y=o.y, s=o.s;
  const wig = Math.sin(t*2.2 + x*0.02)*2;

  ctx.save();
  ctx.globalAlpha=0.10;
  ctx.fillStyle="rgba(26,34,64,0.20)";
  ctx.beginPath();
  ctx.ellipse(x, y+10*s, 11*s, 4*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle="rgba(26,34,64,0.12)";
  ctx.lineWidth=3*s;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(x, y+8*s);
  ctx.lineTo(x+wig, y-12*s);
  ctx.stroke();

  ctx.globalAlpha=0.92;
  ctx.fillStyle="rgba(244,185,216,0.88)";
  for(let i=0;i<6;i++){
    const a=(i/6)*Math.PI*2;
    ctx.beginPath();
    ctx.ellipse(x+wig+Math.cos(a)*6.5*s, y-16*s+Math.sin(a)*6.5*s, 5.2*s, 6.2*s, 0, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.fillStyle="rgba(255,255,255,0.90)";
  ctx.beginPath();
  ctx.arc(x+wig, y-16*s, 4.2*s, 0, Math.PI*2);
  ctx.fill();

  ctx.globalAlpha=0.14;
  ctx.fillStyle="rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(x+wig-2*s, y-18*s, 2*s, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function drawFence(o,t){
  const x=o.x, y=o.y, s=o.s;
  const a=o.a || 0;

  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(a);

  // AO
  ctx.globalAlpha=0.10;
  ctx.fillStyle="rgba(26,34,64,0.20)";
  ctx.beginPath();
  ctx.ellipse(0, 12*s, 22*s, 6*s, 0, 0, Math.PI*2);
  ctx.fill();

  // 본체(3D)
  ctx.globalAlpha=0.62;
  ctx.fillStyle="rgba(255,255,255,0.78)";
  ctx.strokeStyle="rgba(26,34,64,0.12)";
  ctx.lineWidth=2;

  roundRect(-28*s, -8*s, 56*s, 14*s, 7*s);
  ctx.fill(); ctx.stroke();

  ctx.globalAlpha=0.18;
  ctx.fillStyle="rgba(255,255,255,0.92)";
  roundRect(-26*s, -7*s, 40*s, 5*s, 6*s);
  ctx.fill();

  ctx.restore();
}

/** =========================
 *  캐릭터(멜빵바지)
 * ========================= */
function drawMinimi(x,y,t){
  const bob = Math.sin(player.bobT) * (player.moving ? 1.0 : 1.4);
  const dir = player.dir;
  const swing = player.moving ? Math.sin(player.animT*10) : 0;
  const arm = 4*swing;
  const leg = 5*swing;

  // 그림자
  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle="rgba(26,34,64,0.32)";
  ctx.beginPath();
  ctx.ellipse(x, y+24, 18, 7, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(x, y + bob);

  if (dir==="left") ctx.scale(-1, 1);

  // 머리(입체)
  const headG = ctx.createRadialGradient(-6,-24,6, 0,-18,22);
  headG.addColorStop(0, "rgba(255,255,255,0.98)");
  headG.addColorStop(0.70, "rgba(255,255,255,0.92)");
  headG.addColorStop(1, "rgba(26,34,64,0.06)");
  ctx.fillStyle = headG;
  ctx.beginPath(); ctx.arc(0,-18,16,0,Math.PI*2); ctx.fill();

  ctx.globalAlpha = 0.20;
  ctx.strokeStyle="rgba(26,34,64,0.35)";
  ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(0,-18,16,0,Math.PI*2); ctx.stroke();
  ctx.globalAlpha=1;

  // 머리장식
  ctx.save();
  ctx.translate(-8,-28);
  ctx.globalAlpha=0.80;
  ctx.fillStyle="rgba(244,185,216,0.88)";
  ctx.beginPath();
  ctx.ellipse(-4,0,6,4,0,0,Math.PI*2);
  ctx.ellipse(4,0,6,4,0,0,Math.PI*2);
  ctx.fill();
  ctx.globalAlpha=0.22;
  ctx.fillStyle="rgba(255,255,255,0.95)";
  ctx.beginPath(); ctx.ellipse(-2,-1,3,2,0,0,Math.PI*2); ctx.fill();
  ctx.restore();

  // 셔츠
  const shirtG = ctx.createLinearGradient(-12,-2, 12, 24);
  shirtG.addColorStop(0,"rgba(255,255,255,0.96)");
  shirtG.addColorStop(1,"rgba(26,34,64,0.06)");
  ctx.fillStyle = shirtG;
  roundRectAt(-12,-2,24,26,10); ctx.fill();

  // 멜빵바지(데님)
  const denim = ctx.createLinearGradient(-12,4, 12, 24);
  denim.addColorStop(0,"rgba(111,183,230,0.98)");
  denim.addColorStop(0.55,"rgba(111,183,230,0.78)");
  denim.addColorStop(1,"rgba(26,34,64,0.12)");
  ctx.fillStyle = denim;
  roundRectAt(-12,4,24,20,10); ctx.fill();

  // 멜빵 끈
  ctx.strokeStyle="rgba(26,34,64,0.22)";
  ctx.lineWidth=3; ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(-8, 6); ctx.lineTo(-3, 14);
  ctx.moveTo(8, 6);  ctx.lineTo(3, 14);
  ctx.stroke();

  // 단추
  ctx.fillStyle="rgba(255,255,255,0.88)";
  ctx.beginPath();
  ctx.arc(-8,6,2.1,0,Math.PI*2);
  ctx.arc(8,6,2.1,0,Math.PI*2);
  ctx.fill();

  // 주머니
  ctx.globalAlpha=0.30;
  ctx.strokeStyle="rgba(26,34,64,0.40)";
  ctx.lineWidth=2;
  roundRectAt(-7, 14, 14, 10, 5); ctx.stroke();
  ctx.globalAlpha=1;

  // 얼굴
  if (dir==="down"){
    ctx.fillStyle="rgba(26,34,64,0.58)";
    ctx.beginPath();
    ctx.arc(-5,-20,2.2,0,Math.PI*2);
    ctx.arc(5,-20,2.2,0,Math.PI*2);
    ctx.fill();

    ctx.globalAlpha=0.22;
    ctx.fillStyle="rgba(255,140,170,0.95)";
    ctx.beginPath();
    ctx.arc(-9,-16,3,0,Math.PI*2);
    ctx.arc(9,-16,3,0,Math.PI*2);
    ctx.fill();
    ctx.globalAlpha=1;
  } else if (dir==="up"){
    ctx.globalAlpha=0.22;
    ctx.fillStyle="rgba(26,34,64,0.60)";
    roundRectAt(-8,6,16,6,4); ctx.fill();
    ctx.globalAlpha=1;
  } else {
    ctx.fillStyle="rgba(26,34,64,0.58)";
    ctx.beginPath(); ctx.arc(4,-20,2.2,0,Math.PI*2); ctx.fill();

    ctx.globalAlpha=0.22;
    ctx.fillStyle="rgba(255,140,170,0.95)";
    ctx.beginPath(); ctx.arc(10,-16,3,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha=1;
  }

  // 팔
  ctx.strokeStyle="rgba(255,255,255,0.78)";
  ctx.lineWidth=6; ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(-12,6); ctx.lineTo(-18,9+arm);
  ctx.moveTo(12,6);  ctx.lineTo(18,9-arm);
  ctx.stroke();

  // 손
  ctx.strokeStyle="rgba(255,255,255,0.92)";
  ctx.lineWidth=4;
  ctx.beginPath();
  ctx.moveTo(-18,9+arm); ctx.lineTo(-21,11+arm);
  ctx.moveTo(18,9-arm);  ctx.lineTo(21,11-arm);
  ctx.stroke();

  // 다리
  ctx.strokeStyle="rgba(111,183,230,0.95)";
  ctx.lineWidth=6; ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(-6,18); ctx.lineTo(-8,26+leg);
  ctx.moveTo(6,18);  ctx.lineTo(8,26-leg);
  ctx.stroke();

  // 신발
  ctx.globalAlpha=0.90;
  ctx.fillStyle="rgba(26,34,64,0.65)";
  ctx.beginPath();
  ctx.ellipse(-9, 28+leg, 5, 3, 0, 0, Math.PI*2);
  ctx.ellipse(9,  28-leg, 5, 3, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha=1;

  ctx.restore();
}

/** =========================
 *  커서/비네팅/타이틀
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

function vignette(strength=0.07){
  ctx.save();
  const g = ctx.createRadialGradient(
    VIEW.w*0.5, VIEW.h*0.55, Math.min(VIEW.w,VIEW.h)*0.35,
    VIEW.w*0.5, VIEW.h*0.55, Math.min(VIEW.w,VIEW.h)*0.98
  );
  g.addColorStop(0,"rgba(255,255,255,0)");
  g.addColorStop(1,`rgba(26,34,64,${strength})`);
  ctx.fillStyle=g;
  ctx.fillRect(0,0,VIEW.w,VIEW.h);
  ctx.restore();
}

function drawWorldTitle(){
  const text = "FA미니월드";
  const padX = 18;

  ctx.save();
  ctx.globalAlpha = 0.94;
  ctx.font = "900 20px system-ui";
  const tw = ctx.measureText(text).width;
  const bw = tw + padX*2;
  const bh = 40;

  const x = VIEW.w*0.5 - bw*0.5;
  const y = 14;

  ctx.fillStyle = "rgba(255,255,255,0.76)";
  ctx.strokeStyle = "rgba(26,34,64,0.12)";
  ctx.lineWidth = 2;
  roundRect(x, y, bw, bh, 18);
  ctx.fill(); ctx.stroke();
  glossyHighlight(x, y, bw, bh, 0.12);

  ctx.fillStyle = "rgba(26,34,64,0.90)";
  ctx.fillText(text, x + padX, y + 27);

  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "rgba(111,183,230,0.85)";
  ctx.beginPath();
  ctx.arc(x + bw - 18, y + 20, 5, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
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
