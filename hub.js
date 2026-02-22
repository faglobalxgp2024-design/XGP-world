/* HUB.JS - MINI WORLD (single-file) v3.0
   ✅ 요청 반영:
   1) 게임 6개(양궁/오목/장기/눈굴리기/피하기/점프하기) 한 장소(게임존)에 모아 배치
      - 입구 표지판: "게임존"
      - 게임존 내부: 나무/벤치 등 걸리적거리는 오브젝트 금지
      - 바닥: 고퀄리티 아스팔트 느낌(패턴)
      - 꽃 + 가로등만 일부 배치
      - 건물 간판 색상: 건물마다 다르게
   2) 커뮤니티존 생성(사진 느낌: 3개 위, 2개 아래)
      - 입구 표지판: "커뮤니티존"
      - 상점 5개: 트위터/텔레그램/월렛/마켓/고객센터
      - 건물에 로고(아이콘) 같이 표시(캔버스 벡터 아이콘)
   3) URL 없는 상점은 "오픈 준비중" 표시 유지
   4) 기존: 미니맵 / 포탈 모달 / 모바일 D-PAD / bfcache(뒤로가기) 패치 유지
   ---------------------------------------------------
   사용법: 이 파일 전체를 hub.js에 그대로 붙여넣기
*/
(() => {
  "use strict";

  /* ----------------------- CONFIG ----------------------- */
  const SPRITE_SRC = ""; // 선택: "https://...png" 또는 data:image/png;base64,...
  const USE_SPRITE_IF_LOADED = true;

  /* ----------------------- Utilities ----------------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

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

  /* ----------------------- Safe DOM ----------------------- */
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
    canvas.style.userSelect = "none";
    canvas.style.webkitUserSelect = "none";
    canvas.style.imageRendering = "auto";

    // Toast
    const toast = ensureEl("toast", "div");
    toast.style.position = "fixed";
    toast.style.left = "50%";
    toast.style.top = "96px";
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

    const fade = ensureEl("fade", "div");
    fade.style.position = "fixed";
    fade.style.inset = "0";
    fade.style.zIndex = "9998";
    fade.style.pointerEvents = "none";
    fade.style.opacity = "0";
    fade.style.transition = "opacity 240ms ease";
    fade.style.background = "#ffffff";

    // modal overlay
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
      #dpad button:active { transform: translateY(1px) scale(0.985); }
      #dpad, #dpad * { user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; }
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
    dpad.style.webkitUserSelect = "none";
    dpad.style.touchAction = "none";

    function mkBtn(id, label) {
      const b = ensureEl(id, "button", dpad);
      b.type = "button";
      b.textContent = label;
      b.style.width = "56px";
      b.style.height = "56px";
      b.style.borderRadius = "18px";
      b.style.border = "1px solid rgba(0,0,0,0.12)";
      b.style.background = "rgba(255,255,255,0.90)";
      b.style.boxShadow = "0 18px 44px rgba(0,0,0,0.16)";
      b.style.font = "1100 18px system-ui";
      b.style.color = "rgba(10,18,30,0.9)";
      b.style.touchAction = "none";
      b.style.backdropFilter = "blur(8px)";
      b.style.userSelect = "none";
      b.style.webkitUserSelect = "none";
      b.style.webkitTouchCallout = "none";
      b.addEventListener("contextmenu", (e) => e.preventDefault());
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
        e.stopPropagation();
        vkeys[key] = true;
        try { btn.setPointerCapture(e.pointerId); } catch {}
      };
      const off = (e) => {
        e.preventDefault();
        e.stopPropagation();
        vkeys[key] = false;
        try { btn.releasePointerCapture(e.pointerId); } catch {}
      };
      btn.addEventListener("pointerdown", on, { passive: false });
      btn.addEventListener("pointerup", off, { passive: false });
      btn.addEventListener("pointercancel", off, { passive: false });
      btn.addEventListener("pointerleave", off, { passive: false });
      btn.addEventListener("touchstart", (e) => e.preventDefault(), { passive: false });
    }

    bindHold(bUp, "up");
    bindHold(bDown, "down");
    bindHold(bLeft, "left");
    bindHold(bRight, "right");

    return { canvas, toast, coord, fps, fade, modal, modalTitle, modalBody, modalHint, vkeys };
  }

  /* ----------------------- Main ----------------------- */
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
    const sprite = { img: null, loaded: false };
    if (SPRITE_SRC && USE_SPRITE_IF_LOADED) {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => { sprite.img = im; sprite.loaded = true; };
      im.onerror = () => { sprite.loaded = false; sprite.img = null; };
      im.src = SPRITE_SRC;
    }

    /* ----------------------- Portals ----------------------- */
    // ✅ 게임 6개는 “게임존”으로 모으기 (URL 없는건 오픈 준비중)
    // ✅ 커뮤니티존 5개 추가 (로고 표시)
    const portals = [
      // Game Zone (6)
      { key: "archery", label: "ARCHERY", status: "open", url: "https://ttjdwls777-eng.github.io/XGP-MINI-GAME2/", group: "game", signColor: "#0a84ff" },
      { key: "omok", label: "OMOK", status: "soon", url: "", group: "game", signColor: "#8b5cf6" },
      { key: "janggi", label: "JANGGI", status: "open", url: "https://faglobalxgp2024-design.github.io/MINIGAME/", group: "game", signColor: "#ff3b30" },
      { key: "snow", label: "SNOW", status: "soon", url: "", group: "game", signColor: "#00bcd4" },
      { key: "avoid", label: "DODGE", status: "open", url: "https://faglobalxgp2024-design.github.io/index.html/", group: "game", signColor: "#ff2d55" },
      { key: "jump", label: "JUMP", status: "soon", url: "", group: "game", signColor: "#ffcc00" },

      // Community Zone (5)
      { key: "twitter", label: "TWITTER", status: "soon", url: "", group: "community", signColor: "#1da1f2", logo: "twitter" },
      { key: "telegram", label: "TELEGRAM", status: "soon", url: "", group: "community", signColor: "#2aabee", logo: "telegram" },
      { key: "wallet", label: "WALLET", status: "soon", url: "", group: "community", signColor: "#34c759", logo: "wallet" },
      { key: "market", label: "MARKET", status: "soon", url: "", group: "community", signColor: "#ff9500", logo: "market" },
      { key: "support", label: "SUPPORT", status: "soon", url: "", group: "community", signColor: "#af52de", logo: "support" },
    ];

    const portalsByKey = (k) => portals.find((p) => p.key === k);

    /* ----------------------- Player ----------------------- */
    const player = { x: 420, y: 420, r: 18, speed: 250, moving: false, animT: 0, bobT: 0, dir: "down" };
    if (isTouchDevice()) player.speed = 175;

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

    /* ----------------------- Shapes ----------------------- */
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

    /* ----------------------- Patterns ----------------------- */
    let grassPattern = null;
    let asphaltPattern = null;

    function makePattern(w, h, drawFn) {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      drawFn(g, w, h);
      return ctx.createPattern(c, "repeat");
    }

    function buildPatterns() {
      grassPattern = makePattern(420, 420, (g, w, h) => {
        g.fillStyle = "#39d975";
        g.fillRect(0, 0, w, h);

        g.globalAlpha = 0.06;
        g.strokeStyle = "rgba(0,0,0,0.10)";
        g.lineWidth = 1;
        for (let x = 0; x <= w; x += 70) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
        for (let y = 0; y <= h; y += 70) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }

        g.globalAlpha = 0.10;
        for (let i = 0; i < 160; i++) {
          g.fillStyle = i % 3 === 0 ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.10)";
          g.beginPath();
          g.arc(Math.random() * w, Math.random() * h, 0.8 + Math.random() * 1.6, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
      });

      // 고퀄리티 아스팔트 느낌: 노이즈 + 미세 크랙 + 입자
      asphaltPattern = makePattern(520, 520, (g, w, h) => {
        g.fillStyle = "#242a35";
        g.fillRect(0, 0, w, h);

        // subtle gradient
        const grad = g.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, "rgba(255,255,255,0.06)");
        grad.addColorStop(1, "rgba(0,0,0,0.12)");
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);

        // speckles
        g.globalAlpha = 0.18;
        for (let i = 0; i < 1800; i++) {
          const x = Math.random() * w, y = Math.random() * h;
          const r = Math.random() < 0.85 ? 0.7 : 1.3;
          g.fillStyle = Math.random() < 0.55 ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.18)";
          g.beginPath();
          g.arc(x, y, r, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;

        // cracks
        g.globalAlpha = 0.15;
        g.strokeStyle = "rgba(0,0,0,0.65)";
        g.lineWidth = 1;
        for (let c = 0; c < 14; c++) {
          let x = Math.random() * w, y = Math.random() * h;
          g.beginPath();
          g.moveTo(x, y);
          for (let k = 0; k < 10; k++) {
            x += (Math.random() - 0.5) * 60;
            y += (Math.random() - 0.5) * 60;
            g.lineTo(clamp(x, 0, w), clamp(y, 0, h));
          }
          g.stroke();
        }
        g.globalAlpha = 1;

        // faint seams
        g.globalAlpha = 0.06;
        g.strokeStyle = "rgba(255,255,255,0.55)";
        g.lineWidth = 2;
        for (let y = 0; y <= h; y += 130) {
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(w, y);
          g.stroke();
        }
        for (let x = 0; x <= w; x += 160) {
          g.beginPath();
          g.moveTo(x, 0);
          g.lineTo(x, h);
          g.stroke();
        }
        g.globalAlpha = 1;
      });
    }

    /* ----------------------- Zones Layout ----------------------- */
    // 사진 느낌: 게임존(3+3), 커뮤니티존(3+2)
    const zones = {
      game: { x: 0, y: 0, w: 0, h: 0, title: "게임존" },
      community: { x: 0, y: 0, w: 0, h: 0, title: "커뮤니티존" },
    };

    function inRect(x, y, r) {
      return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    }

    /* ----------------------- Props ----------------------- */
    const props = []; // {kind:'flower'|'lamp', x,y,s}
    function seedProps() {
      props.length = 0;

      const rand = mulberry32((WORLD.w ^ (WORLD.h * 1337)) >>> 0);

      // ✅ 게임존 내부: 나무/벤치 금지, 꽃/가로등만 일부
      // ✅ 커뮤니티존도 깔끔하게: 꽃/가로등만
      function addLamp(x, y, s = 1) { props.push({ kind: "lamp", x, y, s }); }
      function addFlower(x, y, s = 1) { props.push({ kind: "flower", x, y, s }); }

      // Game zone decor (외곽 위주)
      const gz = zones.game;
      for (let i = 0; i < 6; i++) {
        addFlower(gz.x + 80 + rand() * (gz.w - 160), gz.y + 60 + rand() * 80, 0.95 + rand() * 0.2);
      }
      addLamp(gz.x + 80, gz.y + gz.h - 90, 1.05);
      addLamp(gz.x + gz.w - 80, gz.y + gz.h - 90, 1.05);
      addLamp(gz.x + gz.w * 0.5, gz.y + 64, 1.0);

      // Community zone decor
      const cz = zones.community;
      for (let i = 0; i < 5; i++) {
        addFlower(cz.x + 70 + rand() * (cz.w - 140), cz.y + cz.h - 70 - rand() * 90, 0.95 + rand() * 0.25);
      }
      addLamp(cz.x + 80, cz.y + 70, 1.05);
      addLamp(cz.x + cz.w - 80, cz.y + 70, 1.05);

      // world outside zones: 아주 소량 꽃/가로등만 (깔끔하게)
      for (let i = 0; i < 22; i++) {
        const x = WORLD.margin + rand() * (WORLD.w - WORLD.margin * 2);
        const y = WORLD.margin + rand() * (WORLD.h - WORLD.margin * 2);

        // zones 내부는 금지(게임존/커뮤니티존)
        if (inRect(x, y, gz) || inRect(x, y, cz)) continue;

        if (rand() < 0.55) addFlower(x, y, 0.85 + rand() * 0.4);
        else addLamp(x, y, 0.85 + rand() * 0.35);
      }
    }

    /* ----------------------- World layout ----------------------- */
    function layoutWorld() {
      WORLD.w = Math.max(4200, Math.floor(W * 4.4));
      WORLD.h = Math.max(3000, Math.floor(H * 3.8));

      // zones sizing
      zones.game.w = Math.max(1500, WORLD.w * 0.44);
      zones.game.h = Math.max(820, WORLD.h * 0.34);

      zones.community.w = Math.max(1500, WORLD.w * 0.44);
      zones.community.h = Math.max(820, WORLD.h * 0.34);

      // placement (좌측=게임존, 우측=커뮤니티존 느낌)
      zones.game.x = WORLD.w * 0.12;
      zones.game.y = WORLD.h * 0.20;

      zones.community.x = WORLD.w * 0.54;
      zones.community.y = WORLD.h * 0.54;

      // portal sizes
      const base = 240;
      for (const p of portals) {
        p.w = base * 1.1;
        p.h = base * 0.92;
      }

      // place portals into grids
      placePortalsInZones();

      // player spawn between zones
      player.x = clamp(WORLD.w * 0.46, WORLD.margin + 80, WORLD.w - WORLD.margin - 80);
      player.y = clamp(WORLD.h * 0.46, WORLD.margin + 80, WORLD.h - WORLD.margin - 80);

      seedProps();
    }

    function placePortalsInZones() {
      // helper
      function placeGrid(groupKey, keysTopRow, keysBottomRow) {
        const z = zones[groupKey];
        const pad = 120;
        const topY = z.y + 140;
        const bottomY = z.y + z.h * 0.52;

        function row(keys, y) {
          const n = keys.length;
          const usableW = z.w - pad * 2;
          const gap = usableW / n;
          for (let i = 0; i < n; i++) {
            const p = portalsByKey(keys[i]);
            if (!p) continue;
            const cx = z.x + pad + gap * (i + 0.5);
            p.x = clamp(cx - p.w / 2, WORLD.margin, WORLD.w - WORLD.margin - p.w);
            p.y = clamp(y, WORLD.margin, WORLD.h - WORLD.margin - p.h);
          }
        }

        row(keysTopRow, topY);
        row(keysBottomRow, bottomY);
      }

      // ✅ 게임존: 3 + 3
      placeGrid("game", ["archery", "omok", "janggi"], ["snow", "avoid", "jump"]);

      // ✅ 커뮤니티존: 3 + 2 (가운데 정렬 느낌)
      const cz = zones.community;
      const pad = 120;
      const topY = cz.y + 140;
      const bottomY = cz.y + cz.h * 0.52;

      const top = ["twitter", "telegram", "wallet"];
      const bottom = ["market", "support"];

      // top row 3
      {
        const usableW = cz.w - pad * 2;
        const gap = usableW / top.length;
        top.forEach((k, i) => {
          const p = portalsByKey(k);
          if (!p) return;
          const cx = cz.x + pad + gap * (i + 0.5);
          p.x = clamp(cx - p.w / 2, WORLD.margin, WORLD.w - WORLD.margin - p.w);
          p.y = clamp(topY, WORLD.margin, WORLD.h - WORLD.margin - p.h);
        });
      }
      // bottom row 2 (가운데 정렬)
      {
        const usableW = cz.w - pad * 2;
        const gap = usableW / bottom.length;
        bottom.forEach((k, i) => {
          const p = portalsByKey(k);
          if (!p) return;
          const cx = cz.x + pad + gap * (i + 0.5);
          p.x = clamp(cx - p.w / 2, WORLD.margin, WORLD.w - WORLD.margin - p.w);
          p.y = clamp(bottomY, WORLD.margin, WORLD.h - WORLD.margin - p.h);
        });
      }
    }

    /* ----------------------- Resize ----------------------- */
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
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      buildPatterns();
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
      const zx = p.x + p.w * 0.5 - 30;
      const zy = p.y + p.h * 0.76;
      return { x: zx, y: zy, w: 60, h: 46 };
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
      return `
        <span style="
          display:inline-block;
          padding:12px 16px;
          border-radius:${br};
          background:${bg};
          color:${fg};
          box-shadow: 0 18px 54px rgba(0,0,0,0.22);
          letter-spacing: 0.4px;
          border: 1px solid rgba(255,255,255,0.10);
          filter:none; backdrop-filter:none; -webkit-backdrop-filter:none;
          text-shadow:none;
        ">${html}</span>
      `;
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

    UI.modal.addEventListener("pointerdown", (e) => {
      if (e.target === UI.modal) closeModal();
    });

    function openPortalUI(p) {
      if (!p) return;
      if (p.status !== "open" || !p.url) {
        openModal(`🧱 ${p.label}`, "오픈 준비중입니다", isTouchDevice() ? "모바일: 바깥을 탭하면 닫힘" : "ESC로 닫기");
        modalState.portal = null;
        return;
      }
      modalState.portal = p;
      openModal(
        `🧱 ${p.label}`,
        `입장하시겠습니까?<br/><span style="opacity:.95;font-size:22px;font-weight:1200;">Enter / E</span>`,
        isTouchDevice() ? "모바일: 화면 탭하면 입장" : "PC: Enter 또는 E"
      );
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

    // 뒤로가기(bfcache) 복귀 시 entering/fade 남는 현상 방지
    function resetEnterState() {
      entering = false;
      UI.fade.classList.remove("on");
      if (modalState.open) closeModal();
    }
    window.addEventListener("pageshow", () => resetEnterState());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") resetEnterState();
    });

    /* ----------------------- Drawing: background ----------------------- */
    const clouds = Array.from({ length: 10 }, () => ({
      x: Math.random() * 3600, y: 40 + Math.random() * 260,
      s: 0.7 + Math.random() * 1.25, v: 9 + Math.random() * 18,
      layer: Math.random() < 0.5 ? 0 : 1
    }));

    function drawSkyWorld() {
      const g = ctx.createLinearGradient(0, 0, 0, WORLD.h);
      g.addColorStop(0, "#bfe7ff");
      g.addColorStop(0.55, "#d7f1ff");
      g.addColorStop(1, "#fff2fb");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);
    }

    function drawCloudsWorld(dt) {
      for (const c of clouds) {
        c.x += c.v * (c.layer === 0 ? 1.0 : 0.75) * dt;
        if (c.x > WORLD.w + 420) {
          c.x = -420;
          c.y = 40 + Math.random() * 280;
          c.s = 0.7 + Math.random() * 1.2;
          c.v = 9 + Math.random() * 18;
          c.layer = Math.random() < 0.5 ? 0 : 1;
        }

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
      // grass base
      ctx.save();
      ctx.fillStyle = grassPattern || "#35d572";
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);
      ctx.restore();

      // zones asphalt
      drawZoneAsphalt(zones.game);
      drawZoneAsphalt(zones.community);
    }

    function drawZoneAsphalt(z) {
      // soft AO under zone
      groundAO(z.x + 6, z.y + z.h - 18, z.w - 12, 26, 0.18);

      // outer frame
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      roundRect(z.x - 10, z.y - 10, z.w + 20, z.h + 20, 44);
      ctx.fill();
      ctx.restore();

      // asphalt fill
      ctx.save();
      ctx.fillStyle = asphaltPattern || "#242a35";
      roundRect(z.x, z.y, z.w, z.h, 40);
      ctx.fill();

      // subtle top gloss
      ctx.globalAlpha = 0.10;
      ctx.fillStyle = "rgba(255,255,255,0.32)";
      roundRect(z.x + 16, z.y + 14, z.w - 32, 56, 26);
      ctx.fill();
      ctx.globalAlpha = 1;

      // border line
      ctx.strokeStyle = "rgba(255,255,255,0.08)";
      ctx.lineWidth = 3;
      roundRect(z.x + 2, z.y + 2, z.w - 4, z.h - 4, 38);
      ctx.stroke();

      ctx.restore();

      // zone entrance sign (아래쪽 중앙에 배치)
      drawZoneEntranceSign(z);
    }

    function drawZoneEntranceSign(z) {
      const text = z.title;
      const boxW = 360;
      const boxH = 66;
      const x = z.x + z.w * 0.5 - boxW * 0.5;
      const y = z.y + z.h + 26;

      // sign shadow
      softShadow(x + 2, y + 6, boxW, boxH, 0.16);

      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      ctx.lineWidth = 2;
      roundRect(x, y, boxW, boxH, 22);
      ctx.fill();
      ctx.stroke();
      glossyHighlight(x, y, boxW, boxH, 0.12);

      ctx.fillStyle = "rgba(10,14,24,0.92)";
      ctx.font = "1200 26px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`표지판임 >> ${text}`, x + boxW / 2, y + boxH / 2 + 1);
      ctx.restore();
    }

    /* ----------------------- LEGO Building (facade) ----------------------- */
    function legoStyle() {
      return {
        wall: "#f2d9b3",
        wall2: "#eacb9a",
        frame: "#1f242d",
        glassA: "#bfeeff",
        glassB: "#86dcff",
        knob: "#1f242d",
      };
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
      ctx.fill();
      ctx.stroke();

      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      roundRect(x + 8, y + 6, w - 16, Math.max(10, h * 0.35), 14);
      ctx.fill();
      ctx.globalAlpha = 1;

      // text
      ctx.fillStyle = "rgba(255,255,255,0.98)";
      ctx.font = `1200 ${textSize}px system-ui`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x + w * 0.5, y + h * 0.55);

      // letter shadow
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "rgba(0,0,0,0.85)";
      ctx.fillText(text, x + w * 0.5 + 1.2, y + h * 0.55 + 1.2);
      ctx.globalAlpha = 1;

      ctx.restore();
    }

    function drawLegoWindow(x, y, w, h, S) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      roundRect(x - 2, y - 2, w + 4, h + 4, 14);
      ctx.fill();

      ctx.fillStyle = S.frame;
      roundRect(x, y, w, h, 14);
      ctx.fill();

      const g = ctx.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, S.glassA);
      g.addColorStop(1, "rgba(10,14,24,0.14)");
      ctx.fillStyle = g;
      roundRect(x + 4, y + 4, w - 8, h - 8, 10);
      ctx.fill();

      // mullion
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

    function drawLegoDoor(x, y, w, h, doorCol, S) {
      ctx.save();
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      roundRect(x - 2, y - 2, w + 4, h + 4, 14);
      ctx.fill();

      ctx.fillStyle = S.frame;
      roundRect(x, y, w, h, 14);
      ctx.fill();

      ctx.fillStyle = doorCol;
      roundRect(x + 4, y + 4, w - 8, h - 8, 12);
      ctx.fill();

      glossyHighlight(x + 2, y + 2, w - 4, h - 4, 0.12);

      // knob
      ctx.fillStyle = S.knob;
      roundRect(x + w * 0.72, y + h * 0.46, 7, 12, 5);
      ctx.fill();
      ctx.restore();
    }

    /* ----------------------- Community Logos (vector icons) ----------------------- */
    function drawLogo(kind, cx, cy, size, color = "rgba(255,255,255,0.95)") {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, size * 0.08);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const s = size;

      if (kind === "twitter") {
        // simple bird-like mark
        ctx.beginPath();
        ctx.moveTo(-0.35*s, 0.05*s);
        ctx.quadraticCurveTo(-0.10*s, -0.45*s, 0.20*s, -0.20*s);
        ctx.quadraticCurveTo(0.55*s, -0.15*s, 0.45*s, 0.10*s);
        ctx.quadraticCurveTo(0.35*s, 0.35*s, 0.05*s, 0.30*s);
        ctx.quadraticCurveTo(-0.15*s, 0.45*s, -0.35*s, 0.20*s);
        ctx.closePath();
        ctx.fill();
      } else if (kind === "telegram") {
        // paper plane
        ctx.beginPath();
        ctx.moveTo(-0.55*s, -0.10*s);
        ctx.lineTo(0.60*s, -0.55*s);
        ctx.lineTo(0.10*s, 0.55*s);
        ctx.lineTo(-0.05*s, 0.10*s);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(-0.05*s, 0.10*s);
        ctx.lineTo(0.18*s, -0.04*s);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (kind === "wallet") {
        // wallet
        ctx.beginPath();
        roundRect(-0.55*s, -0.25*s, 1.10*s, 0.70*s, 0.18*s);
        ctx.fill();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        roundRect(-0.55*s, -0.25*s, 1.10*s, 0.22*s, 0.18*s);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0.30*s, 0.05*s, 0.07*s, 0, Math.PI*2);
        ctx.fill();
      } else if (kind === "market") {
        // cart
        ctx.beginPath();
        ctx.moveTo(-0.55*s, -0.25*s);
        ctx.lineTo(-0.35*s, -0.25*s);
        ctx.lineTo(-0.20*s, 0.25*s);
        ctx.lineTo(0.45*s, 0.25*s);
        ctx.lineTo(0.55*s, -0.10*s);
        ctx.lineTo(-0.10*s, -0.10*s);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-0.05*s, 0.42*s, 0.09*s, 0, Math.PI*2);
        ctx.arc(0.35*s, 0.42*s, 0.09*s, 0, Math.PI*2);
        ctx.fill();
      } else if (kind === "support") {
        // headset
        ctx.beginPath();
        ctx.arc(0, 0.02*s, 0.45*s, Math.PI, 0);
        ctx.stroke();
        ctx.beginPath();
        roundRect(-0.60*s, 0.05*s, 0.20*s, 0.30*s, 0.10*s);
        roundRect(0.40*s, 0.05*s, 0.20*s, 0.30*s, 0.10*s);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0.25*s, 0.38*s);
        ctx.quadraticCurveTo(0.45*s, 0.42*s, 0.48*s, 0.55*s);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0.48*s, 0.56*s, 0.05*s, 0, Math.PI*2);
        ctx.fill();
      }

      ctx.restore();
    }

    function drawPortalBuilding(p, t) {
      const S = legoStyle();
      const isActive = activePortal === p;
      const pulse = 0.55 + 0.45 * Math.sin(t * 3.0 + hash01(p.key) * 6);

      groundAO(p.x + 8, p.y + p.h - 18, p.w - 16, 30, 0.22);

      // active halo near door
      ctx.save();
      ctx.globalAlpha = 0.08 + (isActive ? 0.12 * pulse : 0.0);
      ctx.fillStyle = isActive ? "rgba(10,132,255,0.92)" : "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.ellipse(p.x + p.w * 0.5, p.y + p.h * 0.9, 86, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // body
      const bodyX = p.x + 10;
      const bodyY = p.y + 54;
      const bodyW = p.w - 20;
      const bodyH = p.h - 70;

      softShadow(bodyX + 2, bodyY + 8, bodyW, bodyH, 0.12);

      ctx.save();
      ctx.fillStyle = S.wall;
      ctx.strokeStyle = "rgba(0,0,0,0.14)";
      ctx.lineWidth = 2;
      roundRect(bodyX, bodyY, bodyW, bodyH, 18);
      ctx.fill();
      ctx.stroke();

      // top cap
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      roundRect(bodyX, bodyY - 14, bodyW, 22, 18);
      ctx.fill();

      // brick seams
      drawLegoBrickGrid(bodyX + 8, bodyY + 10, bodyW - 16, bodyH - 20);
      ctx.restore();

      // sign
      const signPad = 10;
      const signW = bodyW - signPad * 2;
      const signH = 56;
      const signX = bodyX + signPad;
      const signY = p.y + 10;
      const textSize = 30;
      drawLegoSignPlaque(signX, signY, signW, signH, p.label, textSize, p.signColor);

      // door & window
      const doorW = bodyW * 0.36;
      const doorH = bodyH * 0.44;
      const doorX = bodyX + bodyW * 0.14;
      const doorY = bodyY + bodyH * 0.48;
      const doorColor = "#c46b25";
      drawLegoDoor(doorX, doorY, doorW, doorH, doorColor, S);

      const winW = bodyW * 0.38;
      const winH = doorH * 0.72;
      const winX = bodyX + bodyW * 0.56;
      const winY = bodyY + bodyH * 0.54;
      drawLegoWindow(winX, winY, winW, winH, S);

      // community logo on facade (window 위/옆)
      if (p.group === "community" && p.logo) {
        const lx = winX + winW * 0.5;
        const ly = signY + signH + 32;
        // small dark plate behind logo
        ctx.save();
        ctx.globalAlpha = 0.86;
        ctx.fillStyle = "rgba(10,14,24,0.78)";
        roundRect(lx - 32, ly - 22, 64, 44, 16);
        ctx.fill();
        ctx.globalAlpha = 1;
        drawLogo(p.logo, lx, ly, 26, "rgba(255,255,255,0.95)");
        ctx.restore();
      }

      // "오픈 준비중" badge
      if (p.status !== "open" || !p.url) {
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = "rgba(10,14,24,0.86)";
        const bx = signX + signW - 134;
        const by = signY + signH + 8;
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

    /* ----------------------- Simple props (flowers + lamps) ----------------------- */
    function drawLamp(o, t) {
      const x = o.x, y = o.y, s = o.s;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.0 + x * 0.01);
      groundAO(x - 18 * s, y + 18 * s, 36 * s, 18 * s, 0.10);

      ctx.save();
      ctx.fillStyle = "#3f4656";
      roundRect(x - 5 * s, y - 42 * s, 10 * s, 70 * s, 8 * s);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      roundRect(x - 16 * s, y - 54 * s, 32 * s, 22 * s, 10 * s);
      ctx.fill();
      glossyHighlight(x - 16 * s, y - 54 * s, 32 * s, 22 * s, 0.18);

      ctx.globalAlpha = 0.06 + 0.18 * pulse;
      ctx.fillStyle = "#ffd66b";
      ctx.beginPath();
      ctx.ellipse(x, y - 10 * s, 34 * s, 54 * s, 0, 0, Math.PI * 2);
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

    /* ----------------------- Player (minifig fallback) ----------------------- */
    function drawSpriteCharacter(x, y) {
      if (!sprite.loaded || !sprite.img) return false;

      const bob = player.moving ? Math.sin(player.bobT) * 0.35 : 0;
      const baseW = 88;
      const baseH = 96;

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
      ctx.drawImage(sprite.img, -baseW / 2, -72, baseW, baseH);
      ctx.restore();

      return true;
    }

    function drawMinifig(x, y) {
      const moving = player.moving;
      const bob = moving ? Math.sin(player.bobT) * 0.14 : 0;
      const swing = moving ? Math.sin(player.animT * 10) : 0;

      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = "rgba(10,14,24,0.42)";
      ctx.beginPath();
      ctx.ellipse(x, y + 28, 20, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(x, y + bob);

      const skin = "#ffd66b";
      const torso = "#0a84ff";
      const pants = "#3b4251";
      const hat = "#ff3b30";
      const outline = "rgba(0,0,0,0.18)";

      // head
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

      // cap
      ctx.fillStyle = hat;
      roundRect(-14, -40, 28, 15, 9);
      ctx.fill();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      roundRect(-10, -37, 20, 5, 6);
      ctx.fill();
      ctx.globalAlpha = 1;

      // face
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
      ctx.restore();

      // body
      const armSwing = 2.2 * swing;
      const legSwing = 3.0 * swing;

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

      ctx.restore();
    }

    /* ----------------------- Title + MiniMap ----------------------- */
    function drawWorldTitle() {
      const text = "FA 미니월드";
      const padX = 18;
      ctx.save();
      ctx.globalAlpha = 0.94;
      ctx.font = "1100 20px system-ui";
      const tw = ctx.measureText(text).width;
      const bw = tw + padX * 2;
      const bh = 40;
      const x = VIEW.w * 0.5 - bw * 0.5;
      const y = 14;
      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      ctx.lineWidth = 2;
      roundRect(x, y, bw, bh, 18);
      ctx.fill();
      ctx.stroke();
      glossyHighlight(x, y, bw, bh, 0.12);
      ctx.fillStyle = "rgba(10,14,24,0.92)";
      ctx.fillText(text, x + padX, y + 27);
      ctx.restore();
    }

    function drawMiniMap() {
      const pad = 16;
      const mw = 220;
      const mh = 160;
      const x = VIEW.w - mw - pad;
      const y = 16;

      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "rgba(255,255,255,0.78)";
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      ctx.lineWidth = 2;
      roundRect(x, y, mw, mh, 18);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      const ix = x + 10, iy = y + 10, iw = mw - 20, ih = mh - 20;

      ctx.save();
      roundRect(ix, iy, iw, ih, 14);
      ctx.clip();

      const sx = iw / WORLD.w;
      const sy = ih / WORLD.h;
      const s = Math.min(sx, sy);
      const ox = ix + (iw - WORLD.w * s) * 0.5;
      const oy = iy + (ih - WORLD.h * s) * 0.5;

      const mx = (wx) => ox + wx * s;
      const my = (wy) => oy + wy * s;

      // zones
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "rgba(38,44,55,0.85)";
      [zones.game, zones.community].forEach((z) => {
        roundRect(mx(z.x), my(z.y), z.w * s, z.h * s, 10);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // portals
      for (const p of portals) {
        const cx = mx(p.x + p.w * 0.5);
        const cy = my(p.y + p.h * 0.5);
        ctx.save();
        ctx.fillStyle = p.signColor || "rgba(10,132,255,1)";
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.arc(cx, cy, 4.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // player
      const px = mx(player.x);
      const py = my(player.y);
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
    }

    /* ----------------------- Update / Draw loop ----------------------- */
    let lastT = performance.now();
    let acc = 0, framesCount = 0;
    let lastMobileZoneKey = "";

    function update(dt, t) {
      let ax = 0, ay = 0;

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
          player.animT *= 0.9;
        }
      }

      player.bobT += dt * 6.0;

      // active portal
      activePortal = null;
      for (const p of portals) {
        const z = portalEnterZone(p);
        if (circleRectHit(player.x, player.y, player.r, z)) { activePortal = p; break; }
      }

      // mobile auto prompt when entering zone
      if (isTouchDevice() && activePortal && !modalState.open) {
        if (lastMobileZoneKey !== activePortal.key) {
          lastMobileZoneKey = activePortal.key;
          openPortalUI(activePortal);
        }
      }
      if (!activePortal) lastMobileZoneKey = "";

      // toast
      if (!modalState.open && activePortal) {
        UI.toast.hidden = false;
        const p = activePortal;
        if (p.status === "open" && p.url) {
          UI.toast.innerHTML = blockSpan(
            `🧱 <b>${p.label}</b><br/>포탈 앞이에요. <b>Enter</b>를 입력해주세요 (또는 <b>E</b>)`,
            { bg: "rgba(10,14,24,0.86)" }
          );
        } else {
          UI.toast.innerHTML = blockSpan(
            `🧱 <b>${p.label}</b><br/>오픈 준비중입니다`,
            { bg: "rgba(10,14,24,0.82)" }
          );
        }
      } else if (!modalState.open) {
        UI.toast.hidden = true;
      }

      updateCamera(dt);

      UI.coord.textContent = `x: ${Math.round(player.x)} · y: ${Math.round(player.y)}`;
      acc += dt;
      framesCount++;
      if (acc >= 0.45) {
        UI.fps.textContent = `fps: ${Math.round(framesCount / acc)}`;
        acc = 0; framesCount = 0;
      }
    }

    function draw(t, dt) {
      ctx.clearRect(0, 0, VIEW.w, VIEW.h);

      ctx.save();
      ctx.translate(-cam.x, -cam.y);

      drawSkyWorld();
      drawCloudsWorld(dt);
      drawGroundWorld();

      // zones labels inside (깔끔하게 작은 텍스트)
      drawZoneLabel(zones.game);
      drawZoneLabel(zones.community);

      // buildings
      for (const p of portals) drawPortalBuilding(p, t);

      // props
      for (const pr of props) {
        if (pr.kind === "lamp") drawLamp(pr, t);
        else if (pr.kind === "flower") drawFlower(pr, t);
      }

      // player
      if (!(SPRITE_SRC && USE_SPRITE_IF_LOADED && drawSpriteCharacter(player.x, player.y))) {
        drawMinifig(player.x, player.y);
      }

      ctx.restore();

      // overlay UI
      drawWorldTitle();
      drawMiniMap();

      // vignette
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

    function drawZoneLabel(z) {
      const text = z.title;
      const x = z.x + 24;
      const y = z.y + 22;
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      ctx.lineWidth = 2;
      roundRect(x, y, 160, 42, 16);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "rgba(10,14,24,0.92)";
      ctx.font = "1100 18px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, x + 80, y + 22);
      ctx.restore();
    }

    /* ----------------------- Loop ----------------------- */
    let lastMobileTap = 0;

    function loop(now) {
      const t = now / 1000;
      const dt = Math.min(0.033, (now - lastT) / 1000);
      lastT = now;

      try {
        update(dt, t);
        draw(t, dt);
      } catch (err) {
        console.error(err);
        UI.toast.hidden = false;
        UI.toast.innerHTML = blockSpan(`🧱 <b>JS 에러</b><br/>콘솔(Console) 확인: ${String(err).slice(0, 140)}`);
      }

      requestAnimationFrame(loop);
    }

    /* ----------------------- Portal click ----------------------- */
    canvas.addEventListener("pointerdown", (e) => {
      const p = getPointer(e);
      const w = screenToWorld(p.x, p.y);

      // PC: 포탈 존 클릭하면 모달
      if (activePortal && !modalState.open) {
        const z = portalEnterZone(activePortal);
        if (w.x >= z.x - 20 && w.x <= z.x + z.w + 20 && w.y >= z.y - 20 && w.y <= z.y + z.h + 20) {
          openPortalUI(activePortal);
        }
      }

      // mobile double tap while modal open -> enter
      if (isTouchDevice() && modalState.open && modalState.portal) {
        const nowT = performance.now();
        if (nowT - lastMobileTap < 320) confirmEnter(modalState.portal);
        lastMobileTap = nowT;
      }
    }, { passive: true });

    /* ----------------------- Start ----------------------- */
    resize();
    requestAnimationFrame(loop);
  });
})();
