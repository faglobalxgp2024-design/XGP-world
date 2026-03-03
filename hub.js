/* HUN.JS - LEGO HUB PREMIUM (single-file) v3.1
 * 고정/개선:
 * - 캐릭터 중앙고정(이동 시 옆으로 밀림 해결): 월드 변환 1회만 적용
 * - 얼굴/몸 분리 해결: 헤드-토르소 Y 간격 재조정
 * - 건담 느낌 갑옷: 숄더/레이어 플레이트/벤트/발광 라인
 * - 강화 시스템(0~3): CORE 드롭 + 장비 강화 버튼 + 단계별 이펙트/스탯
 * - 기존 기능 유지: 조이스틱, 존/게이트, 도로/가로등, 포탈 입장, 미니맵, 전투/인벤/커스텀
 */
(() => {
  "use strict";

  /* ----------------------- Utils ----------------------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const isTouch = () => (navigator.maxTouchPoints || 0) > 0;

  function mulberry32(seed) {
    let t = seed >>> 0;
    return function () {
      t += 0x6d2b79f5;
      let r = Math.imul(t ^ (t >>> 15), 1 | t);
      r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
      return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
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

  function rr(ctx, x, y, w, h, r) {
    const rad = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  function groundAO(ctx, x, y, w, h, a) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = "rgba(10,14,24,0.55)";
    ctx.beginPath();
    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function glossy(ctx, x, y, w, h, a) {
    ctx.save();
    ctx.globalAlpha = a;
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, "rgba(255,255,255,0.85)");
    g.addColorStop(0.55, "rgba(255,255,255,0.00)");
    ctx.fillStyle = g;
    rr(ctx, x, y, w, h, Math.min(14, w / 2, h / 2));
    ctx.fill();
    ctx.restore();
  }

  /* ----------------------- UI ----------------------- */
  function ensureUI() {
    const topbar = document.querySelector("header.topbar") || document.querySelector("#topbar") || document.querySelector("header");
    if (topbar) topbar.style.display = "none";
    document.documentElement.style.margin = "0";
    document.documentElement.style.padding = "0";
    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.overflow = "hidden";
    const wrap = document.querySelector("main.wrap") || document.querySelector(".wrap");
    if (wrap) { wrap.style.margin = "0"; wrap.style.padding = "0"; wrap.style.maxWidth = "none"; wrap.style.width = "100%"; }

    const canvas = ensureEl("world", "canvas");
    canvas.style.display = "block";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.background = "#eaf6ff";
    canvas.style.touchAction = "none";
    canvas.style.userSelect = "none";

    const toast = ensureEl("toast", "div");
    toast.style.position = "fixed";
    toast.style.left = "50%";
    toast.style.top = "92px";
    toast.style.transform = "translateX(-50%)";
    toast.style.zIndex = "9999";
    toast.style.pointerEvents = "none";
    toast.style.font = "900 15px system-ui";
    toast.style.color = "rgba(10,18,30,0.92)";
    toast.hidden = true;

    const coord = ensureEl("coord", "div");
    coord.style.position = "fixed";
    coord.style.left = "18px";
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
    fps.style.left = "132px";
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

    const style = ensureEl("lego_style_injected", "style", document.head);
    style.textContent = `#fade.on{opacity:1;} *{-webkit-tap-highlight-color:transparent;}`;

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
    modalInner.style.border = "none";
    modalInner.style.boxShadow = "none";
    modalInner.style.textAlign = "center";
    modalInner.style.font = "1100 18px system-ui";
    modalInner.style.color = "rgba(10,14,24,0.92)";

    const modalTitle = ensureEl("lego_modal_title", "div", modalInner);
    modalTitle.style.font = "1200 24px system-ui";
    modalTitle.style.marginBottom = "10px";
    const modalBody = ensureEl("lego_modal_body", "div", modalInner);
    modalBody.style.font = "1100 20px system-ui";
    modalBody.style.opacity = "0.94";
    modalBody.style.marginBottom = "10px";
    const modalHint = ensureEl("lego_modal_hint", "div", modalInner);
    modalHint.style.font = "900 13px system-ui";
    modalHint.style.opacity = "0.72";

    // joystick (right)
    const joy = ensureEl("joystick", "div");
    const JOY_SIZE = 168, JOY_KNOB = 72, JOY_RING = 136;
    joy.style.position = "fixed";
    joy.style.right = "18px";
    joy.style.bottom = "18px";
    joy.style.zIndex = "10001";
    joy.style.width = `${JOY_SIZE}px`;
    joy.style.height = `${JOY_SIZE}px`;
    joy.style.display = isTouch() ? "block" : "none";
    joy.style.touchAction = "none";

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
      joyState.ax = ax; joyState.ay = ay;
      const max = 52;
      joyKnob.style.transform = `translate(calc(-50% + ${ax * max}px), calc(-50% + ${ay * max}px))`;
      joyBase.style.background = joyState.active ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.72)";
    }
    function joyMove(e) {
      if (!joyState.active || e.pointerId !== joyState.id) return;
      const r = joy.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = (e.clientX - cx), dy = (e.clientY - cy);
      const max = 62;
      const len = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, len / max);
      const ax = (dx / len) * k, ay = (dy / len) * k;
      if (Math.hypot(ax, ay) < 0.10) return setJoy(0, 0);
      setJoy(ax, ay);
    }
    joy.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      joyState.active = true;
      joyState.id = e.pointerId;
      try { joy.setPointerCapture(e.pointerId); } catch {}
      joyMove(e);
    }, { passive: false });
    joy.addEventListener("pointermove", joyMove, { passive: false });
    joy.addEventListener("pointerup", (e) => {
      if (e.pointerId !== joyState.id) return;
      joyState.active = false; joyState.id = -1; setJoy(0, 0);
      try { joy.releasePointerCapture(e.pointerId); } catch {}
    }, { passive: false });
    joy.addEventListener("pointercancel", () => { joyState.active = false; joyState.id = -1; setJoy(0, 0); }, { passive: false });

    // mobile attack button
    const atkBtn = ensureEl("attack_btn", "button");
    atkBtn.textContent = "ATTACK";
    atkBtn.style.position = "fixed";
    atkBtn.style.left = "18px";
    atkBtn.style.bottom = "18px";
    atkBtn.style.zIndex = "10001";
    atkBtn.style.display = isTouch() ? "block" : "none";
    atkBtn.style.width = "148px";
    atkBtn.style.height = "86px";
    atkBtn.style.borderRadius = "22px";
    atkBtn.style.border = "1px solid rgba(0,0,0,0.10)";
    atkBtn.style.background = "rgba(255,255,255,0.78)";
    atkBtn.style.boxShadow = "0 18px 44px rgba(0,0,0,0.16)";
    atkBtn.style.backdropFilter = "blur(8px)";
    atkBtn.style.font = "1200 14px system-ui";
    atkBtn.style.color = "rgba(10,14,24,0.82)";
    atkBtn.style.userSelect = "none";
    atkBtn.style.touchAction = "none";

    /* ---------- Inventory (I) ---------- */
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
    invPanel.style.gridTemplateColumns = "1fr 380px";
    invPanel.style.gap = "0";
    invPanel.style.userSelect = "none";
    invPanel.addEventListener("pointerdown", (e) => e.stopPropagation());

    const invLeft = ensureEl("inventory_left", "div", invPanel);
    invLeft.style.padding = "18px";
    invLeft.style.borderRight = "1px solid rgba(0,0,0,0.08)";
    invLeft.style.display = "flex";
    invLeft.style.flexDirection = "column";
    invLeft.style.gap = "12px";

    const invTitleRow = ensureEl("inventory_title_row", "div", invLeft);
    invTitleRow.style.display = "flex";
    invTitleRow.style.alignItems = "center";
    invTitleRow.style.justifyContent = "space-between";
    const invTitle = ensureEl("inventory_title", "div", invTitleRow);
    invTitle.textContent = "INVENTORY";
    invTitle.style.font = "1200 18px system-ui";
    invTitle.style.letterSpacing = "1.6px";
    const invHint = ensureEl("inventory_hint", "div", invTitleRow);
    invHint.textContent = "I: 닫기 · 클릭: 장착 · 드래그: 정렬 · 우클릭: 해제";
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

    const invDesc = ensureEl("inventory_desc", "div", invFooter);
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
    invRight.style.padding = "18px";
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

    const upgradeBox = ensureEl("upgrade_box", "div", invRight);
    upgradeBox.style.borderRadius = "18px";
    upgradeBox.style.border = "1px solid rgba(0,0,0,0.08)";
    upgradeBox.style.background = "rgba(10,14,24,0.06)";
    upgradeBox.style.padding = "12px";
    upgradeBox.style.display = "flex";
    upgradeBox.style.flexDirection = "column";
    upgradeBox.style.gap = "10px";

    const upgradeTitle = ensureEl("upgrade_title", "div", upgradeBox);
    upgradeTitle.textContent = "UPGRADE";
    upgradeTitle.style.font = "1200 12px system-ui";
    upgradeTitle.style.letterSpacing = "1px";
    upgradeTitle.style.opacity = "0.78";

    const coreRow = ensureEl("core_row", "div", upgradeBox);
    coreRow.style.display = "flex";
    coreRow.style.justifyContent = "space-between";
    coreRow.style.alignItems = "center";

    const coreLabel = ensureEl("core_label", "div", coreRow);
    coreLabel.textContent = "CORE";
    coreLabel.style.font = "1100 12px system-ui";
    coreLabel.style.opacity = "0.78";

    const coreValue = ensureEl("core_value", "div", coreRow);
    coreValue.style.font = "1200 12px system-ui";
    coreValue.style.opacity = "0.92";

    const upgradeBtns = ensureEl("upgrade_btns", "div", upgradeBox);
    upgradeBtns.style.display = "grid";
    upgradeBtns.style.gridTemplateColumns = "repeat(2, 1fr)";
    upgradeBtns.style.gap = "10px";

    /* ---------- Customize (C) ---------- */
    const cus = ensureEl("customize_overlay", "div");
    cus.style.position = "fixed";
    cus.style.inset = "0";
    cus.style.zIndex = "10003";
    cus.style.display = "none";
    cus.style.alignItems = "center";
    cus.style.justifyContent = "center";
    cus.style.pointerEvents = "auto";

    const cusBackdrop = ensureEl("customize_backdrop", "div", cus);
    cusBackdrop.style.position = "absolute";
    cusBackdrop.style.inset = "0";
    cusBackdrop.style.background = "rgba(10,14,24,0.55)";
    cusBackdrop.style.backdropFilter = "blur(8px)";
    cusBackdrop.style.webkitBackdropFilter = "blur(8px)";

    const cusPanel = ensureEl("customize_panel", "div", cus);
    cusPanel.style.position = "relative";
    cusPanel.style.width = "min(880px, calc(100vw - 36px))";
    cusPanel.style.maxHeight = "min(720px, calc(100vh - 36px))";
    cusPanel.style.overflow = "auto";
    cusPanel.style.borderRadius = "22px";
    cusPanel.style.background = "rgba(255,255,255,0.92)";
    cusPanel.style.border = "1px solid rgba(0,0,0,0.10)";
    cusPanel.style.boxShadow = "0 28px 80px rgba(0,0,0,0.28)";
    cusPanel.style.padding = "18px";
    cusPanel.style.display = "flex";
    cusPanel.style.flexDirection = "column";
    cusPanel.style.gap = "12px";
    cusPanel.style.userSelect = "none";
    cusPanel.addEventListener("pointerdown", (e) => e.stopPropagation());

    const cusTitleRow = ensureEl("customize_title_row", "div", cusPanel);
    cusTitleRow.style.display = "flex";
    cusTitleRow.style.alignItems = "center";
    cusTitleRow.style.justifyContent = "space-between";
    const cusTitle = ensureEl("customize_title", "div", cusTitleRow);
    cusTitle.textContent = "CUSTOMIZE";
    cusTitle.style.font = "1200 18px system-ui";
    cusTitle.style.letterSpacing = "1.6px";
    const cusHint = ensureEl("customize_hint", "div", cusTitleRow);
    cusHint.textContent = "C: 닫기 · 클릭: 적용";
    cusHint.style.font = "900 12px system-ui";
    cusHint.style.opacity = "0.72";

    const cusBody = ensureEl("customize_body", "div", cusPanel);
    cusBody.style.display = "grid";
    cusBody.style.gridTemplateColumns = "1fr 1fr";
    cusBody.style.gap = "12px";

    const cusLeft = ensureEl("customize_left", "div", cusBody);
    cusLeft.style.padding = "12px";
    cusLeft.style.borderRadius = "18px";
    cusLeft.style.background = "rgba(10,14,24,0.06)";
    cusLeft.style.border = "1px solid rgba(0,0,0,0.08)";
    const cusRight = ensureEl("customize_right", "div", cusBody);
    cusRight.style.padding = "12px";
    cusRight.style.borderRadius = "18px";
    cusRight.style.background = "rgba(10,14,24,0.06)";
    cusRight.style.border = "1px solid rgba(0,0,0,0.08)";

    const cusPreview = ensureEl("customize_preview", "div", cusRight);
    cusPreview.style.font = "1000 12px system-ui";
    cusPreview.style.opacity = "0.78";
    cusPreview.style.lineHeight = "1.35";
    cusPreview.textContent = "부위를 선택하고 색상을 클릭하면 즉시 적용됩니다.";

    const cusCloseRow = ensureEl("customize_close_row", "div", cusPanel);
    cusCloseRow.style.display = "flex";
    cusCloseRow.style.justifyContent = "flex-end";
    const cusCloseBtn = ensureEl("customize_close_btn", "button", cusCloseRow);
    cusCloseBtn.textContent = "닫기";
    cusCloseBtn.style.cursor = "pointer";
    cusCloseBtn.style.padding = "10px 14px";
    cusCloseBtn.style.borderRadius = "14px";
    cusCloseBtn.style.border = "1px solid rgba(0,0,0,0.12)";
    cusCloseBtn.style.background = "rgba(255,255,255,0.92)";
    cusCloseBtn.style.font = "1100 13px system-ui";
    cusCloseBtn.style.boxShadow = "0 10px 24px rgba(0,0,0,0.12)";

    inv.addEventListener("pointerdown", () => inv.dispatchEvent(new CustomEvent("inventory_close_request")));
    invCloseBtn.addEventListener("click", (e) => { e.preventDefault(); inv.dispatchEvent(new CustomEvent("inventory_close_request")); });
    cus.addEventListener("pointerdown", () => cus.dispatchEvent(new CustomEvent("customize_close_request")));
    cusCloseBtn.addEventListener("click", (e) => { e.preventDefault(); cus.dispatchEvent(new CustomEvent("customize_close_request")); });

    return {
      canvas, toast, coord, fps, fade,
      modal, modalTitle, modalBody, modalHint,
      joyState, atkBtn,
      inv, invGrid, equipSlots, invDesc, coreValue, upgradeBtns,
      cus, cusLeft, cusRight, cusPreview
    };
  }

  /* ----------------------- Game ----------------------- */
  window.addEventListener("DOMContentLoaded", () => {
    const UI = ensureUI();
    const canvas = UI.canvas;
    const ctx = canvas.getContext("2d", { alpha: true });

    let W = 0, H = 0, DPR = 1;
    const VIEW = { zoom: 0.86, w: 0, h: 0 };
    const WORLD = { w: 4200, h: 3000, margin: 160 };
    const cam = { x: 0, y: 0, tx: 0, ty: 0 };

    /* ----------------------- Toast ----------------------- */
    let toastT = 0;
    function toast(msg, ms = 900) {
      UI.toast.hidden = false;
      UI.toast.textContent = msg;
      toastT = ms / 1000;
    }

    /* ----------------------- Data: portals/zones ----------------------- */
    const portals = [
      { key: "avoid", label: "DODGE", status: "open", url: "https://faglobalxgp2024-design.github.io/index.html/", type: "arcade" },
      { key: "archery", label: "ARCHERY", status: "open", url: "https://faglobalxgp2024-design.github.io/-/", type: "tower" },
      { key: "janggi", label: "JANGGI", status: "open", url: "https://faglobalxgp2024-design.github.io/MINIGAME/", type: "dojo" },
      { key: "omok", label: "OMOK", status: "soon", url: "", type: "cafe" },
      { key: "snow", label: "SNOWBALL", status: "soon", url: "", type: "igloo" },
      { key: "jump", label: "JUMP", status: "soon", url: "", type: "gym" },

      { key: "twitter", label: "TWITTER", status: "open", url: "https://x.com/FAGLOBAL_", type: "social" },
      { key: "telegram", label: "TELEGRAM", status: "open", url: "https://t.me/faglobalgp", type: "social" },
      { key: "wallet", label: "WALLET", status: "open", url: "https://faglobal.site/", type: "wallet" },
      { key: "market", label: "MARKET", status: "open", url: "https://famarket.store/", type: "market" },
      { key: "support", label: "SUPPORT", status: "open", url: "", message: "문의: faglobal.xgp2024@gmail.com", type: "support" },

      { key: "mcd", label: "McDonald's", status: "soon", url: "", type: "mcd" },
      { key: "bbq", label: "BBQ", status: "open", url: "https://youtu.be/CP28c0QvRig", type: "bbq" },
      { key: "baskin", label: "BASKIN", status: "soon", url: "", type: "baskin" },
      { key: "paris", label: "PARIS", status: "soon", url: "", type: "paris" },
    ];

    const ZONES = {
      game: { x: 0, y: 0, w: 0, h: 0, label: "GAME ZONE", color: "#0a84ff", entrance: null },
      community: { x: 0, y: 0, w: 0, h: 0, label: "COMMUNITY ZONE", color: "#34c759", entrance: null },
      ads: { x: 0, y: 0, w: 0, h: 0, label: "AD ZONE", color: "#ff2d55", entrance: null },
    };

    /* ----------------------- Equipment / Inventory ----------------------- */
    const RARITY = {
      Common: { glow: 0.10, colA: "rgba(255,255,255,0.55)", colB: "rgba(120,200,255,0.12)" },
      Rare:   { glow: 0.18, colA: "rgba(120,200,255,0.55)", colB: "rgba(120,200,255,0.18)" },
      Epic:   { glow: 0.28, colA: "rgba(175,82,222,0.55)", colB: "rgba(255,45,85,0.18)" },
      Legend: { glow: 0.40, colA: "rgba(255,204,0,0.58)",  colB: "rgba(120,200,255,0.22)" },
      Mythic: { glow: 0.60, colA: "rgba(255,45,85,0.62)",  colB: "rgba(120,210,255,0.30)" },
    };

    // 강화 0~3 (장비별)
    const UPGRADE_MAX = 3;
    const upgradeLevel = { helmet: 1, armor: 1, sword: 1, shield: 1 }; // 기본 1단부터(요청: 처음부터 고퀄)
    const upgradeCost = (slot) => (upgradeLevel[slot] + 1) * (slot === "sword" ? 4 : 3); // 2단=6~8, 3단=9~12

    const ITEM_DEFS = [
      { id: "helmet_horned", name: "뿔 투구", slot: "helmet", icon: "🪖", rarity: "Epic" },
      { id: "armor_gundam",  name: "건담 아머", slot: "armor",  icon: "🧥", rarity: "Legend" },
      { id: "sword_rune",    name: "룬 검",     slot: "sword",  icon: "🗡️", rarity: "Legend" },
      { id: "shield_knight", name: "기사 방패", slot: "shield", icon: "🛡️", rarity: "Epic" },
      { id: "sword_boss",    name: "보스 검",   slot: "sword",  icon: "⚔️", rarity: "Mythic" },
      { id: "shield_boss",   name: "보스 방패", slot: "shield", icon: "🛡️", rarity: "Mythic" },
    ];
    const ITEM_BY_ID = Object.fromEntries(ITEM_DEFS.map(d => [d.id, d]));

    const INVENTORY_SIZE = 30;
    const inventorySlots = new Array(INVENTORY_SIZE).fill(null);
    inventorySlots[0] = "helmet_horned";
    inventorySlots[1] = "armor_gundam";
    inventorySlots[2] = "sword_boss";
    inventorySlots[3] = "shield_boss";
    inventorySlots[4] = "sword_rune";
    inventorySlots[5] = "shield_knight";

    const equipState = { helmet: "helmet_horned", armor: "armor_gundam", sword: "sword_boss", shield: "shield_boss" };

    function equippedItem(slot) {
      const id = equipState[slot] || null;
      return id ? ITEM_BY_ID[id] : null;
    }
    function rarityOf(slot) {
      const it = equippedItem(slot);
      return (it && RARITY[it.rarity]) ? RARITY[it.rarity] : RARITY.Common;
    }
    function upgradeMul(slot) {
      const u = upgradeLevel[slot] || 0;
      return 1 + u * 0.18; // 0:1.0, 1:1.18, 2:1.36, 3:1.54
    }
    function upgradeFxMul(slot) {
      const u = upgradeLevel[slot] || 0;
      return 0.85 + u * 0.55; // 이펙트 강도
    }

    const invState = { open: false, drag: { active: false, from: -1, itemId: null, ghost: null, pid: -1 } };

    function cleanupInvDrag() {
      if (invState.drag.ghost) { try { invState.drag.ghost.remove(); } catch {} }
      invState.drag = { active: false, from: -1, itemId: null, ghost: null, pid: -1 };
    }
    function toggleInventory(force = null) {
      invState.open = force == null ? !invState.open : !!force;
      UI.inv.style.display = invState.open ? "flex" : "none";
      if (invState.open) renderInventory();
      else cleanupInvDrag();
    }
    function equipItem(id) {
      const it = ITEM_BY_ID[id];
      if (!it) return;
      equipState[it.slot] = it.id;
      renderInventory();
    }
    function unequip(slot) { equipState[slot] = null; renderInventory(); }

    function startDrag(slotIndex, itemId, e) {
      if (!itemId) return;
      invState.drag.active = true;
      invState.drag.from = slotIndex;
      invState.drag.itemId = itemId;
      invState.drag.pid = e.pointerId;

      const g = document.createElement("div");
      g.style.position = "fixed";
      g.style.left = (e.clientX - 28) + "px";
      g.style.top = (e.clientY - 28) + "px";
      g.style.width = "56px";
      g.style.height = "56px";
      g.style.borderRadius = "16px";
      g.style.background = "rgba(255,255,255,0.96)";
      g.style.border = "1px solid rgba(0,0,0,0.12)";
      g.style.boxShadow = "0 18px 52px rgba(0,0,0,0.22)";
      g.style.display = "flex";
      g.style.alignItems = "center";
      g.style.justifyContent = "center";
      g.style.font = "1200 22px system-ui";
      g.style.zIndex = "10010";
      g.style.pointerEvents = "none";
      g.textContent = ITEM_BY_ID[itemId]?.icon || "📦";
      document.body.appendChild(g);
      invState.drag.ghost = g;
    }
    function moveDrag(e) {
      if (!invState.drag.active || e.pointerId !== invState.drag.pid) return;
      if (invState.drag.ghost) {
        invState.drag.ghost.style.left = (e.clientX - 28) + "px";
        invState.drag.ghost.style.top = (e.clientY - 28) + "px";
      }
    }
    function endDrag(overIndex) {
      if (!invState.drag.active) return;
      const from = invState.drag.from, id = invState.drag.itemId;
      if (from >= 0 && overIndex >= 0 && from !== overIndex) {
        const tmp = inventorySlots[overIndex];
        inventorySlots[overIndex] = id;
        inventorySlots[from] = tmp;
      }
      cleanupInvDrag();
      renderInventory();
    }

    /* ----------------------- Customize ----------------------- */
    const heroStyle = { skin: "#ffd66b", torso: "#1f6fff", pants: "#2a2f3b", hat: "#ffffff" };
    const cusState = { open: false, part: "torso" };
    function toggleCustomize(force = null) {
      cusState.open = force == null ? !cusState.open : !!force;
      UI.cus.style.display = cusState.open ? "flex" : "none";
      if (cusState.open) renderCustomize();
    }
    function renderCustomize() {
      UI.cusLeft.innerHTML = "";
      const parts = [
        { key: "skin", label: "SKIN" },
        { key: "torso", label: "TORSO" },
        { key: "pants", label: "PANTS" },
        { key: "hat", label: "HAT" },
      ];
      const palettes = {
        skin: ["#ffd66b", "#f2c07a", "#e0a46f", "#c98b5c"],
        torso: ["#1f6fff", "#0a84ff", "#34c759", "#ff3b30", "#ffcc00", "#af52de", "#ffffff", "#1a1d24"],
        pants: ["#2a2f3b", "#3b4251", "#1f2a44", "#6b717d", "#0a84ff"],
        hat: ["#ffffff", "#ff3b30", "#ffcc00", "#34c759", "#0a84ff", "#af52de", "#1a1d24"],
      };

      const partRow = document.createElement("div");
      partRow.style.display = "flex";
      partRow.style.flexWrap = "wrap";
      partRow.style.gap = "8px";
      for (const p of parts) {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = p.label;
        b.style.cursor = "pointer";
        b.style.padding = "10px 12px";
        b.style.borderRadius = "14px";
        b.style.border = "1px solid rgba(0,0,0,0.12)";
        b.style.background = (cusState.part === p.key) ? "rgba(10,132,255,0.14)" : "rgba(255,255,255,0.88)";
        b.style.font = "1100 12px system-ui";
        b.addEventListener("click", (e) => { e.preventDefault(); cusState.part = p.key; renderCustomize(); });
        partRow.appendChild(b);
      }
      UI.cusLeft.appendChild(partRow);

      const grid = document.createElement("div");
      grid.style.display = "grid";
      grid.style.gridTemplateColumns = "repeat(6, 1fr)";
      grid.style.gap = "10px";
      grid.style.marginTop = "10px";
      for (const col of palettes[cusState.part]) {
        const c = document.createElement("button");
        c.type = "button";
        c.style.height = "48px";
        c.style.borderRadius = "14px";
        c.style.border = "1px solid rgba(0,0,0,0.12)";
        c.style.background = col;
        c.style.cursor = "pointer";
        c.style.boxShadow = "0 10px 24px rgba(0,0,0,0.10)";
        c.addEventListener("click", (e) => {
          e.preventDefault();
          heroStyle[cusState.part] = col;
          UI.cusPreview.textContent = `적용됨: ${cusState.part.toUpperCase()} = ${col}`;
        });
        grid.appendChild(c);
      }
      UI.cusLeft.appendChild(grid);
    }

    UI.inv.addEventListener("inventory_close_request", () => toggleInventory(false));
    UI.cus.addEventListener("customize_close_request", () => toggleCustomize(false));

                              /* ----------------------- Input ----------------------- */
    const keys = new Set();
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
    function openPortalUI(p) {
      modalState.portal = p;
      const status = p.status === "open" ? "OPEN" : "SOON";
      const msg = p.status === "open" ? `입장: <b>Enter</b> 또는 <b>E</b>` : `아직 준비 중입니다.`;
      const body = `
        <div style="font:1200 20px system-ui; margin-bottom:8px;">${p.label}</div>
        <div style="font:1000 14px system-ui; opacity:0.75; margin-bottom:10px;">STATUS: <b>${status}</b></div>
        <div style="font:900 14px system-ui; opacity:0.85;">${p.message ? p.message : msg}</div>`;
      openModal("PORTAL", body, "ESC: 닫기");
    }
    function confirmEnter(p) {
      if (!p || p.status !== "open" || !p.url) return;
      UI.fade.classList.add("on");
      setTimeout(() => { window.location.href = p.url; }, 240);
    }

    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      if (k === "i") { e.preventDefault(); toggleInventory(); return; }
      if (k === "c") { e.preventDefault(); toggleCustomize(); return; }
      if (k === " " || k === "f") { e.preventDefault(); requestAttack(); return; }
      keys.add(k);

      if (k === "enter" || k === "e") {
        if (modalState.open && modalState.portal) confirmEnter(modalState.portal);
        else if (activePortal) openPortalUI(activePortal);
      }
      if (k === "escape") {
        if (invState.open) toggleInventory(false);
        else if (cusState.open) toggleCustomize(false);
        else closeModal();
      }
    });
    window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
    UI.atkBtn.addEventListener("pointerdown", (e) => { e.preventDefault(); requestAttack(); }, { passive: false });

    /* ----------------------- Camera / sizing ----------------------- */
    function resize() {
      DPR = Math.min(2, window.devicePixelRatio || 1);
      W = Math.floor(window.innerWidth);
      H = Math.floor(window.innerHeight);
      canvas.width = Math.floor(W * DPR);
      canvas.height = Math.floor(H * DPR);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      VIEW.w = W; VIEW.h = H;
      const base = Math.min(W, H);
      VIEW.zoom = clamp(base / 920, 0.72, 1.10);
      layoutWorld(mulberry32(((W * 73856093) ^ (H * 19349663)) >>> 0));
    }
    window.addEventListener("resize", resize);

    // ✅ 월드 변환(스케일/카메라)을 draw에서 1회만 적용하므로,
    // 화면좌표->월드좌표 변환도 정확히: world = cam + (screen / zoom)
    function pointerToWorld(clientX, clientY) {
      const r = canvas.getBoundingClientRect();
      const sx = (clientX - r.left);
      const sy = (clientY - r.top);
      return { x: cam.x + sx / VIEW.zoom, y: cam.y + sy / VIEW.zoom };
    }

    /* ----------------------- Player ----------------------- */
    const player = { x: 360, y: 360, r: 18, speed: isTouch() ? 185 : 250, dir: "down", moving: false, animT: 0, bobT: 0 };
    function clampPlayer() {
      player.x = clamp(player.x, WORLD.margin, WORLD.w - WORLD.margin);
      player.y = clamp(player.y, WORLD.margin, WORLD.h - WORLD.margin);
    }
    function updateDir(dx, dy) {
      if (Math.abs(dx) > Math.abs(dy)) player.dir = dx < 0 ? "left" : "right";
      else player.dir = dy < 0 ? "up" : "down";
    }

    /* ----------------------- World layout ----------------------- */
    const roads = [];
    const sidewalks = [];
    const lamps = [];
    const buildings = [];

    function rectOverlap(a, b, pad = 0) {
      return !(a.x + a.w + pad < b.x - pad || a.x - pad > b.x + b.w + pad || a.y + a.h + pad < b.y - pad || a.y - pad > b.y + b.h + pad);
    }
    function rectInZones(r, pad = 0) {
      return rectOverlap(r, ZONES.game, pad) || rectOverlap(r, ZONES.community, pad) || rectOverlap(r, ZONES.ads, pad);
    }
    function isOnRoadLike(x, y) {
      for (const r of roads) if (x >= r.x - 18 && x <= r.x + r.w + 18 && y >= r.y - 18 && y <= r.y + r.h + 18) return true;
      return false;
    }
    function isInsideBuildingBuffer(x, y) {
      for (const p of buildings) {
        const pad = 150;
        if (x >= p.x - pad && x <= p.x + p.w + pad && y >= p.y - pad && y <= p.y + p.h + pad) return true;
      }
      return false;
    }
    function isInsideZonesBuffer(x, y) {
      const pad = 18;
      for (const z of [ZONES.game, ZONES.community, ZONES.ads]) {
        if (x >= z.x - pad && x <= z.x + z.w + pad && y >= z.y - pad && y <= z.y + z.h + pad) return true;
      }
      return false;
    }

    function legoStyle(type) {
      const base = "#6b717d";
      if (type === "arcade") return { wall: "#eaf0ff", roof: "#0a84ff", base, accent: "#0a84ff" };
      if (type === "tower") return { wall: "#fff0f0", roof: "#ff3b30", base, accent: "#ff3b30" };
      if (type === "dojo") return { wall: "#f2d9b3", roof: "#2a2f3b", base: "#3b4251", accent: "#ff2d55" };
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

    function placeBuildingsInZone(zone, list) {
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
        const w = (p.key === "avoid" || p.key === "janggi") ? 190 : 160;
        const h = (p.key === "avoid" || p.key === "janggi") ? 150 : 130;
        p.x = inner.x + c * cellW + cellW * 0.5 - w / 2;
        p.y = inner.y + r * cellH + cellH * 0.5 - h / 2;
        p.w = w; p.h = h;
      }
    }

    function addRoadH(y, x1, x2, h) {
      const r = { axis: "h", x: x1, y, w: x2 - x1, h };
      roads.push(r);
      sidewalks.push({ x: r.x - 24, y: r.y - 18, w: r.w + 48, h: 18 });
      sidewalks.push({ x: r.x - 24, y: r.y + r.h, w: r.w + 48, h: 18 });
    }
    function addRoadV(x, y1, y2, w) {
      const r = { axis: "v", x, y: y1, w, h: y2 - y1 };
      roads.push(r);
      sidewalks.push({ x: r.x - 18, y: r.y - 24, w: 18, h: r.h + 48 });
      sidewalks.push({ x: r.x + r.w, y: r.y - 24, w: 18, h: r.h + 48 });
    }

    function seedLamps() {
      lamps.length = 0;
      const interval = 260, offset = 86;
      for (const r of roads) {
        if (rectInZones(r, 18)) continue;
        if (r.axis === "h") {
          const start = Math.ceil((r.x + 40) / interval) * interval;
          for (let x = start; x <= r.x + r.w - 40; x += interval) {
            const y1 = r.y - offset;
            const y2 = r.y + r.h + offset * 0.62;
            if (!isInsideZonesBuffer(x, y1) && !isInsideBuildingBuffer(x, y1)) lamps.push({ x, y: y1, s: 1.02 });
            if (!isInsideZonesBuffer(x, y2) && !isInsideBuildingBuffer(x, y2)) lamps.push({ x, y: y2, s: 1.02 });
          }
        } else {
          const start = Math.ceil((r.y + 40) / interval) * interval;
          for (let y = start; y <= r.y + r.h - 40; y += interval) {
            const x1 = r.x - offset;
            const x2 = r.x + r.w + offset * 0.62;
            if (!isInsideZonesBuffer(x1, y) && !isInsideBuildingBuffer(x1, y)) lamps.push({ x: x1, y, s: 1.02 });
            if (!isInsideZonesBuffer(x2, y) && !isInsideBuildingBuffer(x2, y)) lamps.push({ x: x2, y, s: 1.02 });
          }
        }
      }
    }

    function layoutWorld(rng) {
      WORLD.w = Math.max(4200, Math.floor(W * 4.4));
      WORLD.h = Math.max(3000, Math.floor(H * 3.8));

      ZONES.game.w = WORLD.w * 0.22; ZONES.game.h = WORLD.h * 0.24; ZONES.game.x = WORLD.w * 0.10; ZONES.game.y = WORLD.h * 0.12;
      ZONES.community.w = WORLD.w * 0.22; ZONES.community.h = WORLD.h * 0.24; ZONES.community.x = WORLD.w * 0.39; ZONES.community.y = WORLD.h * 0.12;
      ZONES.ads.w = WORLD.w * 0.22; ZONES.ads.h = WORLD.h * 0.24; ZONES.ads.x = WORLD.w * 0.68; ZONES.ads.y = WORLD.h * 0.12;

      ZONES.game.entrance = { x: ZONES.game.x + ZONES.game.w * 0.5 - 120, y: ZONES.game.y + ZONES.game.h - 140, w: 240, h: 110 };
      ZONES.community.entrance = { x: ZONES.community.x + ZONES.community.w * 0.5 - 120, y: ZONES.community.y + ZONES.community.h - 140, w: 240, h: 110 };
      ZONES.ads.entrance = { x: ZONES.ads.x + ZONES.ads.w * 0.5 - 120, y: ZONES.ads.y + ZONES.ads.h - 140, w: 240, h: 110 };

      roads.length = 0; sidewalks.length = 0; lamps.length = 0; buildings.length = 0;

      const L = WORLD.margin * 0.35, R = WORLD.w - WORLD.margin * 0.35;
      const T = WORLD.margin * 0.35, B = WORLD.h - WORLD.margin * 0.35;
      const outerPad = 40;
      addRoadH(T + outerPad, L, R, 122);
      addRoadH(B - outerPad - 122, L, R, 122);
      addRoadV(L + outerPad, T, B, 118);
      addRoadV(R - outerPad - 118, T, B, 118);

      const yMid = WORLD.h * 0.50;
      const yLow = WORLD.h * 0.82;
      const xMid = WORLD.w * 0.50 - 62;
      const xL = WORLD.w * 0.22 - 62;
      const xR = WORLD.w * 0.78 - 62;
      addRoadH(yMid, L, R, 132);
      addRoadH(yLow, L + 90, R - 90, 120);
      addRoadV(xMid, T, B, 124);
      addRoadV(xL, T, yMid + 220, 118);
      addRoadV(xR, T, yMid + 220, 118);

      const gameList = portals.filter(p => ["avoid","archery","janggi","omok","snow","jump"].includes(p.key));
      const commList = portals.filter(p => ["twitter","telegram","wallet","market","support"].includes(p.key));
      const adsList  = portals.filter(p => ["mcd","bbq","baskin","paris"].includes(p.key));
      placeBuildingsInZone(ZONES.game, gameList);
      placeBuildingsInZone(ZONES.community, commList);
      placeBuildingsInZone(ZONES.ads, adsList);
      for (const p of portals) buildings.push(p);

      seedLamps();
      spawnMonsters(rng);
    }
        /* ----------------------- Combat + Drops + Effects ----------------------- */
    const combat = { hp: 100, maxHp: 100, baseAtk: 18, cd: 0, invuln: 0, kills: 0, core: 12 };
    const monsters = [];
    const effects = [];
    let activePortal = null;

    function spawnMonsters(rng) {
      monsters.length = 0;
      const N = 10;
      function ok(x,y){
        if (isOnRoadLike(x,y)) return false;
        if (isInsideBuildingBuffer(x,y)) return false;
        if (isInsideZonesBuffer(x,y)) return false;
        return true;
      }
      for (let i=0;i<N;i++){
        let x=0,y=0;
        for (let t=0;t<240;t++){
          x = WORLD.margin + rng()*(WORLD.w-WORLD.margin*2);
          y = WORLD.margin + rng()*(WORLD.h-WORLD.margin*2);
          if (ok(x,y)) break;
        }
        const elite = rng() < 0.18;
        monsters.push({ kind: elite?"elite":"mob", x,y, r: elite?22:18, hp: elite?90:45, maxHp: elite?90:45, spd: elite?82:64, hit:0, seed: rng()*1000 });
      }
    }

    function fxSpark(x,y,colA,colB,size=1, life=0.30){
      effects.push({ type:"spark", x,y, t:0, life, colA,colB,size });
    }
    function fxSlash(x,y,dir,power,colA,colB, uMul){
      effects.push({ type:"slash", x,y, dir, power, uMul, t:0, life:0.24 + 0.04*uMul, colA,colB });
    }
    function fxNum(x,y,txt,col){
      effects.push({ type:"num", x,y, t:0, life:0.75, txt, col });
    }
    function fxAuraRing(x,y, colA, colB, r0, r1, life){
      effects.push({ type:"ring", x,y, t:0, life, colA,colB, r0, r1 });
    }

    function playerAtk() {
      const sw = equippedItem("sword");
      const base = combat.baseAtk;
      const rm = sw?.rarity === "Mythic" ? 1.55 : 1.0;
      const um = upgradeMul("sword");
      return base * rm * um;
    }

    function requestAttack(){
      if (modalState.open || invState.open || cusState.open) return;
      if (combat.cd > 0) return;
      combat.cd = 0.32;

      const sw = equippedItem("sword");
      const rrSw = sw ? (RARITY[sw.rarity] || RARITY.Common) : RARITY.Common;
      const power = playerAtk();
      const uMul = upgradeFxMul("sword");

      const f = player.dir;
      const ax = f==="left"?-1 : f==="right"?1 : 0;
      const ay = f==="up"?-1 : f==="down"?1 : 0;
      const cx = player.x + ax*42;
      const cy = player.y + ay*42;

      fxSlash(cx,cy,f,power,rrSw.colA,rrSw.colB,uMul);

      const hitR = 64 + 10*(upgradeLevel.sword||0);
      for (const m of monsters){
        const d = Math.hypot(m.x-cx, m.y-cy);
        if (d <= hitR + m.r){
          m.hp -= power;
          m.hit = 0.12;
          fxSpark(m.x,m.y,rrSw.colA,rrSw.colB, (sw?.rarity==="Mythic"?1.35:1.0)*uMul, 0.30 + 0.08*uMul);
          fxNum(m.x,m.y-18,String(Math.round(power)),"rgba(10,14,24,0.88)");
          if (m.hp <= 0){
            combat.kills++;
            // drops
            const drop = (m.kind==="elite") ? (Math.random()<0.90?2:3) : (Math.random()<0.55?1:0);
            if (drop>0){ combat.core += drop; toast(`+CORE ${drop} (총 ${combat.core})`, 900); }
            // upgrade burst
            fxAuraRing(m.x,m.y, "rgba(255,204,0,0.55)", "rgba(120,210,255,0.22)", 10, 64, 0.42);

            // respawn
            m.hp = m.maxHp;
            m.x = WORLD.margin + Math.random()*(WORLD.w-WORLD.margin*2);
            m.y = WORLD.margin + Math.random()*(WORLD.h-WORLD.margin*2);
          }
        }
      }
    }

    function updateCombat(dt){
      combat.cd = Math.max(0, combat.cd - dt);
      combat.invuln = Math.max(0, combat.invuln - dt);

      // armor upgrade passive: maxHP 증가
      combat.maxHp = 100 + (upgradeLevel.armor||0)*18;
      combat.hp = clamp(combat.hp, 0, combat.maxHp);

      for (const m of monsters){
        const dx = player.x - m.x, dy = player.y - m.y;
        const dist = Math.hypot(dx,dy) || 1;
        const chase = dist < 460;
        if (chase){
          m.x += (dx/dist)*m.spd*dt;
          m.y += (dy/dist)*m.spd*dt;
        } else {
          const a = (m.seed + performance.now()/1000)*0.6;
          m.x += Math.cos(a)*12*dt;
          m.y += Math.sin(a*1.1)*12*dt;
        }
        m.x = clamp(m.x, WORLD.margin, WORLD.w - WORLD.margin);
        m.y = clamp(m.y, WORLD.margin, WORLD.h - WORLD.margin);
        m.hit = Math.max(0, m.hit - dt);

        if (dist < m.r + 22){
          if (combat.invuln <= 0){
            const sh = equippedItem("shield");
            const shieldR = sh?.rarity==="Mythic" ? 0.55 : sh ? 0.78 : 1.0;
            const shieldU = 1 - (upgradeLevel.shield||0)*0.08; // 강화될수록 피해 감소
            const dmg = (m.kind==="elite"?16:10) * shieldR * shieldU;
            combat.hp = Math.max(0, combat.hp - dmg);
            combat.invuln = 0.55;
            fxSpark(player.x, player.y-8, "rgba(255,59,48,0.55)", "rgba(255,204,0,0.18)", 1.0, 0.32);
            fxNum(player.x, player.y-22, `-${Math.round(dmg)}`, "rgba(255,59,48,0.92)");
          }
        }
      }

      for (let i=effects.length-1;i>=0;i--){
        effects[i].t += dt;
        if (effects[i].t >= effects[i].life) effects.splice(i,1);
      }
    }

    /* ----------------------- Inventory Render + Upgrade Buttons ----------------------- */
    function upgradeSlot(slot){
      if (!equipState[slot]) return toast("해당 슬롯에 장비가 없습니다.", 900);
      const lv = upgradeLevel[slot] || 0;
      if (lv >= UPGRADE_MAX) return toast("이미 최대 강화(3단) 입니다.", 900);
      const cost = upgradeCost(slot);
      if (combat.core < cost) return toast(`CORE 부족: 필요 ${cost}`, 900);
      combat.core -= cost;
      upgradeLevel[slot] = lv + 1;
      toast(`${slot.toUpperCase()} 강화 +${upgradeLevel[slot]} (CORE -${cost})`, 1100);

      // 강화 연출
      const it = equippedItem(slot);
      const rr0 = it ? (RARITY[it.rarity]||RARITY.Common) : RARITY.Common;
      fxAuraRing(player.x, player.y, rr0.colA, rr0.colB, 18, 90, 0.52);
      fxSpark(player.x, player.y-18, rr0.colA, rr0.colB, 1.3 + upgradeLevel[slot]*0.25, 0.46);
      renderInventory();
    }

    function renderInventory() {
      UI.invGrid.innerHTML = "";

      for (let i = 0; i < INVENTORY_SIZE; i++) {
        const itemId = inventorySlots[i];
        const it = itemId ? ITEM_BY_ID[itemId] : null;

        const cell = document.createElement("button");
        cell.type = "button";
        cell.style.height = "74px";
        cell.style.borderRadius = "16px";
        cell.style.border = "1px solid rgba(0,0,0,0.10)";
        cell.style.background = it ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.55)";
        cell.style.boxShadow = it ? "0 10px 24px rgba(0,0,0,0.08)" : "none";
        cell.style.cursor = it ? "pointer" : "default";
        cell.style.display = "flex";
        cell.style.flexDirection = "column";
        cell.style.alignItems = "center";
        cell.style.justifyContent = "center";
        cell.style.gap = "4px";
        cell.style.padding = "8px";
        cell.style.userSelect = "none";
        cell.style.touchAction = "none";

        if (it) {
          const on = equipState[it.slot] === it.id;

          const top = document.createElement("div");
          top.textContent = it.icon;
          top.style.fontSize = "22px";
          const nm = document.createElement("div");
          nm.textContent = it.name;
          nm.style.font = "1000 11px system-ui";
          nm.style.opacity = "0.86";
          nm.style.maxWidth = "100%";
          nm.style.whiteSpace = "nowrap";
          nm.style.overflow = "hidden";
          nm.style.textOverflow = "ellipsis";

          const tag = document.createElement("div");
          tag.textContent = on ? "EQUIPPED" : `${it.rarity.toUpperCase()}`;
          tag.style.font = "1100 9px system-ui";
          tag.style.letterSpacing = "0.6px";
          tag.style.opacity = on ? "0.95" : "0.62";
          tag.style.padding = "3px 6px";
          tag.style.borderRadius = "999px";
          tag.style.border = "1px solid rgba(0,0,0,0.10)";
          tag.style.background = on ? "rgba(52,199,89,0.14)" : "rgba(10,14,24,0.06)";
          if (on) cell.style.outline = "2px solid rgba(52,199,89,0.45)";

          cell.appendChild(top);
          cell.appendChild(nm);
          cell.appendChild(tag);

          cell.addEventListener("click", (e) => { e.preventDefault(); equipItem(it.id); });
          cell.addEventListener("contextmenu", (e) => { e.preventDefault(); if (equipState[it.slot] === it.id) unequip(it.slot); });

          cell.addEventListener("pointerdown", (e) => { if (e.button !== 0) return; startDrag(i, it.id, e); try { cell.setPointerCapture(e.pointerId); } catch {} });
          cell.addEventListener("pointermove", (e) => moveDrag(e));
          cell.addEventListener("pointerup", (e) => { if (invState.drag.active && e.pointerId === invState.drag.pid) endDrag(i); });
          cell.addEventListener("pointercancel", (e) => { if (invState.drag.active && e.pointerId === invState.drag.pid) endDrag(i); });
        } else {
          cell.addEventListener("pointermove", (e) => moveDrag(e));
          cell.addEventListener("pointerup", (e) => { if (invState.drag.active && e.pointerId === invState.drag.pid) endDrag(i); });
          cell.addEventListener("pointercancel", (e) => { if (invState.drag.active && e.pointerId === invState.drag.pid) endDrag(i); });
        }

        UI.invGrid.appendChild(cell);
      }

      UI.equipSlots.innerHTML = "";
      const slots = [
        { slot: "helmet", label: "HEAD" },
        { slot: "armor", label: "CHEST" },
        { slot: "sword", label: "MAIN HAND" },
        { slot: "shield", label: "OFF HAND" },
      ];
      for (const s of slots) {
        const card = document.createElement("button");
        card.type = "button";
        card.style.borderRadius = "18px";
        card.style.border = "1px solid rgba(0,0,0,0.10)";
        card.style.background = "rgba(255,255,255,0.88)";
        card.style.boxShadow = "0 10px 24px rgba(0,0,0,0.08)";
        card.style.padding = "12px";
        card.style.cursor = "pointer";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.gap = "6px";
        card.style.userSelect = "none";

        const t1 = document.createElement("div");
        t1.textContent = s.label;
        t1.style.font = "1100 11px system-ui";
        t1.style.letterSpacing = "1px";
        t1.style.opacity = "0.70";

        const it = equippedItem(s.slot);
        const lv = upgradeLevel[s.slot] || 0;

        const t2 = document.createElement("div");
        t2.textContent = it ? `${it.icon} ${it.name}  (+${lv})` : "—";
        t2.style.font = "1100 13px system-ui";
        t2.style.opacity = it ? "0.96" : "0.46";

        const t3 = document.createElement("div");
        t3.textContent = it ? `장착됨 (${it.rarity}) · 강화단계 ${lv}/3 (클릭하여 해제)` : "해제됨 (인벤에서 클릭하여 장착)";
        t3.style.font = "1000 11px system-ui";
        t3.style.opacity = "0.62";

        if (it) card.style.outline = "2px solid rgba(10,132,255,0.30)";
        card.addEventListener("click", (e) => { e.preventDefault(); if (equipState[s.slot]) unequip(s.slot); });

        card.appendChild(t1); card.appendChild(t2); card.appendChild(t3);
        UI.equipSlots.appendChild(card);
      }

      UI.upgradeBtns.innerHTML = "";
      UI.coreValue.textContent = `${combat.core}`;
      for (const s of ["helmet","armor","sword","shield"]) {
        const it = equippedItem(s);
        const lv = upgradeLevel[s] || 0;
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = it ? `${s.toUpperCase()} +${lv} → +${Math.min(UPGRADE_MAX, lv+1)} (${lv<UPGRADE_MAX?`CORE ${upgradeCost(s)}`:"MAX"})` : `${s.toUpperCase()} (장비 없음)`;
        btn.disabled = !it || lv>=UPGRADE_MAX;
        btn.style.cursor = btn.disabled ? "not-allowed" : "pointer";
        btn.style.padding = "10px 12px";
        btn.style.borderRadius = "14px";
        btn.style.border = "1px solid rgba(0,0,0,0.12)";
        btn.style.background = btn.disabled ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.90)";
        btn.style.font = "1100 12px system-ui";
        btn.style.boxShadow = btn.disabled ? "none" : "0 10px 24px rgba(0,0,0,0.10)";
        btn.addEventListener("click", (e) => { e.preventDefault(); if (!btn.disabled) upgradeSlot(s); });
        UI.upgradeBtns.appendChild(btn);
      }

      const active = Object.keys(equipState).map(k => equippedItem(k)).filter(Boolean).map(x => x.name).join(", ");
      UI.invDesc.textContent = active ? `장착 중: ${active}` : "장착 중인 아이템 없음";
    }

    /* ----------------------- Draw: environment (월드좌표 그대로) ----------------------- */
    function drawBackground(){
      ctx.fillStyle = "#eaf6ff";
      ctx.fillRect(0,0,VIEW.w,VIEW.h);
      const g = ctx.createLinearGradient(0,0,0,VIEW.h);
      g.addColorStop(0,"rgba(10,132,255,0.08)");
      g.addColorStop(1,"rgba(52,199,89,0.06)");
      ctx.fillStyle = g;
      ctx.fillRect(0,0,VIEW.w,VIEW.h);
    }

    function drawRoad(r){
      ctx.save();
      ctx.fillStyle = "rgba(38,44,55,0.88)";
      rr(ctx,r.x,r.y,r.w,r.h,22); ctx.fill();

      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 3;
      ctx.setLineDash([18,18]);
      if (r.axis==="h"){
        ctx.beginPath();
        ctx.moveTo(r.x+28, r.y+r.h/2);
        ctx.lineTo(r.x+r.w-28, r.y+r.h/2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(r.x+r.w/2, r.y+28);
        ctx.lineTo(r.x+r.w/2, r.y+r.h-28);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    }

    function drawSidewalk(s){
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "rgba(245,245,245,0.92)";
      rr(ctx,s.x,s.y,s.w,s.h,16); ctx.fill();
      ctx.restore();
    }

    function drawLamp(p,t){
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.scale(p.s,p.s);

      groundAO(ctx, 0, 52, 22, 8, 0.10);
      ctx.fillStyle = "rgba(40,46,58,0.92)";
      rr(ctx,-4,0,8,54,6); ctx.fill();
      ctx.fillStyle = "rgba(10,14,24,0.92)";
      rr(ctx,-14,-10,28,16,10); ctx.fill();

      const on = (Math.sin(t*2 + p.x*0.01)*0.5+0.5);
      ctx.globalAlpha = 0.82;
      ctx.fillStyle = `rgba(255,204,0,${0.55 + 0.35*on})`;
      ctx.beginPath(); ctx.arc(0,-2,5.6,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha = 0.18;
      ctx.beginPath(); ctx.arc(0,-2,14,0,Math.PI*2); ctx.fill();

      ctx.restore();
    }

    function drawGate(z,t){
      const e = z.entrance; if (!e) return;
      const pulse = (Math.sin(t*2.2)*0.5+0.5);

      groundAO(ctx, e.x+e.w/2, e.y+e.h+18, e.w*0.55, 14, 0.12);

      ctx.save();
      ctx.globalAlpha = 0.94;
      ctx.fillStyle = "rgba(255,255,255,0.76)";
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      ctx.lineWidth = 2;
      rr(ctx,e.x,e.y,e.w,e.h,26); ctx.fill(); ctx.stroke();

      const g = ctx.createLinearGradient(e.x,e.y,e.x+e.w,e.y);
      g.addColorStop(0,"rgba(255,255,255,0)");
      g.addColorStop(0.5, `${z.color}55`);
      g.addColorStop(1,"rgba(255,255,255,0)");
      ctx.globalAlpha = 0.7 + 0.18*pulse;
      ctx.fillStyle = g;
      rr(ctx,e.x+10,e.y+10,e.w-20,12,10); ctx.fill();

      ctx.globalAlpha = 1;
      ctx.fillStyle = z.color;
      rr(ctx,e.x+e.w/2-130,e.y-52,260,40,16); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "1200 16px system-ui";
      ctx.textAlign = "center"; ctx.textBaseline="middle";
      ctx.fillText(z.label, e.x+e.w/2, e.y-32);
      ctx.restore();
    }

    function drawBuilding(p){
      const S = legoStyle(p.type);

      groundAO(ctx, p.x+p.w/2, p.y+p.h+18, p.w*0.45, 14, 0.10);

      ctx.save();
      ctx.fillStyle = S.base;
      rr(ctx,p.x-6,p.y+p.h-18,p.w+12,30,18); ctx.fill();

      ctx.fillStyle = S.wall;
      rr(ctx,p.x,p.y,p.w,p.h-10,22); ctx.fill();
      glossy(ctx,p.x+10,p.y+10,p.w-20,p.h-30,0.12);

      ctx.fillStyle = S.roof;
      rr(ctx,p.x-4,p.y-18,p.w+8,32,18); ctx.fill();

      ctx.fillStyle = "rgba(10,14,24,0.82)";
      rr(ctx,p.x+p.w/2-24, p.y+p.h-62, 48, 52, 16); ctx.fill();

      ctx.globalAlpha = 0.92;
      ctx.fillStyle = "rgba(10,132,255,0.18)";
      rr(ctx,p.x+14,p.y+26,34,26,12); ctx.fill();
      rr(ctx,p.x+p.w-48,p.y+26,34,26,12); ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      ctx.lineWidth = 2;
      rr(ctx,p.x+p.w/2-64,p.y+20,128,34,16); ctx.fill(); ctx.stroke();

      ctx.fillStyle = "rgba(10,14,24,0.86)";
      ctx.font = "1200 12px system-ui";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(p.label, p.x+p.w/2, p.y+37);

      const open = p.status==="open";
      ctx.globalAlpha = 0.96;
      ctx.fillStyle = open ? "rgba(52,199,89,0.90)" : "rgba(255,59,48,0.90)";
      rr(ctx,p.x+p.w-62,p.y+10,52,20,10); ctx.fill();
      ctx.fillStyle="#fff";
      ctx.font="1100 10px system-ui";
      ctx.fillText(open?"OPEN":"SOON", p.x+p.w-36, p.y+20);
      ctx.restore();
    }

    /* ----------------------- Character: Gundam Armor + Fix head/body gap + center lock ----------------------- */
    function drawHeroGear(dir, swing){
      const metalDark = "#161920";
      const metalMid  = "#2a2f3b";
      const panel = "#d7dde8";
      const red = "#ff2d55";
      const blue = "#0a84ff";
      const gold = "#ffcc00";

      const armor = equippedItem("armor");
      const uA = upgradeFxMul("armor");
      if (armor){
        // gundam torso plate
        ctx.save();

        // core plate
        const cg = ctx.createLinearGradient(-16, 0, 16, 22);
        cg.addColorStop(0, panel);
        cg.addColorStop(0.55, "rgba(255,255,255,0.55)");
        cg.addColorStop(1, "rgba(10,14,24,0.22)");
        ctx.globalAlpha = 0.98;
        ctx.fillStyle = cg;
        rr(ctx,-16,0,32,22,10); ctx.fill();

        // inner dark frame
        ctx.globalAlpha = 0.96;
        ctx.fillStyle = metalDark;
        rr(ctx,-13,3,26,16,9); ctx.fill();

        // gundam chest "vents"
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        rr(ctx,-10,7,8,4,2); ctx.fill();
        rr(ctx,2,7,8,4,2); ctx.fill();

        // center V-fin plate 느낌(가슴)
        ctx.globalAlpha = 0.95;
        ctx.fillStyle = red;
        ctx.beginPath();
        ctx.moveTo(0,4);
        ctx.lineTo(4,10);
        ctx.lineTo(0,16);
        ctx.lineTo(-4,10);
        ctx.closePath();
        ctx.fill();

        // shoulder armor blocks
        ctx.globalAlpha = 0.98;
        ctx.fillStyle = panel;
        rr(ctx,-24,3,10,14,7); ctx.fill();
        rr(ctx,14,3,10,14,7); ctx.fill();
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = metalMid;
        rr(ctx,-22,6,6,8,5); ctx.fill();
        rr(ctx,16,6,6,8,5); ctx.fill();

        // glowing lines by upgrade
        const rrA = rarityOf("armor");
        const tt = performance.now()/1000;
        const pulse = 0.55 + 0.45*Math.sin(tt*3.0);
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = (rrA.glow * 0.55) * uA * pulse;
        ctx.strokeStyle = rrA.colA;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(-8,14); ctx.lineTo(0,20); ctx.lineTo(8,14);
        ctx.stroke();
        ctx.globalAlpha = (0.18) * uA * pulse;
        ctx.strokeStyle = rrA.colB;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(-12,2); ctx.lineTo(12,2);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";

        ctx.restore();
      }

      // shield
      const sh = equippedItem("shield");
      if (sh){
        const shieldSide = (dir==="left") ? -1 : 1;
        const rrSh = RARITY[sh.rarity] || RARITY.Common;
        const uS = upgradeFxMul("shield");

        ctx.save();
        ctx.translate(22*shieldSide, 18);
        ctx.rotate(0.12*shieldSide);

        function shieldPath(){
          ctx.beginPath();
          ctx.moveTo(0,-12);
          ctx.quadraticCurveTo(14,-12,14,-2);
          ctx.lineTo(14,10);
          ctx.quadraticCurveTo(14,20,0,24);
          ctx.quadraticCurveTo(-14,20,-14,10);
          ctx.lineTo(-14,-2);
          ctx.quadraticCurveTo(-14,-12,0,-12);
          ctx.closePath();
        }

        const sg = ctx.createLinearGradient(-14,-12,14,24);
        sg.addColorStop(0, metalMid);
        sg.addColorStop(0.6, metalDark);
        sg.addColorStop(1, "rgba(10,14,24,0.22)");
        ctx.fillStyle = sg;
        shieldPath(); ctx.fill();

        ctx.globalCompositeOperation = "lighter";
        const tt = performance.now()/1000;
        const pulse = 0.55 + 0.45*Math.sin(tt*3.0);
        ctx.globalAlpha = rrSh.glow * 0.85 * uS * pulse;
        ctx.strokeStyle = rrSh.colA;
        ctx.lineWidth = 4 + (upgradeLevel.shield||0);
        shieldPath(); ctx.stroke();

        ctx.globalAlpha = 0.22 * uS * pulse;
        ctx.fillStyle = rrSh.colB;
        ctx.beginPath(); ctx.arc(0,6,26 + (upgradeLevel.shield||0)*6,0,Math.PI*2); ctx.fill();
        ctx.globalCompositeOperation = "source-over";

        ctx.globalAlpha = 0.95;
        ctx.fillStyle = gold;
        ctx.beginPath(); ctx.arc(0,6,3.8,0,Math.PI*2); ctx.fill();

        ctx.restore();
      }

      // sword
      const sw = equippedItem("sword");
      if (sw){
        const swordSide = (dir==="left") ? -1 : 1;
        const rrSw = RARITY[sw.rarity] || RARITY.Common;
        const uW = upgradeFxMul("sword");

        ctx.save();
        ctx.translate(-22*swordSide, 18 - swing*1.6);
        ctx.rotate((-0.42*swordSide) + swing*0.11);

        const tt = performance.now()/1000;
        const pulse = 0.55 + 0.45*Math.sin(tt*3.6);

        // big glow core
        ctx.globalCompositeOperation = "lighter";
        const ag = ctx.createRadialGradient(0,-14,2,0,-14,30 + (upgradeLevel.sword||0)*8);
        ag.addColorStop(0, `rgba(255,80,140,${rrSw.glow*0.55*uW*pulse})`);
        ag.addColorStop(0.35, `rgba(120,210,255,${rrSw.glow*0.70*uW*pulse})`);
        ag.addColorStop(1, "rgba(120,200,255,0)");
        ctx.fillStyle = ag;
        ctx.beginPath();
        ctx.ellipse(0,-14,12,30 + (upgradeLevel.sword||0)*5,0,0,Math.PI*2);
        ctx.fill();

        // sparkle stream
        const sparkleN = (sw.rarity==="Mythic" ? 22 : 16) + (upgradeLevel.sword||0)*6;
        for (let i=0;i<sparkleN;i++){
          const u = i/Math.max(1,(sparkleN-1));
          const y = ( -28 + (34*u) ) + Math.sin(tt*3.2 + i*1.7)*1.6;
          const x = Math.sin(tt*2.6 + i*2.3)*2.4;
          const r = 1.2 + (Math.sin(tt*6.1 + i*4.9)*0.5+0.5)*2.0*uW;
          const gg = ctx.createRadialGradient(x,y,0,x,y,r*7.2);
          gg.addColorStop(0, `rgba(255,255,255,${0.90*pulse})`);
          gg.addColorStop(0.25, `rgba(180,240,255,${0.40*pulse})`);
          gg.addColorStop(0.65, `rgba(255,45,85,${0.18*pulse})`);
          gg.addColorStop(1, "rgba(255,45,85,0)");
          ctx.fillStyle = gg;
          ctx.beginPath(); ctx.arc(x,y,r*7.2,0,Math.PI*2); ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";

        // blade
        const bladeGrad = ctx.createLinearGradient(0,-30,0,6);
        bladeGrad.addColorStop(0,"#f4f7ff");
        bladeGrad.addColorStop(0.65,"#c8cfdb");
        bladeGrad.addColorStop(1,"rgba(10,14,24,0.22)");
        ctx.fillStyle = bladeGrad;
        rr(ctx,-2.7,-30,5.4,32,2.7); ctx.fill();

        // rune line
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = red;
        rr(ctx,-0.9,-20,1.8,12,1); ctx.fill();
        ctx.globalAlpha = 1;

        // hilt
        ctx.fillStyle = gold;
        rr(ctx,-7,1,14,4,2); ctx.fill();
        ctx.fillStyle = "rgba(10,14,24,0.82)";
        rr(ctx,-2,5,4,11,2); ctx.fill();

        ctx.restore();
      }
    }

    function drawMinifigHero(){
      const moving = player.moving;
      const bob = moving ? Math.sin(player.bobT)*0.16 : 0; // 과도한 흔들림 줄임
      const dir = player.dir;
      const swing = moving ? Math.sin(player.animT*10) : 0;
      const side = (dir==="left"||dir==="right");

      // shadow
      ctx.save();
      ctx.globalAlpha = 0.24;
      ctx.fillStyle = "rgba(10,14,24,0.42)";
      ctx.beginPath();
      ctx.ellipse(player.x, player.y+28, 20, 7, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(player.x, player.y + bob);
      if (dir==="left") ctx.scale(-1,1);

      const skin = heroStyle.skin;
      const torsoCol = heroStyle.torso;
      const pants = heroStyle.pants;
      const hat = heroStyle.hat;
      const outline = "rgba(0,0,0,0.18)";

      // ✅ 얼굴/몸 갭 제거: head를 2px 내리고 torso를 2px 올려 붙임
      // head
      const headG = ctx.createRadialGradient(-6,-22,6,0,-18,20);
      headG.addColorStop(0,"rgba(255,214,107,1)");
      headG.addColorStop(1,"rgba(242,188,70,1)");
      ctx.fillStyle = headG;
      rr(ctx,-14,-34+2,28,24,10); ctx.fill();
      ctx.strokeStyle = outline;
      ctx.lineWidth = 2;
      rr(ctx,-14,-34+2,28,24,10); ctx.stroke();

      // helmet / hat
      if (equippedItem("helmet")){
        const helm = equippedItem("helmet");
        const rrH = RARITY[helm.rarity] || RARITY.Common;
        const uH = upgradeFxMul("helmet");
        const black1 = "#1a1d24", black2="#2a2f3b", bone="#e9e2d2";

        const hg = ctx.createLinearGradient(-16,-36+2,16,-14+2);
        hg.addColorStop(0,black2); hg.addColorStop(0.7,black1); hg.addColorStop(1,"rgba(10,14,24,0.25)");
        ctx.fillStyle = hg;
        rr(ctx,-16,-36+2,32,18,10); ctx.fill();

        ctx.globalAlpha = 0.95;
        ctx.fillStyle = "#ff2d55";
        rr(ctx,-2.2,-36+2,4.4,18,2.2); ctx.fill();
        ctx.globalAlpha = 1;

        // horns
        ctx.fillStyle = bone;
        ctx.save();
        ctx.translate(-15,-30+2); ctx.rotate(-0.25);
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.quadraticCurveTo(-12,-6,-14,-20);
        ctx.quadraticCurveTo(-8,-16,2,-10);
        ctx.quadraticCurveTo(-2,-6,0,0);
        ctx.closePath(); ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(15,-30+2); ctx.rotate(0.25);
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.quadraticCurveTo(12,-6,14,-20);
        ctx.quadraticCurveTo(8,-16,-2,-10);
        ctx.quadraticCurveTo(2,-6,0,0);
        ctx.closePath(); ctx.fill();
        ctx.restore();

        // horn glow + upgrade
        const tt = performance.now()/1000;
        const pulse = 0.55 + 0.45*Math.sin(tt*3.2);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        function tipGlow(tx,ty){
          const g = ctx.createRadialGradient(tx,ty,0,tx,ty,22 + (upgradeLevel.helmet||0)*6);
          g.addColorStop(0, `rgba(180,240,255,${Math.min(0.90,0.45+rrH.glow)*uH*pulse})`);
          g.addColorStop(0.35, `rgba(120,210,255,${rrH.glow*0.60*uH*pulse})`);
          g.addColorStop(1, "rgba(120,210,255,0)");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(tx,ty,22 + (upgradeLevel.helmet||0)*6,0,Math.PI*2); ctx.fill();

          const n = 10 + (upgradeLevel.helmet||0)*6;
          for (let i=0;i<n;i++){
            const a = (i/n)*Math.PI*2 + tt*0.8;
            const rr0 = 10 + (Math.sin(tt*2.4+i*11.7)*0.5+0.5)*12*(0.8+rrH.glow)*uH;
            const px = tx + Math.cos(a)*rr0;
            const py = ty + Math.sin(a)*rr0;
            const r = 1.2 + (Math.sin(tt*6.0+i*9.1)*0.5+0.5)*2.0*uH;
            const pg = ctx.createRadialGradient(px,py,0,px,py,r*5.0);
            pg.addColorStop(0, `rgba(255,255,255,${0.85*pulse})`);
            pg.addColorStop(0.25, `rgba(170,235,255,${0.35*pulse})`);
            pg.addColorStop(1, "rgba(170,235,255,0)");
            ctx.fillStyle = pg;
            ctx.beginPath(); ctx.arc(px,py,r*5.0,0,Math.PI*2); ctx.fill();
          }
        }
        tipGlow(-28,-48+2);
        tipGlow(28,-48+2);
        ctx.restore();

      } else {
        ctx.fillStyle = hat;
        rr(ctx,-14,-36+2,28,12,10); ctx.fill();
        ctx.globalAlpha = 0.14;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        rr(ctx,-10,-34+2,20,5,8); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // face
      ctx.fillStyle = "rgba(10,14,24,0.74)";
      if (dir==="down"){
        ctx.beginPath(); ctx.arc(-5,-20+2,2.2,0,Math.PI*2); ctx.arc(5,-20+2,2.2,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle = "rgba(10,14,24,0.62)";
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0,-16+2,6,0,Math.PI); ctx.stroke();
      } else if (dir==="up"){
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = "rgba(10,14,24,0.78)";
        rr(ctx,-9,-24+2,18,10,6); ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        ctx.beginPath(); ctx.arc(0,-20+2,2.4,0,Math.PI*2); ctx.fill();
      }

      const armSwing = swing*2.0;
      const legSwing = swing*1.6;

      // body (토르소를 2px 위로)
      if (!side){
        ctx.fillStyle = torsoCol;
        rr(ctx,-12,-6,24,28,12); ctx.fill();
        glossy(ctx,-12,-6,24,28,0.10);

        // arms
        ctx.fillStyle = torsoCol;
        rr(ctx,-22,0,10,18,8); ctx.fill();
        rr(ctx,12,0,10,18,8); ctx.fill();
        ctx.fillStyle = skin;
        rr(ctx,-22,14+armSwing,10,8,6); ctx.fill();
        rr(ctx,12,14-armSwing,10,8,6); ctx.fill();

        // legs
        ctx.fillStyle = pants;
        rr(ctx,-12,20,11,16,6); ctx.fill();
        rr(ctx,1,20,11,16,6); ctx.fill();

        ctx.fillStyle = "rgba(10,14,24,0.82)";
        ctx.beginPath();
        ctx.ellipse(-6,38+legSwing,6.4,3.1,0,0,Math.PI*2);
        ctx.ellipse(6,38-legSwing,6.4,3.1,0,0,Math.PI*2);
        ctx.fill();

        drawHeroGear(dir, swing);
      } else {
        ctx.fillStyle = torsoCol;
        rr(ctx,-9,-6,18,28,12); ctx.fill();
        glossy(ctx,-9,-6,18,28,0.10);

        ctx.globalAlpha = 0.22;
        ctx.fillStyle = "rgba(0,0,0,0.20)";
        rr(ctx,-16,2,8,14,8); ctx.fill();
        ctx.globalAlpha = 1;

        ctx.fillStyle = torsoCol;
        rr(ctx,9,1,10,18,8); ctx.fill();
        ctx.fillStyle = skin;
        rr(ctx,9,13+armSwing,10,8,6); ctx.fill();

        // ✅ 옆모습 다리 중앙
        ctx.fillStyle = pants;
        rr(ctx,-6,20,12,16,6); ctx.fill();
        ctx.fillStyle = "rgba(10,14,24,0.82)";
        ctx.beginPath(); ctx.ellipse(0,38+legSwing,6.6,3.1,0,0,Math.PI*2); ctx.fill();

        drawHeroGear(dir, swing);
      }

      // 강화 오라(갑옷/무기 강화 단계에 따라)
      const aura = Math.max(upgradeLevel.sword||0, upgradeLevel.armor||0, upgradeLevel.helmet||0, upgradeLevel.shield||0);
      if (aura > 0){
        const rrA = rarityOf("sword");
        const tt = performance.now()/1000;
        const pulse = 0.55 + 0.45*Math.sin(tt*2.8);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const r = 26 + aura*10;
        const g = ctx.createRadialGradient(0,10,0,0,10,r);
        g.addColorStop(0, `rgba(255,255,255,${0.18*pulse})`);
        g.addColorStop(0.25, rrA.colB);
        g.addColorStop(0.65, rrA.colA);
        g.addColorStop(1, "rgba(120,210,255,0)");
        ctx.globalAlpha = 0.55 * pulse;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0,10,r,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }

    function drawMonster(m,t){
      ctx.save();
      ctx.translate(m.x, m.y);

      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "rgba(10,14,24,0.52)";
      ctx.beginPath();
      ctx.ellipse(0,22,m.r*1.1,m.r*0.42,0,0,Math.PI*2);
      ctx.fill();

      const elite = m.kind==="elite";
      const base = elite ? "rgba(255,45,85,0.92)" : "rgba(52,199,89,0.92)";
      const edge = elite ? "rgba(255,204,0,0.40)" : "rgba(255,255,255,0.22)";
      ctx.globalAlpha = 1;
      ctx.fillStyle = base;
      rr(ctx,-m.r,-m.r,m.r*2,m.r*2,14); ctx.fill();

      if (m.hit>0){
        ctx.globalAlpha = 0.35*(m.hit/0.12);
        ctx.fillStyle="rgba(255,255,255,0.92)";
        rr(ctx,-m.r,-m.r,m.r*2,m.r*2,14); ctx.fill();
      }

      ctx.globalAlpha = 0.92;
      ctx.fillStyle="rgba(10,14,24,0.80)";
      ctx.beginPath(); ctx.arc(-6,-4,2.6,0,Math.PI*2); ctx.arc(6,-4,2.6,0,Math.PI*2); ctx.fill();

      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = edge;
      ctx.lineWidth = 3;
      rr(ctx,-m.r,-m.r,m.r*2,m.r*2,14); ctx.stroke();

      const w=m.r*2, hpw=w*clamp(m.hp/m.maxHp,0,1);
      ctx.globalAlpha=0.88;
      ctx.fillStyle="rgba(10,14,24,0.22)";
      rr(ctx,-m.r,-m.r-12,w,6,6); ctx.fill();
      ctx.fillStyle= elite ? "rgba(255,204,0,0.92)" : "rgba(255,255,255,0.92)";
      rr(ctx,-m.r,-m.r-12,hpw,6,6); ctx.fill();

      ctx.restore();
    }

    function drawEffect(e){
      const k=e.t/e.life;
      const inv=1-k;
      if (e.type==="spark"){
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.globalCompositeOperation="lighter";
        const r=26*inv*(e.size||1);
        const g=ctx.createRadialGradient(0,0,0,0,0,r);
        g.addColorStop(0,e.colA);
        g.addColorStop(0.35,e.colB);
        g.addColorStop(1,"rgba(255,255,255,0)");
        ctx.globalAlpha=0.95*inv;
        ctx.fillStyle=g;
        ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.fill();
        ctx.restore();
      } else if (e.type==="slash"){
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.globalCompositeOperation="lighter";
        const ang=(e.dir==="left")?Math.PI:(e.dir==="right")?0:(e.dir==="up")?-Math.PI/2:Math.PI/2;
        ctx.rotate(ang);
        ctx.globalAlpha=0.9*inv;
        const w=72*(0.65+0.35*inv)*(0.85+0.25*(e.uMul||1));
        const h=18+(e.power||20)*0.12*(0.85+0.25*(e.uMul||1));
        const g=ctx.createLinearGradient(-w/2,0,w/2,0);
        g.addColorStop(0,"rgba(255,255,255,0)");
        g.addColorStop(0.5,e.colA);
        g.addColorStop(1,"rgba(255,255,255,0)");
        ctx.fillStyle=g;
        rr(ctx,-w/2,-h/2,w,h,16); ctx.fill();
        ctx.globalAlpha=0.35*inv;
        ctx.strokeStyle=e.colB;
        ctx.lineWidth=4;
        rr(ctx,-w/2,-h/2,w,h,16); ctx.stroke();
        ctx.restore();
      } else if (e.type==="num"){
        ctx.save();
        ctx.translate(e.x, e.y-16*k);
        ctx.globalAlpha=0.95*inv;
        ctx.fillStyle=e.col;
        ctx.font="1200 14px system-ui";
        ctx.textAlign="center"; ctx.textBaseline="middle";
        ctx.fillText(e.txt,0,0);
        ctx.restore();
      } else if (e.type==="ring"){
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.globalCompositeOperation="lighter";
        const rr0 = lerp(e.r0, e.r1, k);
        const g = ctx.createRadialGradient(0,0,rr0*0.2,0,0,rr0);
        g.addColorStop(0, e.colA);
        g.addColorStop(0.35, e.colB);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.globalAlpha = 0.65*inv;
        ctx.strokeStyle = g;
        ctx.lineWidth = 6*inv;
        ctx.beginPath(); ctx.arc(0,0,rr0,0,Math.PI*2); ctx.stroke();
        ctx.restore();
      }
    }

    function drawHUD(){
      ctx.save();
      ctx.globalAlpha=0.92;
      ctx.fillStyle="rgba(255,255,255,0.84)";
      ctx.strokeStyle="rgba(0,0,0,0.10)";
      ctx.lineWidth=2;
      rr(ctx,16,VIEW.h-62,340,46,18); ctx.fill(); ctx.stroke();

      ctx.fillStyle="rgba(10,14,24,0.86)";
      ctx.font="1200 14px system-ui";
      ctx.textAlign="left"; ctx.textBaseline="middle";
      ctx.fillText("LEGO HUB", 34, VIEW.h-39);

      const bw=140,bh=10,bx=160,by=VIEW.h-48;
      ctx.globalAlpha=0.65;
      ctx.fillStyle="rgba(10,14,24,0.20)";
      rr(ctx,bx,by,bw,bh,8); ctx.fill();
      ctx.globalAlpha=0.92;
      ctx.fillStyle="rgba(255,59,48,0.90)";
      rr(ctx,bx,by,bw*clamp(combat.hp/combat.maxHp,0,1),bh,8); ctx.fill();

      ctx.globalAlpha=0.58;
      ctx.font="1000 12px system-ui";
      ctx.fillStyle="rgba(10,14,24,0.70)";
      ctx.fillText("Enter/E: Portal · I: Inventory · C: Customize · Space/F: Attack", 34, VIEW.h-22);
      ctx.restore();
    }

    function drawMiniMap(){
      const pad=16, mw=220, mh=160;
      const x=VIEW.w-mw-pad, y=16;

      ctx.save();
      ctx.globalAlpha=0.92;
      ctx.fillStyle="rgba(255,255,255,0.78)";
      ctx.strokeStyle="rgba(0,0,0,0.10)";
      ctx.lineWidth=2;
      rr(ctx,x,y,mw,mh,18); ctx.fill(); ctx.stroke();

      const ix=x+10, iy=y+10, iw=mw-20, ih=mh-20;
      ctx.save();
      rr(ctx,ix,iy,iw,ih,14); ctx.clip();

      const s=Math.min(iw/WORLD.w, ih/WORLD.h);
      const ox=ix+(iw-WORLD.w*s)*0.5;
      const oy=iy+(ih-WORLD.h*s)*0.5;
      const mx=(wx)=>ox+wx*s;
      const my=(wy)=>oy+wy*s;

      ctx.globalAlpha=0.55;
      ctx.fillStyle="rgba(38,44,55,0.85)";
      for (const r of roads){ rr(ctx,mx(r.x),my(r.y),r.w*s,r.h*s,8); ctx.fill(); }

      ctx.globalAlpha=0.28;
      ctx.fillStyle="#0a84ff"; rr(ctx,mx(ZONES.game.x),my(ZONES.game.y),ZONES.game.w*s,ZONES.game.h*s,8); ctx.fill();
      ctx.fillStyle="#34c759"; rr(ctx,mx(ZONES.community.x),my(ZONES.community.y),ZONES.community.w*s,ZONES.community.h*s,8); ctx.fill();
      ctx.fillStyle="#ff2d55"; rr(ctx,mx(ZONES.ads.x),my(ZONES.ads.y),ZONES.ads.w*s,ZONES.ads.h*s,8); ctx.fill();

      ctx.globalAlpha=1;
      const px=mx(player.x), py=my(player.y);
      ctx.fillStyle="rgba(10,132,255,0.98)";
      ctx.beginPath(); ctx.arc(px,py,5.4,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=0.22;
      ctx.beginPath(); ctx.arc(px,py,11,0,Math.PI*2); ctx.fill();

      ctx.restore();
      ctx.restore();
    }

    /* ----------------------- Update ----------------------- */
    function update(dt){
      if (toastT > 0){
        toastT -= dt;
        if (toastT <= 0) UI.toast.hidden = true;
      }

      let ax=0, ay=0;
      if (!modalState.open && !invState.open && !cusState.open){
        if (keys.has("a") || keys.has("arrowleft")) ax -= 1;
        if (keys.has("d") || keys.has("arrowright")) ax += 1;
        if (keys.has("w") || keys.has("arrowup")) ay -= 1;
        if (keys.has("s") || keys.has("arrowdown")) ay += 1;

        if (isTouch()){
          ax += UI.joyState.ax;
          ay += UI.joyState.ay;
        }

        const l = Math.hypot(ax,ay);
        if (l > 0.01){
          player.moving = true;
          const vx = (ax/l)*player.speed*dt;
          const vy = (ay/l)*player.speed*dt;
          player.x += vx; player.y += vy;
          clampPlayer();
          updateDir(vx,vy);
          player.animT += dt;
          player.bobT += dt*7.2;
        } else player.moving = false;
      }

      // camera
      cam.tx = player.x - (VIEW.w/VIEW.zoom)/2;
      cam.ty = player.y - (VIEW.h/VIEW.zoom)/2;
      cam.x = lerp(cam.x, cam.tx, 1 - Math.pow(0.0001, dt));
      cam.y = lerp(cam.y, cam.ty, 1 - Math.pow(0.0001, dt));
      cam.x = clamp(cam.x, 0, Math.max(0, WORLD.w - (VIEW.w/VIEW.zoom)));
      cam.y = clamp(cam.y, 0, Math.max(0, WORLD.h - (VIEW.h/VIEW.zoom)));

      activePortal = null;
      for (const p of portals){
        const cx = p.x + p.w/2, cy = p.y + p.h;
        if (Math.hypot(cx-player.x, cy-player.y) < 120){ activePortal = p; break; }
      }

      updateCombat(dt);
    }

    /* ----------------------- Draw (월드 변환 1회만 적용) ----------------------- */
    function draw(t){
      drawBackground();

      // world transform ONCE
      ctx.save();
      ctx.scale(VIEW.zoom, VIEW.zoom);
      ctx.translate(-cam.x, -cam.y);

      for (const s of sidewalks) drawSidewalk(s);
      for (const r of roads) drawRoad(r);

      // sort by foot Y
      const ents = [];
      for (const b of buildings) ents.push({ kind:"building", ref:b, y:b.y+b.h });
      for (const l of lamps) ents.push({ kind:"lamp", ref:l, y:l.y+68*l.s });
      for (const m of monsters) ents.push({ kind:m.kind, ref:m, y:m.y+26 });
      ents.push({ kind:"player", ref:null, y:player.y+30 });
      ents.sort((a,b)=>a.y-b.y);

      for (const e of ents){
        if (e.kind==="building") drawBuilding(e.ref);
        else if (e.kind==="lamp") drawLamp(e.ref,t);
        else if (e.kind==="mob" || e.kind==="elite") drawMonster(e.ref,t);
        else if (e.kind==="player") drawMinifigHero();
      }

      // zone outlines
      ctx.save();
      ctx.globalAlpha=0.13;
      ctx.strokeStyle="#0a84ff"; ctx.lineWidth=6;
      rr(ctx,ZONES.game.x,ZONES.game.y,ZONES.game.w,ZONES.game.h,32); ctx.stroke();
      ctx.strokeStyle="#34c759";
      rr(ctx,ZONES.community.x,ZONES.community.y,ZONES.community.w,ZONES.community.h,32); ctx.stroke();
      ctx.strokeStyle="#ff2d55";
      rr(ctx,ZONES.ads.x,ZONES.ads.y,ZONES.ads.w,ZONES.ads.h,32); ctx.stroke();
      ctx.restore();

      drawGate(ZONES.game,t);
      drawGate(ZONES.community,t);
      drawGate(ZONES.ads,t);

      for (const ef of effects) drawEffect(ef);

      ctx.restore(); // world transform off

      drawHUD();
      drawMiniMap();

      UI.coord.textContent = `x:${player.x.toFixed(0)} y:${player.y.toFixed(0)}  kills:${combat.kills}  core:${combat.core}`;
    }

    /* ----------------------- Portal click & double tap ----------------------- */
    let lastTap=0;
    canvas.addEventListener("pointerdown", (e) => {
      const w = pointerToWorld(e.clientX, e.clientY);

      if (activePortal && !modalState.open && !invState.open && !cusState.open) {
        const z = (["avoid","archery","janggi","omok","snow","jump"].includes(activePortal.key)) ? ZONES.game
                : (["twitter","telegram","wallet","market","support"].includes(activePortal.key)) ? ZONES.community
                : ZONES.ads;
        const ent = z.entrance;
        if (ent && w.x >= ent.x-20 && w.x <= ent.x+ent.w+20 && w.y >= ent.y-20 && w.y <= ent.y+ent.h+20) {
          openPortalUI(activePortal);
        }
      }

      if (isTouch() && modalState.open && modalState.portal) {
        const now = performance.now();
        if (now - lastTap < 320) confirmEnter(modalState.portal);
        lastTap = now;
      }
    }, { passive: true });

    /* ----------------------- Loop ----------------------- */
    let last = performance.now();
    let acc=0, frames=0;

    function loop(now){
      const dt = Math.min(0.033, (now-last)/1000);
      last = now;

      try {
        update(dt);
        draw(now/1000);

        acc += dt; frames++;
        if (acc > 0.35){
          UI.fps.textContent = `${Math.round(frames/acc)} FPS`;
          acc = 0; frames = 0;
        }
      } catch (err) {
        console.error(err);
        UI.toast.hidden=false;
        UI.toast.textContent = `JS 에러: ${String(err).slice(0,160)}`;
      }
      requestAnimationFrame(loop);
    }

    // close overlay hooks
    UI.invCloseBtn?.addEventListener?.("click", () => toggleInventory(false));

    // inventory close
    UI.inv.addEventListener("inventory_close_request", () => toggleInventory(false));

    // customize close
    UI.cus.addEventListener("customize_close_request", () => toggleCustomize(false));

    resize();
    renderInventory();
    requestAnimationFrame(loop);
  });
})();

                          
