const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");

const toast = document.getElementById("toast");
const coordEl = document.getElementById("coord");
const fpsEl = document.getElementById("fps");
const fadeEl = document.getElementById("fade");

let W=0, H=0, DPR=1;

function resize(){
  DPR = Math.max(1, window.devicePixelRatio || 1);
  const r = canvas.getBoundingClientRect();
  W = r.width; H = r.height;
  canvas.width = Math.floor(W*DPR);
  canvas.height = Math.floor(H*DPR);
  ctx.setTransform(DPR,0,0,DPR,0,0);
  layout();
}
window.addEventListener("resize", resize);

/** =========================
 *  포탈 건물 6개
 * ========================= */
const portals = [
  { key:"avoid",   label:"미니게임 피하기",   status:"open", url:"https://faglobalxgp2024-design.github.io/index.html/", type:"arcade", x:0,y:0,w:0,h:0 },
  { key:"archery", label:"미니게임 양궁",     status:"open", url:"https://ttjdwls777-eng.github.io/XGP-MINI-GAME2/",      type:"tower",  x:0,y:0,w:0,h:0 },
  { key:"janggi",  label:"미니게임 장기",     status:"open", url:"https://faglobalxgp2024-design.github.io/MINIGAME/",     type:"dojo",   x:0,y:0,w:0,h:0 },

  { key:"jump",    label:"미니게임 점프하기", status:"soon", url:"", type:"gym",    x:0,y:0,w:0,h:0 },
  { key:"snow",    label:"미니게임 눈굴리기", status:"soon", url:"", type:"igloo",  x:0,y:0,w:0,h:0 },
  { key:"omok",    label:"미니게임 오목",     status:"soon", url:"", type:"cafe",   x:0,y:0,w:0,h:0 },
];

const player = {
  x: 160, y: 170,
  r: 16,
  speed: 3.3,
  moving: false,
  animT: 0,
  bobT: 0,
  dir: "down", // up/down/left/right
};

let activePortal = null;
let entering = false;

/** ====== 입력 ====== */
const keys = new Set();
let dragging = false;
let dragOffset = {x:0,y:0};

let pointer = { x:0, y:0, active:false, lastMoveAt:0 };

window.addEventListener("keydown",(e)=>{
  keys.add(e.key.toLowerCase());
  if ((e.key === "Enter" || e.key.toLowerCase() === "e") && activePortal) {
    tryEnter(activePortal);
  }
});
window.addEventListener("keyup",(e)=> keys.delete(e.key.toLowerCase()));

canvas.addEventListener("pointerenter",()=> pointer.active=true);
canvas.addEventListener("pointerleave",()=> pointer.active=false);

canvas.addEventListener("pointerdown",(e)=>{
  const p = getPointer(e);
  const dx = p.x - player.x, dy = p.y - player.y;
  if (dx*dx + dy*dy <= (player.r+14)*(player.r+14)){
    dragging = true;
    dragOffset.x = player.x - p.x;
    dragOffset.y = player.y - p.y;
    canvas.setPointerCapture(e.pointerId);
  }
});

canvas.addEventListener("pointermove",(e)=>{
  const p = getPointer(e);
  pointer.x = p.x; pointer.y = p.y;
  pointer.lastMoveAt = performance.now();

  if (!dragging) return;
  const prev = {x: player.x, y: player.y};
  player.x = p.x + dragOffset.x;
  player.y = p.y + dragOffset.y;
  clampPlayer();
  updateDirFromDelta(player.x - prev.x, player.y - prev.y);
  player.moving = true;
  player.animT += 1/60;
});

canvas.addEventListener("pointerup",()=>{
  dragging = false;
  if (activePortal && isTouchDevice()) tryEnter(activePortal);
});

function getPointer(e){
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
function isTouchDevice(){ return (navigator.maxTouchPoints||0) > 0; }

function clampPlayer(){
  player.x = Math.max(player.r, Math.min(W-player.r, player.x));
  player.y = Math.max(player.r, Math.min(H-player.r, player.y));
}

/** ====== 레이아웃 ====== */
function layout(){
  const baseW = 980;
  const s = Math.min(1.35, Math.max(0.78, W/baseW));
  const cx = W*0.5;

  const row1 = H*0.24;
  const row2 = H*0.52;

  const x1 = cx - 380*s;
  const x2 = cx - 40*s;
  const x3 = cx + 300*s;

  const bw = 250*s;
  const bh = 170*s;

  portals[0].x = x1; portals[0].y = row2; portals[0].w = bw; portals[0].h = bh;
  portals[1].x = x2; portals[1].y = row1; portals[1].w = bw; portals[1].h = bh;
  portals[2].x = x3; portals[2].y = row2; portals[2].w = bw; portals[2].h = bh;

  portals[3].x = x1; portals[3].y = row1; portals[3].w = bw; portals[3].h = bh;
  portals[4].x = x2; portals[4].y = row2 + 190*s; portals[4].w = bw; portals[4].h = bh;
  portals[5].x = x3; portals[5].y = row1; portals[5].w = bw; portals[5].h = bh;

  for (const p of portals){
    p.x = Math.max(22, Math.min(W - p.w - 22, p.x));
    p.y = Math.max(40, Math.min(H - p.h - 40, p.y));
  }

  player.x = Math.max(player.r, Math.min(W-player.r, player.x));
  player.y = Math.max(player.r, Math.min(H-player.r, player.y));
}

/** ====== 충돌 ====== */
function circleRectHit(cx,cy,r,rect){
  const closestX = Math.max(rect.x, Math.min(cx, rect.x+rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y+rect.h));
  const dx = cx-closestX, dy = cy-closestY;
  return (dx*dx + dy*dy) <= r*r;
}

/** ====== 입장 ====== */
function tryEnter(p){
  if (entering) return;

  if (p.status !== "open"){
    toast.hidden = false;
    toast.innerHTML = `<b>${p.label}</b> · 현재 <b>[오픈준비중]</b> 입니다 ✨`;
    setTimeout(()=> { if (activePortal !== p) toast.hidden = true; }, 1200);
    return;
  }

  entering = true;
  fadeEl.classList.add("on");
  setTimeout(()=> window.location.href = p.url, 380);
}

/** ====== 방향 ====== */
function updateDirFromAxes(ax, ay){
  if (Math.abs(ay) >= Math.abs(ax)){
    player.dir = ay < 0 ? "up" : "down";
  } else {
    player.dir = ax < 0 ? "left" : "right";
  }
}
function updateDirFromDelta(dx, dy){
  if (dx === 0 && dy === 0) return;
  updateDirFromAxes(dx, dy);
}

/** =========================
 *  파스텔 애니 요소
 * ========================= */
const clouds = Array.from({length:8}, ()=>({
  x: Math.random()*1400,
  y: 30 + Math.random()*160,
  s: 0.6 + Math.random()*1.2,
  v: 10 + Math.random()*16
}));

const sparkles = Array.from({length:55}, ()=>({
  x: Math.random(),
  y: Math.random(),
  t: Math.random()*10,
  r: 1 + Math.random()*2
}));

const birds = Array.from({length:5}, ()=>({
  x: 0, y: 0, p: Math.random()*10, v: 22 + Math.random()*16
}));
for (const b of birds){
  b.x = Math.random()*W;
  b.y = 60 + Math.random()*140;
}

/** =========================
 *  나무/가로등/벤치 오브젝트(깊이 정렬 대상)
 *  - depth sorting에 함께 포함됨
 * ========================= */
const props = [];
function seedProps(){
  props.length = 0;
  // 나무
  for (let i=0;i<7;i++){
    props.push({ kind:"tree", x: 80 + Math.random()*(W-160), y: H*0.45 + Math.random()*(H*0.42), s: 0.85 + Math.random()*0.6 });
  }
  // 가로등
  for (let i=0;i<4;i++){
    props.push({ kind:"lamp", x: 120 + Math.random()*(W-240), y: H*0.50 + Math.random()*(H*0.40), s: 0.9 + Math.random()*0.4 });
  }
  // 벤치
  for (let i=0;i<3;i++){
    props.push({ kind:"bench", x: 140 + Math.random()*(W-280), y: H*0.56 + Math.random()*(H*0.32), s: 0.95 + Math.random()*0.3 });
  }
}
seedProps();
window.addEventListener("resize", seedProps);

/** =========================
 *  깊이 정렬: “발 위치(footY)” 기준으로 오브젝트를 소팅 후 그리기
 *  - 플레이어가 건물/나무 뒤로 자연스럽게 들어감
 * ========================= */
function getFootY(entity){
  // 건물은 아래쪽이 발 위치처럼 보이게
  if (entity.kind === "building") return entity.y + entity.h;
  if (entity.kind === "tree") return entity.y + 54*entity.s;
  if (entity.kind === "lamp") return entity.y + 62*entity.s;
  if (entity.kind === "bench") return entity.y + 30*entity.s;
  if (entity.kind === "player") return entity.y + 22;
  return entity.y;
}

/** =========================
 *  풀숲 레이어(전경 덮개)
 * ========================= */
function bushLineY(){ return H*0.64; }

function drawBushFront(t){
  const y = bushLineY();
  ctx.save();
  ctx.globalAlpha = 0.85;
  for(let i=0;i<14;i++){
    const x = (i/13)*W + Math.sin(t*1.6+i*0.9)*12;
    bushBlob(x, y+44, 160, 66, "rgba(126, 230, 189, 0.24)");
  }
  for(let i=0;i<16;i++){
    const x = (i/15)*W;
    const sway = Math.sin(t*1.8+i)*12;
    const h = H*(0.10 + 0.05*Math.sin(i*0.8));
    ctx.strokeStyle="rgba(110, 220, 170, 0.22)";
    ctx.lineWidth=10; ctx.lineCap="round";
    ctx.beginPath();
    ctx.moveTo(x, y+95);
    ctx.quadraticCurveTo(x+sway, y-h, x+sway*0.2, y+72);
    ctx.stroke();
  }
  const g = ctx.createLinearGradient(0,y,0,H);
  g.addColorStop(0,"rgba(255,255,255,0)");
  g.addColorStop(1,"rgba(26,34,64,0.10)");
  ctx.fillStyle=g;
  ctx.fillRect(0,y,W,H-y);
  ctx.restore();
}

function drawBushBack(t){
  const y = bushLineY();
  ctx.save();
  ctx.globalAlpha = 0.55;
  for(let i=0;i<11;i++){
    const x = (i/10)*W + Math.sin(t*1.2+i)*10;
    bushBlob(x, y+16, 140, 56, "rgba(164, 246, 209, 0.22)");
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
 *  건물 스타일
 * ========================= */
function buildingPalette(type){
  const pal = {
    arcade: { main:"#ffd1e8", roof:"#ffb6d9", trim:"#ffffff", sign:"#7ec8ff" },
    tower:  { main:"#cdefff", roof:"#aee2ff", trim:"#ffffff", sign:"#ffd38c" },
    dojo:   { main:"#d9ffe9", roof:"#b8f3d1", trim:"#ffffff", sign:"#ffb6c1" },
    gym:    { main:"#fff1c8", roof:"#ffe2a2", trim:"#ffffff", sign:"#7ec8ff" },
    igloo:  { main:"#e8f6ff", roof:"#cfeaff", trim:"#ffffff", sign:"#b8f3d1" },
    cafe:   { main:"#f2dcff", roof:"#e6c5ff", trim:"#ffffff", sign:"#ffd38c" },
  };
  return pal[type] || pal.arcade;
}

/** =========================
 *  Update/Draw
 * ========================= */
let lastT = performance.now();
let acc=0, framesCount=0, fps=0;

function update(dt,t){
  // 키보드 이동
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
      player.x += (ax/len) * player.speed;
      player.y += (ay/len) * player.speed;
      clampPlayer();
      player.animT += dt;
    } else {
      player.animT *= 0.90;
    }
  }
  player.bobT += dt*6.0;

  // 구름
  for (const c of clouds){
    c.x += c.v*dt;
    if (c.x - 240*c.s > W + 260){
      c.x = -260*c.s;
      c.y = 30 + Math.random()*220;
      c.s = 0.6 + Math.random()*1.2;
      c.v = 10 + Math.random()*16;
    }
  }

  // 새
  for (const b of birds){
    b.x += b.v*dt;
    b.p += dt*4.2;
    if (b.x > W + 120){
      b.x = -140;
      b.y = 60 + Math.random()*160;
      b.v = 22 + Math.random()*16;
      b.p = Math.random()*10;
    }
  }

  // 포탈 충돌(건물 영역)
  activePortal = null;
  for (const p of portals){
    if (circleRectHit(player.x, player.y, player.r, p)){ activePortal = p; break; }
  }

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

  coordEl.textContent = `x: ${Math.round(player.x)} · y: ${Math.round(player.y)}`;

  // fps
  acc += dt; framesCount++;
  if (acc >= 0.45){
    fps = Math.round(framesCount/acc);
    fpsEl.textContent = `fps: ${fps}`;
    acc=0; framesCount=0;
  }
}

function draw(t){
  ctx.clearRect(0,0,W,H);

  drawPastelSky(t);
  drawSparkles(t);
  drawClouds();
  drawHills(t);
  drawRoadAndTiles(t);

  // 풀숲 뒤(중경)
  drawBushBack(t);

  // ===== depth sorting 대상 목록 구성 =====
  const items = [];

  // 건물들
  for (const p of portals){
    items.push({
      kind:"building",
      ref:p,
      x:p.x, y:p.y, w:p.w, h:p.h,
      footY: getFootY({kind:"building", y:p.y, h:p.h})
    });
  }

  // 소품들
  for (const pr of props){
    items.push({
      kind: pr.kind,
      ref: pr,
      x: pr.x, y: pr.y, s: pr.s,
      footY: getFootY(pr)
    });
  }

  // 플레이어
  items.push({
    kind:"player",
    ref: player,
    x: player.x, y: player.y,
    footY: getFootY({kind:"player", y: player.y})
  });

  // footY 기준 정렬 (작은 y 먼저 그려지고, 큰 y가 위에 올라옴)
  items.sort((a,b)=> a.footY - b.footY);

  // ===== 정렬된 순서대로 렌더 =====
  for (const it of items){
    if (it.kind === "building") drawBuildingPortal(it.ref, t);
    else if (it.kind === "tree") drawTree(it.ref, t);
    else if (it.kind === "lamp") drawLamp(it.ref, t);
    else if (it.kind === "bench") drawBench(it.ref, t);
    else if (it.kind === "player") drawMinimi(player.x, player.y, t);
  }

  // 전경 풀숲(덮개) — 아래쪽으로 내려오면 자연스럽게 가려짐
  drawBushFront(t);

  // 커서 미니미
  if (!isTouchDevice() && pointer.active){
    const idle = (performance.now() - pointer.lastMoveAt) > 1400;
    if (!idle) drawCursor(pointer.x, pointer.y, t);
  }

  vignette();
}

/** ===== 배경 ===== */
function drawPastelSky(t){
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0, "#eaf9ff");
  g.addColorStop(0.55, "#f6fff1");
  g.addColorStop(1, "#fff5fb");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  const blobs = [
    {x:W*0.25,y:H*0.18,r:220,c:"rgba(255,209,232,0.45)"},
    {x:W*0.78,y:H*0.16,r:240,c:"rgba(205,239,255,0.45)"},
    {x:W*0.55,y:H*0.28,r:260,c:"rgba(184,243,209,0.30)"},
  ];
  for (const b of blobs){
    const rg = ctx.createRadialGradient(b.x,b.y,10,b.x,b.y,b.r);
    rg.addColorStop(0,b.c);
    rg.addColorStop(1,"rgba(255,255,255,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0,0,W,H);
  }

  // 새
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "rgba(26,34,64,0.55)";
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

function drawSparkles(t){
  ctx.save();
  for (const s of sparkles){
    const x = s.x*W;
    const y = s.y*H*0.55;
    const a = 0.06 + 0.20*(0.5+0.5*Math.sin(t*1.6+s.t));
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.beginPath();
    ctx.arc(x,y,s.r,0,Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

function drawClouds(){
  for (const c of clouds){
    cloud(c.x, c.y, 130*c.s, 48*c.s, 0.18);
  }
}

function cloud(x,y,w,h,alpha){
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.ellipse(x, y, w*0.38, h*0.55, 0, 0, Math.PI*2);
  ctx.ellipse(x + w*0.22, y - h*0.15, w*0.32, h*0.52, 0, 0, Math.PI*2);
  ctx.ellipse(x + w*0.45, y, w*0.36, h*0.52, 0, 0, Math.PI*2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawHills(t){
  ctx.save();
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "rgba(184,243,209,0.28)";
  ctx.beginPath();
  ctx.moveTo(0, H*0.52);
  for (let i=0;i<=10;i++){
    const x=(i/10)*W;
    const y=H*(0.48 + 0.03*Math.sin(t*0.25+i));
    ctx.quadraticCurveTo(x,y,x+W/10,H*0.52);
  }
  ctx.lineTo(W,H);
  ctx.lineTo(0,H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawRoadAndTiles(t){
  const y0 = H*0.52;
  ctx.save();

  ctx.fillStyle = "rgba(184,243,209,0.14)";
  ctx.fillRect(0, y0, W, H-y0);

  const roadY = H*0.60;
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "rgba(255,211,140,0.20)";
  roundRect(40, roadY, W-80, H*0.26, 26);
  ctx.fill();

  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = "rgba(26,34,64,0.14)";
  for(let i=0;i<10;i++){
    const y = roadY + i*(H*0.26)/10;
    ctx.beginPath(); ctx.moveTo(60,y); ctx.lineTo(W-60,y); ctx.stroke();
  }
  for(let i=0;i<16;i++){
    const x = 60 + i*(W-120)/16;
    ctx.beginPath(); ctx.moveTo(x,roadY); ctx.lineTo(x,roadY+H*0.26); ctx.stroke();
  }

  ctx.restore();
}

/** ===== 건물 ===== */
function drawBuildingPortal(p, t){
  const pal = buildingPalette(p.type);
  const isActive = (activePortal === p);
  const pulse = 0.65 + 0.35*Math.sin(t*3.0 + hash01(p.key)*6);
  const glow = isActive ? 1.0 : 0.6;

  const depthScale = 0.94 + 0.10*(p.y / H);
  const w = p.w * depthScale;
  const h = p.h * depthScale;
  const x = p.x + (p.w - w)/2;
  const y = p.y + (p.h - h)/2;

  // 그림자
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "rgba(26,34,64,0.22)";
  roundRect(x+8, y+h-18, w-16, 18, 12);
  ctx.fill();
  ctx.restore();

  // 본체
  ctx.save();
  ctx.fillStyle = pal.main;
  ctx.strokeStyle = "rgba(26,34,64,0.14)";
  ctx.lineWidth = 2;
  roundRect(x+18, y+38, w-36, h-52, 18);
  ctx.fill(); ctx.stroke();

  // 지붕
  drawRoofByType(p.type, x, y, w, h, pal, t);

  // 문
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  roundRect(x+w*0.43, y+h*0.62, w*0.14, h*0.20, 10);
  ctx.fill();
  ctx.strokeStyle = "rgba(26,34,64,0.12)";
  ctx.stroke();

  // 창문
  for (let i=0;i<4;i++){
    const wx = x+w*0.24 + i*(w*0.13);
    const wy = y+h*0.50;
    const on = Math.sin(t*2.2 + i + hash01(p.key)*10) > 0.25;
    ctx.fillStyle = on ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.60)";
    roundRect(wx, wy, w*0.10, h*0.09, 8);
    ctx.fill();
  }

  // 간판
  const signY = y+16;
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = pal.sign;
  roundRect(x+w*0.18, signY, w*0.64, 28, 14);
  ctx.fill();

  ctx.fillStyle = "rgba(26,34,64,0.88)";
  ctx.font = "900 13px system-ui";
  ctx.fillText(p.label, x+w*0.20, signY+19);

  // 준비중 뱃지
  if (p.status !== "open"){
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "rgba(255,255,255,0.90)";
    roundRect(x+w*0.58, signY+34, w*0.32, 24, 12);
    ctx.fill();
    ctx.fillStyle = "rgba(26,34,64,0.85)";
    ctx.font = "900 11px system-ui";
    ctx.fillText("오픈준비중", x+w*0.60, signY+51);
  }

  // 활성 glow
  ctx.globalAlpha = 0.10*glow + 0.08*glow*pulse;
  ctx.fillStyle = isActive ? "rgba(126,200,255,0.9)" : "rgba(255,211,140,0.8)";
  roundRect(x+8, y+8, w-16, h-16, 22);
  ctx.fill();

  // 활성 반짝
  if (isActive){
    ctx.globalAlpha = 0.65;
    for(let i=0;i<10;i++){
      const a = t*2.6 + i;
      const px = x + w*0.20 + (Math.sin(a*1.1+i)*0.5+0.5)*(w*0.60);
      const py = y + h*0.36 + (Math.cos(a*1.3+i)*0.5+0.5)*(h*0.45);
      const rr = 1.6 + 1.8*(0.5+0.5*Math.sin(a*2.0));
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath(); ctx.arc(px,py,rr,0,Math.PI*2); ctx.fill();
    }
  }

  ctx.restore();
}

function drawRoofByType(type, x,y,w,h,pal,t){
  ctx.fillStyle = pal.roof;
  ctx.strokeStyle = "rgba(26,34,64,0.12)";
  ctx.lineWidth = 2;

  if (type === "tower"){
    roundRect(x+w*0.34, y+6, w*0.32, 52, 18);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = pal.trim;
    roundRect(x+w*0.40, y+0, w*0.20, 16, 10);
    ctx.fill();
    const sway = Math.sin(t*2.2)*6;
    ctx.strokeStyle="rgba(26,34,64,0.18)";
    ctx.beginPath();
    ctx.moveTo(x+w*0.50, y-6);
    ctx.lineTo(x+w*0.50, y+10);
    ctx.stroke();
    ctx.fillStyle="rgba(255,211,140,0.9)";
    ctx.beginPath();
    ctx.moveTo(x+w*0.50, y-6);
    ctx.lineTo(x+w*0.50 + 18 + sway, y-2);
    ctx.lineTo(x+w*0.50, y+2);
    ctx.closePath();
    ctx.fill();
    return;
  }

  if (type === "dojo"){
    ctx.beginPath();
    ctx.moveTo(x+w*0.22, y+56);
    ctx.quadraticCurveTo(x+w*0.50, y+6, x+w*0.78, y+56);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle="rgba(26,34,64,0.14)";
    for(let i=0;i<6;i++){
      const yy = y+18+i*6;
      ctx.beginPath();
      ctx.moveTo(x+w*0.30, yy);
      ctx.lineTo(x+w*0.70, yy);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (type === "igloo"){
    ctx.beginPath();
    ctx.arc(x+w*0.50, y+60, w*0.22, Math.PI, 0);
    ctx.lineTo(x+w*0.72, y+60);
    ctx.lineTo(x+w*0.28, y+60);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.globalAlpha=0.25;
    ctx.strokeStyle="rgba(26,34,64,0.12)";
    for(let i=0;i<5;i++){
      const yy = y+28+i*8;
      ctx.beginPath();
      ctx.moveTo(x+w*0.36, yy);
      ctx.lineTo(x+w*0.64, yy);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (type === "cafe"){
    roundRect(x+w*0.22, y+22, w*0.56, 36, 18);
    ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    roundRect(x+w*0.22, y+62, w*0.56, 24, 12);
    ctx.fill();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "rgba(255,182,217,0.95)";
    for(let i=0;i<6;i++){
      const sx = x+w*0.22 + i*(w*0.56/6);
      ctx.fillRect(sx, y+62, w*0.56/12, 24);
    }
    ctx.restore();
    return;
  }

  if (type === "gym"){
    roundRect(x+w*0.22, y+22, w*0.56, 36, 18);
    ctx.fill(); ctx.stroke();
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "rgba(26,34,64,0.55)";
    ctx.beginPath();
    ctx.moveTo(x+w*0.50, y+14);
    ctx.lineTo(x+w*0.46, y+30);
    ctx.lineTo(x+w*0.52, y+30);
    ctx.lineTo(x+w*0.48, y+46);
    ctx.lineTo(x+w*0.56, y+26);
    ctx.lineTo(x+w*0.50, y+26);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  // arcade
  ctx.beginPath();
  ctx.moveTo(x+w*0.28, y+62);
  ctx.lineTo(x+w*0.50, y+18);
  ctx.lineTo(x+w*0.72, y+62);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.save();
  ctx.globalAlpha = 0.30;
  ctx.fillStyle = "rgba(255,182,217,0.95)";
  const hx = x+w*0.50, hy = y+40;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.bezierCurveTo(hx-10, hy-10, hx-18, hy+6, hx, hy+14);
  ctx.bezierCurveTo(hx+18, hy+6, hx+10, hy-10, hx, hy);
  ctx.fill();
  ctx.restore();
}

/** ===== 소품 ===== */
function drawTree(o,t){
  const sway = Math.sin(t*1.4 + o.x*0.01)*4;
  const x=o.x, y=o.y, s=o.s;

  // 그림자
  ctx.save();
  ctx.globalAlpha = 0.20;
  ctx.fillStyle="rgba(26,34,64,0.25)";
  ctx.beginPath();
  ctx.ellipse(x, y+20*s, 22*s, 8*s, 0, 0, Math.PI*2);
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

  // 잎(파스텔)
  ctx.save();
  ctx.fillStyle="rgba(184,243,209,0.70)";
  ctx.beginPath();
  ctx.ellipse(x-16*s+sway, y-12*s, 22*s, 18*s, 0, 0, Math.PI*2);
  ctx.ellipse(x+6*s+sway,  y-18*s, 26*s, 22*s, 0, 0, Math.PI*2);
  ctx.ellipse(x+22*s+sway, y-8*s, 22*s, 18*s, 0, 0, Math.PI*2);
  ctx.fill();

  // 하이라이트
  ctx.globalAlpha = 0.22;
  ctx.fillStyle="rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.ellipse(x-4*s+sway, y-24*s, 14*s, 10*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawLamp(o,t){
  const x=o.x, y=o.y, s=o.s;
  const pulse = 0.5+0.5*Math.sin(t*3.0 + x*0.01);

  // 기둥
  ctx.save();
  ctx.strokeStyle="rgba(26,34,64,0.20)";
  ctx.lineWidth=6*s;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(x, y-36*s);
  ctx.lineTo(x, y+26*s);
  ctx.stroke();

  // 등
  ctx.fillStyle="rgba(255,255,255,0.85)";
  roundRect(x-12*s, y-46*s, 24*s, 16*s, 8*s);
  ctx.fill();

  // 빛(파스텔 노랑)
  ctx.globalAlpha = 0.18 + 0.16*pulse;
  ctx.fillStyle="rgba(255,211,140,0.85)";
  ctx.beginPath();
  ctx.ellipse(x, y-20*s, 26*s, 38*s, 0, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function drawBench(o,t){
  const x=o.x, y=o.y, s=o.s;

  ctx.save();
  ctx.globalAlpha = 0.22;
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

  // 다리
  ctx.fillStyle="rgba(26,34,64,0.14)";
  roundRect(x-28*s, y+12*s, 10*s, 10*s, 4*s); ctx.fill();
  roundRect(x+18*s, y+12*s, 10*s, 10*s, 4*s); ctx.fill();
  ctx.restore();
}

/** ===== 미니미(4방향) ===== */
function frameIndex(animT){ return Math.floor(animT*10) % 4; }

function drawMinimi(x,y,t){
  const bob = Math.sin(player.bobT) * (player.moving ? 1.1 : 1.7);
  const f = player.moving ? frameIndex(player.animT) : 0;

  // 그림자
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

  // 옆 방향이면 살짝 스케일/오프셋으로 ‘옆모습’ 강조
  if (dir === "left") ctx.scale(-1, 1);

  // 머리
  ctx.fillStyle="rgba(255,255,255,0.95)";
  ctx.beginPath();
  ctx.arc(0, -18, 16, 0, Math.PI*2);
  ctx.fill();

  // 머리 장식
  ctx.globalAlpha = 0.35;
  ctx.fillStyle="rgba(255,182,217,0.85)";
  ctx.beginPath();
  ctx.arc(-8, -28, 10, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 몸통
  ctx.fillStyle="rgba(126,200,255,0.95)";
  roundRectAt(-12, -2, 24, 26, 10);
  ctx.fill();

  // 얼굴/등
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
    // left/right: 눈 1개 + 코 점
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

  // 팔
  ctx.strokeStyle="rgba(160,220,255,0.95)";
  ctx.lineWidth=5;
  ctx.lineCap="round";
  ctx.beginPath();
  ctx.moveTo(-12, 6);
  ctx.lineTo(-20, 10 + arm);
  ctx.moveTo(12, 6);
  ctx.lineTo(20, 10 - arm);
  ctx.stroke();

  // 다리
  ctx.strokeStyle="rgba(126,200,255,0.95)";
  ctx.lineWidth=6;
  ctx.beginPath();
  ctx.moveTo(-6, 18);
  ctx.lineTo(-8, 26 + leg);
  ctx.moveTo(6, 18);
  ctx.lineTo(8, 26 - leg);
  ctx.stroke();

  ctx.restore();
}

/** ===== 커서 ===== */
function drawCursor(x,y,t){
  ctx.save();
  ctx.translate(x+14,y+16);
  const pulse = 0.6 + 0.4*(0.5+0.5*Math.sin(t*5));
  ctx.globalAlpha = 0.18 + 0.12*pulse;
  ctx.strokeStyle = "rgba(26,34,64,0.55)";
  ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.stroke();

  ctx.globalAlpha = 0.95;
  ctx.fillStyle="rgba(255,255,255,0.95)";
  ctx.beginPath(); ctx.arc(0, -6, 10, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle="rgba(126,200,255,0.95)";
  roundRectAt(-8, 4, 16, 16, 8);
  ctx.fill();
  ctx.restore();
}

/** ===== 비네팅 ===== */
function vignette(){
  ctx.save();
  const g = ctx.createRadialGradient(W*0.5,H*0.55,Math.min(W,H)*0.35, W*0.5,H*0.55,Math.min(W,H)*0.95);
  g.addColorStop(0,"rgba(255,255,255,0)");
  g.addColorStop(1,"rgba(26,34,64,0.08)");
  ctx.fillStyle=g;
  ctx.fillRect(0,0,W,H);
  ctx.restore();
}

/** ===== 유틸 ===== */
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
function hash01(s){
  let h=2166136261;
  for(let i=0;i<s.length;i++){
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h>>>0) % 1000)/1000;
}

/** ===== 루프 ===== */
function loop(now){
  const t = now/1000;
  const dt = Math.min(0.033, (now-lastT)/1000);
  lastT = now;

  update(dt,t);
  draw(t);

  requestAnimationFrame(loop);
}

/** ===== 시작 ===== */
resize();
requestAnimationFrame(loop);
