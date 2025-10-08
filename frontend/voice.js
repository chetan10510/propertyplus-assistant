const startBtn = document.getElementById("start-voice");
const stopBtn = document.getElementById("stop-voice");
const voiceStatus = document.getElementById("voiceStatus");
let recognition = null;
let audioCtx = null;
let micStream = null;
let analyser = null;

function initRecognition(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR) return null;
  const r = new SR();
  r.continuous = true;
  r.interimResults = true;
  r.lang = "en-IN";
  r.onstart = ()=>{ voiceStatus.textContent = "Listening..."; window.setListeningState(true); };
  r.onend = ()=>{ voiceStatus.textContent = "Stopped"; window.setListeningState(false); };
  r.onerror = (e)=>{ voiceStatus.textContent = "Error: " + (e.error || "unknown"); window.setListeningState(false); };
  r.onresult = (e)=>{
    let interim = "";
    let final = "";
    for(let i=e.resultIndex;i<e.results.length;i++){
      const t = e.results[i][0].transcript;
      if(e.results[i].isFinal) final += t.trim() + " ";
      else interim += t;
    }
    const input = document.getElementById("user-input");
    if(final) {
      input.value = final.trim();
      document.getElementById("send").click();
    } else {
      input.value = interim || input.value;
    }
  };
  return r;
}

async function startMicVolume(){
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    micStream = await navigator.mediaDevices.getUserMedia({ audio:true });
    const src = audioCtx.createMediaStreamSource(micStream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);
    function tick(){
      analyser.getByteFrequencyData(buf);
      let s = 0;
      for(let i=0;i<buf.length;i++) s += buf[i];
      const avg = s / buf.length;
      window.updateVolume(avg/255);
      if(audioCtx) requestAnimationFrame(tick);
    }
    tick();
  } catch(e){
    console.warn("Mic error",e);
  }
}

function stopMicVolume(){
  if(micStream) micStream.getTracks().forEach(t=>t.stop());
  if(audioCtx) audioCtx.close();
  micStream=null; audioCtx=null; analyser=null;
  window.updateVolume(0);
}

startBtn.addEventListener("click", async ()=>{
  recognition = initRecognition();
  if(recognition) recognition.start();
  await startMicVolume();
  startBtn.disabled = true;
  stopBtn.disabled = false;
});

stopBtn.addEventListener("click", ()=>{
  if(recognition) recognition.stop();
  stopMicVolume();
  startBtn.disabled = false;
  stopBtn.disabled = true;
});
