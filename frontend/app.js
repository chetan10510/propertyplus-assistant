const chat = document.getElementById("chat");
const msg = document.getElementById("msg");
const flow = document.getElementById("flow");
const send = document.getElementById("send");
const mic = document.getElementById("mic");

// 👉 Change this to your Render backend URL after deployment
const API_URL = "https://propertyplus-backend.onrender.com";

function addMessage(text, cls) {
  const div = document.createElement("div");
  div.className = "msg " + cls;
  div.textContent = text;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

async function sendMessage(m) {
  if (!m) return;
  addMessage("👤 " + m, "user");
  msg.value = "";

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: m, flow: flow.value, sessionId: "demo" })
    });

    const data = await res.json();
    addMessage("🤖 " + (data.reply || "Error"), "bot");
  } catch (err) {
    addMessage("❌ Connection error. Is backend running?", "bot");
  }
}

send.onclick = () => sendMessage(msg.value);
msg.addEventListener("keypress", e => {
  if (e.key === "Enter") sendMessage(msg.value);
});

window.onload = async () => {
  try {
    const res = await fetch(`${API_URL}/suggest`, { method: "POST" });
    const data = await res.json();
    addMessage("💡 Suggestions:\n" + data.suggestions, "bot");
  } catch (err) {
    addMessage("⚠️ Could not load suggestions. Backend offline?", "bot");
  }
};

// 🎤 Voice input
let recognition;
mic.onclick = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    alert("SpeechRecognition not supported");
    return;
  }
  recognition = new SR();
  recognition.lang = "en-IN";
  recognition.onresult = (e) => {
    msg.value = e.results[0][0].transcript;
    sendMessage(msg.value);
  };
  recognition.start();
};
