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
  const SPRITE_SRC = "캐릭터 이미지.png"; // optional external sprite
  const USE_WORLD_MAP_DESIGN = true;
  const WORLD_MAP_SRC = "메타월드.png";
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

    joy.innerHTML = `
      <div id="joy_ring" style="
        position:absolute; inset:50% auto auto 50%;
        width:${JOY_RING}px; height:${JOY_RING}px; transform:translate(-50%,-50%);
        border-radius:50%;
        background:
          radial-gradient(circle at 30% 30%, rgba(255,255,255,.25), rgba(255,255,255,.08) 40%, rgba(10,14,24,.08) 70%, rgba(10,14,24,.18) 100%);
        border:1px solid rgba(255,255,255,.22);
        box-shadow:
          inset 0 6px 18px rgba(255,255,255,.08),
          inset 0 -10px 18px rgba(0,0,0,.18),
          0 12px 30px rgba(0,0,0,.18);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      "></div>
      <div id="joy_knob" style="
        position:absolute; inset:50% auto auto 50%;
        width:${JOY_KNOB}px; height:${JOY_KNOB}px; transform:translate(-50%,-50%);
        border-radius:50%;
        background:
          radial-gradient(circle at 35% 30%, rgba(255,255,255,.95), rgba(255,255,255,.72) 24%, rgba(230,236,255,.48) 40%, rgba(146,180,255,.26) 70%, rgba(10,14,24,.22) 100%);
        border:1px solid rgba(255,255,255,.50);
        box-shadow:
          0 10px 24px rgba(0,0,0,.22),
          inset 0 5px 10px rgba(255,255,255,.45),
          inset 0 -8px 14px rgba(0,0,0,.16);
      "></div>
    `;
    const joyRing = joy.querySelector("#joy_ring");
    const joyKnob = joy.querySelector("#joy_knob");

    const joyState = { active: false, id: -1, ax: 0, ay: 0 };

    function setJoy(ax, ay) {
      joyState.ax = clamp(ax, -1, 1);
      joyState.ay = clamp(ay, -1, 1);
      const max = 42; // 기존 34 → 42 (조금 더 넓게)
      joyKnob.style.transform = `translate(calc(-50% + ${joyState.ax * max}px), calc(-50% + ${joyState.ay * max}px))`;
      const glow = 10 + Math.hypot(joyState.ax, joyState.ay) * 12;
      joyKnob.style.boxShadow = `
        0 10px ${24 + glow}px rgba(0,0,0,.22),
        inset 0 5px 10px rgba(255,255,255,.45),
        inset 0 -8px 14px rgba(0,0,0,.16)
      `;
    }

    function joyPointerDown(e) {
      if (!isTouchDevice()) return;
      joyState.active = true;
      joyState.id = e.pointerId;
      try { joy.setPointerCapture(e.pointerId); } catch {}
      joyPointerMove(e);
      e.preventDefault();
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

    /* ----------------------- Optional world map image ----------------------- */
    const worldMap = { img: null, loaded: false, w: 1, h: 1 };
    if (USE_WORLD_MAP_DESIGN && WORLD_MAP_SRC) {
      const mapIm = new Image();
      mapIm.crossOrigin = "anonymous";
      mapIm.onload = () => {
        worldMap.img = mapIm;
        worldMap.loaded = true;
        worldMap.w = mapIm.naturalWidth || 1;
        worldMap.h = mapIm.naturalHeight || 1;
      };
      mapIm.onerror = () => { worldMap.loaded = false; worldMap.img = null; };
      mapIm.src = WORLD_MAP_SRC;
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
    function circleRectHit(cx, cy, cr, r) {
      const nx = clamp(cx, r.x, r.x + r.w);
      const ny = clamp(cy, r.y, r.y + r.h);
      const dx = cx - nx, dy = cy - ny;
      return dx * dx + dy * dy <= cr * cr;
    }

    /* ----------------------- Player ----------------------- */
    const player = {
      x: WORLD.w * 0.50,
      y: WORLD.h * 0.60,
      r: 18,
      speed: 270,
      dir: "down",
      moving: false,
      bobT: 0,
      animT: 0
    };

    /* ----------------------- Inputs ----------------------- */
    const keys = new Set();
    window.addEventListener("keydown", (e) => {
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","w","a","s","d","W","A","S","D","e","E","Enter","Escape"].includes(e.key)) e.preventDefault();
      keys.add(e.key.toLowerCase());
      if ((e.key === "e" || e.key === "E" || e.key === "Enter") && activePortal && !modalState.open) {
        openPortalUI(activePortal);
      } else if (e.key === "Escape" && modalState.open) {
        closePortalUI();
      }
    }, { passive: false });
    window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()), { passive: true });

    // bfcache restore (모바일 뒤로가기 복귀)
    window.addEventListener("pageshow", (e) => {
      if (e.persisted) {
        closePortalUI();
        UI.toast.hidden = true;
        keys.clear();
        UI.joyState.ax = 0;
        UI.joyState.ay = 0;
        const joyKnob = document.getElementById("joy_knob");
        if (joyKnob) joyKnob.style.transform = "translate(-50%,-50%)";
      }
    });

    /* ----------------------- Portal Modal ----------------------- */
    const modalState = { open: false, portal: null };
    let activePortal = null;

    function blockSpan(text, opts = {}) {
      const bg = opts.bg || "rgba(255,255,255,0.78)";
      const color = opts.color || "rgba(10,14,24,0.92)";
      const pad = opts.pad || "16px 20px";
      return `
        <span style="
          display:inline-block;
          padding:${pad};
          background:${bg};
          color:${color};
          border-radius:18px;
          border:1px solid rgba(0,0,0,0.08);
          box-shadow:0 12px 28px rgba(0,0,0,0.10);
          backdrop-filter:blur(8px);
          -webkit-backdrop-filter:blur(8px);
          font-weight:1000;
          letter-spacing:.2px;
          line-height:1.35;
        ">${text}</span>`;
    }

    function openPortalUI(p) {
      modalState.open = true;
      modalState.portal = p;
      UI.modal.style.display = "flex";
      UI.fade.classList.add("on");
      UI.toast.hidden = true;

      UI.modalTitle.innerHTML = blockSpan(`🧱 ${p.label}`, { pad: "14px 18px", bg: "rgba(255,255,255,0.84)" });

      if (p.status === "open") {
        if (p.url) {
          UI.modalBody.innerHTML = blockSpan(`입장하시겠습니까?<br/><small style="font-size:13px;opacity:.72">Enter / E 로 입장 · Esc 닫기</small>`, { bg: "rgba(255,255,255,0.84)" });
        } else if (p.message) {
          UI.modalBody.innerHTML = blockSpan(`${p.message}<br/><small style="font-size:13px;opacity:.72">Esc 닫기</small>`, { bg: "rgba(255,255,255,0.84)" });
        } else {
          UI.modalBody.innerHTML = blockSpan(`오픈 준비중입니다<br/><small style="font-size:13px;opacity:.72">Esc 닫기</small>`, { bg: "rgba(255,255,255,0.84)" });
        }
      } else {
        UI.modalBody.innerHTML = blockSpan(`오픈 준비중입니다<br/><small style="font-size:13px;opacity:.72">Esc 닫기</small>`, { bg: "rgba(255,255,255,0.84)" });
      }

      UI.modalHint.innerHTML = "";
    }

    function closePortalUI() {
      modalState.open = false;
      modalState.portal = null;
      UI.modal.style.display = "none";
      UI.fade.classList.remove("on");
    }

    function confirmEnter(p) {
      if (!p || p.status !== "open") return;
      if (p.url) {
        location.href = p.url;
      } else {
        closePortalUI();
      }
    }

    window.addEventListener("keydown", (e) => {
      if (!modalState.open) return;
      if ((e.key === "Enter" || e.key === "e" || e.key === "E") && modalState.portal && modalState.portal.url) {
        confirmEnter(modalState.portal);
      }
    });

    canvas.addEventListener("click", () => {
      if (modalState.open && modalState.portal && modalState.portal.url && !isTouchDevice()) {
        confirmEnter(modalState.portal);
      }
    });

    /* ----------------------- Patterns ----------------------- */
    function makePattern(draw, w = 64, h = 64, rep = "repeat") {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d");
      draw(g, w, h);
      return ctx.createPattern(c, rep);
    }

    const brickPattern = makePattern((g, w, h) => {
      g.fillStyle = "#dfccab"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(10,14,24,0.10)"; g.lineWidth = 2;
      const bh = 18, bw = 36;
      for (let y = 0; y < h; y += bh) {
        const off = ((y / bh) % 2) ? bw / 2 : 0;
        for (let x = -bw; x < w + bw; x += bw) {
          g.strokeRect(x + off, y, bw, bh);
        }
      }
      g.fillStyle = "rgba(255,255,255,0.10)";
      for (let y = 2; y < h; y += bh) g.fillRect(0, y, w, 2);
    }, 72, 72);

    const roadPattern = makePattern((g, w, h) => {
      g.fillStyle = "#2b3140"; g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(255,255,255,0.05)";
      for (let i = 0; i < 18; i++) {
        const x = (i * 23) % w, y = (i * 37) % h;
        g.beginPath(); g.arc(x, y, 1.3, 0, Math.PI * 2); g.fill();
      }
    }, 64, 64);

    const sidewalkPattern = makePattern((g, w, h) => {
      g.fillStyle = "#f6efe6"; g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(10,14,24,0.06)"; g.lineWidth = 1;
      for (let x = 0; x <= w; x += 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      for (let y = 0; y <= h; y += 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    }, 48, 48);

    const grassPattern = makePattern((g, w, h) => {
      g.fillStyle = "#7ecb73"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 150; i++) {
        const x = (i * 19) % w, y = (i * 11 + 7) % h;
        g.fillStyle = i % 3 === 0 ? "rgba(255,255,255,0.06)" : "rgba(10,60,20,0.06)";
        g.fillRect(x, y, 2, 6);
      }
    }, 64, 64);

    const dirtPattern = makePattern((g, w, h) => {
      g.fillStyle = "#c79a64"; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 80; i++) {
        const x = (i * 31) % w, y = (i * 17 + 11) % h;
        g.fillStyle = i % 2 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
        g.beginPath(); g.arc(x, y, 1.5 + (i % 4), 0, Math.PI * 2); g.fill();
      }
    }, 64, 64);

    /* ----------------------- World layout ----------------------- */
    function roundRect(x, y, w, h, r = 12) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
    function softShadow(x, y, w, h, a = 0.18) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(10,14,24,0.9)";
      roundRect(x, y, w, h, 18);
      ctx.filter = "blur(16px)";
      ctx.fill();
      ctx.restore();
    }
    function glossyHighlight(x, y, w, h, alpha = 0.12) {
      ctx.save();
      ctx.globalAlpha = alpha;
      const g = ctx.createLinearGradient(x, y, x, y + h);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(1, "rgba(255,255,255,0.0)");
      ctx.fillStyle = g;
      roundRect(x, y, w, h, 18);
      ctx.fill();
      ctx.restore();
    }
    function groundAO(x, y, w, h, a = 0.18) {
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(10,14,24,0.7)";
      ctx.filter = "blur(12px)";
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function updateDirFromAxes(ax, ay) {
      if (Math.abs(ax) > Math.abs(ay)) {
        player.dir = ax >= 0 ? "right" : "left";
      } else {
        player.dir = ay >= 0 ? "down" : "up";
      }
    }
    function clampPlayerToWorld() {
      player.x = clamp(player.x, WORLD.margin, WORLD.w - WORLD.margin);
      player.y = clamp(player.y, WORLD.margin, WORLD.h - WORLD.margin);
    }

    function addRoad(x, y, w, h, axis) {
      roads.push({ x, y, w, h, axis, _id: roads.length + 1 });
    }
    function addSidewalkAlongRoad(r) {
      const sw = 26;
      if (r.axis === "h") {
        sidewalks.push({ x: r.x - 8, y: r.y - sw - 8, w: r.w + 16, h: sw });
        sidewalks.push({ x: r.x - 8, y: r.y + r.h + 8, w: r.w + 16, h: sw });
      } else {
        sidewalks.push({ x: r.x - sw - 8, y: r.y - 8, w: sw, h: r.h + 16 });
        sidewalks.push({ x: r.x + r.w + 8, y: r.y - 8, w: sw, h: r.h + 16 });
      }
    }
    function rectInAnyZone(r, pad = 0) {
      return rectsOverlap(r, ZONES.game, pad) || rectsOverlap(r, ZONES.community, pad) || rectsOverlap(r, ZONES.ads, pad);
    }

    function portalWidthBySize(size) {
      return size === "L" ? 240 : size === "M" ? 180 : 140;
    }
    function portalHeightBySize(size) {
      return size === "L" ? 190 : size === "M" ? 150 : 120;
    }

    function placeWorld() {
      roads.length = sidewalks.length = crossings.length = signals.length = 0;

      // 도로는 존 "바깥"을 지나도록 재배치
      addRoad(160, 760, WORLD.w - 320, 112, "h");
      addRoad(160, 1510, WORLD.w - 320, 112, "h");
      addRoad(960, 180, 112, WORLD.h - 360, "v");
      addRoad(1944, 180, 112, WORLD.h - 360, "v");

      for (const r of roads) addSidewalkAlongRoad(r);

      // 횡단보도: 도로 교차부 주변 / 존 안 침범 금지
      crossings.push({ x: 920, y: 790, w: 72, h: 76 });
      crossings.push({ x: 2038, y: 790, w: 72, h: 76 });
      crossings.push({ x: 920, y: 1518, w: 72, h: 76 });
      crossings.push({ x: 2038, y: 1518, w: 72, h: 76 });

      // 신호등: 횡단보도 옆 규칙 배치
      signals.push({ x: 900, y: 784, phase: 0.0 });
      signals.push({ x: 2130, y: 784, phase: 1.6 });
      signals.push({ x: 900, y: 1608, phase: 2.3 });
      signals.push({ x: 2130, y: 1608, phase: 3.8 });

      // Zones
      ZONES = {
        game:      { x: 190,  y: 210,  w: 640, h: 450, label: "GAME ZONE",      color: "#0a84ff", entrance: null },
        community: { x: 2170, y: 250,  w: 640, h: 430, label: "COMMUNITY ZONE", color: "#34c759", entrance: null },
        ads:       { x: 2120, y: 1690, w: 690, h: 290, label: "AD ZONE",        color: "#ff2d55", entrance: null }
      };

      // ✅ (3) 각 존 입구(도로와 맞닿는 위치)
      ZONES.game.entrance =      { x: ZONES.game.x + ZONES.game.w * 0.5 - 90,      y: ZONES.game.y + ZONES.game.h - 20, w: 180, h: 90 };
      ZONES.community.entrance = { x: ZONES.community.x - 20,                        y: ZONES.community.y + ZONES.community.h * 0.5 - 45, w: 90, h: 170 };
      ZONES.ads.entrance =       { x: ZONES.ads.x + ZONES.ads.w * 0.5 - 90,         y: ZONES.ads.y - 70, w: 180, h: 90 };

      // Portal buildings: 존 내부 격자 배치
      const gap = 32;
      const placeGrid = (zone, keys, cols = 3, topPad = 70) => {
        const sizes = keys.map(k => portalsByKey(k)?.size || "M");
        const widths = sizes.map(portalWidthBySize);
        const heights = sizes.map(portalHeightBySize);
        const colW = Math.max(...widths);
        const rowH = Math.max(...heights);
        keys.forEach((k, i) => {
          const p = portalsByKey(k);
          if (!p) return;
          const col = i % cols, row = Math.floor(i / cols);
          p.w = portalWidthBySize(p.size);
          p.h = portalHeightBySize(p.size);
          p.x = zone.x + 30 + col * (colW + gap) + (colW - p.w) / 2;
          p.y = zone.y + topPad + row * (rowH + 42);
        });
      };

      placeGrid(ZONES.game, ["avoid", "archery", "janggi", "omok", "snow", "jump"], 3, 88);
      placeGrid(ZONES.community, ["twitter", "telegram", "wallet", "market", "support"], 3, 92);
      placeGrid(ZONES.ads, ["mcd", "bbq", "baskin", "paris"], 4, 86);

      // player spawn near main cross
      player.x = 1500;
      player.y = 1180;
      clampPlayerToWorld();
    }

    /* ----------------------- Decorations / props ----------------------- */
    const props = [];
    const portalNPCs = [];
    const portalEmblems = [];
    const footprints = [];
    const clouds = [];
    const birds = [];
    const cars = [];
    const groundPatches = [];


        function addPropTree(x, y, s = 1) { props.push({ kind: "tree", x, y, s }); }
    function addPropLamp(x, y, s = 1) { props.push({ kind: "lamp", x, y, s }); }
    function addPropBench(x, y, s = 1) { props.push({ kind: "bench", x, y, s }); }
    function addPropFlower(x, y, s = 1) { props.push({ kind: "flower", x, y, s, sway: hash01(`${x},${y}`) * Math.PI * 2 }); }

    function zoneTypeForPortal(key) {
      if (["avoid","archery","janggi","omok","snow","jump"].includes(key)) return "game";
      if (["twitter","telegram","wallet","market","support"].includes(key)) return "community";
      return "ads";
    }

    function portalEnterZone(p) {
      return {
        x: p.x + p.w * 0.18,
        y: p.y + p.h - 24,
        w: p.w * 0.64,
        h: 42
      };
    }

    function buildPortalDecor() {
      props.length = 0;
      portalNPCs.length = 0;
      portalEmblems.length = 0;
      groundPatches.length = 0;

      // Ground patches
      for (let i = 0; i < 26; i++) {
        const x = 180 + (i * 107) % (WORLD.w - 360);
        const y = 160 + (i * 173) % (WORLD.h - 320);
        const w = 70 + (i % 5) * 24;
        const h = 38 + (i % 4) * 16;
        const r = { x, y, w, h };
        if (rectInAnyZone(r, 16)) continue;
        groundPatches.push({ x, y, w, h, kind: i % 2 ? "grass" : "dirt", rot: (i % 7) * 0.09 });
      }

      // Trees & benches around world (avoid roads / zones)
      const obstacles = [
        ...roads.map(r => ({ x: r.x - 18, y: r.y - 18, w: r.w + 36, h: r.h + 36 })),
        ...sidewalks.map(s => ({ x: s.x - 8, y: s.y - 8, w: s.w + 16, h: s.h + 16 })),
        ...portals.map(p => ({ x: p.x - 24, y: p.y - 24, w: p.w + 48, h: p.h + 48 }))
      ];
      const fits = (r) => {
        if (r.x < 120 || r.y < 120 || r.x + r.w > WORLD.w - 120 || r.y + r.h > WORLD.h - 120) return false;
        if (rectInAnyZone(r, 8)) return false;
        if (obstacles.some(o => rectsOverlap(r, o, 0))) return false;
        return true;
      };

      // 가로등: 랜덤 → 도로를 따라 규칙 배치
      function addLampsAlongRoad(r) {
        const spacing = 240;
        if (r.axis === "h") {
          for (let x = r.x + 80; x <= r.x + r.w - 80; x += spacing) {
            addPropLamp(x, r.y - 56, 1.0);
            addPropLamp(x, r.y + r.h + 18, 1.0);
          }
        } else {
          for (let y = r.y + 80; y <= r.y + r.h - 80; y += spacing) {
            addPropLamp(r.x - 56, y, 1.0);
            addPropLamp(r.x + r.w + 18, y, 1.0);
          }
        }
      }
      for (const r of roads) addLampsAlongRoad(r);

      // Trees
      const treeSpots = [];
      for (let y = 160; y < WORLD.h - 160; y += 120) {
        for (let x = 160; x < WORLD.w - 160; x += 120) {
          if (((x + y) / 120) % 2 === 0) treeSpots.push({ x: x + ((x * 7 + y * 3) % 21) - 10, y: y + ((x * 5 + y * 11) % 21) - 10 });
        }
      }
      let treeCount = 0;
      for (const s of treeSpots) {
        if (treeCount > 58) break;
        const r = { x: s.x - 26, y: s.y - 14, w: 52, h: 72 };
        if (!fits(r)) continue;
        addPropTree(s.x, s.y, 0.92 + ((s.x + s.y) % 17) * 0.01);
        treeCount++;
      }

      // Benches
      const benchSpots = [];
      for (let i = 0; i < sidewalks.length; i++) {
        const s = sidewalks[i];
        if (s.w > s.h) {
          for (let x = s.x + 50; x < s.x + s.w - 50; x += 260) benchSpots.push({ x, y: s.y + s.h * 0.5 + (i % 2 ? 10 : -10) });
        } else {
          for (let y = s.y + 50; y < s.y + s.h - 50; y += 260) benchSpots.push({ x: s.x + s.w * 0.5 + (i % 2 ? 10 : -10), y });
        }
      }
      let benchCount = 0;
      for (const s of benchSpots) {
        if (benchCount > 22) break;
        const r = { x: s.x - 26, y: s.y - 12, w: 52, h: 24 };
        if (!fits(r)) continue;
        addPropBench(s.x, s.y, 1.0);
        benchCount++;
      }

      // Flowers
      let fcount = 0;
      for (let y = 140; y < WORLD.h - 140; y += 52) {
        for (let x = 140; x < WORLD.w - 140; x += 52) {
          if (((x * 13 + y * 7) % 19) > 2) continue;
          const r = { x: x - 8, y: y - 8, w: 16, h: 16 };
          if (!fits(r)) continue;
          addPropFlower(x, y, 0.95 + ((x + y) % 10) * 0.01);
          if (++fcount > 140) break;
        }
        if (fcount > 140) break;
      }

      // NPCs near specific portals
      portalNPCs.push({ key: "archery", x: portalsByKey("archery").x - 30, y: portalsByKey("archery").y + portalsByKey("archery").h - 18 });
      portalNPCs.push({ key: "janggi",  x: portalsByKey("janggi").x + portalsByKey("janggi").w + 24, y: portalsByKey("janggi").y + portalsByKey("janggi").h - 18 });
      portalNPCs.push({ key: "omok",    x: portalsByKey("omok").x + portalsByKey("omok").w + 18, y: portalsByKey("omok").y + portalsByKey("omok").h - 18 });

      // Floating emblems above portals
      for (const p of portals) {
        portalEmblems.push({ portalKey: p.key, x: p.x + p.w * 0.5, y: p.y - 22, kind: p.key });
      }

      // clouds / birds
      clouds.length = 0;
      birds.length = 0;
      for (let i = 0; i < 16; i++) {
        clouds.push({
          x: (i * 230) % WORLD.w,
          y: 40 + (i * 57) % 280,
          s: 0.7 + (i % 5) * 0.18,
          v: 9 + (i % 7) * 1.7,
          layer: i % 2
        });
      }
      for (let i = 0; i < 10; i++) {
        birds.push({
          x: (i * 250) % WORLD.w,
          y: 70 + (i * 31) % 170,
          v: 22 + (i % 5) * 3,
          p: i * 0.7
        });
      }

      // cars on roads
      cars.length = 0;
      const carColors = ["#ff3b30", "#ffcc00", "#34c759", "#0a84ff", "#ffffff"];
      for (const r of roads) {
        if (r.axis === "h") {
          for (let i = 0; i < 3; i++) {
            cars.push({
              kind: "car",
              x: r.x + 80 + i * 320,
              y: r.y + (i % 2 ? 18 : 60),
              w: 70, h: 34,
              roadId: r._id, axis: "h", dir: i % 2 ? -1 : 1,
              speed: 38 + i * 6,
              color: carColors[(i + r._id) % carColors.length],
              bob: i * 0.8
            });
          }
        } else {
          for (let i = 0; i < 2; i++) {
            cars.push({
              kind: "car",
              x: r.x + (i % 2 ? 18 : 60),
              y: r.y + 140 + i * 480,
              w: 34, h: 70,
              roadId: r._id, axis: "v", dir: i % 2 ? -1 : 1,
              speed: 42 + i * 6,
              color: carColors[(i + r._id) % carColors.length],
              bob: i * 0.8
            });
          }
        }
      }
    }

    /* ----------------------- Roamers ----------------------- */
    const roamers = [];
    function initRoamers() {
      roamers.length = 0;
      const spots = [
        { x: 620, y: 1080 }, { x: 790, y: 1280 }, { x: 1360, y: 430 }, { x: 2470, y: 520 },
        { x: 2550, y: 1160 }, { x: 2350, y: 1830 }, { x: 1460, y: 1760 }, { x: 370, y: 1720 }
      ];
      for (let i = 0; i < spots.length; i++) {
        roamers.push({
          x: spots[i].x,
          y: spots[i].y,
          tx: spots[i].x,
          ty: spots[i].y,
          speed: 56 + (i % 3) * 10,
          dir: ["down","left","right","up"][i % 4],
          animT: 0,
          bobT: i * 0.6,
          moving: false,
          wait: 0.2 + (i % 5) * 0.4,
          colorIdx: i % 5
        });
      }
    }
    function chooseRoamerTarget(n, rng) {
      const pad = 120;
      for (let tries = 0; tries < 40; tries++) {
        const tx = pad + rng() * (WORLD.w - pad * 2);
        const ty = pad + rng() * (WORLD.h - pad * 2);
        const rr = { x: tx - 40, y: ty - 40, w: 80, h: 80 };
        if (rectInAnyZone(rr, 0)) continue;
        if (roads.some(r => rectsOverlap(rr, r, 0))) continue;
        n.tx = tx; n.ty = ty; return;
      }
      n.tx = n.x; n.ty = n.y;
    }
    function stepRoamers(dt, rng) {
      const palette = [
        { torso: "#ffcc00", pants: "#3b4251", hat: "#ff3b30" },
        { torso: "#34c759", pants: "#2a2f3b", hat: "#0a84ff" },
        { torso: "#ffffff", pants: "#6b7280", hat: "#ff2d55" },
        { torso: "#ff9f0a", pants: "#3b4251", hat: "#ffffff" },
        { torso: "#b889ff", pants: "#2a2f3b", hat: "#34c759" }
      ];
      for (const n of roamers) {
        n.bobT += dt * 4.2;
        if (n.wait > 0) {
          n.wait -= dt;
          n.moving = false;
          continue;
        }
        const dx = n.tx - n.x, dy = n.ty - n.y;
        const d = Math.hypot(dx, dy);
        if (d < 6) {
          n.wait = 0.7 + rng() * 1.8;
          chooseRoamerTarget(n, rng);
          n.moving = false;
          continue;
        }
        const vx = dx / d, vy = dy / d;
        n.x += vx * n.speed * dt;
        n.y += vy * n.speed * dt;
        n.animT += dt * 1.1;
        n.moving = true;
        if (Math.abs(vx) > Math.abs(vy)) n.dir = vx > 0 ? "right" : "left";
        else n.dir = vy > 0 ? "down" : "up";
      }
      return palette;
    }

    /* ----------------------- Sprite draw ----------------------- */
    function drawSpriteCharacter(x, y) {
      if (!sprite.loaded || !sprite.img) return false;

      const desiredH = 92;
      const scale = desiredH / sprite.h;
      const dw = sprite.w * scale;
      const dh = sprite.h * scale;

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(x, y);
      ctx.drawImage(sprite.img, -dw / 2, -dh + 30, dw, dh);
      ctx.restore();
      return true;
    }

    /* ----------------------- Sky / Ground ----------------------- */
    function drawSkyWorld(t) {
      const g = ctx.createLinearGradient(0, 0, 0, WORLD.h);
      g.addColorStop(0, "#dff3ff");
      g.addColorStop(0.42, "#eef9ff");
      g.addColorStop(1, "#ffffff");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);

      // soft sun glow
      const sunX = WORLD.w * 0.78, sunY = 160;
      const rg = ctx.createRadialGradient(sunX, sunY, 20, sunX, sunY, 180);
      rg.addColorStop(0, "rgba(255,220,120,0.55)");
      rg.addColorStop(1, "rgba(255,220,120,0)");
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(sunX, sunY, 180, 0, Math.PI * 2); ctx.fill();
    }

    function drawCloudsWorld() {
      for (const c of clouds) {
        const x = c.x, y = c.y, s = c.s;
        ctx.save();
        ctx.globalAlpha = c.layer === 0 ? 0.92 : 0.58;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y, 18 * s, 0, Math.PI * 2);
        ctx.arc(x + 16 * s, y - 8 * s, 22 * s, 0, Math.PI * 2);
        ctx.arc(x + 40 * s, y, 18 * s, 0, Math.PI * 2);
        ctx.arc(x + 22 * s, y + 7 * s, 20 * s, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      for (const b of birds) {
        const x = b.x, y = b.y + Math.sin(b.p) * 4;
        ctx.save();
        ctx.strokeStyle = "rgba(10,14,24,0.25)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 10, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + 18, y, 10, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawGroundWorld() {
      if (USE_WORLD_MAP_DESIGN && worldMap.loaded && worldMap.img) {
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(worldMap.img, 0, 0, WORLD.w, WORLD.h);
        ctx.restore();
        return;
      }

      ctx.fillStyle = grassPattern;
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);

      // soft patches
      for (const gp of groundPatches) {
        ctx.save();
        ctx.translate(gp.x + gp.w / 2, gp.y + gp.h / 2);
        ctx.rotate(gp.rot);
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = gp.kind === "grass" ? "rgba(255,255,255,0.32)" : "rgba(160,110,70,0.55)";
        ctx.beginPath();
        ctx.ellipse(0, 0, gp.w / 2, gp.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawRoadsAndSidewalks() {
      // sidewalks
      ctx.fillStyle = sidewalkPattern;
      for (const s of sidewalks) {
        roundRect(s.x, s.y, s.w, s.h, 16);
        ctx.fill();
      }

      // roads
      ctx.fillStyle = roadPattern;
      for (const r of roads) {
        roundRect(r.x, r.y, r.w, r.h, 24);
        ctx.fill();

        // edge highlight
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 2;
        roundRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2, 24);
        ctx.stroke();
        ctx.restore();

        // lane marks
        ctx.save();
        ctx.strokeStyle = "rgba(255,255,255,0.78)";
        ctx.lineWidth = 6;
        ctx.setLineDash([28, 22]);
        ctx.lineCap = "round";
        if (r.axis === "h") {
          // ✅ 차선이 안 잘리게 중앙선 2줄
          ctx.beginPath();
          ctx.moveTo(r.x + 20, r.y + r.h * 0.5);
          ctx.lineTo(r.x + r.w - 20, r.y + r.h * 0.5);
          ctx.stroke();

          ctx.globalAlpha = 0.26;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(r.x + 20, r.y + 24);
          ctx.lineTo(r.x + r.w - 20, r.y + 24);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(r.x + 20, r.y + r.h - 24);
          ctx.lineTo(r.x + r.w - 20, r.y + r.h - 24);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(r.x + r.w * 0.5, r.y + 20);
          ctx.lineTo(r.x + r.w * 0.5, r.y + r.h - 20);
          ctx.stroke();

          ctx.globalAlpha = 0.26;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(r.x + 24, r.y + 20);
          ctx.lineTo(r.x + 24, r.y + r.h - 20);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(r.x + r.w - 24, r.y + 20);
          ctx.lineTo(r.x + r.w - 24, r.y + r.h - 20);
          ctx.stroke();
        }
        ctx.restore();
      }

      // crossings
      for (const c of crossings) {
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        if (c.w > c.h) {
          for (let x = c.x; x < c.x + c.w; x += 12) ctx.fillRect(x, c.y, 8, c.h);
        } else {
          for (let y = c.y; y < c.y + c.h; y += 12) ctx.fillRect(c.x, y, c.w, 8);
        }
        ctx.restore();
      }
    }

    /* ----------------------- Zone visuals ----------------------- */
    function drawZonePlate(z) {
      ctx.save();
      // zone plate base
      softShadow(z.x + 8, z.y + 10, z.w, z.h, 0.14);
      ctx.fillStyle = "rgba(255,255,255,0.20)";
      roundRect(z.x, z.y, z.w, z.h, 34);
      ctx.fill();

      // dashed border
      ctx.strokeStyle = `${z.color}66`;
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 10]);
      roundRect(z.x, z.y, z.w, z.h, 34);
      ctx.stroke();
      ctx.setLineDash([]);

      // zone label
      const bw = 210, bh = 40;
      const bx = z.x + 22, by = z.y + 18;
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      roundRect(bx, by, bw, bh, 16); ctx.fill();
      glossyHighlight(bx, by, bw, bh, 0.12);
      ctx.fillStyle = "rgba(10,14,24,0.90)";
      ctx.font = "1000 20px system-ui";
      ctx.fillText(z.label, bx + 16, by + 26);

      // entrance highlight
      if (z.entrance) {
        ctx.save();
        const ex = z.entrance.x, ey = z.entrance.y, ew = z.entrance.w, eh = z.entrance.h;
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = z.color;
        roundRect(ex, ey, ew, eh, 18);
        ctx.fill();

        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = z.color;
        ctx.lineWidth = 4;
        roundRect(ex, ey, ew, eh, 18);
        ctx.stroke();

        // gate pillars
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        if (ew > eh) {
          roundRect(ex + 18, ey - 10, 18, eh + 20, 8); ctx.fill();
          roundRect(ex + ew - 36, ey - 10, 18, eh + 20, 8); ctx.fill();
          ctx.fillStyle = z.color;
          roundRect(ex + 28, ey - 24, ew - 56, 14, 8); ctx.fill();
        } else {
          roundRect(ex - 10, ey + 18, ew + 20, 18, 8); ctx.fill();
          roundRect(ex - 10, ey + eh - 36, ew + 20, 18, 8); ctx.fill();
          ctx.fillStyle = z.color;
          roundRect(ex - 24, ey + 28, 14, eh - 56, 8); ctx.fill();
        }
        ctx.restore();
      }

      ctx.restore();
    }

    function drawZonesWorld(t) {
      if (USE_WORLD_MAP_DESIGN && worldMap.loaded && worldMap.img) return;
      drawZonePlate(ZONES.game);
      drawZonePlate(ZONES.community);
      drawZonePlate(ZONES.ads);
    }

    /* ----------------------- Props draw ----------------------- */
    function drawTree(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.s, p.s);

      groundAO(-22, 42, 44, 18, 0.18);

      // trunk
      ctx.fillStyle = "#8b5a2b";
      roundRect(-8, 12, 16, 44, 8);
      ctx.fill();

      // crown
      ctx.fillStyle = "#22a152";
      ctx.beginPath(); ctx.arc(0, -4, 30, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-20, 8, 22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(20, 8, 22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 18, 24, 0, Math.PI * 2); ctx.fill();

      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(-8, -10, 10, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    }

    function drawLamp(p, t) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.s, p.s);

      // pole
      ctx.fillStyle = "#5c6572";
      roundRect(-4, -8, 8, 68, 4); ctx.fill();

      // top
      ctx.fillStyle = "#38404b";
      roundRect(-10, -16, 20, 12, 5); ctx.fill();

      // glow
      const pulse = 0.75 + Math.sin(t * 2.4 + p.x * 0.01) * 0.08;
      const g = ctx.createRadialGradient(0, -4, 4, 0, -4, 28);
      g.addColorStop(0, `rgba(255,236,160,${0.55 * pulse})`);
      g.addColorStop(1, "rgba(255,236,160,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, -4, 28, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = "#ffd76a";
      roundRect(-7, -12, 14, 8, 4); ctx.fill();

      ctx.restore();
    }

    function drawBench(p) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.s, p.s);

      groundAO(-26, 10, 52, 14, 0.12);

      ctx.fillStyle = "#8a5b34";
      roundRect(-24, -6, 48, 10, 5); ctx.fill();
      roundRect(-24, 4, 48, 8, 5); ctx.fill();
      roundRect(-18, 10, 6, 16, 3); ctx.fill();
      roundRect(12, 10, 6, 16, 3); ctx.fill();

      ctx.restore();
    }

    function drawFlower(p, t) {
      const sway = Math.sin(t * 1.8 + p.sway) * 2.0;
      ctx.save();
      ctx.translate(p.x, p.y);

      ctx.strokeStyle = "#2ea84b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.quadraticCurveTo(sway * 0.3, 2, sway, -10);
      ctx.stroke();

      ctx.fillStyle = ["#ff5c8a", "#ffd166", "#7df9ff", "#b889ff"][(Math.floor((p.x + p.y) / 13)) % 4];
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 / 5) * i + t * 0.2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * 4 + sway, Math.sin(a) * 4 - 10, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#ffe29a";
      ctx.beginPath(); ctx.arc(sway, -10, 2.4, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    }

    function drawSignal(sg, t) {
      ctx.save();
      ctx.translate(sg.x, sg.y);

      ctx.fillStyle = "#596270";
      roundRect(-4, -8, 8, 58, 4); ctx.fill();

      ctx.fillStyle = "#2c323d";
      roundRect(-12, -22, 24, 20, 6); ctx.fill();

      const phase = (t + sg.phase) % 6;
      const isGreen = phase < 3;
      ctx.fillStyle = isGreen ? "#34c759" : "rgba(255,90,90,0.28)";
      ctx.beginPath(); ctx.arc(0, -16, 4.5, 0, Math.PI * 2); ctx.fill();

      ctx.fillStyle = !isGreen ? "#ff3b30" : "rgba(80,255,120,0.28)";
      ctx.beginPath(); ctx.arc(0, -8, 4.5, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    }

    function drawCar(c) {
      ctx.save();
      ctx.translate(c.x + c.w / 2, c.y + c.h / 2 + Math.sin(c.bob) * 0.7);
      if (c.axis === "v") ctx.rotate(Math.PI / 2);

      groundAO(-c.w * 0.46, c.h * 0.24, c.w * 0.92, c.h * 0.30, 0.14);

      // body
      ctx.fillStyle = c.color;
      roundRect(-c.w / 2, -c.h / 2, c.w, c.h, 12); ctx.fill();
      glossyHighlight(-c.w / 2, -c.h / 2, c.w, c.h * 0.7, 0.12);

      // cabin
      ctx.fillStyle = "rgba(240,248,255,0.88)";
      roundRect(-c.w * 0.18, -c.h * 0.34, c.w * 0.36, c.h * 0.38, 8); ctx.fill();

      // wheels
      ctx.fillStyle = "#1f2530";
      ctx.beginPath();
      ctx.arc(-c.w * 0.26, c.h * 0.48 - c.h / 2, 5, 0, Math.PI * 2);
      ctx.arc(c.w * 0.26, c.h * 0.48 - c.h / 2, 5, 0, Math.PI * 2);
      ctx.arc(-c.w * 0.26, c.h / 2 - c.h * 0.48, 5, 0, Math.PI * 2);
      ctx.arc(c.w * 0.26, c.h / 2 - c.h * 0.48, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    function drawFootprints() {
      for (const fp of footprints) {
        const a = 1 - fp.age / fp.life;
        ctx.save();
        ctx.globalAlpha = 0.09 * a;
        ctx.fillStyle = "rgba(10,14,24,0.85)";
        ctx.beginPath();
        ctx.ellipse(fp.x, fp.y, 5, 2.4, fp.rot, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function addFootprint(dt, rng) {
      if (!player.moving) return;
      if ((player.animT * 12 | 0) % 5 !== 0) return;
      if (footprints.length > 90) footprints.shift();
      const off = (Math.sin(player.animT * 10) > 0 ? -1 : 1) * 7;
      const rot = player.dir === "left" || player.dir === "right" ? 0 : Math.PI * 0.5;
      footprints.push({
        x: player.x + (player.dir === "left" || player.dir === "right" ? 0 : off),
        y: player.y + 26 + (player.dir === "left" ? off : player.dir === "right" ? -off : 0),
        rot,
        age: 0,
        life: 0.55 + rng() * 0.15
      });
    }

    /* ----------------------- LEGO building styles ----------------------- */
    function legoStyleForType(type) {
      const common = {
        wall: "#e9dcc6",
        wall2: "#dccdb3",
        roof: "#3a4458",
        trim: "#ffffff",
        sign: "#10131a",
        signText: "#ffffff",
        accent: "#ff3b30",
        door: "#3a4b63",
        win: "#a9d8ff"
      };
      switch (type) {
        case "social":
          return { ...common, wall: "#cfe8ff", wall2: "#b9dafd", roof: "#2e77d0", accent: "#0a84ff" };
        case "wallet":
          return { ...common, wall: "#f5f2ed", wall2: "#e4ddd3", roof: "#4f7cff", accent: "#ff6a00" };
        case "market":
          return { ...common, wall: "#ffe6f1", wall2: "#ffd2e4", roof: "#ff5c8a", accent: "#34c759" };
        case "support":
          return { ...common, wall: "#fff2d8", wall2: "#ffe7bf", roof: "#ffb300", accent: "#ff3b30" };
        case "dojo":
          return { ...common, wall: "#f7efe0", wall2: "#eadfc9", roof: "#6a2a6d", accent: "#ff8c00" };
        case "tower":
          return { ...common, wall: "#fff0d8", wall2: "#f5dfbe", roof: "#6a4028", accent: "#34c759" };
        case "cafe":
          return { ...common, wall: "#f0efe9", wall2: "#dfddd5", roof: "#2f4a6d", accent: "#ff2d55" };
        case "arcade":
          return { ...common, wall: "#e9f6ff", wall2: "#cfeeff", roof: "#1f2d52", accent: "#ff2d55" };
        case "gym":
          return { ...common, wall: "#e6fff0", wall2: "#d1f5e0", roof: "#245b46", accent: "#ff3b30" };
        case "igloo":
          return { ...common, wall: "#eef8ff", wall2: "#dceefe", roof: "#7fb7ff", accent: "#0a84ff" };
        case "mcd":
          return { ...common, wall: "#ffe27a", wall2: "#ffd84d", roof: "#d62828", accent: "#ffcc00" };
        case "bbq":
          return { ...common, wall: "#ffd6d6", wall2: "#ffc1c1", roof: "#ff3b30", accent: "#ffffff" };
        case "baskin":
          return { ...common, wall: "#ffe0f0", wall2: "#ffd1e7", roof: "#ff5c8a", accent: "#7df9ff" };
        case "paris":
          return { ...common, wall: "#fff1db", wall2: "#ffe6c2", roof: "#2b5aa0", accent: "#ff2d55" };
        default:
          return common;
      }
    }

    function titleForLabel(label) {
      if (label === "McDonald's") return "McD";
      return label;
    }

    function drawStudRow(x, y, w, color) {
      const count = Math.max(4, Math.floor(w / 22));
      const gap = w / count;
      ctx.save();
      ctx.fillStyle = shade(color, 18);
      for (let i = 0; i < count; i++) {
        const cx = x + gap * i + gap * 0.5;
        ctx.beginPath();
        ctx.arc(cx, y, 5.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(cx - 1.3, y - 1.5, 2.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = shade(color, 18);
      }
      ctx.restore();
    }

    function drawWindowGrid(x, y, cols, rows, cellW, cellH, frame = "#f7fbff", glass = "#a9d8ff") {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const wx = x + c * (cellW + 8);
          const wy = y + r * (cellH + 8);
          ctx.fillStyle = frame;
          roundRect(wx, wy, cellW, cellH, 6); ctx.fill();
          const g = ctx.createLinearGradient(wx, wy, wx, wy + cellH);
          g.addColorStop(0, shade(glass, 24));
          g.addColorStop(1, shade(glass, -10));
          ctx.fillStyle = g;
          roundRect(wx + 4, wy + 4, cellW - 8, cellH - 8, 4); ctx.fill();

          ctx.strokeStyle = "rgba(255,255,255,0.55)";
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(wx + cellW * 0.5, wy + 4);
          ctx.lineTo(wx + cellW * 0.5, wy + cellH - 4);
          ctx.moveTo(wx + 4, wy + cellH * 0.5);
          ctx.lineTo(wx + cellW - 4, wy + cellH * 0.5);
          ctx.stroke();
        }
      }
    }
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
  // Black + Red premium knight kit + shield shape + dark particle glow accents
  const metalDark = "#1a1d24";
  const metalMid  = "#2a2f3b";
  const red1 = "#ff2d55";
  const red2 = "#b00024";
  const steel = "#c8cfdb";
  const gold = "#ffcc00";
  const dark = "rgba(10,14,24,0.72)";

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

  // ===== Shield (real shield silhouette + rim + boss + emblem) =====
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
  sg.addColorStop(0, metalDark);
  sg.addColorStop(0.72, metalMid);
  sg.addColorStop(1, red2);

  ctx.globalAlpha = 0.98;
  ctx.fillStyle = sg;
  shieldPath();
  ctx.fill();

  // rim
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = steel;
  ctx.lineWidth = 1.7;
  shieldPath();
  ctx.stroke();

  // red emblem cross
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = red1;
  roundRect(-2.0, -5, 4, 18, 2);
  ctx.fill();
  roundRect(-8, 1.2, 16, 3.6, 2);
  ctx.fill();

  // center boss
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = steel;
  ctx.beginPath();
  ctx.arc(0, 3, 3.6, 0, Math.PI * 2);
  ctx.fill();

  // highlight
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(-7, -8);
  ctx.quadraticCurveTo(4, -10, 8, -2);
  ctx.quadraticCurveTo(0, -3, -7, -8);
  ctx.fill();

  ctx.restore();

  // ===== Sword (more sword-like + black/red hilt + particles) =====
  const swordSide = (dir === "left") ? 1 : -1;
  ctx.save();
  ctx.translate(22 * swordSide, 16 + swing * 0.5);
  ctx.rotate((-0.92 + swing * 0.02) * swordSide);

  // blade glow
  ctx.globalAlpha = 0.10;
  ctx.strokeStyle = "rgba(255,255,255,0.95)";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -34);
  ctx.stroke();

  // blade
  const bg = ctx.createLinearGradient(0, 0, 0, -34);
  bg.addColorStop(0, "#dfe7f2");
  bg.addColorStop(1, "#ffffff");
  ctx.globalAlpha = 0.98;
  ctx.strokeStyle = bg;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -30);
  ctx.stroke();

  // tip
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(0, -36);
  ctx.lineTo(3, -28);
  ctx.lineTo(-3, -28);
  ctx.closePath();
  ctx.fill();

  // fuller
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "rgba(120,140,170,0.9)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(0, -28);
  ctx.stroke();

  // crossguard
  ctx.globalAlpha = 0.98;
  ctx.fillStyle = metalMid;
  roundRect(-7, -1.5, 14, 3, 2);
  ctx.fill();

  // grip
  ctx.fillStyle = red1;
  roundRect(-1.8, 1, 3.6, 7.5, 1.6);
  ctx.fill();

  // pommel
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(0, 9.2, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // black/red particles near sword
  for (let i = 0; i < 6; i++) {
    const py = -6 - i * 4.8 + Math.sin((player.animT * 7) + i) * 1.1;
    const px = (i % 2 ? -1 : 1) * (1.8 + i * 0.6);
    ctx.globalAlpha = 0.22 - i * 0.025;
    ctx.fillStyle = i % 2 ? red1 : "rgba(10,14,24,0.95)";
    ctx.beginPath();
    ctx.arc(px, py, 1.2 + (i % 2) * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // ===== Black aura particles around armor =====
  ctx.save();
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2 + player.animT * 0.7;
    const rx = Math.cos(a) * 13;
    const ry = Math.sin(a) * 10;
    ctx.globalAlpha = 0.12 + (i % 3) * 0.03;
    ctx.fillStyle = i % 2 ? "rgba(10,14,24,0.85)" : "rgba(255,45,85,0.65)";
    ctx.beginPath();
    ctx.arc(rx, ry + 8, 1.5 + (i % 2) * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

    function drawMinifig(x, y, opt = {}) {
      const dir = opt.dir || player.dir || "down";
      const moving = opt.moving ?? player.moving;
      const animT = opt.animT ?? player.animT;
      const bobT = opt.bobT ?? player.bobT;
      const isHero = !!opt.isHero; // ✅ 플레이어에게 장비 적용 시 사용

      const torso = opt.torso || (isHero ? "#1f2430" : "#ff3b30");
      const pants = opt.pants || (isHero ? "#2a2f3b" : "#3f526f");
      const hat = opt.hat || (isHero ? "#1f2430" : "#ffcc00");
      const skin = "#f2d2b3";

      const bob = moving ? Math.sin(bobT) * 1.5 : 0;
      const swing = moving ? Math.sin(animT * 10) : 0;
      const side = dir === "left" || dir === "right";

      ctx.save();
      ctx.translate(x, y + bob);
      if (dir === "left") ctx.scale(-1, 1);

      // shadow
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "rgba(10,14,24,0.82)";
      ctx.beginPath();
      ctx.ellipse(0, 42, 18, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // head
      ctx.save();
      ctx.translate(0, -14);

      // neck
      ctx.fillStyle = skin;
      roundRect(-6, -2, 12, 8, 5);
      ctx.fill();

      // face
      ctx.fillStyle = skin;
      roundRect(-14, -34, 28, 28, 12);
      ctx.fill();

      // hair back / sideburn
      ctx.fillStyle = "#6a4b34";
      if (dir === "down") {
        roundRect(-15, -38, 30, 11, 8);
        ctx.fill();
      } else if (dir === "up") {
        roundRect(-15, -38, 30, 10, 8);
        ctx.fill();
      } else {
        roundRect(-12, -38, 24, 10, 8);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(11, -22, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // ✅ (2) 머리장식: 플레이어(히어로)면 투구, 아니면 기존 모자
      // 헬멧 느낌(히어로)
      if (isHero) {
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
      if (!(USE_WORLD_MAP_DESIGN && worldMap.loaded && worldMap.img)) {
        drawRoadsAndSidewalks();
        drawZonesWorld(t);
        drawFootprints();
      }

      const items = [];
      if (USE_WORLD_MAP_DESIGN && worldMap.loaded && worldMap.img) {
        items.push({ kind: "player", ref: player, footY: getFootY({ kind: "player", y: player.y }) });
      } else {
        for (const p of portals) items.push({ kind: "building", ref: p, footY: getFootY({ kind: "building", y: p.y, h: p.h }) });
        for (const c of cars) items.push({ kind: "car", ref: c, footY: getFootY(c) });
        for (const pr of props) items.push({ kind: pr.kind, ref: pr, footY: getFootY(pr) });
        for (const e of portalEmblems) items.push({ kind: "emblem", ref: e, footY: getFootY(e) });
        for (const n of portalNPCs) items.push({ kind: "npc", ref: n, footY: getFootY(n) });
        for (const sg of signals) items.push({ kind: "signal", ref: sg, footY: getFootY({ kind: "signal", y: sg.y }) });
        for (const r of roamers) items.push({ kind: "roamer", ref: r, footY: getFootY({ kind: "roamer", y: r.y }) });
        items.push({ kind: "player", ref: player, footY: getFootY({ kind: "player", y: player.y }) });
      }

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
