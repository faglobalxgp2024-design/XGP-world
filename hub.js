/* HUN.JS - LEGO PREMIUM (single-file) v2.7
 * 적용:
 * 1) 모바일 조이스틱: 오른쪽으로 이동 + 살짝 크게
 * 2) 캐릭터 디테일 유지 + 장착/해제 가능한 장비 시스템 추가
 * 3) 존 입구: 고급스러운 “게이트/입구” 유지
 * 4) 도로: 존 바깥 정렬 + 도로 끊김 방지 + 차량 도로 전용 이동
 * 5) 가로등: 도로 따라 규칙 배치 유지
 * 6) 배경/월드 스케일 축소 + 포탈/상점 위치 보정
 * 7) 캐릭터 공중 부양 감소 + 걷는 모션 강화
 * 8) I = 인벤토리 / TAB = 장착창
 * 9) 모자/옷/무기 장착/해제 + 장착 이펙트
 * 10) NPC는 하늘 영역 제외, 마을 구역 안에서만 이동
 *
 * 사용법: 이 파일 전체를 hub.js에 그대로 붙여넣기
 */
(() => {
  "use strict";

  /* ----------------------- CONFIG ----------------------- */
  const SPRITE_SRC = "https://raw.githubusercontent.com/faglobalxgp2024-design/XGP-world/main/%EC%BA%90%EB%A6%AD%ED%84%B0%20%EC%9D%B4%EB%AF%B8%EC%A7%80.png";
  const WORLD_ART_BASE_SRC = "https://raw.githubusercontent.com/faglobalxgp2024-design/XGP-world/main/%EB%A7%B5-%EB%B0%94%ED%83%95.png";
  const WORLD_ART_SRC = "https://raw.githubusercontent.com/faglobalxgp2024-design/XGP-world/main/%EB%A9%94%ED%83%80%EC%9B%94%EB%93%9C.png";
  const USE_CUSTOM_WORLD_ART = true;
  const USE_SPRITE_IF_LOADED = true;

  const WORLD_SCALE = 0.84;
  const BUILDING_SCALE = 0.82;
  const SKY_BAND_RATIO = 0.18;

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

  function ensureEl(id, tag, parent = document.body) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement(tag);
      el.id = id;
      parent.appendChild(el);
    }
    return el;
  }

  function px(v) { return `${v}px`; }

  function slotKor(slot) {
    if (slot === "hat") return "모자";
    if (slot === "armor") return "옷";
    if (slot === "weapon") return "무기";
    return slot;
  }

  /* ----------------------- Equipment ----------------------- */
  const INVENTORY_ITEMS = [
    { id: "hat_red", slot: "hat", name: "Crimson Helm", color: "#dc2626", accent: "#111827", icon: "⛑" },
    { id: "hat_blue", slot: "hat", name: "Azure Cap", color: "#0a84ff", accent: "#ffffff", icon: "🧢" },
    { id: "armor_blackred", slot: "armor", name: "Black Red Armor", color: "#111827", accent: "#dc2626", icon: "🦺" },
    { id: "armor_gold", slot: "armor", name: "Gold Armor", color: "#7c5a10", accent: "#ffd166", icon: "🥋" },
    { id: "weapon_sword", slot: "weapon", name: "Hero Sword", color: "#9ca3af", accent: "#dc2626", icon: "🗡" },
    { id: "weapon_lance", slot: "weapon", name: "Royal Lance", color: "#d1d5db", accent: "#0a84ff", icon: "⚔" }
  ];

  const equipment = {
    hat: "hat_red",
    armor: "armor_blackred",
    weapon: "weapon_sword"
  };

  const equipFx = [];
  function getItemById(id) {
    return INVENTORY_ITEMS.find(v => v.id === id) || null;
  }

  function spawnEquipFx(x, y, baseColor = "#ffffff") {
    const rng = mulberry32(((x * 1000) ^ (y * 1000) ^ Date.now()) >>> 0);
    for (let i = 0; i < 26; i++) {
      equipFx.push({
        x,
        y: y - 40,
        vx: (rng() - 0.5) * 140,
        vy: -40 - rng() * 120,
        life: 0.75 + rng() * 0.25,
        age: 0,
        r: 3 + rng() * 4,
        color: baseColor
      });
    }
  }

  function updateEquipFx(dt) {
    for (let i = equipFx.length - 1; i >= 0; i--) {
      const p = equipFx[i];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 220 * dt;
      if (p.age >= p.life) equipFx.splice(i, 1);
    }
  }

  function drawEquipFx(ctx) {
    ctx.save();
    for (const p of equipFx) {
      const t = 1 - p.age / p.life;
      ctx.globalAlpha = 0.85 * t;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.4);
      g.addColorStop(0, p.color);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ----------------------- Safe DOM / UI ----------------------- */
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

    const inv = ensureEl("inventory_panel", "div");
    const equip = ensureEl("equipment_panel", "div");
    const mobileBtns = ensureEl("mobile_ui_btns", "div");
    const invBtn = ensureEl("mobile_inv_btn", "button", mobileBtns);
    const equipBtn = ensureEl("mobile_equip_btn", "button", mobileBtns);

    inv.style.position = "fixed";
    inv.style.right = "18px";
    inv.style.top = "110px";
    inv.style.width = "320px";
    inv.style.maxHeight = "calc(100vh - 140px)";
    inv.style.overflow = "auto";
    inv.style.zIndex = "10002";
    inv.style.padding = "14px";
    inv.style.borderRadius = "18px";
    inv.style.background = "rgba(255,255,255,0.84)";
    inv.style.backdropFilter = "blur(10px)";
    inv.style.border = "1px solid rgba(0,0,0,0.08)";
    inv.style.boxShadow = "0 20px 50px rgba(0,0,0,0.16)";
    inv.style.display = "none";

    equip.style.position = "fixed";
    equip.style.right = "354px";
    equip.style.top = "110px";
    equip.style.width = "300px";
    equip.style.maxHeight = "calc(100vh - 140px)";
    equip.style.overflow = "auto";
    equip.style.zIndex = "10002";
    equip.style.padding = "14px";
    equip.style.borderRadius = "18px";
    equip.style.background = "rgba(255,255,255,0.84)";
    equip.style.backdropFilter = "blur(10px)";
    equip.style.border = "1px solid rgba(0,0,0,0.08)";
    equip.style.boxShadow = "0 20px 50px rgba(0,0,0,0.16)";
    equip.style.display = "none";

    mobileBtns.style.position = "fixed";
    mobileBtns.style.left = "18px";
    mobileBtns.style.bottom = "208px";
    mobileBtns.style.zIndex = "10003";
    mobileBtns.style.display = isTouchDevice() ? "flex" : "none";
    mobileBtns.style.flexDirection = "column";
    mobileBtns.style.gap = "10px";

    [invBtn, equipBtn].forEach(btn => {
      btn.style.width = "86px";
      btn.style.height = "46px";
      btn.style.border = "none";
      btn.style.borderRadius = "14px";
      btn.style.background = "rgba(255,255,255,0.88)";
      btn.style.boxShadow = "0 14px 36px rgba(0,0,0,0.16)";
      btn.style.font = "1000 13px system-ui";
      btn.style.color = "#111827";
      btn.style.backdropFilter = "blur(10px)";
    });
    invBtn.textContent = "INV";
    equipBtn.textContent = "EQUIP";

    const style = ensureEl("lego_style_injected", "style", document.head);
    style.textContent = `
      #fade.on { opacity: 1; }
      #lego_modal { animation: legoPop 160ms ease both; }
      @keyframes legoPop { from{opacity:0; transform: translateY(8px);} to{opacity:1; transform: translateY(0);} }
      * { -webkit-tap-highlight-color: transparent; }
      #inventory_panel::-webkit-scrollbar, #equipment_panel::-webkit-scrollbar { width: 10px; }
      #inventory_panel::-webkit-scrollbar-thumb, #equipment_panel::-webkit-scrollbar-thumb {
        background: rgba(0,0,0,0.18); border-radius: 999px;
      }
      .lego-panel-title {
        font: 1000 16px system-ui;
        color: rgba(10,14,24,0.92);
        margin-bottom: 10px;
        letter-spacing: .2px;
      }
      .lego-item-card {
        display:flex; align-items:center; justify-content:space-between;
        gap:10px; padding:10px 12px; margin-bottom:10px;
        border-radius:14px; background:rgba(255,255,255,0.9);
        border:1px solid rgba(0,0,0,0.08); box-shadow:0 10px 24px rgba(0,0,0,0.06);
      }
      .lego-item-left { display:flex; align-items:center; gap:10px; min-width:0; }
      .lego-icon {
        width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center;
        font-size:20px; color:#111827; box-shadow:inset 0 1px 0 rgba(255,255,255,.75);
      }
      .lego-item-name { font: 900 13px system-ui; color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .lego-item-slot { font: 800 11px system-ui; color:rgba(17,24,39,.62); margin-top:2px; }
      .lego-btn {
        border:none; border-radius:12px; padding:9px 12px;
        font: 900 12px system-ui; color:#fff; cursor:pointer;
        box-shadow:0 10px 22px rgba(0,0,0,.14);
      }
      .lego-btn-equip { background:#0a84ff; }
      .lego-btn-unequip { background:#dc2626; }
      .lego-slot-box {
        padding:12px; border-radius:14px; margin-bottom:10px;
        background:rgba(255,255,255,.92); border:1px solid rgba(0,0,0,.08);
        box-shadow:0 10px 24px rgba(0,0,0,.06);
      }
      .lego-slot-label { font: 1000 12px system-ui; color:#111827; margin-bottom:8px; }
      .lego-slot-empty { font: 800 12px system-ui; color:rgba(17,24,39,.45); }
      @media (max-width: 1100px) {
        #equipment_panel { right: 18px; top: 110px; width: 300px; }
        #inventory_panel { right: 18px; top: 430px; width: 300px; max-height: calc(100vh - 460px); }
      }
    `;

    const JOY_SIZE = 168;
    const JOY_KNOB = 72;
    const JOY_RING = 136;

    const joy = ensureEl("joystick", "div");
    joy.style.position = "fixed";
    joy.style.right = "18px";
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
      const max = 52;
      const pxv = ax * max;
      const pyv = ay * max;
      joyKnob.style.transform = `translate(calc(-50% + ${pxv}px), calc(-50% + ${pyv}px))`;
      joyBase.style.background = joyState.active ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.72)";
    }

    function joyPointerDown(e) {
      e.preventDefault();
      joyState.active = true;
      joyState.id = e.pointerId;
      try { joy.setPointerCapture(e.pointerId); } catch (_) {}
      joyPointerMove(e);
    }

    function joyPointerMove(e) {
      if (!joyState.active || e.pointerId !== joyState.id) return;
      const r = joy.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
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
      try { joy.releasePointerCapture(e.pointerId); } catch (_) {}
    }

    joy.addEventListener("pointerdown", joyPointerDown, { passive: false });
    joy.addEventListener("pointermove", joyPointerMove, { passive: false });
    joy.addEventListener("pointerup", joyPointerUp, { passive: false });
    joy.addEventListener("pointercancel", joyPointerUp, { passive: false });

    return {
      canvas, toast, coord, fps, fade, modal, modalTitle, modalBody, modalHint,
      joyState, inventoryPanel: inv, equipmentPanel: equip, mobileInvBtn: invBtn, mobileEquipBtn: equipBtn
    };
  }

  /* ----------------------- Start ----------------------- */
  window.addEventListener("DOMContentLoaded", () => {
    const UI = ensureUI();
    const canvas = UI.canvas;
    const ctx = canvas.getContext("2d", { alpha: true });

    let W = 0, H = 0, DPR = 1;
    const VIEW = { zoom: 0.90, w: 0, h: 0 };
    const WORLD = { w: 3000, h: 1900, margin: 150 };
    const TOWN = { x: 0, y: 0, w: 0, h: 0 };
    const cam = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const artBounds = { x: 0, y: 0, w: 0, h: 0 };

    function screenToWorld(sx, sy) {
      return { x: sx + cam.x, y: sy + cam.y };
    }

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
      im.onerror = () => {
        sprite.loaded = false;
        sprite.img = null;
      };
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

    function computeArtBounds() {
      const img = worldArt.topLoaded ? worldArt.top : (worldArt.baseLoaded ? worldArt.base : null);
      if (!img) {
        artBounds.x = 0;
        artBounds.y = 0;
        artBounds.w = WORLD.w;
        artBounds.h = WORLD.h;
        return;
      }
      const iw = img.naturalWidth || WORLD.w;
      const ih = img.naturalHeight || WORLD.h;
      const scale = Math.min(WORLD.w / iw, WORLD.h / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      artBounds.w = dw;
      artBounds.h = dh;
      artBounds.x = (WORLD.w - dw) * 0.5;
      artBounds.y = Math.max(0, (WORLD.h - dh) * 0.5);
    }

    function drawCustomWorldArt() {
      if (!hasCustomWorldArt()) return false;
      computeArtBounds();
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      if (worldArt.baseLoaded && worldArt.base) {
        ctx.drawImage(worldArt.base, artBounds.x, artBounds.y, artBounds.w, artBounds.h);
      }
      if (worldArt.topLoaded && worldArt.top) {
        ctx.drawImage(worldArt.top, artBounds.x, artBounds.y, artBounds.w, artBounds.h);
      }
      ctx.restore();
      return true;
    }
        /* ----------------------- Roaming NPCs ----------------------- */
    function seedRoamers(rng) {
      roamers.length = 0;
      const N = 18;

      function okPos(x, y) {
        if (!inTownPlayable(x, y)) return false;
        if (isOnRoadLike(x, y)) return false;
        if (isInsideBuildingBuffer(x, y)) return false;
        if (isInsideZonesBuffer(x, y)) return false;
        return true;
      }

      for (let i = 0; i < N; i++) {
        let x = 0, y = 0;
        for (let t = 0; t < 240; t++) {
          x = TOWN.x + 60 + rng() * (TOWN.w - 120);
          y = TOWN.y + TOWN.h * 0.20 + 30 + rng() * (TOWN.h * 0.74 - 60);
          if (okPos(x, y)) break;
        }
        roamers.push({
          kind: "roamer",
          x, y, r: 16,
          speed: 88 + rng() * 42,
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
            nx = clamp(n.x + (rng() - 0.5) * 460, TOWN.x + 40, TOWN.x + TOWN.w - 40);
            ny = clamp(n.y + (rng() - 0.5) * 360, TOWN.y + TOWN.h * 0.20 + 20, TOWN.y + TOWN.h - 40);
            if (!isOnRoadLike(nx, ny) && !isInsideBuildingBuffer(nx, ny) && !isInsideZonesBuffer(nx, ny) && inTownPlayable(nx, ny)) break;
          }
          n.tx = nx;
          n.ty = ny;
        }

        const dx = n.tx - n.x;
        const dy = n.ty - n.y;
        const len = Math.hypot(dx, dy) || 1;
        n.x += (dx / len) * n.speed * dt;
        n.y += (dy / len) * n.speed * dt;

        if (Math.abs(dy) >= Math.abs(dx)) n.dir = dy < 0 ? "up" : "down";
        else n.dir = dx < 0 ? "left" : "right";

        n.x = clamp(n.x, TOWN.x + 40, TOWN.x + TOWN.w - 40);
        n.y = clamp(n.y, TOWN.y + TOWN.h * 0.20 + 20, TOWN.y + TOWN.h - 40);
      }
      return palette;
    }

    /* ----------------------- Ground patches ----------------------- */
    let groundPatches = [];
    function buildGroundPatches(rng) {
      groundPatches = [];
      for (let i = 0; i < 22; i++) {
        groundPatches.push({
          x: TOWN.x + TOWN.w * 0.08 + rng() * TOWN.w * 0.84,
          y: TOWN.y + TOWN.h * 0.24 + rng() * TOWN.h * 0.66,
          rx: 70 + rng() * 180,
          ry: 20 + rng() * 62,
          rot: (rng() - 0.5) * 0.7,
          a: 0.20 + rng() * 0.12
        });
      }
    }

    /* ----------------------- Footprints ----------------------- */
    const footprints = [];
    let footStepAcc = 0;
    function addFootprint(dt, rng) {
      if (!player.moving) {
        footStepAcc = 0;
        return;
      }
      footStepAcc += dt * (player.speed / 220);
      if (footStepAcc < 0.10) return;
      footStepAcc = 0;

      let ox = 0, oy = 0;
      if (player.dir === "up") oy = 7;
      else if (player.dir === "down") oy = -4;
      else if (player.dir === "left") ox = 8;
      else if (player.dir === "right") ox = -8;

      const side = Math.sin(player.walkCycle * 12) > 0 ? 1 : -1;
      footprints.push({
        x: player.x + ox + side * 5 + (rng() - 0.5) * 1.5,
        y: player.y + 26 + oy + (rng() - 0.5) * 1.5,
        life: 0.95,
        age: 0
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
      c.width = w;
      c.height = h;
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

    /* ----------------------- World layout ----------------------- */
    function layoutRoadNetwork() {
      roads.length = 0;
      sidewalks.length = 0;
      crossings.length = 0;
      signals.length = 0;
      let id = 0;

      const zonePad = 60;
      const zoneBlocks = [
        { x: ZONES.game.x - zonePad, y: ZONES.game.y - zonePad, w: ZONES.game.w + zonePad * 2, h: ZONES.game.h + zonePad * 2 },
        { x: ZONES.community.x - zonePad, y: ZONES.community.y - zonePad, w: ZONES.community.w + zonePad * 2, h: ZONES.community.h + zonePad * 2 },
        { x: ZONES.ads.x - zonePad, y: ZONES.ads.y - zonePad, w: ZONES.ads.w + zonePad * 2, h: ZONES.ads.h + zonePad * 2 }
      ];

      const addRoadH = (y, x0, x1, h = 124) => {
        const r = { _id: id++, axis: "h", x: x0, y, w: (x1 - x0), h };
        roads.push(r);
        sidewalks.push({ x: r.x, y: r.y - 44, w: r.w, h: 34 });
        sidewalks.push({ x: r.x, y: r.y + r.h + 10, w: r.w, h: 34 });
        return r;
      };

      const addRoadV = (x, y0, y1, w = 116) => {
        const r = { _id: id++, axis: "v", x, y: y0, w, h: (y1 - y0) };
        roads.push(r);
        sidewalks.push({ x: r.x - 42, y: r.y, w: 30, h: r.h });
        sidewalks.push({ x: r.x + r.w + 12, y: r.y, w: 30, h: r.h });
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
        return segs.filter(s => (s.b - s.a) > 240).sort((p, q) => p.a - q.a);
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
        return segs.filter(s => (s.b - s.a) > 240).sort((p, q) => p.a - q.a);
      }

      const L = TOWN.x + 30;
      const R = TOWN.x + TOWN.w - 30;
      const T = TOWN.y + TOWN.h * 0.18;
      const B = TOWN.y + TOWN.h - 34;

      addRoadH(T, L, R, 120);
      addRoadH(B - 120, L, R, 120);
      addRoadV(L, T, B, 112);
      addRoadV(R - 112, T, B, 112);

      const midY1 = TOWN.y + TOWN.h * 0.51;
      const midY2 = TOWN.y + TOWN.h * 0.80;
      const leftX = TOWN.x + TOWN.w * 0.18;
      const midX = TOWN.x + TOWN.w * 0.50;
      const rightX = TOWN.x + TOWN.w * 0.82;

      for (const s of splitRangeByBlocksH(midY1, L - 10, R + 10, 124)) addRoadH(midY1, s.a, s.b, 124);
      for (const s of splitRangeByBlocksH(midY2, L - 10, R + 10, 124)) addRoadH(midY2, s.a, s.b, 124);
      for (const s of splitRangeByBlocksV(leftX, T - 10, B + 10, 112)) addRoadV(leftX, s.a, s.b, 112);
      for (const s of splitRangeByBlocksV(midX, T - 10, B + 10, 112)) addRoadV(midX, s.a, s.b, 112);
      for (const s of splitRangeByBlocksV(rightX, T - 10, B + 10, 112)) addRoadV(rightX, s.a, s.b, 112);

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
      VIEW.zoom = Math.min(1.05, Math.max(0.82, Math.min(W / 1280, H / 860) * 0.98));
      VIEW.w = W / VIEW.zoom;
      VIEW.h = H / VIEW.zoom;

      WORLD.w = Math.max(3000, Math.floor(W * 3.6 * WORLD_SCALE));
      WORLD.h = Math.max(1900, Math.floor(H * 2.8 * WORLD_SCALE));

      TOWN.x = 0;
      TOWN.y = 0;
      TOWN.w = WORLD.w;
      TOWN.h = WORLD.h;

      computeArtBounds();

      const ref = hasCustomWorldArt() ? artBounds : { x: 0, y: 0, w: WORLD.w, h: WORLD.h };
      const safeTop = ref.y + ref.h * SKY_BAND_RATIO;

      ZONES = {
        game: {
          x: ref.x + ref.w * 0.08,
          y: safeTop + ref.h * 0.05,
          w: ref.w * 0.34,
          h: ref.h * 0.28,
          label: "GAME ZONE",
          color: "#0a84ff",
          entrance: null
        },
        community: {
          x: ref.x + ref.w * 0.58,
          y: safeTop + ref.h * 0.05,
          w: ref.w * 0.30,
          h: ref.h * 0.28,
          label: "COMMUNITY ZONE",
          color: "#34c759",
          entrance: null
        },
        ads: {
          x: ref.x + ref.w * 0.34,
          y: ref.y + ref.h * 0.60,
          w: ref.w * 0.30,
          h: ref.h * 0.18,
          label: "AD ZONE",
          color: "#ff2d55",
          entrance: null
        }
      };

      function setEntrance(z) {
        const gateW = 220, gateH = 74;
        z.entrance = {
          x: z.x + z.w * 0.5 - gateW * 0.5,
          y: z.y + z.h - gateH * 0.50,
          w: gateW,
          h: gateH
        };
      }
      setEntrance(ZONES.game);
      setEntrance(ZONES.community);
      setEntrance(ZONES.ads);

      const base = 220 * BUILDING_SCALE;
      const mul = { S: 0.82, M: 1.0, L: 1.22 };
      for (const p of portals) {
        const m = mul[p.size] || 1;
        p.w = base * 1.22 * m;
        p.h = base * 0.92 * m;
      }

      buildPatterns(mulberry32(seedFromWorld(WORLD.w, WORLD.h)));
      layoutRoadNetwork();
            const desired = {
        jump:     { x: ZONES.game.x + ZONES.game.w * 0.18, y: ZONES.game.y + ZONES.game.h * 0.30 },
        archery:  { x: ZONES.game.x + ZONES.game.w * 0.50, y: ZONES.game.y + ZONES.game.h * 0.30 },
        omok:     { x: ZONES.game.x + ZONES.game.w * 0.82, y: ZONES.game.y + ZONES.game.h * 0.30 },
        avoid:    { x: ZONES.game.x + ZONES.game.w * 0.18, y: ZONES.game.y + ZONES.game.h * 0.74 },
        janggi:   { x: ZONES.game.x + ZONES.game.w * 0.50, y: ZONES.game.y + ZONES.game.h * 0.74 },
        snow:     { x: ZONES.game.x + ZONES.game.w * 0.82, y: ZONES.game.y + ZONES.game.h * 0.74 },

        twitter:  { x: ZONES.community.x + ZONES.community.w * 0.24, y: ZONES.community.y + ZONES.community.h * 0.34 },
        telegram: { x: ZONES.community.x + ZONES.community.w * 0.74, y: ZONES.community.y + ZONES.community.h * 0.34 },
        wallet:   { x: ZONES.community.x + ZONES.community.w * 0.24, y: ZONES.community.y + ZONES.community.h * 0.76 },
        market:   { x: ZONES.community.x + ZONES.community.w * 0.74, y: ZONES.community.y + ZONES.community.h * 0.76 },
        support:  { x: ZONES.community.x + ZONES.community.w * 0.50, y: ZONES.community.y + ZONES.community.h * 0.56 },

        mcd:      { x: ZONES.ads.x + ZONES.ads.w * 0.28, y: ZONES.ads.y + ZONES.ads.h * 0.36 },
        bbq:      { x: ZONES.ads.x + ZONES.ads.w * 0.72, y: ZONES.ads.y + ZONES.ads.h * 0.36 },
        baskin:   { x: ZONES.ads.x + ZONES.ads.w * 0.28, y: ZONES.ads.y + ZONES.ads.h * 0.76 },
        paris:    { x: ZONES.ads.x + ZONES.ads.w * 0.72, y: ZONES.ads.y + ZONES.ads.h * 0.76 }
      };

      function clampIntoZone(p, z, d) {
        const pad = 14;
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

      player.x = clamp(player.x, TOWN.x + 100, TOWN.x + TOWN.w - 100);
      player.y = clamp(player.y, TOWN.y + TOWN.h * 0.24, TOWN.y + TOWN.h - 100);
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

    function updateDirFromDelta(dx, dy) {
      if (Math.abs(dx) > Math.abs(dy)) player.dir = dx >= 0 ? "right" : "left";
      else if (Math.abs(dy) > 0.001) player.dir = dy >= 0 ? "down" : "up";
    }

    function portalEnterZone(p) {
      return { x: p.x + p.w * 0.18, y: p.y + p.h * 0.56, w: p.w * 0.64, h: p.h * 0.30 };
    }

    function circleRectHit(cx, cy, cr, r) {
      const nx = clamp(cx, r.x, r.x + r.w);
      const ny = clamp(cy, r.y, r.y + r.h);
      const dx = cx - nx, dy = cy - ny;
      return dx * dx + dy * dy <= cr * cr;
    }

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
        ctx.ellipse(fp.x, fp.y, 5.4, 2.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

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
        ctx.ellipse(cx, cy + 30, 66, 26, 0, 0, Math.PI * 2);
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
        paris:  { wall: "#e0d0b8", frame: "#6a503a", knob: "#fff",    grass: "#6ad87d", sign: "#2563eb", glassA: "#c6e9ff", glassB: "#f3fcff", accent: "#93c5fd" }
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

      drawLegoBrickGrid(x, y + 20, w, h - 20);

      ctx.save();
      ctx.fillStyle = shade(c.wall, -10);
      roundRect(x + 10, y, w - 20, 34, 16);
      ctx.fill();
      drawLegoStudRow(x + 34, y + 10, w - 68, Math.max(4, Math.floor((w - 68) / 44)), shade(c.wall, -12));
      ctx.restore();

      const signH = Math.max(50, h * 0.20);
      drawLegoSignPlaque(x + w * 0.10, y + 34, w * 0.80, signH, p.label, Math.max(18, Math.floor(signH * 0.34)), c.sign);

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

      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = c.grass;
      roundRect(x + 14, y + h - 18, w - 28, 12, 8);
      ctx.fill();
      ctx.restore();

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

    function drawEquipmentOverlay(x, y) {
      const hat = getItemById(equipment.hat);
      const armor = getItemById(equipment.armor);
      const weapon = getItemById(equipment.weapon);
      const sway = player.moving ? Math.sin(player.walkCycle * 12) * 2.2 : 0;

      ctx.save();
      ctx.translate(x, y);

      if (player.dir === "left") ctx.scale(-1, 1);

      if (armor) {
        ctx.fillStyle = armor.color;
        roundRect(-18, -40, 36, 22, 8);
        ctx.fill();
        ctx.strokeStyle = armor.accent;
        ctx.lineWidth = 2;
        roundRect(-14, -36, 28, 14, 6);
        ctx.stroke();
        ctx.globalAlpha = 0.20;
        ctx.fillStyle = "#fff";
        roundRect(-12, -36, 24, 6, 4);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (hat) {
        ctx.fillStyle = hat.color;
        roundRect(-15, -68, 30, 12, 8);
        ctx.fill();
        ctx.fillStyle = hat.accent;
        roundRect(-11, -65, 22, 7, 5);
        ctx.fill();
      }

      if (weapon) {
        ctx.save();
        ctx.translate(-28, -20 + sway * 0.4);
        ctx.rotate(-0.72 + sway * 0.03);
        ctx.fillStyle = weapon.color;
        roundRect(-2, -18, 4, 32, 2);
        ctx.fill();
        ctx.fillStyle = weapon.accent;
        roundRect(-5, 11, 10, 4, 2);
        ctx.fill();
        ctx.globalAlpha = 0.24;
        const g = ctx.createLinearGradient(0, -22, 0, 10);
        g.addColorStop(0, "rgba(255,255,255,0.80)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(0, -32);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      ctx.restore();
    }

    function drawSpriteCharacter(x, y) {
      if (!sprite.loaded || !sprite.img) return false;

      const step = player.moving ? Math.sin(player.walkCycle * 12) : 0;
      const bob = player.moving ? Math.abs(Math.sin(player.walkCycle * 6)) * 2.5 : 0;
      const tilt = player.moving ? Math.sin(player.walkCycle * 12) * 0.018 : 0;

      const drawW = 86;
      const drawH = 104;
      const footY = y + 23;
      const imgY = footY - drawH + 6 - bob;

      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = "rgba(10,14,24,0.42)";
      ctx.beginPath();
      ctx.ellipse(x, y + 24, 20 + Math.abs(step) * 2, 7 - Math.abs(step) * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(x, imgY + drawH * 0.5);
      if (player.dir === "left") ctx.scale(-1, 1);
      ctx.rotate(tilt);
      const sx = player.moving ? 1.0 + Math.abs(step) * 0.02 : 1;
      const sy = player.moving ? 1.0 - Math.abs(step) * 0.03 : 1;
      ctx.scale(sx, sy);
      ctx.imageSmoothingEnabled = false;
      ctx.imageSmoothingQuality = "low";
      ctx.drawImage(sprite.img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      if (player.moving) {
        ctx.save();
        ctx.globalAlpha = 0.14;
        ctx.strokeStyle = "rgba(255,255,255,0.75)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 8, y + 8);
        ctx.lineTo(x - 14, y + 18 + step * 0.8);
        ctx.moveTo(x + 8, y + 8);
        ctx.lineTo(x + 14, y + 18 - step * 0.8);
        ctx.stroke();
        ctx.restore();
      }

      drawEquipmentOverlay(x, y - 2);
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
      const walk = isHero ? player.walkCycle : 0;
      const bob = isHero && player.moving ? Math.abs(Math.sin(walk * 6)) * 1.8 : 0;
      const armSwing = isHero && player.moving ? Math.sin(walk * 12) * 0.45 : 0;
      const legSwing = isHero && player.moving ? Math.sin(walk * 12 + Math.PI) * 0.36 : 0;

      ctx.save();
      ctx.translate(x, y + bob);
      if (dir === "left") ctx.scale(-1, 1);

      ctx.globalAlpha = 0.24;
      ctx.fillStyle = "rgba(10,14,24,0.42)";
      ctx.beginPath();
      ctx.ellipse(0, 30, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.save();
      ctx.translate(0, 14);
      ctx.rotate(legSwing * 0.18);
      ctx.fillStyle = pal.pants;
      roundRect(-13, 0, 10, 22, 4);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(0, 14);
      ctx.rotate(-legSwing * 0.18);
      ctx.fillStyle = pal.pants;
      roundRect(3, 0, 10, 22, 4);
      ctx.fill();
      ctx.restore();

      const armorItem = isHero ? getItemById(equipment.armor) : null;
      const hatItem = isHero ? getItemById(equipment.hat) : null;
      const weaponItem = isHero ? getItemById(equipment.weapon) : null;

      const torsoColor = armorItem ? armorItem.color : pal.torso;
      const torsoGrad = ctx.createLinearGradient(0, -20, 0, 12);
      torsoGrad.addColorStop(0, shade(torsoColor, 12));
      torsoGrad.addColorStop(1, shade(torsoColor, -10));
      ctx.fillStyle = torsoGrad;
      roundRect(-18, -14, 36, 30, 8);
      ctx.fill();

      ctx.globalAlpha = 0.10;
      ctx.fillStyle = "#fff";
      roundRect(-14, -10, 28, 8, 6);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (isHero) {
        ctx.fillStyle = "rgba(255,255,255,0.14)";
        roundRect(-11, -7, 22, 14, 6);
        ctx.fill();
        ctx.strokeStyle = armorItem ? armorItem.accent : "rgba(220,38,38,0.65)";
        ctx.lineWidth = 2;
        roundRect(-9, -5, 18, 10, 5);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(-18, -4);
      ctx.rotate(-0.35 + armSwing * 0.6);
      ctx.fillStyle = torsoColor;
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
      ctx.rotate(0.35 - armSwing * 0.6);
      ctx.fillStyle = torsoColor;
      roundRect(-4, 0, 8, 22, 4);
      ctx.fill();

      if (isHero) {
        ctx.fillStyle = "#111827";
        ctx.beginPath();
        ctx.moveTo(10, 10);
        ctx.lineTo(18, 8);
        ctx.lineTo(20, 18);
        ctx.lineTo(14, 24);
        ctx.lineTo(8, 18);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = armorItem ? armorItem.accent : "#dc2626";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();

      ctx.fillStyle = pal.skin || "#ffd7b5";
      roundRect(-13, -36, 26, 20, 8);
      ctx.fill();

      if (isHero) {
        const hc = hatItem ? hatItem.color : "#111827";
        const ha = hatItem ? hatItem.accent : "#dc2626";
        ctx.fillStyle = hc;
        roundRect(-15, -42, 30, 12, 8);
        ctx.fill();
        ctx.fillStyle = ha;
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

      ctx.fillStyle = "#111827";
      ctx.beginPath(); ctx.arc(-5, -26, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(5, -26, 1.6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.75;
      ctx.fillRect(-4, -21, 8, 1.5);
      ctx.globalAlpha = 1;

      if (isHero && weaponItem) {
        ctx.save();
        ctx.translate(-22, 6);
        ctx.rotate(-0.75 + armSwing * 0.28);
        ctx.fillStyle = weaponItem.color;
        roundRect(-2, -18, 4, 30, 2);
        ctx.fill();
        ctx.fillStyle = weaponItem.accent;
        roundRect(-4, 9, 8, 4, 2);
        ctx.fill();
        ctx.globalAlpha = 0.24;
        const g = ctx.createLinearGradient(0, -22, 0, 10);
        g.addColorStop(0, "rgba(255,255,255,0.65)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.strokeStyle = g;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(0, -16);
        ctx.lineTo(0, -30);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();
      }

      ctx.restore();
    }

    function drawNPC(key, x, y) {
      ctx.save();
      ctx.translate(x, y);
      const paletteMap = {
        archery: { torso: "#f59e0b", pants: "#374151", hat: "#0a84ff" },
        janggi:  { torso: "#ef4444", pants: "#374151", hat: "#facc15" },
        omok:    { torso: "#8b5cf6", pants: "#374151", hat: "#ec4899" }
      };
      const pal = paletteMap[key] || { torso: "#0a84ff", pants: "#374151", hat: "#ffcc00" };
      drawMinifig(0, 0, { isHero: false, palette: pal });
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

    function getFootY(entity) {
      if (entity.kind === "building") return entity.y + entity.h;
      if (entity.kind === "car") return entity.y + entity.h;
      if (entity.kind === "tree") return entity.y + 64 * entity.s;
      if (entity.kind === "lamp") return entity.y + 68 * entity.s;
      if (entity.kind === "bench") return entity.y + 32 * entity.s;
      if (entity.kind === "flower") return entity.y + 12 * entity.s;
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
          player.walkCycle += dt * 1.9;
        }
      }

      addFootprint(dt, rng);
      updateEquipFx(dt);

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
      } else {
        for (const em of portalEmblems) renderables.push({ kind: "emblem", ref: em });
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

      drawEquipFx(ctx);

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
