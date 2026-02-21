// =============================
// HBU.JS LEGO WORLD FULL
// =============================

const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");

let W=0,H=0,DPR=1;

const VIEW={zoom:0.9,w:0,h:0};

function resize(){
  DPR=Math.max(1,window.devicePixelRatio||1);
  const r=canvas.getBoundingClientRect();
  W=r.width;H=r.height;
  canvas.width=W*DPR;
  canvas.height=H*DPR;
  VIEW.w=W/VIEW.zoom;
  VIEW.h=H/VIEW.zoom;
  ctx.setTransform(DPR*VIEW.zoom,0,0,DPR*VIEW.zoom,0,0);
}
window.addEventListener("resize",resize);

const WORLD={w:3000,h:2200};
const cam={x:0,y:0};

function clamp(v,a,b){return Math.max(a,Math.min(b,v));}

// =============================
// PLAYER LEGO MINIFIG
// =============================
const player={
 x:400,y:400,r:18,
 dir:"down",speed:260,
 anim:0,moving:false
};

// =============================
// INPUT
// =============================
const keys=new Set();
window.addEventListener("keydown",e=>keys.add(e.key.toLowerCase()));
window.addEventListener("keyup",e=>keys.delete(e.key.toLowerCase()));

// =============================
// LEGO COLORS
// =============================
const legoColors=[
 "#ff3b30","#ff9500","#ffcc00","#34c759",
 "#0a84ff","#5856d6","#af52de","#ff2d55"
];

// =============================
// CAMERA
// =============================
function updateCamera(){
 cam.x=clamp(player.x-VIEW.w/2,0,WORLD.w-VIEW.w);
 cam.y=clamp(player.y-VIEW.h/2,0,WORLD.h-VIEW.h);
}

// =============================
// LEGO BRICK
// =============================
function drawBrick(x,y,w,h,color){
 ctx.fillStyle=color;
 ctx.fillRect(x,y,w,h);

 // top highlight
 ctx.fillStyle="rgba(255,255,255,0.25)";
 ctx.fillRect(x,y,w,6);

 // side shade
 ctx.fillStyle="rgba(0,0,0,0.15)";
 ctx.fillRect(x+w-6,y,6,h);

 // studs
 const cols=Math.floor(w/20);
 for(let i=0;i<cols;i++){
   ctx.fillStyle="rgba(255,255,255,0.4)";
   ctx.beginPath();
   ctx.arc(x+10+i*20,y+6,4,0,Math.PI*2);
   ctx.fill();
 }
}

// =============================
// GROUND LEGO PLATE
// =============================
function drawGround(){
 ctx.fillStyle="#7ccf8a";
 ctx.fillRect(0,0,WORLD.w,WORLD.h);

 for(let x=0;x<WORLD.w;x+=28){
  for(let y=0;y<WORLD.h;y+=28){
   ctx.fillStyle="rgba(255,255,255,0.2)";
   ctx.beginPath();
   ctx.arc(x+6,y+6,3,0,Math.PI*2);
   ctx.fill();
  }
 }
}

// =============================
// LEGO BUILDING
// =============================
function drawBuilding(x,y,w,h,color){
 const rows=Math.floor(h/22);
 for(let i=0;i<rows;i++){
   drawBrick(x,y+i*22,w,20,color);
 }
}

// =============================
// LEGO TREE
// =============================
function drawTree(x,y){
 drawBrick(x-6,y-40,12,40,"#8b5a2b");

 ctx.fillStyle="#2ecc71";
 ctx.beginPath();
 ctx.arc(x,y-50,26,0,Math.PI*2);
 ctx.fill();

 ctx.beginPath();
 ctx.arc(x-16,y-30,22,0,Math.PI*2);
 ctx.fill();

 ctx.beginPath();
 ctx.arc(x+16,y-30,22,0,Math.PI*2);
 ctx.fill();
}

// =============================
// LEGO CAR
// =============================
function drawCar(x,y){
 drawBrick(x-26,y-12,52,24,legoColors[Math.floor(Math.random()*legoColors.length)]);
 drawBrick(x-16,y-22,32,10,"#ffffff");

 ctx.fillStyle="#000";
 ctx.beginPath();
 ctx.arc(x-18,y+12,6,0,Math.PI*2);
 ctx.arc(x+18,y+12,6,0,Math.PI*2);
 ctx.fill();
}

// =============================
// LEGO PLAYER
// =============================
function drawPlayer(){
 const x=player.x;
 const y=player.y;

 // legs
 ctx.fillStyle="#0a84ff";
 ctx.fillRect(x-8,y,6,14);
 ctx.fillRect(x+2,y,6,14);

 // torso
 drawBrick(x-10,y-18,20,18,"#ffcc00");

 // arms
 ctx.fillStyle="#ffcc00";
 ctx.fillRect(x-16,y-18,6,16);
 ctx.fillRect(x+10,y-18,6,16);

 // head
 ctx.fillStyle="#ffd1a4";
 ctx.beginPath();
 ctx.arc(x,y-26,8,0,Math.PI*2);
 ctx.fill();

 // face
 ctx.fillStyle="#000";
 ctx.beginPath();
 ctx.arc(x-3,y-27,1.2,0,Math.PI*2);
 ctx.arc(x+3,y-27,1.2,0,Math.PI*2);
 ctx.fill();

 ctx.beginPath();
 ctx.arc(x,y-24,2,0,Math.PI);
 ctx.stroke();
}

// =============================
// WORLD OBJECTS
// =============================
const buildings=[
 {x:600,y:300,w:160,h:120,color:"#ff3b30"},
 {x:900,y:600,w:160,h:140,color:"#0a84ff"},
 {x:1400,y:500,w:180,h:120,color:"#34c759"}
];

const trees=[
 {x:300,y:600},{x:1200,y:900},{x:1700,y:400}
];

// =============================
// UPDATE
// =============================
function update(dt){
 let ax=0,ay=0;
 if(keys.has("w")||keys.has("arrowup"))ay--;
 if(keys.has("s")||keys.has("arrowdown"))ay++;
 if(keys.has("a")||keys.has("arrowleft"))ax--;
 if(keys.has("d")||keys.has("arrowright"))ax++;

 const moving=ax||ay;
 player.moving=moving;

 if(moving){
  const len=Math.hypot(ax,ay)||1;
  player.x+=ax/len*player.speed*dt;
  player.y+=ay/len*player.speed*dt;
 }

 updateCamera();
}

// =============================
// DRAW
// =============================
function draw(){
 ctx.clearRect(0,0,VIEW.w,VIEW.h);

 ctx.save();
 ctx.translate(-cam.x,-cam.y);

 drawGround();

 buildings.forEach(b=>drawBuilding(b.x,b.y,b.w,b.h,b.color));
 trees.forEach(t=>drawTree(t.x,t.y));

 drawPlayer();

 ctx.restore();
}

// =============================
// LOOP
// =============================
let last=performance.now();

function loop(now){
 const dt=Math.min(0.033,(now-last)/1000);
 last=now;

 update(dt);
 draw();

 requestAnimationFrame(loop);
}

// =============================
resize();
requestAnimationFrame(loop);
