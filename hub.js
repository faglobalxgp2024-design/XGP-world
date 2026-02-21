const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");

const toast = document.getElementById("toast");
const coordEl = document.getElementById("coord");
const fpsEl = document.getElementById("fps");

let W = 0, H = 0;
let DPR = 1;

function resize() {
  DPR = Math.max(1, window.devicePixelRatio || 1);
  const r = canvas.getBoundingClientRect();
  W = r.width;
  H = r.height;
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener("resize", resize);
resize();

/** ====== 포탈(미니게임 입구) ======
 * url은 너의 파일 경로에 맞춰 수정 가능
 */
const portals = [
  { x: 90,  y: 290, w: 220, h: 120, label: "미니게임 피하기", url: "games/avoid.html" },
  { x: 380, y: 160, w: 220, h: 120, label: "미니게임 양궁",   url: "games/archery.html" },
  { x: 700, y: 290, w: 220, h: 120, label: "미니게임 장기",   url: "games/janggi.html" },
];

/** 월드 스케일: 화면 크기에 따라 포탈들이 자연스럽게 배치되도록 보정 */
function layoutPortals() {
  // 기준 디자인(가로 980)에서 현재 W에 맞게 scale
  const baseW = 980;
  const s = Math.min(1.25, Math.max(0.75, W / baseW));
  const cx = W * 0.5;

  // 보기 좋게 재배치(반응형)
  portals[0].x = cx - 420 * s; portals[0].y = H * 0.52;
  portals[1].x = cx - 110 * s; portals[1].y = H * 0.25;
  portals[2].x = cx + 210 * s; portals[2].y = H * 0.52;

  for (const p of portals) {
    p.w = 220 * s;
    p.h = 120 * s;
  }
}
layoutPortals();
window.addEventListener("resize", layoutPortals);

/** ====== 플레이어(미니미) ====== */
const player = {
  x: 140, y: 150,
  r: 16,
  speed: 3.25,
  vx: 0, vy: 0,
  facing: 1, // -1 left, 1 right
  bob: 0
};

/** ====== 입력 처리 ====== */
const keys = new Set();
let dragging = false;
let dragOffset = { x: 0, y: 0 };

let pointer = {
  x: W * 0.5,
  y: H * 0.5,
  active: false,     // 캔버스 안에 마우스가 있는지
  lastMoveAt: 0
};

window.addEventListener("keydown", (e) => {
  keys.add(e.key.toLowerCase());
  if ((e.key === "Enter" || e.key.toLowerCase() === "e") && activePortal) {
    location.href = activePortal.url;
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

canvas.addEventListener("pointerenter", () => { pointer.active = true; });
canvas.addEventListener("pointerleave", () => { pointer.active = false; });

canvas.addEventListener("pointerdown", (e) => {
  const p = getPointer(e);
  // 플레이어 근처에서 누르면 드래그 시작
  const dx = p.x - player.x, dy = p.y - player.y;
  if (dx * dx + dy * dy <= (player.r + 10) * (player.r + 10)) {
    dragging = true;
    dragOffset.x = player.x - p.x;
    dragOffset.y = player.y - p.y;
    canvas.setPointerCapture(e.pointerId);
  }
});

canvas.addEventListener("pointermove", (e) => {
  const p = getPointer(e);
  pointer.x = p.x;
  pointer.y = p.y;
  pointer.lastMoveAt = performance.now();

  if (!dragging) return;
  player.x = p.x + dragOffset.x;
  player.y = p.y + dragOffset.y;
  clampPlayer();
});

canvas.addEventListener("pointerup", () => {
  dragging = false;
  // 모바일은 포탈 위에서 손 떼면 즉시 입장
  if (activePortal && isTouchDevice()) {
    location.href = activePortal.url;
  }
});

function getPointer(e) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

function isTouchDevice() {
  return (navigator.maxTouchPoints || 0) > 0;
}

function clampPlayer() {
  player.x = Math.max(player.r, Math.min(W - player.r, player.x));
  player.y = Math.max(player.r, Math.min(H - player.r, player.y));
}

function circleRectHit(cx, cy, r, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX, dy = cy - closestY;
  return (dx * dx + dy * dy) <= r * r;
}

/** ====== 배경 오브젝트(구름/불빛 등) ====== */
const clouds = Array.from({ length: 7 }, () => ({
  x: Math.random() * 1400,
  y: 40 + Math.random() * 180,
  s: 0.6 + Math.random() * 1.2,
  v: 10 + Math.random() * 18
}));

const twinkles = Array.from({ length: 48 }, () => ({
  x: Math.random(),
  y: Math.random() * 0.55,
  t: Math.random() * 10
}));

let activePortal = null;

/** ====== FPS 표시 ====== */
let lastT = performance.now();
let acc = 0, frames = 0;
let fps = 0;

function update(dt, t) {
  // 키보드 이동(드래그 중이면 키보드 이동 off)
  if (!dragging) {
    let ax = 0, ay = 0;
    if (keys.has("a") || keys.has("arrowleft")) ax -= 1;
    if (keys.has("d") || keys.has("arrowright")) ax += 1;
    if (keys.has("w") || keys.has("arrowup")) ay -= 1;
    if (keys.has("s") || keys.has("arrowdown")) ay += 1;

    if (ax !== 0) player.facing = ax < 0 ? -1 : 1;

    const len = Math.hypot(ax, ay) || 1;
    player.x += (ax / len) * player.speed;
    player.y += (ay / len) * player.speed;
    clampPlayer();
  }

  // 플레이어 바운스 애니
  player.bob += dt * 6.5;

  // 구름 이동
  for (const c of clouds) {
    c.x += (c.v * dt) * 0.8;
    if (c.x - 180 * c.s > W + 200) {
      c.x = -240 * c.s;
      c.y = 40 + Math.random() * 200;
      c.s = 0.6 + Math.random() * 1.2;
      c.v = 10 + Math.random() * 18;
    }
  }

  // 포탈 충돌 체크
  activePortal = null;
  for (const p of portals) {
    if (circleRectHit(player.x, player.y, player.r, p)) {
      activePortal = p;
      break;
    }
  }

  if (activePortal) {
    toast.hidden = false;
    toast.innerHTML = `입장: <b>${activePortal.label}</b> · PC는 <b>Enter/E</b> · 모바일은 <b>손 떼기</b>`;
  } else {
    toast.hidden = true;
  }

  coordEl.textContent = `x: ${Math.round(player.x)} · y: ${Math.round(player.y)}`;

  // fps
  acc += dt; frames++;
  if (acc >= 0.45) {
    fps = Math.round(frames / acc);
    fpsEl.textContent = `fps: ${fps}`;
    acc = 0; frames = 0;
  }
}

function draw(t) {
  ctx.clearRect(0, 0, W, H);

  // ========== 배경 그라데이션 (밤하늘) ==========
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#111b3f");
  g.addColorStop(0.55, "#0b1533");
  g.addColorStop(1, "#070a16");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // ========== 별 반짝임 ==========
  for (const s of twinkles) {
    const px = s.x * W;
    const py = s.y * H;
    const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.4 + s.t));
    ctx.globalAlpha = a;
    ctx.fillStyle = "white";
    ctx.fillRect(px, py, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;

  // ========== 구름 ==========
  for (const c of clouds) {
    drawCloud(c.x, c.y, 110 * c.s, 42 * c.s, 0.10);
  }

  // ========== 멀리 산/도시 실루엣 ==========
  drawDistantHills(t);

  // ========== 아파트(도시) ==========
  drawApartments(t);

  // ========== 놀이공원(관람차/텐트) ==========
  drawAmusement(t);

  // ========== 풀숲(전경) ==========
  drawBushes(t);

  // ========== 포탈(미니게임 입구) ==========
  for (const p of portals) drawPortal(p, t);

  // ========== 플레이어(미니미) ==========
  drawMinimi(player.x, player.y, player.facing, player.bob);

  // ========== 커서(미니미 커서) ==========
  // 터치 디바이스에선 커서 개념이 없으니, 마우스가 캔버스 안에 있고 최근 움직였을 때만 표시
  if (!isTouchDevice() && pointer.active) {
    const idle = (performance.now() - pointer.lastMoveAt) > 1500;
    if (!idle) drawCursorMinimi(pointer.x, pointer.y, t);
  }

  // ========== 가장자리 비네팅 ==========
  vignette();
}

/** ====== 드로잉 유틸 ====== */
function drawCloud(x, y, w, h, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.38, h * 0.55, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.22, y - h * 0.15, w * 0.32, h * 0.52, 0, 0, Math.PI * 2);
  ctx.ellipse(x + w * 0.45, y, w * 0.36, h * 0.52, 0, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDistantHills(t) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#08102a";
  ctx.beginPath();
  ctx.moveTo(0, H * 0.62);
  for (let i = 0; i <= 8; i++) {
    const x = (i / 8) * W;
    const y = H * (0.58 + 0.06 * Math.sin(t * 0.25 + i));
    ctx.quadraticCurveTo(x, y, x + W / 8, H * 0.62);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawApartments(t) {
  const baseY = H * 0.70;
  ctx.save();
  ctx.globalAlpha = 0.9;

  // 건물 블록들
  const blocks = [
    { x: W * 0.07, w: W * 0.16, h: H * 0.22 },
    { x: W * 0.25, w: W * 0.13, h: H * 0.18 },
    { x: W * 0.82, w: W * 0.11, h: H * 0.20 },
    { x: W * 0.68, w: W * 0.12, h: H * 0.16 },
  ];

  for (const b of blocks) {
    const x = b.x, y = baseY - b.h;
    roundRect(x, y, b.w, b.h, 10);

    const g = ctx.createLinearGradient(x, y, x, y + b.h);
    g.addColorStop(0, "rgba(255,255,255,0.08)");
    g.addColorStop(1, "rgba(255,255,255,0.03)");
    ctx.fillStyle = g;
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 창문 불빛(반짝)
    const cols = Math.max(4, Math.floor(b.w / 22));
    const rows = Math.max(5, Math.floor(b.h / 20));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const wx = x + 10 + c * (b.w - 20) / cols;
        const wy = y + 12 + r * (b.h - 24) / rows;
        const on = (Math.sin(t * 1.6 + r * 0.9 + c * 1.4) > 0.35);
        ctx.fillStyle = on ? "rgba(255,220,120,0.55)" : "rgba(255,255,255,0.06)";
        ctx.fillRect(wx, wy, 7, 10);
      }
    }
  }

  ctx.restore();

  // 지면 라인
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.moveTo(0, baseY);
  ctx.lineTo(W, baseY);
  ctx.stroke();
  ctx.restore();
}

function drawAmusement(t) {
  const ground = H * 0.70;

  // 관람차
  const fx = W * 0.52;
  const fy = ground - H * 0.13;
  const R = Math.min(W, H) * 0.10;

  ctx.save();
  ctx.globalAlpha = 0.9;

  // 받침대
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(fx - R * 0.55, ground);
  ctx.lineTo(fx, fy + R * 0.25);
  ctx.lineTo(fx + R * 0.55, ground);
  ctx.stroke();

  // 바퀴
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.arc(fx, fy, R, 0, Math.PI * 2);
  ctx.stroke();

  const rot = t * 0.55;
  // 스포크
  for (let i = 0; i < 10; i++) {
    const a = rot + (i / 10) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(fx, fy);
    ctx.lineTo(fx + Math.cos(a) * R, fy + Math.sin(a) * R);
    ctx.stroke();
  }

  // 캐빈(불빛)
  for (let i = 0; i < 10; i++) {
    const a = rot + (i / 10) * Math.PI * 2;
    const cx = fx + Math.cos(a) * R;
    const cy = fy + Math.sin(a) * R;
    const blink = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2.0 + i));
    ctx.fillStyle = `rgba(255,220,120,${0.10 + 0.25 * blink})`;
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  // 입구 텐트
  const tx = W * 0.58;
  const ty = ground - H * 0.06;
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  roundRect(tx, ty, W * 0.11, H * 0.06, 12);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.stroke();

  // 전구 라인
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(W * 0.42, ground - H * 0.22);
  ctx.quadraticCurveTo(W * 0.52, ground - H * 0.27, W * 0.66, ground - H * 0.20);
  ctx.stroke();

  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    const lx = lerp3(W * 0.42, W * 0.52, W * 0.66, u);
    const ly = quadY(ground - H * 0.22, ground - H * 0.27, ground - H * 0.20, u);
    const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(t * 3.2 + i));
    ctx.fillStyle = `rgba(255,220,120,${0.12 + 0.26 * pulse})`;
    ctx.beginPath();
    ctx.arc(lx, ly, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawBushes(t) {
  const base = H * 0.74;
  ctx.save();

  // 전경 풀숲 흔들림
  for (let i = 0; i < 18; i++) {
    const x = (i / 17) * W;
    const sway = Math.sin(t * 1.7 + i) * 8;
    const h = H * (0.10 + 0.06 * Math.sin(i * 0.9));
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = "rgba(120,220,160,0.14)";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, base + 55);
    ctx.quadraticCurveTo(x + sway, base - h, x + sway * 0.2, base + 30);
    ctx.stroke();
  }

  // 바닥 그림자 그라데이션
  const g = ctx.createLinearGradient(0, base, 0, H);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = g;
  ctx.fillRect(0, base, W, H - base);

  ctx.restore();
}

function drawPortal(p, t) {
  const glow = (activePortal === p) ? 1 : 0.55;
  const pulse = 0.65 + 0.35 * Math.sin(t * 3.0);

  // 그림자
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "black";
  roundRect(p.x + 6, p.y + 8, p.w, p.h, 16);
  ctx.fill();
  ctx.restore();

  // 본체
  ctx.save();
  const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
  g.addColorStop(0, "rgba(255,255,255,0.10)");
  g.addColorStop(1, "rgba(255,255,255,0.05)");
  ctx.fillStyle = g;
  ctx.strokeStyle = (activePortal === p)
    ? `rgba(255,220,120,${0.55 + 0.35 * pulse})`
    : "rgba(255,255,255,0.20)";
  ctx.lineWidth = 2;
  roundRect(p.x, p.y, p.w, p.h, 16);
  ctx.fill();
  ctx.stroke();

  // 라벨
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = `600 ${Math.max(13, Math.floor(p.h * 0.16))}px system-ui`;
  ctx.fillText(p.label, p.x + 14, p.y + 30);

  // 서브텍스트
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = `400 ${Math.max(11, Math.floor(p.h * 0.12))}px system-ui`;
  const sub = isTouchDevice() ? "손 떼면 입장" : "Enter/E로 입장";
  ctx.fillText(sub, p.x + 14, p.y + 52);

  // 포탈 내부 반짝임
  ctx.globalAlpha = 0.35 * glow;
  ctx.fillStyle = `rgba(255,220,120,${0.10 + 0.08 * pulse})`;
  roundRect(p.x + 10, p.y + 62, p.w - 20, p.h - 74, 12);
  ctx.fill();

  ctx.restore();
}

function drawMinimi(x, y, facing, bobT) {
  const bob = Math.sin(bobT) * 3;

  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(facing, 1);

  // 그림자
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.ellipse(0, 18, 16, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 몸통
  ctx.fillStyle = "rgba(120,200,255,0.95)";
  roundRect(-12, -2, 24, 26, 10);
  ctx.fill();

  // 머리
  ctx.fillStyle = "rgba(160,220,255,0.95)";
  ctx.beginPath();
  ctx.arc(0, -16, 16, 0, Math.PI * 2);
  ctx.fill();

  // 머리 하이라이트
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(-6, -22, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 눈
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.beginPath();
  ctx.arc(-5, -18, 2.2, 0, Math.PI * 2);
  ctx.arc(5, -18, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // 볼
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "rgba(255,120,160,0.9)";
  ctx.beginPath();
  ctx.arc(-9, -14, 3.2, 0, Math.PI * 2);
  ctx.arc(9, -14, 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // 팔
  ctx.strokeStyle = "rgba(160,220,255,0.9)";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  const wave = Math.sin(bobT * 1.2) * 3;
  ctx.beginPath();
  ctx.moveTo(-12, 6);
  ctx.lineTo(-20, 10 + wave);
  ctx.moveTo(12, 6);
  ctx.lineTo(20, 10 - wave);
  ctx.stroke();

  ctx.restore();
}

function drawCursorMinimi(x, y, t) {
  ctx.save();
  ctx.translate(x + 14, y + 16); // 포인터보다 살짝 아래/오른쪽

  // 링(커서 느낌)
  const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 5));
  ctx.globalAlpha = 0.25 + 0.15 * pulse;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.stroke();

  // 미니미 커서(작은 캐릭터)
  ctx.globalAlpha = 0.95;
  ctx.scale(0.72, 0.72);
  drawMinimi(0, 0, 1, t * 4.5);

  ctx.restore();
}

function vignette() {
  ctx.save();
  const g = ctx.createRadialGradient(W * 0.5, H * 0.55, Math.min(W, H) * 0.35, W * 0.5, H * 0.55, Math.min(W, H) * 0.85);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.35)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

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

function lerp(a, b, t) { return a + (b - a) * t; }

// 2차 베지어 y(시각용)
function quadY(y0, y1, y2, t) {
  const a = lerp(y0, y1, t);
  const b = lerp(y1, y2, t);
  return lerp(a, b, t);
}
// 3점 보간 x (대충 곡선 위치에 맞추기)
function lerp3(x0, x1, x2, t) {
  const a = lerp(x0, x1, t);
  const b = lerp(x1, x2, t);
  return lerp(a, b, t);
}

/** ====== 메인 루프 ====== */
function loop(now) {
  const t = now / 1000;
  const dt = Math.min(0.033, (now - lastT) / 1000);
  lastT = now;

  update(dt, t);
  draw(t);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
