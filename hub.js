/* HUN.JS - LEGO PREMIUM (single-file) v2.2 (FULL)
 * 반영된 수정사항
 * 1) 캐릭터 옆모습 자연스럽게(측면 실루엣/팔·다리 오클루전/얼굴/발)
 * 2) 병원/약국 등 건물 간판 글씨 크게 + 블록 스타일(촌스러운 테두리 제거)
 * 3) 맥도날드/병원/약국: 건물 앞 NPC 대신 로고(아이콘) 표시 + 간판에도 좌측 로고
 * 4) 가로등 30% 제거, 꽃 30% 제거, 나무가 건물 가리지 않도록(건물 주변 배치 금지)
 * 5) 건물이 차도로 위에 있지 않게(특히 양궁/눈굴리기) + 자동 회피 배치
 * 6) 맵 확장 + 도로 더 많이 + 신호등 추가
 * 7) 돌아다니는 NPC 약 20명 추가(랜덤 워킹)
 * 8) 모바일에서 오픈 URL 건물도 “입장” 모달이 항상 뜨도록(터치로도 확인/진입)
 * 9) 좌측 큰 흰 배경(토스트) 제거 → 중앙 상단에 글자만 블록 스타일
 * 10) 모바일 방향키 누름 시 드래그/선택되는 현상 방지(패시브 해제/선택 차단)
 * 11) 전체적으로 고급스러운 톤/섀도/하이라이트 개선
 *
 * 캐릭터 이미지를 쓰고 싶다면:
 * - 아래 SPRITE_SRC 에 PNG URL(또는 data:image/png;base64,...)을 넣으면 자동으로 스프라이트 사용
 * - 미지정이면 LEGO 미니피규어로 렌더링합니다.
 */

(() => {
  "use strict";

  /* ----------------------- CONFIG ----------------------- */
  const SPRITE_SRC = ""; // 예: "https://example.com/character.png" 또는 "data:image/png;base64,...."
  const USE_SPRITE_IF_LOADED = true;

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

  // deterministic RNG
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
    canvas.style.userSelect = "none";
    canvas.style.webkitUserSelect = "none";
    canvas.style.imageRendering = "auto"; // ✅ 혹시라도 pixelated/crisp-edges 잡혀있으면 해제

    // ✅ 토스트: 좌측 큰 흰 배경 제거 -> 중앙 상단 글자 블록만
    const toast = ensureEl("toast", "div");
    toast.style.position = "fixed";
    toast.style.left = "50%";
    toast.style.top = "18px";
    toast.style.transform = "translateX(-50%)";
    toast.style.zIndex = "9999";
    toast.style.padding = "0";
    toast.style.borderRadius = "0";
    toast.style.background = "transparent";
    toast.style.border = "none";
    toast.style.boxShadow = "none";
    toast.style.font = "1000 13px system-ui";
    toast.style.color = "rgba(10,18,30,0.92)";
    toast.style.maxWidth = "min(520px, calc(100vw - 28px))";
    toast.style.textAlign = "center";
    toast.style.pointerEvents = "none";
    toast.hidden = true;

    const coord = ensureEl("coord", "div");
    coord.style.position = "fixed";
    coord.style.left = "24px";
    coord.style.top = "24px";
    coord.style.zIndex = "9999";
    coord.style.padding = "8px 10px";
    coord.style.borderRadius = "12px";
    coord.style.background = "rgba(255,255,255,0.82)";
    coord.style.border = "1px solid rgba(0,0,0,0.10)";
    coord.style.font = "900 12px system-ui";
    coord.style.color = "rgba(10,18,30,0.80)";
    coord.style.backdropFilter = "blur(6px)";

    const fps = ensureEl("fps", "div");
    fps.style.position = "fixed";
    fps.style.left = "140px";
    fps.style.top = "24px";
    fps.style.zIndex = "9999";
    fps.style.padding = "8px 10px";
    fps.style.borderRadius = "12px";
    fps.style.background = "rgba(255,255,255,0.82)";
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
    modalInner.style.width = "min(640px, calc(100vw - 40px))";
    modalInner.style.borderRadius = "0";
    modalInner.style.background = "transparent";
    modalInner.style.border = "none";
    modalInner.style.boxShadow = "none";
    modalInner.style.padding = "0";
    modalInner.style.textAlign = "center";
    modalInner.style.font = "1100 18px system-ui";
    modalInner.style.color = "rgba(10,18,30,0.92)";
    modalInner.style.userSelect = "none";
    modalInner.style.webkitUserSelect = "none";

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

    // ✅ 모바일 길게 누르면 드래그되는 현상 방지: passive:false + preventDefault + pointer capture
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

  /* ----------------------- Start ----------------------- */
  window.addEventListener("DOMContentLoaded", () => {
    const UI = ensureUI();
    const canvas = UI.canvas;
    const ctx = canvas.getContext("2d", { alpha: true });

    let W = 0, H = 0, DPR = 1;

    const VIEW = { zoom: 0.86, w: 0, h: 0 };
    const WORLD = { w: 3000, h: 2200, margin: 140 };

    const cam = { x: 0, y: 0, targetX: 0, targetY: 0 };
    function screenToWorld(sx, sy) { return { x: sx + cam.x, y: sy + cam.y }; }

    /* ----------------------- Optional character sprite ----------------------- */
    const sprite = {
      img: null,
      loaded: false,
      w: 1,
      h: 1
    };
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

    /* ----------------------- Roads / Sidewalks / Crossings / Signals ----------------------- */
    const roads = [];
    const sidewalks = [];
    const crossings = [];
    const signals = []; // traffic lights

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
      { key: "pharmacy", label: "약국", status: "soon", url: "", type: "pharmacy", size: "M", x: 0, y: 0, w: 0, h: 0 },
      { key: "chicken", label: "치킨집", status: "soon", url: "", type: "chicken", size: "M", x: 0, y: 0, w: 0, h: 0 }
    ];
    const portalsByKey = (k) => portals.find((p) => p.key === k);

    /* ----------------------- Player ----------------------- */
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
    if (isTouchDevice()) player.speed = 175; // ✅ 모바일 더 느리게

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

    function seedCars() {
      cars.length = 0;
      if (roads.length === 0) return;

      const makeCar = (r, axis) => {
        const col = CAR_COLORS[(Math.random() * CAR_COLORS.length) | 0];
        const speed = 92 + Math.random() * 110;

        if (axis === "h") {
          const lane = Math.random() < 0.5 ? 0 : 1;
          const dir = Math.random() < 0.5 ? 1 : -1;
          return {
            kind: "car", axis: "h", dir, color: col, speed,
            w: 56 + Math.random() * 20, h: 26 + Math.random() * 8,
            x: r.x + Math.random() * r.w,
            y: r.y + (lane === 0 ? r.h * 0.36 : r.h * 0.66),
            bob: Math.random() * 10,
            roadId: r._id
          };
        } else {
          const lane = Math.random() < 0.5 ? 0 : 1;
          const dir = Math.random() < 0.5 ? 1 : -1;
          return {
            kind: "car", axis: "v", dir, color: col, speed,
            w: 26 + Math.random() * 8, h: 60 + Math.random() * 20,
            x: r.x + (lane === 0 ? r.w * 0.36 : r.w * 0.66),
            y: r.y + Math.random() * r.h,
            bob: Math.random() * 10,
            roadId: r._id
          };
        }
      };

      // ✅ 도로가 많아졌으니 각 도로에 적당히 배치
      for (const r of roads) {
        if (r.axis === "h") {
          const n = 3 + ((Math.random() * 2) | 0);
          for (let i = 0; i < n; i++) cars.push(makeCar(r, "h"));
        } else {
          const n = 2 + ((Math.random() * 2) | 0);
          for (let i = 0; i < n; i++) cars.push(makeCar(r, "v"));
        }
      }
    }

    /* ----------------------- Props / Signs / NPCs ----------------------- */
    const props = [];
    const signs = [];
    let portalNPCs = [];   // fixed NPC near some minigames
    let portalEmblems = []; // logo/emblem in front of every building

    // roaming NPCs
    const roamers = [];

    function rectsOverlap(a, b, pad = 0) {
      return !(
        a.x + a.w + pad < b.x - pad ||
        a.x - pad > b.x + b.w + pad ||
        a.y + a.h + pad < b.y - pad ||
        a.y - pad > b.y + b.h + pad
      );
    }

    function isOnRoadLike(x, y) {
      for (const r of roads) {
        if (x >= r.x - 18 && x <= r.x + r.w + 18 && y >= r.y - 18 && y <= r.y + r.h + 18) return true;
      }
      return false;
    }

    function isInsideBuildingBuffer(x, y) {
      // ✅ 나무가 건물 가리지 않도록: 건물 주변 넓게 금지
      for (const p of portals) {
        const pad = 120;
        if (x >= p.x - pad && x <= p.x + p.w + pad && y >= p.y - pad && y <= p.y + p.h + pad) return true;
      }
      return false;
    }

    function seedProps() {
      props.length = 0;
      signs.length = 0;
      portalNPCs = [];
      portalEmblems = [];

      const tries = 420;

      for (let i = 0; i < tries; i++) {
        const x = WORLD.margin + Math.random() * (WORLD.w - WORLD.margin * 2);
        const y = WORLD.margin + Math.random() * (WORLD.h - WORLD.margin * 2);
        if (isOnRoadLike(x, y)) continue;
        if (isInsideBuildingBuffer(x, y)) continue;

        const r = Math.random();

        // ✅ 나무/꽃/가로등 감소 (램프/꽃 30%↓)
        // 분포를 재조정: lamp/flower 비율을 확실히 낮춤
        if (r < 0.26) props.push({ kind: "tree", x, y, s: 0.90 + Math.random() * 1.05 });
        else if (r < 0.35) props.push({ kind: "lamp", x, y, s: 0.9 + Math.random() * 0.55 });   // 기존 대비 더 적게
        else if (r < 0.46) props.push({ kind: "bench", x, y, s: 0.9 + Math.random() * 0.35 });
        else props.push({ kind: "flower", x, y, s: 0.85 + Math.random() * 0.95 });               // 기존 대비 더 적게
      }

      // portal-side small decor (flowers) -> also reduced
      for (const p of portals) {
        if (Math.random() < 0.65) props.push({ kind: "flower", x: p.x + p.w * 0.20, y: p.y + p.h + 28, s: 1.1 });
        if (Math.random() < 0.65) props.push({ kind: "flower", x: p.x + p.w * 0.80, y: p.y + p.h + 18, s: 1.0 });
      }

      // guide signs
      const arch = portalsByKey("archery");
      const jang = portalsByKey("janggi");
      if (arch) signs.push({ x: arch.x + arch.w * 0.5 - 10, y: arch.y + arch.h + 90, text: "양궁 →" });
      if (jang) signs.push({ x: jang.x + jang.w * 0.5 + 10, y: jang.y + jang.h + 90, text: "← 장기" });

      // NPC + Emblems
      for (const p of portals) {
        const ex = p.x + p.w * 0.5;
        const ey = p.y + p.h * 0.92;

        // ✅ 맥도/병원/약국: 피규어 대신 로고(=emblem만)
        // ✅ 미니게임 일부만 NPC 고정 유지
        if (["archery", "janggi", "omok"].includes(p.key)) {
          portalNPCs.push({ kind: "npc", key: p.key, x: p.x + p.w + 42, y: p.y + p.h * 0.74 });
        }

        // emblem object in front
        portalEmblems.push({ kind: "emblem", key: p.key, x: ex + 38, y: ey + 18 });
      }
    }

    /* ----------------------- Roaming NPCs (20) ----------------------- */
    function seedRoamers() {
      roamers.length = 0;
      const N = 20;

      function okPos(x, y) {
        if (isOnRoadLike(x, y)) return false;
        if (isInsideBuildingBuffer(x, y)) return false;
        return true;
      }

      for (let i = 0; i < N; i++) {
        let x = 0, y = 0;
        for (let t = 0; t < 200; t++) {
          x = WORLD.margin + Math.random() * (WORLD.w - WORLD.margin * 2);
          y = WORLD.margin + Math.random() * (WORLD.h - WORLD.margin * 2);
          if (okPos(x, y)) break;
        }
        roamers.push({
          kind: "roamer",
          x, y,
          r: 16,
          speed: 95 + Math.random() * 40,
          dir: ["down", "left", "right", "up"][(Math.random() * 4) | 0],
          t: Math.random() * 10,
          tx: x,
          ty: y,
          colorIdx: (Math.random() * 6) | 0
        });
      }
    }

    function stepRoamers(dt) {
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

        // occasionally pick new target
        if (Math.hypot(n.tx - n.x, n.ty - n.y) < 12 || Math.random() < 0.004) {
          let nx = n.x, ny = n.y;
          for (let k = 0; k < 40; k++) {
            nx = clamp(n.x + (Math.random() - 0.5) * 520, WORLD.margin, WORLD.w - WORLD.margin);
            ny = clamp(n.y + (Math.random() - 0.5) * 520, WORLD.margin, WORLD.h - WORLD.margin);
            if (!isOnRoadLike(nx, ny) && !isInsideBuildingBuffer(nx, ny)) break;
          }
          n.tx = nx; n.ty = ny;
        }

        const dx = n.tx - n.x;
        const dy = n.ty - n.y;
        const len = Math.hypot(dx, dy) || 1;
        const vx = (dx / len) * n.speed;
        const vy = (dy / len) * n.speed;
        n.x += vx * dt;
        n.y += vy * dt;

        // direction
        if (Math.abs(vy) >= Math.abs(vx)) n.dir = vy < 0 ? "up" : "down";
        else n.dir = vx < 0 ? "left" : "right";

        // soft clamp
        n.x = clamp(n.x, WORLD.margin, WORLD.w - WORLD.margin);
        n.y = clamp(n.y, WORLD.margin, WORLD.h - WORLD.margin);
      }
      return palette;
    }

    /* ----------------------- Stable ground patches ----------------------- */
    let groundPatches = [];
    function buildGroundPatches() {
      const rand = mulberry32(seedFromWorld(WORLD.w, WORLD.h) ^ 0xA13F0C55);
      groundPatches = [];
      for (let i = 0; i < 18; i++) {
        groundPatches.push({
          x: WORLD.w * 0.10 + rand() * WORLD.w * 0.80,
          y: WORLD.h * 0.32 + rand() * WORLD.h * 0.60,
          rx: 60 + rand() * 160,
          ry: 18 + rand() * 52,
          rot: (rand() - 0.5) * 0.7,
          a: 0.30 + rand() * 0.14
        });
      }
    }

    /* ----------------------- Footprints ----------------------- */
    const footprints = [];
    let footStepAcc = 0;
    function addFootprint(dt) {
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
        x: player.x + ox + (Math.random() - 0.5) * 2,
        y: player.y + 30 + oy + (Math.random() - 0.5) * 2,
        life: 1.25,
        age: 0
      });
    }

    /* ----------------------- Background layers ----------------------- */
    const clouds = Array.from({ length: 12 }, () => ({
      x: Math.random() * 3600,
      y: 40 + Math.random() * 260,
      s: 0.7 + Math.random() * 1.25,
      v: 9 + Math.random() * 18,
      layer: Math.random() < 0.5 ? 0 : 1
    }));
    const birds = Array.from({ length: 7 }, () => ({ x: 0, y: 0, p: Math.random() * 10, v: 22 + Math.random() * 22 }));

    /* ----------------------- Patterns ----------------------- */
    let grassPattern = null, dirtPattern = null, roadPattern = null, sidewalkPattern = null;

    function makePattern(w, h, drawFn) {
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d");
      drawFn(g, w, h);
      return ctx.createPattern(c, "repeat");
    }

    function buildPatterns() {
      grassPattern = makePattern(480, 480, (g, w, h) => {
  g.fillStyle = "#39d975";
  g.fillRect(0, 0, w, h);

  // ✅ 약한 격자(타일감 최소)
  g.globalAlpha = 0.05;
  g.strokeStyle = "rgba(0,0,0,0.10)";
  g.lineWidth = 1;
  for (let x = 0; x <= w; x += 80) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, h);
    g.stroke();
  }
  for (let y = 0; y <= h; y += 80) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(w, y);
    g.stroke();
  }

  // ✅ 점 텍스처(잔디 느낌)
  g.globalAlpha = 0.10;
  for (let i = 0; i < 140; i++) {
    g.fillStyle = i % 3 === 0 ? "rgba(255,255,255,0.20)" : "rgba(0,0,0,0.10)";
    g.beginPath();
    g.arc(Math.random() * w, Math.random() * h, 0.8 + Math.random() * 1.6, 0, Math.PI * 2);
    g.fill();
  }

  g.globalAlpha = 1;
});

      dirtPattern = makePattern(240, 240, (g, w, h) => {
        g.fillStyle = "#c79a64";
        g.fillRect(0, 0, w, h);
        g.globalAlpha = 0.18;
        for (let i = 0; i < 220; i++) {
          g.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";
          g.beginPath();
          g.arc(Math.random() * w, Math.random() * h, 0.8 + Math.random() * 2.6, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
      });

      roadPattern = makePattern(240, 240, (g, w, h) => {
        g.fillStyle = "#262c37";
        g.fillRect(0, 0, w, h);

        g.globalAlpha = 0.12;
        g.strokeStyle = "rgba(255,255,255,0.14)";
        g.lineWidth = 2;
        for (let y = 0; y <= h; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
        g.globalAlpha = 1;

        g.globalAlpha = 0.22;
        g.fillStyle = "rgba(255,255,255,0.75)";
        for (let x = 0; x < w; x += 40) g.fillRect(x + 12, h / 2 - 2, 14, 4);
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

    function groundAO(x, y, w, h, alpha = 0.20) {
      ctx.save();
      const g = ctx.createRadialGradient(x + w * 0.5, y + h * 0.8, 10, x + w * 0.5, y + h * 0.8, Math.max(w, h) * 0.95);
      g.addColorStop(0, `rgba(10,14,24,${alpha})`);
      g.addColorStop(1, "rgba(10,14,24,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x - 140, y - 140, w + 280, h + 280);
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

    /* ----------------------- World layout (bigger + more roads) ----------------------- */
    function layoutRoadNetwork() {
      roads.length = 0;
      sidewalks.length = 0;
      crossings.length = 0;
      signals.length = 0;

      let id = 0;
      const addRoadH = (y, wFrac = 0.84, h = 124) => {
        const r = { _id: id++, axis: "h", x: WORLD.w * (1 - wFrac) * 0.5, y, w: WORLD.w * wFrac, h };
        roads.push(r);
        sidewalks.push({ x: r.x, y: r.y - 48, w: r.w, h: 38 });
        sidewalks.push({ x: r.x, y: r.y + r.h + 10, w: r.w, h: 38 });
        return r;
      };

      const addRoadV = (x, hFrac = 0.80, w = 124) => {
        const r = { _id: id++, axis: "v", x, y: WORLD.h * 0.10, w, h: WORLD.h * hFrac };
        roads.push(r);
        sidewalks.push({ x: r.x - 46, y: r.y, w: 34, h: r.h });
        sidewalks.push({ x: r.x + r.w + 12, y: r.y, w: 34, h: r.h });
        return r;
      };

      // ✅ 더 넓은 맵 + 도로 증가
      const r1 = addRoadH(WORLD.h * 0.50, 0.86, 132);
      const r2 = addRoadH(WORLD.h * 0.26, 0.78, 120);
      const r3 = addRoadH(WORLD.h * 0.74, 0.78, 120);

      const v1 = addRoadV(WORLD.w * 0.50 - 62, 0.84, 124);
      const v2 = addRoadV(WORLD.w * 0.26 - 62, 0.72, 118);
      const v3 = addRoadV(WORLD.w * 0.74 - 62, 0.72, 118);

      // crossings (at intersections)
      const makeCross = (vx, vy, vw, vh) => {
        crossings.push({ x: vx - 92, y: vy + 32, w: 184, h: 56 });
        crossings.push({ x: vx - 92, y: vy - 88, w: 184, h: 56 });
      };

      makeCross(v1.x + v1.w * 0.5, r1.y, 0, 0);
      makeCross(v1.x + v1.w * 0.5, r2.y, 0, 0);
      makeCross(v1.x + v1.w * 0.5, r3.y, 0, 0);

      // ✅ 신호등 추가(교차로 주변)
      function addSignal(x, y, dir) { signals.push({ x, y, dir, phase: Math.random() * 10 }); }
      for (const c of crossings) {
        addSignal(c.x - 14, c.y + 8, "v");
        addSignal(c.x + c.w + 14, c.y + 8, "v");
      }
    }

    function placePortalAvoidRoad(p, cx, cy) {
      // desire center; try small spiral offsets to avoid roads
      const maxTry = 80;
      const step = 22;
      let best = { x: cx, y: cy };

      const test = (centerX, centerY) => {
        const x = centerX - p.w / 2;
        const y = centerY - p.h / 2;
        const rect = { x, y, w: p.w, h: p.h };
        for (const r of roads) {
          if (rectsOverlap(rect, r, 8)) return null;
        }
        for (const s of sidewalks) {
          if (rectsOverlap(rect, s, 4)) return null;
        }
        return rect;
      };

      let rect = test(cx, cy);
      if (rect) return rect;

      for (let i = 1; i <= maxTry; i++) {
        const ang = i * 0.55;
        const rr = step * i * 0.35;
        const nx = cx + Math.cos(ang) * rr;
        const ny = cy + Math.sin(ang) * rr;
        rect = test(nx, ny);
        if (rect) return rect;
      }
      // fallback (clamp only)
      return {
        x: clamp(cx - p.w / 2, WORLD.margin, WORLD.w - WORLD.margin - p.w),
        y: clamp(cy - p.h / 2, WORLD.margin, WORLD.h - WORLD.margin - p.h),
        w: p.w, h: p.h
      };
    }

    function layoutWorld() {
      // ✅ 맵 더 넓게
      WORLD.w = Math.max(4200, Math.floor(W * 4.4));
      WORLD.h = Math.max(3000, Math.floor(H * 3.8));

      // portal sizes
      const base = 220;
      const mul = { S: 0.82, M: 1.0, L: 1.22 };
      for (const p of portals) {
        const m = mul[p.size] || 1;
        p.w = base * 1.22 * m;
        p.h = base * 0.92 * m;
      }

      buildPatterns();
      layoutRoadNetwork();

      // desired centers (updated to avoid roads esp archery/snow)
      const desired = {
        jump: { x: WORLD.w * 0.18, y: WORLD.h * 0.18 },
        archery: { x: WORLD.w * 0.66, y: WORLD.h * 0.18 }, // ✅ 도로 중앙 피함
        omok: { x: WORLD.w * 0.82, y: WORLD.h * 0.30 },

        avoid: { x: WORLD.w * 0.18, y: WORLD.h * 0.60 },
        janggi: { x: WORLD.w * 0.82, y: WORLD.h * 0.60 },
        snow: { x: WORLD.w * 0.34, y: WORLD.h * 0.84 },   // ✅ 도로/교차로 피함

        mcd: { x: WORLD.w * 0.12, y: WORLD.h * 0.36 },
        hospital: { x: WORLD.w * 0.88, y: WORLD.h * 0.40 },
        pharmacy: { x: WORLD.w * 0.88, y: WORLD.h * 0.62 },
        chicken: { x: WORLD.w * 0.12, y: WORLD.h * 0.80 }
      };

      for (const p of portals) {
        const d = desired[p.key] || { x: WORLD.w * 0.5, y: WORLD.h * 0.5 };
        const rect = placePortalAvoidRoad(p, d.x, d.y);
        p.x = clamp(rect.x, WORLD.margin, WORLD.w - WORLD.margin - p.w);
        p.y = clamp(rect.y, WORLD.margin, WORLD.h - WORLD.margin - p.h);
      }

      buildGroundPatches();
      seedCars();
      seedProps();
      seedRoamers();

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

      // ✅ 모자이크 방지 (항상 스무딩 + 고품질)
ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";
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
      const dx = cx - closestX, dy = cy - closestY;
      return dx * dx + dy * dy <= r * r;
    }

    /* ----------------------- Modal ----------------------- */
    const modalState = { open: false, portal: null };

    function blockSpan(html, opt = {}) {
      const bg = opt.bg || "rgba(10,14,24,0.84)";
      const fg = opt.fg || "rgba(255,255,255,0.98)";
      const glow = opt.glow || "rgba(126,200,255,0.45)";
      return `
        <span style="
          display:inline-block;
          padding:10px 14px;
          border-radius:16px;
          background:${bg};
          color:${fg};
          box-shadow: 0 18px 54px rgba(0,0,0,0.22);
          text-shadow: 0 0 12px ${glow};
          letter-spacing: 0.8px;
          border: 1px solid rgba(255,255,255,0.10);
        ">${html}</span>
      `;
    }

    function openModal(title, body, hint) {
      UI.modalTitle.innerHTML = blockSpan(title, { bg: "rgba(255,255,255,0.88)", fg: "rgba(10,14,24,0.92)", glow: "rgba(0,0,0,0)" });
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
      openModal(
        `🧱 ${p.label}`,
        `입장하시겠습니까?<br/><span style="opacity:.9;font-size:14px;">Enter / E</span>`,
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

    // ✅ 모바일: 모달 떠있을 때 터치 업으로도 진입
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
      ctx.ellipse(WORLD.w * 0.22, WORLD.h * 0.18, 520, 240, 0, 0, Math.PI * 2);
      ctx.ellipse(WORLD.w * 0.72, WORLD.h * 0.16, 580, 260, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = 0.28;
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
        const a = 0.13 + 0.05 * (c.layer === 0 ? 1.0 : 0.75);
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
      ctx.fillStyle = grassPattern || "#35d572";
      ctx.fillRect(0, WORLD.h * 0.30, WORLD.w, WORLD.h * 0.70);
      ctx.restore();

      ctx.save();
      const sh = ctx.createLinearGradient(0, WORLD.h * 0.30, 0, WORLD.h);
      sh.addColorStop(0, "rgba(10,14,24,0.00)");
      sh.addColorStop(1, "rgba(10,14,24,0.08)");
      ctx.fillStyle = sh;
      ctx.fillRect(0, WORLD.h * 0.30, WORLD.w, WORLD.h * 0.70);
      ctx.restore();

      // stable patches
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
        groundAO(r.x, r.y + r.h - 18, r.w, 26, 0.18);

        ctx.save();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = "rgba(255,255,255,0.32)";
        roundRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12, 44);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = roadPattern || "#262c37";
        roundRect(r.x, r.y, r.w, r.h, 40);
        ctx.fill();

        ctx.globalAlpha = 0.14;
        ctx.fillStyle = "rgba(255,255,255,0.30)";
        roundRect(r.x + 10, r.y + 10, r.w - 20, r.h * 0.26, 30);
        ctx.fill();

        // lane
        ctx.globalAlpha = 0.42;
        ctx.strokeStyle = "rgba(255,255,255,0.88)";
        ctx.lineWidth = 4;
        ctx.setLineDash([18, 16]);
        ctx.beginPath();
        if (r.axis === "h") {
          ctx.moveTo(r.x + 26, r.y + r.h / 2);
          ctx.lineTo(r.x + r.w - 26, r.y + r.h / 2);
        } else {
          ctx.moveTo(r.x + r.w / 2, r.y + 26);
          ctx.lineTo(r.x + r.w / 2, r.y + r.h - 26);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      for (const s of sidewalks) {
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
        ctx.save();
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        roundRect(c.x, c.y, c.w, c.h, 14);
        ctx.fill();

        ctx.globalAlpha = 0.90;
        for (let i = 0; i < 9; i++) {
          const yy = c.y + 6 + i * 6;
          ctx.fillStyle = i % 2 === 0 ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.08)";
          ctx.fillRect(c.x + 10, yy, c.w - 20, 4);
        }
        ctx.restore();
      }
    }

    /* ----------------------- Traffic lights ----------------------- */
    function drawSignal(s, t) {
      // simple 3-light with phase
      const phase = (t + s.phase) % 6;
      const greenOn = phase < 2.4;
      const yellowOn = phase >= 2.4 && phase < 3.2;
      const redOn = phase >= 3.2;

      ctx.save();
      ctx.translate(s.x, s.y);

      groundAO(-10, 28, 20, 10, 0.10);

      ctx.fillStyle = "rgba(40,46,58,0.92)";
      roundRect(-4, -16, 8, 48, 6);
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
          ctx.globalAlpha = 0.22;
          ctx.fillStyle = col;
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

    /* ----------------------- Palettes ----------------------- */
    function buildingPalette(type) {
      const pal = {
        arcade: { main: "#ff5aa5", accent: "#0a84ff", icon: "game" },
        tower: { main: "#7fd7ff", accent: "#ffcc00", icon: "archery" },
        dojo: { main: "#42e7a5", accent: "#ff3b30", icon: "janggi" },
        gym: { main: "#ffd66b", accent: "#0a84ff", icon: "jump" },
        igloo: { main: "#bfe9ff", accent: "#34c759", icon: "snow" },
        cafe: { main: "#b889ff", accent: "#ffcc00", icon: "omok" },

        mcd: { main: "#ff3b30", accent: "#ffcc00", icon: "mcd" },
        hospital: { main: "#ffffff", accent: "#0a84ff", icon: "hospital" },
        pharmacy: { main: "#ffffff", accent: "#34c759", icon: "pharmacy" },
        chicken: { main: "#ffd66b", accent: "#ff2d55", icon: "chicken" }
      };
      return pal[type] || pal.arcade;
    }

    function drawLogoIcon(type, x, y, size, accent) {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = "rgba(10,14,24,0.88)";
      roundRect(-size * 0.62, -size * 0.52, size * 1.24, size * 1.04, size * 0.32);
      ctx.fill();

      ctx.globalAlpha = 0.22;
      ctx.fillStyle = accent;
      roundRect(-size * 0.72, -size * 0.62, size * 1.44, size * 1.24, size * 0.36);
      ctx.fill();
      ctx.globalAlpha = 1;

      if (type === "mcd") {
        ctx.strokeStyle = "#ffcc00";
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.arc(-size * 0.18, size * 0.05, size * 0.26, Math.PI, 0);
        ctx.arc(size * 0.18, size * 0.05, size * 0.26, Math.PI, 0);
        ctx.stroke();
      } else if (type === "hospital") {
        ctx.fillStyle = "#0a84ff";
        roundRect(-size * 0.08, -size * 0.30, size * 0.16, size * 0.60, size * 0.08);
        ctx.fill();
        roundRect(-size * 0.30, -size * 0.08, size * 0.60, size * 0.16, size * 0.08);
        ctx.fill();
      } else if (type === "pharmacy") {
        ctx.fillStyle = "#34c759";
        roundRect(-size * 0.08, -size * 0.30, size * 0.16, size * 0.60, size * 0.08);
        ctx.fill();
        roundRect(-size * 0.30, -size * 0.08, size * 0.60, size * 0.16, size * 0.08);
        ctx.fill();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (type === "chicken") {
        ctx.fillStyle = "#ff2d55";
        ctx.beginPath();
        ctx.ellipse(-size * 0.06, 0, size * 0.26, size * 0.20, -0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.98)";
        ctx.beginPath();
        ctx.ellipse(size * 0.20, size * 0.10, size * 0.14, size * 0.10, 0.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // generic dot
        ctx.fillStyle = "rgba(255,255,255,0.98)";
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    /* ----------------------- Building (premium + bigger text) ----------------------- */
    function drawPortalBuilding(p, t) {
      const pal = buildingPalette(p.type);
      const isActive = activePortal === p;
      const pulse = 0.55 + 0.45 * Math.sin(t * 3.0 + hash01(p.key) * 6);

      groundAO(p.x + 12, p.y + p.h - 18, p.w - 24, 28, 0.24);

      ctx.save();
      ctx.globalAlpha = 0.12 + (isActive ? 0.12 * pulse : 0);
      ctx.fillStyle = isActive ? "rgba(10,132,255,0.92)" : "rgba(255,255,255,0.22)";
      ctx.beginPath();
      ctx.ellipse(p.x + p.w * 0.5, p.y + p.h * 0.90, 78, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const depth = Math.max(12, Math.min(28, p.w * 0.06));
      const bx = p.x + 16, by = p.y + 56, bw = p.w - 32, bh = p.h - 86;

      legoBox3D(bx, by, bw, bh, depth, pal.main);

      // premium front panel
      ctx.save();
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      roundRect(bx + 10, by + 10, bw - 20, bh - 20, 16);
      ctx.fill();

      ctx.globalAlpha = 0.10;
      ctx.fillStyle = "rgba(10,14,24,0.75)";
      roundRect(bx + 14, by + 14, bw - 28, 10, 8);
      ctx.fill();
      ctx.restore();

      // seam lines
      ctx.save();
      ctx.globalAlpha = 0.16;
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
      const rx = p.x + p.w * 0.16, ry = p.y + 16, rw = p.w * 0.68, rh = 46;
      ctx.save();
      ctx.fillStyle = shade(pal.main, +22);
      roundRect(rx, ry, rw, rh, 18);
      ctx.fill();
      glossyHighlight(rx, ry, rw, rh, 0.12);

      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "rgba(10,14,24,0.55)";
      roundRect(rx + 10, ry + rh - 12, rw - 20, 8, 8);
      ctx.fill();
      ctx.restore();

      // door
      const dx = p.x + p.w * 0.44, dy = p.y + p.h * 0.68, dw = p.w * 0.12, dh = p.h * 0.18;
      ctx.save();
      ctx.fillStyle = "rgba(10,14,24,0.22)";
      roundRect(dx, dy, dw, dh, 12);
      ctx.fill();
      ctx.fillStyle = shade(pal.accent, +10);
      roundRect(dx + 4, dy + 4, dw - 8, dh - 8, 10);
      ctx.fill();
      glossyHighlight(dx, dy, dw, dh, 0.12);
      ctx.restore();

      // windows
      const winY = p.y + p.h * 0.54;
      const cols = 5;
      for (let i = 0; i < cols; i++) {
        const wx = p.x + p.w * 0.18 + i * (p.w * 0.13);
        const wy = winY;
        const ww = p.w * 0.10, wh = p.h * 0.11;

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

        ctx.globalAlpha = 0.20;
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

      // ✅ LED sign: 글씨 크게 + 블록 느낌, 촌스러운 테두리 제거
      const sy = p.y + 8;
      const sx = p.x + p.w * 0.16, sw = p.w * 0.68;

      ctx.save();
      ctx.fillStyle = "rgba(10,14,24,0.92)";
      roundRect(sx, sy, sw, 38, 16);
      ctx.fill();

      const led = ctx.createLinearGradient(sx, sy, sx + sw, sy + 38);
      led.addColorStop(0, shade(pal.accent, +26));
      led.addColorStop(1, shade(pal.accent, -6));
      ctx.globalAlpha = 0.90;
      ctx.fillStyle = led;
      roundRect(sx + 3, sy + 3, sw - 6, 32, 14);
      ctx.fill();
      ctx.globalAlpha = 1;

      // subtle glow (not boxy)
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = pal.accent;
      roundRect(sx - 10, sy - 10, sw + 20, 58, 20);
      ctx.fill();
      ctx.globalAlpha = 1;

      // ✅ 로고(글씨 왼쪽)
      const iconSize = 14;
      const iconX = sx + 18;
      const iconY = sy + 19;
      drawLogoIcon(p.type, iconX, iconY, iconSize, pal.accent);

      // label text (bigger especially hospital/pharmacy)
      const big = (p.type === "hospital" || p.type === "pharmacy") ? 18 : 15;
      ctx.fillStyle = "rgba(255,255,255,0.995)";
      ctx.shadowColor = "rgba(255,255,255,0.55)";
      ctx.shadowBlur = 10;
      ctx.font = `1200 ${big}px system-ui`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(p.label, sx + 38, sy + 19);
      ctx.shadowBlur = 0;

      if (p.status !== "open" || !p.url) {
        // "오픈 준비중" badge
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        roundRect(sx + sw * 0.5 - 62, sy + 46, 124, 24, 12);
        ctx.fill();
        ctx.fillStyle = "rgba(10,14,24,0.90)";
        ctx.font = "1100 11px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("오픈 준비중", sx + sw * 0.5, sy + 58);
        ctx.restore();
      }

      ctx.textAlign = "start";
      ctx.textBaseline = "alphabetic";
      ctx.restore();
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

      ctx.globalAlpha = 0.18;
      ctx.fillStyle = dark;
      ctx.beginPath();
      ctx.ellipse(x + 8 * s, y - 44 * s, 30 * s, 22 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.globalAlpha = 0.12;
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
      roundRect(x - 5 * s, y - 42 * s, 10 * s, 70 * s, 8 * s);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      roundRect(x - 16 * s, y - 54 * s, 32 * s, 22 * s, 10 * s);
      ctx.fill();
      glossyHighlight(x - 16 * s, y - 54 * s, 32 * s, 22 * s, 0.18);

      ctx.globalAlpha = 0.08 + 0.22 * pulse;
      ctx.fillStyle = "#ffd66b";
      ctx.beginPath();
      ctx.ellipse(x, y - 10 * s, 34 * s, 54 * s, 0, 0, Math.PI * 2);
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

      ctx.fillStyle = "rgba(0,0,0,0.25)";
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
      ctx.globalAlpha = 0.90;
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
      const x = e.x, y = e.y;
      const p = portalsByKey(e.key);
      const pal = buildingPalette(p ? p.type : "arcade");
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
      drawLogoIcon(p ? p.type : "arcade", 0, -18, 14, pal.accent);

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
        const a = 0.20 * (1 - f.age / f.life);
        ctx.globalAlpha = a;
        ctx.fillStyle = "rgba(10,14,24,0.65)";
        ctx.beginPath();
        ctx.ellipse(f.x, f.y, 5.2, 2.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    /* ----------------------- MINIFIG / SPRITE ----------------------- */
    function drawCapOnHead(hatColor) {
      ctx.save();
      ctx.translate(0, -20);

      ctx.fillStyle = hatColor;
      roundRect(-14, -20, 28, 15, 9);
      ctx.fill();

      ctx.globalAlpha = 0.16;
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

      ctx.globalAlpha = 0.18;
      ctx.fillStyle = "rgba(10,14,24,0.55)";
      roundRect(-12, -6, 24, 4, 3);
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.restore();
    }

    function drawSpriteCharacter(x, y) {
      // anchored with feet at y+40 approx
      if (!sprite.loaded || !sprite.img) return false;

      const bob = player.moving ? Math.sin(player.bobT) * 0.35 : 0;
      const baseW = 88; // sprite render size
      const baseH = 96;

      ctx.save();
      ctx.globalAlpha = 0.26;
      ctx.fillStyle = "rgba(10,14,24,0.42)";
      ctx.beginPath();
      ctx.ellipse(x, y + 28, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(x, y + bob);

      // direction flip for left
      if (player.dir === "left") ctx.scale(-1, 1);

      // slight squash while moving
      const s = player.moving ? (0.98 + 0.02 * Math.sin(player.animT * 10)) : 1;
      ctx.scale(s, 1);

      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(sprite.img, -baseW / 2, -72, baseW, baseH);

      ctx.restore();
      return true;
    }

    function drawMinifig(x, y, opts = null) {
      const bob = (opts?.moving ?? player.moving) ? Math.sin((opts?.bobT ?? player.bobT)) * 0.14 : 0;
      const dir = opts?.dir ?? player.dir;
      const swing = (opts?.moving ?? player.moving) ? Math.sin((opts?.animT ?? player.animT) * 10) : 0;

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

      const skin = opts?.skin || "#ffd66b";
      const torso = opts?.torso || "#0a84ff";
      const pants = opts?.pants || "#3b4251";
      const hat = opts?.hat || "#ff3b30";
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
        // side face more natural
        ctx.fillStyle = "rgba(10,14,24,0.72)";
        ctx.beginPath();
        ctx.arc(7, -22, 2.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "rgba(10,14,24,0.62)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(9, -18, 6, -0.25, Math.PI - 0.55);
        ctx.stroke();

        // nose highlight
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = "rgba(10,14,24,0.20)";
        ctx.beginPath();
        ctx.ellipse(14.5, -18.5, 2.6, 1.9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      ctx.restore();

      const armSwing = 2.2 * swing;
      const legSwing = 3.0 * swing;

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
        // ✅ side profile 개선(부자연스러움 개선): 팔/다리 오클루전 + 힙/발 방향
        // torso
        ctx.fillStyle = torso;
        roundRect(-10, -4, 20, 28, 12);
        ctx.fill();
        glossyHighlight(-10, -4, 20, 28, 0.10);

        // back arm (partial, behind torso)
        ctx.save();
        ctx.globalAlpha = 0.48;
        ctx.fillStyle = shade(torso, -10);
        roundRect(-18, 3, 9, 16, 8);
        ctx.fill();
        ctx.fillStyle = shade(skin, -6);
        roundRect(-18, 15 - armSwing * 0.5, 9, 7, 6);
        ctx.fill();
        ctx.restore();

        // front arm
        ctx.fillStyle = torso;
        roundRect(10, 2, 10, 18, 8);
        ctx.fill();
        ctx.fillStyle = skin;
        roundRect(10, 15 + armSwing, 10, 8, 6);
        ctx.fill();

        // hips seam
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        roundRect(-8, 20, 20, 4, 3);
        ctx.fill();
        ctx.globalAlpha = 1;

        // far leg (behind)
        ctx.save();
        ctx.globalAlpha = 0.50;
        ctx.fillStyle = shade(pants, -14);
        roundRect(-7, 22, 9, 16, 6);
        ctx.fill();
        // far foot
        ctx.fillStyle = "rgba(10,14,24,0.68)";
        ctx.beginPath();
        ctx.ellipse(-2, 40 - legSwing * 0.7, 5.0, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // near leg
        ctx.fillStyle = pants;
        roundRect(3, 22, 12, 16, 6);
        ctx.fill();

        // near foot (slightly forward)
        ctx.fillStyle = "rgba(10,14,24,0.72)";
        ctx.beginPath();
        ctx.ellipse(10, 40 + legSwing, 6.2, 3.0, 0, 0, Math.PI * 2);
        ctx.fill();

        // subtle outline at torso front edge
        ctx.globalAlpha = 0.10;
        ctx.fillStyle = "rgba(10,14,24,0.75)";
        roundRect(8, -2, 3, 24, 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.restore();
    }

    function drawNPC(key, x, y) {
      const theme =
        {
          archery: { torso: "#34c759", pants: "#3b4251", hat: "#ffcc00", acc: "bow" },
          janggi: { torso: "#b889ff", pants: "#2a2f3b", hat: "#ff3b30", acc: "stone" },
          omok: { torso: "#ffffff", pants: "#3b4251", hat: "#0a84ff", acc: "stone2" }
        }[key] || { torso: "#ffffff", pants: "#3b4251", hat: "#ff3b30", acc: "none" };

      drawMinifig(x, y, {
        moving: false, dir: "right",
        torso: theme.torso, pants: theme.pants, hat: theme.hat
      });

      // accessory
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
      drawMinifig(n.x, n.y, {
        moving: true,
        dir: n.dir,
        animT: n.t,
        bobT: n.t * 0.9,
        torso: c.torso,
        pants: c.pants,
        hat: c.hat
      });
    }

    /* ----------------------- Title ----------------------- */
    function drawWorldTitle() {
      const text = "FA미니월드";
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
          player.animT *= 0.90;
        }
      }

      player.bobT += dt * 6.0;
      addFootprint(dt);

      // cars
      for (const c of cars) {
        c.bob += dt * 3.0;
        const r = roads.find((rr) => rr._id === c.roadId) || roads[0];
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

      // clouds / birds
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

      // detect portal
      activePortal = null;
      for (const p of portals) {
        const z = portalEnterZone(p);
        if (circleRectHit(player.x, player.y, player.r, z)) { activePortal = p; break; }
      }

      // ✅ 모바일: 포탈 존에 들어가면 항상 모달이 뜨도록(오픈/오픈준비중 둘 다)
      if (isTouchDevice() && activePortal && !modalState.open) {
        if (lastMobileZoneKey !== activePortal.key) {
          lastMobileZoneKey = activePortal.key;
          openPortalUI(activePortal);
        }
      }
      if (!activePortal) lastMobileZoneKey = "";

      // toast (central block)
      if (!modalState.open && activePortal) {
        UI.toast.hidden = false;
        const p = activePortal;
        if (p.status === "open" && p.url) {
          UI.toast.innerHTML = `
            ${blockSpan(`🧱 <b>${p.label}</b><br/>포탈 앞이에요. <b>Enter/E</b> 또는 <b>클릭/터치</b>`, { bg: "rgba(10,14,24,0.82)" })}
          `;
        } else {
          UI.toast.innerHTML = `
            ${blockSpan(`🧱 <b>${p.label}</b><br/>오픈 준비중입니다`, { bg: "rgba(10,14,24,0.78)" })}
          `;
        }
      } else if (!modalState.open) {
        UI.toast.hidden = true;
      }

      // footprints decay
      for (let i = footprints.length - 1; i >= 0; i--) {
        footprints[i].age += dt;
        if (footprints[i].age >= footprints[i].life) footprints.splice(i, 1);
      }

      // roamers
      const roamerPalette = stepRoamers(dt);

      updateCamera(dt);

      UI.coord.textContent = `x: ${Math.round(player.x)} · y: ${Math.round(player.y)}`;

      acc += dt;
      framesCount++;
      if (acc >= 0.45) {
        UI.fps.textContent = `fps: ${Math.round(framesCount / acc)}`;
        acc = 0;
        framesCount = 0;
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
      drawFootprints();

      const items = [];
      for (const p of portals) items.push({ kind: "building", ref: p, footY: getFootY({ kind: "building", y: p.y, h: p.h }) });
      for (const c of cars) items.push({ kind: "car", ref: c, footY: getFootY(c) });
      for (const pr of props) items.push({ kind: pr.kind, ref: pr, footY: getFootY(pr) });
      for (const s of signs) items.push({ kind: "sign", ref: s, footY: getFootY({ kind: "sign", y: s.y }) });
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
        else if (it.kind === "sign") drawSign(it.ref);
        else if (it.kind === "emblem") drawEmblem(it.ref);
        else if (it.kind === "npc") drawNPC(it.ref.key, it.ref.x, it.ref.y);
        else if (it.kind === "signal") drawSignal(it.ref, t);
        else if (it.kind === "roamer") drawRoamer(it.ref, roamerPalette);
        else if (it.kind === "player") {
          // sprite first
          if (!(SPRITE_SRC && USE_SPRITE_IF_LOADED && drawSpriteCharacter(player.x, player.y))) {
            drawMinifig(player.x, player.y);
          }
        }
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
        const roamerPalette = update(dt, t);
        draw(t, roamerPalette);
      } catch (err) {
        console.error(err);
        UI.toast.hidden = false;
        UI.toast.innerHTML = blockSpan(`🧱 <b>JS 에러</b><br/>콘솔(Console) 확인: ${String(err).slice(0, 140)}`);
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
          if (w.x >= z.x - 20 && w.x <= z.x + z.w + 20 && w.y >= z.y - 20 && w.y <= z.y + z.h + 20) {
            openPortalUI(activePortal);
          }
        }
      },
      { passive: true }
    );

    /* ----------------------- Start ----------------------- */
    resize();
    for (const b of birds) {
      b.x = Math.random() * WORLD.w;
      b.y = 70 + Math.random() * 170;
    }
    requestAnimationFrame(loop);
  });
})();
