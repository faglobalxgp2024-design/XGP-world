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
  layout();
}
window.addEventListener("resize", resize);

/** =========================
 *  포탈 링크(요청한 URL 적용)
 * ========================= */
const portals = [
  {
    label: "미니게임 피하기",
    url: "https://faglobalxgp2024-design.github.io/index.html/",
    x: 0, y: 0, w: 0, h: 0
  },
  {
    label: "미니게임 양궁",
    url: "https://ttjdwls777-eng.github.io/XGP-MINI-GAME2/",
    x: 0, y: 0, w: 0, h: 0
  },
  {
    label: "미니게임 장기",
    url: "https://faglobalxgp2024-design.github.io/MINIGAME/",
    x: 0, y: 0, w: 0, h: 0
  },
];

function layout() {
  // 반응형 배치
  const baseW = 980;
  const s = Math.min(1.35, Math.max(0.78, W / baseW));
  const cx = W * 0.5;

  portals[0].x = cx - 440 * s; portals[0].y = H * 0.54;
  portals[1].x = cx - 120 * s; portals[1].y = H * 0.25;
  portals[2].x = cx + 210 * s; portals[2].y = H * 0.54;

  for (const p of portals) {
    p.w = 240 * s;
    p.h = 128 * s;
  }

  // 플레이어 초기 위치를 화면 안으로
  player.x = Math.max(player.r, Math.min(W - player.r, player.x));
  player.y = Math.max(player.r, Math.min(H - player.r, player.y));
}

/** =========================
 *  플레이어(미니미) + 걷기 스프라이트(프레임)
 *  - 외부 이미지 없이 offscreen 캔버스로 “스프라이트 시트” 생성
 * ========================= */
const player = {
  x: 150, y: 170,
  r: 16,
  speed: 3.35,
  vx: 0, vy: 0,
  facing: 1,        // -1 left, 1 right
  moving: false,
  animT: 0,         // 걷기 애니 타이머
  bobT: 0
};

const SPR = createMinimiSpriteSheet(); // {canvas, frameW, frameH, frames}
const frames = SPR.frames;

/** =========================
 *  입력: 키보드 + 드래그/터치
 * ========================= */
const keys = new Set();
let dragging = false;
let dragOffset = { x: 0, y: 0 };

let pointer = {
  x: 0, y: 0,
  active: false,
  lastMoveAt: 0
};

window.addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());
  if ((e.key === "Enter" || e.key.toLowerCase() === "e") && activePortal) {
    enterPortal(activePortal);
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

canvas.addEventListener("pointerenter", () => pointer.active = true);
canvas.addEventListener("pointerleave", () => pointer.active = false);

canvas.addEventListener("pointerdown", (e) => {
  const p = getPointer(e);
  // 미니미 근처 클릭/터치로 드래그 시작
  const dx = p.x - player.x, dy = p.y - player.y;
  if (dx*dx + dy*dy <= (player.r + 14)*(player.r + 14)) {
    dragging = true;
    dragOffset.x = player.x - p.x;
    dragOffset.y = player.y - p.y;
    canvas.setPointerCapture(e.pointerId);
  }
});

canvas.addEventListener("pointermove", (e) => {
  const p = getPointer(e);
  pointer.x = p.x; pointer.y = p.y;
  pointer.lastMoveAt = performance.now();

  if (!dragging) return;
  player.x = p.x + dragOffset.x;
  player.y = p.y + dragOffset.y;
  clampPlayer();
});

canvas.addEventListener("pointerup", () => {
  dragging = false;
  if (activePortal && isTouchDevice()) enterPortal(activePortal);
});

function getPointer(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function isTouchDevice() {
  return (navigator.maxTouchPoints || 0) > 0;
}

/** =========================
 *  풀숲 레이어(가려짐) 세팅
 *  - “풀숲 앞 레이어”를 그릴 때, 미니미가 일정 y 아래로 가면
 *    풀숲이 미니미 위로 덮이면서 ‘뒤로 들어간’ 느낌
 * ========================= */
function bushLineY() {
  // 풀숲이 시작되는 라인
  return H * 0.69;
}

/** =========================
 *  배경 요소(애니메이션)
 * ========================= */
const clouds = Array.from({ length: 8 }, () => ({
  x: Math.random() * 1400,
  y: 40 + Math.random() * 170,
  s: 0.55 + Math.random() * 1.25,
  v: 12 + Math.random() * 20
}));

const stars = Array.from({ length: 68 }, () => ({
  x: Math.random(),
  y: Math.random() * 0.55,
  t: Math.random() * 10
}));

const balloons = Array.from({ length: 6 }, () => ({
  x: 0, y: 0, a: Math.random() * Math.PI * 2, s: 0.8 + Math.random()*0.7
}));

function resetBalloon(b){
  b.x = -80 - Math.random()*240;
  b.y = H*0.36 + Math.random()*H*0.22;
  b.a = Math.random()*Math.PI*2;
  b.s = 0.8 + Math.random()*0.7;
}
balloons.forEach(resetBalloon);

let activePortal = null;
let entering = false;

/** =========================
 *  충돌/클램프
 * ========================= */
function clampPlayer() {
  player.x = Math.max(player.r, Math.min(W - player.r, player.x));
  player.y = Math.max(player.r, Math.min(H - player.r, player.y));
}

function circleRectHit(cx, cy, r, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX, dy = cy - closestY;
  return (dx*dx + dy*dy) <= r*r;
}

/** =========================
 *  포탈 입장(페이드 전환)
 * ========================= */
function enterPortal(p) {
  if (entering) return;
  entering = true;

  // 페이드 인
  fadeEl.classList.add("on");

  // 조금 텀을 두고 이동(시각적으로 자연스럽게)
  setTimeout(() => {
    window.location.href = p.url;
  }, 420);
}

/** =========================
 *  FPS
 * ========================= */
let lastT = performance.now();
let acc = 0, framesCount = 0;
let fps = 0;

/** =========================
 *  Update / Draw loop
 * ========================= */
function update(dt, t) {
  // 키보드 이동(드래그 중이면 off)
  let ax = 0, ay = 0;
  if (!dragging) {
    if (keys.has("a") || keys.has("arrowleft")) ax -= 1;
    if (keys.has("d") || keys.has("arrowright")) ax += 1;
    if (keys.has("w") || keys.has("arrowup")) ay -= 1;
    if (keys.has("s") || keys.has("arrowdown")) ay += 1;

    const moving = (ax !== 0 || ay !== 0);
    player.moving = moving;

    if (ax !== 0) player.facing = ax < 0 ? -1 : 1;

    if (moving) {
      const len = Math.hypot(ax, ay) || 1;
      player.x += (ax/len) * player.speed;
      player.y += (ay/len) * player.speed;
      clampPlayer();
      player.animT += dt; // 걷기 프레임 진행
    } else {
      // 멈추면 애니 타이머 천천히 안정
      player.animT = player.animT * 0.92;
    }
  } else {
    player.moving = true;
    player.animT += dt;
  }

  player.bobT += dt * 6.2;

  // 구름
  for (const c of clouds) {
    c.x += c.v * dt;
    if (c.x - 200*c.s > W + 260) {
      c.x = -260*c.s;
      c.y = 40 + Math.random()*220;
      c.s = 0.55 + Math.random()*1.25;
      c.v = 12 + Math.random()*20;
    }
  }

  // 풍선(놀이공원 느낌)
  for (const b of balloons) {
    b.x += (28 * b.s) * dt;
    b.a += dt * 0.9;
    if (b.x > W + 200) resetBalloon(b);
  }

  // 포탈 체크
  activePortal = null;
  for (const p of portals) {
    if (circleRectHit(player.x, player.y, player.r, p)) { activePortal = p; break; }
  }

  if (activePortal) {
    toast.hidden = false;
    toast.innerHTML = `입장: <b>${activePortal.label}</b> · PC는 <b>Enter/E</b> · 모바일은 <b>손 떼기</b>`;
  } else {
    toast.hidden = true;
  }

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

  // 1) 밤하늘 배경
  drawSky(t);

  // 2) 별
  drawStars(t);

  // 3) 구름
  for (const c of clouds) drawCloud(c.x, c.y, 120*c.s, 44*c.s, 0.10);

  // 4) 원거리 산/실루엣
  drawDistant(t);

  // 5) 도시(아파트) 디테일 + 창문 반짝 + 간판
  drawCity(t);

  // 6) 놀이공원(관람차/회전목마/전구/풍선) 애니
  drawAmusement(t);

  // 7) 바닥/길(살짝 타일 느낌)
  drawGround(t);

  // 8) 포탈(반짝 + 파티클)
  for (const p of portals) drawPortal(p, t);

  // 9) 플레이어 depth: 풀숲 라인 위/아래로 레이어링
  //    - 기본적으로 플레이어는 포탈/바닥 위에 그리되,
  //    - 플레이어 y가 bushLine 아래로 내려오면 "풀숲 앞 레이어"가 플레이어를 덮게 됨.
  drawMinimiSprite(player.x, player.y, t);

  // 10) 풀숲 레이어(뒤/앞 2단) + 앞 레이어가 플레이어를 덮어 “가려짐” 구현
  drawBushBack(t);   // 뒤쪽
  drawBushFront(t);  // 앞쪽(덮개)

  // 11) 커서 미니미 (마우스일 때만)
  if (!isTouchDevice() && pointer.active) {
    const idle = (performance.now() - pointer.lastMoveAt) > 1400;
    if (!idle) drawCursorMinimi(pointer.x, pointer.y, t);
  }

  // 12) 비네팅
  vignette();
}

/** =========================
 *  배경/디테일 드로잉
 * ========================= */
function drawSky(t){
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0, "#111b3f");
  g.addColorStop(0.55, "#0b1533");
  g.addColorStop(1, "#070a16");
  ctx.fillStyle = g;
  ctx.fillRect(0,0,W,H);

  // 은은한 오로라/빛줄기
  ctx.save();
  ctx.globalAlpha = 0.14;
  for (let i=0;i<4;i++){
    const x = W*(0.15 + i*0.22) + Math.sin(t*0.25+i)*30;
    const gg = ctx.createLinearGradient(x,0,x,H);
    gg.addColorStop(0, "rgba(120,200,255,0)");
    gg.addColorStop(0.35, "rgba(120,200,255,0.25)");
    gg.addColorStop(1, "rgba(120,200,255,0)");
    ctx.fillStyle = gg;
    ctx.fillRect(x-90, 0, 180, H);
  }
  ctx.restore();
}

function drawStars(t){
  ctx.save();
  for (const s of stars){
    const x = s.x*W;
    const y = s.y*H;
    const a = 0.18 + 0.62*(0.5+0.5*Math.sin(t*1.6+s.t));
    ctx.globalAlpha = a;
    ctx.fillStyle = "white";
    ctx.fillRect(x,y,1.6,1.6);
  }
  ctx.restore();
}

function drawCloud(x,y,w,h,alpha){
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.ellipse(x, y, w*0.38, h*0.55, 0, 0, Math.PI*2);
  ctx.ellipse(x + w*0.22, y - h*0.15, w*0.32, h*0.52, 0, 0, Math.PI*2);
  ctx.ellipse(x + w*0.45, y, w*0.36, h*0.52, 0, 0, Math.PI*2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDistant(t){
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#08102a";
  ctx.beginPath();
  ctx.moveTo(0, H*0.60);
  for (let i=0;i<=10;i++){
    const x = (i/10)*W;
    const y = H*(0.56 + 0.06*Math.sin(t*0.22+i*0.9));
    ctx.quadraticCurveTo(x,y,x+W/10,H*0.60);
  }
  ctx.lineTo(W,H);
  ctx.lineTo(0,H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCity(t){
  const baseY = H*0.69;
  ctx.save();

  const buildings = [
    {x:W*0.06,w:W*0.18,h:H*0.26},
    {x:W*0.22,w:W*0.12,h:H*0.20},
    {x:W*0.78,w:W*0.12,h:H*0.23},
    {x:W*0.66,w:W*0.11,h:H*0.18},
    {x:W*0.88,w:W*0.09,h:H*0.16},
  ];

  for (let idx=0; idx<buildings.length; idx++){
    const b = buildings[idx];
    const x=b.x, y=baseY-b.h;

    // 본체
    const grad = ctx.createLinearGradient(x,y,x,y+b.h);
    grad.addColorStop(0,"rgba(255,255,255,0.09)");
    grad.addColorStop(1,"rgba(255,255,255,0.03)");
    ctx.fillStyle = grad;
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;

    roundRect(x,y,b.w,b.h,12);
    ctx.fill(); ctx.stroke();

    // 옥상 구조물(탑/안테나)
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.fillRect(x + b.w*0.18, y-10, b.w*0.12, 10);
    ctx.fillRect(x + b.w*0.62, y-14, b.w*0.10, 14);
    ctx.restore();

    // 창문
    const cols = Math.max(5, Math.floor(b.w/22));
    const rows = Math.max(6, Math.floor(b.h/20));
    for (let r=0;r<rows;r++){
      for (let c=0;c<cols;c++){
        const wx = x+10 + c*(b.w-20)/cols;
        const wy = y+14 + r*(b.h-26)/rows;
        const flick = Math.sin(t*1.8 + idx*1.1 + r*0.9 + c*1.4);
        const on = flick > 0.35;
        ctx.fillStyle = on ? "rgba(255,220,120,0.55)" : "rgba(255,255,255,0.06)";
        ctx.fillRect(wx,wy,7,10);
      }
    }

    // 네온 간판(일부)
    if (idx===0 || idx===2){
      const sx = x + b.w*0.18;
      const sy = y + b.h*0.22;
      ctx.save();
      const pulse = 0.35 + 0.65*(0.5+0.5*Math.sin(t*3.2+idx));
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = `rgba(80,170,255,${0.10+0.18*pulse})`;
      roundRect(sx,sy,b.w*0.62,22,10);
      ctx.fill();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "600 11px system-ui";
      ctx.fillText("XGP TOWN", sx+10, sy+15);
      ctx.restore();
    }
  }

  // 지평선 라인
  ctx.strokeStyle="rgba(255,255,255,0.08)";
  ctx.beginPath(); ctx.moveTo(0,baseY); ctx.lineTo(W,baseY); ctx.stroke();

  ctx.restore();
}

function drawAmusement(t){
  const ground = H*0.69;

  // 관람차
  const fx = W*0.52;
  const fy = ground - H*0.14;
  const R  = Math.min(W,H)*0.105;
  const rot = t*0.55;

  ctx.save();
  ctx.globalAlpha = 0.95;

  // 받침대
  ctx.strokeStyle="rgba(255,255,255,0.18)";
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(fx-R*0.55, ground);
  ctx.lineTo(fx, fy+R*0.25);
  ctx.lineTo(fx+R*0.55, ground);
  ctx.stroke();

  // 바퀴 링
  ctx.beginPath(); ctx.arc(fx,fy,R,0,Math.PI*2); ctx.stroke();

  // 스포크
  for(let i=0;i<10;i++){
    const a = rot + (i/10)*Math.PI*2;
    ctx.beginPath();
    ctx.moveTo(fx,fy);
    ctx.lineTo(fx+Math.cos(a)*R, fy+Math.sin(a)*R);
    ctx.stroke();
  }

  // 캐빈 + 불빛
  for(let i=0;i<10;i++){
    const a = rot + (i/10)*Math.PI*2;
    const cx = fx+Math.cos(a)*R;
    const cy = fy+Math.sin(a)*R;

    const blink = 0.35 + 0.65*(0.5+0.5*Math.sin(t*2.2+i));
    ctx.fillStyle = `rgba(255,220,120,${0.12+0.28*blink})`;
    ctx.beginPath(); ctx.arc(cx,cy,6,0,Math.PI*2); ctx.fill();

    // 캐빈 몸체
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    roundRect(cx-7, cy+7, 14, 8, 4);
    ctx.fill();
    ctx.globalAlpha = 0.95;
  }

  // 회전목마(간단)
  const mx = W*0.40, my = ground - H*0.06;
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  roundRect(mx, my, W*0.12, H*0.06, 14); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.stroke();

  // 회전목마 불빛
  const bulbs = 10;
  for(let i=0;i<bulbs;i++){
    const u = i/(bulbs-1);
    const bx = mx + 10 + u*(W*0.12-20);
    const pulse = 0.35 + 0.65*(0.5+0.5*Math.sin(t*3.4+i));
    ctx.fillStyle = `rgba(255,220,120,${0.10+0.28*pulse})`;
    ctx.beginPath(); ctx.arc(bx, my+10, 3.8, 0, Math.PI*2); ctx.fill();
  }

  // 전구 줄
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(W*0.34, ground-H*0.25);
  ctx.quadraticCurveTo(W*0.52, ground-H*0.30, W*0.71, ground-H*0.22);
  ctx.stroke();

  for(let i=0;i<=12;i++){
    const u=i/12;
    const x=lerp3(W*0.34,W*0.52,W*0.71,u);
    const y=quadY(ground-H*0.25, ground-H*0.30, ground-H*0.22, u);
    const pulse=0.4+0.6*(0.5+0.5*Math.sin(t*3.0+i));
    ctx.fillStyle=`rgba(255,220,120,${0.10+0.26*pulse})`;
    ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill();
  }

  // 풍선
  for (const b of balloons){
    const by = b.y + Math.sin(b.a)*18;
    drawBalloon(b.x, by, b.s, t);
  }

  ctx.restore();
}

function drawBalloon(x,y,s,t){
  ctx.save();
  ctx.globalAlpha = 0.55;
  // 줄
  ctx.strokeStyle="rgba(255,255,255,0.22)";
  ctx.lineWidth=1;
  ctx.beginPath();
  ctx.moveTo(x,y+22*s);
  ctx.quadraticCurveTo(x+10*s, y+48*s, x-8*s, y+78*s);
  ctx.stroke();

  // 풍선 몸체
  const pulse = 0.5+0.5*Math.sin(t*2.3 + x*0.01);
  ctx.globalAlpha = 0.35 + 0.25*pulse;
  ctx.fillStyle = "rgba(255,120,160,0.9)";
  ctx.beginPath();
  ctx.ellipse(x,y,16*s,20*s, 0, 0, Math.PI*2);
  ctx.fill();

  // 하이라이트
  ctx.globalAlpha = 0.12;
  ctx.fillStyle="white";
  ctx.beginPath();
  ctx.ellipse(x-6*s,y-8*s,6*s,10*s, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawGround(t){
  const y0 = H*0.69;
  ctx.save();

  // 길(타일 느낌)
  const g = ctx.createLinearGradient(0,y0,0,H);
  g.addColorStop(0,"rgba(255,255,255,0.03)");
  g.addColorStop(1,"rgba(0,0,0,0.25)");
  ctx.fillStyle = g;
  ctx.fillRect(0,y0,W,H-y0);

  // 타일 선
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle="rgba(255,255,255,0.12)";
  for(let i=0;i<12;i++){
    const y = y0 + i*(H-y0)/12;
    ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke();
  }
  for(let i=0;i<18;i++){
    const x = i*W/18;
    ctx.beginPath(); ctx.moveTo(x,y0); ctx.lineTo(x,H); ctx.stroke();
  }
  ctx.restore();
}

/** =========================
 *  포탈: 네온/파티클/펄스
 * ========================= */
function drawPortal(p,t){
  const isActive = (activePortal === p);
  const pulse = 0.65 + 0.35*Math.sin(t*3.2);
  const glow = isActive ? 1.0 : 0.55;

  // 그림자
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle="black";
  roundRect(p.x+7,p.y+10,p.w,p.h,18);
  ctx.fill();
  ctx.restore();

  // 본체
  ctx.save();
  const g = ctx.createLinearGradient(p.x,p.y,p.x,p.y+p.h);
  g.addColorStop(0,"rgba(255,255,255,0.10)");
  g.addColorStop(1,"rgba(255,255,255,0.05)");
  ctx.fillStyle = g;
  ctx.strokeStyle = isActive
    ? `rgba(255,220,120,${0.55+0.35*pulse})`
    : "rgba(255,255,255,0.20)";
  ctx.lineWidth = 2;
  roundRect(p.x,p.y,p.w,p.h,18);
  ctx.fill(); ctx.stroke();

  // 라벨
  ctx.fillStyle="rgba(255,255,255,0.92)";
  ctx.font=`700 ${Math.max(13,Math.floor(p.h*0.16))}px system-ui`;
  ctx.fillText(p.label, p.x+14, p.y+32);

  // 서브
  ctx.fillStyle="rgba(255,255,255,0.66)";
  ctx.font=`500 ${Math.max(11,Math.floor(p.h*0.12))}px system-ui`;
  const sub = isTouchDevice() ? "손 떼면 입장" : "Enter/E로 입장";
  ctx.fillText(sub, p.x+14, p.y+54);

  // 내부 네온면
  ctx.globalAlpha = 0.22*glow;
  ctx.fillStyle = `rgba(80,170,255,${0.08+0.08*pulse})`;
  roundRect(p.x+12,p.y+66,p.w-24,p.h-80,14);
  ctx.fill();

  // 파티클 반짝(점 8개)
  ctx.globalAlpha = 0.55*glow;
  for(let i=0;i<8;i++){
    const a = t*2.0 + i;
    const px = p.x + p.w*0.20 + (Math.sin(a*1.3+i)*0.5+0.5)*(p.w*0.60);
    const py = p.y + p.h*0.60 + (Math.cos(a*1.1+i)*0.5+0.5)*(p.h*0.22);
    const r  = 1.8 + 1.8*(0.5+0.5*Math.sin(a*2.1));
    ctx.fillStyle = `rgba(255,220,120,${0.12+0.28*(0.5+0.5*Math.sin(a*1.7))})`;
    ctx.beginPath(); ctx.arc(px,py,r,0,Math.PI*2); ctx.fill();
  }

  ctx.restore();
}

/** =========================
 *  풀숲 (뒤/앞 레이어)
 * ========================= */
function drawBushBack(t){
  const y = bushLineY();
  ctx.save();
  ctx.globalAlpha = 0.6;
  for(let i=0;i<10;i++){
    const bx = (i/9)*W;
    const sway = Math.sin(t*1.3+i)*6;
    drawBushBlob(bx+sway, y+14, 120, 50, "rgba(80,200,140,0.10)");
  }
  ctx.restore();
}

function drawBushFront(t){
  const y = bushLineY();

  // 앞 레이어는 더 진하게 + 플레이어를 덮어 “가려짐”
  ctx.save();
  ctx.globalAlpha = 0.92;

  for(let i=0;i<14;i++){
    const bx = (i/13)*W;
    const sway = Math.sin(t*1.7+i*0.9)*10;
    drawBushBlob(bx+sway, y+40, 140, 62, "rgba(120,220,160,0.14)");
  }

  // 풀잎 몇 개 (앞쪽)
  for(let i=0;i<18;i++){
    const x = (i/17)*W;
    const sway = Math.sin(t*1.8+i)*10;
    const h = H*(0.10+0.05*Math.sin(i*0.8));
    ctx.strokeStyle="rgba(120,220,160,0.16)";
    ctx.lineWidth=10; ctx.lineCap="round";
    ctx.beginPath();
    ctx.moveTo(x, y+90);
    ctx.quadraticCurveTo(x+sway, y-h, x+sway*0.2, y+65);
    ctx.stroke();
  }

  // 바닥 음영
  const g = ctx.createLinearGradient(0,y,0,H);
  g.addColorStop(0,"rgba(0,0,0,0)");
  g.addColorStop(1,"rgba(0,0,0,0.46)");
  ctx.fillStyle=g;
  ctx.fillRect(0,y,W,H-y);

  ctx.restore();
}

function drawBushBlob(cx, cy, w, h, fill){
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
 *  미니미 스프라이트 드로잉
 *  - 걷기: 6프레임 루프
 *  - 풀숲 “뒤로 들어가기” 느낌: bushLine 아래로 내려가면
 *    미니미의 하반신이 풀숲에 가려지도록 마스크 처리
 * ========================= */
function drawMinimiSprite(x,y,t){
  const by = bushLineY();
  const behindBush = (y > by + 22);

  // 현재 프레임 선택
  let frameIndex = 0;
  if (player.moving) {
    // 속도감: animT를 기반으로 프레임 진행
    frameIndex = Math.floor(player.animT * 12) % frames;
  } else {
    frameIndex = 0; // 서있는 프레임
  }

  const fw = SPR.frameW;
  const fh = SPR.frameH;
  const sx = frameIndex * fw;

  const scale = 1.05; // 크기
  const drawW = fw * scale;
  const drawH = fh * scale;

  // 바운스
  const bob = Math.sin(player.bobT) * (player.moving ? 1.6 : 2.4);

  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(player.facing, 1);

  // 그림자
  ctx.globalAlpha = 0.22;
  ctx.fillStyle="black";
  ctx.beginPath();
  ctx.ellipse(0, 22, 18, 7, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 풀숲 뒤라면: 미니미를 전체 그린 뒤, “풀숲 라인 아래 부분”을 더 잘 가리도록 마스크를 추가
  // (앞 풀숲이 나중에 덮이지만, 여기서도 살짝 컷팅하면 더 자연스럽게 보임)
  if (behindBush) {
    // 상체는 보이게, 하체는 조금 가리는 클립
    ctx.save();
    ctx.beginPath();
    ctx.rect(-drawW/2, -drawH/2, drawW, drawH*0.62);
    ctx.clip();

    ctx.drawImage(SPR.canvas, sx, 0, fw, fh, -drawW/2, -drawH/2, drawW, drawH);
    ctx.restore();

    // 하체(가려지는 부분) 약간 어둡게만 표현
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.rect(-drawW/2, -drawH/2 + drawH*0.62, drawW, drawH*0.38);
    ctx.clip();
    ctx.drawImage(SPR.canvas, sx, 0, fw, fh, -drawW/2, -drawH/2, drawW, drawH);
    ctx.restore();
  } else {
    ctx.drawImage(SPR.canvas, sx, 0, fw, fh, -drawW/2, -drawH/2, drawW, drawH);
  }

  ctx.restore();
}

/** =========================
 *  미니미 커서 (작은 스프라이트 + 링)
 * ========================= */
function drawCursorMinimi(x,y,t){
  ctx.save();
  ctx.translate(x+14, y+16);

  const pulse = 0.6 + 0.4*(0.5+0.5*Math.sin(t*5));
  ctx.globalAlpha = 0.25 + 0.16*pulse;
  ctx.strokeStyle="rgba(255,255,255,0.9)";
  ctx.lineWidth=2;
  ctx.beginPath(); ctx.arc(0,0,14,0,Math.PI*2); ctx.stroke();

  // 작은 미니미
  const fw=SPR.frameW, fh=SPR.frameH;
  const frameIndex = Math.floor(t*10) % frames;
  const sx = frameIndex*fw;

  ctx.globalAlpha = 0.95;
  ctx.drawImage(SPR.canvas, sx,0,fw,fh, -fw*0.40, -fh*0.38, fw*0.80, fh*0.80);

  ctx.restore();
}

/** =========================
 *  비네팅
 * ========================= */
function vignette(){
  ctx.save();
  const g = ctx.createRadialGradient(W*0.5,H*0.55,Math.min(W,H)*0.35, W*0.5,H*0.55,Math.min(W,H)*0.90);
  g.addColorStop(0,"rgba(0,0,0,0)");
  g.addColorStop(1,"rgba(0,0,0,0.35)");
  ctx.fillStyle=g;
  ctx.fillRect(0,0,W,H);
  ctx.restore();
}

/** =========================
 *  미니미 “스프라이트 시트” 생성
 *  - 외부 이미지 없이, 캔버스로 6프레임을 그려서 sheet 만들기
 * ========================= */
function createMinimiSpriteSheet(){
  const frameW = 64;
  const frameH = 64;
  const frames = 6;

  const c = document.createElement("canvas");
  c.width = frameW * frames;
  c.height = frameH;
  const g = c.getContext("2d");

  for(let i=0;i<frames;i++){
    // 걷기 애니: 다리/팔 스윙
    const phase = (i/frames)*Math.PI*2;

    const ox = i*frameW + frameW/2;
    const oy = frameH/2 + 6;

    // 바운스
    const bob = Math.sin(phase)*2;

    // 그림자
    g.save();
    g.globalAlpha = 0.18;
    g.fillStyle="black";
    g.beginPath();
    g.ellipse(ox, oy+22, 16, 6, 0, 0, Math.PI*2);
    g.fill();
    g.restore();

    // 몸통
    drawRoundRect(g, ox-12, oy-6+bob, 24, 26, 10, "rgba(120,200,255,0.95)");

    // 머리
    g.save();
    g.fillStyle="rgba(160,220,255,0.95)";
    g.beginPath();
    g.arc(ox, oy-20+bob, 16, 0, Math.PI*2);
    g.fill();

    // 하이라이트
    g.globalAlpha = 0.18;
    g.fillStyle="white";
    g.beginPath();
    g.arc(ox-6, oy-26+bob, 8, 0, Math.PI*2);
    g.fill();
    g.globalAlpha = 1;

    // 눈
    g.fillStyle="rgba(0,0,0,0.65)";
    g.beginPath();
    g.arc(ox-5, oy-22+bob, 2.2, 0, Math.PI*2);
    g.arc(ox+5, oy-22+bob, 2.2, 0, Math.PI*2);
    g.fill();

    // 볼
    g.globalAlpha = 0.25;
    g.fillStyle="rgba(255,120,160,0.9)";
    g.beginPath();
    g.arc(ox-9, oy-18+bob, 3.2, 0, Math.PI*2);
    g.arc(ox+9, oy-18+bob, 3.2, 0, Math.PI*2);
    g.fill();
    g.globalAlpha = 1;

    // 팔(스윙)
    const arm = Math.sin(phase)*5;
    g.strokeStyle="rgba(160,220,255,0.9)";
    g.lineWidth=5;
    g.lineCap="round";
    g.beginPath();
    g.moveTo(ox-12, oy+2+bob);
    g.lineTo(ox-20, oy+8+bob + arm);
    g.moveTo(ox+12, oy+2+bob);
    g.lineTo(ox+20, oy+8+bob - arm);
    g.stroke();

    // 다리(스텝)
    const leg = Math.sin(phase)*5;
    g.strokeStyle="rgba(120,200,255,0.9)";
    g.lineWidth=6;
    g.beginPath();
    g.moveTo(ox-6, oy+18+bob);
    g.lineTo(ox-8, oy+26+bob + leg);
    g.moveTo(ox+6, oy+18+bob);
    g.lineTo(ox+8, oy+26+bob - leg);
    g.stroke();

    g.restore();
  }

  return { canvas: c, frameW, frameH, frames };
}

function drawRoundRect(g, x,y,w,h,r,fill){
  const rr = Math.min(r, w/2, h/2);
  g.save();
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(x+rr,y);
  g.arcTo(x+w,y,x+w,y+h,rr);
  g.arcTo(x+w,y+h,x,y+h,rr);
  g.arcTo(x,y+h,x,y,rr);
  g.arcTo(x,y,x+w,y,rr);
  g.closePath();
  g.fill();
  g.restore();
}

/** =========================
 *  유틸
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

function lerp(a,b,t){ return a+(b-a)*t; }
function quadY(y0,y1,y2,t){
  const a=lerp(y0,y1,t);
  const b=lerp(y1,y2,t);
  return lerp(a,b,t);
}
function lerp3(x0,x1,x2,t){
  const a=lerp(x0,x1,t);
  const b=lerp(x1,x2,t);
  return lerp(a,b,t);
}

/** =========================
 *  루프
 * ========================= */
function loop(now){
  const t = now/1000;
  const dt = Math.min(0.033, (now-lastT)/1000);
  lastT = now;

  update(dt,t);
  draw(t);

  requestAnimationFrame(loop);
}

// start
resize();
requestAnimationFrame(loop);
