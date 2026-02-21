/* HUN.JS - LEGO PREMIUM (single-file) v2.1
 * 적용사항(요청 반영)
 * - 미니피규어 옆모습: 한쪽 팔만 보이게 + 다리도 옆 방향 형태(전/후 가려짐 포함)
 * - 캡모자: 머리에 “정확히” 씌운 형태(브림/크라운 위치 고정, 둥둥 뜸 제거)
 * - 간판 텍스트: 명도/대비 강화(가독성↑) + LED 글로우
 * - 초록 바닥의 나무 그림자 “빤짝거림” 제거: 랜덤 패치 고정(시드) + AO 안정화
 * - 나무 수 30% 감소
 * - 건물 더 고급: 전면 패널/코너/프레임/창문/간판 프레임 강화
 * - 포탈 앞 테마 오브젝트(양궁=활/과녁, 장기=장기알, 오목=오목돌) + NPC도 유지
 * - 상점 추가: 맥도날드/병원/치킨집 (status: soon 기본, 원하면 url 넣기)
 * - 포탈/상점 입장 UI: 좌측 큰 흰 박스 제거 → 중앙에 글자만(블록 느낌)
 * - 모바일: D-Pad 유지, 드래그 이동 금지, 속도 느리게
 */

(() => {
  "use strict";

  /* ----------------------- Utilities ----------------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function shade(hex, amt) {
    const h = hex.replace("#", "");
    const r = clamp(parseInt(h.slice(0, 2), 16) + amt, 0, 255);
    const g = clamp(parseInt(h.slice(2, 4), 16) + amt, 0, 255);
    const b = clamp(parseInt(h.slice(4, 6), 16) + amt, 0, 255);
    return `rgb(${r},${g},${b})`;
  }
  function hash01(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 1000) / 1000;
  }
  function isTouchDevice() {
    return (navigator.maxTouchPoints || 0) > 0;
  }

  // deterministic RNG (for stable patches/shadows)
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6D2B79F5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
  }
  function seedFromWorld(w, h) {
    return ((w * 73856093) ^ (h * 19349663)) >>> 0;
  }

  /* ----------------------- Safe DOM (no HTML edits) ----------------------- */
  function ensureEl(id, tag, parent = document.body) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement(tag);
      el.id = id;
      parent.appendChild(el);
    }
    return el;
  }

  function ensureUI() {
    const canvas = ensureEl("world", "canvas");
    canvas.style.display = "block";
    canvas.style.width = canvas.style.width || "100%";
    canvas.style.height = canvas.style.height || "640px";
    canvas.style.borderRadius = canvas.style.borderRadius || "18px";
    canvas.style.background = canvas.style.background || "#eaf6ff";
    canvas.style.touchAction = "none";

    const toast = ensureEl("toast", "div");
    toast.style.position = "fixed";
    toast.style.left = "24px";
    toast.style.top = "78px";
    toast.style.zIndex = "9999";
    toast.style.padding = "10px 12px";
    toast.style.borderRadius = "14px";
    toast.style.background = "rgba(255,255,255,0.90)";
    toast.style.border = "1px solid rgba(0,0,0,0.10)";
    toast.style.boxShadow = "0 14px 38px rgba(0,0,0,0.12)";
    toast.style.font = "1000 13px system-ui";
    toast.style.color = "rgba(10,18,30,0.90)";
    toast.style.maxWidth = "420px";
    toast.hidden = true;

    const coord = ensureEl("coord", "div");
    coord.style.position = "fixed";
    coord.style.left = "24px";
    coord.style.top = "24px";
    coord.style.zIndex = "9999";
    coord.style.padding = "8px 10px";
    coord.style.borderRadius = "12px";
    coord.style.background = "rgba(255,255,255,0.86)";
    coord.style.border = "1px solid rgba(0,0,0,0.10)";
    coord.style.font = "900 12px system-ui";
    coord.style.color = "rgba(10,18,30,0.80)";

    const fps = ensureEl("fps", "div");
    fps.style.position = "fixed";
    fps.style.left = "140px";
    fps.style.top = "24px";
    fps.style.zIndex = "9999";
    fps.style.padding = "8px 10px";
    fps.style.borderRadius = "12px";
    fps.style.background = "rgba(255,255,255,0.86)";
    fps.style.border = "1px solid rgba(0,0,0,0.10)";
    fps.style.font = "900 12px system-ui";
    fps.style.color = "rgba(10,18,30,0.80)";

    const fade = ensureEl("fade", "div");
    fade.style.position = "fixed";
    fade.style.inset = "0";
    fade.style.zIndex = "9998";
    fade.style.pointerEvents = "none";
    fade.style.opacity = "0";
    fade.style.transition = "opacity 240ms ease";
    fade.style.background = "#ffffff";

    // modal overlay (center text only)
    const modal = ensureEl("lego_modal", "div");
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.zIndex = "10000";
    modal.style.display = "none";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.background = "transparent";
    modal.style.backdropFilter = "none";

    const modalInner = ensureEl("lego_modal_inner", "div", modal);
    modalInner.style.width = "min(620px, calc(100vw - 40px))";
    modalInner.style.borderRadius = "0";
    modalInner.style.background = "transparent";
    modalInner.style.border = "none";
    modalInner.style.boxShadow = "none";
    modalInner.style.padding = "0";
    modalInner.style.textAlign = "center";
    modalInner.style.font = "1100 18px system-ui";
    modalInner.style.color = "rgba(10,18,30,0.92)";
    modalInner.style.userSelect = "none";

    const modalTitle = ensureEl("lego_modal_title", "div", modalInner);
    modalTitle.style.font = "1100 22px system-ui";
    modalTitle.style.marginBottom = "10px";
    modalTitle.style.letterSpacing = "0.6px";

    const modalBody = ensureEl("lego_modal_body", "div", modalInner);
    modalBody.style.font = "1100 18px system-ui";
    modalBody.style.opacity = "0.92";
    modalBody.style.marginBottom = "10px";
    modalBody.style.lineHeight = "1.35";
    modalBody.style.letterSpacing = "0.8px";

    const modalHint = ensureEl("lego_modal_hint", "div", modalInner);
    modalHint.style.font = "1000 13px system-ui";
    modalHint.style.opacity = "0.70";

    const style = ensureEl("lego_style_injected", "style", document.head);
    style.textContent = `
      #fade.on { opacity: 1; }
      #lego_modal { animation: legoPop 160ms ease both; }
      @keyframes legoPop { from{opacity:0; transform: translateY(8px);} to{opacity:1; transform: translateY(0);} }
      * { -webkit-tap-highlight-color: transparent; }
      #dpad button:active { transform: translateY(1px) scale(0.98); }
    `;

    // Mobile D-Pad
    const dpad = ensureEl("dpad", "div");
    dpad.style.position = "fixed";
    dpad.style.right = "18px";
    dpad.style.bottom = "18px";
    dpad.style.zIndex = "10001";
    dpad.style.display = isTouchDevice() ? "grid" : "none";
    dpad.style.gridTemplateColumns = "56px 56px 56px";
    dpad.style.gridTemplateRows = "56px 56px 56px";
    dpad.style.gap = "10px";
    dpad.style.userSelect = "none";

    function mkBtn(id, label) {
      const b = ensureEl(id, "button", dpad);
      b.type = "button";
      b.textContent = label;
      b.style.width = "56px";
      b.style.height = "56px";
      b.style.borderRadius = "18px";
      b.style.border = "1px solid rgba(0,0,0,0.12)";
      b.style.background = "rgba(255,255,255,0.92)";
      b.style.boxShadow = "0 18px 44px rgba(0,0,0,0.16)";
      b.style.font = "1100 18px system-ui";
      b.style.color = "rgba(10,18,30,0.9)";
      b.style.touchAction = "none";
      b.style.backdropFilter = "blur(6px)";
      return b;
    }

    const bUp = mkBtn("dpad_up", "↑");
    const bLeft = mkBtn("dpad_left", "←");
    const bMid = mkBtn("dpad_mid", "●");
    const bRight = mkBtn("dpad_right", "→");
    const bDown = mkBtn("dpad_down", "↓");

    bUp.style.gridColumn = "2";
    bUp.style.gridRow = "1";
    bLeft.style.gridColumn = "1";
    bLeft.style.gridRow = "2";
    bMid.style.gridColumn = "2";
    bMid.style.gridRow = "2";
    bRight.style.gridColumn = "3";
    bRight.style.gridRow = "2";
    bDown.style.gridColumn = "2";
    bDown.style.gridRow = "3";

    bMid.style.opacity = "0.55";
    bMid.style.fontSize = "16px";

    const vkeys = { up: false, down: false, left: false, right: false };

    function bindHold(btn, key) {
      const on = (e) => {
        e.preventDefault();
        vkeys[key] = true;
      };
      const off = (e) => {
        e.preventDefault();
        vkeys[key] = false;
      };
      btn.addEventListener("pointerdown", on);
      btn.addEventListener("pointerup", off);
      btn.addEventListener("pointercancel", off);
      btn.addEventListener("pointerleave", off);
    }
    bindHold(bUp, "up");
    bindHold(bDown, "down");
    bindHold(bLeft, "left");
    bindHold(bRight, "right");

    return { canvas, toast, coord, fps, fade, modal, modalTitle, modalBody, modalHint, vkeys };
  }

  /* ----------------------- Start ----------------------- */
  window.addEventListener("DOMContentLoaded", () => {
    const UI = ensureUI();
    const canvas = UI.canvas;
    const ctx = canvas.getContext("2d");

    let W = 0,
      H = 0,
      DPR = 1;

    const VIEW = { zoom: 0.86, w: 0, h: 0 };
    const WORLD = { w: 2400, h: 1700, margin: 120 };

    const cam = { x: 0, y: 0, targetX: 0, targetY: 0 };
    function screenToWorld(sx, sy) {
      return { x: sx + cam.x, y: sy + cam.y };
    }

    /* ----------------------- Portals + Shops ----------------------- */
    const portals = [
      // minigame
      { key: "avoid", label: "미니게임 피하기", status: "open", url: "https://faglobalxgp2024-design.github.io/index.html/", type: "arcade", size: "L", x: 0, y: 0, w: 0, h: 0 },
      { key: "archery", label: "미니게임 양궁", status: "open", url: "https://ttjdwls777-eng.github.io/XGP-MINI-GAME2/", type: "tower", size: "M", x: 0, y: 0, w: 0, h: 0 },
      { key: "janggi", label: "미니게임 장기", status: "open", url: "https://faglobalxgp2024-design.github.io/MINIGAME/", type: "dojo", size: "L", x: 0, y: 0, w: 0, h: 0 },
      { key: "jump", label: "미니게임 점프하기", status: "soon", url: "", type: "gym", size: "S", x: 0, y: 0, w: 0, h: 0 },
      { key: "snow", label: "미니게임 눈굴리기", status: "soon", url: "", type: "igloo", size: "M", x: 0, y: 0, w: 0, h: 0 },
      { key: "omok", label: "미니게임 오목", status: "soon", url: "", type: "cafe", size: "M", x: 0, y: 0, w: 0, h: 0 },

      // shops (new)
      { key: "mcd", label: "맥도날드", status: "soon", url: "", type: "mcd", size: "M", x: 0, y: 0, w: 0, h: 0 },
      { key: "hospital", label: "병원", status: "soon", url: "", type: "hospital", size: "M", x: 0, y: 0, w: 0, h: 0 },
      { key: "chicken", label: "치킨집", status: "soon", url: "", type: "chicken", size: "M", x: 0, y: 0, w: 0, h: 0 }
    ];
    const portalsByKey = (k) => portals.find((p) => p.key === k);

    /* ----------------------- Player (LEGO minifig) ----------------------- */
    const player = {
      x: 360,
      y: 360,
      r: 18,
      speed: 250,
      moving: false,
      animT: 0,
      bobT: 0,
      dir: "down" // up/down/left/right
    };
    if (isTouchDevice()) player.speed = 185;

    let activePortal = null;
    let entering = false;

    /* ----------------------- Input ----------------------- */
    const keys = new Set();
    let dragging = false;
    let dragOffset = { x: 0, y: 0 };

    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      keys.add(k);

      if (k === "enter" || k === "e") {
        if (modalState.open && modalState.portal) confirmEnter(modalState.portal);
        else if (activePortal) openPortalUI(activePortal);
      }
      if (k === "escape") closeModal();
    });
    window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

    function getPointer(e) {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / VIEW.zoom, y: (e.clientY - r.top) / VIEW.zoom };
    }

    // drag player (PC only)
    canvas.addEventListener("pointerdown", (e) => {
      if (isTouchDevice()) return;
      const p = getPointer(e);
      const w = screenToWorld(p.x, p.y);
      const dx = w.x - player.x,
        dy = w.y - player.y;
      if (dx * dx + dy * dy <= (player.r + 18) * (player.r + 18)) {
        dragging = true;
        dragOffset.x = player.x - w.x;
        dragOffset.y = player.y - w.y;
        canvas.setPointerCapture(e.pointerId);
      }
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const p = getPointer(e);
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
    });

    function clampPlayerToWorld() {
      player.x = clamp(player.x, WORLD.margin, WORLD.w - WORLD.margin);
      player.y = clamp(player.y, WORLD.margin, WORLD.h - WORLD.margin);
    }

    /* ----------------------- Roads / Sidewalks ----------------------- */
    const roads = [];
    const sidewalks = [];
    const crossings = [];

    /* ----------------------- Cars ----------------------- */
    const cars = [];
    const CAR_COLORS = ["#ff3b30", "#ffcc00", "#34c759", "#0a84ff", "#af52de", "#ff2d55", "#ffffff"];

    function seedCars() {
      cars.length = 0;
      const hr = roads[0];
      const vr = roads[1];
      if (!hr || !vr) return;

      const makeCar = (axis) => {
        const col = CAR_COLORS[(Math.random() * CAR_COLORS.length) | 0];
        const speed = 92 + Math.random() * 86;

        if (axis === "h") {
          const lane = Math.random() < 0.5 ? 0 : 1;
          const dir = Math.random() < 0.5 ? 1 : -1;
          return { kind: "car", axis: "h", dir, color: col, speed, w: 56 + Math.random() * 18, h: 26 + Math.random() * 7, x: hr.x + Math.random() * hr.w, y: hr.y + (lane === 0 ? hr.h * 0.38 : hr.h * 0.66), bob: Math.random() * 10 };
        } else {
          const lane = Math.random() < 0.5 ? 0 : 1;
          const dir = Math.random() < 0.5 ? 1 : -1;
          return { kind: "car", axis: "v", dir, color: col, speed, w: 26 + Math.random() * 7, h: 60 + Math.random() * 18, x: vr.x + (lane === 0 ? vr.w * 0.38 : vr.w * 0.66), y: vr.y + Math.random() * vr.h, bob: Math.random() * 10 };
        }
      };

      for (let i = 0; i < 7; i++) cars.push(makeCar("h"));
      for (let i = 0; i < 6; i++) cars.push(makeCar("v"));
    }

    /* ----------------------- Props ----------------------- */
    const props = [];
    const signs = [];
    let portalNPCs = [];
    let portalEmblems = [];

    function seedProps() {
      props.length = 0;
      signs.length = 0;
      portalNPCs = [];
      portalEmblems = [];

      const tries = 240;
      const isOnRoadLike = (x, y) => {
        for (const r of roads) {
          if (x >= r.x - 18 && x <= r.x + r.w + 18 && y >= r.y - 18 && y <= r.y + r.h + 18) return true;
        }
        return false;
      };

      for (let i = 0; i < tries; i++) {
        const x = WORLD.margin + Math.random() * (WORLD.w - WORLD.margin * 2);
        const y = WORLD.margin + Math.random() * (WORLD.h - WORLD.margin * 2);
        if (isOnRoadLike(x, y)) continue;

        const r = Math.random();
        // ✅ 나무 30% 감소(기존 대비 더 적게)
        if (r < 0.29) props.push({ kind: "tree", x, y, s: 0.90 + Math.random() * 1.05 });
        else if (r < 0.45) props.push({ kind: "lamp", x, y, s: 0.9 + Math.random() * 0.55 });
        else if (r < 0.56) props.push({ kind: "bench", x, y, s: 0.9 + Math.random() * 0.35 });
        else props.push({ kind: "flower", x, y, s: 0.9 + Math.random() * 1.1 });
      }

      for (const p of portals) {
        props.push({ kind: "flower", x: p.x + p.w * 0.20, y: p.y + p.h + 28, s: 1.2 });
        props.push({ kind: "flower", x: p.x + p.w * 0.80, y: p.y + p.h + 18, s: 1.1 });
      }

      const arch = portalsByKey("archery");
      const jang = portalsByKey("janggi");
      if (arch) signs.push({ x: arch.x + arch.w * 0.5 - 10, y: arch.y + arch.h + 90, text: "양궁 →" });
      if (jang) signs.push({ x: jang.x + jang.w * 0.5 + 10, y: jang.y + jang.h + 90, text: "← 장기" });

      // NPC + Emblems
      for (const p of portals) {
        const ex = p.x + p.w * 0.5;
        const ey = p.y + p.h * 0.92;

        if (["archery", "janggi", "omok"].includes(p.key)) {
          portalNPCs.push({ kind: "npc", key: p.key, x: p.x + p.w + 36, y: p.y + p.h * 0.74 });
        }

        // emblem object right in front
        portalEmblems.push({
          kind: "emblem",
          key: p.key,
          x: ex + 38,
          y: ey + 18
        });
      }
    }

    /* ----------------------- Stable ground patches (no flicker) ----------------------- */
    let groundPatches = [];
    function buildGroundPatches() {
      const rand = mulberry32(seedFromWorld(WORLD.w, WORLD.h) ^ 0xA13F0C55);
      groundPatches = [];
      for (let i = 0; i < 14; i++) {
        groundPatches.push({
          x: WORLD.w * 0.12 + rand() * WORLD.w * 0.76,
          y: WORLD.h * 0.38 + rand() * WORLD.h * 0.54,
          rx: 60 + rand() * 130,
          ry: 20 + rand() * 44,
          rot: (rand() - 0.5) * 0.6,
          a: 0.34 + rand() * 0.12
        });
      }
    }

    /* ----------------------- Footprints ----------------------- */
    const footprints = [];
    let footStepAcc = 0;
    function addFootprint(dt) {
      if (!player.moving) {
        footStepAcc = 0;
        return;
      }
      footStepAcc += dt * (player.speed / 220);
      if (footStepAcc < 0.12) return;
      footStepAcc = 0;

      let ox = 0,
        oy = 0;
      if (player.dir === "up") oy = 8;
      else if (player.dir === "down") oy = -6;
      else if (player.dir === "left") ox = 8;
      else if (player.dir === "right") ox = -8;

      footprints.push({ x: player.x + ox + (Math.random() - 0.5) * 2, y: player.y + 30 + oy + (Math.random() - 0.5) * 2, life: 1.2, age: 0 });
    }

    /* ----------------------- Background layers ----------------------- */
    const clouds = Array.from({ length: 10 }, () => ({ x: Math.random() * 3200, y: 40 + Math.random() * 230, s: 0.7 + Math.random() * 1.2, v: 9 + Math.random() * 16, layer: Math.random() < 0.5 ? 0 : 1 }));
    const birds = Array.from({ length: 6 }, () => ({ x: 0, y: 0, p: Math.random() * 10, v: 22 + Math.random() * 20 }));

    /* ----------------------- Patterns ----------------------- */
    let grassPattern = null,
      dirtPattern = null,
      roadPattern = null,
      sidewalkPattern = null;

    function makePattern(w, h, drawFn) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      drawFn(g, w, h);
      return ctx.createPattern(c, "repeat");
    }

    function buildPatterns() {
      grassPattern = makePattern(240, 240, (g, w, h) => {
        g.fillStyle = "#39d975";
        g.fillRect(0, 0, w, h);

        g.globalAlpha = 0.16;
        g.strokeStyle = "rgba(0,0,0,0.16)";
        g.lineWidth = 2;
        for (let x = 0; x <= w; x += 48) {
          g.beginPath();
          g.moveTo(x, 0);
          g.lineTo(x, h);
          g.stroke();
        }
        for (let y = 0; y <= h; y += 48) {
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(w, y);
          g.stroke();
        }

        g.globalAlpha = 0.10;
        for (let i = 0; i < 70; i++) {
          g.fillStyle = i % 3 === 0 ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.12)";
          g.beginPath();
          g.arc(Math.random() * w, Math.random() * h, 0.8 + Math.random() * 1.5, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
      });

      dirtPattern = makePattern(240, 240, (g, w, h) => {
        g.fillStyle = "#c79a64";
        g.fillRect(0, 0, w, h);
        g.globalAlpha = 0.20;
        for (let i = 0; i < 200; i++) {
          g.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";
          g.beginPath();
          g.arc(Math.random() * w, Math.random() * h, 0.8 + Math.random() * 2.4, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
      });

      roadPattern = makePattern(240, 240, (g, w, h) => {
        g.fillStyle = "#2a2f3b";
        g.fillRect(0, 0, w, h);

        g.globalAlpha = 0.12;
        g.strokeStyle = "rgba(255,255,255,0.14)";
        g.lineWidth = 2;
        for (let y = 0; y <= h; y += 40) {
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(w, y);
          g.stroke();
        }
        g.globalAlpha = 1;

        g.globalAlpha = 0.22;
        g.fillStyle = "rgba(255,255,255,0.75)";
        for (let x = 0; x < w; x += 40) g.fillRect(x + 12, h / 2 - 2, 14, 4);
        g.globalAlpha = 1;
      });

      sidewalkPattern = makePattern(240, 240, (g, w, h) => {
        g.fillStyle = "#f6efe6";
        g.fillRect(0, 0, w, h);
        g.globalAlpha = 0.14;
        g.strokeStyle = "rgba(0,0,0,0.18)";
        g.lineWidth = 1;
        for (let x = 0; x <= w; x += 24) {
          g.beginPath();
          g.moveTo(x, 0);
          g.lineTo(x, h);
          g.stroke();
        }
        for (let y = 0; y <= h; y += 24) {
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(w, y);
          g.stroke();
        }
        g.globalAlpha = 1;
      });
    }

    /* ----------------------- Shape helpers ----------------------- */
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
    function glossyHighlight(x, y, w, h, alpha = 0.16) {
      ctx.save();
      ctx.globalAlpha = alpha;
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, "rgba(255,255,255,0.85)");
      g.addColorStop(0.35, "rgba(255,255,255,0.20)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      roundRect(x + 6, y + 6, w - 12, Math.max(18, h * 0.35), 14);
      ctx.fill();
      ctx.restore();
    }
    function groundAO(x, y, w, h, alpha = 0.22) {
      // ✅ flicker 방지: 랜덤/시간 사용 없이 고정 그라데이션만
      ctx.save();
      const g = ctx.createRadialGradient(x + w * 0.5, y + h * 0.8, 10, x + w * 0.5, y + h * 0.8, Math.max(w, h) * 0.9);
      g.addColorStop(0, `rgba(10,14,24,${alpha})`);
      g.addColorStop(1, "rgba(10,14,24,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - 120, y - 120, w + 240, h + 240);
      ctx.restore();
    }
    function legoBox3D(x, y, w, h, depth, baseColor) {
      const edge = "rgba(0,0,0,0.18)";
      ctx.save();
      ctx.strokeStyle = edge;
      ctx.lineWidth = 2;

      // front
      ctx.fillStyle = baseColor;
      roundRect(x, y, w, h, 18);
      ctx.fill();
      ctx.stroke();

      // top
      ctx.fillStyle = shade(baseColor, +18);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + depth, y - depth);
      ctx.lineTo(x + w + depth, y - depth);
      ctx.lineTo(x + w, y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // side
      ctx.fillStyle = shade(baseColor, -20);
      ctx.beginPath();
      ctx.moveTo(x + w, y);
      ctx.lineTo(x + w + depth, y - depth);
      ctx.lineTo(x + w + depth, y + h - depth);
      ctx.lineTo(x + w, y + h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      glossyHighlight(x, y, w, h, 0.10);
      ctx.restore();
    }

    /* ----------------------- World layout ----------------------- */
    function layoutWorld() {
      WORLD.w = Math.max(3200, Math.floor(W * 3.6));
      WORLD.h = Math.max(2300, Math.floor(H * 3.2));

      const base = 220;
      const mul = { S: 0.82, M: 1.0, L: 1.22 };

      for (const p of portals) {
        const m = mul[p.size] || 1;
        p.w = base * 1.22 * m;
        p.h = base * 0.92 * m;
      }

      // original 6
      portalsByKey("jump").x = WORLD.w * 0.22;
      portalsByKey("jump").y = WORLD.h * 0.22;
      portalsByKey("archery").x = WORLD.w * 0.50;
      portalsByKey("archery").y = WORLD.h * 0.18;
      portalsByKey("omok").x = WORLD.w * 0.78;
      portalsByKey("omok").y = WORLD.h * 0.24;

      portalsByKey("avoid").x = WORLD.w * 0.20;
      portalsByKey("avoid").y = WORLD.h * 0.62;
      portalsByKey("janggi").x = WORLD.w * 0.78;
      portalsByKey("janggi").y = WORLD.h * 0.62;
      portalsByKey("snow").x = WORLD.w * 0.50;
      portalsByKey("snow").y = WORLD.h * 0.80;

      // new shops
      portalsByKey("mcd").x = WORLD.w * 0.12;
      portalsByKey("mcd").y = WORLD.h * 0.36;

      portalsByKey("hospital").x = WORLD.w * 0.88;
      portalsByKey("hospital").y = WORLD.h * 0.40;

      portalsByKey("chicken").x = WORLD.w * 0.12;
      portalsByKey("chicken").y = WORLD.h * 0.78;

      for (const p of portals) {
        p.x -= p.w / 2;
        p.y -= p.h / 2;
        p.x = clamp(p.x, WORLD.margin, WORLD.w - WORLD.margin - p.w);
        p.y = clamp(p.y, WORLD.margin, WORLD.h - WORLD.margin - p.h);
      }

      roads.length = 0;
      sidewalks.length = 0;
      crossings.length = 0;

      roads.push({ x: WORLD.w * 0.10, y: WORLD.h * 0.48, w: WORLD.w * 0.80, h: 132 });
      sidewalks.push({ x: WORLD.w * 0.10, y: WORLD.h * 0.48 - 48, w: WORLD.w * 0.80, h: 38 });
      sidewalks.push({ x: WORLD.w * 0.10, y: WORLD.h * 0.48 + 142, w: WORLD.w * 0.80, h: 38 });

      roads.push({ x: WORLD.w * 0.50 - 64, y: WORLD.h * 0.10, w: 128, h: WORLD.h * 0.82 });
      sidewalks.push({ x: WORLD.w * 0.50 - 64 - 46, y: WORLD.h * 0.10, w: 34, h: WORLD.h * 0.82 });
      sidewalks.push({ x: WORLD.w * 0.50 + 64 + 12, y: WORLD.h * 0.10, w: 34, h: WORLD.h * 0.82 });

      crossings.push({ x: WORLD.w * 0.50 - 92, y: WORLD.h * 0.48 + 32, w: 184, h: 58 });
      crossings.push({ x: WORLD.w * 0.50 - 92, y: WORLD.h * 0.48 - 88, w: 184, h: 58 });

      buildPatterns();
      buildGroundPatches(); // ✅ stable
      seedCars();
      seedProps();

      player.x = clamp(player.x, WORLD.margin + 80, WORLD.w - WORLD.margin - 80);
      player.y = clamp(player.y, WORLD.margin + 80, WORLD.h - WORLD.margin - 80);
    }

    function resize() {
      DPR = Math.max(1, window.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      W = r.width;
      H = r.height;

      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);

      VIEW.w = W / VIEW.zoom;
      VIEW.h = H / VIEW.zoom;

      ctx.setTransform(DPR * VIEW.zoom, 0, 0, DPR * VIEW.zoom, 0, 0);
      layoutWorld();
    }
    window.addEventListener("resize", resize);

    /* ----------------------- Movement / camera ----------------------- */
    function updateDirFromAxes(ax, ay) {
      if (Math.abs(ay) >= Math.abs(ax)) player.dir = ay < 0 ? "up" : "down";
      else player.dir = ax < 0 ? "left" : "right";
    }
    function updateDirFromDelta(dx, dy) {
      if (dx === 0 && dy === 0) return;
      updateDirFromAxes(dx, dy);
    }

    function updateCamera(dt) {
      cam.targetX = player.x - VIEW.w * 0.5;
      cam.targetY = player.y - VIEW.h * 0.56;
      cam.targetX = clamp(cam.targetX, 0, WORLD.w - VIEW.w);
      cam.targetY = clamp(cam.targetY, 0, WORLD.h - VIEW.h);

      const k = 1 - Math.pow(0.0012, dt);
      cam.x += (cam.targetX - cam.x) * k;
      cam.y += (cam.targetY - cam.y) * k;
    }

    /* ----------------------- Portal zones ----------------------- */
    function portalEnterZone(p) {
      const zx = p.x + p.w * 0.50 - 28;
      const zy = p.y + p.h * 0.76;
      return { x: zx, y: zy, w: 56, h: 44 };
    }
    function circleRectHit(cx, cy, r, rect) {
      const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
      const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
      const dx = cx - closestX,
        dy = cy - closestY;
      return dx * dx + dy * dy <= r * r;
    }

    /* ----------------------- Modal ----------------------- */
    const modalState = { open: false, portal: null };
    function openModal(title, body, hint) {
      // ✅ “블록 느낌 글자만” + 글로우
      UI.modalTitle.innerHTML = `<span style="
        padding:8px 14px;
        border-radius:14px;
        border:1px solid rgba(0,0,0,0.12);
        background: rgba(255,255,255,0.88);
        box-shadow: 0 20px 60px rgba(0,0,0,0.18);
        display:inline-block;
      ">${title}</span>`;
      UI.modalBody.innerHTML = `<span style="
        display:inline-block;
        margin-top:10px;
        padding:10px 14px;
        border-radius:14px;
        border:1px solid rgba(0,0,0,0.10);
        background: rgba(10,14,24,0.82);
        color: rgba(255,255,255,0.98);
        text-shadow: 0 0 10px rgba(126,200,255,0.55);
        box-shadow: 0 18px 48px rgba(0,0,0,0.22);
        letter-spacing:1px;
      ">${body}</span>`;
      UI.modalHint.textContent = hint || "";
      UI.modal.style.display = "flex";
      modalState.open = true;
    }
    function closeModal() {
      UI.modal.style.display = "none";
      modalState.open = false;
      modalState.portal = null;
    }
    UI.modal.addEventListener("pointerdown", (e) => {
      if (e.target === UI.modal) closeModal();
    });

    function openPortalUI(p) {
      if (!p) return;

      if (p.status !== "open") {
        openModal(`🧱 ${p.label}`, `오픈 준비중입니다`, isTouchDevice() ? "모바일: 닫으려면 바깥 탭" : "ESC로 닫기");
        modalState.portal = null;
        return;
      }

      modalState.portal = p;
      openModal(`🧱 ${p.label}`, `입장하시겠습니까?<br/><span style="opacity:.9;font-size:14px;">Enter / E</span>`, isTouchDevice() ? "모바일: 화면 탭(또는 손 떼기)" : "PC: Enter 또는 E");
    }

    function confirmEnter(p) {
      if (entering) return;
      if (!p || p.status !== "open" || !p.url) {
        closeModal();
        return;
      }
      closeModal();
      entering = true;
      UI.fade.classList.add("on");
      setTimeout(() => (window.location.href = p.url), 260);
    }

    UI.modal.addEventListener("pointerup", () => {
      if (isTouchDevice() && modalState.open && modalState.portal) confirmEnter(modalState.portal);
    });

    /* ----------------------- Rendering: background ----------------------- */
    function drawSkyWorld(t) {
      const g = ctx.createLinearGradient(0, 0, 0, WORLD.h);
      g.addColorStop(0, "#bfe7ff");
      g.addColorStop(0.55, "#d7f1ff");
      g.addColorStop(1, "#fff2fb");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);

      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.ellipse(WORLD.w * 0.22, WORLD.h * 0.18, 460, 220, 0, 0, Math.PI * 2);
      ctx.ellipse(WORLD.w * 0.72, WORLD.h * 0.16, 520, 240, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.30;
      ctx.strokeStyle = "rgba(10,14,24,0.55)";
      ctx.lineWidth = 2;
      for (const b of birds) {
        const yy = b.y + Math.sin(b.p) * 6;
        const xx = b.x;
        ctx.beginPath();
        ctx.moveTo(xx - 7, yy);
        ctx.quadraticCurveTo(xx, yy - 5, xx + 7, yy);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawCloudsWorld() {
      for (const c of clouds) {
        const a = 0.14 + 0.05 * (c.layer === 0 ? 1.0 : 0.75);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, 80 * c.s, 34 * c.s, 0, 0, Math.PI * 2);
        ctx.ellipse(c.x + 50 * c.s, c.y - 12 * c.s, 70 * c.s, 30 * c.s, 0, 0, Math.PI * 2);
        ctx.ellipse(c.x + 100 * c.s, c.y, 78 * c.s, 32 * c.s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawGroundWorld() {
      ctx.save();
      ctx.fillStyle = grassPattern || "#39d975";
      ctx.fillRect(0, WORLD.h * 0.34, WORLD.w, WORLD.h * 0.66);
      ctx.restore();

      ctx.save();
      const sh = ctx.createLinearGradient(0, WORLD.h * 0.34, 0, WORLD.h);
      sh.addColorStop(0, "rgba(10,14,24,0.00)");
      sh.addColorStop(1, "rgba(10,14,24,0.08)");
      ctx.fillStyle = sh;
      ctx.fillRect(0, WORLD.h * 0.34, WORLD.w, WORLD.h * 0.66);
      ctx.restore();

      // ✅ stable patches (no per-frame random -> no flicker)
      ctx.save();
      ctx.fillStyle = dirtPattern || "#c79a64";
      for (const p of groundPatches) {
        ctx.globalAlpha = p.a;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.rx, p.ry, p.rot, 0, Math.PI * 2);
        ctx.fill();
      }

      // path in front of portals
      ctx.globalAlpha = 0.52;
      for (const po of portals) {
        const cx = po.x + po.w * 0.5;
        const cy = po.y + po.h * 0.90;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 34, 74, 30, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawRoadsAndSidewalks() {
      for (const r of roads) {
        groundAO(r.x, r.y + r.h - 18, r.w, 26, 0.20);

        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        roundRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12, 44);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = roadPattern || "#2a2f3b";
        roundRect(r.x, r.y, r.w, r.h, 40);
        ctx.fill();

        ctx.globalAlpha = 0.16;
        ctx.fillStyle = "rgba(255,255,255,0.32)";
        roundRect(r.x + 8, r.y + 8, r.w - 16, r.h * 0.28, 30);
        ctx.fill();

        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = "rgba(255,255,255,0.90)";
        ctx.lineWidth = 4;
        ctx.setLineDash([18, 16]);
        ctx.beginPath();
        ctx.moveTo(r.x + 26, r.y + r.h / 2);
        ctx.lineTo(r.x + r.w - 26, r.y + r.h / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      for (const s of sidewalks) {
        groundAO(s.x, s.y + s.h - 10, s.w, 20, 0.14);
        ctx.save();
        ctx.fillStyle = sidewalkPattern || "#f6efe6";
        roundRect(s.x, s.y, s.w, s.h, 18);
        ctx.fill();

        ctx.globalAlpha = 0.12;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        roundRect(s.x + 4, s.y + 3, s.w - 8, Math.max(8, s.h * 0.35), 14);
        ctx.fill();
        ctx.restore();
      }

      for (const c of crossings) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        roundRect(c.x, c.y, c.w, c.h, 14);
        ctx.fill();

        ctx.globalAlpha = 0.92;
        for (let i = 0; i < 9; i++) {
          const yy = c.y + 6 + i * 6;
          ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.10)";
          ctx.fillRect(c.x + 10, yy, c.w - 20, 4);
        }
        ctx.restore();
      }
    }

    /* ----------------------- Palettes ----------------------- */
    function buildingPalette(type) {
      const pal = {
        arcade: { main: "#ff5aa5", accent: "#0a84ff" },
        tower: { main: "#7fd7ff", accent: "#ffcc00" },
        dojo: { main: "#42e7a5", accent: "#ff3b30" },
        gym: { main: "#ffd66b", accent: "#0a84ff" },
        igloo: { main: "#bfe9ff", accent: "#34c759" },
        cafe: { main: "#b889ff", accent: "#ffcc00" },

        mcd: { main: "#ff3b30", accent: "#ffcc00" },
        hospital: { main: "#ffffff", accent: "#0a84ff" },
        chicken: { main: "#ffd66b", accent: "#ff2d55" }
      };
      return pal[type] || pal.arcade;
    }

    /* ----------------------- Building (premium upgrade) ----------------------- */
    function drawPortalBuilding(p, t) {
      const pal = buildingPalette(p.type);
      const isActive = activePortal === p;
      const pulse = 0.55 + 0.45 * Math.sin(t * 3.0 + hash01(p.key) * 6);

      groundAO(p.x + 12, p.y + p.h - 18, p.w - 24, 28, 0.24);

      ctx.save();
      ctx.globalAlpha = 0.14 + (isActive ? 0.12 * pulse : 0);
      ctx.fillStyle = isActive ? "rgba(10,132,255,0.95)" : "rgba(255,255,255,0.26)";
      ctx.beginPath();
      ctx.ellipse(p.x + p.w * 0.5, p.y + p.h * 0.90, 74, 22, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const depth = Math.max(12, Math.min(28, p.w * 0.06));
      const bx = p.x + 16,
        by = p.y + 56,
        bw = p.w - 32,
        bh = p.h - 86;

      // base body
      legoBox3D(bx, by, bw, bh, depth, pal.main);

      // premium front panel + corner trims
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      roundRect(bx + 10, by + 10, bw - 20, bh - 20, 16);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "rgba(10,14,24,0.65)";
      roundRect(bx + 14, by + 14, bw - 28, 10, 8);
      ctx.fill();
      ctx.restore();

      // seam lines
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 2;
      for (let yy = by + 22; yy < by + bh - 12; yy += 22) {
        ctx.beginPath();
        ctx.moveTo(bx + 14, yy);
        ctx.lineTo(bx + bw - 14, yy);
        ctx.stroke();
      }
      ctx.restore();

      // roof plate
      const rx = p.x + p.w * 0.16,
        ry = p.y + 16,
        rw = p.w * 0.68,
        rh = 46;
      ctx.save();
      ctx.fillStyle = shade(pal.main, +22);
      roundRect(rx, ry, rw, rh, 18);
      ctx.fill();
      glossyHighlight(rx, ry, rw, rh, 0.12);

      // small roof edge
      ctx.globalAlpha = 0.20;
      ctx.fillStyle = "rgba(10,14,24,0.55)";
      roundRect(rx + 10, ry + rh - 12, rw - 20, 8, 8);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();

      // door
      const dx = p.x + p.w * 0.44,
        dy = p.y + p.h * 0.68,
        dw = p.w * 0.12,
        dh = p.h * 0.18;
      ctx.save();
      ctx.fillStyle = "rgba(10,14,24,0.22)";
      roundRect(dx, dy, dw, dh, 12);
      ctx.fill();
      ctx.fillStyle = shade(pal.accent, +10);
      roundRect(dx + 4, dy + 4, dw - 8, dh - 8, 10);
      ctx.fill();
      glossyHighlight(dx, dy, dw, dh, 0.12);
      ctx.restore();

      // windows (more premium)
      const winY = p.y + p.h * 0.54;
      const cols = 5;
      for (let i = 0; i < cols; i++) {
        const wx = p.x + p.w * 0.18 + i * (p.w * 0.13);
        const wy = winY;
        const ww = p.w * 0.10,
          wh = p.h * 0.11;

        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.24)";
        roundRect(wx, wy, ww, wh, 10);
        ctx.fill();

        const g = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
        g.addColorStop(0, "rgba(220,255,255,0.98)");
        g.addColorStop(1, "rgba(10,14,24,0.14)");
        ctx.fillStyle = g;
        roundRect(wx + 3, wy + 3, ww - 6, wh - 6, 8);
        ctx.fill();

        // window frames
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(wx + ww / 2, wy + 5);
        ctx.lineTo(wx + ww / 2, wy + wh - 5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(wx + 5, wy + wh / 2);
        ctx.lineTo(wx + ww - 5, wy + wh / 2);
        ctx.stroke();
        ctx.restore();
      }

      // LED sign (text brighter)
      const sy = p.y + 8;
      const sx = p.x + p.w * 0.16,
        sw = p.w * 0.68;

      ctx.save();
      ctx.fillStyle = "rgba(10,14,24,0.92)";
      roundRect(sx, sy, sw, 36, 14);
      ctx.fill();

      const led = ctx.createLinearGradient(sx, sy, sx + sw, sy + 36);
      led.addColorStop(0, shade(pal.accent, +26));
      led.addColorStop(1, shade(pal.accent, -4));
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = led;
      roundRect(sx + 3, sy + 3, sw - 6, 30, 12);
      ctx.fill();
      ctx.globalAlpha = 1;

      // outer glow
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = pal.accent;
      roundRect(sx - 8, sy - 8, sw + 16, 52, 18);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(255,255,255,0.995)"; // ✅ brighter
      ctx.shadowColor = "rgba(255,255,255,0.55)";
      ctx.shadowBlur = 10;
      ctx.font = "1200 14px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.label, sx + sw * 0.5, sy + 18);
      ctx.shadowBlur = 0;

      if (p.status !== "open") {
        ctx.fillStyle = "rgba(255,255,255,0.96)";
        roundRect(sx + sw * 0.5 - 60, sy + 44, 120, 24, 12);
        ctx.fill();
        ctx.fillStyle = "rgba(10,14,24,0.90)";
        ctx.font = "1100 11px system-ui";
        ctx.fillText("오픈 준비중", sx + sw * 0.5, sy + 56);
      }

      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
      ctx.restore();
    }

    /* ----------------------- Tree / Lamp / Bench / Flower ----------------------- */
    function drawTree(o) {
      const x = o.x,
        y = o.y,
        s = o.s;

      // ✅ AO alpha 낮춰서 “갈색 깜빡임” 느낌 최소화
      groundAO(x - 34 * s, y + 20 * s, 68 * s, 20 * s, 0.14);

      ctx.save();

      ctx.fillStyle = "#a55a22";
      roundRect(x - 10 * s, y - 22 * s, 20 * s, 48 * s, 10 * s);
      ctx.fill();
      glossyHighlight(x - 10 * s, y - 22 * s, 20 * s, 48 * s, 0.10);

      // canopy darker & outlined -> grass 대비
      const base = "#1fb462";
      const dark = "#168a4a";

      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(0,0,0,0.16)";
      ctx.fillStyle = base;

      function blob(cx, cy, rx, ry) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      blob(x - 24 * s, y - 46 * s, 26 * s, 22 * s);
      blob(x + 6 * s, y - 60 * s, 32 * s, 26 * s);
      blob(x + 30 * s, y - 44 * s, 26 * s, 22 * s);
      blob(x + 2 * s, y - 40 * s, 34 * s, 24 * s);

      ctx.globalAlpha = 0.20;
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(x + 8 * s, y - 44 * s, 30 * s, 22 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.ellipse(x - 6 * s, y - 66 * s, 18 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.restore();
    }

    function drawLamp(o, t) {
      const x = o.x,
        y = o.y,
        s = o.s;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.0 + x * 0.01);

      groundAO(x - 18 * s, y + 18 * s, 36 * s, 18 * s, 0.12);

      ctx.save();
      ctx.fillStyle = "#404756";
      roundRect(x - 5 * s, y - 42 * s, 10 * s, 70 * s, 8 * s);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      roundRect(x - 16 * s, y - 54 * s, 32 * s, 22 * s, 10 * s);
      ctx.fill();
      glossyHighlight(x - 16 * s, y - 54 * s, 32 * s, 22 * s, 0.18);

      ctx.globalAlpha = 0.10 + 0.26 * pulse;
      ctx.fillStyle = "#ffd66b";
      ctx.beginPath();
      ctx.ellipse(x, y - 10 * s, 34 * s, 54 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawBench(o) {
      const x = o.x,
        y = o.y,
        s = o.s;
      groundAO(x - 40 * s, y + 12 * s, 80 * s, 18 * s, 0.10);

      ctx.save();
      ctx.fillStyle = "#ffcc00";
      roundRect(x - 42 * s, y - 2 * s, 84 * s, 18 * s, 10 * s);
      ctx.fill();
      glossyHighlight(x - 42 * s, y - 2 * s, 84 * s, 18 * s, 0.12);

      ctx.fillStyle = "rgba(0,0,0,0.25)";
      roundRect(x - 34 * s, y + 14 * s, 14 * s, 10 * s, 5 * s);
      ctx.fill();
      roundRect(x + 20 * s, y + 14 * s, 14 * s, 10 * s, 5 * s);
      ctx.fill();
      ctx.restore();
    }

    function drawFlower(o, t) {
      const x = o.x,
        y = o.y,
        s = o.s;
      const wig = Math.sin(t * 2.1 + x * 0.02) * 1.0;

      ctx.save();
      groundAO(x - 10 * s, y + 10 * s, 20 * s, 10 * s, 0.08);

      ctx.strokeStyle = "#2dbf6b";
      ctx.lineWidth = 4 * s;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, y + 8 * s);
      ctx.lineTo(x + wig, y - 12 * s);
      ctx.stroke();

      ctx.fillStyle = "#ff5aa5";
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + wig + Math.cos(a) * 7 * s, y - 16 * s + Math.sin(a) * 7 * s, 4.6 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x + wig, y - 16 * s, 4.0 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawSign(s) {
      ctx.save();
      ctx.translate(s.x, s.y);

      groundAO(-28, 18, 56, 16, 0.10);

      ctx.fillStyle = "#404756";
      roundRect(-4, -10, 8, 38, 6);
      ctx.fill();

      ctx.fillStyle = "rgba(10,14,24,0.92)";
      roundRect(-64, -56, 128, 36, 14);
      ctx.fill();

      const led = ctx.createLinearGradient(-64, -56, 64, -20);
      led.addColorStop(0, "rgba(126,200,255,0.98)");
      led.addColorStop(1, "rgba(255,204,0,0.94)");
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = led;
      roundRect(-61, -53, 122, 30, 12);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(255,255,255,0.995)";
      ctx.shadowColor = "rgba(255,255,255,0.55)";
      ctx.shadowBlur = 10;
      ctx.font = "1200 14px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(s.text, 0, -38);
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    /* ----------------------- Emblems (front of buildings) ----------------------- */
    function drawEmblem(e) {
      const x = e.x,
        y = e.y;
      const k = e.key;

      // small base shadow
      groundAO(x - 22, y + 6, 44, 18, 0.10);

      ctx.save();
      ctx.translate(x, y);

      // pedestal
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 2;
      roundRect(-20, -6, 40, 18, 10);
      ctx.fill();
      ctx.stroke();

      // icon plate
      ctx.fillStyle = "rgba(10,14,24,0.90)";
      roundRect(-18, -30, 36, 24, 10);
      ctx.fill();

      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "rgba(126,200,255,0.9)";
      roundRect(-22, -34, 44, 32, 12);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.translate(0, -18);

      if (k === "archery") {
        // target + bow
        ctx.fillStyle = "rgba(255,255,255,0.98)";
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.55;
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = "rgba(255,204,0,0.98)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(12, 0, 9, -1.2, 1.2);
        ctx.stroke();
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(3, 0);
        ctx.lineTo(21, 0);
        ctx.stroke();
      } else if (k === "janggi") {
        // janggi stone
        ctx.fillStyle = "rgba(255,255,255,0.98)";
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.14)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "rgba(255,59,48,0.95)";
        ctx.font = "1200 10px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("將", 0, 1);
      } else if (k === "omok") {
        // omok stones
        ctx.fillStyle = "rgba(255,255,255,0.98)";
        ctx.beginPath();
        ctx.arc(-6, 0, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(10,14,24,0.92)";
        ctx.beginPath();
        ctx.arc(7, 0, 7, 0, Math.PI * 2);
        ctx.fill();
      } else if (k === "mcd") {
        // golden arches
        ctx.strokeStyle = "rgba(255,204,0,0.98)";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(-5, 2, 7, Math.PI, 0);
        ctx.arc(5, 2, 7, Math.PI, 0);
        ctx.stroke();
      } else if (k === "hospital") {
        // plus
        ctx.fillStyle = "rgba(10,132,255,0.98)";
        roundRect(-3, -10, 6, 20, 3);
        ctx.fill();
        roundRect(-10, -3, 20, 6, 3);
        ctx.fill();
      } else if (k === "chicken") {
        // drumstick-ish
        ctx.fillStyle = "rgba(255,255,255,0.98)";
        ctx.beginPath();
        ctx.ellipse(-2, 0, 9, 7, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,59,48,0.95)";
        ctx.beginPath();
        ctx.ellipse(8, 3, 5, 3.5, 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // default dot
        ctx.fillStyle = "rgba(255,255,255,0.98)";
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      ctx.restore();
    }

    /* ----------------------- Cars ----------------------- */
    function drawCar(c) {
      const bounce = Math.sin(c.bob) * 0.35;
      ctx.save();
      ctx.translate(c.x, c.y + bounce);

      const w = c.w,
        h = c.h;
      const base = c.color;

      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "rgba(10,14,24,0.40)";
      ctx.beginPath();
      ctx.ellipse(0, h * 0.58, w * 0.56, h * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (c.axis === "h") {
        if (c.dir < 0) ctx.scale(-1, 1);

        ctx.fillStyle = base;
        roundRect(-w * 0.52, -h * 0.40, w * 1.04, h * 0.80, 12);
        ctx.fill();
        glossyHighlight(-w * 0.52, -h * 0.40, w * 1.04, h * 0.80, 0.12);

        ctx.fillStyle = shade(base, +16);
        roundRect(-w * 0.20, -h * 0.58, w * 0.40, h * 0.28, 10);
        ctx.fill();
        glossyHighlight(-w * 0.20, -h * 0.58, w * 0.40, h * 0.28, 0.14);

        const g = ctx.createLinearGradient(-w * 0.12, -h * 0.50, w * 0.20, -h * 0.18);
        g.addColorStop(0, "rgba(210,250,255,0.92)");
        g.addColorStop(1, "rgba(10,14,24,0.10)");
        ctx.fillStyle = g;
        roundRect(-w * 0.18, -h * 0.34, w * 0.36, h * 0.26, 8);
        ctx.fill();

        ctx.fillStyle = "rgba(10,14,24,0.18)";
        roundRect(-w * 0.54, h * 0.14, w * 1.08, h * 0.18, 10);
        ctx.fill();

        ctx.fillStyle = "rgba(10,14,24,0.72)";
        ctx.beginPath();
        ctx.arc(-w * 0.30, h * 0.38, h * 0.16, 0, Math.PI * 2);
        ctx.arc(w * 0.30, h * 0.38, h * 0.16, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(w * 0.49, -h * 0.05, w * 0.06, h * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.restore();
        return;
      }

      const goingDown = c.dir > 0;

      ctx.fillStyle = base;
      roundRect(-w * 0.55, -h * 0.50, w * 1.10, h * 1.00, 12);
      ctx.fill();
      glossyHighlight(-w * 0.55, -h * 0.50, w * 1.10, h * 1.00, 0.12);

      ctx.fillStyle = shade(base, +16);
      roundRect(-w * 0.34, -h * 0.62, w * 0.68, h * 0.26, 10);
      ctx.fill();

      const gg = ctx.createLinearGradient(0, -h * 0.40, 0, h * 0.20);
      gg.addColorStop(0, "rgba(210,250,255,0.92)");
      gg.addColorStop(1, "rgba(10,14,24,0.10)");
      ctx.fillStyle = gg;
      roundRect(-w * 0.32, -h * 0.30, w * 0.64, h * 0.52, 10);
      ctx.fill();

      ctx.fillStyle = "rgba(10,14,24,0.18)";
      roundRect(-w * 0.56, h * 0.32, w * 1.12, h * 0.16, 10);
      ctx.fill();

      if (goingDown) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(-w * 0.22, h * 0.50, w * 0.12, h * 0.08, 0, 0, Math.PI * 2);
        ctx.ellipse(w * 0.22, h * 0.50, w * 0.12, h * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = 0.90;
        ctx.fillStyle = "#ff3b30";
        ctx.beginPath();
        ctx.ellipse(-w * 0.22, -h * 0.50, w * 0.12, h * 0.08, 0, 0, Math.PI * 2);
        ctx.ellipse(w * 0.22, -h * 0.50, w * 0.12, h * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }

    /* ----------------------- Footprints ----------------------- */
    function drawFootprints() {
      ctx.save();
      for (const f of footprints) {
        const a = 0.22 * (1 - f.age / f.life);
        ctx.globalAlpha = a;
        ctx.fillStyle = "rgba(10,14,24,0.65)";
        ctx.beginPath();
        ctx.ellipse(f.x, f.y, 5.2, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    /* ----------------------- MINIFIG (side refined) ----------------------- */
    function drawCapOnHead(hatColor) {
      // assumes origin at head center, head radius 16, head center y=-20
      // ✅ cap sits ON head: crown overlaps head, brim attached
      ctx.save();
      ctx.translate(0, -20);

      // crown
      ctx.fillStyle = hatColor;
      roundRect(-14, -20, 28, 15, 9); // moved down onto head
      ctx.fill();

      // top highlight
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      roundRect(-10, -17, 20, 5, 6);
      ctx.fill();
      ctx.globalAlpha = 1;

      // brim
      ctx.fillStyle = shade(hatColor, -10);
      ctx.beginPath();
      ctx.moveTo(-16, -8);
      ctx.quadraticCurveTo(0, -2, 16, -8);
      ctx.quadraticCurveTo(0, -12, -16, -8);
      ctx.closePath();
      ctx.fill();

      // shadow under brim (touching head)
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "rgba(10,14,24,0.55)";
      roundRect(-12, -6, 24, 4, 3);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.restore();
    }

    function drawMinifig(x, y) {
      const bob = player.moving ? Math.sin(player.bobT) * 0.18 : 0; // less float
      const dir = player.dir;
      const swing = player.moving ? Math.sin(player.animT * 10) : 0;

      ctx.save();
      ctx.globalAlpha = 0.26;
      ctx.fillStyle = "rgba(10,14,24,0.42)";
      ctx.beginPath();
      ctx.ellipse(x, y + 28, 20, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(x, y + bob);

      const side = dir === "left" || dir === "right";
      if (dir === "left") ctx.scale(-1, 1);

      const skin = "#ffd66b";
      const torso = "#0a84ff";
      const pants = "#3b4251";
      const hat = "#ff3b30";
      const outline = "rgba(0,0,0,0.18)";

      // HEAD
      ctx.save();
      const headG = ctx.createRadialGradient(-6, -24, 6, 0, -18, 22);
      headG.addColorStop(0, "rgba(255,255,255,0.95)");
      headG.addColorStop(0.48, skin);
      headG.addColorStop(1, "rgba(10,14,24,0.18)");
      ctx.fillStyle = headG;
      ctx.beginPath();
      ctx.arc(0, -20, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -20, 16, 0, Math.PI * 2);
      ctx.stroke();

      // CAP (fixed)
      drawCapOnHead(hat);

      // face
      if (dir === "down") {
        ctx.fillStyle = "rgba(10,14,24,0.72)";
        ctx.beginPath();
        ctx.arc(-5, -22, 2.2, 0, Math.PI * 2);
        ctx.arc(5, -22, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(10,14,24,0.62)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -18, 6, 0, Math.PI);
        ctx.stroke();
      } else if (dir === "up") {
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = "rgba(10,14,24,0.78)";
        roundRect(-9, -26, 18, 10, 6);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = "rgba(10,14,24,0.72)";
        ctx.beginPath();
        ctx.arc(7, -22, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(10,14,24,0.62)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(9, -18, 6, -0.18, Math.PI - 0.45);
        ctx.stroke();
        ctx.fillStyle = "rgba(10,14,24,0.18)";
        ctx.beginPath();
        ctx.ellipse(14.5, -18, 2.8, 2.0, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      const armSwing = 2.4 * swing;
      const legSwing = 3.6 * swing;

      if (!side) {
        // front/back
        ctx.fillStyle = torso;
        roundRect(-14, -4, 28, 28, 12);
        ctx.fill();
        glossyHighlight(-14, -4, 28, 28, 0.10);

        ctx.fillStyle = torso;
        roundRect(-22, 2, 10, 18, 8);
        ctx.fill();
        roundRect(12, 2, 10, 18, 8);
        ctx.fill();

        ctx.fillStyle = skin;
        roundRect(-22, 16 + armSwing, 10, 8, 6);
        ctx.fill();
        roundRect(12, 16 - armSwing, 10, 8, 6);
        ctx.fill();

        ctx.fillStyle = pants;
        roundRect(-12, 22, 11, 16, 6);
        ctx.fill();
        roundRect(1, 22, 11, 16, 6);
        ctx.fill();

        ctx.fillStyle = "rgba(10,14,24,0.72)";
        ctx.beginPath();
        ctx.ellipse(-6, 40 + legSwing, 6, 3, 0, 0, Math.PI * 2);
        ctx.ellipse(6, 40 - legSwing, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // ✅ side profile: one arm visible, legs side + occlusion
        // torso side slab
        ctx.fillStyle = torso;
        roundRect(-9, -4, 18, 28, 12);
        ctx.fill();
        glossyHighlight(-9, -4, 18, 28, 0.10);

        // only FRONT arm visible
        ctx.fillStyle = torso;
        roundRect(9, 2, 10, 18, 8);
        ctx.fill();
        ctx.fillStyle = skin;
        roundRect(9, 16 + armSwing, 10, 8, 6);
        ctx.fill();

        // legs: near leg big, far leg thin & behind
        // far leg (behind)
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = shade(pants, -12);
        roundRect(-6, 22, 9, 16, 6);
        ctx.fill();
        ctx.globalAlpha = 1;

        // near leg
        ctx.fillStyle = pants;
        roundRect(2, 22, 12, 16, 6);
        ctx.fill();

        // feet side
        ctx.fillStyle = "rgba(10,14,24,0.72)";
        ctx.beginPath();
        ctx.ellipse(9, 40 + legSwing, 6, 3, 0, 0, Math.PI * 2);
        ctx.globalAlpha = 0.60;
        ctx.ellipse(-1, 40 - legSwing, 5.2, 2.7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // hip joint seam
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        roundRect(-7, 20, 18, 4, 3);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }

    /* ----------------------- NPC ----------------------- */
    function drawNPC(key, x, y) {
      const theme =
        {
          archery: { torso: "#34c759", pants: "#3b4251", hat: "#ffcc00", acc: "bow" },
          janggi: { torso: "#b889ff", pants: "#2a2f3b", hat: "#ff3b30", acc: "stone" },
          omok: { torso: "#ffffff", pants: "#3b4251", hat: "#0a84ff", acc: "stone2" }
        }[key] || { torso: "#ffffff", pants: "#3b4251", hat: "#ff3b30", acc: "none" };

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(-1, 1);

      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "rgba(10,14,24,0.40)";
      ctx.beginPath();
      ctx.ellipse(0, 28, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      const skin = "#ffd66b";
      const outline = "rgba(0,0,0,0.18)";

      const headG = ctx.createRadialGradient(-6, -24, 6, 0, -18, 22);
      headG.addColorStop(0, "rgba(255,255,255,0.95)");
      headG.addColorStop(0.48, skin);
      headG.addColorStop(1, "rgba(10,14,24,0.18)");
      ctx.fillStyle = headG;
      ctx.beginPath();
      ctx.arc(0, -20, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -20, 16, 0, Math.PI * 2);
      ctx.stroke();

      drawCapOnHead(theme.hat);

      ctx.fillStyle = "rgba(10,14,24,0.72)";
      ctx.beginPath();
      ctx.arc(7, -22, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(10,14,24,0.62)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(9, -18, 6, -0.18, Math.PI - 0.45);
      ctx.stroke();

      // torso side
      ctx.fillStyle = theme.torso;
      roundRect(-9, -4, 18, 28, 12);
      ctx.fill();

      // one arm
      ctx.fillStyle = theme.torso;
      roundRect(9, 2, 10, 18, 8);
      ctx.fill();
      ctx.fillStyle = skin;
      roundRect(9, 16, 10, 8, 6);
      ctx.fill();

      // legs side
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = shade(theme.pants, -12);
      roundRect(-6, 22, 9, 16, 6);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = theme.pants;
      roundRect(2, 22, 12, 16, 6);
      ctx.fill();

      // accessory
      if (theme.acc === "bow") {
        ctx.strokeStyle = "rgba(10,14,24,0.55)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(22, 12, 12, -1.2, 1.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(12, 12);
        ctx.lineTo(32, 12);
        ctx.stroke();
      } else if (theme.acc === "stone") {
        ctx.fillStyle = "rgba(10,14,24,0.20)";
        roundRect(16, 18, 14, 10, 5);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        roundRect(18, 20, 10, 6, 4);
        ctx.fill();
      } else if (theme.acc === "stone2") {
        ctx.fillStyle = "rgba(255,255,255,0.98)";
        ctx.beginPath();
        ctx.arc(22, 22, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(10,14,24,0.92)";
        ctx.beginPath();
        ctx.arc(32, 22, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    /* ----------------------- Title ----------------------- */
    function drawWorldTitle() {
      const text = "FA미니월드";
      const padX = 18;

      ctx.save();
      ctx.globalAlpha = 0.96;
      ctx.font = "1100 20px system-ui";
      const tw = ctx.measureText(text).width;
      const bw = tw + padX * 2;
      const bh = 40;
      const x = VIEW.w * 0.5 - bw * 0.5;
      const y = 14;

      ctx.fillStyle = "rgba(255,255,255,0.90)";
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      ctx.lineWidth = 2;
      roundRect(x, y, bw, bh, 18);
      ctx.fill();
      ctx.stroke();
      glossyHighlight(x, y, bw, bh, 0.14);

      ctx.fillStyle = "rgba(10,14,24,0.92)";
      ctx.fillText(text, x + padX, y + 27);
      ctx.restore();
    }

    /* ----------------------- Depth sorting ----------------------- */
    function getFootY(entity) {
      if (entity.kind === "building") return entity.y + entity.h;
      if (entity.kind === "car") return entity.y + entity.h;
      if (entity.kind === "tree") return entity.y + 64 * entity.s;
      if (entity.kind === "lamp") return entity.y + 68 * entity.s;
      if (entity.kind === "bench") return entity.y + 32 * entity.s;
      if (entity.kind === "flower") return entity.y + 12 * entity.s;
      if (entity.kind === "sign") return entity.y + 40;
      if (entity.kind === "npc") return entity.y + 30;
      if (entity.kind === "emblem") return entity.y + 12;
      if (entity.kind === "player") return entity.y + 30;
      return entity.y;
    }

    /* ----------------------- Update / Draw loop ----------------------- */
    let lastT = performance.now();
    let acc = 0,
      framesCount = 0;

    function update(dt, t) {
      let ax = 0,
        ay = 0;
      if (!dragging && !modalState.open) {
        if (keys.has("a") || keys.has("arrowleft")) ax -= 1;
        if (keys.has("d") || keys.has("arrowright")) ax += 1;
        if (keys.has("w") || keys.has("arrowup")) ay -= 1;
        if (keys.has("s") || keys.has("arrowdown")) ay += 1;

        if (UI.vkeys) {
          if (UI.vkeys.left) ax -= 1;
          if (UI.vkeys.right) ax += 1;
          if (UI.vkeys.up) ay -= 1;
          if (UI.vkeys.down) ay += 1;
        }

        const moving = ax !== 0 || ay !== 0;
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

      for (const c of cars) {
        c.bob += dt * 3.0;
        if (c.axis === "h") {
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

      for (const c of clouds) {
        c.x += c.v * (c.layer === 0 ? 1.0 : 0.75) * dt;
        if (c.x > WORLD.w + 420) {
          c.x = -420;
          c.y = 40 + Math.random() * 260;
          c.s = 0.7 + Math.random() * 1.2;
          c.v = 9 + Math.random() * 16;
          c.layer = Math.random() < 0.5 ? 0 : 1;
        }
      }
      for (const b of birds) {
        b.x += b.v * dt;
        b.p += dt * 4.2;
        if (b.x > WORLD.w + 240) {
          b.x = -200;
          b.y = 70 + Math.random() * 160;
          b.v = 22 + Math.random() * 20;
          b.p = Math.random() * 10;
        }
      }

      activePortal = null;
      for (const p of portals) {
        const z = portalEnterZone(p);
        if (circleRectHit(player.x, player.y, player.r, z)) {
          activePortal = p;
          break;
        }
      }

      if (!modalState.open && activePortal) {
        UI.toast.hidden = false;
        if (activePortal.status === "open") UI.toast.innerHTML = `🧱 <b>${activePortal.label}</b><br/>포탈 앞이에요. <b>Enter/E</b> 또는 <b>클릭/터치</b>`;
        else UI.toast.innerHTML = `🧱 <b>${activePortal.label}</b><br/>오픈 준비중입니다`;
      } else if (!modalState.open) {
        UI.toast.hidden = true;
      }

      for (let i = footprints.length - 1; i >= 0; i--) {
        footprints[i].age += dt;
        if (footprints[i].age >= footprints[i].life) footprints.splice(i, 1);
      }

      updateCamera(dt);

      UI.coord.textContent = `x: ${Math.round(player.x)} · y: ${Math.round(player.y)}`;

      acc += dt;
      framesCount++;
      if (acc >= 0.45) {
        UI.fps.textContent = `fps: ${Math.round(framesCount / acc)}`;
        acc = 0;
        framesCount = 0;
      }
    }

    function draw(t) {
      ctx.clearRect(0, 0, VIEW.w, VIEW.h);

      ctx.save();
      ctx.translate(-cam.x, -cam.y);

      drawSkyWorld(t);
      drawCloudsWorld();
      drawGroundWorld();
      drawRoadsAndSidewalks();
      drawFootprints();

      const items = [];
      for (const p of portals) items.push({ kind: "building", ref: p, footY: getFootY({ kind: "building", y: p.y, h: p.h }) });
      for (const c of cars) items.push({ kind: "car", ref: c, footY: getFootY(c) });
      for (const pr of props) items.push({ kind: pr.kind, ref: pr, footY: getFootY(pr) });
      for (const s of signs) items.push({ kind: "sign", ref: s, footY: getFootY({ kind: "sign", y: s.y }) });
      for (const e of portalEmblems) items.push({ kind: "emblem", ref: e, footY: getFootY(e) });
      for (const n of portalNPCs) items.push({ kind: "npc", ref: n, footY: getFootY(n) });
      items.push({ kind: "player", ref: player, footY: getFootY({ kind: "player", y: player.y }) });

      items.sort((a, b) => a.footY - b.footY);

      for (const it of items) {
        if (it.kind === "building") drawPortalBuilding(it.ref, t);
        else if (it.kind === "car") drawCar(it.ref);
        else if (it.kind === "tree") drawTree(it.ref);
        else if (it.kind === "lamp") drawLamp(it.ref, t);
        else if (it.kind === "bench") drawBench(it.ref);
        else if (it.kind === "flower") drawFlower(it.ref, t);
        else if (it.kind === "sign") drawSign(it.ref);
        else if (it.kind === "emblem") drawEmblem(it.ref);
        else if (it.kind === "npc") drawNPC(it.ref.key, it.ref.x, it.ref.y);
        else if (it.kind === "player") drawMinifig(player.x, player.y);
      }

      ctx.restore();
      drawWorldTitle();
    }

    /* ----------------------- Loop ----------------------- */
    function loop(now) {
      const t = now / 1000;
      const dt = Math.min(0.033, (now - lastT) / 1000);
      lastT = now;

      try {
        update(dt, t);
        draw(t);
      } catch (err) {
        console.error(err);
        UI.toast.hidden = false;
        UI.toast.innerHTML = `🧱 <b>JS 에러</b><br/>콘솔(Console) 확인: ${String(err).slice(0, 140)}`;
      }

      requestAnimationFrame(loop);
    }

    /* ----------------------- Portal click ----------------------- */
    canvas.addEventListener(
      "pointerdown",
      (e) => {
        const p = getPointer(e);
        const w = screenToWorld(p.x, p.y);
        if (activePortal && !modalState.open) {
          const z = portalEnterZone(activePortal);
          if (w.x >= z.x - 20 && w.x <= z.x + z.w + 20 && w.y >= z.y - 20 && w.y <= z.y + z.h + 20) openPortalUI(activePortal);
        }
      },
      { passive: true }
    );

    /* ----------------------- Start ----------------------- */
    resize();
    for (const b of birds) {
      b.x = Math.random() * WORLD.w;
      b.y = 70 + Math.random() * 160;
    }
    requestAnimationFrame(loop);
  });
})();
