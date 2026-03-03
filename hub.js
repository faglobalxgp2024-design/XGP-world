/* HUN.JS - LEGO PREMIUM (single-file) v2.6
 * 적용:
 * 1) 모바일 조이스틱: 오른쪽으로 이동 + 살짝 크게
 * 2) 캐릭터 디테일: 갑옷/무기/방패 디테일 추가
 * 3) 존 입구: 고급스러운 “게이트/입구” 생성 + 시각적 강조
 * 4) 도로: 존 바깥 정렬 + 도로가 끊겨 보이지 않게 연장/연결 개선 + 차량 라인 안 잘리도록
 * 5) 가로등: 랜덤 → 도로를 따라 규칙적으로 정렬 배치
 *
 * 사용법: 이 파일 전체를 hub.js에 그대로 붙여넣기
 */
(() => {
  "use strict";

  /* ----------------------- CONFIG ----------------------- */
  const SPRITE_SRC = ""; // optional external sprite
  const USE_SPRITE_IF_LOADED = true;

  /* ----------------------- Utilities ----------------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
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
  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
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
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.borderRadius = "0";
    canvas.style.background = "#eaf6ff";
    canvas.style.touchAction = "none";
    canvas.style.userSelect = "none";
    canvas.style.webkitUserSelect = "none";
    canvas.style.imageRendering = "auto";

    // ===== UI CLEANUP PATCH =====
    const topbar = document.querySelector("header.topbar") || document.querySelector("#topbar") || document.querySelector("header");
    if (topbar) topbar.style.display = "none";
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
    const wrap = document.querySelector("main.wrap") || document.querySelector(".wrap");
    if (wrap) {
      wrap.style.margin = "0";
      wrap.style.padding = "0";
      wrap.style.maxWidth = "none";
      wrap.style.width = "100%";
    }

    // Toast
    const toast = ensureEl("toast", "div");
    toast.style.position = "fixed";
    toast.style.left = "50%";
    toast.style.top = "92px";
    toast.style.transform = "translateX(-50%)";
    toast.style.zIndex = "9999";
    toast.style.padding = "0";
    toast.style.borderRadius = "0";
    toast.style.background = "transparent";
    toast.style.border = "none";
    toast.style.boxShadow = "none";
    toast.style.filter = "none";
    toast.style.backdropFilter = "none";
    toast.style.webkitBackdropFilter = "none";
    toast.style.font = "900 16px system-ui";
    toast.style.color = "rgba(10,18,30,0.92)";
    toast.style.maxWidth = "min(720px, calc(100vw - 28px))";
    toast.style.textAlign = "center";
    toast.style.pointerEvents = "none";
    toast.hidden = true;

    // Coord / FPS
    const coord = ensureEl("coord", "div");
    coord.style.position = "fixed";
    coord.style.left = "20px";
    coord.style.top = "18px";
    coord.style.zIndex = "9999";
    coord.style.padding = "8px 10px";
    coord.style.borderRadius = "12px";
    coord.style.background = "rgba(255,255,255,0.84)";
    coord.style.border = "1px solid rgba(0,0,0,0.10)";
    coord.style.font = "900 12px system-ui";
    coord.style.color = "rgba(10,18,30,0.80)";
    coord.style.backdropFilter = "blur(6px)";

    const fps = ensureEl("fps", "div");
    fps.style.position = "fixed";
    fps.style.left = "136px";
    fps.style.top = "18px";
    fps.style.zIndex = "9999";
    fps.style.padding = "8px 10px";
    fps.style.borderRadius = "12px";
    fps.style.background = "rgba(255,255,255,0.84)";
    fps.style.border = "1px solid rgba(0,0,0,0.10)";
    fps.style.font = "900 12px system-ui";
    fps.style.color = "rgba(10,18,30,0.80)";
    fps.style.backdropFilter = "blur(6px)";

    // Fade
    const fade = ensureEl("fade", "div");
    fade.style.position = "fixed";
    fade.style.inset = "0";
    fade.style.zIndex = "9998";
    fade.style.pointerEvents = "none";
    fade.style.opacity = "0";
    fade.style.transition = "opacity 240ms ease";
    fade.style.background = "#ffffff";

    // Modal (clean)
    const modal = ensureEl("lego_modal", "div");
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.zIndex = "10000";
    modal.style.display = "none";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.background = "transparent";
    modal.style.backdropFilter = "none";
    modal.style.webkitBackdropFilter = "none";
    modal.style.filter = "none";

    const modalInner = ensureEl("lego_modal_inner", "div", modal);
    modalInner.style.width = "min(760px, calc(100vw - 40px))";
    modalInner.style.borderRadius = "0";
    modalInner.style.background = "transparent";
    modalInner.style.border = "none";
    modalInner.style.boxShadow = "none";
    modalInner.style.padding = "0";
    modalInner.style.textAlign = "center";
    modalInner.style.font = "1100 18px system-ui";
    modalInner.style.color = "rgba(10,14,24,0.92)";
    modalInner.style.userSelect = "none";
    modalInner.style.webkitUserSelect = "none";
    modalInner.style.filter = "none";

    const modalTitle = ensureEl("lego_modal_title", "div", modalInner);
    modalTitle.style.font = "1200 24px system-ui";
    modalTitle.style.marginBottom = "10px";
    modalTitle.style.letterSpacing = "0.5px";

    const modalBody = ensureEl("lego_modal_body", "div", modalInner);
    modalBody.style.font = "1100 20px system-ui";
    modalBody.style.opacity = "0.94";
    modalBody.style.marginBottom = "10px";
    modalBody.style.lineHeight = "1.35";
    modalBody.style.letterSpacing = "0.6px";

    const modalHint = ensureEl("lego_modal_hint", "div", modalInner);
    modalHint.style.font = "900 13px system-ui";
    modalHint.style.opacity = "0.72";

    const style = ensureEl("lego_style_injected", "style", document.head);
    style.textContent = `
      #fade.on { opacity: 1; }
      #lego_modal { animation: legoPop 160ms ease both; }
      @keyframes legoPop { from{opacity:0; transform: translateY(8px);} to{opacity:1; transform: translateY(0);} }
      * { -webkit-tap-highlight-color: transparent; }
    `;

    /* ---------- Mobile Analog Joystick (Wheel) ---------- */
    const joy = ensureEl("joystick", "div");

    // ✅ (1) 오른쪽 배치 + 살짝 크게
    const JOY_SIZE = 168;     // 기존 142 → 168
    const JOY_KNOB = 72;      // 62 → 72
    const JOY_RING = 136;     // 114 → 136

    joy.style.position = "fixed";
    joy.style.right = "18px";         // ✅ left → right
    joy.style.left = "auto";
    joy.style.bottom = "18px";
    joy.style.zIndex = "10001";
    joy.style.width = `${JOY_SIZE}px`;
    joy.style.height = `${JOY_SIZE}px`;
    joy.style.display = isTouchDevice() ? "block" : "none";
    joy.style.touchAction = "none";
    joy.style.userSelect = "none";
    joy.style.webkitUserSelect = "none";

    const joyBase = ensureEl("joystick_base", "div", joy);
    joyBase.style.position = "absolute";
    joyBase.style.inset = "0";
    joyBase.style.borderRadius = "999px";
    joyBase.style.background = "rgba(255,255,255,0.72)";
    joyBase.style.border = "1px solid rgba(0,0,0,0.10)";
    joyBase.style.boxShadow = "0 18px 44px rgba(0,0,0,0.16)";
    joyBase.style.backdropFilter = "blur(8px)";

    const joyRing = ensureEl("joystick_ring", "div", joy);
    joyRing.style.position = "absolute";
    joyRing.style.left = "16px";
    joyRing.style.top = "16px";
    joyRing.style.width = `${JOY_RING}px`;
    joyRing.style.height = `${JOY_RING}px`;
    joyRing.style.borderRadius = "999px";
    joyRing.style.border = "1px dashed rgba(10,14,24,0.18)";
    joyRing.style.opacity = "0.55";

    const joyKnob = ensureEl("joystick_knob", "div", joy);
    joyKnob.style.position = "absolute";
    joyKnob.style.left = "50%";
    joyKnob.style.top = "50%";
    joyKnob.style.transform = "translate(-50%, -50%)";
    joyKnob.style.width = `${JOY_KNOB}px`;
    joyKnob.style.height = `${JOY_KNOB}px`;
    joyKnob.style.borderRadius = "999px";
    joyKnob.style.background = "rgba(255,255,255,0.92)";
    joyKnob.style.border = "1px solid rgba(0,0,0,0.12)";
    joyKnob.style.boxShadow = "0 16px 40px rgba(0,0,0,0.18)";
    joyKnob.style.display = "flex";
    joyKnob.style.alignItems = "center";
    joyKnob.style.justifyContent = "center";
    joyKnob.style.font = "1200 14px system-ui";
    joyKnob.style.color = "rgba(10,14,24,0.80)";
    joyKnob.textContent = "MOVE";

    const joyState = { active: false, id: -1, ax: 0, ay: 0 };

    function setJoy(ax, ay) {
      joyState.ax = ax;
      joyState.ay = ay;
      const max = 52; // 기존 44 → 약간 확대
      const px = ax * max;
      const py = ay * max;
      joyKnob.style.transform = `translate(calc(-50% + ${px}px), calc(-50% + ${py}px))`;
      joyBase.style.background = joyState.active ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.72)";
    }
    function joyPointerDown(e) {
      e.preventDefault();
      joyState.active = true;
      joyState.id = e.pointerId;
      try { joy.setPointerCapture(e.pointerId); } catch {}
      joyPointerMove(e);
    }
    function joyPointerMove(e) {
      if (!joyState.active || e.pointerId !== joyState.id) return;
      const r = joy.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx);
      const dy = (e.clientY - cy);
      const max = 62;
      const len = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, len / max);
      const ax = (dx / len) * k;
      const ay = (dy / len) * k;
      const dz = 0.10;
      const dd = Math.hypot(ax, ay);
      if (dd < dz) return setJoy(0, 0);
      setJoy(ax, ay);
    }
    function joyPointerUp(e) {
      if (e.pointerId !== joyState.id) return;
      joyState.active = false;
      joyState.id = -1;
      setJoy(0, 0);
      try { joy.releasePointerCapture(e.pointerId); } catch {}
    }
    joy.addEventListener("pointerdown", joyPointerDown, { passive: false });
    joy.addEventListener("pointermove", joyPointerMove, { passive: false });
    joy.addEventListener("pointerup", joyPointerUp, { passive: false });
    joy.addEventListener("pointercancel", joyPointerUp, { passive: false });

    return { canvas, toast, coord, fps, fade, modal, modalTitle, modalBody, modalHint, joyState };
  }

  /* ----------------------- Start ----------------------- */
  window.addEventListener("DOMContentLoaded", () => {
    const UI = ensureUI();
    const canvas = UI.canvas;
    const ctx = canvas.getContext("2d", { alpha: true });

    let W = 0, H = 0, DPR = 1;
    const VIEW = { zoom: 0.86, w: 0, h: 0 };

    const WORLD = { w: 3000, h: 2200, margin: 160 };
    const cam = { x: 0, y: 0, targetX: 0, targetY: 0 };

    function screenToWorld(sx, sy) { return { x: sx + cam.x, y: sy + cam.y }; }

    /* ----------------------- Optional character sprite ----------------------- */
    const sprite = { img: null, loaded: false, w: 1, h: 1 };
    if (SPRITE_SRC && USE_SPRITE_IF_LOADED) {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => {
        sprite.img = im;
        sprite.loaded = true;
        sprite.w = im.naturalWidth || 1;
        sprite.h = im.naturalHeight || 1;
      };
      im.onerror = () => { sprite.loaded = false; sprite.img = null; };
      im.src = SPRITE_SRC;
    }

    /* ----------------------- Roads / Sidewalks / Crossings / Signals ----------------------- */
    const roads = [];
    const sidewalks = [];
    const crossings = [];
    const signals = [];

    /* ----------------------- Portals + Shops ----------------------- */
    const portals = [
      // GAME (6)
      { key: "avoid", label: "DODGE", status: "open", url: "https://faglobalxgp2024-design.github.io/index.html/", type: "arcade", size: "L", x: 0, y: 0, w: 0, h: 0 },
      { key: "archery", label: "ARCHERY", status: "open", url: "https://faglobalxgp2024-design.github.io/-/", type: "tower", size: "M", x: 0, y: 0, w: 0, h: 0 },
      { key: "janggi", label: "JANGGI", status: "open", url: "https://faglobalxgp2024-design.github.io/MINIGAME/", type: "dojo", size: "L", x: 0, y: 0, w: 0, h: 0 },
      { key: "omok", label: "OMOK", status: "soon", url: "", type: "cafe", size: "M", x: 0, y: 0, w: 0, h: 0 },
      { key: "snow", label: "SNOWBALL", status: "soon", url: "", type: "igloo", size: "M", x: 0, y: 0, w: 0, h: 0 },
      { key: "jump", label: "JUMP", status: "soon", url: "", type: "gym", size: "M", x: 0, y: 0, w: 0, h: 0 },

      // COMMUNITY (5)
      { key: "twitter", label: "TWITTER", status: "open", url: "https://x.com/FAGLOBAL_", type: "social", size: "M", x: 0, y: 0, w: 0, h: 0 },
      { key: "telegram", label: "TELEGRAM", status: "open", url: "https://t.me/faglobalgp", type: "social", size: "M", x: 0, y: 0, w: 0, h: 0 },
      { key: "wallet", label: "WALLET", status: "open", url: "https://faglobal.site/", type: "wallet", size: "M", x: 0, y: 0, w: 0, h: 0 },
      { key: "market", label: "MARKET", status: "open", url: "https://famarket.store/", type: "market", size: "M", x: 0, y: 0, w: 0, h: 0 },
      { key: "support", label: "SUPPORT", status: "open", url: "", message: "문의: faglobal.xgp2024@gmail.com", type: "support", size: "M", x: 0, y: 0, w: 0, h: 0 },

      // ADS (4)
      { key: "mcd", label: "McDonald's", status: "soon", url: "", type: "mcd", size: "M", x: 0, y: 0, w: 0, h: 0 },
      { key: "bbq", label: "BBQ", status: "open", url: "https://youtu.be/CP28c0QvRig", type: "bbq", size: "M", x: 0, y: 0, w: 0, h: 0 },
      { key: "baskin", label: "BASKIN", status: "soon", url: "", type: "baskin", size: "M", x: 0, y: 0, w: 0, h: 0 },
      { key: "paris", label: "PARIS", status: "soon", url: "", type: "paris", size: "M", x: 0, y: 0, w: 0, h: 0 },
    ];
    const portalsByKey = (k) => portals.find((p) => p.key === k);

    /* ----------------------- ZONES ----------------------- */
    let ZONES = {
      game: { x: 0, y: 0, w: 0, h: 0, label: "GAME ZONE", color: "#0a84ff", entrance: null },
      community: { x: 0, y: 0, w: 0, h: 0, label: "COMMUNITY ZONE", color: "#34c759", entrance: null },
      ads: { x: 0, y: 0, w: 0, h: 0, label: "AD ZONE", color: "#ff2d55", entrance: null },
    };

    function ptInRect(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
    function rectsOverlap(a, b, pad = 0) {
      return !(
        a.x + a.w + pad < b.x - pad ||
        a.x - pad > b.x + b.w + pad ||
        a.y + a.h + pad < b.y - pad ||
        a.y - pad > b.y + b.h + pad
      );
    }
    function rectInAnyZone(rect, pad = 0) {
      return rectsOverlap(rect, ZONES.game, pad) || rectsOverlap(rect, ZONES.community, pad) || rectsOverlap(rect, ZONES.ads, pad);
    }

    /* ----------------------- Player ----------------------- */
    const player = { x: 360, y: 360, r: 18, speed: 250, moving: false, animT: 0, bobT: 0, dir: "down" };
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
      const dx = w.x - player.x, dy = w.y - player.y;
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
    canvas.addEventListener("pointerup", () => { dragging = false; });

    function clampPlayerToWorld() {
      player.x = clamp(player.x, WORLD.margin, WORLD.w - WORLD.margin);
      player.y = clamp(player.y, WORLD.margin, WORLD.h - WORLD.margin);
    }

    /* ----------------------- Cars ----------------------- */
    const cars = [];
    const CAR_COLORS = ["#ff3b30", "#ffcc00", "#34c759", "#0a84ff", "#af52de", "#ff2d55", "#ffffff"];

    function seedCars(rng) {
      cars.length = 0;
      if (roads.length === 0) return;

      const makeCar = (r, axis) => {
        const col = CAR_COLORS[(rng() * CAR_COLORS.length) | 0];
        const speed = 98 + rng() * 118;

        if (axis === "h") {
          const lane = rng() < 0.5 ? 0 : 1;
          const dir = rng() < 0.5 ? 1 : -1;
          return {
            kind: "car", axis: "h", dir, color: col, speed,
            w: 58 + rng() * 22, h: 26 + rng() * 10,
            x: r.x + rng() * r.w,
            y: r.y + (lane === 0 ? r.h * 0.36 : r.h * 0.66),
            bob: rng() * 10, roadId: r._id
          };
        } else {
          const lane = rng() < 0.5 ? 0 : 1;
          const dir = rng() < 0.5 ? 1 : -1;
          return {
            kind: "car", axis: "v", dir, color: col, speed,
            w: 26 + rng() * 10, h: 62 + rng() * 22,
            x: r.x + (lane === 0 ? r.w * 0.36 : r.w * 0.66),
            y: r.y + rng() * r.h,
            bob: rng() * 10, roadId: r._id
          };
        }
      };

      for (const r of roads) {
        // 존과 겹치는 도로에 차 생성 금지(품질)
        if (rectInAnyZone(r, 12)) continue;
        const n = r.axis === "h" ? 4 + ((rng() * 2) | 0) : 3 + ((rng() * 2) | 0);
        for (let i = 0; i < n; i++) cars.push(makeCar(r, r.axis));
      }
    }

    /* ----------------------- Props / Signs / NPCs ----------------------- */
    const props = [];
    const signs = [];
    let portalNPCs = [];
    let portalEmblems = [];
    const roamers = [];

    function isOnRoadLike(x, y) {
      for (const r of roads) {
        if (x >= r.x - 18 && x <= r.x + r.w + 18 && y >= r.y - 18 && y <= r.y + r.h + 18) return true;
      }
      return false;
    }
    function isInsideBuildingBuffer(x, y) {
      for (const p of portals) {
        const pad = 130;
        if (x >= p.x - pad && x <= p.x + p.w + pad && y >= p.y - pad && y <= p.y + p.h + pad) return true;
      }
      return false;
    }
    function isInsideZonesBuffer(x, y) {
      const pad = 18;
      return (
        (x >= ZONES.game.x - pad && x <= ZONES.game.x + ZONES.game.w + pad && y >= ZONES.game.y - pad && y <= ZONES.game.y + ZONES.game.h + pad) ||
        (x >= ZONES.community.x - pad && x <= ZONES.community.x + ZONES.community.w + pad && y >= ZONES.community.y - pad && y <= ZONES.community.y + ZONES.community.h + pad) ||
        (x >= ZONES.ads.x - pad && x <= ZONES.ads.x + ZONES.ads.w + pad && y >= ZONES.ads.y - pad && y <= ZONES.ads.y + ZONES.ads.h + pad)
      );
    }

    // Poisson-like placement for cleaner spacing
    function scatterPoints(rng, count, minDist, maxTry, okFn) {
      const pts = [];
      const cell = minDist / Math.SQRT2;
      const gw = Math.ceil(WORLD.w / cell);
      const gh = Math.ceil(WORLD.h / cell);
      const grid = new Array(gw * gh).fill(-1);
      function gi(x, y) { return (x | 0) + (y | 0) * gw; }
      function nearOK(x, y) {
        const cx = (x / cell) | 0;
        const cy = (y / cell) | 0;
        const r = 2;
        for (let yy = Math.max(0, cy - r); yy <= Math.min(gh - 1, cy + r); yy++) {
          for (let xx = Math.max(0, cx - r); xx <= Math.min(gw - 1, cx + r); xx++) {
            const idx = grid[gi(xx, yy)];
            if (idx < 0) continue;
            const p = pts[idx];
            const d = Math.hypot(p.x - x, p.y - y);
            if (d < minDist) return false;
          }
        }
        return true;
      }
      let tries = 0;
      while (pts.length < count && tries < maxTry) {
        tries++;
        const x = WORLD.margin + rng() * (WORLD.w - WORLD.margin * 2);
        const y = WORLD.margin + rng() * (WORLD.h - WORLD.margin * 2);
        if (!okFn(x, y)) continue;
        if (!nearOK(x, y)) continue;
        const cx = (x / cell) | 0, cy = (y / cell) | 0;
        grid[gi(cx, cy)] = pts.length;
        pts.push({ x, y });
      }
      return pts;
    }

    // ✅ (5) 가로등: 랜덤 → 도로를 따라 규칙적 배치
    function seedLampsAlongRoads(rng) {
      // 기존 랜덤 lamp 제거
      for (let i = props.length - 1; i >= 0; i--) {
        if (props[i].kind === "lamp") props.splice(i, 1);
      }

      const interval = 260;
      const offset = 86;
      for (const r of roads) {
        if (rectInAnyZone(r, 18)) continue;

        if (r.axis === "h") {
          const start = Math.ceil((r.x + 40) / interval) * interval;
          for (let x = start; x <= r.x + r.w - 40; x += interval) {
            const y1 = r.y - offset;
            const y2 = r.y + r.h + offset * 0.62;
            if (!isInsideZonesBuffer(x, y1) && !isInsideBuildingBuffer(x, y1)) props.push({ kind: "lamp", x, y: y1, s: 1.02 });
            if (!isInsideZonesBuffer(x, y2) && !isInsideBuildingBuffer(x, y2)) props.push({ kind: "lamp", x, y: y2, s: 1.02 });
          }
        } else {
          const start = Math.ceil((r.y + 40) / interval) * interval;
          for (let y = start; y <= r.y + r.h - 40; y += interval) {
            const x1 = r.x - offset;
            const x2 = r.x + r.w + offset * 0.62;
            if (!isInsideZonesBuffer(x1, y) && !isInsideBuildingBuffer(x1, y)) props.push({ kind: "lamp", x: x1, y, s: 1.02 });
            if (!isInsideZonesBuffer(x2, y) && !isInsideBuildingBuffer(x2, y)) props.push({ kind: "lamp", x: x2, y, s: 1.02 });
          }
        }
      }
    }

    function seedProps(rng) {
      props.length = 0;
      signs.length = 0;
      portalNPCs = [];
      portalEmblems = [];

      // trees/flowers cleaner
      const okNature = (x, y) => !isOnRoadLike(x, y) && !isInsideBuildingBuffer(x, y) && !isInsideZonesBuffer(x, y);
      const treePts = scatterPoints(rng, 62, 92, 7000, okNature);
      for (const p of treePts) props.push({ kind: "tree", x: p.x, y: p.y, s: 0.85 + rng() * 1.15 });

      const flowerPts = scatterPoints(rng, 88, 56, 10000, okNature);
      for (const p of flowerPts) props.push({ kind: "flower", x: p.x, y: p.y, s: 0.85 + rng() * 1.05 });

      // benches near sidewalks
      function okBench(x, y) {
        if (isInsideBuildingBuffer(x, y) || isInsideZonesBuffer(x, y)) return false;
        let near = false;
        for (const s of sidewalks) {
          const nx = clamp(x, s.x, s.x + s.w);
          const ny = clamp(y, s.y, s.y + s.h);
          if (Math.hypot(nx - x, ny - y) < 70) { near = true; break; }
        }
        return near && !isOnRoadLike(x, y);
      }
      const benchPts = scatterPoints(rng, 14, 160, 8000, okBench);
      for (const p of benchPts) props.push({ kind: "bench", x: p.x, y: p.y, s: 0.95 + rng() * 0.35 });

      // portal flowers (nice framing)
      for (const p of portals) {
        props.push({ kind: "flower", x: p.x + p.w * 0.20, y: p.y + p.h + 26, s: 1.05 });
        props.push({ kind: "flower", x: p.x + p.w * 0.80, y: p.y + p.h + 18, s: 0.98 });
      }

      // portal NPC + emblem
      for (const p of portals) {
        const ex = p.x + p.w * 0.5;
        const ey = p.y + p.h * 0.92;
        if (["archery", "janggi", "omok"].includes(p.key)) {
          portalNPCs.push({ kind: "npc", key: p.key, x: p.x + p.w + 48, y: p.y + p.h * 0.74 });
        }
        portalEmblems.push({ kind: "emblem", key: p.key, x: ex + 38, y: ey + 18 });
      }

      // ✅ 규칙적 가로등 추가
      seedLampsAlongRoads(rng);
    }

    /* ----------------------- Roaming NPCs (20) ----------------------- */
    function seedRoamers(rng) {
      roamers.length = 0;
      const N = 20;
      function okPos(x, y) {
        if (isOnRoadLike(x, y)) return false;
        if (isInsideBuildingBuffer(x, y)) return false;
        if (isInsideZonesBuffer(x, y)) return false;
        return true;
      }
      for (let i = 0; i < N; i++) {
        let x = 0, y = 0;
        for (let t = 0; t < 240; t++) {
          x = WORLD.margin + rng() * (WORLD.w - WORLD.margin * 2);
          y = WORLD.margin + rng() * (WORLD.h - WORLD.margin * 2);
          if (okPos(x, y)) break;
        }
        roamers.push({
          kind: "roamer", x, y, r: 16,
          speed: 92 + rng() * 46,
          dir: ["down", "left", "right", "up"][(rng() * 4) | 0],
          t: rng() * 10, tx: x, ty: y,
          colorIdx: (rng() * 6) | 0
        });
      }
    }
    function stepRoamers(dt, rng) {
      const palette = [
        { torso: "#0a84ff", pants: "#3b4251", hat: "#ff3b30" },
        { torso: "#34c759", pants: "#2a2f3b", hat: "#ffcc00" },
        { torso: "#b889ff", pants: "#3b4251", hat: "#0a84ff" },
        { torso: "#ffffff", pants: "#2a2f3b", hat: "#ff2d55" },
        { torso: "#ffd66b", pants: "#3b4251", hat: "#0a84ff" },
        { torso: "#7fd7ff", pants: "#2a2f3b", hat: "#ffcc00" }
      ];
      for (const n of roamers) {
        n.t += dt;
        if (Math.hypot(n.tx - n.x, n.ty - n.y) < 14 || rng() < 0.004) {
          let nx = n.x, ny = n.y;
          for (let k = 0; k < 48; k++) {
            nx = clamp(n.x + (rng() - 0.5) * 520, WORLD.margin, WORLD.w - WORLD.margin);
            ny = clamp(n.y + (rng() - 0.5) * 520, WORLD.margin, WORLD.h - WORLD.margin);
            if (!isOnRoadLike(nx, ny) && !isInsideBuildingBuffer(nx, ny) && !isInsideZonesBuffer(nx, ny)) break;
          }
          n.tx = nx; n.ty = ny;
        }
        const dx = n.tx - n.x, dy = n.ty - n.y;
        const len = Math.hypot(dx, dy) || 1;
        n.x += (dx / len) * n.speed * dt;
        n.y += (dy / len) * n.speed * dt;
        if (Math.abs(dy) >= Math.abs(dx)) n.dir = dy < 0 ? "up" : "down";
        else n.dir = dx < 0 ? "left" : "right";
        n.x = clamp(n.x, WORLD.margin, WORLD.w - WORLD.margin);
        n.y = clamp(n.y, WORLD.margin, WORLD.h - WORLD.margin);
      }
      return palette;
    }

    /* ----------------------- Stable ground patches ----------------------- */
    let groundPatches = [];
    function buildGroundPatches(rng) {
      groundPatches = [];
      for (let i = 0; i < 22; i++) {
        groundPatches.push({
          x: WORLD.w * 0.10 + rng() * WORLD.w * 0.80,
          y: WORLD.h * 0.26 + rng() * WORLD.h * 0.66,
          rx: 70 + rng() * 180, ry: 20 + rng() * 62,
          rot: (rng() - 0.5) * 0.7, a: 0.20 + rng() * 0.12
        });
      }
    }

    /* ----------------------- Footprints ----------------------- */
    const footprints = [];
    let footStepAcc = 0;
    function addFootprint(dt, rng) {
      if (!player.moving) { footStepAcc = 0; return; }
      footStepAcc += dt * (player.speed / 220);
      if (footStepAcc < 0.12) return;
      footStepAcc = 0;

      let ox = 0, oy = 0;
      if (player.dir === "up") oy = 8;
      else if (player.dir === "down") oy = -6;
      else if (player.dir === "left") ox = 8;
      else if (player.dir === "right") ox = -8;

      footprints.push({
        x: player.x + ox + (rng() - 0.5) * 2,
        y: player.y + 30 + oy + (rng() - 0.5) * 2,
        life: 1.2, age: 0
      });
    }

    /* ----------------------- Background layers ----------------------- */
    const clouds = Array.from({ length: 12 }, () => ({
      x: Math.random() * 3600, y: 40 + Math.random() * 260,
      s: 0.7 + Math.random() * 1.25, v: 9 + Math.random() * 18,
      layer: Math.random() < 0.5 ? 0 : 1
    }));
    const birds = Array.from({ length: 7 }, () => ({ x: 0, y: 0, p: Math.random() * 10, v: 22 + Math.random() * 22 }));

    /* ----------------------- Patterns ----------------------- */
    let grassPattern = null, dirtPattern = null, roadPattern = null, sidewalkPattern = null, brickPattern = null;

    function makePattern(w, h, drawFn) {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d");
      drawFn(g, w, h);
      return ctx.createPattern(c, "repeat");
    }

    function buildPatterns(rng) {
      grassPattern = makePattern(520, 520, (g, w, h) => {
        g.fillStyle = "#39d975";
        g.fillRect(0, 0, w, h);
        g.globalAlpha = 0.045;
        g.strokeStyle = "rgba(0,0,0,0.14)";
        g.lineWidth = 1;
        for (let x = 0; x <= w; x += 86) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
        for (let y = 0; y <= h; y += 86) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        g.globalAlpha = 0.12;
        for (let i = 0; i < 420; i++) {
          const rr = 0.7 + rng() * 1.8;
          g.fillStyle = (i % 3 === 0) ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.10)";
          g.beginPath(); g.arc(rng() * w, rng() * h, rr, 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1;
      });

      dirtPattern = makePattern(260, 260, (g, w, h) => {
        g.fillStyle = "#c79a64";
        g.fillRect(0, 0, w, h);
        g.globalAlpha = 0.20;
        for (let i = 0; i < 360; i++) {
          const rr = 0.8 + rng() * 3.0;
          g.fillStyle = (i % 2 === 0) ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)";
          g.beginPath(); g.arc(rng() * w, rng() * h, rr, 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1;
      });

      roadPattern = makePattern(260, 260, (g, w, h) => {
        g.fillStyle = "#262c37";
        g.fillRect(0, 0, w, h);
        g.globalAlpha = 0.16;
        for (let i = 0; i < 2200; i++) {
          const v = (rng() * 55) | 0;
          g.fillStyle = `rgb(${40 + v},${44 + v},${52 + v})`;
          g.fillRect(rng() * w, rng() * h, 1, 1);
        }
        g.globalAlpha = 0.10;
        g.strokeStyle = "rgba(255,255,255,0.10)";
        g.lineWidth = 1;
        for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        g.globalAlpha = 1;
      });

      sidewalkPattern = makePattern(240, 240, (g, w, h) => {
        g.fillStyle = "#f5efe7";
        g.fillRect(0, 0, w, h);
        g.globalAlpha = 0.12;
        g.strokeStyle = "rgba(0,0,0,0.18)";
        g.lineWidth = 1;
        for (let x = 0; x <= w; x += 24) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
        for (let y = 0; y <= h; y += 24) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        g.globalAlpha = 1;
      });

      brickPattern = makePattern(360, 360, (g, w, h) => {
        g.fillStyle = "#d9c6a3";
        g.fillRect(0, 0, w, h);
        g.globalAlpha = 0.32;
        g.strokeStyle = "rgba(60,45,30,0.34)";
        g.lineWidth = 2;
        const tileW = 60, tileH = 40;
        for (let y = 0; y <= h; y += tileH) {
          const off = ((y / tileH) | 0) % 2 ? tileW / 2 : 0;
          for (let x = -tileW; x <= w + tileW; x += tileW) {
            g.strokeRect(x + off, y, tileW, tileH);
          }
        }
        g.globalAlpha = 0.10;
        for (let i = 0; i < 1600; i++) {
          const v = (rng() * 40) | 0;
          g.fillStyle = `rgb(${210 + v},${190 + v},${155 + v})`;
          g.fillRect(rng() * w, rng() * h, 1, 1);
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
    function glossyHighlight(x, y, w, h, alpha = 0.14) {
      ctx.save();
      ctx.globalAlpha = alpha;
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, "rgba(255,255,255,0.85)");
      g.addColorStop(0.35, "rgba(255,255,255,0.18)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      roundRect(x + 6, y + 6, w - 12, Math.max(18, h * 0.34), 14);
      ctx.fill();
      ctx.restore();
    }
    function groundAO(x, y, w, h, alpha = 0.2) {
      ctx.save();
      const g = ctx.createRadialGradient(x + w * 0.5, y + h * 0.8, 10, x + w * 0.5, y + h * 0.8, Math.max(w, h) * 0.95);
      g.addColorStop(0, `rgba(10,14,24,${alpha})`);
      g.addColorStop(1, "rgba(10,14,24,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - 140, y - 140, w + 280, h + 280);
      ctx.restore();
    }
    function softShadow(x, y, w, h, alpha = 0.1) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(10,14,24,0.85)";
      roundRect(x, y, w, h, 18);
      ctx.fill();
      ctx.restore();
    }
        /* ----------------------- World layout (도로/존 정렬 + 입구 게이트) ----------------------- */
    function layoutRoadNetwork() {
      roads.length = 0; sidewalks.length = 0; crossings.length = 0; signals.length = 0;
      let id = 0;

      const zonePad = 64;
      const zoneBlocks = [
        { x: ZONES.game.x - zonePad, y: ZONES.game.y - zonePad, w: ZONES.game.w + zonePad * 2, h: ZONES.game.h + zonePad * 2 },
        { x: ZONES.community.x - zonePad, y: ZONES.community.y - zonePad, w: ZONES.community.w + zonePad * 2, h: ZONES.community.h + zonePad * 2 },
        { x: ZONES.ads.x - zonePad, y: ZONES.ads.y - zonePad, w: ZONES.ads.w + zonePad * 2, h: ZONES.ads.h + zonePad * 2 },
      ];

      const addRoadH = (y, x0, x1, h = 132) => {
        const r = { _id: id++, axis: "h", x: x0, y, w: (x1 - x0), h };
        roads.push(r);
        sidewalks.push({ x: r.x, y: r.y - 48, w: r.w, h: 38 });
        sidewalks.push({ x: r.x, y: r.y + r.h + 10, w: r.w, h: 38 });
        return r;
      };
      const addRoadV = (x, y0, y1, w = 124) => {
        const r = { _id: id++, axis: "v", x, y: y0, w, h: (y1 - y0) };
        roads.push(r);
        sidewalks.push({ x: r.x - 46, y: r.y, w: 34, h: r.h });
        sidewalks.push({ x: r.x + r.w + 12, y: r.y, w: 34, h: r.h });
        return r;
      };

      // split helpers: 존 근처를 피해서 "끊김 없이 이어진" 도로 세그먼트 생성
      function splitRangeByBlocksH(y, x0, x1, h) {
        const segs = [{ a: x0, b: x1 }];
        for (const z of zoneBlocks) {
          // y 라인이 존 블록과 겹치면 해당 x 구간을 제거
          if (y + h < z.y || y > z.y + z.h) continue;
          for (let i = segs.length - 1; i >= 0; i--) {
            const s = segs[i];
            const cutA = Math.max(s.a, z.x);
            const cutB = Math.min(s.b, z.x + z.w);
            if (cutA < cutB) {
              segs.splice(i, 1);
              if (s.a < cutA) segs.push({ a: s.a, b: cutA });
              if (cutB < s.b) segs.push({ a: cutB, b: s.b });
            }
          }
        }
        // 너무 짧은 건 제거
        return segs.filter(s => (s.b - s.a) > 260).sort((p, q) => p.a - q.a);
      }
      function splitRangeByBlocksV(x, y0, y1, w) {
        const segs = [{ a: y0, b: y1 }];
        for (const z of zoneBlocks) {
          if (x + w < z.x || x > z.x + z.w) continue;
          for (let i = segs.length - 1; i >= 0; i--) {
            const s = segs[i];
            const cutA = Math.max(s.a, z.y);
            const cutB = Math.min(s.b, z.y + z.h);
            if (cutA < cutB) {
              segs.splice(i, 1);
              if (s.a < cutA) segs.push({ a: s.a, b: cutA });
              if (cutB < s.b) segs.push({ a: cutB, b: s.b });
            }
          }
        }
        return segs.filter(s => (s.b - s.a) > 260).sort((p, q) => p.a - q.a);
      }

      // ✅ (4) "배경에서 도로가 짤리지 않게" 월드 가장자리까지 이어지는 외곽 순환로 + 내부 간선
      const L = WORLD.margin * 0.35, R = WORLD.w - WORLD.margin * 0.35;
      const T = WORLD.margin * 0.35, B = WORLD.h - WORLD.margin * 0.35;

      const outerPad = 40;
      addRoadH(T + outerPad, L, R, 122);
      addRoadH(B - outerPad - 122, L, R, 122);
      addRoadV(L + outerPad, T, B, 118);
      addRoadV(R - outerPad - 118, T, B, 118);

      // 내부 메인 도로(존 피해서 자동 분할)
      const yMid = WORLD.h * 0.50;
      const yLow = WORLD.h * 0.82;
      const xMid = WORLD.w * 0.50 - 62;
      const xL = WORLD.w * 0.22 - 62;
      const xR = WORLD.w * 0.78 - 62;

      for (const s of splitRangeByBlocksH(yMid, L, R, 132)) addRoadH(yMid, s.a, s.b, 132);
      for (const s of splitRangeByBlocksH(yLow, L + 90, R - 90, 120)) addRoadH(yLow, s.a, s.b, 120);
      for (const s of splitRangeByBlocksV(xMid, T, B, 124)) addRoadV(xMid, s.a, s.b, 124);
      for (const s of splitRangeByBlocksV(xL, T, yMid + 220, 118)) addRoadV(xL, s.a, s.b, 118);
      for (const s of splitRangeByBlocksV(xR, T, yMid + 220, 118)) addRoadV(xR, s.a, s.b, 118);

      // crossings at intersections (filtered)
      function makeCrossAt(cx, cy) {
        const c1 = { x: cx - 92, y: cy + 32, w: 184, h: 56 };
        const c2 = { x: cx - 92, y: cy - 88, w: 184, h: 56 };
        if (!rectInAnyZone(c1, 0)) crossings.push(c1);
        if (!rectInAnyZone(c2, 0)) crossings.push(c2);
      }
      makeCrossAt(xMid + 62, yMid);
      makeCrossAt(xMid + 62, yLow);

      function addSignal(x, y, dir) {
        const s = { x, y, dir, phase: Math.random() * 10 };
        const sr = { x: x - 16, y: y - 48, w: 32, h: 72 };
        if (!rectInAnyZone(sr, 8)) signals.push(s);
      }
      for (const c of crossings) {
        addSignal(c.x - 14, c.y + 8, "v");
        addSignal(c.x + c.w + 14, c.y + 8, "v");
      }
    }

    function layoutWorld(rng) {
      WORLD.w = Math.max(4200, Math.floor(W * 4.4));
      WORLD.h = Math.max(3000, Math.floor(H * 3.8));

      ZONES = {
        game: { x: WORLD.w * 0.08, y: WORLD.h * 0.14, w: WORLD.w * 0.36, h: WORLD.h * 0.30, label: "GAME ZONE", color: "#0a84ff", entrance: null },
        community: { x: WORLD.w * 0.56, y: WORLD.h * 0.14, w: WORLD.w * 0.36, h: WORLD.h * 0.30, label: "COMMUNITY ZONE", color: "#34c759", entrance: null },
        ads: { x: WORLD.w * 0.32, y: WORLD.h * 0.60, w: WORLD.w * 0.36, h: WORLD.h * 0.20, label: "AD ZONE", color: "#ff2d55", entrance: null },
      };

      // ✅ (3) 입구(게이트) 좌표 확정: 각 존 하단 중앙
      function setEntrance(z) {
        const gateW = 260, gateH = 86;
        z.entrance = {
          x: z.x + z.w * 0.5 - gateW * 0.5,
          y: z.y + z.h - gateH * 0.55,
          w: gateW,
          h: gateH
        };
      }
      setEntrance(ZONES.game);
      setEntrance(ZONES.community);
      setEntrance(ZONES.ads);

      const base = 220;
      const mul = { S: 0.82, M: 1.0, L: 1.22 };
      for (const p of portals) {
        const m = mul[p.size] || 1;
        p.w = base * 1.22 * m;
        p.h = base * 0.92 * m;
      }

      buildPatterns(rng);
      layoutRoadNetwork();

      // portal placement (zone 내부 grid 정렬)
      const desired = {
        // GAME
        jump: { x: ZONES.game.x + ZONES.game.w * 0.20, y: ZONES.game.y + ZONES.game.h * 0.30 },
        archery: { x: ZONES.game.x + ZONES.game.w * 0.50, y: ZONES.game.y + ZONES.game.h * 0.30 },
        omok: { x: ZONES.game.x + ZONES.game.w * 0.80, y: ZONES.game.y + ZONES.game.h * 0.30 },
        avoid: { x: ZONES.game.x + ZONES.game.w * 0.20, y: ZONES.game.y + ZONES.game.h * 0.74 },
        janggi: { x: ZONES.game.x + ZONES.game.w * 0.50, y: ZONES.game.y + ZONES.game.h * 0.74 },
        snow: { x: ZONES.game.x + ZONES.game.w * 0.80, y: ZONES.game.y + ZONES.game.h * 0.74 },

        // COMMUNITY
        twitter: { x: ZONES.community.x + ZONES.community.w * 0.25, y: ZONES.community.y + ZONES.community.h * 0.34 },
        telegram: { x: ZONES.community.x + ZONES.community.w * 0.70, y: ZONES.community.y + ZONES.community.h * 0.34 },
        wallet: { x: ZONES.community.x + ZONES.community.w * 0.25, y: ZONES.community.y + ZONES.community.h * 0.76 },
        market: { x: ZONES.community.x + ZONES.community.w * 0.70, y: ZONES.community.y + ZONES.community.h * 0.76 },
        support: { x: ZONES.community.x + ZONES.community.w * 0.48, y: ZONES.community.y + ZONES.community.h * 0.56 },

        // ADS
        mcd: { x: ZONES.ads.x + ZONES.ads.w * 0.28, y: ZONES.ads.y + ZONES.ads.h * 0.36 },
        bbq: { x: ZONES.ads.x + ZONES.ads.w * 0.72, y: ZONES.ads.y + ZONES.ads.h * 0.36 },
        baskin: { x: ZONES.ads.x + ZONES.ads.w * 0.28, y: ZONES.ads.y + ZONES.ads.h * 0.76 },
        paris: { x: ZONES.ads.x + ZONES.ads.w * 0.72, y: ZONES.ads.y + ZONES.ads.h * 0.76 },
      };

      function clampIntoZone(p, z, d) {
        const pad = 18;
        p.x = clamp(d.x - p.w / 2, z.x + pad, z.x + z.w - pad - p.w);
        p.y = clamp(d.y - p.h / 2, z.y + pad, z.y + z.h - pad - p.h);
      }

      for (const p of portals) {
        const d = desired[p.key] || { x: WORLD.w * 0.5, y: WORLD.h * 0.5 };
        if (["avoid", "archery", "janggi", "omok", "snow", "jump"].includes(p.key)) clampIntoZone(p, ZONES.game, d);
        else if (["twitter", "telegram", "wallet", "market", "support"].includes(p.key)) clampIntoZone(p, ZONES.community, d);
        else clampIntoZone(p, ZONES.ads, d);
      }

      buildGroundPatches(rng);
      seedCars(rng);
      seedProps(rng);
      seedRoamers(rng);

      player.x = clamp(player.x, WORLD.margin + 80, WORLD.w - WORLD.margin - 80);
      player.y = clamp(player.y, WORLD.margin + 80, WORLD.h - WORLD.margin - 80);
    }

    function resize() {
      DPR = Math.max(1, window.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);

      VIEW.w = W / VIEW.zoom;
      VIEW.h = H / VIEW.zoom;

      ctx.setTransform(DPR * VIEW.zoom, 0, 0, DPR * VIEW.zoom, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      const rng = mulberry32(seedFromWorld(Math.floor(W), Math.floor(H)) ^ 0x91ee55aa);
      layoutWorld(rng);
    }
    window.addEventListener("resize", resize);

    /* ----------------------- Movement / camera ----------------------- */
    function updateDirFromAxes(ax, ay) {
      if (Math.abs(ay) >= Math.abs(ax)) player.dir = ay < 0 ? "up" : "down";
      else player.dir = ax < 0 ? "left" : "right";
    }
    function updateDirFromDelta(dx, dy) { if (dx === 0 && dy === 0) return; updateDirFromAxes(dx, dy); }
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
      const zx = p.x + p.w * 0.5 - 28;
      const zy = p.y + p.h * 0.76;
      return { x: zx, y: zy, w: 56, h: 44 };
    }
    function circleRectHit(cx, cy, r, rect) {
      const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
      const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
      const dx = cx - closestX, dy = cy - closestY;
      return dx * dx + dy * dy <= r * r;
    }

    /* ----------------------- Modal ----------------------- */
    const modalState = { open: false, portal: null };
    function blockSpan(html, opt = {}) {
      const bg = opt.bg || "rgba(10,14,24,0.86)";
      const fg = opt.fg || "rgba(255,255,255,0.98)";
      const br = opt.br || "18px";
      return `<span style="
        display:inline-block; padding:12px 16px; border-radius:${br};
        background:${bg}; color:${fg};
        box-shadow: 0 18px 54px rgba(0,0,0,0.22);
        letter-spacing: 0.4px;
        border: 1px solid rgba(255,255,255,0.10);
        filter:none; backdrop-filter:none; -webkit-backdrop-filter:none;
        text-shadow:none;
      ">${html}</span>`;
    }
    function openModal(title, body, hint) {
      UI.modalTitle.innerHTML = blockSpan(title, { bg: "rgba(255,255,255,0.90)", fg: "rgba(10,14,24,0.92)", br: "20px" });
      UI.modalBody.innerHTML = blockSpan(body);
      UI.modalHint.textContent = hint || "";
      UI.modal.style.display = "flex";
      modalState.open = true;
    }
    function closeModal() {
      UI.modal.style.display = "none";
      modalState.open = false;
      modalState.portal = null;
    }
    UI.modal.addEventListener("pointerdown", (e) => { if (e.target === UI.modal) closeModal(); });

    function openPortalUI(p) {
      if (!p) return;
      if (p.status !== "open" || !p.url) {
        openModal(`🧱 ${p.label}`, "오픈 준비중입니다", isTouchDevice() ? "모바일: 바깥을 탭하면 닫힘" : "ESC로 닫기");
        modalState.portal = null;
        return;
      }
      modalState.portal = p;
      openModal(`🧱 ${p.label}`, `입장하시겠습니까?<br/><span style="opacity:.95;font-size:22px;font-weight:1200;">Enter / E</span>`, isTouchDevice() ? "모바일: 화면 탭하면 입장" : "PC: Enter 또는 E");
    }

    function confirmEnter(p) {
      if (entering) return;
      if (!p || p.status !== "open" || !p.url) { closeModal(); return; }
      closeModal();
      entering = true;
      UI.fade.classList.add("on");
      setTimeout(() => (window.location.href = p.url), 260);
    }

    UI.modal.addEventListener("pointerup", () => {
      if (isTouchDevice() && modalState.open && modalState.portal) confirmEnter(modalState.portal);
    });

    function resetEnterState() {
      entering = false;
      UI.fade.classList.remove("on");
      if (modalState.open) closeModal();
    }
    window.addEventListener("pageshow", () => resetEnterState());
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") resetEnterState(); });

    /* ----------------------- Rendering: background ----------------------- */
    function drawSkyWorld(t) {
      const g = ctx.createLinearGradient(0, 0, 0, WORLD.h);
      g.addColorStop(0, "#bfe7ff");
      g.addColorStop(0.55, "#d7f1ff");
      g.addColorStop(1, "#fff2fb");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);

      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "rgba(255,255,255,0.60)";
      ctx.beginPath();
      ctx.ellipse(WORLD.w * 0.22, WORLD.h * 0.18, 560, 260, 0, 0, Math.PI * 2);
      ctx.ellipse(WORLD.w * 0.72, WORLD.h * 0.16, 620, 280, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.26;
      ctx.strokeStyle = "rgba(10,14,24,0.52)";
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
        const a = 0.12 + 0.05 * (c.layer === 0 ? 1.0 : 0.75);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, 84 * c.s, 36 * c.s, 0, 0, Math.PI * 2);
        ctx.ellipse(c.x + 52 * c.s, c.y - 12 * c.s, 72 * c.s, 31 * c.s, 0, 0, Math.PI * 2);
        ctx.ellipse(c.x + 106 * c.s, c.y, 82 * c.s, 33 * c.s, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    function drawGroundWorld() {
      ctx.save();
      ctx.fillStyle = grassPattern || "#2f6f45";
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);
      ctx.restore();

      ctx.save();
      const sh = ctx.createLinearGradient(0, 0, 0, WORLD.h);
      sh.addColorStop(0, "rgba(10,14,24,0.00)");
      sh.addColorStop(1, "rgba(10,14,24,0.08)");
      ctx.fillStyle = sh;
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);
      ctx.restore();

      ctx.save();
      ctx.fillStyle = dirtPattern || "#c79a64";
      for (const p of groundPatches) {
        ctx.globalAlpha = p.a;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.rx, p.ry, p.rot, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 0.42;
      for (const po of portals) {
        const cx = po.x + po.w * 0.5;
        const cy = po.y + po.h * 0.9;
        ctx.beginPath();
        ctx.ellipse(cx, cy + 34, 74, 30, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawRoadsAndSidewalks() {
      for (const r of roads) {
        groundAO(r.x, r.y + r.h - 18, r.w, 26, 0.18);
        ctx.save();

        ctx.globalAlpha = 0.14;
        ctx.fillStyle = "rgba(255,255,255,0.30)";
        roundRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12, 44);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = roadPattern || "#262c37";
        roundRect(r.x, r.y, r.w, r.h, 40);
        ctx.fill();

        ctx.globalAlpha = 0.12;
        ctx.fillStyle = "rgba(255,255,255,0.26)";
        roundRect(r.x + 10, r.y + 10, r.w - 20, r.h * 0.26, 30);
        ctx.fill();

        // ✅ 차선이 "짤려 보이지 않게" 도로 끝단까지 충분히
        ctx.globalAlpha = 0.42;
        ctx.strokeStyle = "rgba(255,255,255,0.88)";
        ctx.lineWidth = 4;
        ctx.setLineDash([18, 16]);
        ctx.beginPath();
        if (r.axis === "h") {
          ctx.moveTo(r.x + 18, r.y + r.h / 2);
          ctx.lineTo(r.x + r.w - 18, r.y + r.h / 2);
        } else {
          ctx.moveTo(r.x + r.w / 2, r.y + 18);
          ctx.lineTo(r.x + r.w / 2, r.y + r.h - 18);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      for (const s of sidewalks) {
        if (rectInAnyZone(s, 0)) continue;
        groundAO(s.x, s.y + s.h - 10, s.w, 20, 0.12);
        ctx.save();
        ctx.fillStyle = sidewalkPattern || "#f5efe7";
        roundRect(s.x, s.y, s.w, s.h, 18);
        ctx.fill();
        ctx.globalAlpha = 0.10;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        roundRect(s.x + 4, s.y + 3, s.w - 8, Math.max(8, s.h * 0.35), 14);
        ctx.fill();
        ctx.restore();
      }

      for (const c of crossings) {
        if (rectInAnyZone(c, 0)) continue;
        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = "rgba(255,255,255,0.20)";
        roundRect(c.x, c.y, c.w, c.h, 14);
        ctx.fill();
        ctx.globalAlpha = 0.92;
        for (let i = 0; i < 9; i++) {
          const yy = c.y + 6 + i * 6;
          ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.08)";
          ctx.fillRect(c.x + 10, yy, c.w - 20, 4);
        }
        ctx.restore();
      }
    }

    /* ----------------------- Zone (brick + entrance gate) ----------------------- */
    function drawZoneGate(z, t) {
      if (!z.entrance) return;
      const g = z.entrance;
      const pulse = 0.55 + 0.45 * Math.sin(t * 2.8);

      // 바닥 카펫/길(존 내부에서 입구 강조)
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = z.color;
      roundRect(g.x + 22, g.y + 40, g.w - 44, 160, 22);
      ctx.fill();
      ctx.restore();

      // 게이트 그림자
      groundAO(g.x + 14, g.y + g.h - 10, g.w - 28, 24, 0.22);

      // 기둥 + 아치
      ctx.save();
      softShadow(g.x + 4, g.y + 10, g.w - 8, g.h - 6, 0.10);

      // base metal
      ctx.fillStyle = "rgba(10,14,24,0.86)";
      roundRect(g.x, g.y + 18, g.w, g.h - 18, 22);
      ctx.fill();

      // inner glow
      ctx.globalAlpha = 0.12 + 0.10 * pulse;
      ctx.fillStyle = z.color;
      roundRect(g.x + 8, g.y + 24, g.w - 16, g.h - 28, 18);
      ctx.fill();

      // arch opening
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      roundRect(g.x + 26, g.y + 34, g.w - 52, g.h - 42, 18);
      ctx.fill();

      // neon edge
      ctx.globalAlpha = 0.50 + 0.30 * pulse;
      ctx.strokeStyle = z.color;
      ctx.lineWidth = 3;
      roundRect(g.x + 6, g.y + 20, g.w - 12, g.h - 24, 20);
      ctx.stroke();

      // label plate
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      roundRect(g.x + g.w * 0.5 - 120, g.y - 22, 240, 44, 18);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      ctx.lineWidth = 2;
      roundRect(g.x + g.w * 0.5 - 120, g.y - 22, 240, 44, 18);
      ctx.stroke();

      ctx.fillStyle = "rgba(10,14,24,0.92)";
      ctx.font = "1200 16px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ENTRANCE", g.x + g.w * 0.5, g.y);

      // 방향 화살표
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      const ax = g.x + g.w * 0.5, ay = g.y + g.h + 10;
      roundRect(ax - 70, ay, 140, 34, 16);
      ctx.fill();
      ctx.fillStyle = "rgba(10,14,24,0.92)";
      ctx.font = "1100 12px system-ui";
      ctx.fillText(z.label, ax, ay + 17);
      ctx.restore();
    }

    function drawZonesWorld(t) {
      function drawZone(z) {
        if (!z.w) return;
        ctx.save();

        ctx.fillStyle = brickPattern || "#d9c6a3";
        roundRect(z.x, z.y, z.w, z.h, 26);
        ctx.fill();

        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = "rgba(10,14,24,0.48)";
        ctx.lineWidth = 4;
        roundRect(z.x + 2, z.y + 2, z.w - 4, z.h - 4, 24);
        ctx.stroke();

        ctx.globalAlpha = 0.10;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 4;
        roundRect(z.x + 10, z.y + 10, z.w - 20, z.h - 20, 20);
        ctx.stroke();

        ctx.globalAlpha = 1;
        ctx.fillStyle = z.color;
        roundRect(z.x + z.w / 2 - 130, z.y - 52, 260, 40, 16);
        ctx.fill();

        ctx.fillStyle = "#ffffff";
        ctx.font = "1200 16px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(z.label, z.x + z.w / 2, z.y - 32);

        ctx.restore();

        // ✅ (3) 게이트 렌더
        drawZoneGate(z, t);
      }

      drawZone(ZONES.game);
      drawZone(ZONES.community);
      drawZone(ZONES.ads);
    }

    function drawSignal(s, t) {
      const phase = (t + s.phase) % 6;
      const greenOn = phase < 2.4;
      const yellowOn = phase >= 2.4 && phase < 3.2;
      const redOn = phase >= 3.2;
      ctx.save();
      ctx.translate(s.x, s.y);
      groundAO(-10, 28, 20, 10, 0.10);
      ctx.fillStyle = "rgba(40,46,58,0.92)";
      roundRect(-4, -18, 8, 48, 6);
      ctx.fill();
      ctx.fillStyle = "rgba(10,14,24,0.92)";
      roundRect(-14, -42, 28, 28, 10);
      ctx.fill();

      const dot = (yy, on, col) => {
        ctx.save();
        ctx.globalAlpha = on ? 1 : 0.25;
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(0, yy, 4.6, 0, Math.PI * 2);
        ctx.fill();
        if (on) {
          ctx.globalAlpha = 0.18;
          ctx.beginPath();
          ctx.arc(0, yy, 10, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      };
      dot(-34, redOn, "#ff3b30");
      dot(-28, yellowOn, "#ffcc00");
      dot(-22, greenOn, "#34c759");
      ctx.restore();
    }

    /* ----------------------- LEGO Building style ----------------------- */
    function legoStyleForType(type) {
      const wall = "#f2d9b3";
      const base = "#6b717d";
      const grass = "#57c957";
      const sign = "#e12a2a";
      const frame = "#1f242d";
      const glassA = "#bfeeff";
      const glassB = "#86dcff";
      const knob = "#1f242d";
      const accentBy = {
        arcade: "#ff5aa5", tower: "#0a84ff", dojo: "#42e7a5", gym: "#ffd66b",
        igloo: "#bfe9ff", cafe: "#b889ff", mcd: "#ffcc00", social: "#1da1f2",
        wallet: "#34c759", market: "#ffcc00", support: "#8b5cf6", bbq: "#ff2d55",
        baskin: "#ff66cc", paris: "#0a84ff"
      };
      return { wall, base, grass, sign, frame, glassA, glassB, knob, accent: accentBy[type] || "#0a84ff" };
    }

    function drawLegoStudRow(x, y, w, count, color) {
      ctx.save();
      ctx.fillStyle = color;
      const r = 6;
      const step = w / count;
      for (let i = 0; i < count; i++) {
        const cx = x + step * (i + 0.5);
        ctx.beginPath();
        ctx.arc(cx, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath();
        ctx.arc(cx - 1.6, y - 1.8, r * 0.55, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
      }
      ctx.restore();
    }

    function drawLegoBrickGrid(x, y, w, h) {
      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = "rgba(0,0,0,0.22)";
      ctx.lineWidth = 1;
      const rowH = 22;
      for (let yy = y + rowH; yy < y + h; yy += rowH) {
        ctx.beginPath();
        ctx.moveTo(x + 6, yy);
        ctx.lineTo(x + w - 6, yy);
        ctx.stroke();
      }
      const colW = 40;
      let alt = false;
      for (let yy = y; yy < y + h; yy += rowH) {
        const off = alt ? colW * 0.5 : 0;
        for (let xx = x + off; xx < x + w; xx += colW) {
          ctx.beginPath();
          ctx.moveTo(xx, yy + 2);
          ctx.lineTo(xx, Math.min(yy + rowH - 2, y + h - 2));
          ctx.stroke();
        }
        alt = !alt;
      }
      ctx.restore();
    }

    function drawLegoSignPlaque(x, y, w, h, text, textSize, signColor) {
      softShadow(x + 2, y + 4, w, h, 0.12);
      ctx.save();
      ctx.fillStyle = signColor || "#e12a2a";
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 2;
      roundRect(x, y, w, h, 18);
      ctx.fill(); ctx.stroke();

      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      roundRect(x + 8, y + 6, w - 16, Math.max(10, h * 0.35), 14);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      ctx.font = `1200 ${textSize}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x + w * 0.5 + 1.4, y + h * 0.55 + 1.4);

      ctx.fillStyle = "rgba(255,255,255,0.98)";
      ctx.fillText(text, x + w * 0.5, y + h * 0.55);
      ctx.restore();
    }

    function drawLegoWindow(x, y, w, h, frameCol, glassA, glassB) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      roundRect(x - 2, y - 2, w + 4, h + 4, 14);
      ctx.fill();

      ctx.fillStyle = frameCol;
      roundRect(x, y, w, h, 14);
      ctx.fill();

      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, glassA);
      g.addColorStop(1, "rgba(10,14,24,0.14)");
      ctx.fillStyle = g;
      roundRect(x + 4, y + 4, w - 8, h - 8, 10);
      ctx.fill();

      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = "rgba(255,255,255,0.72)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + 6);
      ctx.lineTo(x + w / 2, y + h - 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 6, y + h / 2);
      ctx.lineTo(x + w - 6, y + h / 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawLegoDoor(x, y, w, h, doorCol, frameCol, knobCol) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      roundRect(x - 2, y - 2, w + 4, h + 4, 14);
      ctx.fill();

      ctx.fillStyle = frameCol;
      roundRect(x, y, w, h, 14);
      ctx.fill();

      ctx.fillStyle = doorCol;
      roundRect(x + 4, y + 4, w - 8, h - 8, 12);
      ctx.fill();
      glossyHighlight(x + 2, y + 2, w - 4, h - 4, 0.12);

      ctx.fillStyle = knobCol;
      roundRect(x + w * 0.72, y + h * 0.46, 7, 12, 5);
      ctx.fill();
      ctx.restore();
    }

    function drawPortalBuilding(p, t) {
      const S = legoStyleForType(p.type);
      if (p.key === "twitter") S.sign = "#1da1f2";
      if (p.key === "telegram") S.sign = "#229ED9";
      if (p.key === "wallet") S.sign = "#34c759";
      if (p.key === "market") S.sign = "#ffcc00";
      if (p.key === "support") S.sign = "#8b5cf6";
      if (p.key === "bbq") S.sign = "#ff2d55";
      if (p.key === "baskin") S.sign = "#ff66cc";
      if (p.key === "paris") S.sign = "#0a84ff";

      const isActive = activePortal === p;
      const pulse = 0.55 + 0.45 * Math.sin(t * 3.0 + hash01(p.key) * 6);

      groundAO(p.x + 8, p.y + p.h - 18, p.w - 16, 30, 0.22);

      ctx.save();
      ctx.globalAlpha = 0.08 + (isActive ? 0.14 * pulse : 0);
      ctx.fillStyle = isActive ? "rgba(10,132,255,0.92)" : "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.ellipse(p.x + p.w * 0.5, p.y + p.h * 0.9, 90, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const baseH = 18;
      ctx.save();
      ctx.fillStyle = "rgba(120,94,255,0.52)";
      roundRect(p.x + 6, p.y + p.h - baseH + 6, p.w - 12, baseH, 12);
      ctx.fill();
      ctx.fillStyle = S.grass;
      roundRect(p.x + 10, p.y + p.h - baseH + 2, p.w - 20, 14, 10);
      ctx.fill();
      ctx.restore();

      const bodyX = p.x + 10, bodyY = p.y + 54, bodyW = p.w - 20, bodyH = p.h - 70;
      softShadow(bodyX + 2, bodyY + 8, bodyW, bodyH, 0.12);

      ctx.save();
      ctx.fillStyle = S.wall;
      ctx.strokeStyle = "rgba(0,0,0,0.14)";
      ctx.lineWidth = 2;
      roundRect(bodyX, bodyY, bodyW, bodyH, 18);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = shade(S.wall, +12);
      roundRect(bodyX, bodyY - 14, bodyW, 22, 18);
      ctx.fill();

      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      roundRect(bodyX + 10, bodyY - 10, bodyW - 20, 8, 10);
      ctx.fill();
      ctx.globalAlpha = 1;

      drawLegoBrickGrid(bodyX + 8, bodyY + 10, bodyW - 16, bodyH - 20);
      ctx.restore();

      drawLegoStudRow(bodyX + 14, bodyY - 16, bodyW - 28, Math.max(4, Math.round(bodyW / 70)), shade(S.wall, +22));

      const signPad = 10, signW = bodyW - signPad * 2, signH = 56;
      const signX = bodyX + signPad, signY = p.y + 10;
      const textSize = p.size === "L" ? 34 : p.size === "M" ? 30 : 28;
      drawLegoSignPlaque(signX, signY, signW, signH, p.label, textSize, S.sign);

      const doorW = bodyW * 0.36, doorH = bodyH * 0.44;
      const doorX = bodyX + bodyW * 0.14, doorY = bodyY + bodyH * 0.48;

      const doorColor = (type) => {
        if (type === "mcd") return "#c46b25";
        if (type === "igloo") return "#bfe9ff";
        if (type === "cafe") return "#8b5cf6";
        if (type === "dojo") return "#2ad49a";
        if (type === "tower") return "#0a84ff";
        if (type === "arcade") return "#ff5aa5";
        if (type === "gym") return "#ffd66b";
        if (type === "wallet") return "#34c759";
        if (type === "market") return "#ffcc00";
        if (type === "support") return "#8b5cf6";
        return "#c46b25";
      };
      drawLegoDoor(doorX, doorY, doorW, doorH, doorColor(p.type), S.frame, S.knob);

      const winW = bodyW * 0.38, winH = doorH * 0.72;
      const winX = bodyX + bodyW * 0.56, winY = bodyY + bodyH * 0.54;
      drawLegoWindow(winX, winY, winW, winH, S.frame, S.glassA, S.glassB);

      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = shade(S.accent, 0);
      roundRect(bodyX + 6, bodyY - 22, 34, 18, 6);
      ctx.fill();
      roundRect(bodyX + bodyW - 40, bodyY - 22, 34, 18, 6);
      ctx.fill();
      ctx.restore();

      if (p.status !== "open" || !p.url) {
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = "rgba(10,14,24,0.86)";
        const bx = signX + signW - 134, by = signY + signH + 8;
        roundRect(bx, by, 122, 28, 14);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.98)";
        ctx.font = "1100 12px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("오픈 준비중", bx + 61, by + 14);
        ctx.restore();
      }
    }

    /* ----------------------- Tree / Lamp / Bench / Flower ----------------------- */
    function drawTree(o) {
      const x = o.x, y = o.y, s = o.s;
      groundAO(x - 34 * s, y + 20 * s, 68 * s, 20 * s, 0.13);
      ctx.save();
      ctx.fillStyle = "#a55a22";
      roundRect(x - 10 * s, y - 22 * s, 20 * s, 48 * s, 10 * s);
      ctx.fill();
      glossyHighlight(x - 10 * s, y - 22 * s, 20 * s, 48 * s, 0.10);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(0,0,0,0.16)";
      ctx.fillStyle = "#1fb462";
      function blob(cx, cy, rx, ry) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
      }
      blob(x - 24 * s, y - 46 * s, 26 * s, 22 * s);
      blob(x + 6 * s, y - 60 * s, 32 * s, 26 * s);
      blob(x + 30 * s, y - 44 * s, 26 * s, 22 * s);
      blob(x + 2 * s, y - 40 * s, 34 * s, 24 * s);

      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "#168a4a";
      ctx.beginPath();
      ctx.ellipse(x + 8 * s, y - 44 * s, 30 * s, 22 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.globalAlpha = 0.10;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.ellipse(x - 6 * s, y - 66 * s, 18 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawLamp(o, t) {
      const x = o.x, y = o.y, s = o.s;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.0 + x * 0.01);
      groundAO(x - 18 * s, y + 18 * s, 36 * s, 18 * s, 0.10);
      ctx.save();
      ctx.fillStyle = "#3f4656";
      roundRect(x - 5 * s, y - 44 * s, 10 * s, 74 * s, 8 * s);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      roundRect(x - 18 * s, y - 56 * s, 36 * s, 24 * s, 10 * s);
      ctx.fill();
      glossyHighlight(x - 18 * s, y - 56 * s, 36 * s, 24 * s, 0.18);

      ctx.globalAlpha = 0.06 + 0.20 * pulse;
      ctx.fillStyle = "#ffd66b";
      ctx.beginPath();
      ctx.ellipse(x, y - 10 * s, 36 * s, 56 * s, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function drawBench(o) {
      const x = o.x, y = o.y, s = o.s;
      groundAO(x - 40 * s, y + 12 * s, 80 * s, 18 * s, 0.09);
      ctx.save();
      ctx.fillStyle = "#ffcc00";
      roundRect(x - 42 * s, y - 2 * s, 84 * s, 18 * s, 10 * s);
      ctx.fill();
      glossyHighlight(x - 42 * s, y - 2 * s, 84 * s, 18 * s, 0.12);

      ctx.fillStyle = "rgba(0,0,0,0.22)";
      roundRect(x - 34 * s, y + 14 * s, 14 * s, 10 * s, 5 * s);
      ctx.fill();
      roundRect(x + 20 * s, y + 14 * s, 14 * s, 10 * s, 5 * s);
      ctx.fill();
      ctx.restore();
    }

    function drawFlower(o, t) {
      const x = o.x, y = o.y, s = o.s;
      const wig = Math.sin(t * 2.1 + x * 0.02) * 1.0;
      ctx.save();
      groundAO(x - 10 * s, y + 10 * s, 20 * s, 10 * s, 0.07);
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
        ctx.arc(x + wig + Math.cos(a) * 7 * s, y - 16 * s + Math.sin(a) * 7 * s, 4.2 * s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(x + wig, y - 16 * s, 3.6 * s, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /* ----------------------- Emblems ----------------------- */
    function drawEmblem(e) {
      const x = e.x, y = e.y;
      const p = portalsByKey(e.key);
      const S = legoStyleForType(p ? p.type : "arcade");
      groundAO(x - 22, y + 6, 44, 18, 0.10);
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.strokeStyle = "rgba(0,0,0,0.12)";
      ctx.lineWidth = 2;
      roundRect(-20, -6, 40, 18, 10);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = S.accent;
      ctx.beginPath();
      ctx.arc(0, -18, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /* ----------------------- Cars ----------------------- */
    function drawCar(c) {
      const bounce = Math.sin(c.bob) * 0.35;
      ctx.save();
      ctx.translate(c.x, c.y + bounce);
      const w = c.w, h = c.h;
      const base = c.color;

      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "rgba(10,14,24,0.42)";
      ctx.beginPath();
      ctx.ellipse(0, h * 0.58, w * 0.56, h * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (c.axis === "h") {
        if (c.dir < 0) ctx.scale(-1, 1);
        ctx.fillStyle = base;
        roundRect(-w * 0.52, -h * 0.4, w * 1.04, h * 0.8, 12);
        ctx.fill();
        glossyHighlight(-w * 0.52, -h * 0.4, w * 1.04, h * 0.8, 0.10);

        ctx.fillStyle = shade(base, +16);
        roundRect(-w * 0.2, -h * 0.58, w * 0.4, h * 0.28, 10);
        ctx.fill();

        const g = ctx.createLinearGradient(-w * 0.12, -h * 0.5, w * 0.2, -h * 0.18);
        g.addColorStop(0, "rgba(210,250,255,0.92)");
        g.addColorStop(1, "rgba(10,14,24,0.10)");
        ctx.fillStyle = g;
        roundRect(-w * 0.18, -h * 0.34, w * 0.36, h * 0.26, 8);
        ctx.fill();

        ctx.fillStyle = "rgba(10,14,24,0.16)";
        roundRect(-w * 0.54, h * 0.14, w * 1.08, h * 0.18, 10);
        ctx.fill();

        ctx.fillStyle = "rgba(10,14,24,0.72)";
        ctx.beginPath();
        ctx.arc(-w * 0.3, h * 0.38, h * 0.16, 0, Math.PI * 2);
        ctx.arc(w * 0.3, h * 0.38, h * 0.16, 0, Math.PI * 2);
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
      roundRect(-w * 0.55, -h * 0.5, w * 1.1, h * 1.0, 12);
      ctx.fill();
      glossyHighlight(-w * 0.55, -h * 0.5, w * 1.1, h * 1.0, 0.10);

      ctx.fillStyle = shade(base, +16);
      roundRect(-w * 0.34, -h * 0.62, w * 0.68, h * 0.26, 10);
      ctx.fill();

      const gg = ctx.createLinearGradient(0, -h * 0.4, 0, h * 0.2);
      gg.addColorStop(0, "rgba(210,250,255,0.92)");
      gg.addColorStop(1, "rgba(10,14,24,0.10)");
      ctx.fillStyle = gg;
      roundRect(-w * 0.32, -h * 0.3, w * 0.64, h * 0.52, 10);
      ctx.fill();

      ctx.fillStyle = "rgba(10,14,24,0.16)";
      roundRect(-w * 0.56, h * 0.32, w * 1.12, h * 0.16, 10);
      ctx.fill();

      if (goingDown) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(-w * 0.22, h * 0.5, w * 0.12, h * 0.08, 0, 0, Math.PI * 2);
        ctx.ellipse(w * 0.22, h * 0.5, w * 0.12, h * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "#ff3b30";
        ctx.beginPath();
        ctx.ellipse(-w * 0.22, -h * 0.5, w * 0.12, h * 0.08, 0, 0, Math.PI * 2);
        ctx.ellipse(w * 0.22, -h * 0.5, w * 0.12, h * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    /* ----------------------- Footprints ----------------------- */
    function drawFootprints() {
      ctx.save();
      for (const f of footprints) {
        const a = 0.16 * (1 - f.age / f.life);
        ctx.globalAlpha = a;
        ctx.fillStyle = "rgba(10,14,24,0.62)";
        ctx.beginPath();
        ctx.ellipse(f.x, f.y, 5.2, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    /* ----------------------- Character (업그레이드: 갑옷/무기/방패) ----------------------- */
    function drawSpriteCharacter(x, y) {
      if (!sprite.loaded || !sprite.img) return false;
      const bob = player.moving ? Math.sin(player.bobT) * 0.35 : 0;
      const baseW = 92, baseH = 100;

      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = "rgba(10,14,24,0.42)";
      ctx.beginPath();
      ctx.ellipse(x, y + 28, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(x, y + bob);
      if (player.dir === "left") ctx.scale(-1, 1);
      const s = player.moving ? 0.98 + 0.02 * Math.sin(player.animT * 10) : 1;
      ctx.scale(s, 1);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(sprite.img, -baseW / 2, -74, baseW, baseH);
      ctx.restore();
      return true;
    }

    function drawCapOnHead(hatColor) {
      ctx.save();
      ctx.translate(0, -20);
      ctx.fillStyle = hatColor;
      roundRect(-14, -20, 28, 15, 9);
      ctx.fill();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      roundRect(-10, -17, 20, 5, 6);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = shade(hatColor, -10);
      ctx.beginPath();
      ctx.moveTo(-16, -8);
      ctx.quadraticCurveTo(0, -2, 16, -8);
      ctx.quadraticCurveTo(0, -12, -16, -8);
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "rgba(10,14,24,0.55)";
      roundRect(-12, -6, 24, 4, 3);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawHeroGear(dir, swing) {

  const metal = "#d7dde7";
  const steel = "#c8cfdb";
  const dark = "rgba(10,14,24,0.68)";
  const gold = "#ffcc00";
  const gem = "#0a84ff";

  /* ================= 갑옷 가슴판 ================= */
  ctx.save();

  ctx.globalAlpha = 0.95;
  ctx.fillStyle = metal;
  roundRect(-14, 0, 28, 18, 8);
  ctx.fill();

  // 중앙 라인 음영
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = dark;
  roundRect(-2, 2, 4, 14, 2);
  ctx.fill();

  // 위쪽 하이라이트
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = "white";
  roundRect(-12, 2, 24, 5, 6);
  ctx.fill();

  ctx.restore();

  /* ================= 어깨 갑옷 ================= */
  ctx.save();
  ctx.fillStyle = shade(metal, -10);
  roundRect(-22, 2, 12, 10, 6);
  ctx.fill();
  roundRect(10, 2, 12, 10, 6);
  ctx.fill();
  ctx.restore();

  /* ================= 방패 ================= */
  const shieldSide = (dir === "left") ? -1 : 1;

  ctx.save();
  ctx.translate(20 * shieldSide, 18);
  ctx.rotate(0.12 * shieldSide);

  const sg = ctx.createLinearGradient(-10, -10, 10, 20);
  sg.addColorStop(0, "#3aa0ff");
  sg.addColorStop(1, gem);

  ctx.fillStyle = sg;
  roundRect(-10, -10, 20, 24, 10);
  ctx.fill();

  // 테두리
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  roundRect(-10, -10, 20, 24, 10);
  ctx.stroke();

  // 중앙 엠블럼
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(0, 2, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  /* ================= 검 ================= */
  const swordSide = (dir === "left") ? -1 : 1;

  ctx.save();
  ctx.translate(-20 * swordSide, 18 - swing * 1.5);
  ctx.rotate((-0.4 * swordSide) + swing * 0.1);

  const bladeGrad = ctx.createLinearGradient(0, -26, 0, 2);
  bladeGrad.addColorStop(0, "#f4f7ff");
  bladeGrad.addColorStop(1, steel);

  ctx.fillStyle = bladeGrad;
  roundRect(-2.5, -26, 5, 28, 2.5);
  ctx.fill();

  // 손잡이 가드
  ctx.fillStyle = gold;
  roundRect(-7, 1, 14, 4, 2);
  ctx.fill();

  // 손잡이
  ctx.fillStyle = "rgba(10,14,24,0.8)";
  roundRect(-2, 5, 4, 10, 2);
  ctx.fill();

  ctx.restore();
}

    function drawMinifig(x, y, opts = null) {
      const moving = opts?.moving ?? player.moving;
      const bob = moving ? Math.sin((opts?.bobT ?? player.bobT)) * 0.14 : 0;
      const dir = opts?.dir ?? player.dir;
      const swing = moving ? Math.sin((opts?.animT ?? player.animT) * 10) : 0;
      const isHero = opts?.isHero ?? false;

      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = "rgba(10,14,24,0.42)";
      ctx.beginPath();
      ctx.ellipse(x, y + 28, 20, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(x, y + bob);

      const side = (dir === "left" || dir === "right");
      if (dir === "left") ctx.scale(-1, 1);

      const skin = opts?.skin || "#ffd66b";
      const torso = opts?.torso || (isHero ? "#1f6fff" : "#0a84ff");
      const pants = opts?.pants || (isHero ? "#2a2f3b" : "#3b4251");
      const hat = opts?.hat || (isHero ? "#ffffff" : "#ff3b30");
      const outline = "rgba(0,0,0,0.18)";

      // HEAD
      ctx.save();
      const headG = ctx.createRadialGradient(-6, -24, 6, 0, -18, 22);
      headG.addColorStop(0, "rgba(255,255,255,0.95)");
      headG.addColorStop(0.52, skin);
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

      // 헬멧 느낌(히어로)
      if (isHero) {
  ctx.save();

  const hg = ctx.createLinearGradient(-16, -36, 16, -14);
  hg.addColorStop(0, "#f4f7ff");
  hg.addColorStop(1, "#c8cfdb");
  ctx.fillStyle = hg;
  roundRect(-16, -36, 32, 18, 10);
  ctx.fill();

  // visor
  ctx.fillStyle = "rgba(0,0,0,0.4)";
  roundRect(-10, -28, 20, 6, 6);
  ctx.fill();

  // left horn
  ctx.fillStyle = "#e9e2d2";
  ctx.beginPath();
  ctx.moveTo(-15, -30);
  ctx.quadraticCurveTo(-28, -40, -18, -50);
  ctx.quadraticCurveTo(-8, -40, -15, -30);
  ctx.fill();

  // right horn
  ctx.beginPath();
  ctx.moveTo(15, -30);
  ctx.quadraticCurveTo(28, -40, 18, -50);
  ctx.quadraticCurveTo(8, -40, 15, -30);
  ctx.fill();

  ctx.restore();
} else {
  drawCapOnHead(hat);
}

      // face
      ctx.fillStyle = "rgba(10,14,24,0.74)";
      if (dir === "down") {
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
        ctx.beginPath();
        ctx.arc(7, -22, 2.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(10,14,24,0.62)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(9, -18, 6, -0.25, Math.PI - 0.55);
        ctx.stroke();
      }
      ctx.restore();

      const armSwing = 2.2 * swing;
      const legSwing = 3.0 * swing;

      if (!side) {
        // torso
        ctx.fillStyle = torso;
        roundRect(-14, -4, 28, 28, 12);
        ctx.fill();
        glossyHighlight(-14, -4, 28, 28, 0.10);

        // torso print (hero: emblem + belt)
        ctx.save();
        if (isHero) {
          ctx.globalAlpha = 0.22;
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          roundRect(-9, 6, 18, 6, 6);
          ctx.fill();
          ctx.globalAlpha = 0.14;
          ctx.fillStyle = "rgba(10,14,24,0.65)";
          roundRect(-10, 18, 20, 4, 4);
          ctx.fill();
        } else {
          ctx.globalAlpha = 0.20;
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          roundRect(-9, 6, 18, 6, 6);
          ctx.fill();
          roundRect(-9, 15, 18, 4, 6);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.restore();

        // arms
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

        // legs
        ctx.fillStyle = pants;
        roundRect(-12, 22, 11, 16, 6);
        ctx.fill();
        roundRect(1, 22, 11, 16, 6);
        ctx.fill();

        // shoes (더 디테일)
        ctx.fillStyle = "rgba(10,14,24,0.82)";
        ctx.beginPath();
        ctx.ellipse(-6, 40 + legSwing, 6.4, 3.1, 0, 0, Math.PI * 2);
        ctx.ellipse(6, 40 - legSwing, 6.4, 3.1, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath();
        ctx.ellipse(-7.2, 39.2 + legSwing, 2.6, 1.2, 0, 0, Math.PI * 2);
        ctx.ellipse(4.8, 38.8 - legSwing, 2.6, 1.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // ✅ (2) 히어로 장비(갑옷/검/방패)
        if (isHero) drawHeroGear(dir, swing);

      } else {
        // side torso slimmer
        ctx.fillStyle = torso;
        roundRect(-9, -4, 18, 28, 12);
        ctx.fill();
        glossyHighlight(-9, -4, 18, 28, 0.10);

        // back arm hint
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = shade(torso, -10);
        roundRect(-16, 4, 8, 14, 8);
        ctx.fill();
        ctx.restore();

        // front arm
        ctx.fillStyle = torso;
        roundRect(9, 3, 10, 18, 8);
        ctx.fill();
        ctx.fillStyle = skin;
        roundRect(9, 15 + armSwing, 10, 8, 6);
        ctx.fill();

        // ONE leg
        ctx.fillStyle = pants;
        roundRect(2, 22, 12, 16, 6);
        ctx.fill();

        // shoe
        ctx.fillStyle = "rgba(10,14,24,0.82)";
        ctx.beginPath();
        ctx.ellipse(9, 40 + legSwing, 6.6, 3.1, 0, 0, Math.PI * 2);
        ctx.fill();

        if (isHero) drawHeroGear(dir, swing);
      }

      ctx.restore();
    }

    function drawNPC(key, x, y) {
      const theme = {
        archery: { torso: "#34c759", pants: "#3b4251", hat: "#ffcc00", acc: "bow" },
        janggi: { torso: "#b889ff", pants: "#2a2f3b", hat: "#ff3b30", acc: "stone" },
        omok: { torso: "#ffffff", pants: "#3b4251", hat: "#0a84ff", acc: "stone2" }
      }[key] || { torso: "#ffffff", pants: "#3b4251", hat: "#ff3b30", acc: "none" };

      drawMinifig(x, y, { moving: false, dir: "right", torso: theme.torso, pants: theme.pants, hat: theme.hat });

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(-1, 1);
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

    function drawRoamer(n, palette) {
      const c = palette[n.colorIdx % palette.length];
      drawMinifig(n.x, n.y, { moving: true, dir: n.dir, animT: n.t, bobT: n.t * 0.9, torso: c.torso, pants: c.pants, hat: c.hat });
    }

    /* ----------------------- Title ----------------------- */
    function drawWorldTitle() {
      const text = "FA미니월드";
      const padX = 18;
      ctx.save();
      ctx.globalAlpha = 0.94;
      ctx.font = "1100 20px system-ui";
      const tw = ctx.measureText(text).width;
      const bw = tw + padX * 2, bh = 40;
      const x = VIEW.w * 0.5 - bw * 0.5, y = 14;
      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      ctx.lineWidth = 2;
      roundRect(x, y, bw, bh, 18);
      ctx.fill(); ctx.stroke();
      glossyHighlight(x, y, bw, bh, 0.12);
      ctx.fillStyle = "rgba(10,14,24,0.92)";
      ctx.fillText(text, x + padX, y + 27);
      ctx.restore();
    }

    /* ----------------------- MiniMap ----------------------- */
    function drawMiniMap() {
      const pad = 16;
      const mw = 220, mh = 160;
      const x = VIEW.w - mw - pad;
      const y = 16;

      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      ctx.lineWidth = 2;
      roundRect(x, y, mw, mh, 18);
      ctx.fill(); ctx.stroke();

      ctx.globalAlpha = 0.10;
      ctx.fillStyle = "rgba(10,14,24,0.85)";
      roundRect(x + 10, y + mh - 16, mw - 20, 8, 8);
      ctx.fill();

      ctx.globalAlpha = 1;
      const ix = x + 10, iy = y + 10, iw = mw - 20, ih = mh - 20;
      ctx.save();
      roundRect(ix, iy, iw, ih, 14);
      ctx.clip();

      const sx = iw / WORLD.w, sy = ih / WORLD.h;
      const s = Math.min(sx, sy);
      const ox = ix + (iw - WORLD.w * s) * 0.5;
      const oy = iy + (ih - WORLD.h * s) * 0.5;
      const mx = (wx) => ox + wx * s;
      const my = (wy) => oy + wy * s;

      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "rgba(38,44,55,0.85)";
      for (const r of roads) {
        roundRect(mx(r.x), my(r.y), r.w * s, r.h * s, 8);
        ctx.fill();
      }

      ctx.globalAlpha = 0.28;
      ctx.fillStyle = "#0a84ff";
      roundRect(mx(ZONES.game.x), my(ZONES.game.y), ZONES.game.w * s, ZONES.game.h * s, 8);
      ctx.fill();
      ctx.fillStyle = "#34c759";
      roundRect(mx(ZONES.community.x), my(ZONES.community.y), ZONES.community.w * s, ZONES.community.h * s, 8);
      ctx.fill();
      ctx.fillStyle = "#ff2d55";
      roundRect(mx(ZONES.ads.x), my(ZONES.ads.y), ZONES.ads.w * s, ZONES.ads.h * s, 8);
      ctx.fill();

      // entrance marker
      ctx.globalAlpha = 0.9;
      for (const z of [ZONES.game, ZONES.community, ZONES.ads]) {
        if (!z.entrance) continue;
        ctx.fillStyle = z.color;
        const cx = mx(z.entrance.x + z.entrance.w * 0.5);
        const cy = my(z.entrance.y + z.entrance.h * 0.5);
        ctx.beginPath();
        ctx.arc(cx, cy, 4.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      for (const p of portals) {
        const SS = legoStyleForType(p.type);
        const cx = mx(p.x + p.w * 0.5);
        const cy = my(p.y + p.h * 0.5);
        ctx.save();
        ctx.fillStyle = SS.accent;
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.arc(cx, cy, 4.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const px = mx(player.x), py = my(player.y);
      ctx.save();
      ctx.fillStyle = "rgba(10,132,255,0.98)";
      ctx.beginPath();
      ctx.arc(px, py, 5.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(px, py, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore();
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
      if (entity.kind === "signal") return entity.y + 40;
      if (entity.kind === "roamer") return entity.y + 30;
      if (entity.kind === "player") return entity.y + 30;
      return entity.y;
    }

    /* ----------------------- Update / Draw loop ----------------------- */
    let lastT = performance.now();
    let acc = 0, framesCount = 0;
    let lastMobileZoneKey = "";

    function update(dt, t, rng) {
      let ax = 0, ay = 0;

      if (!dragging && !modalState.open) {
        if (keys.has("a") || keys.has("arrowleft")) ax -= 1;
        if (keys.has("d") || keys.has("arrowright")) ax += 1;
        if (keys.has("w") || keys.has("arrowup")) ay -= 1;
        if (keys.has("s") || keys.has("arrowdown")) ay += 1;

        if (isTouchDevice()) {
          ax += UI.joyState.ax;
          ay += UI.joyState.ay;
          const len = Math.hypot(ax, ay);
          if (len > 1) { ax /= len; ay /= len; }
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
          player.animT *= 0.9;
        }
      }

      player.bobT += dt * 6.0;
      addFootprint(dt, rng);

      // cars
      for (const c of cars) {
        c.bob += dt * 3.0;
        const r = roads.find(rr => rr._id === c.roadId) || roads[0];
        if (!r) continue;

        if (c.axis === "h") {
          c.x += c.dir * c.speed * dt;
          if (c.dir > 0 && c.x > r.x + r.w + 140) c.x = r.x - 140;
          if (c.dir < 0 && c.x < r.x - 140) c.x = r.x + r.w + 140;
        } else {
          c.y += c.dir * c.speed * dt;
          if (c.dir > 0 && c.y > r.y + r.h + 140) c.y = r.y - 140;
          if (c.dir < 0 && c.y < r.y - 140) c.y = r.y + r.h + 140;
        }
      }

      // clouds/birds
      for (const c of clouds) {
        c.x += c.v * (c.layer === 0 ? 1.0 : 0.75) * dt;
        if (c.x > WORLD.w + 420) {
          c.x = -420;
          c.y = 40 + Math.random() * 280;
          c.s = 0.7 + Math.random() * 1.2;
          c.v = 9 + Math.random() * 18;
          c.layer = Math.random() < 0.5 ? 0 : 1;
        }
      }
      for (const b of birds) {
        b.x += b.v * dt;
        b.p += dt * 4.2;
        if (b.x > WORLD.w + 240) {
          b.x = -200;
          b.y = 70 + Math.random() * 170;
          b.v = 22 + Math.random() * 22;
          b.p = Math.random() * 10;
        }
      }

      // active portal check
      activePortal = null;
      for (const p of portals) {
        const z = portalEnterZone(p);
        if (circleRectHit(player.x, player.y, player.r, z)) { activePortal = p; break; }
      }

      if (isTouchDevice() && activePortal && !modalState.open) {
        if (lastMobileZoneKey !== activePortal.key) {
          lastMobileZoneKey = activePortal.key;
          openPortalUI(activePortal);
        }
      }
      if (!activePortal) lastMobileZoneKey = "";

      if (!modalState.open && activePortal) {
        UI.toast.hidden = false;
        const p = activePortal;
        if (p.status === "open" && p.url) {
          UI.toast.innerHTML = blockSpan(`🧱 <b>${p.label}</b><br/>포탈 앞이에요. <b>Enter</b> 또는 <b>E</b>`, { bg: "rgba(10,14,24,0.86)" });
        } else {
          UI.toast.innerHTML = blockSpan(`🧱 <b>${p.label}</b><br/>오픈 준비중입니다`, { bg: "rgba(10,14,24,0.82)" });
        }
      } else if (!modalState.open) {
        UI.toast.hidden = true;
      }

      for (let i = footprints.length - 1; i >= 0; i--) {
        footprints[i].age += dt;
        if (footprints[i].age >= footprints[i].life) footprints.splice(i, 1);
      }

      const roamerPalette = stepRoamers(dt, rng);
      updateCamera(dt);

      UI.coord.textContent = `x: ${Math.round(player.x)} · y: ${Math.round(player.y)}`;
      acc += dt; framesCount++;
      if (acc >= 0.45) {
        UI.fps.textContent = `fps: ${Math.round(framesCount / acc)}`;
        acc = 0; framesCount = 0;
      }
      return roamerPalette;
    }

    function draw(t, roamerPalette) {
      ctx.clearRect(0, 0, VIEW.w, VIEW.h);
      ctx.save();
      ctx.translate(-cam.x, -cam.y);

      drawSkyWorld(t);
      drawCloudsWorld();
      drawGroundWorld();
      drawRoadsAndSidewalks();
      drawZonesWorld(t);
      drawFootprints();

      const items = [];
      for (const p of portals) items.push({ kind: "building", ref: p, footY: getFootY({ kind: "building", y: p.y, h: p.h }) });
      for (const c of cars) items.push({ kind: "car", ref: c, footY: getFootY(c) });
      for (const pr of props) items.push({ kind: pr.kind, ref: pr, footY: getFootY(pr) });
      for (const e of portalEmblems) items.push({ kind: "emblem", ref: e, footY: getFootY(e) });
      for (const n of portalNPCs) items.push({ kind: "npc", ref: n, footY: getFootY(n) });
      for (const sg of signals) items.push({ kind: "signal", ref: sg, footY: getFootY({ kind: "signal", y: sg.y }) });
      for (const r of roamers) items.push({ kind: "roamer", ref: r, footY: getFootY({ kind: "roamer", y: r.y }) });
      items.push({ kind: "player", ref: player, footY: getFootY({ kind: "player", y: player.y }) });

      items.sort((a, b) => a.footY - b.footY);

      for (const it of items) {
        if (it.kind === "building") drawPortalBuilding(it.ref, t);
        else if (it.kind === "car") drawCar(it.ref);
        else if (it.kind === "tree") drawTree(it.ref);
        else if (it.kind === "lamp") drawLamp(it.ref, t);
        else if (it.kind === "bench") drawBench(it.ref);
        else if (it.kind === "flower") drawFlower(it.ref, t);
        else if (it.kind === "emblem") drawEmblem(it.ref);
        else if (it.kind === "npc") drawNPC(it.ref.key, it.ref.x, it.ref.y);
        else if (it.kind === "signal") drawSignal(it.ref, t);
        else if (it.kind === "roamer") drawRoamer(it.ref, roamerPalette);
        else if (it.kind === "player") {
          if (!(SPRITE_SRC && USE_SPRITE_IF_LOADED && drawSpriteCharacter(player.x, player.y))) {
            // ✅ (2) 플레이어는 히어로 장비 적용
            drawMinifig(player.x, player.y, { isHero: true });
          }
        }
      }

      ctx.restore();

      drawWorldTitle();
      drawMiniMap();

      ctx.save();
      const vg = ctx.createRadialGradient(
        VIEW.w * 0.5, VIEW.h * 0.45, Math.min(VIEW.w, VIEW.h) * 0.25,
        VIEW.w * 0.5, VIEW.h * 0.5, Math.max(VIEW.w, VIEW.h) * 0.72
      );
      vg.addColorStop(0, "rgba(10,14,24,0.00)");
      vg.addColorStop(1, "rgba(10,14,24,0.06)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);
      ctx.restore();
    }

    /* ----------------------- Loop ----------------------- */
    function loop(now) {
      const dt = Math.min(0.033, (now - lastT) / 1000);
      lastT = now;
      const t = now / 1000;
      const frameSeed = ((now / 16) | 0) ^ 0x5bd1e995;
      const rng = mulberry32(frameSeed);

      try {
        const roamerPalette = update(dt, t, rng);
        draw(t, roamerPalette);
      } catch (err) {
        console.error(err);
        UI.toast.hidden = false;
        UI.toast.innerHTML = blockSpan(`🧱 <b>JS 에러</b><br/>콘솔(Console) 확인: ${String(err).slice(0, 140)}`);
      }
      requestAnimationFrame(loop);
    }

    /* ----------------------- Portal click ----------------------- */
    let lastMobileTap = 0;
    canvas.addEventListener("pointerdown", (e) => {
      const p = getPointer(e);
      const w = screenToWorld(p.x, p.y);

      if (activePortal && !modalState.open) {
        const z = portalEnterZone(activePortal);
        if (w.x >= z.x - 20 && w.x <= z.x + z.w + 20 && w.y >= z.y - 20 && w.y <= z.y + z.h + 20) {
          openPortalUI(activePortal);
        }
      }

      if (isTouchDevice() && modalState.open && modalState.portal) {
        const now = performance.now();
        if (now - lastMobileTap < 320) confirmEnter(modalState.portal);
        lastMobileTap = now;
      }
    }, { passive: true });

    /* ----------------------- Start ----------------------- */
    resize();
    for (const b of birds) {
      b.x = Math.random() * WORLD.w;
      b.y = 70 + Math.random() * 170;
    }
    requestAnimationFrame(loop);
  });
})();
