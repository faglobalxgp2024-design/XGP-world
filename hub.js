/* HUN.JS - LEGO PREMIUM (single-file)
 * - HTML/CSS 수정 없이 동작(필수 DOM 없으면 자동 생성)
 * - 배경/건물/캐릭터 전체 레고 스타일 + 고급 3D 느낌
 * - 포탈: soon=오픈준비중입니다 / open=입장하시겠습니까? (Enter/E)
 * - 캐릭터: 모자 + 방향별(앞/뒤/옆) 정확히
 * - 나무: 흔들림 제거 + 나무 모양(둥근 캐노피) + 잎 디테일
 * - 바닥/차도/차량 디테일 강화
 */

(() => {
  "use strict";

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

    const toast = ensureEl("toast", "div");
    toast.style.position = "fixed";
    toast.style.left = "24px";
    toast.style.top = "78px";
    toast.style.zIndex = "9999";
    toast.style.padding = "10px 12px";
    toast.style.borderRadius = "14px";
    toast.style.background = "rgba(255,255,255,0.90)";
    toast.style.border = "1px solid rgba(0,0,0,0.10)";
    toast.style.boxShadow = "0 14px 38px rgba(0,0,0,0.12)";
    toast.style.font = "900 13px system-ui";
    toast.style.color = "rgba(10,18,30,0.90)";
    toast.style.maxWidth = "420px";
    toast.hidden = true;

    const coord = ensureEl("coord", "div");
    coord.style.position = "fixed";
    coord.style.left = "24px";
    coord.style.top = "24px";
    coord.style.zIndex = "9999";
    coord.style.padding = "8px 10px";
    coord.style.borderRadius = "12px";
    coord.style.background = "rgba(255,255,255,0.86)";
    coord.style.border = "1px solid rgba(0,0,0,0.10)";
    coord.style.font = "900 12px system-ui";
    coord.style.color = "rgba(10,18,30,0.80)";

    const fps = ensureEl("fps", "div");
    fps.style.position = "fixed";
    fps.style.left = "140px";
    fps.style.top = "24px";
    fps.style.zIndex = "9999";
    fps.style.padding = "8px 10px";
    fps.style.borderRadius = "12px";
    fps.style.background = "rgba(255,255,255,0.86)";
    fps.style.border = "1px solid rgba(0,0,0,0.10)";
    fps.style.font = "900 12px system-ui";
    fps.style.color = "rgba(10,18,30,0.80)";

    const fade = ensureEl("fade", "div");
    fade.style.position = "fixed";
    fade.style.inset = "0";
    fade.style.zIndex = "9998";
    fade.style.pointerEvents = "none";
    fade.style.opacity = "0";
    fade.style.transition = "opacity 240ms ease";
    fade.style.background = "#ffffff";

    // modal overlay (lego dialog)
    const modal = ensureEl("lego_modal", "div");
    modal.style.position = "fixed";
    modal.style.inset = "0";
    modal.style.zIndex = "10000";
    modal.style.display = "none";
    modal.style.alignItems = "center";
    modal.style.justifyContent = "center";
    modal.style.background = "rgba(10,14,24,0.20)";
    modal.style.backdropFilter = "blur(2px)";

    const modalInner = ensureEl("lego_modal_inner", "div", modal);
    modalInner.style.width = "min(520px, calc(100vw - 48px))";
    modalInner.style.borderRadius = "18px";
    modalInner.style.background = "rgba(255,255,255,0.94)";
    modalInner.style.border = "1px solid rgba(0,0,0,0.10)";
    modalInner.style.boxShadow = "0 20px 60px rgba(0,0,0,0.18)";
    modalInner.style.padding = "16px 16px 14px 16px";
    modalInner.style.font = "900 14px system-ui";
    modalInner.style.color = "rgba(10,18,30,0.92)";

    const modalTitle = ensureEl("lego_modal_title", "div", modalInner);
    modalTitle.style.font = "1000 16px system-ui";
    modalTitle.style.marginBottom = "8px";

    const modalBody = ensureEl("lego_modal_body", "div", modalInner);
    modalBody.style.font = "900 13px system-ui";
    modalBody.style.opacity = "0.92";
    modalBody.style.marginBottom = "12px";
    modalBody.style.lineHeight = "1.35";

    const modalHint = ensureEl("lego_modal_hint", "div", modalInner);
    modalHint.style.font = "900 12px system-ui";
    modalHint.style.opacity = "0.70";

    const style = ensureEl("lego_style_injected", "style", document.head);
    style.textContent = `
      #fade.on { opacity: 1; }
      #lego_modal { animation: legoPop 180ms ease both; }
      @keyframes legoPop { from{opacity:0; transform: translateY(6px);} to{opacity:1; transform: translateY(0);} }
      * { -webkit-tap-highlight-color: transparent; }
    `;

    return { canvas, toast, coord, fps, fade, modal, modalTitle, modalBody, modalHint };
  }

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
  function isTouchDevice(){ return (navigator.maxTouchPoints || 0) > 0; }

  /* ----------------------- Start ----------------------- */
  window.addEventListener("DOMContentLoaded", () => {
    const UI = ensureUI();
    const canvas = UI.canvas;
    const ctx = canvas.getContext("2d");

    let W = 0, H = 0, DPR = 1;

    const VIEW = { zoom: 0.86, w: 0, h: 0 };
    const WORLD = { w: 2400, h: 1700, margin: 120 };

    const cam = { x: 0, y: 0, targetX: 0, targetY: 0 };
    function screenToWorld(sx, sy) { return { x: sx + cam.x, y: sy + cam.y }; }

    /* ----------------------- Portals ----------------------- */
    const portals = [
      { key:"avoid",   label:"미니게임 피하기",   status:"open", url:"https://faglobalxgp2024-design.github.io/index.html/", type:"arcade", size:"L", x:0,y:0,w:0,h:0 },
      { key:"archery", label:"미니게임 양궁",     status:"open", url:"https://ttjdwls777-eng.github.io/XGP-MINI-GAME2/",      type:"tower",  size:"M", x:0,y:0,w:0,h:0 },
      { key:"janggi",  label:"미니게임 장기",     status:"open", url:"https://faglobalxgp2024-design.github.io/MINIGAME/",     type:"dojo",   size:"L", x:0,y:0,w:0,h:0 },
      { key:"jump",    label:"미니게임 점프하기", status:"soon", url:"", type:"gym",   size:"S", x:0,y:0,w:0,h:0 },
      { key:"snow",    label:"미니게임 눈굴리기", status:"soon", url:"", type:"igloo", size:"M", x:0,y:0,w:0,h:0 },
      { key:"omok",    label:"미니게임 오목",     status:"soon", url:"", type:"cafe",  size:"M", x:0,y:0,w:0,h:0 },
    ];
    const portalsByKey = (k) => portals.find(p => p.key === k);

    /* ----------------------- Player (LEGO minifig) ----------------------- */
    const player = {
      x: 360, y: 360,
      r: 18,
      speed: 250,
      moving: false,
      animT: 0,
      bobT: 0,
      dir: "down", // up/down/left/right
    };

    let activePortal = null;
    let entering = false;

    /* ----------------------- Input ----------------------- */
    const keys = new Set();
    let dragging = false;
    let dragOffset = { x: 0, y: 0 };
    let pointer = { x: 0, y: 0, active: false, lastMoveAt: 0 };

    window.addEventListener("keydown", (e) => {
      const k = e.key.toLowerCase();
      keys.add(k);

      // modal confirm
      if (k === "enter" || k === "e") {
        if (modalState.open && modalState.portal) {
          confirmEnter(modalState.portal);
        } else if (activePortal) {
          openPortalUI(activePortal);
        }
      }
      if (k === "escape") closeModal();
    });
    window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

    canvas.addEventListener("pointerenter", () => pointer.active = true);
    canvas.addEventListener("pointerleave", () => pointer.active = false);

    function getPointer(e){
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / VIEW.zoom, y: (e.clientY - r.top) / VIEW.zoom };
    }

    canvas.addEventListener("pointerdown", (e) => {
      const p = getPointer(e);
      const w = screenToWorld(p.x, p.y);
      const dx = w.x - player.x, dy = w.y - player.y;
      if (dx*dx + dy*dy <= (player.r+18)*(player.r+18)) {
        dragging = true;
        dragOffset.x = player.x - w.x;
        dragOffset.y = player.y - w.y;
        canvas.setPointerCapture(e.pointerId);
      }
    });

    canvas.addEventListener("pointermove", (e) => {
      const p = getPointer(e);
      pointer.x = p.x; pointer.y = p.y;
      pointer.lastMoveAt = performance.now();

      if (!dragging) return;
      const prev = { x: player.x, y: player.y };
      const w = screenToWorld(p.x, p.y);
      player.x = w.x + dragOffset.x;
      player.y = w.y + dragOffset.y;
      clampPlayerToWorld();
      updateDirFromDelta(player.x - prev.x, player.y - prev.y);
      player.moving = true;
      player.animT += 1/60;
    });

    canvas.addEventListener("pointerup", () => {
      dragging = false;
      // 모바일: 손 떼면 포탈 UI 오픈
      if (activePortal && isTouchDevice()) openPortalUI(activePortal);
    });

    function clampPlayerToWorld(){
      player.x = clamp(player.x, WORLD.margin, WORLD.w - WORLD.margin);
      player.y = clamp(player.y, WORLD.margin, WORLD.h - WORLD.margin);
    }

    /* ----------------------- Roads / Sidewalks ----------------------- */
    const roads = [];
    const sidewalks = [];
    const crossings = [];

    /* ----------------------- Cars ----------------------- */
    const cars = [];
    const CAR_COLORS = ["#ff3b30","#ffcc00","#34c759","#0a84ff","#af52de","#ff2d55","#ffffff"];

    function seedCars(){
      cars.length = 0;
      const hr = roads[0];
      const vr = roads[1];
      if (!hr || !vr) return;

      const makeCar = (axis)=>{
        const col = CAR_COLORS[(Math.random()*CAR_COLORS.length)|0];
        const speed = 92 + Math.random()*86;

        if (axis==="h"){
          const lane = Math.random()<0.5 ? 0 : 1;
          const dir = Math.random()<0.5 ? 1 : -1;
          return {
            kind:"car", axis:"h", dir, color: col, speed,
            w: 56 + Math.random()*18,
            h: 26 + Math.random()*7,
            x: hr.x + Math.random()*hr.w,
            y: hr.y + (lane===0 ? hr.h*0.38 : hr.h*0.66),
            bob: Math.random()*10
          };
        } else {
          const lane = Math.random()<0.5 ? 0 : 1;
          const dir = Math.random()<0.5 ? 1 : -1; // +1 아래, -1 위
          return {
            kind:"car", axis:"v", dir, color: col, speed,
            w: 26 + Math.random()*7,
            h: 60 + Math.random()*18,
            x: vr.x + (lane===0 ? vr.w*0.38 : vr.w*0.66),
            y: vr.y + Math.random()*vr.h,
            bob: Math.random()*10
          };
        }
      };

      for(let i=0;i<7;i++) cars.push(makeCar("h"));
      for(let i=0;i<6;i++) cars.push(makeCar("v"));
    }

    /* ----------------------- Props ----------------------- */
    const props = [];
    const signs = [];

    function seedProps(){
      props.length = 0;
      signs.length = 0;

      const tries = 240;
      const isOnRoadLike = (x,y)=>{
        for(const r of roads){
          if (x>=r.x-18 && x<=r.x+r.w+18 && y>=r.y-18 && y<=r.y+r.h+18) return true;
        }
        return false;
      };

      for(let i=0;i<tries;i++){
        const x = WORLD.margin + Math.random()*(WORLD.w - WORLD.margin*2);
        const y = WORLD.margin + Math.random()*(WORLD.h - WORLD.margin*2);
        if (isOnRoadLike(x,y)) continue;

        const r = Math.random();
        if (r < 0.46) props.push({ kind:"tree", x,y, s:0.85 + Math.random()*1.05 });
        else if (r < 0.58) props.push({ kind:"lamp", x,y, s:0.9 + Math.random()*0.55 });
        else if (r < 0.68) props.push({ kind:"bench", x,y, s:0.9 + Math.random()*0.35 });
        else props.push({ kind:"flower", x,y, s:0.9 + Math.random()*1.1 });
      }

      // 포탈 주변 꽃 + 흙길 느낌은 draw에서 별도 처리
      for (const p of portals){
        props.push({ kind:"flower", x:p.x+p.w*0.20, y:p.y+p.h+28, s:1.4 });
        props.push({ kind:"flower", x:p.x+p.w*0.80, y:p.y+p.h+18, s:1.2 });
      }

      // signs
      const arch = portalsByKey("archery");
      const jang = portalsByKey("janggi");
      if (arch) signs.push({ x: arch.x + arch.w*0.5 - 10, y: arch.y + arch.h + 90, text: "양궁 →" });
      if (jang) signs.push({ x: jang.x + jang.w*0.5 + 10, y: jang.y + jang.h + 90, text: "← 장기" });
    }

    /* ----------------------- Particles / footprints ----------------------- */
    const footprints = [];
    let footStepAcc = 0;
    function addFootprint(dt){
      if (!player.moving) { footStepAcc = 0; return; }
      footStepAcc += dt * (player.speed/220);
      if (footStepAcc < 0.12) return;
      footStepAcc = 0;

      let ox = 0, oy = 0;
      if (player.dir === "up") oy = 8;
      else if (player.dir === "down") oy = -6;
      else if (player.dir === "left") ox = 8;
      else if (player.dir === "right") ox = -8;

      footprints.push({
        x: player.x + ox + (Math.random()-0.5)*2,
        y: player.y + 30 + oy + (Math.random()-0.5)*2,
        life: 1.2, age: 0
      });
    }

    /* ----------------------- Background layers ----------------------- */
    const clouds = Array.from({length:10}, ()=>({
      x: Math.random()*3200,
      y: 40 + Math.random()*230,
      s: 0.7 + Math.random()*1.2,
      v: 9 + Math.random()*16,
      layer: Math.random()<0.5 ? 0 : 1
    }));
    const birds = Array.from({length:6}, ()=>({
      x: 0, y: 0, p: Math.random()*10, v: 22 + Math.random()*20
    }));

    /* ----------------------- Patterns ----------------------- */
    let grassPattern=null, dirtPattern=null, roadPattern=null, sidewalkPattern=null, leafPattern=null;

    function makePattern(w,h,drawFn){
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const g = c.getContext("2d");
      drawFn(g, w, h);
      return ctx.createPattern(c, "repeat");
    }

    function buildPatterns(){
      // 자연스러운 잔디(레고 베이스 느낌 + 과하지 않게)
      grassPattern = makePattern(240,240,(g,w,h)=>{
        g.fillStyle = "#35d66f";
        g.fillRect(0,0,w,h);

        // 아주 얕은 스터드(자연스러움 유지)
        for(let y=16;y<h;y+=24){
          for(let x=16;x<w;x+=24){
            const rg = g.createRadialGradient(x-3,y-4,2, x,y,10);
            rg.addColorStop(0,"rgba(255,255,255,0.55)");
            rg.addColorStop(0.35,"rgba(255,255,255,0.14)");
            rg.addColorStop(1,"rgba(0,0,0,0.16)");
            g.fillStyle = rg;
            g.beginPath(); g.arc(x,y,8,0,Math.PI*2); g.fill();
          }
        }

        // 잔디 점/결
        g.globalAlpha = 0.20;
        for(let i=0;i<140;i++){
          g.fillStyle = (i%3===0) ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.10)";
          g.beginPath();
          g.arc(Math.random()*w, Math.random()*h, 0.8+Math.random()*1.8, 0, Math.PI*2);
          g.fill();
        }
        g.globalAlpha = 1;
      });

      // 흙길 패턴
      dirtPattern = makePattern(240,240,(g,w,h)=>{
        g.fillStyle="#c79a64";
        g.fillRect(0,0,w,h);
        g.globalAlpha=0.28;
        for(let i=0;i<260;i++){
          g.fillStyle = (i%2===0) ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)";
          g.beginPath();
          g.arc(Math.random()*w, Math.random()*h, 0.8+Math.random()*2.8, 0, Math.PI*2);
          g.fill();
        }
        g.globalAlpha=1;
      });

      // 차도 (대비 강하게)
      roadPattern = makePattern(240,240,(g,w,h)=>{
        g.fillStyle="#2a2f3b";
        g.fillRect(0,0,w,h);

        // 미세한 스터드/결
        for(let y=16;y<h;y+=24){
          for(let x=16;x<w;x+=24){
            const rg = g.createRadialGradient(x-3,y-4,2, x,y,10);
            rg.addColorStop(0,"rgba(255,255,255,0.32)");
            rg.addColorStop(0.35,"rgba(255,255,255,0.10)");
            rg.addColorStop(1,"rgba(0,0,0,0.24)");
            g.fillStyle = rg;
            g.beginPath(); g.arc(x,y,8,0,Math.PI*2); g.fill();
          }
        }

        // 중앙 점선 느낌(패턴용)
        g.globalAlpha=0.22;
        g.fillStyle="rgba(255,255,255,0.75)";
        for(let x=0;x<w;x+=40){
          g.fillRect(x+12, h/2-2, 14, 4);
        }
        g.globalAlpha=1;
      });

      // 인도
      sidewalkPattern = makePattern(240,240,(g,w,h)=>{
        g.fillStyle="#f6efe6";
        g.fillRect(0,0,w,h);
        g.globalAlpha=0.18;
        g.strokeStyle="rgba(0,0,0,0.18)";
        g.lineWidth=1;
        for(let x=0;x<=w;x+=22){ g.beginPath(); g.moveTo(x,0); g.lineTo(x,h); g.stroke(); }
        for(let y=0;y<=h;y+=22){ g.beginPath(); g.moveTo(0,y); g.lineTo(w,y); g.stroke(); }
        g.globalAlpha=1;
      });

      // 잎 결
      leafPattern = makePattern(220,220,(g,w,h)=>{
        g.fillStyle="#23cc77";
        g.fillRect(0,0,w,h);
        g.globalAlpha=0.18;
        for(let i=0;i<220;i++){
          g.fillStyle = (i%4===0) ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.10)";
          g.beginPath();
          g.ellipse(Math.random()*w, Math.random()*h, 1.4+Math.random()*2.6, 1.2+Math.random()*2.2, Math.random(), 0, Math.PI*2);
          g.fill();
        }
        g.globalAlpha=1;
      });
    }

    /* ----------------------- Shape helpers ----------------------- */
    function roundRect(x,y,w,h,r){
      const rr = Math.min(r, w/2, h/2);
      ctx.beginPath();
      ctx.moveTo(x+rr,y);
      ctx.arcTo(x+w,y,x+w,y+h,rr);
      ctx.arcTo(x+w,y+h,x,y+h,rr);
      ctx.arcTo(x,y+h,x,y,rr);
      ctx.arcTo(x,y,x+w,y,rr);
      ctx.closePath();
    }
    function glossyHighlight(x,y,w,h,alpha=0.16){
      ctx.save();
      ctx.globalAlpha = alpha;
      const g = ctx.createLinearGradient(x, y, x+w, y+h);
      g.addColorStop(0, "rgba(255,255,255,0.85)");
      g.addColorStop(0.35, "rgba(255,255,255,0.20)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      roundRect(x+6, y+6, w-12, Math.max(18, h*0.35), 14);
      ctx.fill();
      ctx.restore();
    }
    function groundAO(x,y,w,h,alpha=0.22){
      ctx.save();
      const g = ctx.createRadialGradient(x+w*0.5,y+h*0.8, 10, x+w*0.5,y+h*0.8, Math.max(w,h)*0.9);
      g.addColorStop(0, `rgba(10,14,24,${alpha})`);
      g.addColorStop(1, "rgba(10,14,24,0)");
      ctx.fillStyle = g;
      ctx.fillRect(x-120, y-120, w+240, h+240);
      ctx.restore();
    }
    function studsOnRect(x,y,w,h, step=24, r=6, alpha=0.44){
      ctx.save();
      ctx.globalAlpha = alpha;
      for(let yy=y+step*0.55; yy<y+h; yy+=step){
        for(let xx=x+step*0.55; xx<x+w; xx+=step){
          const rg = ctx.createRadialGradient(xx-2,yy-3,2, xx,yy, r*1.6);
          rg.addColorStop(0, "rgba(255,255,255,0.85)");
          rg.addColorStop(0.45, "rgba(255,255,255,0.20)");
          rg.addColorStop(1, "rgba(0,0,0,0.22)");
          ctx.fillStyle = rg;
          ctx.beginPath();
          ctx.arc(xx,yy,r,0,Math.PI*2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
    function legoBox3D(x,y,w,h,depth, baseColor){
      const edge = "rgba(0,0,0,0.18)";
      ctx.save();
      ctx.strokeStyle = edge;
      ctx.lineWidth = 2;

      // front
      ctx.fillStyle = baseColor;
      roundRect(x, y, w, h, 18);
      ctx.fill(); ctx.stroke();

      // top
      ctx.fillStyle = shade(baseColor, +18);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x+depth, y-depth);
      ctx.lineTo(x+w+depth, y-depth);
      ctx.lineTo(x+w, y);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      // side
      ctx.fillStyle = shade(baseColor, -20);
      ctx.beginPath();
      ctx.moveTo(x+w, y);
      ctx.lineTo(x+w+depth, y-depth);
      ctx.lineTo(x+w+depth, y+h-depth);
      ctx.lineTo(x+w, y+h);
      ctx.closePath();
      ctx.fill(); ctx.stroke();

      glossyHighlight(x,y,w,h,0.12);
      ctx.restore();
    }

    /* ----------------------- World layout ----------------------- */
    function layoutWorld(){
      WORLD.w = Math.max(3200, Math.floor(W * 3.6));
      WORLD.h = Math.max(2300, Math.floor(H * 3.2));

      const base = 220;
      const mul = { S: 0.82, M: 1.00, L: 1.22 };
      for (const p of portals){
        const m = mul[p.size] || 1;
        p.w = base * 1.22 * m;
        p.h = base * 0.92 * m;
      }

      portalsByKey("jump").x = WORLD.w*0.22; portalsByKey("jump").y = WORLD.h*0.22;
      portalsByKey("archery").x = WORLD.w*0.50; portalsByKey("archery").y = WORLD.h*0.18;
      portalsByKey("omok").x = WORLD.w*0.78; portalsByKey("omok").y = WORLD.h*0.24;

      portalsByKey("avoid").x = WORLD.w*0.20; portalsByKey("avoid").y = WORLD.h*0.62;
      portalsByKey("janggi").x = WORLD.w*0.78; portalsByKey("janggi").y = WORLD.h*0.62;
      portalsByKey("snow").x = WORLD.w*0.50; portalsByKey("snow").y = WORLD.h*0.80;

      for (const p of portals){
        p.x -= p.w/2; p.y -= p.h/2;
        p.x = clamp(p.x, WORLD.margin, WORLD.w - WORLD.margin - p.w);
        p.y = clamp(p.y, WORLD.margin, WORLD.h - WORLD.margin - p.h);
      }

      roads.length = 0; sidewalks.length = 0; crossings.length = 0;

      // main road (h)
      roads.push({ x: WORLD.w*0.10, y: WORLD.h*0.48, w: WORLD.w*0.80, h: 132 });
      sidewalks.push({ x: WORLD.w*0.10, y: WORLD.h*0.48 - 48, w: WORLD.w*0.80, h: 38 });
      sidewalks.push({ x: WORLD.w*0.10, y: WORLD.h*0.48 + 142, w: WORLD.w*0.80, h: 38 });

      // vertical road
      roads.push({ x: WORLD.w*0.50 - 64, y: WORLD.h*0.10, w: 128, h: WORLD.h*0.82 });
      sidewalks.push({ x: WORLD.w*0.50 - 64 - 46, y: WORLD.h*0.10, w: 34, h: WORLD.h*0.82 });
      sidewalks.push({ x: WORLD.w*0.50 + 64 + 12, y: WORLD.h*0.10, w: 34, h: WORLD.h*0.82 });

      // crossings
      crossings.push({ x: WORLD.w*0.50 - 92, y: WORLD.h*0.48 + 32, w: 184, h: 58 });
      crossings.push({ x: WORLD.w*0.50 - 92, y: WORLD.h*0.48 - 88, w: 184, h: 58 });

      buildPatterns();
      seedCars();
      seedProps();

      player.x = clamp(player.x, WORLD.margin+80, WORLD.w - WORLD.margin-80);
      player.y = clamp(player.y, WORLD.margin+80, WORLD.h - WORLD.margin-80);
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
      layoutWorld();
    }
    window.addEventListener("resize", resize);

    /* ----------------------- Movement / camera ----------------------- */
    function updateDirFromAxes(ax, ay){
      if (Math.abs(ay) >= Math.abs(ax)) player.dir = ay < 0 ? "up" : "down";
      else player.dir = ax < 0 ? "left" : "right";
    }
    function updateDirFromDelta(dx, dy){
      if (dx===0 && dy===0) return;
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
    function portalEnterZone(p){
      const zx = p.x + p.w*0.50 - 28;
      const zy = p.y + p.h*0.76;
      return { x: zx, y: zy, w: 56, h: 44 };
    }
    function circleRectHit(cx, cy, r, rect){
      const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
      const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
      const dx = cx - closestX, dy = cy - closestY;
      return (dx*dx + dy*dy) <= r*r;
    }

    /* ----------------------- Modal (LEGO confirm) ----------------------- */
    const modalState = { open:false, portal:null };
    function openModal(title, body, hint){
      UI.modalTitle.textContent = title;
      UI.modalBody.innerHTML = body;
      UI.modalHint.textContent = hint || "";
      UI.modal.style.display = "flex";
      modalState.open = true;
    }
    function closeModal(){
      UI.modal.style.display = "none";
      modalState.open = false;
      modalState.portal = null;
    }

    UI.modal.addEventListener("pointerdown", (e) => {
      // 바깥 영역 클릭하면 닫기
      if (e.target === UI.modal) closeModal();
    });

    function openPortalUI(p){
      if (!p) return;

      if (p.status !== "open") {
        // 오픈준비중 레고 메시지
        UI.toast.hidden = false;
        UI.toast.innerHTML = `🧱 <b>${p.label}</b><br/>현재 <b>오픈준비중입니다</b> ✨`;
        setTimeout(() => { if (activePortal !== p) UI.toast.hidden = true; }, 1300);
        return;
      }

      // open: confirm
      modalState.portal = p;
      openModal(
        `🧱 ${p.label}`,
        `레고 포탈에 들어왔어요!<br/><b>입장하시겠습니까?</b>`,
        isTouchDevice() ? "모바일: 화면에서 손을 떼면 입장" : "PC: Enter 또는 E"
      );
    }

    function confirmEnter(p){
      if (entering) return;
      if (!p || p.status !== "open" || !p.url) {
        closeModal();
        return;
      }
      closeModal();
      entering = true;
      UI.fade.classList.add("on");
      setTimeout(() => window.location.href = p.url, 260);
    }

    /* ----------------------- Rendering: background ----------------------- */
    function drawSkyWorld(t){
      const g = ctx.createLinearGradient(0,0,0,WORLD.h);
      g.addColorStop(0, "#bfe7ff");
      g.addColorStop(0.55, "#d7f1ff");
      g.addColorStop(1, "#fff2fb");
      ctx.fillStyle = g;
      ctx.fillRect(0,0,WORLD.w,WORLD.h);

      // soft fog blobs
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.ellipse(WORLD.w*0.22, WORLD.h*0.18, 460, 220, 0, 0, Math.PI*2);
      ctx.ellipse(WORLD.w*0.72, WORLD.h*0.16, 520, 240, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();

      // birds
      ctx.save();
      ctx.globalAlpha = 0.30;
      ctx.strokeStyle = "rgba(10,14,24,0.55)";
      ctx.lineWidth = 2;
      for (const b of birds){
        const yy = b.y + Math.sin(b.p)*6;
        const xx = b.x;
        ctx.beginPath();
        ctx.moveTo(xx-7, yy);
        ctx.quadraticCurveTo(xx, yy-5, xx+7, yy);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawCloudsWorld(){
      for (const c of clouds){
        const a = 0.14 + 0.05*(c.layer===0 ? 1.0 : 0.75);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, 80*c.s, 34*c.s, 0, 0, Math.PI*2);
        ctx.ellipse(c.x+50*c.s, c.y-12*c.s, 70*c.s, 30*c.s, 0, 0, Math.PI*2);
        ctx.ellipse(c.x+100*c.s, c.y, 78*c.s, 32*c.s, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }
    }

    function drawGroundWorld(){
      // grass
      ctx.save();
      ctx.fillStyle = grassPattern || "#35d66f";
      ctx.fillRect(0, WORLD.h*0.34, WORLD.w, WORLD.h*0.66);
      ctx.restore();

      // depth shade
      ctx.save();
      const sh = ctx.createLinearGradient(0, WORLD.h*0.34, 0, WORLD.h);
      sh.addColorStop(0, "rgba(10,14,24,0.00)");
      sh.addColorStop(1, "rgba(10,14,24,0.08)");
      ctx.fillStyle = sh;
      ctx.fillRect(0, WORLD.h*0.34, WORLD.w, WORLD.h*0.66);
      ctx.restore();

      // 자연스러운 흙길 패치(포탈 주변/랜덤)
      ctx.save();
      ctx.globalAlpha = 0.42;
      ctx.fillStyle = dirtPattern || "#c79a64";
      for (let i=0;i<16;i++){
        const x = WORLD.w*0.12 + Math.random()*WORLD.w*0.76;
        const y = WORLD.h*0.38 + Math.random()*WORLD.h*0.54;
        ctx.beginPath();
        ctx.ellipse(x, y, 60+Math.random()*140, 20+Math.random()*48, Math.random()*0.6, 0, Math.PI*2);
        ctx.fill();
      }
      // 포탈 앞에 길
      ctx.globalAlpha = 0.55;
      for (const p of portals){
        const cx = p.x + p.w*0.5;
        const cy = p.y + p.h*0.90;
        ctx.beginPath();
        ctx.ellipse(cx, cy+34, 74, 30, 0, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }

    function drawRoadsAndSidewalks(){
      // roads
      for (const r of roads){
        groundAO(r.x, r.y+r.h-18, r.w, 26, 0.20);

        ctx.save();
        // curb highlight
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "rgba(255,255,255,0.35)";
        roundRect(r.x-6, r.y-6, r.w+12, r.h+12, 44);
        ctx.fill();

        ctx.globalAlpha = 1;
        ctx.fillStyle = roadPattern || "#2a2f3b";
        roundRect(r.x, r.y, r.w, r.h, 40);
        ctx.fill();

        // inner highlight
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = "rgba(255,255,255,0.32)";
        roundRect(r.x+8, r.y+8, r.w-16, r.h*0.28, 30);
        ctx.fill();

        // center lane (strong visible)
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = "rgba(255,255,255,0.85)";
        ctx.lineWidth = 4;
        ctx.setLineDash([18, 16]);
        ctx.beginPath();
        ctx.moveTo(r.x + 26, r.y + r.h/2);
        ctx.lineTo(r.x + r.w - 26, r.y + r.h/2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }

      // sidewalks
      for (const s of sidewalks){
        groundAO(s.x, s.y+s.h-10, s.w, 20, 0.14);
        ctx.save();
        ctx.fillStyle = sidewalkPattern || "#f6efe6";
        roundRect(s.x, s.y, s.w, s.h, 18);
        ctx.fill();

        // top glossy
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        roundRect(s.x+4, s.y+3, s.w-8, Math.max(8, s.h*0.35), 14);
        ctx.fill();
        ctx.restore();
      }

      // crossings
      for (const c of crossings){
        ctx.save();
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = "rgba(255,255,255,0.22)";
        roundRect(c.x, c.y, c.w, c.h, 14);
        ctx.fill();

        ctx.globalAlpha = 0.92;
        for(let i=0;i<9;i++){
          const yy = c.y + 6 + i*6;
          ctx.fillStyle = (i%2===0) ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.10)";
          ctx.fillRect(c.x+10, yy, c.w-20, 4);
        }
        ctx.restore();
      }
    }

    /* ----------------------- LEGO palettes ----------------------- */
    function buildingPalette(type){
      const pal = {
        arcade: { main:"#ff5aa5", accent:"#0a84ff" },
        tower:  { main:"#7fd7ff", accent:"#ffcc00" },
        dojo:   { main:"#42e7a5", accent:"#ff3b30" },
        gym:    { main:"#ffd66b", accent:"#0a84ff" },
        igloo:  { main:"#bfe9ff", accent:"#34c759" },
        cafe:   { main:"#b889ff", accent:"#ffcc00" },
      };
      return pal[type] || pal.arcade;
    }

    /* ----------------------- Draw: portal building ----------------------- */
    function drawPortalBuilding(p, t){
      const pal = buildingPalette(p.type);
      const isActive = (activePortal === p);
      const pulse = 0.55 + 0.45*Math.sin(t*3.0 + hash01(p.key)*6);

      // base shadow
      groundAO(p.x+12, p.y+p.h-18, p.w-24, 28, 0.24);

      // base plate
      ctx.save();
      ctx.globalAlpha = 0.18 + (isActive ? 0.10*pulse : 0);
      ctx.fillStyle = isActive ? "rgba(10,132,255,0.95)" : "rgba(255,255,255,0.30)";
      ctx.beginPath();
      ctx.ellipse(p.x+p.w*0.5, p.y+p.h*0.90, 72, 22, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();

      // body
      const depth = Math.max(12, Math.min(26, p.w*0.06));
      const bx = p.x+18, by = p.y+54, bw = p.w-36, bh = p.h-80;
      legoBox3D(bx, by, bw, bh, depth, pal.main);
      studsOnRect(bx+10, by+10, bw-20, bh-20, 24, 7, 0.42);

      // roof plate
      const rx = p.x+p.w*0.18, ry = p.y+16, rw = p.w*0.64, rh = 44;
      ctx.save();
      ctx.fillStyle = shade(pal.main, +22);
      roundRect(rx, ry, rw, rh, 18);
      ctx.fill();
      glossyHighlight(rx, ry, rw, rh, 0.14);
      studsOnRect(rx+8, ry+8, rw-16, rh-16, 22, 6, 0.48);
      ctx.restore();

      // door (lego tile)
      const dx = p.x+p.w*0.44, dy = p.y+p.h*0.68, dw = p.w*0.12, dh = p.h*0.18;
      ctx.save();
      ctx.fillStyle = "rgba(10,14,24,0.22)";
      roundRect(dx, dy, dw, dh, 12); ctx.fill();
      ctx.fillStyle = shade(pal.accent, +10);
      roundRect(dx+4, dy+4, dw-8, dh-8, 10); ctx.fill();
      glossyHighlight(dx, dy, dw, dh, 0.14);
      ctx.restore();

      // windows
      const winY = p.y + p.h*0.56;
      for(let i=0;i<4;i++){
        const wx = p.x + p.w*0.22 + i*(p.w*0.14);
        const wy = winY;
        const ww = p.w*0.11, wh = p.h*0.10;

        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.20)";
        roundRect(wx, wy, ww, wh, 10); ctx.fill();

        const g = ctx.createLinearGradient(wx,wy,wx+ww,wy+wh);
        g.addColorStop(0, "rgba(180,245,255,0.95)");
        g.addColorStop(1, "rgba(10,14,24,0.10)");
        ctx.fillStyle = g;
        roundRect(wx+3, wy+3, ww-6, wh-6, 8);
        ctx.fill();

        ctx.globalAlpha = 0.22;
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        roundRect(wx+5, wy+5, ww*0.55, 7, 6);
        ctx.fill();
        ctx.restore();
      }

      // sign
      const sy = p.y + 6;
      const sx = p.x+p.w*0.18, sw = p.w*0.64;
      ctx.save();
      ctx.fillStyle = shade(pal.accent, +12);
      roundRect(sx, sy, sw, 34, 14);
      ctx.fill();
      glossyHighlight(sx, sy, sw, 34, 0.14);
      studsOnRect(sx+8, sy+8, sw-16, 34-16, 22, 5, 0.26);

      ctx.fillStyle = "rgba(10,14,24,0.92)";
      ctx.font = "900 13px system-ui";
      ctx.fillText(p.label, sx+12, sy+22);

      if (p.status !== "open"){
        ctx.fillStyle = "rgba(255,255,255,0.90)";
        roundRect(sx+sw*0.60, sy+38, sw*0.38, 24, 12);
        ctx.fill();
        ctx.fillStyle = "rgba(10,14,24,0.86)";
        ctx.font = "900 11px system-ui";
        ctx.fillText("오픈준비중", sx+sw*0.62, sy+55);
      }
      ctx.restore();
    }

    /* ----------------------- Draw: props ----------------------- */
    function drawTree(o){
      // 흔들림 없음 + 나무 모양(둥근 캐노피)
      const x=o.x, y=o.y, s=o.s;

      groundAO(x-34*s, y+20*s, 68*s, 20*s, 0.18);

      // trunk
      ctx.save();
      ctx.fillStyle = "#b46a2d";
      roundRect(x-10*s, y-22*s, 20*s, 48*s, 10*s);
      ctx.fill();
      glossyHighlight(x-10*s, y-22*s, 20*s, 48*s, 0.10);
      studsOnRect(x-12*s, y-20*s, 24*s, 44*s, 24, 5*s, 0.18);

      // canopy (3 blobs)
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#27d97c";
      ctx.beginPath();
      ctx.ellipse(x-22*s, y-46*s, 26*s, 22*s, 0, 0, Math.PI*2);
      ctx.ellipse(x+6*s,  y-58*s, 30*s, 26*s, 0, 0, Math.PI*2);
      ctx.ellipse(x+28*s, y-44*s, 26*s, 22*s, 0, 0, Math.PI*2);
      ctx.fill();

      // leaf texture overlay (no transparency 느낌 줄임: alpha 낮게)
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = leafPattern || "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.ellipse(x-22*s, y-46*s, 26*s, 22*s, 0, 0, Math.PI*2);
      ctx.ellipse(x+6*s,  y-58*s, 30*s, 26*s, 0, 0, Math.PI*2);
      ctx.ellipse(x+28*s, y-44*s, 26*s, 22*s, 0, 0, Math.PI*2);
      ctx.fill();

      // studs hint
      ctx.globalAlpha = 0.42;
      studsOnRect(x-54*s, y-86*s, 110*s, 64*s, 24, 6*s, 0.22);

      // highlight
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.beginPath();
      ctx.ellipse(x-4*s, y-68*s, 16*s, 11*s, 0, 0, Math.PI*2);
      ctx.fill();

      ctx.restore();
    }

    function drawLamp(o,t){
      const x=o.x, y=o.y, s=o.s;
      const pulse = 0.5+0.5*Math.sin(t*3.0 + x*0.01);

      groundAO(x-18*s, y+18*s, 36*s, 18*s, 0.14);

      ctx.save();
      ctx.fillStyle = "#404756";
      roundRect(x-5*s, y-42*s, 10*s, 70*s, 8*s);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      roundRect(x-16*s, y-54*s, 32*s, 22*s, 10*s);
      ctx.fill();
      glossyHighlight(x-16*s, y-54*s, 32*s, 22*s, 0.18);

      ctx.globalAlpha = 0.10 + 0.26*pulse;
      ctx.fillStyle = "#ffd66b";
      ctx.beginPath();
      ctx.ellipse(x, y-10*s, 34*s, 54*s, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }

    function drawBench(o){
      const x=o.x, y=o.y, s=o.s;
      groundAO(x-40*s, y+12*s, 80*s, 18*s, 0.12);

      ctx.save();
      ctx.fillStyle="#ffcc00";
      roundRect(x-42*s, y-2*s, 84*s, 18*s, 10*s);
      ctx.fill();
      glossyHighlight(x-42*s, y-2*s, 84*s, 18*s, 0.12);
      studsOnRect(x-40*s, y-2*s, 80*s, 18*s, 24, 5*s, 0.28);

      ctx.fillStyle="rgba(0,0,0,0.25)";
      roundRect(x-34*s, y+14*s, 14*s, 10*s, 5*s); ctx.fill();
      roundRect(x+20*s, y+14*s, 14*s, 10*s, 5*s); ctx.fill();
      ctx.restore();
    }

    function drawFlower(o,t){
      const x=o.x, y=o.y, s=o.s;
      const wig = Math.sin(t*2.1 + x*0.02)*1.3;

      ctx.save();
      groundAO(x-10*s, y+10*s, 20*s, 10*s, 0.10);

      ctx.strokeStyle = "#2dbf6b";
      ctx.lineWidth = 4*s;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x, y+8*s);
      ctx.lineTo(x+wig, y-12*s);
      ctx.stroke();

      ctx.fillStyle = "#ff5aa5";
      for(let i=0;i<6;i++){
        const a=(i/6)*Math.PI*2;
        ctx.beginPath();
        ctx.arc(x+wig+Math.cos(a)*7*s, y-16*s+Math.sin(a)*7*s, 4.6*s, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.fillStyle="#ffffff";
      ctx.beginPath(); ctx.arc(x+wig, y-16*s, 4.0*s, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    function drawSign(s){
      ctx.save();
      ctx.translate(s.x, s.y);

      groundAO(-28, 18, 56, 16, 0.12);

      ctx.fillStyle="#404756";
      roundRect(-4, -10, 8, 38, 6); ctx.fill();

      ctx.fillStyle="#ffffff";
      roundRect(-64, -56, 128, 36, 14); ctx.fill();
      glossyHighlight(-64, -56, 128, 36, 0.14);
      studsOnRect(-62, -54, 124, 32, 24, 5, 0.18);

      ctx.fillStyle="rgba(10,14,24,0.92)";
      ctx.font="900 14px system-ui";
      ctx.fillText(s.text, -44, -31);

      ctx.restore();
    }

    /* ----------------------- Draw: car (premium lego) ----------------------- */
    function drawCar(c, t){
      const bounce = Math.sin(c.bob)*0.35; // 과한 붕 뜨는 느낌 줄임
      ctx.save();
      ctx.translate(c.x, c.y + bounce);

      const w=c.w, h=c.h;
      const base=c.color;

      // shadow stronger for "grounded"
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "rgba(10,14,24,0.40)";
      ctx.beginPath();
      ctx.ellipse(0, h*0.58, w*0.56, h*0.34, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();

      if (c.axis==="h"){
        if (c.dir < 0) ctx.scale(-1,1);

        // chassis
        ctx.fillStyle = base;
        roundRect(-w*0.52, -h*0.40, w*1.04, h*0.80, 12);
        ctx.fill();
        glossyHighlight(-w*0.52, -h*0.40, w*1.04, h*0.80, 0.12);
        studsOnRect(-w*0.46, -h*0.34, w*0.92, h*0.68, 22, Math.max(4, h*0.18), 0.26);

        // roof piece
        ctx.fillStyle = shade(base, +16);
        roundRect(-w*0.20, -h*0.58, w*0.40, h*0.28, 10);
        ctx.fill();
        glossyHighlight(-w*0.20, -h*0.58, w*0.40, h*0.28, 0.14);

        // windshield
        const g = ctx.createLinearGradient(-w*0.12, -h*0.50, w*0.20, -h*0.18);
        g.addColorStop(0,"rgba(210,250,255,0.92)");
        g.addColorStop(1,"rgba(10,14,24,0.10)");
        ctx.fillStyle = g;
        roundRect(-w*0.18, -h*0.34, w*0.36, h*0.26, 8);
        ctx.fill();

        // bumper
        ctx.fillStyle = "rgba(10,14,24,0.18)";
        roundRect(-w*0.54, h*0.14, w*1.08, h*0.18, 10);
        ctx.fill();

        // wheels
        ctx.fillStyle="rgba(10,14,24,0.72)";
        ctx.beginPath();
        ctx.arc(-w*0.30, h*0.38, h*0.16, 0, Math.PI*2);
        ctx.arc(w*0.30,  h*0.38, h*0.16, 0, Math.PI*2);
        ctx.fill();

        // headlight
        ctx.globalAlpha=0.85;
        ctx.fillStyle="#ffffff";
        ctx.beginPath();
        ctx.ellipse(w*0.49, -h*0.05, w*0.06, h*0.12, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha=1;

        ctx.restore();
        return;
      }

      // vertical
      const goingDown = c.dir > 0;

      ctx.fillStyle = base;
      roundRect(-w*0.55, -h*0.50, w*1.10, h*1.00, 12);
      ctx.fill();
      glossyHighlight(-w*0.55, -h*0.50, w*1.10, h*1.00, 0.12);
      studsOnRect(-w*0.48, -h*0.44, w*0.96, h*0.88, 22, Math.max(4, w*0.22), 0.24);

      // roof
      ctx.fillStyle = shade(base, +16);
      roundRect(-w*0.34, -h*0.62, w*0.68, h*0.26, 10);
      ctx.fill();

      // glass
      const gg = ctx.createLinearGradient(0, -h*0.40, 0, h*0.20);
      gg.addColorStop(0, "rgba(210,250,255,0.92)");
      gg.addColorStop(1, "rgba(10,14,24,0.10)");
      ctx.fillStyle = gg;
      roundRect(-w*0.32, -h*0.30, w*0.64, h*0.52, 10);
      ctx.fill();

      // bumper
      ctx.fillStyle = "rgba(10,14,24,0.18)";
      roundRect(-w*0.56, h*0.32, w*1.12, h*0.16, 10);
      ctx.fill();

      // lights (FIX: up=tail, down=head)
      if (goingDown){
        ctx.globalAlpha=0.85;
        ctx.fillStyle="#ffffff";
        ctx.beginPath();
        ctx.ellipse(-w*0.22, h*0.50, w*0.12, h*0.08, 0, 0, Math.PI*2);
        ctx.ellipse(w*0.22,  h*0.50, w*0.12, h*0.08, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha=1;
      } else {
        ctx.globalAlpha=0.90;
        ctx.fillStyle="#ff3b30";
        ctx.beginPath();
        ctx.ellipse(-w*0.22, -h*0.50, w*0.12, h*0.08, 0, 0, Math.PI*2);
        ctx.ellipse(w*0.22,  -h*0.50, w*0.12, h*0.08, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.globalAlpha=1;
      }

      ctx.restore();
    }

    /* ----------------------- Draw: footprints ----------------------- */
    function drawFootprints(){
      ctx.save();
      for (const f of footprints){
        const a = 0.22 * (1 - f.age/f.life);
        ctx.globalAlpha = a;
        ctx.fillStyle = "rgba(10,14,24,0.65)";
        ctx.beginPath();
        ctx.ellipse(f.x, f.y, 5.2, 2.4, 0, 0, Math.PI*2);
        ctx.fill();
      }
      ctx.restore();
    }

    /* ----------------------- Draw: MINIFIG (hat + dir) ----------------------- */
    function drawMinifig(x,y){
      // "떠다님" 제거: bob 거의 없음
      const bob = player.moving ? Math.sin(player.bobT)*0.25 : 0;
      const dir = player.dir;
      const swing = player.moving ? Math.sin(player.animT*10) : 0;
      const armSwing = 3*swing;
      const legSwing = 4*swing;

      // strong grounded shadow
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle="rgba(10,14,24,0.42)";
      ctx.beginPath();
      ctx.ellipse(x, y+28, 20, 7, 0, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(x, y + bob);

      // flip for left
      if (dir==="left") ctx.scale(-1, 1);

      // color choices (premium)
      const skin = "#ffd66b";
      const torso = "#0a84ff";
      const pants = "#404756";
      const hat = "#ff3b30";

      // HEAD
      ctx.save();
      const headG = ctx.createRadialGradient(-6,-24,6, 0,-18,22);
      headG.addColorStop(0, "rgba(255,255,255,0.95)");
      headG.addColorStop(0.45, skin);
      headG.addColorStop(1, "rgba(10,14,24,0.18)");
      ctx.fillStyle = headG;
      ctx.beginPath(); ctx.arc(0,-20,16,0,Math.PI*2); ctx.fill();
      ctx.strokeStyle="rgba(0,0,0,0.18)";
      ctx.lineWidth=2;
      ctx.beginPath(); ctx.arc(0,-20,16,0,Math.PI*2); ctx.stroke();

      // HAT (lego cap 느낌)
      ctx.fillStyle = hat;
      // brim
      roundRect(-16, -40, 32, 8, 6); ctx.fill();
      // cap top
      roundRect(-14, -52, 28, 14, 8); ctx.fill();
      glossyHighlight(-14, -52, 28, 14, 0.16);

      // face by dir
      if (dir==="down"){
        ctx.fillStyle="rgba(10,14,24,0.70)";
        ctx.beginPath();
        ctx.arc(-5,-22,2.2,0,Math.PI*2);
        ctx.arc(5,-22,2.2,0,Math.PI*2);
        ctx.fill();

        ctx.strokeStyle="rgba(10,14,24,0.62)";
        ctx.lineWidth=2;
        ctx.beginPath();
        ctx.arc(0,-18,6,0,Math.PI);
        ctx.stroke();

        ctx.globalAlpha=0.20;
        ctx.fillStyle="rgba(255,80,120,0.95)";
        ctx.beginPath();
        ctx.arc(-9,-16,3,0,Math.PI*2);
        ctx.arc(9,-16,3,0,Math.PI*2);
        ctx.fill();
        ctx.globalAlpha=1;
      } else if (dir==="up"){
        // back-of-head print (lego 느낌)
        ctx.globalAlpha=0.20;
        ctx.fillStyle="rgba(10,14,24,0.70)";
        roundRect(-9,-26,18,10,6); ctx.fill();
        ctx.globalAlpha=1;
      } else {
        // side
        ctx.fillStyle="rgba(10,14,24,0.70)";
        ctx.beginPath(); ctx.arc(5,-22,2.2,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle="rgba(10,14,24,0.62)";
        ctx.lineWidth=2;
        ctx.beginPath();
        ctx.arc(6,-18,6,-0.1,Math.PI-0.2);
        ctx.stroke();
        ctx.globalAlpha=0.18;
        ctx.fillStyle="rgba(255,80,120,0.95)";
        ctx.beginPath(); ctx.arc(11,-16,3,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha=1;
      }
      ctx.restore();

      // TORSO
      ctx.fillStyle=torso;
      roundRect(-14,-4,28,28,12); ctx.fill();
      glossyHighlight(-14,-4,28,28,0.12);
      // chest print
      ctx.globalAlpha=0.18;
      ctx.fillStyle="rgba(255,255,255,0.95)";
      roundRect(-10, 8, 20, 7, 5); ctx.fill();
      ctx.globalAlpha=1;

      // ARMS (dir별 더 자연스러운 위치)
      ctx.fillStyle=torso;
      if (dir==="up"){
        roundRect(-22,3,10,16,8); ctx.fill();
        roundRect(12,3,10,16,8); ctx.fill();
      } else {
        roundRect(-22,2,10,18,8); ctx.fill();
        roundRect(12,2,10,18,8); ctx.fill();
      }

      // HANDS
      ctx.fillStyle=skin;
      roundRect(-22,16+armSwing,10,8,6); ctx.fill();
      roundRect(12,16-armSwing,10,8,6); ctx.fill();

      // LEGS
      ctx.fillStyle=pants;
      roundRect(-12,22,11,16,6); ctx.fill();
      roundRect(1,22,11,16,6); ctx.fill();

      // FEET
      ctx.fillStyle="rgba(10,14,24,0.72)";
      ctx.beginPath();
      ctx.ellipse(-6, 40+legSwing, 6, 3, 0, 0, Math.PI*2);
      ctx.ellipse(6,  40-legSwing, 6, 3, 0, 0, Math.PI*2);
      ctx.fill();

      ctx.restore();
    }

    /* ----------------------- Title ----------------------- */
    function drawWorldTitle(){
      const text = "FA미니월드";
      const padX = 18;

      ctx.save();
      ctx.globalAlpha = 0.96;
      ctx.font = "900 20px system-ui";
      const tw = ctx.measureText(text).width;
      const bw = tw + padX*2;
      const bh = 40;
      const x = VIEW.w*0.5 - bw*0.5;
      const y = 14;

      ctx.fillStyle = "rgba(255,255,255,0.90)";
      ctx.strokeStyle = "rgba(0,0,0,0.10)";
      ctx.lineWidth = 2;
      roundRect(x, y, bw, bh, 18);
      ctx.fill(); ctx.stroke();
      glossyHighlight(x, y, bw, bh, 0.14);
      studsOnRect(x+10, y+10, bw-20, bh-20, 22, 5, 0.16);

      ctx.fillStyle = "rgba(10,14,24,0.92)";
      ctx.fillText(text, x + padX, y + 27);
      ctx.restore();
    }

    /* ----------------------- Depth sorting ----------------------- */
    function getFootY(entity){
      if (entity.kind === "building") return entity.y + entity.h;
      if (entity.kind === "car") return entity.y + entity.h;
      if (entity.kind === "tree") return entity.y + 64 * entity.s;
      if (entity.kind === "lamp") return entity.y + 68 * entity.s;
      if (entity.kind === "bench") return entity.y + 32 * entity.s;
      if (entity.kind === "flower") return entity.y + 12 * entity.s;
      if (entity.kind === "sign") return entity.y + 40;
      if (entity.kind === "player") return entity.y + 30;
      return entity.y;
    }

    /* ----------------------- Update / Draw loop ----------------------- */
    let lastT = performance.now();
    let acc=0, framesCount=0;

    function update(dt, t){
      // player move
      let ax=0, ay=0;
      if (!dragging && !modalState.open){
        if (keys.has("a") || keys.has("arrowleft")) ax -= 1;
        if (keys.has("d") || keys.has("arrowright")) ax += 1;
        if (keys.has("w") || keys.has("arrowup")) ay -= 1;
        if (keys.has("s") || keys.has("arrowdown")) ay += 1;

        const moving = (ax!==0 || ay!==0);
        player.moving = moving;

        if (moving){
          updateDirFromAxes(ax, ay);
          const len = Math.hypot(ax, ay) || 1;
          player.x += (ax/len) * player.speed * dt;
          player.y += (ay/len) * player.speed * dt;
          clampPlayerToWorld();
          player.animT += dt;
        } else {
          player.animT *= 0.90;
        }
      }

      // bob minimal (grounded)
      player.bobT += dt*6.0;
      addFootprint(dt);

      // cars
      for (const c of cars){
        c.bob += dt*3.0;
        if (c.axis === "h"){
          c.x += c.dir * c.speed * dt;
          const hr = roads[0];
          if (c.dir > 0 && c.x > hr.x + hr.w + 140) c.x = hr.x - 140;
          if (c.dir < 0 && c.x < hr.x - 140) c.x = hr.x + hr.w + 140;
        } else {
          c.y += c.dir * c.speed * dt;
          const vr = roads[1];
          if (c.dir > 0 && c.y > vr.y + vr.h + 140) c.y = vr.y - 140;
          if (c.dir < 0 && c.y < vr.y - 140) c.y = vr.y + vr.h + 140;
        }
      }

      // clouds / birds
      for (const c of clouds){
        c.x += c.v * (c.layer===0 ? 1.0 : 0.75) * dt;
        if (c.x > WORLD.w + 420){
          c.x = -420;
          c.y = 40 + Math.random()*260;
          c.s = 0.7 + Math.random()*1.2;
          c.v = 9 + Math.random()*16;
          c.layer = Math.random()<0.5 ? 0 : 1;
        }
      }
      for (const b of birds){
        b.x += b.v*dt;
        b.p += dt*4.2;
        if (b.x > WORLD.w + 240){
          b.x = -200;
          b.y = 70 + Math.random()*160;
          b.v = 22 + Math.random()*20;
          b.p = Math.random()*10;
        }
      }

      // portal collision
      activePortal = null;
      for (const p of portals){
        const z = portalEnterZone(p);
        if (circleRectHit(player.x, player.y, player.r, z)){ activePortal = p; break; }
      }

      // toast (엔터 안내 텍스트는 제거하고, “입장” 상태만 안내)
      if (!modalState.open && activePortal){
        UI.toast.hidden = false;
        if (activePortal.status === "open"){
          UI.toast.innerHTML = `🧱 <b>${activePortal.label}</b><br/>포탈 앞이에요. <b>입장하려면 Enter/E</b> 또는 <b>클릭/터치</b>`;
        } else {
          UI.toast.innerHTML = `🧱 <b>${activePortal.label}</b><br/>현재 <b>오픈준비중입니다</b> ✨`;
        }
      } else if (!modalState.open) {
        UI.toast.hidden = true;
      }

      // footprints life
      for (let i=footprints.length-1;i>=0;i--){
        const f = footprints[i];
        f.age += dt;
        if (f.age >= f.life) footprints.splice(i,1);
      }

      updateCamera(dt);

      UI.coord.textContent = `x: ${Math.round(player.x)} · y: ${Math.round(player.y)}`;

      // fps
      acc += dt; framesCount++;
      if (acc >= 0.45){
        const fps = Math.round(framesCount/acc);
        UI.fps.textContent = `fps: ${fps}`;
        acc=0; framesCount=0;
      }
    }

    function draw(t){
      ctx.clearRect(0,0,VIEW.w,VIEW.h);

      ctx.save();
      ctx.translate(-cam.x, -cam.y);

      drawSkyWorld(t);
      drawCloudsWorld();
      drawGroundWorld();
      drawRoadsAndSidewalks();
      drawFootprints();

      // depth sorting
      const items = [];
      for (const p of portals) items.push({ kind:"building", ref:p, footY:getFootY({kind:"building", y:p.y, h:p.h}) });
      for (const c of cars) items.push({ kind:"car", ref:c, footY:getFootY(c) });
      for (const pr of props) items.push({ kind:pr.kind, ref:pr, footY:getFootY(pr) });
      for (const s of signs) items.push({ kind:"sign", ref:s, footY:getFootY({kind:"sign", y:s.y}) });
      items.push({ kind:"player", ref:player, footY:getFootY({kind:"player", y:player.y}) });

      items.sort((a,b)=>a.footY-b.footY);

      for (const it of items){
        if (it.kind==="building") drawPortalBuilding(it.ref, t);
        else if (it.kind==="car") drawCar(it.ref, t);
        else if (it.kind==="tree") drawTree(it.ref);
        else if (it.kind==="lamp") drawLamp(it.ref, t);
        else if (it.kind==="bench") drawBench(it.ref);
        else if (it.kind==="flower") drawFlower(it.ref, t);
        else if (it.kind==="sign") drawSign(it.ref);
        else if (it.kind==="player") drawMinifig(player.x, player.y);
      }

      ctx.restore();
      drawWorldTitle();
    }

    /* ----------------------- Main loop (crash guard) ----------------------- */
    function loop(now){
      const t = now/1000;
      const dt = Math.min(0.033, (now-lastT)/1000);
      lastT = now;

      try {
        update(dt, t);
        draw(t);
      } catch (err) {
        console.error(err);
        UI.toast.hidden = false;
        UI.toast.innerHTML = `🧱 <b>JS 에러</b><br/>콘솔(Console) 확인: ${String(err).slice(0,140)}`;
      }

      requestAnimationFrame(loop);
    }

    /* ----------------------- Pointer click on portal (open UI) ----------------------- */
    canvas.addEventListener("pointerdown", (e) => {
      // 포탈 클릭/터치로도 입장 UI 열기
      const p = getPointer(e);
      const w = screenToWorld(p.x, p.y);
      if (activePortal && !modalState.open) {
        // 포탈 근처일 때만
        const z = portalEnterZone(activePortal);
        if (w.x >= z.x-20 && w.x <= z.x+z.w+20 && w.y >= z.y-20 && w.y <= z.y+z.h+20) {
          openPortalUI(activePortal);
        }
      }
    }, { passive:true });

    // modal confirm: 모바일은 손 떼기(=pointerup)로 confirm
    UI.modal.addEventListener("pointerup", () => {
      if (isTouchDevice() && modalState.open && modalState.portal) confirmEnter(modalState.portal);
    });

    /* ----------------------- Start ----------------------- */
    resize();
    for (const b of birds){
      b.x = Math.random()*WORLD.w;
      b.y = 70 + Math.random()*160;
    }
    requestAnimationFrame(loop);
  });
})();
