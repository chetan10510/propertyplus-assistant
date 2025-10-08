const backendUrl = "https://propertyplus-backend.onrender.com";
const chat = document.getElementById("chat");
const input = document.getElementById("user-input");
const sendBtn = document.getElementById("send");
const flowSel = document.getElementById("flow");

function appendMessage(text, cls) {
  const d = document.createElement("div");
  d.className = "msg " + cls;
  d.textContent = text;
  chat.appendChild(d);
  chat.scrollTop = chat.scrollHeight;
}

let inFlight = false;

async function sendMessage(text) {
  if (!text || inFlight) return;
  inFlight = true;
  sendBtn.disabled = true;

  appendMessage(text, "user");
  input.value = ""; // ✅ clear input right after sending

  try {
    const res = await fetch(`${backendUrl}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        flow: flowSel.value,
        sessionId: "demo",
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      appendMessage("Error: " + err, "bot");
    } else {
      const data = await res.json();
      appendMessage(data.reply || "No response", "bot");
    }
  } catch (e) {
    appendMessage("Network or server error", "bot");
    console.error(e);
  } finally {
    inFlight = false;
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener("click", () => sendMessage(input.value.trim()));

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage(input.value.trim());
  }
});

window.addEventListener("load", async () => {
  try {
    const r = await fetch(`${backendUrl}/suggest`, { method: "POST" });
    if (r.ok) {
      const j = await r.json();
      appendMessage(
        j.suggestions || j.suggestions?.toString() || "No suggestions",
        "bot"
      );
    }
  } catch (e) {
    console.warn("No suggestions available");
  }
});
