/* HUB.JS - LEGO PREMIUM (single-file) v3.0 (FULL REBUILD, paste-all)
 * 적용됨:
 * 1) 모바일 조이스틱: 오른쪽 배치 + 크게
 * 2) 캐릭터: 옆모습 다리 중앙 정렬 + 2다리(걷는 느낌) / 히어로 장비(갑옷/검/방패)
 * 3) 검: 손에 고정 + 파티클/글로우
 * 4) 검/방패: 위치 꼬임 수정(방패=화면 왼손, 검=화면 오른손)
 * 5) 아이템창: I 로 열기 + 버튼으로 검/방패 ON/OFF
 *
 * 사용법: 이 파일 전체를 hub.js에 그대로 붙여넣기 (3파트를 순서대로 이어붙이기)
 */
(() => {
  "use strict";

  /* ----------------------- Utilities ----------------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

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

  /* ----------------------- UI ----------------------- */
  function ensureUI() {
    const canvas = ensureEl("world", "canvas");
    canvas.style.display = "block";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.background = "#eaf6ff";
    canvas.style.touchAction = "none";
    canvas.style.userSelect = "none";
    canvas.style.webkitUserSelect = "none";

    // cleanup
    const topbar =
      document.querySelector("header.topbar") ||
      document.querySelector("#topbar") ||
      document.querySelector("header");
    if (topbar) topbar.style.display = "none";
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";

    // Toast
    const toast = ensureEl("toast", "div");
    toast.style.position = "fixed";
    toast.style.left = "50%";
    toast.style.top = "92px";
    toast.style.transform = "translateX(-50%)";
    toast.style.zIndex = "9999";
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

    const style = ensureEl("lego_style_injected", "style", document.head);
    style.textContent = `
      #fade.on { opacity: 1; }
      * { -webkit-tap-highlight-color: transparent; }
    `;

    // Modal
    const modal = ensureEl("lego_modal", "div");
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.zIndex = "10000";
    modal.style.display = "none";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.background = "transparent";

    const modalInner = ensureEl("lego_modal_inner", "div", modal);
    modalInner.style.width = "min(760px, calc(100vw - 40px))";
    modalInner.style.background = "transparent";
    modalInner.style.textAlign = "center";
    modalInner.style.font = "1100 18px system-ui";
    modalInner.style.color = "rgba(10,14,24,0.92)";
    modalInner.style.userSelect = "none";

    const modalTitle = ensureEl("lego_modal_title", "div", modalInner);
    modalTitle.style.font = "1200 24px system-ui";
    modalTitle.style.marginBottom = "10px";

    const modalBody = ensureEl("lego_modal_body", "div", modalInner);
    modalBody.style.font = "1100 20px system-ui";
    modalBody.style.opacity = "0.94";
    modalBody.style.marginBottom = "10px";
    modalBody.style.lineHeight = "1.35";

    const modalHint = ensureEl("lego_modal_hint", "div", modalInner);
    modalHint.style.font = "900 13px system-ui";
    modalHint.style.opacity = "0.72";

    // ===== Mobile Analog Joystick (Right + Larger) =====
    const joy = ensureEl("joystick", "div");
    const JOY_SIZE = 168;
    const JOY_KNOB = 72;
    const JOY_RING = 136;

    joy.style.position = "fixed";
    joy.style.right = "18px";
    joy.style.bottom = "18px";
    joy.style.zIndex = "10001";
    joy.style.width = `${JOY_SIZE}px`;
    joy.style.height = `${JOY_SIZE}px`;
    joy.style.display = isTouchDevice() ? "block" : "none";
    joy.style.touchAction = "none";
    joy.style.userSelect = "none";

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
      const max = 52;
      joyKnob.style.transform = `translate(calc(-50% + ${ax * max}px), calc(-50% + ${ay * max}px))`;
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
      if (Math.hypot(ax, ay) < dz) return setJoy(0, 0);
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

    /* ---------- Inventory UI ---------- */
    const inv = ensureEl("inventory", "div");
    inv.style.position = "fixed";
    inv.style.left = "18px";
    inv.style.bottom = "18px";
    inv.style.zIndex = "10002";
    inv.style.display = "none";
    inv.style.padding = "12px";
    inv.style.borderRadius = "16px";
    inv.style.background = "rgba(255,255,255,0.90)";
    inv.style.border = "1px solid rgba(0,0,0,0.10)";
    inv.style.boxShadow = "0 18px 44px rgba(0,0,0,0.16)";
    inv.style.backdropFilter = "blur(8px)";
    inv.style.font = "900 13px system-ui";
    inv.style.color = "rgba(10,14,24,0.88)";
    inv.style.userSelect = "none";
    inv.style.webkitUserSelect = "none";
    inv.style.touchAction = "none";

    inv.innerHTML = `
      <div style="font:1200 14px system-ui; margin-bottom:8px;">🎒 아이템</div>
      <div style="display:flex; gap:8px; flex-wrap:wrap;">
        <button id="btn_sword"
          style="all:unset; cursor:pointer; padding:10px 12px; border-radius:12px;
                 background:rgba(10,14,24,0.86); color:white;">
          🗡️ 검: ON
        </button>
        <button id="btn_shield"
          style="all:unset; cursor:pointer; padding:10px 12px; border-radius:12px;
                 background:rgba(10,14,24,0.86); color:white;">
          🛡️ 방패: ON
        </button>
      </div>
      <div style="margin-top:8px; opacity:.7;">단축키: I (열기/닫기)</div>
    `;

    const btnSword = inv.querySelector("#btn_sword");
    const btnShield = inv.querySelector("#btn_shield");

    return {
      canvas, toast, coord, fps, fade,
      modal, modalTitle, modalBody, modalHint,
      joyState,
      inv, btnSword, btnShield
    };
  }

  /* ----------------------- Start ----------------------- */
  window.addEventListener("DOMContentLoaded", () => {
    const UI = ensureUI();
    const canvas = UI.canvas;
    const ctx = canvas.getContext("2d", { alpha: true });

    /* ----------------------- View / World ----------------------- */
    let W = 0, H = 0, DPR = 1;
    const VIEW = { zoom: 0.86, w: 0, h: 0 };
    const WORLD = { w: 4200, h: 3000, margin: 160 };

    const cam = { x: 0, y: 0, targetX: 0, targetY: 0 };
    function screenToWorld(sx, sy) { return { x: sx + cam.x, y: sy + cam.y }; }

    /* ----------------------- Player ----------------------- */
    const player = {
      x: 360, y: 360, r: 18,
      speed: isTouchDevice() ? 185 : 250,
      moving: false, animT: 0, bobT: 0,
      dir: "down",
      equip: { sword: true, shield: true }
    };

    /* ----------------------- Inventory logic ----------------------- */
    function refreshInvButtons() {
      if (!UI.btnSword || !UI.btnShield) return;
      UI.btnSword.textContent = `🗡️ 검: ${player.equip.sword ? "ON" : "OFF"}`;
      UI.btnShield.textContent = `🛡️ 방패: ${player.equip.shield ? "ON" : "OFF"}`;
      UI.btnSword.style.opacity = player.equip.sword ? "1" : "0.6";
      UI.btnShield.style.opacity = player.equip.shield ? "1" : "0.6";
    }
    function toggleInv() {
      if (!UI.inv) return;
      UI.inv.style.display = (UI.inv.style.display === "none") ? "block" : "none";
      refreshInvButtons();
    }
    UI.btnSword?.addEventListener("pointerup", () => {
      player.equip.sword = !player.equip.sword;
      refreshInvButtons();
    });
    UI.btnShield?.addEventListener("pointerup", () => {
      player.equip.shield = !player.equip.shield;
      refreshInvButtons();
    });
    refreshInvButtons();

    /* ----------------------- Input ----------------------- */
    const keys = new Set();
    let dragging = false;
    let dragOffset = { x: 0, y: 0 };

    // modal state (portal)
    const modalState = { open: false, portal: null };
    function blockSpan(html, opt = {}) {
      const bg = opt.bg || "rgba(10,14,24,0.86)";
      const fg = opt.fg || "rgba(255,255,255,0.98)";
      return `<span style="
        display:inline-block; padding:12px 16px; border-radius:18px;
        background:${bg}; color:${fg};
        box-shadow: 0 18px 54px rgba(0,0,0,0.22);
        letter-spacing: 0.4px;
        border: 1px solid rgba(255,255,255,0.10);
      ">${html}</span>`;
    }
    function openModal(title, body, hint) {
      UI.modalTitle.innerHTML = blockSpan(title, { bg: "rgba(255,255,255,0.90)", fg: "rgba(10,14,24,0.92)" });
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

    // keyboard
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      keys.add(k);

      // inventory
      if (k === "i") toggleInv();

      // escape
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
      const w = screenToWorld(p.x, p.y);
      const prevX = player.x, prevY = player.y;
      player.x = w.x + dragOffset.x;
      player.y = w.y + dragOffset.y;
      clampPlayerToWorld();
      updateDirFromDelta(player.x - prevX, player.y - prevY);
      player.moving = true;
      player.animT += 1 / 60;
    });
    canvas.addEventListener("pointerup", () => { dragging = false; });

    function clampPlayerToWorld() {
      player.x = clamp(player.x, WORLD.margin, WORLD.w - WORLD.margin);
      player.y = clamp(player.y, WORLD.margin, WORLD.h - WORLD.margin);
    }

    /* ----------------------- World Data ----------------------- */
    const roads = [];
    const sidewalks = [];
    const props = [];
    const portals = [
      { key: "avoid", label: "DODGE", status: "open", url: "https://faglobalxgp2024-design.github.io/index.html/", x: 0, y: 0, w: 260, h: 210, zone: "game" },
      { key: "archery", label: "ARCHERY", status: "open", url: "https://faglobalxgp2024-design.github.io/-/", x: 0, y: 0, w: 240, h: 200, zone: "game" },
      { key: "janggi", label: "JANGGI", status: "open", url: "https://faglobalxgp2024-design.github.io/MINIGAME/", x: 0, y: 0, w: 260, h: 210, zone: "game" },
      { key: "twitter", label: "TWITTER", status: "open", url: "https://x.com/FAGLOBAL_", x: 0, y: 0, w: 240, h: 200, zone: "comm" },
      { key: "telegram", label: "TELEGRAM", status: "open", url: "https://t.me/faglobalgp", x: 0, y: 0, w: 240, h: 200, zone: "comm" },
      { key: "market", label: "MARKET", status: "open", url: "https://famarket.store/", x: 0, y: 0, w: 240, h: 200, zone: "ads" },
      { key: "bbq", label: "BBQ", status: "open", url: "https://youtu.be/CP28c0QvRig", x: 0, y: 0, w: 240, h: 200, zone: "ads" },
    ];
    const ZONES = {
      game: { x: 360, y: 280, w: 1500, h: 840, color: "#0a84ff", label: "GAME ZONE" },
      comm: { x: 2340, y: 280, w: 1500, h: 840, color: "#34c759", label: "COMMUNITY ZONE" },
      ads:  { x: 1350, y: 1700, w: 1500, h: 640, color: "#ff2d55", label: "AD ZONE" },
    };

    function layoutWorld() {
      // roads (simple but continuous)
      roads.length = 0; sidewalks.length = 0; props.length = 0;

      // outer ring
      roads.push({ axis: "h", x: 220, y: 320, w: WORLD.w - 440, h: 120 });
      roads.push({ axis: "h", x: 220, y: WORLD.h - 440, w: WORLD.w - 440, h: 120 });
      roads.push({ axis: "v", x: 260, y: 280, w: 118, h: WORLD.h - 560 });
      roads.push({ axis: "v", x: WORLD.w - 378, y: 280, w: 118, h: WORLD.h - 560 });

      // middle cross
      roads.push({ axis: "h", x: 260, y: 1380, w: WORLD.w - 520, h: 132 });
      roads.push({ axis: "v", x: 2060, y: 320, w: 124, h: WORLD.h - 760 });

      // sidewalks around roads
      for (const r of roads) {
        if (r.axis === "h") {
          sidewalks.push({ x: r.x, y: r.y - 44, w: r.w, h: 34 });
          sidewalks.push({ x: r.x, y: r.y + r.h + 10, w: r.w, h: 34 });
        } else {
          sidewalks.push({ x: r.x - 44, y: r.y, w: 34, h: r.h });
          sidewalks.push({ x: r.x + r.w + 10, y: r.y, w: 34, h: r.h });
        }
      }

      // simple props: lamps along roads (regular)
      const interval = 260;
      for (const r of roads) {
        if (r.axis === "h") {
          for (let x = r.x + 80; x < r.x + r.w - 80; x += interval) {
            props.push({ kind: "lamp", x, y: r.y - 86, s: 1.02 });
            props.push({ kind: "lamp", x, y: r.y + r.h + 56, s: 1.02 });
          }
        } else {
          for (let y = r.y + 80; y < r.y + r.h - 80; y += interval) {
            props.push({ kind: "lamp", x: r.x - 86, y, s: 1.02 });
            props.push({ kind: "lamp", x: r.x + r.w + 56, y, s: 1.02 });
          }
        }
      }

      // portal placement inside zones (grid)
      const place = (p, zx, zy, i, cols) => {
        const gapX = (zx.w - 360) / (cols - 1);
        const row = Math.floor(i / cols);
        const col = i % cols;
        p.x = zx.x + 180 + col * gapX - p.w / 2;
        p.y = zx.y + 240 + row * 320 - p.h / 2;
      };
      let gi = 0, ci = 0, ai = 0;
      for (const p of portals) {
        if (p.zone === "game") place(p, ZONES.game, 0, gi++, 3);
        else if (p.zone === "comm") place(p, ZONES.comm, 0, ci++, 2);
        else place(p, ZONES.ads, 0, ai++, 2);
      }

      // keep player inside
      clampPlayerToWorld();
    }

    /* ----------------------- Resize ----------------------- */
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

      // scale world with screen, but keep min
      WORLD.w = Math.max(4200, Math.floor(W * 4.4));
      WORLD.h = Math.max(3000, Math.floor(H * 3.8));

      // adjust zones relative
      ZONES.game.x = WORLD.w * 0.08;
      ZONES.game.y = WORLD.h * 0.14;
      ZONES.game.w = WORLD.w * 0.36;
      ZONES.game.h = WORLD.h * 0.30;

      ZONES.comm.x = WORLD.w * 0.56;
      ZONES.comm.y = WORLD.h * 0.14;
      ZONES.comm.w = WORLD.w * 0.36;
      ZONES.comm.h = WORLD.h * 0.30;

      ZONES.ads.x = WORLD.w * 0.32;
      ZONES.ads.y = WORLD.h * 0.60;
      ZONES.ads.w = WORLD.w * 0.36;
      ZONES.ads.h = WORLD.h * 0.20;

      layoutWorld();
    }
    window.addEventListener("resize", resize);

    /* ----------------------- Movement / Camera ----------------------- */
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

    // expose for later parts
    window.__LEGO_CTX__ = { UI, canvas, ctx, VIEW, WORLD, cam, player, keys, dragging, screenToWorld, getPointer, closeModal, openModal, blockSpan, portals, roads, sidewalks, props, ZONES, resize, updateCamera, updateDirFromAxes, updateDirFromDelta };
    resize();
        // ======== PART 2 START ========
    const {
      UI, ctx, VIEW, WORLD, cam, player, keys,
      screenToWorld, updateCamera, updateDirFromAxes,
      portals, roads, sidewalks, props, ZONES
    } = window.__LEGO_CTX__;

    /* ----------------------- Drawing helpers ----------------------- */
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
    function softShadow(x, y, w, h, alpha = 0.10) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(10,14,24,0.85)";
      roundRect(x, y, w, h, 18);
      ctx.fill();
      ctx.restore();
    }

    /* ----------------------- Background ----------------------- */
    const clouds = Array.from({ length: 12 }, (_, i) => ({
      x: (i / 12) * 3600 + Math.random() * 200,
      y: 40 + Math.random() * 260,
      s: 0.7 + Math.random() * 1.25,
      v: 9 + Math.random() * 18,
      layer: Math.random() < 0.5 ? 0 : 1
    }));

    function drawSkyWorld() {
      const g = ctx.createLinearGradient(0, 0, 0, WORLD.h);
      g.addColorStop(0, "#bfe7ff");
      g.addColorStop(0.55, "#d7f1ff");
      g.addColorStop(1, "#fff2fb");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);

      ctx.save();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "rgba(255,255,255,0.60)";
      ctx.beginPath();
      ctx.ellipse(WORLD.w * 0.22, WORLD.h * 0.18, 560, 260, 0, 0, Math.PI * 2);
      ctx.ellipse(WORLD.w * 0.72, WORLD.h * 0.16, 620, 280, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    function drawClouds(dt) {
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
      ctx.save();
      ctx.fillStyle = "#39d975";
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.06;
      ctx.strokeStyle = "rgba(0,0,0,0.18)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= WORLD.w; x += 86) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD.h); ctx.stroke(); }
      for (let y = 0; y <= WORLD.h; y += 86) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD.w, y); ctx.stroke(); }
      ctx.restore();
    }

    /* ----------------------- Roads / Sidewalks ----------------------- */
    function drawRoads() {
      for (const r of roads) {
        groundAO(r.x, r.y + r.h - 18, r.w, 26, 0.18);

        ctx.save();
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = "rgba(255,255,255,0.30)";
        roundRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12, 44);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = "#262c37";
        roundRect(r.x, r.y, r.w, r.h, 40);
        ctx.fill();

        // lane
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
        groundAO(s.x, s.y + s.h - 10, s.w, 20, 0.12);
        ctx.save();
        ctx.fillStyle = "#f5efe7";
        roundRect(s.x, s.y, s.w, s.h, 18);
        ctx.fill();
        ctx.globalAlpha = 0.10;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        roundRect(s.x + 4, s.y + 3, s.w - 8, Math.max(8, s.h * 0.35), 14);
        ctx.fill();
        ctx.restore();
      }
    }

    /* ----------------------- Zones + Gate ----------------------- */
    function drawZone(z, t) {
      ctx.save();
      ctx.fillStyle = "#d9c6a3";
      roundRect(z.x, z.y, z.w, z.h, 26);
      ctx.fill();

      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = "rgba(10,14,24,0.48)";
      ctx.lineWidth = 4;
      roundRect(z.x + 2, z.y + 2, z.w - 4, z.h - 4, 24);
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

      // entrance gate (bottom center)
      const gateW = 260, gateH = 86;
      const gx = z.x + z.w * 0.5 - gateW * 0.5;
      const gy = z.y + z.h - gateH * 0.55;
      const pulse = 0.55 + 0.45 * Math.sin(t * 2.8);

      // carpet
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = z.color;
      roundRect(gx + 22, gy + 40, gateW - 44, 160, 22);
      ctx.fill();
      ctx.restore();

      groundAO(gx + 14, gy + gateH - 10, gateW - 28, 24, 0.22);

      ctx.save();
      softShadow(gx + 4, gy + 10, gateW - 8, gateH - 6, 0.10);
      ctx.fillStyle = "rgba(10,14,24,0.86)";
      roundRect(gx, gy + 18, gateW, gateH - 18, 22);
      ctx.fill();

      ctx.globalAlpha = 0.12 + 0.10 * pulse;
      ctx.fillStyle = z.color;
      roundRect(gx + 8, gy + 24, gateW - 16, gateH - 28, 18);
      ctx.fill();

      ctx.globalAlpha = 0.50 + 0.30 * pulse;
      ctx.strokeStyle = z.color;
      ctx.lineWidth = 3;
      roundRect(gx + 6, gy + 20, gateW - 12, gateH - 24, 20);
      ctx.stroke();

      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      roundRect(gx + gateW * 0.5 - 120, gy - 22, 240, 44, 18);
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      ctx.lineWidth = 2;
      roundRect(gx + gateW * 0.5 - 120, gy - 22, 240, 44, 18);
      ctx.stroke();

      ctx.fillStyle = "rgba(10,14,24,0.92)";
      ctx.font = "1200 16px system-ui";
      ctx.fillText("ENTRANCE", gx + gateW * 0.5, gy);

      ctx.restore();
    }

    /* ----------------------- Buildings ----------------------- */
    function drawBuilding(p, t) {
      groundAO(p.x + 8, p.y + p.h - 18, p.w - 16, 30, 0.22);

      const active = (Math.hypot(player.x - (p.x + p.w / 2), player.y - (p.y + p.h * 0.82)) < 64);
      const pulse = 0.55 + 0.45 * Math.sin(t * 3.0 + (p.x + p.y) * 0.01);

      // base
      ctx.save();
      ctx.fillStyle = "#57c957";
      roundRect(p.x + 10, p.y + p.h - 16, p.w - 20, 14, 10);
      ctx.fill();
      ctx.restore();

      // body
      const bodyX = p.x + 10, bodyY = p.y + 54, bodyW = p.w - 20, bodyH = p.h - 70;
      softShadow(bodyX + 2, bodyY + 8, bodyW, bodyH, 0.12);

      ctx.save();
      ctx.fillStyle = "#f2d9b3";
      ctx.strokeStyle = "rgba(0,0,0,0.14)";
      ctx.lineWidth = 2;
      roundRect(bodyX, bodyY, bodyW, bodyH, 18);
      ctx.fill(); ctx.stroke();
      glossyHighlight(bodyX, bodyY, bodyW, bodyH, 0.10);
      ctx.restore();

      // sign
      ctx.save();
      const signW = bodyW - 20, signH = 56;
      ctx.fillStyle = "rgba(10,14,24,0.86)";
      roundRect(bodyX + 10, p.y + 10, signW, signH, 18);
      ctx.fill();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      roundRect(bodyX + 18, p.y + 16, signW - 16, 16, 12);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ffffff";
      ctx.font = "1200 22px system-ui";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.label, bodyX + 10 + signW / 2, p.y + 38);
      ctx.restore();

      // active ring
      if (active) {
        ctx.save();
        ctx.globalAlpha = 0.10 + 0.14 * pulse;
        ctx.fillStyle = "rgba(10,132,255,0.92)";
        ctx.beginPath();
        ctx.ellipse(p.x + p.w * 0.5, p.y + p.h * 0.9, 90, 28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    /* ----------------------- Props: Lamp ----------------------- */
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

    /* ----------------------- Character: Minifig + Hero Gear ----------------------- */
    function drawMinifig(x, y, opts = {}) {
      const moving = opts.moving ?? player.moving;
      const bobT = opts.bobT ?? player.bobT;
      const animT = opts.animT ?? player.animT;
      const dir = opts.dir ?? player.dir;
      const isHero = !!opts.isHero;
      const time = opts.time ?? 0;
      const equip = opts.equip ?? player.equip;

      const bob = moving ? Math.sin(bobT) * 0.14 : 0;
      const swing = moving ? Math.sin(animT * 10) : 0;

      // shadow
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

      const skin = "#ffd66b";
      const torso = isHero ? "#1f6fff" : "#0a84ff";
      const pants = isHero ? "#2a2f3b" : "#3b4251";
      const outline = "rgba(0,0,0,0.18)";

      // head
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

      // helmet (hero)
      if (isHero) {
        const black1 = "#1a1d24";
        const black2 = "#2a2f3b";
        const red1 = "#ff2d55";
        const bone = "#e9e2d2";

        const hg = ctx.createLinearGradient(-16, -36, 16, -14);
        hg.addColorStop(0, black2);
        hg.addColorStop(0.7, black1);
        hg.addColorStop(1, "rgba(10,14,24,0.25)");
        ctx.fillStyle = hg;
        roundRect(-16, -36, 32, 18, 10);
        ctx.fill();

        ctx.globalAlpha = 0.95;
        ctx.fillStyle = red1;
        roundRect(-2.2, -36, 4.4, 18, 2.2);
        ctx.fill();
        ctx.globalAlpha = 1;

        ctx.globalAlpha = 0.28;
        ctx.fillStyle = "rgba(0,0,0,0.85)";
        roundRect(-10, -28, 20, 6, 6);
        ctx.fill();
        ctx.globalAlpha = 1;

        // horns
        ctx.fillStyle = bone;
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

      // arms + torso
      const armSwing = 2.2 * swing;
      const legSwing = 3.0 * swing;

      // torso
      if (!side) {
        ctx.fillStyle = torso;
        roundRect(-14, -4, 28, 28, 12);
        ctx.fill();
        glossyHighlight(-14, -4, 28, 28, 0.10);

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

        // legs (front view)
        ctx.fillStyle = pants;
        roundRect(-12, 22, 11, 16, 6);
        ctx.fill();
        roundRect(1, 22, 11, 16, 6);
        ctx.fill();

        // shoes
        ctx.fillStyle = "rgba(10,14,24,0.82)";
        ctx.beginPath();
        ctx.ellipse(-6, 40 + legSwing, 6.4, 3.1, 0, 0, Math.PI * 2);
        ctx.ellipse(6, 40 - legSwing, 6.4, 3.1, 0, 0, Math.PI * 2);
        ctx.fill();

        // hero gear
        if (isHero) drawHeroGear(dir, swing, time, equip, /*isMirrored*/ (dir === "left"));

      } else {
        // SIDE VIEW FIX ✅: 다리를 2개 다 그리되 "중앙" 기반으로 겹치게 => 앉아서 미끄러지는 느낌 제거
        ctx.fillStyle = torso;
        roundRect(-9, -4, 18, 28, 12);
        ctx.fill();
        glossyHighlight(-9, -4, 18, 28, 0.10);

        // back arm hint
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = "rgba(0,0,0,0.12)";
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

        // ✅ side legs (two legs, centered)
        const legX1 = 1;      // 중심 기준
        const legX2 = -3;     // 뒤쪽 다리(살짝 뒤)
        const legY = 22;

        ctx.save();
        // back leg first (darker)
        ctx.globalAlpha = 0.78;
        ctx.fillStyle = pants;
        roundRect(legX2, legY, 12, 16, 6);
        ctx.fill();
        ctx.fillStyle = "rgba(10,14,24,0.72)";
        ctx.beginPath();
        ctx.ellipse(legX2 + 7, 40 - legSwing * 0.6, 6.2, 3.0, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // front leg
        ctx.fillStyle = pants;
        roundRect(legX1, legY, 12, 16, 6);
        ctx.fill();
        ctx.fillStyle = "rgba(10,14,24,0.82)";
        ctx.beginPath();
        ctx.ellipse(legX1 + 7.2, 40 + legSwing, 6.6, 3.1, 0, 0, Math.PI * 2);
        ctx.fill();

        if (isHero) drawHeroGear(dir, swing, time, equip, (dir === "left"));
      }

      ctx.restore();
    }

    // ===== Hero gear (shield left / sword right, sword fixed to hand + particles) =====
    function drawHeroGear(dir, swing, time = 0, equip = { sword: true, shield: true }, isMirrored = false) {
      const metalDark = "#1a1d24";
      const metalMid  = "#2a2f3b";
      const red1 = "#ff2d55";
      const red2 = "#b00024";
      const steel = "#c8cfdb";
      const gold = "#ffcc00";

      // chest armor overlay
      ctx.save();
      const cg = ctx.createLinearGradient(-14, 0, 14, 18);
      cg.addColorStop(0, metalMid);
      cg.addColorStop(1, "rgba(10,14,24,0.28)");
      ctx.globalAlpha = 0.98;
      ctx.fillStyle = cg;
      roundRect(-15, 0, 30, 19, 9);
      ctx.fill();

      ctx.globalAlpha = 0.95;
      ctx.fillStyle = metalDark;
      roundRect(-12.5, 2.5, 25, 14, 8);
      ctx.fill();

      ctx.globalAlpha = 0.9;
      ctx.fillStyle = red1;
      roundRect(-2.2, 2.5, 4.4, 14, 2.2);
      ctx.fill();
      roundRect(-10, 8.2, 20, 3.8, 2.2);
      ctx.fill();
      ctx.restore();

      // hands anchor (screen-facing)
      // shield = viewer-left, sword = viewer-right (always)
      const shieldX = -18;
      const swordX  =  18;

      // DOWN direction slight swap for better readability (optional)
      const downFlip = (dir === "down");
      const sX = downFlip ? 18 : shieldX;
      const wX = downFlip ? -18 : swordX;

      // SHIELD
      if (equip.shield) {
        ctx.save();
        ctx.translate(sX, 18);
        ctx.rotate(-0.10);

        // shadow
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = "rgba(10,14,24,0.55)";
        roundRect(-14, -10, 28, 30, 12);
        ctx.fill();

        // shield silhouette
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

        // red glow edge
        ctx.globalAlpha = 0.20;
        ctx.strokeStyle = red1;
        ctx.lineWidth = 4;
        shieldPath();
        ctx.stroke();

        // boss
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = steel;
        ctx.beginPath();
        ctx.arc(0, 6, 4.2, 0, Math.PI * 2);
        ctx.fill();

        // emblem
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

      // SWORD (fixed to hand + blade points outward)
      if (equip.sword) {
        ctx.save();

        // sword should always be on viewer-right, so no extra mirroring needed
        // anchor to "front hand" region in our minifig: around (wX, 18)
        const handY = 18 + (-swing * 1.2); // tiny sway
        ctx.translate(wX, handY);

        // rotation depends on direction, keep blade outward (right side)
        let rot = -0.35;
        if (dir === "up") rot = -0.95;
        if (dir === "down") rot = -0.10;
        if (dir === "left" || dir === "right") rot = -0.55;
        rot += swing * 0.08;

        ctx.rotate(rot);

        // handle/grip (draw first so blade looks attached)
        ctx.globalAlpha = 1;
        ctx.fillStyle = "rgba(10,14,24,0.82)";
        roundRect(-2, 5, 4, 11, 2);
        ctx.fill();

        // guard
        ctx.fillStyle = gold;
        roundRect(-7, 1, 14, 4, 2);
        ctx.fill();

        // pommel
        ctx.fillStyle = red2;
        ctx.beginPath();
        ctx.arc(0, 18, 3.0, 0, Math.PI * 2);
        ctx.fill();

        // blade (less rubbery outline)
        const bladeGrad = ctx.createLinearGradient(0, -28, 0, 4);
        bladeGrad.addColorStop(0, "#f4f7ff");
        bladeGrad.addColorStop(0.65, steel);
        bladeGrad.addColorStop(1, "rgba(10,14,24,0.22)");
        ctx.fillStyle = bladeGrad;
        roundRect(-2.2, -28, 4.4, 30, 2.0);
        ctx.fill();

        // subtle edge stroke
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.strokeStyle = "rgba(10,14,24,0.65)";
        ctx.lineWidth = 1.0;
        roundRect(-2.2, -28, 4.4, 30, 2.0);
        ctx.stroke();
        ctx.restore();

        // edge highlight
        ctx.globalAlpha = 0.22;
        ctx.strokeStyle = "rgba(255,255,255,0.9)";
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(-1.0, -26);
        ctx.lineTo(-1.0, 0);
        ctx.stroke();

        // rune line
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = red1;
        roundRect(-0.7, -18, 1.4, 10, 1);
        ctx.fill();

        // ✅ particle glow along blade (deterministic, no RNG)
        // particles in sword-local space (around blade centerline)
        const baseA = 0.18 + 0.10 * Math.sin(time * 6.0);
        for (let i = 0; i < 10; i++) {
          const tt = (time * 2.2) + i * 0.7;
          const py = -24 + i * 2.6 + Math.sin(tt) * 1.2;
          const px = Math.sin(tt * 1.7) * 1.2;
          const rr = 1.6 + 0.8 * (0.5 + 0.5 * Math.sin(tt * 2.1));
          ctx.save();
          ctx.globalAlpha = baseA * (0.6 + 0.4 * Math.sin(tt + 1.0));
          ctx.fillStyle = "#ff2d55";
          ctx.beginPath();
          ctx.arc(px, py, rr, 0, Math.PI * 2);
          ctx.fill();

          ctx.globalAlpha = 0.08;
          ctx.fillStyle = "#ffd66b";
          ctx.beginPath();
          ctx.arc(px, py, rr * 4.0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // soft glow around sword
        ctx.save();
        ctx.globalAlpha = 0.10;
        ctx.fillStyle = "#ff2d55";
        ctx.beginPath();
        ctx.ellipse(0, -12, 14, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.restore();
      }
    }

    // expose part2
    window.__LEGO_CTX2__ = { drawSkyWorld, drawClouds, drawGroundWorld, drawRoads, drawZone, drawBuilding, drawLamp, drawMinifig };
        // ======== PART 3 START ========
    const { drawSkyWorld, drawClouds, drawGroundWorld, drawRoads, drawZone, drawBuilding, drawLamp, drawMinifig } = window.__LEGO_CTX2__;

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

      // roads
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = "rgba(38,44,55,0.85)";
      for (const r of roads) {
        roundRect(mx(r.x), my(r.y), r.w * s, r.h * s, 8);
        ctx.fill();
      }

      // zones
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = ZONES.game.color;
      roundRect(mx(ZONES.game.x), my(ZONES.game.y), ZONES.game.w * s, ZONES.game.h * s, 8);
      ctx.fill();
      ctx.fillStyle = ZONES.comm.color;
      roundRect(mx(ZONES.comm.x), my(ZONES.comm.y), ZONES.comm.w * s, ZONES.comm.h * s, 8);
      ctx.fill();
      ctx.fillStyle = ZONES.ads.color;
      roundRect(mx(ZONES.ads.x), my(ZONES.ads.y), ZONES.ads.w * s, ZONES.ads.h * s, 8);
      ctx.fill();

      // portals
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "rgba(10,132,255,0.95)";
      for (const p of portals) {
        ctx.beginPath();
        ctx.arc(mx(p.x + p.w / 2), my(p.y + p.h / 2), 4.2, 0, Math.PI * 2);
        ctx.fill();
      }

      // player
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(10,132,255,0.98)";
      ctx.beginPath();
      ctx.arc(mx(player.x), my(player.y), 5.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.arc(mx(player.x), my(player.y), 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      ctx.restore();
    }

    function drawWorldTitle() {
      const text = "FA미니월드";
      ctx.save();
      ctx.globalAlpha = 0.94;
      ctx.font = "1100 20px system-ui";
      const tw = ctx.measureText(text).width;
      const bw = tw + 36, bh = 40;
      const x = VIEW.w * 0.5 - bw * 0.5, y = 14;
      ctx.fillStyle = "rgba(255,255,255,0.86)";
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      ctx.lineWidth = 2;
      roundRect(x, y, bw, bh, 18);
      ctx.fill(); ctx.stroke();
      glossyHighlight(x, y, bw, bh, 0.12);
      ctx.fillStyle = "rgba(10,14,24,0.92)";
      ctx.fillText(text, x + 18, y + 27);
      ctx.restore();
    }

    /* ----------------------- Portal interaction ----------------------- */
    let activePortal = null;
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

    let entering = false;
    function openPortalUI(p) {
      if (!p) return;
      if (p.status !== "open" || !p.url) {
        UI.toast.hidden = false;
        UI.toast.innerHTML = blockSpan(`🧱 <b>${p.label}</b><br/>오픈 준비중입니다`, { bg: "rgba(10,14,24,0.82)" });
        return;
      }
      openModal(`🧱 ${p.label}`, `입장하시겠습니까?<br/><span style="opacity:.95;font-size:22px;font-weight:1200;">Enter / E</span>`, isTouchDevice() ? "모바일: 화면 탭하면 입장" : "PC: Enter 또는 E");
      window.__LEGO_CTX__.UI.modalState = { open: true, portal: p };
      // 간단하게 portal 저장
      window.__ACTIVE_PORTAL__ = p;
    }
    function confirmEnter(p) {
      if (entering) return;
      if (!p || p.status !== "open" || !p.url) return;
      entering = true;
      UI.fade.classList.add("on");
      setTimeout(() => (window.location.href = p.url), 260);
    }
    UI.modal.addEventListener("pointerup", () => {
      if (isTouchDevice()) {
        const p = window.__ACTIVE_PORTAL__;
        if (p) confirmEnter(p);
      }
    });

    // keydown enter/e hook (safe)
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (k === "enter" || k === "e") {
        if (window.__ACTIVE_PORTAL__) confirmEnter(window.__ACTIVE_PORTAL__);
        else if (activePortal) openPortalUI(activePortal);
      }
    });

    /* ----------------------- Update / Draw loop ----------------------- */
    let lastT = performance.now();
    let acc = 0, framesCount = 0;

    function update(dt, t) {
      let ax = 0, ay = 0;

      if (!window.__LEGO_CTX__.dragging) {
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
          player.x = clamp(player.x, WORLD.margin, WORLD.w - WORLD.margin);
          player.y = clamp(player.y, WORLD.margin, WORLD.h - WORLD.margin);
          player.animT += dt;
        } else {
          player.animT *= 0.9;
        }
      }

      player.bobT += dt * 6.0;

      // portal detection
      activePortal = null;
      for (const p of portals) {
        const z = portalEnterZone(p);
        if (circleRectHit(player.x, player.y, player.r, z)) { activePortal = p; break; }
      }

      // toast
      if (activePortal) {
        UI.toast.hidden = false;
        const p = activePortal;
        if (p.status === "open" && p.url) {
          UI.toast.innerHTML = blockSpan(`🧱 <b>${p.label}</b><br/>포탈 앞이에요. <b>Enter</b> 또는 <b>E</b>`, { bg: "rgba(10,14,24,0.86)" });
        } else {
          UI.toast.innerHTML = blockSpan(`🧱 <b>${p.label}</b><br/>오픈 준비중입니다`, { bg: "rgba(10,14,24,0.82)" });
        }
      } else {
        UI.toast.hidden = true;
        window.__ACTIVE_PORTAL__ = null;
      }

      // camera + ui
      updateCamera(dt);
      UI.coord.textContent = `x: ${Math.round(player.x)} · y: ${Math.round(player.y)}`;
      acc += dt; framesCount++;
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
      drawClouds(dt);
      drawGroundWorld();
      drawRoads();

      // zones + gates
      drawZone(ZONES.game, t);
      drawZone(ZONES.comm, t);
      drawZone(ZONES.ads, t);

      // buildings
      for (const p of portals) drawBuilding(p, t);

      // props
      for (const pr of props) {
        if (pr.kind === "lamp") drawLamp(pr, t);
      }

      // player (hero)
      drawMinifig(player.x, player.y, { isHero: true, time: t, equip: player.equip });

      ctx.restore();

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

    function loop(now) {
      const dt = Math.min(0.033, (now - lastT) / 1000);
      lastT = now;
      const t = now / 1000;

      try {
        update(dt, t);
        draw(t, dt);
      } catch (err) {
        console.error(err);
        UI.toast.hidden = false;
        UI.toast.innerHTML = blockSpan(`🧱 <b>JS 에러</b><br/>콘솔(Console) 확인: ${String(err).slice(0, 160)}`);
      }
      requestAnimationFrame(loop);
    }

    // click portal
    canvas.addEventListener("pointerdown", (e) => {
      const p = window.__LEGO_CTX__.getPointer(e);
      const w = screenToWorld(p.x, p.y);
      if (activePortal) {
        const z = portalEnterZone(activePortal);
        if (w.x >= z.x - 24 && w.x <= z.x + z.w + 24 && w.y >= z.y - 24 && w.y <= z.y + z.h + 24) {
          openPortalUI(activePortal);
        }
      }
    }, { passive: true });

    requestAnimationFrame(loop);
  });
})();
