/* ===================== [PART 1 / 3] ===================== */
/* HUN.JS - LEGO PREMIUM (single-file) v2.6
 * 적용:
 * 1) 모바일 조이스틱: 오른쪽으로 이동 + 살짝 크게
 * 2) 캐릭터 디테일: 갑옷/무기/방패 디테일 추가
 * 3) 존 입구: 고급스러운 “게이트/입구” 생성 + 시각적 강조
 * 4) 도로: 존 바깥 정렬 + 도로가 끊겨 보이지 않게 연장/연결 개선 + 차량 라인 안 잘리도록
 * 5) 가로등: 랜덤 → 도로를 따라 규칙적으로 정렬 배치
 *
 * (추가 적용)
 * 6) 검/투구뿔: 고퀄 빛나는(글로우+파티클) 효과
 * 7) 옆모습 다리 중심 정렬(좌/우 이동시 다리 붙는 문제 해결)
 * 8) 인벤토리(I): 실제 인벤토리 느낌 UI + 장착/해제 즉시 반영
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

    /* ---------- Inventory UI (I key) ---------- */
    const inv = ensureEl("inventory_overlay", "div");
    inv.style.position = "fixed";
    inv.style.inset = "0";
    inv.style.zIndex = "10002";
    inv.style.display = "none";
    inv.style.alignItems = "center";
    inv.style.justifyContent = "center";
    inv.style.pointerEvents = "auto";

    const invBackdrop = ensureEl("inventory_backdrop", "div", inv);
    invBackdrop.style.position = "absolute";
    invBackdrop.style.inset = "0";
    invBackdrop.style.background = "rgba(10,14,24,0.55)";
    invBackdrop.style.backdropFilter = "blur(8px)";
    invBackdrop.style.webkitBackdropFilter = "blur(8px)";

    const invPanel = ensureEl("inventory_panel", "div", inv);
    invPanel.style.position = "relative";
    invPanel.style.width = "min(980px, calc(100vw - 36px))";
    invPanel.style.maxHeight = "min(720px, calc(100vh - 36px))";
    invPanel.style.overflow = "hidden";
    invPanel.style.borderRadius = "22px";
    invPanel.style.background = "rgba(255,255,255,0.92)";
    invPanel.style.border = "1px solid rgba(0,0,0,0.10)";
    invPanel.style.boxShadow = "0 28px 80px rgba(0,0,0,0.28)";
    invPanel.style.display = "grid";
    invPanel.style.gridTemplateColumns = "1fr 360px";
    invPanel.style.gap = "0";
    invPanel.style.userSelect = "none";
    invPanel.style.webkitUserSelect = "none";

    const invLeft = ensureEl("inventory_left", "div", invPanel);
    invLeft.style.padding = "18px 18px 16px";
    invLeft.style.borderRight = "1px solid rgba(0,0,0,0.08)";
    invLeft.style.display = "flex";
    invLeft.style.flexDirection = "column";
    invLeft.style.gap = "12px";

    const invTitleRow = ensureEl("inventory_title_row", "div", invLeft);
    invTitleRow.style.display = "flex";
    invTitleRow.style.alignItems = "center";
    invTitleRow.style.justifyContent = "space-between";
    invTitleRow.style.gap = "10px";

    const invTitle = ensureEl("inventory_title", "div", invTitleRow);
    invTitle.textContent = "INVENTORY";
    invTitle.style.font = "1200 18px system-ui";
    invTitle.style.letterSpacing = "1.6px";
    invTitle.style.color = "rgba(10,14,24,0.92)";

    const invHint = ensureEl("inventory_hint", "div", invTitleRow);
    invHint.textContent = "I: 닫기 · 클릭: 장착/해제";
    invHint.style.font = "900 12px system-ui";
    invHint.style.opacity = "0.72";

    const invGrid = ensureEl("inventory_grid", "div", invLeft);
    invGrid.style.display = "grid";
    invGrid.style.gridTemplateColumns = "repeat(6, 1fr)";
    invGrid.style.gap = "10px";
    invGrid.style.padding = "10px";
    invGrid.style.borderRadius = "18px";
    invGrid.style.background = "rgba(10,14,24,0.06)";
    invGrid.style.border = "1px solid rgba(0,0,0,0.08)";

    const invFooter = ensureEl("inventory_footer", "div", invLeft);
    invFooter.style.display = "flex";
    invFooter.style.justifyContent = "space-between";
    invFooter.style.alignItems = "center";
    invFooter.style.gap = "10px";

    const invDesc = ensureEl("inventory_desc", "div", invFooter);
    invDesc.textContent = "아이템을 클릭하면 바로 장착/해제됩니다.";
    invDesc.style.font = "900 12px system-ui";
    invDesc.style.opacity = "0.70";

    const invCloseBtn = ensureEl("inventory_close_btn", "button", invFooter);
    invCloseBtn.textContent = "닫기";
    invCloseBtn.style.cursor = "pointer";
    invCloseBtn.style.padding = "10px 14px";
    invCloseBtn.style.borderRadius = "14px";
    invCloseBtn.style.border = "1px solid rgba(0,0,0,0.12)";
    invCloseBtn.style.background = "rgba(255,255,255,0.92)";
    invCloseBtn.style.font = "1100 13px system-ui";
    invCloseBtn.style.boxShadow = "0 10px 24px rgba(0,0,0,0.12)";

    const invRight = ensureEl("inventory_right", "div", invPanel);
    invRight.style.padding = "18px 18px 16px";
    invRight.style.display = "flex";
    invRight.style.flexDirection = "column";
    invRight.style.gap = "12px";

    const equipTitle = ensureEl("equip_title", "div", invRight);
    equipTitle.textContent = "EQUIPPED";
    equipTitle.style.font = "1200 16px system-ui";
    equipTitle.style.letterSpacing = "1.2px";
    equipTitle.style.opacity = "0.88";

    const equipSlots = ensureEl("equip_slots", "div", invRight);
    equipSlots.style.display = "grid";
    equipSlots.style.gridTemplateColumns = "repeat(2, 1fr)";
    equipSlots.style.gap = "10px";

    const equipPreview = ensureEl("equip_preview", "div", invRight);
    equipPreview.style.marginTop = "6px";
    equipPreview.style.padding = "12px";
    equipPreview.style.borderRadius = "18px";
    equipPreview.style.background = "rgba(10,14,24,0.06)";
    equipPreview.style.border = "1px solid rgba(0,0,0,0.08)";
    equipPreview.style.font = "900 12px system-ui";
    equipPreview.style.lineHeight = "1.35";
    equipPreview.style.opacity = "0.80";
    equipPreview.textContent = "장비는 화면의 히어로에게 즉시 반영됩니다.";

    // prevent closing when clicking inside panel
    invPanel.addEventListener("pointerdown", (e) => e.stopPropagation());

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

    // inventory close interactions
    inv.addEventListener("pointerdown", () => { inv.dispatchEvent(new CustomEvent("inventory_close_request")); });
    invCloseBtn.addEventListener("click", (e) => { e.preventDefault(); inv.dispatchEvent(new CustomEvent("inventory_close_request")); });

    return { canvas, toast, coord, fps, fade, modal, modalTitle, modalBody, modalHint, joyState, inv, invGrid, equipSlots, invDesc };
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

    /* ----------------------- Inventory / Equipment ----------------------- */
    const playerEquip = {
      helmet: true,
      armor: true,
      sword: true,
      shield: true
    };

    const ITEM_DEFS = [
      { id: "helmet_horned", name: "뿔 투구", slot: "helmet", icon: "🪖", rarity: "Epic" },
      { id: "armor_knight", name: "흑적 갑옷", slot: "armor", icon: "🛡️", rarity: "Epic" },
      { id: "sword_rune", name: "룬 검", slot: "sword", icon: "🗡️", rarity: "Legend" },
      { id: "shield_knight", name: "기사 방패", slot: "shield", icon: "🛡️", rarity: "Epic" },
    ];

    const inventory = ITEM_DEFS.map((d) => ({ ...d, owned: true, equipped: true }));

    const invState = { open: false, hoverItemId: "" };

    function equipForSlot(slot) {
      if (slot === "helmet") return playerEquip.helmet;
      if (slot === "armor") return playerEquip.armor;
      if (slot === "sword") return playerEquip.sword;
      if (slot === "shield") return playerEquip.shield;
      return false;
    }
    function setEquipForSlot(slot, v) {
      if (slot === "helmet") playerEquip.helmet = v;
      if (slot === "armor") playerEquip.armor = v;
      if (slot === "sword") playerEquip.sword = v;
      if (slot === "shield") playerEquip.shield = v;
    }

    function syncInventoryEquippedFlags() {
      for (const it of inventory) {
        it.equipped = it.owned ? equipForSlot(it.slot) : false;
      }
    }

    function toggleItem(it) {
      if (!it.owned) return;
      const next = !equipForSlot(it.slot);
      setEquipForSlot(it.slot, next);
      syncInventoryEquippedFlags();
      renderInventoryUI();
    }

    function toggleInventory(openForce = null) {
      const wantOpen = openForce == null ? !invState.open : !!openForce;
      invState.open = wantOpen;
      UI.inv.style.display = invState.open ? "flex" : "none";
      if (invState.open) {
        syncInventoryEquippedFlags();
        renderInventoryUI();
      }
    }

    function renderInventoryUI() {
      if (!UI.invGrid || !UI.equipSlots) return;

      // grid
      UI.invGrid.innerHTML = "";
      const totalSlots = 30; // 6x5
      const items = inventory.slice(0);

      for (let i = 0; i < totalSlots; i++) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.style.height = "74px";
        cell.style.borderRadius = "16px";
        cell.style.border = "1px solid rgba(0,0,0,0.10)";
        cell.style.background = "rgba(255,255,255,0.85)";
        cell.style.boxShadow = "0 10px 24px rgba(0,0,0,0.08)";
        cell.style.cursor = "pointer";
        cell.style.display = "flex";
        cell.style.flexDirection = "column";
        cell.style.alignItems = "center";
        cell.style.justifyContent = "center";
        cell.style.gap = "4px";
        cell.style.padding = "8px";
        cell.style.userSelect = "none";
        cell.style.webkitUserSelect = "none";

        const it = items[i];
        if (!it) {
          cell.style.background = "rgba(255,255,255,0.55)";
          cell.style.boxShadow = "none";
          cell.style.cursor = "default";
          cell.disabled = true;
          cell.textContent = "";
        } else {
          const top = document.createElement("div");
          top.textContent = it.icon;
          top.style.fontSize = "22px";
          top.style.lineHeight = "1";
          const nm = document.createElement("div");
          nm.textContent = it.name;
          nm.style.font = "1000 11px system-ui";
          nm.style.opacity = "0.86";
          nm.style.textAlign = "center";
          nm.style.maxWidth = "100%";
          nm.style.whiteSpace = "nowrap";
          nm.style.overflow = "hidden";
          nm.style.textOverflow = "ellipsis";

          const tag = document.createElement("div");
          tag.textContent = it.equipped ? "EQUIPPED" : "CLICK TO EQUIP";
          tag.style.font = "1100 9px system-ui";
          tag.style.letterSpacing = "0.6px";
          tag.style.opacity = it.equipped ? "0.95" : "0.60";
          tag.style.padding = "3px 6px";
          tag.style.borderRadius = "999px";
          tag.style.border = "1px solid rgba(0,0,0,0.10)";
          tag.style.background = it.equipped ? "rgba(52,199,89,0.14)" : "rgba(10,14,24,0.06)";

          if (it.equipped) {
            cell.style.outline = "2px solid rgba(52,199,89,0.45)";
            cell.style.background = "rgba(255,255,255,0.92)";
          }

          cell.appendChild(top);
          cell.appendChild(nm);
          cell.appendChild(tag);

          cell.addEventListener("mouseenter", () => { invState.hoverItemId = it.id; });
          cell.addEventListener("mouseleave", () => { invState.hoverItemId = ""; });
          cell.addEventListener("click", (e) => { e.preventDefault(); toggleItem(it); });
        }

        UI.invGrid.appendChild(cell);
      }

      // equipped slots
      UI.equipSlots.innerHTML = "";
      const slotDefs = [
        { slot: "helmet", label: "HEAD" },
        { slot: "armor", label: "CHEST" },
        { slot: "sword", label: "MAIN HAND" },
        { slot: "shield", label: "OFF HAND" },
      ];

      for (const s of slotDefs) {
        const card = document.createElement("button");
        card.type = "button";
        card.style.borderRadius = "18px";
        card.style.border = "1px solid rgba(0,0,0,0.10)";
        card.style.background = "rgba(255,255,255,0.88)";
        card.style.boxShadow = "0 10px 24px rgba(0,0,0,0.08)";
        card.style.padding = "12px 12px";
        card.style.cursor = "pointer";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.gap = "6px";
        card.style.userSelect = "none";
        card.style.webkitUserSelect = "none";

        const t1 = document.createElement("div");
        t1.textContent = s.label;
        t1.style.font = "1100 11px system-ui";
        t1.style.letterSpacing = "1px";
        t1.style.opacity = "0.70";

        const it = inventory.find((x) => x.slot === s.slot);
        const on = equipForSlot(s.slot);
        const t2 = document.createElement("div");
        t2.textContent = it ? `${it.icon} ${it.name}` : "—";
        t2.style.font = "1100 13px system-ui";
        t2.style.opacity = on ? "0.96" : "0.46";

        const t3 = document.createElement("div");
        t3.textContent = on ? "장착됨 (클릭하여 해제)" : "해제됨 (클릭하여 장착)";
        t3.style.font = "1000 11px system-ui";
        t3.style.opacity = on ? "0.70" : "0.60";

        if (on) card.style.outline = "2px solid rgba(10,132,255,0.30)";

        card.appendChild(t1);
        card.appendChild(t2);
        card.appendChild(t3);

        card.addEventListener("click", (e) => {
          e.preventDefault();
          const invIt = inventory.find((x) => x.slot === s.slot);
          if (invIt) toggleItem(invIt);
        });

        UI.equipSlots.appendChild(card);
      }

      if (UI.invDesc) {
        const active = inventory.filter((x) => x.equipped).map((x) => x.name).join(", ");
        UI.invDesc.textContent = active ? `장착 중: ${active}` : "장착 중인 아이템 없음";
      }
    }

    // close requests from overlay/button
    UI.inv.addEventListener("inventory_close_request", () => toggleInventory(false));

    let activePortal = null;
    let entering = false;

    /* ----------------------- Input ----------------------- */
    const keys = new Set();
    let dragging = false;
    let dragOffset = { x: 0, y: 0 };

    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();

      // inventory toggle
      if (k === "i") {
        e.preventDefault();
        toggleInventory();
        return;
      }

      keys.add(k);

      if (k === "enter" || k === "e") {
        if (modalState.open && modalState.portal) confirmEnter(modalState.portal);
        else if (activePortal) openPortalUI(activePortal);
      }

      if (k === "escape") {
        if (invState.open) toggleInventory(false);
        else closeModal();
      }
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
        const c = {
          torso: ["#0a84ff", "#34c759", "#ff3b30", "#ffcc00", "#af52de", "#ffffff"][(rng() * 6) | 0],
          pants: ["#2a2f3b", "#3b4251", "#1f2a44"][(rng() * 3) | 0],
          hat: ["#ff3b30", "#ffcc00", "#34c759", "#0a84ff", "#ffffff"][(rng() * 5) | 0],
        };
        roamers.push({ kind: "roamer", x, y, dir: rng() < 0.5 ? "left" : "right", vx: 0, vy: 0, t: rng() * 10, c });
      }
    }

    /* ===================== [PART 2 / 3] ===================== */
    /* ----------------------- Geometry / Drawing helpers ----------------------- */
    function resize() {
      DPR = Math.min(2, window.devicePixelRatio || 1);
      W = Math.floor(window.innerWidth);
      H = Math.floor(window.innerHeight);
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      VIEW.w = W;
      VIEW.h = H;

      // world scale
      const base = Math.min(W, H);
      VIEW.zoom = clamp(base / 920, 0.72, 1.10);

      layoutWorld(mulberry32(seedFromWorld(W, H)));
    }
    window.addEventListener("resize", resize);

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

    function blockSpan(html) {
      return `<div style="display:inline-block; padding:12px 16px; border-radius:16px; background:rgba(255,255,255,0.86); border:1px solid rgba(0,0,0,0.10); box-shadow:0 18px 52px rgba(0,0,0,0.14); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);">${html}</div>`;
    }

    function groundAO(x, y, w, h, a) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(10,14,24,0.55)";
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function glossyHighlight(x, y, w, h, a) {
      ctx.save();
      ctx.globalAlpha = a;
      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, "rgba(255,255,255,0.85)");
      g.addColorStop(0.55, "rgba(255,255,255,0.00)");
      ctx.fillStyle = g;
      roundRect(x, y, w, h, Math.min(14, w / 2, h / 2));
      ctx.fill();
      ctx.restore();
    }

    /* ----------------------- Modal state ----------------------- */
    const modalState = { open: false, portal: null };

    function openModal(title, body, hint) {
      modalState.open = true;
      UI.modal.style.display = "flex";
      UI.modalTitle.textContent = title;
      UI.modalBody.innerHTML = body;
      UI.modalHint.textContent = hint || "";
    }
    function closeModal() {
      modalState.open = false;
      modalState.portal = null;
      UI.modal.style.display = "none";
    }

    /* ----------------------- Portal UI ----------------------- */
    function portalEnterZone(portal) {
      const zone = (portal.key === "avoid" || portal.key === "archery" || portal.key === "janggi" || portal.key === "omok" || portal.key === "snow" || portal.key === "jump")
        ? ZONES.game
        : (portal.key === "twitter" || portal.key === "telegram" || portal.key === "wallet" || portal.key === "market" || portal.key === "support")
          ? ZONES.community
          : ZONES.ads;

      if (zone.entrance) return zone.entrance;
      return { x: zone.x + zone.w * 0.5 - 120, y: zone.y + zone.h - 140, w: 240, h: 110 };
    }

    function openPortalUI(portal) {
      if (!portal) return;
      modalState.portal = portal;

      const status = portal.status === "open" ? "OPEN" : "SOON";
      const msg = portal.status === "open"
        ? `입장하려면 <b>Enter</b> 또는 <b>E</b> 키를 누르세요.`
        : `아직 준비 중입니다.`;

      const body = `
        <div style="font:1200 20px system-ui; letter-spacing:0.4px; margin-bottom:8px;">${portal.label}</div>
        <div style="font:1000 14px system-ui; opacity:0.75; margin-bottom:10px;">STATUS: <b>${status}</b></div>
        <div style="font:900 14px system-ui; opacity:0.85;">${portal.message ? portal.message : msg}</div>
      `;
      openModal("PORTAL", body, "ESC: 닫기");
    }

    function confirmEnter(portal) {
      if (!portal || portal.status !== "open" || !portal.url) return;
      entering = true;
      UI.fade.classList.add("on");
      setTimeout(() => {
        window.location.href = portal.url;
      }, 240);
    }

    /* ----------------------- World layout ----------------------- */
    function splitRangeByBlocksH(y, L, R, h) {
      const blocks = [];
      for (const z of [ZONES.game, ZONES.community, ZONES.ads]) {
        blocks.push({ a: z.x - 24, b: z.x + z.w + 24 });
      }
      blocks.sort((a, b) => a.a - b.a);
      const segs = [];
      let cur = L;
      for (const b of blocks) {
        if (b.a <= cur) { cur = Math.max(cur, b.b); continue; }
        segs.push({ a: cur, b: b.a });
        cur = b.b;
      }
      if (cur < R) segs.push({ a: cur, b: R });
      return segs.filter(s => s.b - s.a > 220);
    }
    function splitRangeByBlocksV(x, T, B, w) {
      const blocks = [];
      for (const z of [ZONES.game, ZONES.community, ZONES.ads]) {
        blocks.push({ a: z.y - 24, b: z.y + z.h + 24 });
      }
      blocks.sort((a, b) => a.a - b.a);
      const segs = [];
      let cur = T;
      for (const b of blocks) {
        if (b.a <= cur) { cur = Math.max(cur, b.b); continue; }
        segs.push({ a: cur, b: b.a });
        cur = b.b;
      }
      if (cur < B) segs.push({ a: cur, b: B });
      return segs.filter(s => s.b - s.a > 220);
    }

    let roadsSeeded = false;
    function layoutWorld(rng) {
      WORLD.w = Math.max(4200, Math.floor(W * 4.4));
      WORLD.h = Math.max(3000, Math.floor(H * 3.8));

      // zones placement
      ZONES.game.w = WORLD.w * 0.22;
      ZONES.game.h = WORLD.h * 0.24;
      ZONES.game.x = WORLD.w * 0.10;
      ZONES.game.y = WORLD.h * 0.12;

      ZONES.community.w = WORLD.w * 0.22;
      ZONES.community.h = WORLD.h * 0.24;
      ZONES.community.x = WORLD.w * 0.39;
      ZONES.community.y = WORLD.h * 0.12;

      ZONES.ads.w = WORLD.w * 0.22;
      ZONES.ads.h = WORLD.h * 0.24;
      ZONES.ads.x = WORLD.w * 0.68;
      ZONES.ads.y = WORLD.h * 0.12;

      // entrances
      ZONES.game.entrance = { x: ZONES.game.x + ZONES.game.w * 0.5 - 120, y: ZONES.game.y + ZONES.game.h - 140, w: 240, h: 110 };
      ZONES.community.entrance = { x: ZONES.community.x + ZONES.community.w * 0.5 - 120, y: ZONES.community.y + ZONES.community.h - 140, w: 240, h: 110 };
      ZONES.ads.entrance = { x: ZONES.ads.x + ZONES.ads.w * 0.5 - 120, y: ZONES.ads.y + ZONES.ads.h - 140, w: 240, h: 110 };

      // portal building placement inside zones
      function placeInZone(zone, list) {
        const pad = 68;
        const inner = { x: zone.x + pad, y: zone.y + pad, w: zone.w - pad * 2, h: zone.h - pad * 2 - 84 };
        const cols = 3;
        const rows = Math.ceil(list.length / cols);
        const cellW = inner.w / cols;
        const cellH = inner.h / rows;
        for (let i = 0; i < list.length; i++) {
          const c = i % cols;
          const r = (i / cols) | 0;
          const p = list[i];
          const w = p.size === "L" ? 190 : 160;
          const h = p.size === "L" ? 150 : 130;
          const x = inner.x + c * cellW + cellW * 0.5 - w / 2;
          const y = inner.y + r * cellH + cellH * 0.5 - h / 2;
          p.x = x; p.y = y; p.w = w; p.h = h;
        }
      }

      const gameList = portals.filter(p => ["avoid", "archery", "janggi", "omok", "snow", "jump"].includes(p.key));
      const commList = portals.filter(p => ["twitter", "telegram", "wallet", "market", "support"].includes(p.key));
      const adsList = portals.filter(p => ["mcd", "bbq", "baskin", "paris"].includes(p.key));
      placeInZone(ZONES.game, gameList);
      placeInZone(ZONES.community, commList);
      placeInZone(ZONES.ads, adsList);

      // roads only once per layout
      roads.length = 0; sidewalks.length = 0; crossings.length = 0; signals.length = 0;

      let rid = 0;
      function addRoadH(y, x1, x2, h) {
        const r = { kind: "road", axis: "h", x: x1, y, w: x2 - x1, h, _id: rid++ };
        roads.push(r);
        sidewalks.push({ x: r.x - 24, y: r.y - 18, w: r.w + 48, h: 18 });
        sidewalks.push({ x: r.x - 24, y: r.y + r.h, w: r.w + 48, h: 18 });
      }
      function addRoadV(x, y1, y2, w) {
        const r = { kind: "road", axis: "v", x, y: y1, w, h: y2 - y1, _id: rid++ };
        roads.push(r);
        sidewalks.push({ x: r.x - 18, y: r.y - 24, w: 18, h: r.h + 48 });
        sidewalks.push({ x: r.x + r.w, y: r.y - 24, w: 18, h: r.h + 48 });
      }

      // outer ring roads
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

      // seed props/cars/roamers once per layout
      seedProps(rng);
      seedCars(rng);
      seedRoamers(rng);

      roadsSeeded = true;
    }

    /* ----------------------- Camera + player movement ----------------------- */
    function updateDirFromDelta(dx, dy) {
      if (Math.abs(dx) > Math.abs(dy)) player.dir = dx < 0 ? "left" : "right";
      else player.dir = dy < 0 ? "up" : "down";
    }

    function update(dt, t, rng) {
      let ax = 0, ay = 0;

      if (!dragging && !modalState.open && !invState.open) {
        if (keys.has("a") || keys.has("arrowleft")) ax -= 1;
        if (keys.has("d") || keys.has("arrowright")) ax += 1;
        if (keys.has("w") || keys.has("arrowup")) ay -= 1;
        if (keys.has("s") || keys.has("arrowdown")) ay += 1;

        if (isTouchDevice()) {
          ax += UI.joyState.ax;
          ay += UI.joyState.ay;
          const len = Math.hypot(ax, ay) || 1;
          ax /= len; ay /= len;
        }

        const len = Math.hypot(ax, ay);
        if (len > 0.01) {
          player.moving = true;
          player.x += (ax / len) * player.speed * dt;
          player.y += (ay / len) * player.speed * dt;
          clampPlayerToWorld();
          updateDirFromDelta(ax, ay);
          player.animT += dt;
          player.bobT += dt * 7.2;
        } else {
          player.moving = false;
        }
      }

      // camera follows
      cam.targetX = player.x - VIEW.w / 2;
      cam.targetY = player.y - VIEW.h / 2;
      cam.x = lerp(cam.x, cam.targetX, 1 - Math.pow(0.0001, dt));
      cam.y = lerp(cam.y, cam.targetY, 1 - Math.pow(0.0001, dt));
      cam.x = clamp(cam.x, 0, Math.max(0, WORLD.w - VIEW.w));
      cam.y = clamp(cam.y, 0, Math.max(0, WORLD.h - VIEW.h));

      // active portal
      activePortal = null;
      for (const p of portals) {
        const cx = p.x + p.w / 2;
        const cy = p.y + p.h;
        if (Math.hypot(cx - player.x, cy - player.y) < 120) {
          activePortal = p; break;
        }
      }

      // roamers wander
      for (const n of roamers) {
        n.t += dt;
        if ((n.t % 2.4) < dt) {
          const a = rng() * Math.PI * 2;
          n.vx = Math.cos(a) * (36 + rng() * 58);
          n.vy = Math.sin(a) * (36 + rng() * 58);
          n.dir = Math.abs(n.vx) > Math.abs(n.vy) ? (n.vx < 0 ? "left" : "right") : (n.vy < 0 ? "up" : "down");
        }
        const nx = n.x + n.vx * dt;
        const ny = n.y + n.vy * dt;
        if (nx > WORLD.margin && nx < WORLD.w - WORLD.margin && ny > WORLD.margin && ny < WORLD.h - WORLD.margin) {
          n.x = nx; n.y = ny;
        }
      }

      // cars
      for (const c of cars) {
        if (c.axis === "h") {
          c.x += c.dir * c.speed * dt;
          if (c.x < -120) c.x = WORLD.w + 120;
          if (c.x > WORLD.w + 120) c.x = -120;
        } else {
          c.y += c.dir * c.speed * dt;
          if (c.y < -120) c.y = WORLD.h + 120;
          if (c.y > WORLD.h + 120) c.y = -120;
        }
      }

      return null;
    }

    /* ----------------------- LEGO Building style ----------------------- */
    function legoStyleForType(type) {
      const wall = "#f2d9b3";
      const base = "#6b717d";
      const grass = "#57c957";
      if (type === "arcade") return { wall: "#eaf0ff", roof: "#0a84ff", base, accent: "#0a84ff" };
      if (type === "tower") return { wall: "#fff0f0", roof: "#ff3b30", base, accent: "#ff3b30" };
      if (type === "dojo") return { wall, roof: "#2a2f3b", base: "#3b4251", accent: "#ff2d55" };
      if (type === "cafe") return { wall: "#fff", roof: "#ffcc00", base, accent: "#ffcc00" };
      if (type === "igloo") return { wall: "#f5fbff", roof: "#0a84ff", base, accent: "#0a84ff" };
      if (type === "gym") return { wall: "#f7f7ff", roof: "#34c759", base, accent: "#34c759" };
      if (type === "social") return { wall: "#ffffff", roof: "#af52de", base, accent: "#af52de" };
      if (type === "wallet") return { wall: "#ffffff", roof: "#0a84ff", base, accent: "#0a84ff" };
      if (type === "market") return { wall: "#ffffff", roof: "#34c759", base, accent: "#34c759" };
      if (type === "support") return { wall: "#ffffff", roof: "#ff2d55", base, accent: "#ff2d55" };
      if (type === "bbq") return { wall: "#fff6f0", roof: "#ff3b30", base, accent: "#ff3b30" };
      if (type === "mcd") return { wall: "#fff8e6", roof: "#ffcc00", base, accent: "#ffcc00" };
      if (type === "baskin") return { wall: "#fff0fb", roof: "#ff2d55", base, accent: "#ff2d55" };
      if (type === "paris") return { wall: "#fff", roof: "#0a84ff", base, accent: "#0a84ff" };
      return { wall: "#ffffff", roof: "#0a84ff", base, accent: "#0a84ff" };
    }

    /* ----------------------- Drawing: world ----------------------- */
    function drawBackground(t) {
      ctx.save();
      ctx.fillStyle = "#eaf6ff";
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);

      // subtle sky gradient
      const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
      g.addColorStop(0, "rgba(10,132,255,0.08)");
      g.addColorStop(1, "rgba(52,199,89,0.06)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);
      ctx.restore();
    }

    function drawRoad(r) {
      ctx.save();
      ctx.fillStyle = "rgba(38,44,55,0.88)";
      roundRect(r.x - cam.x, r.y - cam.y, r.w, r.h, 22);
      ctx.fill();

      // lane
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 3;
      ctx.setLineDash([18, 18]);
      if (r.axis === "h") {
        ctx.beginPath();
        ctx.moveTo(r.x - cam.x + 28, r.y - cam.y + r.h / 2);
        ctx.lineTo(r.x - cam.x + r.w - 28, r.y - cam.y + r.h / 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(r.x - cam.x + r.w / 2, r.y - cam.y + 28);
        ctx.lineTo(r.x - cam.x + r.w / 2, r.y - cam.y + r.h - 28);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      ctx.restore();
    }

    function drawSidewalk(s) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "rgba(245,245,245,0.92)";
      roundRect(s.x - cam.x, s.y - cam.y, s.w, s.h, 16);
      ctx.fill();
      ctx.globalAlpha = 0.20;
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      roundRect(s.x - cam.x, s.y - cam.y + (s.h > s.w ? 2 : 0), s.w, s.h, 16);
      ctx.fill();
      ctx.restore();
    }

    function drawCrossing(c) {
      ctx.save();
      ctx.globalAlpha = 0.86;
      ctx.fillStyle = "rgba(255,255,255,0.86)";
      roundRect(c.x - cam.x, c.y - cam.y, c.w, c.h, 18);
      ctx.fill();

      // stripes
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "rgba(10,14,24,0.22)";
      const n = 8;
      for (let i = 0; i < n; i++) {
        const xx = c.x + (c.w / n) * i + 6;
        roundRect(xx - cam.x, c.y - cam.y + 8, (c.w / n) - 12, c.h - 16, 10);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawSignal(s, t) {
      const phase = (t + s.phase) % 6;
      const greenOn = phase < 2.4;
      const yellowOn = phase >= 2.4 && phase < 3.2;
      const redOn = phase >= 3.2;
      ctx.save();
      ctx.translate(s.x - cam.x, s.y - cam.y);
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

    /* ----------------------- Props draw ----------------------- */
    function drawTree(p) {
      ctx.save();
      ctx.translate(p.x - cam.x, p.y - cam.y);
      ctx.scale(p.s, p.s);

      groundAO(0, 52, 28, 10, 0.10);

      ctx.fillStyle = "#6b4b2a";
      roundRect(-8, 12, 16, 44, 10);
      ctx.fill();

      const g = ctx.createRadialGradient(0, -6, 8, 0, -10, 44);
      g.addColorStop(0, "rgba(52,199,89,0.95)");
      g.addColorStop(1, "rgba(30,140,70,0.95)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -4, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.arc(-10, -18, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.restore();
    }

    function drawFlower(p) {
      ctx.save();
      ctx.translate(p.x - cam.x, p.y - cam.y);
      ctx.scale(p.s, p.s);
      groundAO(0, 10, 12, 4, 0.08);

      ctx.fillStyle = "#34c759";
      roundRect(-2, 0, 4, 12, 3);
      ctx.fill();

      const cols = ["#ff2d55", "#ffcc00", "#0a84ff", "#af52de", "#ffffff"];
      const col = cols[((p.x + p.y) | 0) % cols.length];
      ctx.fillStyle = col;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 5, 2 + Math.sin(a) * 5, 4, 2.6, a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgba(10,14,24,0.20)";
      ctx.beginPath();
      ctx.arc(0, 2, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawBench(p) {
      ctx.save();
      ctx.translate(p.x - cam.x, p.y - cam.y);
      ctx.scale(p.s, p.s);
      groundAO(0, 18, 30, 8, 0.10);

      ctx.fillStyle = "rgba(10,14,24,0.80)";
      roundRect(-26, 6, 52, 10, 8);
      ctx.fill();

      ctx.globalAlpha = 0.24;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      roundRect(-22, 8, 44, 4, 4);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = "#6b717d";
      roundRect(-22, 16, 6, 10, 4);
      ctx.fill();
      roundRect(16, 16, 6, 10, 4);
      ctx.fill();

      ctx.restore();
    }

    function drawLamp(p, t) {
      ctx.save();
      ctx.translate(p.x - cam.x, p.y - cam.y);
      ctx.scale(p.s, p.s);

      groundAO(0, 52, 22, 8, 0.10);

      ctx.fillStyle = "rgba(40,46,58,0.92)";
      roundRect(-4, 0, 8, 54, 6);
      ctx.fill();

      ctx.fillStyle = "rgba(10,14,24,0.92)";
      roundRect(-14, -10, 28, 16, 10);
      ctx.fill();

      const on = (Math.sin(t * 2 + p.x * 0.01) * 0.5 + 0.5);
      ctx.globalAlpha = 0.82;
      ctx.fillStyle = `rgba(255,204,0,${0.55 + 0.35 * on})`;
      ctx.beginPath();
      ctx.arc(0, -2, 5.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.arc(0, -2, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.restore();
    }

    function drawSign(s) {
      ctx.save();
      ctx.translate(s.x - cam.x, s.y - cam.y);
      groundAO(0, 36, 22, 7, 0.10);

      ctx.fillStyle = "rgba(40,46,58,0.92)";
      roundRect(-4, -8, 8, 44, 6);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.92)";
      roundRect(-40, -44, 80, 34, 14);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      ctx.lineWidth = 2;
      roundRect(-40, -44, 80, 34, 14);
      ctx.stroke();

      ctx.fillStyle = "rgba(10,14,24,0.86)";
      ctx.font = "1100 12px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(s.text, 0, -27);

      ctx.restore();
    }

    function drawZoneGate(z, t) {
      const e = z.entrance;
      if (!e) return;
      const x = e.x - cam.x, y = e.y - cam.y;

      ctx.save();
      groundAO(x + e.w / 2, y + e.h + 18, e.w * 0.55, 14, 0.12);

      // outer gate frame
      ctx.globalAlpha = 0.94;
      ctx.fillStyle = "rgba(255,255,255,0.76)";
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      ctx.lineWidth = 2;
      roundRect(x, y, e.w, e.h, 26);
      ctx.fill();
      ctx.stroke();

      // inner glow bar
      const pulse = (Math.sin(t * 2.2) * 0.5 + 0.5);
      const g = ctx.createLinearGradient(x, y, x + e.w, y);
      g.addColorStop(0, "rgba(255,255,255,0)");
      g.addColorStop(0.5, `${z.color}55`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.globalAlpha = 0.7 + 0.18 * pulse;
      ctx.fillStyle = g;
      roundRect(x + 10, y + 10, e.w - 20, 12, 10);
      ctx.fill();

      // label plate
      ctx.globalAlpha = 1;
      ctx.fillStyle = z.color;
      roundRect(x + e.w / 2 - 130, y - 52, 260, 40, 16);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.font = "1200 16px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(z.label, x + e.w / 2, y - 32);

      ctx.restore();
    }

    /* ----------------------- draw building (portal) ----------------------- */
    function drawBuilding(p, t) {
      const SS = legoStyleForType(p.type);
      const x = p.x - cam.x, y = p.y - cam.y;

      ctx.save();
      // base shadow
      groundAO(x + p.w / 2, y + p.h + 18, p.w * 0.45, 14, 0.10);

      // base
      ctx.fillStyle = SS.base;
      roundRect(x - 6, y + p.h - 18, p.w + 12, 30, 18);
      ctx.fill();

      // wall
      ctx.fillStyle = SS.wall;
      roundRect(x, y, p.w, p.h - 10, 22);
      ctx.fill();
      glossyHighlight(x + 10, y + 10, p.w - 20, p.h - 30, 0.12);

      // roof
      ctx.fillStyle = SS.roof;
      roundRect(x - 4, y - 18, p.w + 8, 32, 18);
      ctx.fill();
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      roundRect(x + 10, y - 12, p.w - 20, 12, 10);
      ctx.fill();
      ctx.globalAlpha = 1;

      // door
      ctx.fillStyle = "rgba(10,14,24,0.82)";
      roundRect(x + p.w / 2 - 24, y + p.h - 62, 48, 52, 16);
      ctx.fill();

      // windows
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "rgba(10,132,255,0.18)";
      roundRect(x + 14, y + 26, 34, 26, 12);
      ctx.fill();
      roundRect(x + p.w - 48, y + 26, 34, 26, 12);
      ctx.fill();
      ctx.globalAlpha = 1;

      // sign
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      ctx.lineWidth = 2;
      roundRect(x + p.w / 2 - 64, y + 20, 128, 34, 16);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "rgba(10,14,24,0.86)";
      ctx.font = "1200 12px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.label, x + p.w / 2, y + 37);

      // status badge
      const open = p.status === "open";
      ctx.save();
      ctx.globalAlpha = 0.96;
      ctx.fillStyle = open ? "rgba(52,199,89,0.90)" : "rgba(255,59,48,0.90)";
      roundRect(x + p.w - 62, y + 10, 52, 20, 10);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "1100 10px system-ui";
      ctx.fillText(open ? "OPEN" : "SOON", x + p.w - 36, y + 20);
      ctx.restore();

      ctx.restore();
    }

    function drawEmblem(e) {
      const p = portalsByKey(e.key);
      if (!p) return;
      const SS = legoStyleForType(p.type);
      const x = e.x - cam.x, y = e.y - cam.y;
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = SS.accent;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(-3, -3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    /* ----------------------- draw NPC ----------------------- */
    function drawCapOnHead(color) {
      ctx.save();
      ctx.fillStyle = color;
      roundRect(-14, -36, 28, 12, 10);
      ctx.fill();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      roundRect(-10, -34, 20, 5, 8);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    function drawNPC(key, x, y) {
      const theme = {
        archery: { torso: "#34c759", pants: "#3b4251", hat: "#ffcc00", acc: "bow" },
        janggi: { torso: "#b889ff", pants: "#2a2f3b", hat: "#ff3b30", acc: "stone" },
        omok: { torso: "#ffffff", pants: "#3b4251", hat: "#0a84ff", acc: "stone" },
      }[key] || { torso: "#0a84ff", pants: "#3b4251", hat: "#ff3b30", acc: "" };

      drawMinifig(x, y, { moving: false, dir: "right", torso: theme.torso, pants: theme.pants, hat: theme.hat });

      ctx.save();
      ctx.translate(x - cam.x, y - cam.y);
      ctx.scale(-1, 1);
      if (theme.acc === "bow") {
        ctx.globalAlpha = 0.92;
        ctx.strokeStyle = "rgba(10,14,24,0.72)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(-22, 10, 14, -Math.PI * 0.6, Math.PI * 0.6);
        ctx.stroke();
      } else if (theme.acc === "stone") {
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = "rgba(10,14,24,0.68)";
        roundRect(-28, 14, 16, 12, 6);
        ctx.fill();
      }
      ctx.restore();
    }

    /* ----------------------- Character: hero gear ----------------------- */
    function drawHeroGear(dir, swing, equip = playerEquip) {
      // Black + Red premium knight kit + shield shape + dark particle glow accents
      const metalDark = "#1a1d24";
      const metalMid  = "#2a2f3b";
      const red1 = "#ff2d55";
      const red2 = "#b00024";
      const steel = "#c8cfdb";
      const gold = "#ffcc00";
      const dark = "rgba(10,14,24,0.72)";

      if (equip.armor) {

      // ===== Chest Armor (black base + red accents) =====
      ctx.save();

      // base plate
      const cg = ctx.createLinearGradient(-14, 0, 14, 18);
      cg.addColorStop(0, metalMid);
      cg.addColorStop(1, "rgba(10,14,24,0.28)");
      ctx.globalAlpha = 0.98;
      ctx.fillStyle = cg;
      roundRect(-15, 0, 30, 19, 9);
      ctx.fill();

      // inner plate
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = metalDark;
      roundRect(-12.5, 2.5, 25, 14, 8);
      ctx.fill();

      // red cross / stripe
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = red1;
      roundRect(-2.2, 2.5, 4.4, 14, 2.2);
      ctx.fill();
      roundRect(-10, 8.2, 20, 3.8, 2.2);
      ctx.fill();

      // tiny rivets
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.beginPath(); ctx.arc(-9.5, 4.5, 1.2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc( 9.5, 4.5, 1.2, 0, Math.PI*2); ctx.fill();

      // edge stroke
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = dark;
      ctx.lineWidth = 2;
      roundRect(-15, 0, 30, 19, 9);
      ctx.stroke();

      ctx.restore();

      // ===== Pauldrons (black + red trim) =====
      ctx.save();
      ctx.globalAlpha = 0.98;
      ctx.fillStyle = metalMid;
      roundRect(-23, 2, 12, 10, 7);
      ctx.fill();
      roundRect(11, 2, 12, 10, 7);
      ctx.fill();

      ctx.globalAlpha = 0.9;
      ctx.fillStyle = red2;
      roundRect(-22, 10, 10, 2.8, 2);
      ctx.fill();
      roundRect(12, 10, 10, 2.8, 2);
      ctx.fill();

      ctx.restore();

      }

      // ===== Shield (real shield silhouette + rim + boss + emblem) =====
      if (equip.shield) {
      const shieldSide = (dir === "left") ? -1 : 1;
      ctx.save();
      ctx.translate(22 * shieldSide, 18);
      ctx.rotate(0.12 * shieldSide);

      // shadow
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "rgba(10,14,24,0.55)";
      roundRect(-14, -10, 28, 30, 12);
      ctx.fill();

      // shield path (top round, bottom point)
      function shieldPath() {
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.quadraticCurveTo(14, -12, 14, -2);
        ctx.lineTo(14, 10);
        ctx.quadraticCurveTo(14, 20, 0, 24);
        ctx.quadraticCurveTo(-14, 20, -14, 10);
        ctx.lineTo(-14, -2);
        ctx.quadraticCurveTo(-14, -12, 0, -12);
        ctx.closePath();
      }

      // body gradient (black + red glow edge)
      const sg = ctx.createLinearGradient(-14, -12, 14, 24);
      sg.addColorStop(0, metalMid);
      sg.addColorStop(0.6, metalDark);
      sg.addColorStop(1, "rgba(10,14,24,0.22)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = sg;
      shieldPath();
      ctx.fill();

      // rim
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 2.2;
      shieldPath();
      ctx.stroke();

      // red edge glow
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = red1;
      ctx.lineWidth = 4;
      shieldPath();
      ctx.stroke();

      // center boss
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = steel;
      ctx.beginPath();
      ctx.arc(0, 6, 4.2, 0, Math.PI*2);
      ctx.fill();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.arc(-1.2, 5.2, 1.8, 0, Math.PI*2);
      ctx.fill();

      // emblem (small red diamond)
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = red1;
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(4, 2);
      ctx.lineTo(0, 6);
      ctx.lineTo(-4, 2);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
      }

      // ===== Sword (steel blade + red rune) =====
      if (equip.sword) {
      const swordSide = (dir === "left") ? -1 : 1;
      ctx.save();
      ctx.translate(-22 * swordSide, 18 - swing * 1.6);
      ctx.rotate((-0.42 * swordSide) + swing * 0.11);

      // ✨ blade glow + particles (high quality)
      (function swordGlow() {
        const tt = performance.now() / 1000;
        const pulse = 0.55 + 0.45 * Math.sin(tt * 3.6);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        // soft aura around blade
        const ag = ctx.createRadialGradient(0, -14, 2, 0, -14, 26);
        ag.addColorStop(0, `rgba(255,80,140,${0.18 * pulse})`);
        ag.addColorStop(0.35, `rgba(120,200,255,${0.22 * pulse})`);
        ag.addColorStop(1, "rgba(120,200,255,0)");
        ctx.fillStyle = ag;
        ctx.beginPath();
        ctx.ellipse(0, -14, 10, 26, 0, 0, Math.PI * 2);
        ctx.fill();

        // sparkles along blade
        for (let i = 0; i < 14; i++) {
          const u = i / 13;
          const y = lerp(-26, 2, u) + Math.sin(tt * 3.2 + i * 1.7) * 1.4;
          const x = Math.sin(tt * 2.6 + i * 2.3) * 2.1;
          const r = 1.2 + (Math.sin(tt * 6.1 + i * 4.9) * 0.5 + 0.5) * 1.6;

          const g = ctx.createRadialGradient(x, y, 0, x, y, r * 6.5);
          g.addColorStop(0, `rgba(255,255,255,${0.85 * pulse})`);
          g.addColorStop(0.25, `rgba(180,240,255,${0.40 * pulse})`);
          g.addColorStop(0.65, `rgba(255,45,85,${0.18 * pulse})`);
          g.addColorStop(1, "rgba(255,45,85,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, r * 6.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      })();

      const bladeGrad = ctx.createLinearGradient(0, -28, 0, 4);
      bladeGrad.addColorStop(0, "#f4f7ff");
      bladeGrad.addColorStop(0.65, steel);
      bladeGrad.addColorStop(1, "rgba(10,14,24,0.22)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = bladeGrad;
      roundRect(-2.6, -28, 5.2, 30, 2.6);
      ctx.fill();

      // blade highlight edge
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-1.2, -26);
      ctx.lineTo(-1.2, 1);
      ctx.stroke();

      // red rune line
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = red1;
      roundRect(-0.8, -18, 1.6, 10, 1);
      ctx.fill();

      // guard + grip
      ctx.globalAlpha = 1;
      ctx.fillStyle = gold;
      roundRect(-7, 1, 14, 4, 2);
      ctx.fill();

      ctx.fillStyle = "rgba(10,14,24,0.82)";
      roundRect(-2, 5, 4, 11, 2);
      ctx.fill();

      // pommel
      ctx.fillStyle = red2;
      ctx.beginPath();
      ctx.arc(0, 18, 3.0, 0, Math.PI*2);
      ctx.fill();

      ctx.restore();
      }
    }

    /* ----------------------- Character: minifig ----------------------- */
    function drawMinifig(x, y, opts = null) {
      const moving = opts?.moving ?? player.moving;
      const bob = moving ? Math.sin((opts?.bobT ?? player.bobT)) * 0.14 : 0;
      const dir = opts?.dir ?? player.dir;
      const swing = moving ? Math.sin((opts?.animT ?? player.animT) * 10) : 0;
      const isHero = opts?.isHero ?? false;
      const equip = opts?.equip ?? playerEquip;

      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = "rgba(10,14,24,0.42)";
      ctx.beginPath();
      ctx.ellipse(x - cam.x, y - cam.y + 28, 20, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(x - cam.x, y - cam.y + bob);

      const side = (dir === "left" || dir === "right");
      if (dir === "left") ctx.scale(-1, 1);

      const skin = opts?.skin || "#ffd66b";
      const torso = opts?.torso || (isHero ? "#1f6fff" : "#0a84ff");
      const pants = opts?.pants || (isHero ? "#2a2f3b" : "#3b4251");
      const hat = opts?.hat || (isHero ? "#ffffff" : "#ff3b30");
      const outline = "rgba(0,0,0,0.18)";

      // HEAD
      ctx.save();
      const headG = ctx.createRadialGradient(-6, -24, 6, 0, -18, 20);
      headG.addColorStop(0, "rgba(255,214,107,1)");
      headG.addColorStop(1, "rgba(242,188,70,1)");
      ctx.fillStyle = headG;
      roundRect(-14, -34, 28, 24, 10);
      ctx.fill();
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2;
      roundRect(-14, -34, 28, 24, 10);
      ctx.stroke();
      ctx.restore();

      // 헬멧 느낌(히어로)
      if (isHero && equip.helmet) {
        ctx.save();

        const black1 = "#1a1d24";
        const black2 = "#2a2f3b";
        const red1 = "#ff2d55";
        const bone = "#e9e2d2";

        // helmet shell (black)
        const hg = ctx.createLinearGradient(-16, -36, 16, -14);
        hg.addColorStop(0, black2);
        hg.addColorStop(0.7, black1);
        hg.addColorStop(1, "rgba(10,14,24,0.25)");
        ctx.fillStyle = hg;
        roundRect(-16, -36, 32, 18, 10);
        ctx.fill();

        // red crest stripe
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = red1;
        roundRect(-2.2, -36, 4.4, 18, 2.2);
        ctx.fill();

        // visor
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        roundRect(-10, -28, 20, 6, 6);
        ctx.fill();

        // horns (more “horned helmet”)
        ctx.globalAlpha = 0.98;
        ctx.fillStyle = bone;

        // left horn
        ctx.save();
        ctx.translate(-15, -30);
        ctx.rotate(-0.25);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-12, -6, -14, -20);
        ctx.quadraticCurveTo(-8, -16, 2, -10);
        ctx.quadraticCurveTo(-2, -6, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // right horn
        ctx.save();
        ctx.translate(15, -30);
        ctx.rotate(0.25);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(12, -6, 14, -20);
        ctx.quadraticCurveTo(8, -16, -2, -10);
        ctx.quadraticCurveTo(2, -6, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // ✨ horn glow (high quality)
        (function hornGlow() {
          const tt = performance.now() / 1000;
          const pulse = 0.55 + 0.45 * Math.sin(tt * 3.2);
          ctx.save();
          ctx.globalCompositeOperation = "lighter";

          function tipGlow(tx, ty) {
            // core glow
            const g = ctx.createRadialGradient(tx, ty, 0, tx, ty, 22);
            g.addColorStop(0, `rgba(180,240,255,${0.70 * pulse})`);
            g.addColorStop(0.35, `rgba(120,210,255,${0.28 * pulse})`);
            g.addColorStop(1, "rgba(120,210,255,0)");
            ctx.globalAlpha = 1;
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(tx, ty, 22, 0, Math.PI * 2);
            ctx.fill();

            // sparkles (deterministic-ish)
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * Math.PI * 2 + tt * 0.8;
              const rr = 10 + (Math.sin(tt * 2.4 + i * 11.7) * 0.5 + 0.5) * 10;
              const px = tx + Math.cos(a) * rr;
              const py = ty + Math.sin(a) * rr;
              const r = 1.4 + (Math.sin(tt * 6.0 + i * 9.1) * 0.5 + 0.5) * 1.8;

              const pg = ctx.createRadialGradient(px, py, 0, px, py, r * 4.5);
              pg.addColorStop(0, `rgba(255,255,255,${0.85 * pulse})`);
              pg.addColorStop(0.25, `rgba(170,235,255,${0.35 * pulse})`);
              pg.addColorStop(1, "rgba(170,235,255,0)");
              ctx.fillStyle = pg;
              ctx.beginPath();
              ctx.arc(px, py, r * 4.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // approximate horn tips
          tipGlow(-28, -50);
          tipGlow(28, -50);

          ctx.restore();
        })();

        // highlight
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        roundRect(-12, -34, 24, 6, 8);
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
        ctx.arc(0, -22, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // TORSO + ARMS + LEGS
      const armSwing = swing * 2.2;
      const legSwing = swing * 1.8;

      if (!side) {
        // torso
        ctx.fillStyle = torso;
        roundRect(-12, -4, 24, 28, 12);
        ctx.fill();
        glossyHighlight(-12, -4, 24, 28, 0.10);

        // belt/armor details
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

        // ✅ (2) 히어로 장비(갑옷/검/방패) - 인벤 장착 상태 반영
        if (isHero) drawHeroGear(dir, swing, equip);

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

        // ONE leg (✅ 중심 정렬로 수정)
        ctx.fillStyle = pants;
        roundRect(-6, 22, 12, 16, 6);
        ctx.fill();

        // shoe (✅ 중심 정렬로 수정)
        ctx.fillStyle = "rgba(10,14,24,0.82)";
        ctx.beginPath();
        ctx.ellipse(0, 40 + legSwing, 6.6, 3.1, 0, 0, Math.PI * 2);
        ctx.fill();

        if (isHero) drawHeroGear(dir, swing, equip);
      }

      ctx.restore();
    }
/* ===================== [PART 3 / 3] ===================== */
    /* ----------------------- Title / Minimap / Depth sort ----------------------- */
    function drawWorldTitle() {
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "rgba(255,255,255,0.84)";
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      ctx.lineWidth = 2;
      roundRect(16, VIEW.h - 62, 260, 46, 18);
      ctx.fill(); ctx.stroke();

      ctx.fillStyle = "rgba(10,14,24,0.86)";
      ctx.font = "1200 14px system-ui";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText("LEGO HUB", 34, VIEW.h - 39);

      ctx.globalAlpha = 0.58;
      ctx.font = "1000 12px system-ui";
      ctx.fillText("Enter/E: Portal · I: Inventory", 34, VIEW.h - 22);
      ctx.restore();
    }

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

    /* ----------------------- Draw loop ----------------------- */
    function draw(t) {
      drawBackground(t);

      // world transform
      ctx.save();
      ctx.scale(VIEW.zoom, VIEW.zoom);
      ctx.translate(-cam.x, -cam.y);

      // sidewalks
      for (const s of sidewalks) drawSidewalk(s);

      // roads
      for (const r of roads) drawRoad(r);

      // crossings
      for (const c of crossings) drawCrossing(c);

      // buildings + props + entities sorted
      const ents = [];

      for (const p of portals) ents.push({ kind: "building", ...p });
      for (const p of props) ents.push(p);
      for (const s of signs) ents.push({ kind: "sign", ...s });
      for (const n of portalNPCs) ents.push(n);
      for (const e of portalEmblems) ents.push(e);
      for (const n of roamers) ents.push(n);
      for (const c of cars) ents.push(c);
      ents.push({ kind: "player", x: player.x, y: player.y });

      ents.sort((a, b) => getFootY(a) - getFootY(b));

      for (const e of ents) {
        if (e.kind === "building") drawBuilding(e, t);
        else if (e.kind === "tree") drawTree(e);
        else if (e.kind === "flower") drawFlower(e);
        else if (e.kind === "bench") drawBench(e);
        else if (e.kind === "lamp") drawLamp(e, t);
        else if (e.kind === "sign") drawSign(e);
        else if (e.kind === "npc") drawNPC(e.key, e.x, e.y);
        else if (e.kind === "emblem") drawEmblem(e);
        else if (e.kind === "roamer") drawMinifig(e.x, e.y, { moving: true, dir: e.dir, animT: e.t, bobT: e.t * 0.9, torso: e.c.torso, pants: e.c.pants, hat: e.c.hat });
        else if (e.kind === "car") {
          ctx.save();
          ctx.translate(e.x - cam.x, e.y - cam.y);
          ctx.globalAlpha = 0.92;
          ctx.fillStyle = e.color;
          roundRect(-e.w / 2, -e.h / 2, e.w, e.h, 12);
          ctx.fill();
          ctx.globalAlpha = 0.22;
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          roundRect(-e.w / 2 + 6, -e.h / 2 + 6, e.w - 12, 8, 8);
          ctx.fill();
          ctx.restore();
        } else if (e.kind === "player") {
          drawMinifig(player.x, player.y, { isHero: true });
        }
      }

      // signals on top
      for (const s of signals) drawSignal(s, t);

      // zone outlines + gates
      ctx.save();
      ctx.globalAlpha = 0.13;
      ctx.strokeStyle = "#0a84ff";
      ctx.lineWidth = 6;
      roundRect(ZONES.game.x - cam.x, ZONES.game.y - cam.y, ZONES.game.w, ZONES.game.h, 32);
      ctx.stroke();
      ctx.strokeStyle = "#34c759";
      roundRect(ZONES.community.x - cam.x, ZONES.community.y - cam.y, ZONES.community.w, ZONES.community.h, 32);
      ctx.stroke();
      ctx.strokeStyle = "#ff2d55";
      roundRect(ZONES.ads.x - cam.x, ZONES.ads.y - cam.y, ZONES.ads.w, ZONES.ads.h, 32);
      ctx.stroke();
      ctx.restore();

      drawZoneGate(ZONES.game, t);
      drawZoneGate(ZONES.community, t);
      drawZoneGate(ZONES.ads, t);

      ctx.restore(); // world transform end

      // overlays
      drawWorldTitle();
      drawMiniMap();

      // UI text
      UI.coord.textContent = `x:${player.x.toFixed(0)} y:${player.y.toFixed(0)}`;
    }

    /* ----------------------- Loop ----------------------- */
    let lastT = performance.now();
    let acc = 0, framesCount = 0;

    function loop(now) {
      const dt = Math.min(0.033, (now - lastT) / 1000);
      lastT = now;
      const t = now / 1000;
      const frameSeed = ((now / 16) | 0) ^ 0x5bd1e995;
      const rng = mulberry32(frameSeed);

      try {
        update(dt, t, rng);
        draw(t);

        // FPS
        acc += dt; framesCount++;
        if (acc > 0.35) {
          const fps = Math.round(framesCount / acc);
          UI.fps.textContent = `${fps} FPS`;
          acc = 0; framesCount = 0;
        }
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

      if (activePortal && !modalState.open && !invState.open) {
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
    requestAnimationFrame(loop);
  });
})();
    
