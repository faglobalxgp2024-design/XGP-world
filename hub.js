/* HUN.JS - META WORLD FINAL (single-file)
 * 반영:
 * - GitHub 배경/캐릭터 이미지 사용
 * - 배경 확대감 축소
 * - 포털 진입 판정 보강
 * - 캐릭터 자연스러운 접지/걷기 모션
 * - I = 인벤토리, Tab = 장착창
 * - 무기/방패/투구 장착 시 캐릭터 반영
 */
(() => {
  "use strict";

  /* ----------------------- CONFIG ----------------------- */
  const SPRITE_SRC =
    "https://raw.githubusercontent.com/faglobalxgp2024-design/XGP-world/main/%EC%BA%90%EB%A6%AD%ED%84%B0%20%EC%9D%B4%EB%AF%B8%EC%A7%80.png";
  const WORLD_ART_BASE_SRC =
    "https://raw.githubusercontent.com/faglobalxgp2024-design/XGP-world/main/%EB%A7%B5-%EB%B0%94%ED%83%95.png";
  const WORLD_ART_SRC =
    "https://raw.githubusercontent.com/faglobalxgp2024-design/XGP-world/main/%EB%A9%94%ED%83%80%EC%9B%94%EB%93%9C.png";

  const USE_CUSTOM_WORLD_ART = true;
  const USE_SPRITE_IF_LOADED = true;

  /* ----------------------- UTIL ----------------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  function isTouchDevice() {
    return (navigator.maxTouchPoints || 0) > 0;
  }

  function ensureEl(id, tag, parent = document.body) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement(tag);
      el.id = id;
      parent.appendChild(el);
    }
    return el;
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function screenTextBox(html, opts = {}) {
    const {
      bg = "rgba(255,255,255,0.90)",
      fg = "#0a0e18",
      bd = "rgba(0,0,0,0.10)"
    } = opts;
    return `<span style="display:inline-block;padding:12px 16px;border-radius:16px;background:${bg};color:${fg};border:1px solid ${bd};box-shadow:0 14px 34px rgba(0,0,0,0.12)">${html}</span>`;
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

    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";

    const topbar =
      document.querySelector("header.topbar") ||
      document.querySelector("#topbar") ||
      document.querySelector("header");
    if (topbar) topbar.style.display = "none";

    const toast = ensureEl("toast", "div");
    toast.style.position = "fixed";
    toast.style.left = "50%";
    toast.style.top = "92px";
    toast.style.transform = "translateX(-50%)";
    toast.style.zIndex = "9999";
    toast.style.pointerEvents = "none";
    toast.style.maxWidth = "min(760px, calc(100vw - 28px))";
    toast.style.textAlign = "center";
    toast.hidden = true;

    const coord = ensureEl("coord", "div");
    coord.style.position = "fixed";
    coord.style.left = "16px";
    coord.style.top = "18px";
    coord.style.zIndex = "9999";
    coord.style.padding = "8px 10px";
    coord.style.borderRadius = "12px";
    coord.style.background = "rgba(255,255,255,0.86)";
    coord.style.border = "1px solid rgba(0,0,0,0.10)";
    coord.style.font = "900 12px system-ui";

    const fps = ensureEl("fps", "div");
    fps.style.position = "fixed";
    fps.style.left = "118px";
    fps.style.top = "18px";
    fps.style.zIndex = "9999";
    fps.style.padding = "8px 10px";
    fps.style.borderRadius = "12px";
    fps.style.background = "rgba(255,255,255,0.86)";
    fps.style.border = "1px solid rgba(0,0,0,0.10)";
    fps.style.font = "900 12px system-ui";

    const fade = ensureEl("fade", "div");
    fade.style.position = "fixed";
    fade.style.inset = "0";
    fade.style.background = "#fff";
    fade.style.opacity = "0";
    fade.style.pointerEvents = "none";
    fade.style.zIndex = "9998";
    fade.style.transition = "opacity 220ms ease";

    const modal = ensureEl("portal_modal", "div");
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.display = "none";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.zIndex = "10000";
    modal.style.background = "rgba(255,255,255,0.12)";
    modal.style.backdropFilter = "blur(3px)";

    const modalInner = ensureEl("portal_modal_inner", "div", modal);
    modalInner.style.textAlign = "center";

    const modalTitle = ensureEl("portal_modal_title", "div", modalInner);
    modalTitle.style.marginBottom = "10px";

    const modalBody = ensureEl("portal_modal_body", "div", modalInner);
    modalBody.style.marginBottom = "10px";

    const modalHint = ensureEl("portal_modal_hint", "div", modalInner);

    /* inventory */
    const inv = ensureEl("inventory_panel", "div");
    inv.style.position = "fixed";
    inv.style.left = "20px";
    inv.style.bottom = "18px";
    inv.style.width = "330px";
    inv.style.maxWidth = "calc(100vw - 40px)";
    inv.style.padding = "14px";
    inv.style.borderRadius = "18px";
    inv.style.background = "rgba(255,255,255,0.94)";
    inv.style.border = "1px solid rgba(0,0,0,0.10)";
    inv.style.boxShadow = "0 18px 44px rgba(0,0,0,0.16)";
    inv.style.zIndex = "10002";
    inv.style.display = "none";
    inv.style.font = "700 13px system-ui";

    const equip = ensureEl("equip_panel", "div");
    equip.style.position = "fixed";
    equip.style.left = "370px";
    equip.style.bottom = "18px";
    equip.style.width = "260px";
    equip.style.maxWidth = "calc(100vw - 40px)";
    equip.style.padding = "14px";
    equip.style.borderRadius = "18px";
    equip.style.background = "rgba(255,255,255,0.94)";
    equip.style.border = "1px solid rgba(0,0,0,0.10)";
    equip.style.boxShadow = "0 18px 44px rgba(0,0,0,0.16)";
    equip.style.zIndex = "10002";
    equip.style.display = "none";
    equip.style.font = "700 13px system-ui";

    if (window.innerWidth < 900) {
      equip.style.left = "20px";
      equip.style.bottom = "220px";
    }

    /* joystick */
    const joy = ensureEl("joystick", "div");
    const JOY_SIZE = 168;
    const JOY_KNOB = 72;
    joy.style.position = "fixed";
    joy.style.right = "18px";
    joy.style.bottom = "18px";
    joy.style.zIndex = "10001";
    joy.style.width = `${JOY_SIZE}px`;
    joy.style.height = `${JOY_SIZE}px`;
    joy.style.display = isTouchDevice() ? "block" : "none";
    joy.style.touchAction = "none";

    const joyBase = ensureEl("joystick_base", "div", joy);
    joyBase.style.position = "absolute";
    joyBase.style.inset = "0";
    joyBase.style.borderRadius = "999px";
    joyBase.style.background = "rgba(255,255,255,0.74)";
    joyBase.style.border = "1px solid rgba(0,0,0,0.10)";
    joyBase.style.boxShadow = "0 18px 44px rgba(0,0,0,0.16)";
    joyBase.style.backdropFilter = "blur(8px)";

    const joyRing = ensureEl("joystick_ring", "div", joy);
    joyRing.style.position = "absolute";
    joyRing.style.left = "16px";
    joyRing.style.top = "16px";
    joyRing.style.width = "136px";
    joyRing.style.height = "136px";
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
    joyKnob.style.background = "rgba(255,255,255,0.94)";
    joyKnob.style.border = "1px solid rgba(0,0,0,0.12)";
    joyKnob.style.boxShadow = "0 16px 40px rgba(0,0,0,0.18)";
    joyKnob.style.display = "flex";
    joyKnob.style.alignItems = "center";
    joyKnob.style.justifyContent = "center";
    joyKnob.style.font = "1200 14px system-ui";
    joyKnob.textContent = "MOVE";

    const joyState = { active: false, id: -1, ax: 0, ay: 0 };

    function setJoy(ax, ay) {
      joyState.ax = ax;
      joyState.ay = ay;
      const maxR = 32;
      joyKnob.style.left = `calc(50% + ${ax * maxR}px)`;
      joyKnob.style.top = `calc(50% + ${ay * maxR}px)`;
    }

    function joyPosFromEvent(e) {
      const r = joy.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const maxR = 46;
      const len = Math.hypot(dx, dy) || 1;
      if (len > maxR) {
        dx = (dx / len) * maxR;
        dy = (dy / len) * maxR;
      }
      return { ax: dx / maxR, ay: dy / maxR };
    }

    joy.addEventListener("pointerdown", (e) => {
      joyState.active = true;
      joyState.id = e.pointerId;
      const p = joyPosFromEvent(e);
      setJoy(p.ax, p.ay);
      e.preventDefault();
    }, { passive: false });

    joy.addEventListener("pointermove", (e) => {
      if (!joyState.active || joyState.id !== e.pointerId) return;
      const p = joyPosFromEvent(e);
      setJoy(p.ax, p.ay);
      e.preventDefault();
    }, { passive: false });

    function endJoy(e) {
      if (joyState.id !== e.pointerId) return;
      joyState.active = false;
      joyState.id = -1;
      setJoy(0, 0);
      e.preventDefault();
    }
    joy.addEventListener("pointerup", endJoy, { passive: false });
    joy.addEventListener("pointercancel", endJoy, { passive: false });

    return {
      canvas, toast, coord, fps, fade,
      modal, modalTitle, modalBody, modalHint,
      inv, equip, joyState
    };
  }

  /* ----------------------- START ----------------------- */
  window.addEventListener("DOMContentLoaded", () => {
    const UI = ensureUI();
    const canvas = UI.canvas;
    const ctx = canvas.getContext("2d", { alpha: true });

    let W = 0, H = 0, DPR = 1;
    const VIEW = { zoom: 0.60, w: 0, h: 0 }; // 축소
    const WORLD = { w: 4200, h: 3000, margin: 140 };
    const cam = { x: 0, y: 0, targetX: 0, targetY: 0 };

    function screenToWorld(sx, sy) {
      return { x: sx + cam.x, y: sy + cam.y };
    }

    /* ----------------------- ASSET LOAD ----------------------- */
    const sprite = { img: null, loaded: false };
    if (SPRITE_SRC && USE_SPRITE_IF_LOADED) {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => { sprite.img = im; sprite.loaded = true; };
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

    function drawCustomWorldArt() {
      if (!(worldArt.baseLoaded || worldArt.topLoaded)) return false;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (worldArt.baseLoaded && worldArt.base) ctx.drawImage(worldArt.base, 0, 0, WORLD.w, WORLD.h);
      if (worldArt.topLoaded && worldArt.top) ctx.drawImage(worldArt.top, 0, 0, WORLD.w, WORLD.h);
      ctx.restore();
      return true;
    }

    /* ----------------------- PORTALS ----------------------- */
    const portals = [
      { key: "shooting", label: "SHOOTING", status: "open", url: "https://faglobalxgp2024-design.github.io/index.html/", x: 0, y: 0, w: 0, h: 0 },
      { key: "omok", label: "OMOK", status: "soon", url: "", x: 0, y: 0, w: 0, h: 0 },
      { key: "janggi", label: "JANGGI", status: "open", url: "https://faglobalxgp2024-design.github.io/MINIGAME/", x: 0, y: 0, w: 0, h: 0 },
      { key: "telegram", label: "TELEGRAM", status: "open", url: "https://t.me/faglobalgp", x: 0, y: 0, w: 0, h: 0 },
      { key: "wallet", label: "WALLET", status: "open", url: "https://faglobal.site/", x: 0, y: 0, w: 0, h: 0 },
      { key: "market", label: "MARKET", status: "open", url: "https://famarket.store/", x: 0, y: 0, w: 0, h: 0 },
      { key: "twitter", label: "TWITTER", status: "open", url: "https://x.com/FAGLOBAL_", x: 0, y: 0, w: 0, h: 0 },
      { key: "airplane", label: "AIRPLANE", status: "open", url: "https://faglobalxgp2024-design.github.io/-/", x: 0, y: 0, w: 0, h: 0 },
      { key: "archery", label: "ARCHERY", status: "open", url: "https://faglobalxgp2024-design.github.io/-/", x: 0, y: 0, w: 0, h: 0 }
    ];

    function findPortal(key) {
      return portals.find(p => p.key === key);
    }

    function setPortalRects() {
      const map = {
        shooting: { cx: WORLD.w * 0.065, cy: WORLD.h * 0.23, w: 330, h: 270 },
        omok:     { cx: WORLD.w * 0.205, cy: WORLD.h * 0.23, w: 330, h: 270 },
        janggi:   { cx: WORLD.w * 0.355, cy: WORLD.h * 0.18, w: 330, h: 280 },
        telegram: { cx: WORLD.w * 0.685, cy: WORLD.h * 0.18, w: 340, h: 280 },
        wallet:   { cx: WORLD.w * 0.515, cy: WORLD.h * 0.40, w: 340, h: 290 },
        market:   { cx: WORLD.w * 0.855, cy: WORLD.h * 0.40, w: 320, h: 260 },
        twitter:  { cx: WORLD.w * 0.805, cy: WORLD.h * 0.68, w: 360, h: 270 },
        airplane: { cx: WORLD.w * 0.355, cy: WORLD.h * 0.66, w: 320, h: 260 },
        archery:  { cx: WORLD.w * 0.155, cy: WORLD.h * 0.68, w: 340, h: 270 }
      };
      for (const p of portals) {
        const d = map[p.key];
        if (!d) continue;
        p.w = d.w;
        p.h = d.h;
        p.x = d.cx - p.w / 2;
        p.y = d.cy - p.h / 2;
      }
    }

    function portalEnterZone(p) {
      return {
        x: p.x + p.w * 0.14,
        y: p.y + p.h * 0.18,
        w: p.w * 0.72,
        h: p.h * 0.68
      };
    }

    function circleRectHit(cx, cy, cr, r) {
      const nx = clamp(cx, r.x, r.x + r.w);
      const ny = clamp(cy, r.y, r.y + r.h);
      const dx = cx - nx, dy = cy - ny;
      return dx * dx + dy * dy <= cr * cr;
    }

    /* ----------------------- PLAYER / EQUIP ----------------------- */
    const inventory = [
      { id: "sword_iron", name: "Iron Sword", slot: "weapon", icon: "🗡️" },
      { id: "shield_round", name: "Round Shield", slot: "shield", icon: "🛡️" },
      { id: "helm_red", name: "Red Helmet", slot: "helmet", icon: "⛑️" }
    ];

    const equipment = {
      weapon: null,
      shield: null,
      helmet: null
    };

    const player = {
      x: WORLD.w * 0.50,
      y: WORLD.h * 0.56,
      r: 18,
      speed: isTouchDevice() ? 168 : 238,
      moving: false,
      dir: "down",
      animT: 0,
      bobT: 0,
      walkCycle: 0
    };

    let inventoryOpen = false;
    let equipmentOpen = false;
    let activePortal = null;
    let entering = false;
    let dragging = false;
    let dragOffset = { x: 0, y: 0 };
    const keys = new Set();

    function updateDirFromDelta(dx, dy) {
      if (Math.abs(dx) > Math.abs(dy)) player.dir = dx >= 0 ? "right" : "left";
      else if (Math.abs(dy) > 0.001) player.dir = dy >= 0 ? "down" : "up";
    }

    function clampPlayerToWorld() {
      player.x = clamp(player.x, WORLD.margin, WORLD.w - WORLD.margin);
      player.y = clamp(player.y, WORLD.margin, WORLD.h - WORLD.margin);
    }
        /* ----------------------- UI RENDER ----------------------- */
    function renderInventoryPanels() {
      UI.inv.style.display = inventoryOpen ? "block" : "none";
      UI.equip.style.display = equipmentOpen ? "block" : "none";

      if (inventoryOpen) {
        UI.inv.innerHTML = `
          <div style="font:1000 18px system-ui;margin-bottom:10px;">INVENTORY (I)</div>
          <div style="display:grid;grid-template-columns:1fr;gap:8px;">
            ${inventory.map(item => {
              const equipped = equipment[item.slot]?.id === item.id;
              return `
                <button data-item="${item.id}" style="
                  text-align:left;padding:12px 14px;border-radius:14px;border:1px solid rgba(0,0,0,0.10);
                  background:${equipped ? "rgba(52,199,89,0.14)" : "rgba(255,255,255,0.96)"};
                  font:800 13px system-ui;cursor:pointer;">
                  <span style="font-size:18px;margin-right:8px;">${item.icon}</span>
                  ${item.name}
                  <span style="float:right;opacity:.7">${equipped ? "EQUIPPED" : item.slot.toUpperCase()}</span>
                </button>
              `;
            }).join("")}
          </div>
          <div style="margin-top:10px;font:700 12px system-ui;opacity:.7;">아이템 클릭 시 장착 / 해제</div>
        `;
      }

      if (equipmentOpen) {
        const slotCard = (slot, title, fallback) => {
          const item = equipment[slot];
          return `
            <div style="padding:12px;border-radius:14px;border:1px solid rgba(0,0,0,0.10);background:rgba(255,255,255,0.98);margin-bottom:8px;">
              <div style="font:900 12px system-ui;opacity:.65;margin-bottom:4px;">${title}</div>
              <div style="font:800 14px system-ui;">${item ? `${item.icon} ${item.name}` : fallback}</div>
            </div>
          `;
        };
        UI.equip.innerHTML = `
          <div style="font:1000 18px system-ui;margin-bottom:10px;">EQUIPMENT (TAB)</div>
          ${slotCard("weapon", "WEAPON", "비어있음")}
          ${slotCard("shield", "SHIELD", "비어있음")}
          ${slotCard("helmet", "HELMET", "비어있음")}
          <div style="margin-top:10px;font:700 12px system-ui;opacity:.7;">I 창에서 장착 가능</div>
        `;
      }

      UI.inv.querySelectorAll("[data-item]").forEach(btn => {
        btn.onclick = () => {
          const item = inventory.find(v => v.id === btn.dataset.item);
          if (!item) return;
          if (equipment[item.slot]?.id === item.id) equipment[item.slot] = null;
          else equipment[item.slot] = item;
          renderInventoryPanels();
        };
      });
    }

    /* ----------------------- INPUT ----------------------- */
    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();

      if (k === "tab") {
        e.preventDefault();
        equipmentOpen = !equipmentOpen;
        renderInventoryPanels();
        return;
      }

      if (k === "i") {
        inventoryOpen = !inventoryOpen;
        renderInventoryPanels();
        return;
      }

      keys.add(k);

      if (k === "e" || k === "enter") {
        if (modalState.open && modalState.portal) {
          confirmEnter(modalState.portal);
        } else if (activePortal) {
          openPortalUI(activePortal);
        }
      }

      if (k === "escape") {
        closeModal();
      }
    });

    window.addEventListener("keyup", (e) => {
      keys.delete(e.key.toLowerCase());
    });

    function getPointer(e) {
      const r = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) / VIEW.zoom,
        y: (e.clientY - r.top) / VIEW.zoom
      };
    }

    canvas.addEventListener("pointerdown", (e) => {
      if (isTouchDevice()) return;
      const p = getPointer(e);
      const w = screenToWorld(p.x, p.y);
      const dx = w.x - player.x;
      const dy = w.y - player.y;
      if (dx * dx + dy * dy <= (player.r + 28) * (player.r + 28)) {
        dragging = true;
        dragOffset.x = player.x - w.x;
        dragOffset.y = player.y - w.y;
      }
    });

    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const p = getPointer(e);
      const prevX = player.x;
      const prevY = player.y;
      const w = screenToWorld(p.x, p.y);
      player.x = w.x + dragOffset.x;
      player.y = w.y + dragOffset.y;
      clampPlayerToWorld();
      updateDirFromDelta(player.x - prevX, player.y - prevY);
      player.moving = true;
    });

    canvas.addEventListener("pointerup", () => {
      dragging = false;
    });

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

    /* ----------------------- MODAL ----------------------- */
    const modalState = { open: false, portal: null };

    function fadeTo(action, ms = 220) {
      UI.fade.style.opacity = "1";
      setTimeout(() => action(), ms * 0.55);
      setTimeout(() => { UI.fade.style.opacity = "0"; }, ms + 40);
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
        UI.toast.innerHTML = screenTextBox(`🧱 <b>${p.label}</b><br/>오픈 준비중입니다.`);
        setTimeout(() => {
          if (!modalState.open) UI.toast.hidden = true;
        }, 1500);
      }
    }

    function openPortalUI(p) {
      if (!p) return;
      modalState.open = true;
      modalState.portal = p;
      UI.modal.style.display = "flex";
      UI.modalTitle.innerHTML = screenTextBox(`🧱 <b>${p.label}</b>`, { bg: "rgba(255,255,255,0.96)" });
      UI.modalBody.innerHTML = screenTextBox(
        p.status === "open"
          ? `입장하시겠습니까?<br/><b>Enter</b> 또는 한번 더 터치`
          : `오픈 준비중입니다.`,
        { bg: "rgba(255,255,255,0.92)" }
      );
      UI.modalHint.innerHTML = screenTextBox(`닫기: <b>ESC</b>`, {
        bg: "rgba(255,255,255,0.80)"
      });
    }

    UI.modal.addEventListener("click", () => {
      if (!modalState.open) return;
      if (isTouchDevice() && modalState.portal) confirmEnter(modalState.portal);
      else closeModal();
    });

    /* ----------------------- UPDATE ----------------------- */
    let lastT = performance.now();
    let fpsAcc = 0;
    let fpsFrames = 0;

    function updateCamera(dt) {
      cam.targetX = clamp(player.x - VIEW.w * 0.5, 0, Math.max(0, WORLD.w - VIEW.w));
      cam.targetY = clamp(player.y - VIEW.h * 0.56, 0, Math.max(0, WORLD.h - VIEW.h));
      cam.x = lerp(cam.x, cam.targetX, Math.min(1, dt * 8.2));
      cam.y = lerp(cam.y, cam.targetY, Math.min(1, dt * 8.2));
    }

    function update(dt) {
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
          if (len > 1) {
            ax /= len;
            ay /= len;
          }
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
          player.walkCycle += dt * 10;
        }
      }

      activePortal = null;
      for (const p of portals) {
        const zone = portalEnterZone(p);
        if (circleRectHit(player.x, player.y, player.r + 18, zone)) {
          activePortal = p;
          break;
        }
      }

      if (!modalState.open && activePortal) {
        UI.toast.hidden = false;
        UI.toast.innerHTML = screenTextBox(
          `🧱 <b>${activePortal.label}</b><br/>입장하시겠습니까? <b>Enter</b> / <b>E</b>`,
          { bg: "rgba(255,255,255,0.92)" }
        );
      } else if (!modalState.open) {
        UI.toast.hidden = true;
      }

      updateCamera(dt);

      UI.coord.textContent = `x:${Math.round(player.x)} y:${Math.round(player.y)}`;

      fpsAcc += dt;
      fpsFrames++;
      if (fpsAcc >= 0.45) {
        UI.fps.textContent = `fps:${Math.round(fpsFrames / fpsAcc)}`;
        fpsAcc = 0;
        fpsFrames = 0;
      }
    }

    /* ----------------------- RENDER HELPERS ----------------------- */
    function drawPortalHotspots(t) {
      for (const p of portals) {
        const z = portalEnterZone(p);
        const near = activePortal && activePortal.key === p.key;
        if (!near) continue;

        ctx.save();
        ctx.globalAlpha = 0.12 + 0.06 * Math.sin(t * 6);
        ctx.fillStyle = "#7c4dff";
        roundRectPath(ctx, z.x, z.y, z.w, z.h, 18);
        ctx.fill();

        ctx.globalAlpha = 0.92;
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#7c4dff";
        roundRectPath(ctx, z.x, z.y, z.w, z.h, 18);
        ctx.stroke();

        ctx.fillStyle = "rgba(255,255,255,0.96)";
        ctx.font = "900 18px system-ui";
        ctx.textAlign = "center";
        ctx.fillText("ENTER", z.x + z.w / 2, z.y - 12);
        ctx.restore();
      }
    }

    function drawCharacterOverlays(x, y) {
      const baseY = y + 4;

      if (equipment.helmet) {
        ctx.save();
        ctx.fillStyle = "#d62828";
        roundRectPath(ctx, x - 12, baseY - 51, 24, 12, 6);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        roundRectPath(ctx, x - 8, baseY - 48, 16, 6, 4);
        ctx.fill();
        ctx.restore();
      }

      if (equipment.weapon) {
        ctx.save();
        const dirMul = player.dir === "left" ? -1 : 1;
        ctx.translate(x - 16 * dirMul, baseY - 8);
        ctx.rotate(dirMul * -0.8 + Math.sin(player.walkCycle) * 0.06);
        ctx.fillStyle = "#9ca3af";
        roundRectPath(ctx, -2, -20, 4, 26, 2);
        ctx.fill();
        ctx.fillStyle = "#c1121f";
        roundRectPath(ctx, -5, 5, 10, 4, 2);
        ctx.fill();
        ctx.restore();
      }

      if (equipment.shield) {
        ctx.save();
        const dirMul = player.dir === "left" ? -1 : 1;
        const sx = x + 18 * dirMul;
        const sy = baseY - 10;
        ctx.fillStyle = "#1f2937";
        ctx.beginPath();
        ctx.moveTo(sx - 8, sy - 8);
        ctx.lineTo(sx + 8, sy - 8);
        ctx.lineTo(sx + 10, sy + 4);
        ctx.lineTo(sx, sy + 14);
        ctx.lineTo(sx - 10, sy + 4);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#e63946";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }
    }

    function drawSpriteCharacter(x, y) {
      if (!sprite.loaded || !sprite.img) return false;

      const moving = player.moving;
      const bob = moving ? Math.sin(player.walkCycle) * 2.5 : 0;
      const sway = moving ? Math.sin(player.walkCycle) * 0.04 : 0;

      // 그림자
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "rgba(10,14,24,0.46)";
      ctx.beginPath();
      ctx.ellipse(x, y + 24, moving ? 18 : 20, moving ? 6 : 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 캐릭터
      ctx.save();
      ctx.translate(x, y + bob);
      if (player.dir === "left") ctx.scale(-1, 1);
      ctx.rotate(sway);
      ctx.imageSmoothingEnabled = false;
      ctx.imageSmoothingQuality = "low";

      const w = 84;
      const h = 102;
      ctx.drawImage(sprite.img, -w / 2, -78, w, h);

      ctx.restore();

      drawCharacterOverlays(x, y + bob);
      return true;
    }

    function drawFallbackCharacter(x, y) {
      const moving = player.moving;
      const bob = moving ? Math.sin(player.walkCycle) * 2.5 : 0;

      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "rgba(10,14,24,0.46)";
      ctx.beginPath();
      ctx.ellipse(x, y + 24, 20, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(x, y + bob);

      const leg = moving ? Math.sin(player.walkCycle) * 3 : 0;
      ctx.fillStyle = "#3b4251";
      roundRectPath(ctx, -10, -6 + leg * 0.2, 8, 24, 4); ctx.fill();
      roundRectPath(ctx, 2, -6 - leg * 0.2, 8, 24, 4); ctx.fill();

      ctx.fillStyle = "#d62828";
      roundRectPath(ctx, -16, -30, 32, 28, 8);
      ctx.fill();

      ctx.fillStyle = "#ffd7b5";
      roundRectPath(ctx, -12, -50, 24, 18, 8);
      ctx.fill();

      ctx.fillStyle = "#111827";
      roundRectPath(ctx, -14, -58, 28, 10, 6);
      ctx.fill();

      ctx.restore();
      drawCharacterOverlays(x, y + bob);
    }
        /* ----------------------- DRAW ----------------------- */
    function draw(t) {
      ctx.clearRect(0, 0, W, H);

      ctx.save();
      ctx.scale(VIEW.zoom, VIEW.zoom);
      ctx.translate(-cam.x, -cam.y);

      const usingCustom = drawCustomWorldArt();

      if (!usingCustom) {
        ctx.fillStyle = "#8fd694";
        ctx.fillRect(0, 0, WORLD.w, WORLD.h);
      }

      drawPortalHotspots(t);

      if (sprite.loaded) drawSpriteCharacter(player.x, player.y);
      else drawFallbackCharacter(player.x, player.y);

      ctx.restore();

      // title
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.font = "1000 34px system-ui";
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.strokeStyle = "rgba(10,14,24,0.18)";
      ctx.lineWidth = 6;
      ctx.strokeText("META WORLD", W * 0.5, 18);
      ctx.fillText("META WORLD", W * 0.5, 18);

      ctx.font = "800 13px system-ui";
      ctx.fillStyle = "rgba(10,14,24,0.66)";
      ctx.fillText("PORTAL WORLD · COMMUNITY · ADS", W * 0.5, 58);
      ctx.restore();

      // minimap
      drawMiniMap();

      // subtle vignette
      ctx.save();
      const vg = ctx.createRadialGradient(
        W * 0.5, H * 0.45, Math.min(W, H) * 0.25,
        W * 0.5, H * 0.5, Math.max(W, H) * 0.72
      );
      vg.addColorStop(0, "rgba(10,14,24,0.00)");
      vg.addColorStop(1, "rgba(10,14,24,0.05)");
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    function drawMiniMap() {
      const mw = 220, mh = 154;
      const x = W - mw - 18, y = 18;

      ctx.save();
      ctx.fillStyle = "rgba(255,255,255,0.86)";
      roundRectPath(ctx, x, y, mw, mh, 18);
      ctx.fill();

      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      roundRectPath(ctx, x, y, mw, mh, 18);
      ctx.stroke();

      const pad = 12;
      const sx = (mw - pad * 2) / WORLD.w;
      const sy = (mh - pad * 2) / WORLD.h;

      ctx.fillStyle = "rgba(130,214,130,0.28)";
      roundRectPath(ctx, x + pad, y + pad, mw - pad * 2, mh - pad * 2, 8);
      ctx.fill();

      for (const p of portals) {
        ctx.fillStyle = "rgba(255,255,255,0.96)";
        ctx.beginPath();
        ctx.arc(x + pad + (p.x + p.w * 0.5) * sx, y + pad + (p.y + p.h * 0.5) * sy, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = "#111827";
      ctx.beginPath();
      ctx.arc(x + pad + player.x * sx, y + pad + player.y * sy, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = "800 11px system-ui";
      ctx.fillStyle = "rgba(10,14,24,0.74)";
      ctx.fillText("MINIMAP", x + 14, y + 16);
      ctx.restore();
    }

    /* ----------------------- LOOP ----------------------- */
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

      VIEW.zoom = Math.min(0.74, Math.max(0.56, Math.min(W / 1800, H / 1200) * 0.88));
      VIEW.w = W / VIEW.zoom;
      VIEW.h = H / VIEW.zoom;

      WORLD.w = Math.max(4200, Math.floor(W * 3.6));
      WORLD.h = Math.max(3000, Math.floor(H * 3.1));

      setPortalRects();
      renderInventoryPanels();

      player.x = clamp(player.x, WORLD.margin, WORLD.w - WORLD.margin);
      player.y = clamp(player.y, WORLD.margin, WORLD.h - WORLD.margin);
    }

    window.addEventListener("resize", resize, { passive: true });

    function loop(now) {
      const dt = Math.min(0.033, (now - lastT) / 1000);
      lastT = now;

      update(dt);
      draw(now / 1000);

      requestAnimationFrame(loop);
    }

    renderInventoryPanels();
    resize();
    requestAnimationFrame(loop);
  });
})();
