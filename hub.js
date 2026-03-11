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
  const SPRITE_SRC = "https://raw.githubusercontent.com/faglobalxgp2024-design/XGP-world/main/%EC%BA%90%EB%A6%AD%ED%84%B0%20%EC%9D%B4%EB%AF%B8%EC%A7%80.png"; // custom pixel character sprite
  const WORLD_ART_BASE_SRC = "https://raw.githubusercontent.com/faglobalxgp2024-design/XGP-world/main/%EB%A7%B5-%EB%B0%94%ED%83%95.png";
  const WORLD_ART_SRC = "https://raw.githubusercontent.com/faglobalxgp2024-design/XGP-world/main/%EB%A9%94%ED%83%80%EC%9B%94%EB%93%9C.png";
  const USE_CUSTOM_WORLD_ART = true;
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

    const worldArt = { base: null, top: null, baseLoaded: false, topLoaded: false };
    function loadSceneImage(src, key) {
      if (!src) return;
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => {
        worldArt[key] = im;
        worldArt[key + "Loaded"] = true;
      };
      im.onerror = () => {
        worldArt[key] = null;
        worldArt[key + "Loaded"] = false;
      };
      im.src = src;
    }
    if (USE_CUSTOM_WORLD_ART) {
      loadSceneImage(WORLD_ART_BASE_SRC, "base");
      loadSceneImage(WORLD_ART_SRC, "top");
    }
    function hasCustomWorldArt() {
      return !!(USE_CUSTOM_WORLD_ART && (worldArt.baseLoaded || worldArt.topLoaded));
    }
    function drawCustomWorldArt() {
      if (!hasCustomWorldArt()) return false;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (worldArt.baseLoaded && worldArt.base) ctx.drawImage(worldArt.base, 0, 0, WORLD.w, WORLD.h);
      if (worldArt.topLoaded && worldArt.top) ctx.drawImage(worldArt.top, 0, 0, WORLD.w, WORLD.h);
      ctx.restore();
      return true;
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
    const birds = Array.from({ length: 7 }, () => ({
      x: 0, y: 0, p: Math.random() * 10, v: 22 + Math.random() * 22
    }));

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
      roads.length = 0;
      sidewalks.length = 0;
      crossings.length = 0;
      signals.length = 0;
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

      function splitRangeByBlocksH(y, x0, x1, h) {
        const segs = [{ a: x0, b: x1 }];
        for (const z of zoneBlocks) {
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

      const L = WORLD.margin * 0.35, R = WORLD.w - WORLD.margin * 0.35;
      const T = WORLD.margin * 0.35, B = WORLD.h - WORLD.margin * 0.35;

      const outerPad = 40;
      addRoadH(T, L - outerPad, R + outerPad, 128);
      addRoadH(B - 128, L - outerPad, R + outerPad, 128);
      addRoadV(L, T - outerPad, B + outerPad, 120);
      addRoadV(R - 120, T - outerPad, B + outerPad, 120);

      const midY1 = WORLD.h * 0.50 - 66;
      const midY2 = WORLD.h * 0.82 - 66;
      const midX = WORLD.w * 0.50 - 60;
      const leftX = WORLD.w * 0.18 - 60;
      const rightX = WORLD.w * 0.82 - 60;

      for (const s of splitRangeByBlocksH(midY1, L - 20, R + 20, 132)) addRoadH(midY1, s.a, s.b, 132);
      for (const s of splitRangeByBlocksH(midY2, L - 20, R + 20, 132)) addRoadH(midY2, s.a, s.b, 132);
      for (const s of splitRangeByBlocksV(leftX, T - 10, B + 10, 120)) addRoadV(leftX, s.a, s.b, 120);
      for (const s of splitRangeByBlocksV(midX, T - 10, B + 10, 120)) addRoadV(midX, s.a, s.b, 120);
      for (const s of splitRangeByBlocksV(rightX, T - 10, B + 10, 120)) addRoadV(rightX, s.a, s.b, 120);

      const Hs = roads.filter(r => r.axis === "h");
      const Vs = roads.filter(r => r.axis === "v");
      for (const h of Hs) for (const v of Vs) {
        const inter = !(h.x + h.w < v.x || h.x > v.x + v.w || h.y + h.h < v.y || h.y > v.y + v.h);
        if (!inter) continue;
        crossings.push({ x: v.x + 8, y: h.y + h.h * 0.5 - 28, w: v.w - 16, h: 56 });
        crossings.push({ x: h.x + h.w * 0.5 - 36, y: v.y + 8, w: 72, h: v.h - 16 });
        signals.push({ x: v.x - 18, y: h.y - 28, dir: "h" });
        signals.push({ x: v.x + v.w + 18, y: h.y + h.h + 28, dir: "h" });
      }
    }

    function recalcWorld() {
      VIEW.zoom = Math.min(1.05, Math.max(0.76, Math.min(W / 1280, H / 860) * 0.95));
      VIEW.w = W / VIEW.zoom;
      VIEW.h = H / VIEW.zoom;

      WORLD.w = Math.max(4200, Math.floor(W * 4.4));
      WORLD.h = Math.max(3000, Math.floor(H * 3.8));

      ZONES = {
        game: { x: WORLD.w * 0.08, y: WORLD.h * 0.14, w: WORLD.w * 0.36, h: WORLD.h * 0.30, label: "GAME ZONE", color: "#0a84ff", entrance: null },
        community: { x: WORLD.w * 0.56, y: WORLD.h * 0.14, w: WORLD.w * 0.36, h: WORLD.h * 0.30, label: "COMMUNITY ZONE", color: "#34c759", entrance: null },
        ads: { x: WORLD.w * 0.32, y: WORLD.h * 0.60, w: WORLD.w * 0.36, h: WORLD.h * 0.20, label: "AD ZONE", color: "#ff2d55", entrance: null },
      };

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

      buildPatterns(mulberry32(seedFromWorld(WORLD.w, WORLD.h)));
      layoutRoadNetwork();

      const desired = {
        jump: { x: ZONES.game.x + ZONES.game.w * 0.20, y: ZONES.game.y + ZONES.game.h * 0.30 },
        archery: { x: ZONES.game.x + ZONES.game.w * 0.50, y: ZONES.game.y + ZONES.game.h * 0.30 },
        omok: { x: ZONES.game.x + ZONES.game.w * 0.80, y: ZONES.game.y + ZONES.game.h * 0.30 },
        avoid: { x: ZONES.game.x + ZONES.game.w * 0.20, y: ZONES.game.y + ZONES.game.h * 0.74 },
        janggi: { x: ZONES.game.x + ZONES.game.w * 0.50, y: ZONES.game.y + ZONES.game.h * 0.74 },
        snow: { x: ZONES.game.x + ZONES.game.w * 0.80, y: ZONES.game.y + ZONES.game.h * 0.74 },

        twitter: { x: ZONES.community.x + ZONES.community.w * 0.25, y: ZONES.community.y + ZONES.community.h * 0.34 },
        telegram: { x: ZONES.community.x + ZONES.community.w * 0.70, y: ZONES.community.y + ZONES.community.h * 0.34 },
        wallet: { x: ZONES.community.x + ZONES.community.w * 0.25, y: ZONES.community.y + ZONES.community.h * 0.76 },
        market: { x: ZONES.community.x + ZONES.community.w * 0.70, y: ZONES.community.y + ZONES.community.h * 0.76 },
        support: { x: ZONES.community.x + ZONES.community.w * 0.48, y: ZONES.community.y + ZONES.community.h * 0.56 },

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

      buildGroundPatches(mulberry32(seedFromWorld(WORLD.w, WORLD.h) ^ 0x1234));
      seedCars(mulberry32(seedFromWorld(WORLD.w, WORLD.h) ^ 0x2345));
      seedProps(mulberry32(seedFromWorld(WORLD.w, WORLD.h) ^ 0x3456));
      seedRoamers(mulberry32(seedFromWorld(WORLD.w, WORLD.h) ^ 0x4567));

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
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      recalcWorld();
    }
    window.addEventListener("resize", resize, { passive: true });

    /* ----------------------- Player direction ----------------------- */
    function updateDirFromDelta(dx, dy) {
      if (Math.abs(dx) > Math.abs(dy)) player.dir = dx >= 0 ? "right" : "left";
      else if (Math.abs(dy) > 0.001) player.dir = dy >= 0 ? "down" : "up";
    }

    /* ----------------------- Portal zones ----------------------- */
    function portalEnterZone(p) {
      return { x: p.x + p.w * 0.18, y: p.y + p.h * 0.56, w: p.w * 0.64, h: p.h * 0.30 };
    }
    function circleRectHit(cx, cy, cr, r) {
      const nx = clamp(cx, r.x, r.x + r.w);
      const ny = clamp(cy, r.y, r.y + r.h);
      const dx = cx - nx, dy = cy - ny;
      return dx * dx + dy * dy <= cr * cr;
    }

    /* ----------------------- Portal UI ----------------------- */
    const modalState = { open: false, portal: null };

    function blockSpan(html, {
      bg = "rgba(255,255,255,0.88)",
      fg = "#0a0e18",
      bd = "rgba(0,0,0,0.08)",
      pad = "12px 16px",
      radius = "16px",
      shadow = "0 16px 40px rgba(0,0,0,0.14)"
    } = {}) {
      return `<span style="display:inline-block;padding:${pad};border-radius:${radius};background:${bg};color:${fg};border:1px solid ${bd};box-shadow:${shadow};">${html}</span>`;
    }

    function fadeTo(action, ms = 220) {
      UI.fade.classList.add("on");
      setTimeout(() => { action(); }, ms * 0.55);
      setTimeout(() => { UI.fade.classList.remove("on"); }, ms + 50);
    }

    function closeModal() {
      modalState.open = false;
      modalState.portal = null;
      UI.modal.style.display = "none";
      UI.modalTitle.innerHTML = "";
      UI.modalBody.innerHTML = "";
      UI.modalHint.innerHTML = "";
    }

    function confirmEnter(p) {
      if (!p) return;
      closeModal();
      if (p.status === "open" && p.url) {
        entering = true;
        fadeTo(() => { window.location.href = p.url; }, 220);
      } else {
        UI.toast.hidden = false;
        UI.toast.innerHTML = blockSpan(`🧱 <b>${p.label}</b><br/>${p.message || "오픈 준비중입니다."}`);
        setTimeout(() => { if (!modalState.open) UI.toast.hidden = true; }, 1500);
      }
    }

    function openPortalUI(p) {
      if (!p) return;
      modalState.open = true;
      modalState.portal = p;
      UI.modal.style.display = "flex";
      const isOpen = p.status === "open" && (!!p.url || !!p.message);
      UI.modalTitle.innerHTML = blockSpan(`🧱 <b>${p.label}</b>`, {
        bg: "rgba(255,255,255,0.92)", pad: "12px 18px", radius: "18px"
      });
      UI.modalBody.innerHTML = isOpen
        ? blockSpan(`입장할까요?<br/><b>Enter</b> 또는 화면을 한번 더 터치`, {
            bg: "rgba(255,255,255,0.90)", pad: "14px 18px", radius: "18px"
          })
        : blockSpan(`오픈 준비중입니다`, {
            bg: "rgba(255,255,255,0.90)", pad: "14px 18px", radius: "18px"
          });
      UI.modalHint.innerHTML = blockSpan(`닫기: <b>ESC</b>`, {
        bg: "rgba(255,255,255,0.74)", pad: "9px 12px", radius: "14px", shadow: "0 10px 24px rgba(0,0,0,0.10)"
      });
    }

    UI.modal.addEventListener("click", () => {
      if (!modalState.open) return;
      if (isTouchDevice() && modalState.portal) confirmEnter(modalState.portal);
      else closeModal();
    });

    function drawFootprints() {
      ctx.save();
      for (const fp of footprints) {
        const t = 1 - fp.age / fp.life;
        ctx.globalAlpha = 0.12 * t;
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        ctx.beginPath();
        ctx.ellipse(fp.x, fp.y, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    /* ----------------------- Rendering: background ----------------------- */
    function drawSkyWorld() {
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
        function drawZoneGate(z, t) {
      if (!z.entrance) return;
      const g = z.entrance;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);

      ctx.save();
      groundAO(g.x - 8, g.y + g.h - 10, g.w + 16, 30, 0.20);

      ctx.fillStyle = "rgba(255,255,255,0.16)";
      roundRect(g.x - 12, g.y - 10, g.w + 24, g.h + 18, 20);
      ctx.fill();

      const grad = ctx.createLinearGradient(g.x, g.y, g.x, g.y + g.h);
      grad.addColorStop(0, "rgba(255,255,255,0.92)");
      grad.addColorStop(1, "rgba(235,244,255,0.88)");
      ctx.fillStyle = grad;
      roundRect(g.x, g.y, g.w, g.h, 18);
      ctx.fill();

      ctx.lineWidth = 3;
      ctx.strokeStyle = z.color;
      roundRect(g.x, g.y, g.w, g.h, 18);
      ctx.stroke();

      ctx.globalAlpha = 0.15 + pulse * 0.10;
      ctx.fillStyle = z.color;
      roundRect(g.x + 6, g.y + 6, g.w - 12, g.h - 12, 14);
      ctx.fill();

      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(10,14,24,0.88)";
      ctx.font = "900 18px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(z.label, g.x + g.w / 2, g.y + 32);

      ctx.font = "800 12px system-ui";
      ctx.fillStyle = "rgba(10,14,24,0.72)";
      ctx.fillText("ENTRANCE", g.x + g.w / 2, g.y + 52);

      ctx.restore();
    }

    function drawZonesWorld(t) {
      const zones = [ZONES.game, ZONES.community, ZONES.ads];
      for (const z of zones) {
        ctx.save();

        ctx.globalAlpha = 0.06;
        ctx.fillStyle = z.color;
        roundRect(z.x, z.y, z.w, z.h, 34);
        ctx.fill();

        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = z.color;
        ctx.lineWidth = 4;
        roundRect(z.x, z.y, z.w, z.h, 34);
        ctx.stroke();

        ctx.globalAlpha = 0.10;
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 2;
        roundRect(z.x + 8, z.y + 8, z.w - 16, z.h - 16, 28);
        ctx.stroke();

        ctx.globalAlpha = 1;
        drawZoneGate(z, t);

        ctx.restore();
      }
    }

    function legoStyleForType(type) {
      const map = {
        arcade: { wall: "#d8c4a2", frame: "#5e4630", knob: "#ffffff", grass: "#60d878", sign: "#ff5e57", glassA: "#9fe1ff", glassB: "#e8fbff", accent: "#ffd166" },
        tower:  { wall: "#d9c7a7", frame: "#59402a", knob: "#fff7d6", grass: "#67d67f", sign: "#0a84ff", glassA: "#b8e7ff", glassB: "#eefbff", accent: "#7c4dff" },
        dojo:   { wall: "#d7c0a4", frame: "#66452f", knob: "#fff0c9", grass: "#62d274", sign: "#ef4444", glassA: "#bfe6ff", glassB: "#eef9ff", accent: "#f59e0b" },
        cafe:   { wall: "#ddccb1", frame: "#6d4f37", knob: "#fff5da", grass: "#6fd97b", sign: "#ec4899", glassA: "#b6ebff", glassB: "#eefcff", accent: "#fb7185" },
        igloo:  { wall: "#dfe8ef", frame: "#567",   knob: "#ffffff", grass: "#8be4a7", sign: "#06b6d4", glassA: "#d3f3ff", glassB: "#f5fdff", accent: "#93c5fd" },
        gym:    { wall: "#d8c5aa", frame: "#5b4634", knob: "#fff2d6", grass: "#68d67e", sign: "#22c55e", glassA: "#afe5ff", glassB: "#eefaff", accent: "#34d399" },
        social: { wall: "#d9c9ad", frame: "#5e4a35", knob: "#fff",    grass: "#67d67f", sign: "#0ea5e9", glassA: "#bcecff", glassB: "#eefcff", accent: "#38bdf8" },
        wallet: { wall: "#d8c4a5", frame: "#5d4632", knob: "#fff5dc", grass: "#64d679", sign: "#10b981", glassA: "#b9edff", glassB: "#effdff", accent: "#6ee7b7" },
        market: { wall: "#dbc9a7", frame: "#60452f", knob: "#fff2d0", grass: "#66d77b", sign: "#f59e0b", glassA: "#baeaff", glassB: "#effcff", accent: "#fbbf24" },
        support:{ wall: "#d8c4aa", frame: "#5b4635", knob: "#fff6df", grass: "#67d67d", sign: "#8b5cf6", glassA: "#c8eaff", glassB: "#f3fbff", accent: "#a78bfa" },
        mcd:    { wall: "#ddc7a8", frame: "#5e4430", knob: "#fff",    grass: "#67d67f", sign: "#ef4444", glassA: "#bce8ff", glassB: "#eefcff", accent: "#facc15" },
        bbq:    { wall: "#dcc6a4", frame: "#5f412b", knob: "#fff",    grass: "#66d77c", sign: "#dc2626", glassA: "#bbe6ff", glassB: "#eefcff", accent: "#fb923c" },
        baskin: { wall: "#dfcdb7", frame: "#6a4c3a", knob: "#fff",    grass: "#6bd87e", sign: "#ec4899", glassA: "#cceeff", glassB: "#f4fdff", accent: "#f9a8d4" },
        paris:  { wall: "#e0d0b8", frame: "#6a503a", knob: "#fff",    grass: "#6ad87d", sign: "#2563eb", glassA: "#c6e9ff", glassB: "#f3fcff", accent: "#93c5fd" },
      };
      return map[type] || map.arcade;
    }

    function drawLegoBrickGrid(x, y, w, h) {
      ctx.save();
      ctx.fillStyle = brickPattern || "#d9c6a3";
      roundRect(x, y, w, h, 18);
      ctx.fill();

      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = "rgba(70,55,40,0.45)";
      ctx.lineWidth = 2;
      const bw = 42, bh = 28;
      for (let yy = y; yy < y + h; yy += bh) {
        const off = (((yy - y) / bh) | 0) % 2 ? bw / 2 : 0;
        for (let xx = x - bw; xx < x + w + bw; xx += bw) {
          ctx.strokeRect(xx + off, yy, bw, bh);
        }
      }
      ctx.restore();
    }

    function drawLegoStudRow(x, y, w, count, col) {
      ctx.save();
      const step = w / count;
      for (let i = 0; i < count; i++) {
        const cx = x + step * (i + 0.5);
        const cy = y;
        ctx.fillStyle = shade(col, 18);
        ctx.beginPath();
        ctx.ellipse(cx, cy, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.20;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.ellipse(cx - 2, cy - 1, 4, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }

    function drawLegoSignPlaque(x, y, w, h, label, textSize, signCol) {
      ctx.save();
      ctx.fillStyle = signCol;
      roundRect(x, y, w, h, 20);
      ctx.fill();

      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#fff";
      roundRect(x + 6, y + 6, w - 12, h * 0.42, 16);
      ctx.fill();
      ctx.globalAlpha = 1;

      drawLegoStudRow(x + 18, y + 10, w - 36, 6, signCol);

      ctx.fillStyle = "#fff";
      ctx.font = `1000 ${textSize}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + w / 2, y + h / 2 + 2);
      ctx.restore();
    }

    function drawLegoWindow(x, y, w, h, frameCol, glassA, glassB) {
      ctx.save();
      ctx.fillStyle = frameCol;
      roundRect(x, y, w, h, 14);
      ctx.fill();

      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, glassA);
      g.addColorStop(1, glassB);
      ctx.fillStyle = g;
      roundRect(x + 8, y + 8, w - 16, h - 16, 10);
      ctx.fill();

      ctx.globalAlpha = 0.24;
      ctx.fillStyle = "#fff";
      roundRect(x + 14, y + 12, w * 0.44, 12, 8);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + 8);
      ctx.lineTo(x + w / 2, y + h - 8);
      ctx.moveTo(x + 8, y + h / 2);
      ctx.lineTo(x + w - 8, y + h / 2);
      ctx.stroke();
      ctx.restore();
    }

    function drawLegoDoor(x, y, w, h, doorCol, frameCol, knobCol) {
      ctx.save();
      ctx.fillStyle = frameCol;
      roundRect(x, y, w, h, 16);
      ctx.fill();

      const dg = ctx.createLinearGradient(x, y, x, y + h);
      dg.addColorStop(0, shade(doorCol, 8));
      dg.addColorStop(1, shade(doorCol, -16));
      ctx.fillStyle = dg;
      roundRect(x + 6, y + 6, w - 12, h - 12, 12);
      ctx.fill();

      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#fff";
      roundRect(x + 10, y + 10, w - 20, h * 0.24, 10);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = knobCol;
      ctx.beginPath();
      ctx.arc(x + w - 18, y + h * 0.56, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawPortalBuilding(p, t) {
      const c = legoStyleForType(p.type);
      const x = p.x, y = p.y, w = p.w, h = p.h;

      groundAO(x + 16, y + h - 10, w - 32, 30, 0.20);
      softShadow(x + 10, y + h - 12, w - 20, 18, 0.10);

      // base body
      drawLegoBrickGrid(x, y + 20, w, h - 20);

      // roof cap
      ctx.save();
      ctx.fillStyle = shade(c.wall, -10);
      roundRect(x + 10, y, w - 20, 34, 16);
      ctx.fill();
      drawLegoStudRow(x + 34, y + 10, w - 68, Math.max(4, Math.floor((w - 68) / 44)), shade(c.wall, -12));
      ctx.restore();

      // sign
      const signH = Math.max(50, h * 0.20);
      drawLegoSignPlaque(x + w * 0.10, y + 34, w * 0.80, signH, p.label, Math.max(18, Math.floor(signH * 0.34)), c.sign);

      // windows / doors by size
      const winY = y + 34 + signH + 18;
      const doorY = y + h * 0.52;
      if (p.size === "L") {
        drawLegoWindow(x + w * 0.10, winY, w * 0.24, h * 0.22, c.frame, c.glassA, c.glassB);
        drawLegoDoor(x + w * 0.39, doorY, w * 0.22, h * 0.36, c.accent, c.frame, c.knob);
        drawLegoWindow(x + w * 0.66, winY, w * 0.24, h * 0.22, c.frame, c.glassA, c.glassB);
      } else {
        drawLegoWindow(x + w * 0.12, winY, w * 0.28, h * 0.20, c.frame, c.glassA, c.glassB);
        drawLegoDoor(x + w * 0.58, doorY, w * 0.22, h * 0.34, c.accent, c.frame, c.knob);
      }

      // flowers / grass at feet
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = c.grass;
      roundRect(x + 14, y + h - 18, w - 28, 12, 8);
      ctx.fill();
      ctx.restore();

      // portal interaction glow
      const ez = portalEnterZone(p);
      const hover = activePortal && activePortal.key === p.key;
      if (hover) {
        ctx.save();
        ctx.globalAlpha = 0.12 + 0.08 * Math.sin(t * 6);
        ctx.fillStyle = c.sign;
        roundRect(ez.x, ez.y, ez.w, ez.h, 12);
        ctx.fill();

        ctx.globalAlpha = 0.75;
        ctx.strokeStyle = c.sign;
        ctx.lineWidth = 3;
        roundRect(ez.x, ez.y, ez.w, ez.h, 12);
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawCar(c) {
      ctx.save();
      ctx.translate(c.x, c.y + Math.sin(c.bob) * 0.8);

      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "rgba(10,14,24,0.95)";
      ctx.beginPath();
      ctx.ellipse(0, c.axis === "h" ? 16 : 24, c.axis === "h" ? c.w * 0.45 : c.w * 0.60, c.axis === "h" ? 7 : 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (c.axis === "h") {
        if (c.dir < 0) ctx.scale(-1, 1);

        ctx.fillStyle = c.color;
        roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 10);
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.16)";
        roundRect(-c.w * 0.42, -c.h * 0.40, c.w * 0.84, c.h * 0.36, 8);
        ctx.fill();

        ctx.fillStyle = "#c7ecff";
        roundRect(-c.w * 0.22, -c.h * 0.32, c.w * 0.36, c.h * 0.28, 6);
        ctx.fill();

        ctx.fillStyle = "#111827";
        ctx.beginPath(); ctx.arc(-c.w * 0.28, c.h * 0.42, 6, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(c.w * 0.28, c.h * 0.42, 6, 0, Math.PI * 2); ctx.fill();
      } else {
        if (c.dir < 0) ctx.scale(1, -1);

        ctx.fillStyle = c.color;
        roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 10);
        ctx.fill();

        ctx.fillStyle = "rgba(255,255,255,0.16)";
        roundRect(-c.w * 0.40, -c.h * 0.42, c.w * 0.80, c.h * 0.30, 8);
        ctx.fill();

        ctx.fillStyle = "#c7ecff";
        roundRect(-c.w * 0.26, -c.h * 0.18, c.w * 0.52, c.h * 0.24, 6);
        ctx.fill();

        ctx.fillStyle = "#111827";
        ctx.beginPath(); ctx.arc(-c.w * 0.44, -c.h * 0.24, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(c.w * 0.44, -c.h * 0.24, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-c.w * 0.44, c.h * 0.24, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(c.w * 0.44, c.h * 0.24, 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    function drawTree(o) {
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.scale(o.s, o.s);

      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "rgba(10,14,24,0.95)";
      ctx.beginPath();
      ctx.ellipse(0, 42, 26, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#8b5a2b";
      roundRect(-10, -8, 20, 52, 8);
      ctx.fill();

      const greens = ["#3bcf74", "#35c96d", "#4bd985"];
      ctx.fillStyle = greens[(hash01(`${o.x},${o.y}`) * greens.length) | 0];
      ctx.beginPath(); ctx.arc(0, -28, 30, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-18, -4, 24, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(18, -2, 22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 10, 26, 0, Math.PI * 2); ctx.fill();

      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(-8, -36, 12, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;

      ctx.restore();
    }

    function drawLamp(o, t) {
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.scale(o.s, o.s);

      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "rgba(10,14,24,0.95)";
      ctx.beginPath();
      ctx.ellipse(0, 42, 14, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#374151";
      roundRect(-4, -42, 8, 78, 4);
      ctx.fill();

      ctx.fillStyle = "#4b5563";
      roundRect(-16, -48, 32, 10, 5);
      ctx.fill();

      ctx.fillStyle = "#fff6b3";
      roundRect(-10, -38, 20, 18, 6);
      ctx.fill();

      ctx.globalAlpha = 0.18 + 0.06 * Math.sin(t * 4 + o.x * 0.01);
      const g = ctx.createRadialGradient(0, -30, 2, 0, -30, 34);
      g.addColorStop(0, "rgba(255,246,179,0.70)");
      g.addColorStop(1, "rgba(255,246,179,0.0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -30, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawBench(o) {
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.scale(o.s, o.s);

      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "rgba(10,14,24,0.90)";
      ctx.beginPath();
      ctx.ellipse(0, 14, 24, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#7c5a3b";
      roundRect(-26, -8, 52, 10, 5);
      ctx.fill();
      roundRect(-22, -18, 44, 8, 4);
      ctx.fill();

      ctx.fillStyle = "#4b5563";
      roundRect(-20, 2, 5, 16, 3);
      ctx.fill();
      roundRect(15, 2, 5, 16, 3);
      ctx.fill();

      ctx.restore();
    }

    function drawFlower(o, t) {
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.scale(o.s, o.s);

      ctx.strokeStyle = "#2f9e59";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(0, -10);
      ctx.stroke();

      const cols = ["#ff6b81", "#ffd166", "#7bdff2", "#c77dff", "#ff9f1c"];
      const col = cols[((hash01(`${o.x}:${o.y}`) * cols.length) | 0)];
      ctx.fillStyle = col;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + t * 0.2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 5, -13 + Math.sin(a) * 5, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffe082";
      ctx.beginPath();
      ctx.arc(0, -13, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function drawEmblem(e) {
      const p = portalsByKey(e.key);
      if (!p) return;
      const c = legoStyleForType(p.type);

      ctx.save();
      ctx.translate(e.x, e.y);

      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "rgba(10,14,24,0.9)";
      ctx.beginPath();
      ctx.ellipse(0, 8, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.lineWidth = 3;
      ctx.strokeStyle = c.sign;
      ctx.stroke();

      ctx.fillStyle = c.sign;
      ctx.font = "900 10px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText((p.label || "?").slice(0, 2), 0, 1);
      ctx.restore();
    }

    function drawNPC(key, x, y) {
      ctx.save();
      ctx.translate(x, y);
      const paletteMap = {
        archery: { torso: "#f59e0b", pants: "#374151", hat: "#0a84ff" },
        janggi:  { torso: "#ef4444", pants: "#374151", hat: "#facc15" },
        omok:    { torso: "#8b5cf6", pants: "#374151", hat: "#ec4899" },
      };
      const pal = paletteMap[key] || { torso: "#0a84ff", pants: "#374151", hat: "#ffcc00" };
      drawMinifig(0, 0, { isHero: false, palette: pal });
      ctx.restore();
    }

    function drawSignal(sg, t) {
      ctx.save();
      ctx.translate(sg.x, sg.y);

      ctx.fillStyle = "#374151";
      roundRect(-4, -32, 8, 54, 4);
      ctx.fill();

      ctx.fillStyle = "#111827";
      roundRect(-12, -54, 24, 22, 8);
      ctx.fill();

      const phase = (Math.sin(t * 1.7 + sg.x * 0.001 + sg.y * 0.001) + 1) * 0.5;
      ctx.fillStyle = phase > 0.5 ? "#ef4444" : "#3f3f46";
      ctx.beginPath(); ctx.arc(0, -46, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = phase <= 0.5 ? "#22c55e" : "#3f3f46";
      ctx.beginPath(); ctx.arc(0, -38, 4, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    }

    function drawRoamer(n, palette) {
      const pal = palette[n.colorIdx % palette.length];
      ctx.save();
      ctx.translate(n.x, n.y);
      drawMinifig(0, 0, { isHero: false, palette: pal, dirOverride: n.dir });
      ctx.restore();
    }

    function drawWorldTitle() {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      const title = "META WORLD";
      ctx.font = "1000 34px system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.94)";
      ctx.strokeStyle = "rgba(10,14,24,0.16)";
      ctx.lineWidth = 6;
      ctx.strokeText(title, W * 0.5, 18);
      ctx.fillText(title, W * 0.5, 18);

      ctx.font = "800 13px system-ui";
      ctx.fillStyle = "rgba(10,14,24,0.66)";
      ctx.fillText("PORTAL WORLD · COMMUNITY · ADS", W * 0.5, 58);
      ctx.restore();
    }

    function drawMiniMap() {
      const mw = 220, mh = 154;
      const x = W - mw - 18, y = 18;

      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.84)";
      roundRect(x, y, mw, mh, 18);
      ctx.fill();

      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      roundRect(x, y, mw, mh, 18);
      ctx.stroke();

      const pad = 12;
      const sx = (mw - pad * 2) / WORLD.w;
      const sy = (mh - pad * 2) / WORLD.h;

      function rr(r, fill) {
        ctx.fillStyle = fill;
        roundRect(x + pad + r.x * sx, y + pad + r.y * sy, r.w * sx, r.h * sy, 6);
        ctx.fill();
      }

      rr({ x: 0, y: 0, w: WORLD.w, h: WORLD.h }, "rgba(67,220,107,0.24)");
      rr(ZONES.game, "rgba(10,132,255,0.22)");
      rr(ZONES.community, "rgba(52,199,89,0.22)");
      rr(ZONES.ads, "rgba(255,45,85,0.20)");

      for (const r of roads) {
        ctx.fillStyle = "rgba(38,44,55,0.68)";
        roundRect(x + pad + r.x * sx, y + pad + r.y * sy, r.w * sx, r.h * sy, 4);
        ctx.fill();
      }

      for (const p of portals) {
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.beginPath();
        ctx.arc(x + pad + (p.x + p.w * 0.5) * sx, y + pad + (p.y + p.h * 0.6) * sy, 2.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(x + pad + player.x * sx, y + pad + player.y * sy, 3.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "800 11px system-ui";
      ctx.fillStyle = "rgba(10,14,24,0.74)";
      ctx.fillText("MINIMAP", x + 14, y + 16);
      ctx.restore();
    }

    function updateCamera(dt) {
      cam.targetX = clamp(player.x - VIEW.w * 0.5, 0, Math.max(0, WORLD.w - VIEW.w));
      cam.targetY = clamp(player.y - VIEW.h * 0.54, 0, Math.max(0, WORLD.h - VIEW.h));
      cam.x = lerp(cam.x, cam.targetX, Math.min(1, dt * 8.0));
      cam.y = lerp(cam.y, cam.targetY, Math.min(1, dt * 8.0));
    }

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
      ctx.imageSmoothingEnabled = false;
      ctx.imageSmoothingQuality = "low";
      ctx.drawImage(sprite.img, -baseW / 2, -90, baseW, baseH * 1.14);
      ctx.restore();
      return true;
    }

    function drawMinifig(x, y, opts = {}) {
      const isHero = !!opts.isHero;
      const pal = opts.palette || {
        torso: isHero ? "#111827" : "#0a84ff",
        pants: isHero ? "#2d3748" : "#374151",
        hat: isHero ? "#dc2626" : "#ffcc00",
        skin: "#ffd7b5",
        hair: "#1f2937"
      };
      const dir = opts.dirOverride || player.dir;
      const walk = isHero ? player.animT : 0;
      const bob = isHero ? Math.sin(player.bobT) * 1.2 : 0;
      const armSwing = player.moving ? Math.sin(walk * 10) * 0.35 : 0;
      const legSwing = player.moving ? Math.sin(walk * 10 + Math.PI) * 0.32 : 0;

      ctx.save();
      ctx.translate(x, y + bob);

      if (dir === "left") ctx.scale(-1, 1);

      ctx.globalAlpha = 0.24;
      ctx.fillStyle = "rgba(10,14,24,0.42)";
      ctx.beginPath();
      ctx.ellipse(0, 30, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // legs
      ctx.save();
      ctx.translate(0, 14);
      ctx.rotate(legSwing * 0.14);
      ctx.fillStyle = pal.pants;
      roundRect(-13, 0, 10, 22, 4);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(0, 14);
      ctx.rotate(-legSwing * 0.14);
      ctx.fillStyle = pal.pants;
      roundRect(3, 0, 10, 22, 4);
      ctx.fill();
      ctx.restore();

      // torso
      const torsoGrad = ctx.createLinearGradient(0, -20, 0, 12);
      torsoGrad.addColorStop(0, shade(pal.torso, 12));
      torsoGrad.addColorStop(1, shade(pal.torso, -10));
      ctx.fillStyle = torsoGrad;
      roundRect(-18, -14, 36, 30, 8);
      ctx.fill();

      ctx.globalAlpha = 0.10;
      ctx.fillStyle = "#fff";
      roundRect(-14, -10, 28, 8, 6);
      ctx.fill();
      ctx.globalAlpha = 1;

      // armor-like chest for hero
      if (isHero) {
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        roundRect(-11, -7, 22, 14, 6);
        ctx.fill();
        ctx.strokeStyle = "rgba(220,38,38,0.65)";
        ctx.lineWidth = 2;
        roundRect(-9, -5, 18, 10, 5);
        ctx.stroke();
      }

      // arms
      ctx.save();
      ctx.translate(-18, -4);
      ctx.rotate(-0.35 + armSwing * 0.5);
      ctx.fillStyle = pal.torso;
      roundRect(-4, 0, 8, 22, 4);
      ctx.fill();
      if (isHero) {
        ctx.fillStyle = "#374151";
        roundRect(-5, 10, 10, 10, 4);
        ctx.fill();
      }
      ctx.restore();

      ctx.save();
      ctx.translate(18, -4);
      ctx.rotate(0.35 - armSwing * 0.5);
      ctx.fillStyle = pal.torso;
      roundRect(-4, 0, 8, 22, 4);
      ctx.fill();

      if (isHero) {
        // shield
        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.moveTo(10, 10);
        ctx.lineTo(18, 8);
        ctx.lineTo(20, 18);
        ctx.lineTo(14, 24);
        ctx.lineTo(8, 18);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#dc2626";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
            // head
      ctx.fillStyle = pal.skin || "#ffd7b5";
      roundRect(-13, -36, 26, 20, 8);
      ctx.fill();

      // hair / helmet
      if (isHero) {
        ctx.fillStyle = "#111827";
        roundRect(-15, -42, 30, 12, 8);
        ctx.fill();
        ctx.fillStyle = "#dc2626";
        roundRect(-12, -40, 24, 8, 6);
        ctx.fill();
      } else {
        ctx.fillStyle = pal.hair || "#1f2937";
        roundRect(-14, -40, 28, 10, 7);
        ctx.fill();
        ctx.fillStyle = pal.hat || "#ffcc00";
        roundRect(-10, -47, 20, 8, 5);
        ctx.fill();
      }

      // face
      ctx.fillStyle = "#111827";
      ctx.beginPath(); ctx.arc(-5, -26, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5, -26, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.75;
      ctx.fillRect(-4, -21, 8, 1.5);
      ctx.globalAlpha = 1;

      // sword for hero
      if (isHero) {
        ctx.save();
        ctx.translate(-22, 6);
        ctx.rotate(-0.75 + armSwing * 0.25);
        ctx.fillStyle = "#9ca3af";
        roundRect(-2, -18, 4, 28, 2);
        ctx.fill();
        ctx.fillStyle = "#dc2626";
        roundRect(-4, 8, 8, 4, 2);
        ctx.fill();

        ctx.globalAlpha = 0.24;
        const g = ctx.createLinearGradient(0, -22, 0, 10);
        g.addColorStop(0, "rgba(255,255,255,0.65)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(0, -28);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      ctx.restore();
    }

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

    let lastT = performance.now();
    let acc = 0, framesCount = 0;
    let lastMobileZoneKey = "";

    function update(dt, t, rng) {
      let ax = 0, ay = 0;

      if (!dragging && !modalState.open && !entering) {
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
          const len = Math.hypot(ax, ay) || 1;
          const vx = (ax / len) * player.speed * dt;
          const vy = (ay / len) * player.speed * dt;
          player.x += vx;
          player.y += vy;
          clampPlayerToWorld();
          updateDirFromDelta(vx, vy);
          player.animT += dt;
          player.bobT += dt * 10;
        }
      }

      addFootprint(dt, rng);

      for (let i = footprints.length - 1; i >= 0; i--) {
        const fp = footprints[i];
        fp.age += dt;
        if (fp.age >= fp.life) footprints.splice(i, 1);
      }

      for (const c of cars) {
        c.bob += dt * 3.0;
        const road = roads.find(r => r._id === c.roadId);
        if (!road) continue;

        if (c.axis === "h") {
          c.x += c.dir * c.speed * dt;
          if (c.dir > 0 && c.x - c.w / 2 > road.x + road.w + 40) c.x = road.x - 40;
          if (c.dir < 0 && c.x + c.w / 2 < road.x - 40) c.x = road.x + road.w + 40;
        } else {
          c.y += c.dir * c.speed * dt;
          if (c.dir > 0 && c.y - c.h / 2 > road.y + road.h + 40) c.y = road.y - 40;
          if (c.dir < 0 && c.y + c.h / 2 < road.y - 40) c.y = road.y + road.h + 40;
        }
      }

      for (const c of clouds) {
        c.x += c.v * dt * (c.layer === 0 ? 1.0 : 0.72);
        if (c.x > WORLD.w + 220) c.x = -220;
      }
      for (const b of birds) {
        b.x += b.v * dt;
        b.p += dt * 6;
        if (b.x > WORLD.w + 120) b.x = -120;
      }

      const roamerPalette = stepRoamers(dt, rng);

      activePortal = null;
      for (const p of portals) {
        if (circleRectHit(player.x, player.y, player.r + 8, portalEnterZone(p))) {
          activePortal = p;
          break;
        }
      }

      if (!modalState.open && activePortal) {
        UI.toast.hidden = false;
        UI.toast.innerHTML = blockSpan(
          activePortal.status === "open"
            ? `🧱 <b>${activePortal.label}</b><br/>입장하려면 <b>E</b> 또는 <b>Enter</b>`
            : `🧱 <b>${activePortal.label}</b><br/>오픈 준비중입니다.`,
          { bg: "rgba(255,255,255,0.88)" }
        );
      } else if (!modalState.open) {
        UI.toast.hidden = true;
      }

      if (isTouchDevice()) {
        if (activePortal && !modalState.open && lastMobileZoneKey !== activePortal.key) {
          lastMobileZoneKey = activePortal.key;
          openPortalUI(activePortal);
        }
        if (!activePortal) lastMobileZoneKey = "";
      }

      updateCamera(dt);

      UI.coord.textContent = `x:${Math.round(player.x)} y:${Math.round(player.y)}`;
      acc += dt;
      framesCount++;
      if (acc >= 0.4) {
        UI.fps.textContent = `fps:${Math.round(framesCount / acc)}`;
        acc = 0;
        framesCount = 0;
      }

      return roamerPalette;
    }

    function draw(t, roamerPalette) {
      ctx.clearRect(0, 0, W, H);

      ctx.save();
      ctx.scale(VIEW.zoom, VIEW.zoom);
      ctx.translate(-cam.x, -cam.y);

      const usingCustomWorldArt = drawCustomWorldArt();
      if (!usingCustomWorldArt) {
        drawSkyWorld();
        drawCloudsWorld();
        drawGroundWorld();
        drawRoadsAndSidewalks();
        drawZonesWorld(t);
      }

      drawFootprints();

      const renderables = [];

      if (!usingCustomWorldArt) {
        for (const p of portals) renderables.push({ kind: "building", ref: p });
        for (const pr of props) renderables.push({ kind: pr.kind, ref: pr });
        for (const sg of signals) renderables.push({ kind: "signal", ref: sg });
        for (const em of portalEmblems) renderables.push({ kind: "emblem", ref: em });
        for (const npc of portalNPCs) renderables.push({ kind: "npc", ref: npc });
      }

      for (const c of cars) renderables.push({ kind: "car", ref: c });
      for (const r of roamers) renderables.push({ kind: "roamer", ref: r });
      renderables.push({ kind: "player", ref: player });

      renderables.sort((a, b) => getFootY({ ...a.ref, kind: a.kind }) - getFootY({ ...b.ref, kind: b.kind }));

      for (const item of renderables) {
        const r = item.ref;
        switch (item.kind) {
          case "building": drawPortalBuilding(r, t); break;
          case "car": drawCar(r); break;
          case "tree": drawTree(r); break;
          case "lamp": drawLamp(r, t); break;
          case "bench": drawBench(r); break;
          case "flower": drawFlower(r, t); break;
          case "signal": drawSignal(r, t); break;
          case "emblem": drawEmblem(r); break;
          case "npc": drawNPC(r.key, r.x, r.y); break;
          case "roamer": drawRoamer(r, roamerPalette); break;
          case "player":
            if (!drawSpriteCharacter(player.x, player.y)) {
              drawMinifig(player.x, player.y, { isHero: true });
            }
            break;
        }
      }

      ctx.restore();

      drawWorldTitle();
      drawMiniMap();
    }

    function loop(now) {
      const dt = Math.min(0.033, (now - lastT) / 1000);
      lastT = now;
      const t = now / 1000;
      const rng = mulberry32(((now * 1000) | 0) ^ 0xa53c9e1);

      const roamerPalette = update(dt, t, rng);
      draw(t, roamerPalette);

      requestAnimationFrame(loop);
    }

    let touchTapAt = 0;
    canvas.addEventListener("pointerdown", () => {
      if (!isTouchDevice()) return;
      const now = performance.now();
      if (modalState.open && modalState.portal) {
        if (now - touchTapAt < 340) confirmEnter(modalState.portal);
        touchTapAt = now;
      } else if (activePortal) {
        openPortalUI(activePortal);
      }
    }, { passive: true });

    resize();
    for (const b of birds) {
      b.x = Math.random() * WORLD.w;
      b.y = 50 + Math.random() * 200;
    }
    requestAnimationFrame(loop);
  });
})();
                          
