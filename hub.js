const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");
const toast = document.getElementById("toast");

function resize() {
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resize);
resize();

// ====== 월드 설정 ======
const player = { x: 120, y: 140, r: 14, vx: 0, vy: 0, speed: 3.2 };
const keys = new Set();

// 포탈(미니게임 입구) 정의: 위치/크기/라벨/이동 URL
const portals = [
  { x: 80,  y: 240, w: 180, h: 110, label: "미니게임 피하기", url: "games/avoid.html" },
  { x: 320, y: 120, w: 180, h: 110, label: "미니게임 양궁",   url: "games/archery.html" },
  { x: 560, y: 260, w: 180, h: 110, label: "미니게임 장기",   url: "games/janggi.html" },
];

let dragging = false;
let dragOffset = {x:0,y:0};
let activePortal = null;

// ====== 입력: 키보드 ======
window.addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());
  // 포탈 진입 키: Enter 또는 e
  if ((e.key === "Enter" || e.key.toLowerCase() === "e") && activePortal) {
    location.href = activePortal.url;
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

// ====== 입력: 드래그/터치 (Pointer Events) ======
canvas.addEventListener("pointerdown", (e) => {
  const p = getPointer(e);
  const dx = p.x - player.x, dy = p.y - player.y;
  if (dx*dx + dy*dy <= (player.r+6)*(player.r+6)) {
    dragging = true;
    dragOffset.x = player.x - p.x;
    dragOffset.y = player.y - p.y;
    canvas.setPointerCapture(e.pointerId);
  }
});

canvas.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const p = getPointer(e);
  player.x = p.x + dragOffset.x;
  player.y = p.y + dragOffset.y;
  clampPlayer();
});

canvas.addEventListener("pointerup", (e) => {
  dragging = false;
  // 모바일/터치에서는 포탈 위에서 손 떼면 바로 이동(원하면 주석 처리)
  if (activePortal) location.href = activePortal.url;
});

function getPointer(e){
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

// ====== 충돌 판정 ======
function circleRectHit(cx, cy, r, rect){
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX, dy = cy - closestY;
  return (dx*dx + dy*dy) <= r*r;
}

function clampPlayer(){
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;
  player.x = Math.max(player.r, Math.min(w - player.r, player.x));
  player.y = Math.max(player.r, Math.min(h - player.r, player.y));
}

// ====== 루프 ======
function update(){
  // 키보드 이동(드래그 중이면 키보드 이동 생략)
  if (!dragging) {
    let ax = 0, ay = 0;
    if (keys.has("a") || keys.has("arrowleft")) ax -= 1;
    if (keys.has("d") || keys.has("arrowright")) ax += 1;
    if (keys.has("w") || keys.has("arrowup")) ay -= 1;
    if (keys.has("s") || keys.has("arrowdown")) ay += 1;

    const len = Math.hypot(ax, ay) || 1;
    player.x += (ax/len) * player.speed;
    player.y += (ay/len) * player.speed;
    clampPlayer();
  }

  // 포탈 체크
  activePortal = null;
  for (const p of portals) {
    if (circleRectHit(player.x, player.y, player.r, p)) {
      activePortal = p;
      break;
    }
  }

  // UI 안내
  if (activePortal) {
    toast.hidden = false;
    toast.textContent = `입장: ${activePortal.label}  (PC: Enter/E · 모바일: 손 떼면 이동)`;
  } else {
    toast.hidden = true;
  }
}

function draw(){
  const w = canvas.getBoundingClientRect().width;
  const h = canvas.getBoundingClientRect().height;

  ctx.clearRect(0,0,w,h);

  // 포탈들
  for (const p of portals) {
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = (activePortal === p) ? "rgba(255,220,80,.22)" : "rgba(255,255,255,.10)";
    ctx.strokeStyle = (activePortal === p) ? "rgba(255,220,80,.75)" : "rgba(255,255,255,.25)";
    ctx.lineWidth = 2;
    roundRect(ctx, p.x, p.y, p.w, p.h, 14);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,.92)";
    ctx.font = "14px system-ui";
    ctx.fillText(p.label, p.x + 12, p.y + 26);
    ctx.restore();
  }

  // 플레이어(미니미)
  ctx.save();
  ctx.fillStyle = "rgba(120,200,255,.95)";
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function roundRect(ctx,x,y,w,h,r){
  const rr = Math.min(r, w/2, h/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
}

function loop(){
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
