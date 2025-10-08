const orbCanvas = document.getElementById("voiceOrb");
const ctx = orbCanvas.getContext("2d");
function resize() {
  orbCanvas.width = 120;
  orbCanvas.height = 120;
}
resize();
let t = 0;
let listening = false;
let volume = 0;
function drawOrb(){
  ctx.clearRect(0,0,orbCanvas.width,orbCanvas.height);
  const cx = orbCanvas.width/2, cy = orbCanvas.height/2;
  const base = listening ? 36 : 28;
  const spikes = 50;
  ctx.beginPath();
  for(let i=0;i<=spikes;i++){
    const theta = i*(Math.PI*2)/spikes;
    const offset = Math.sin(i*0.6 + t)*(listening?6:2);
    const react = listening ? volume*24 : 0;
    const r = base + offset + react;
    const x = cx + Math.cos(theta)*r;
    const y = cy + Math.sin(theta)*r;
    if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
  }
  ctx.closePath();
  ctx.fillStyle = listening ? "#d1d5db" : "#22303a";
  ctx.fill();
  t += 0.04;
  requestAnimationFrame(drawOrb);
}
drawOrb();
window.setListeningState = (s)=>{ listening = !!s; }
window.updateVolume = (v)=>{ volume = Math.max(0, Math.min(1, v)); }
