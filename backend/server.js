import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import cors from "cors";
import { flows } from "./flows.js";
import { getSession, updateSession, clearSession } from "./utils/memory.js";

dotenv.config({ override: true });
const app = express();
app.use(cors());
app.use(express.json());

console.log("🔑 Loaded key prefix:", process.env.OPENAI_API_KEY?.slice(0, 7));

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

//         Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

//  Chat endpoint
app.post("/chat", async (req, res) => {
  const { sessionId = "default", message, flow = "general" } = req.body;
  const systemPrompt = flows[flow] || flows.general;
  const session = getSession(sessionId);

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...session,
        { role: "user", content: message }
      ],
      temperature: 0.6,
      max_tokens: 600
    });

    let reply = completion.choices[0].message.content || "";

    // 🧹 Clean up formatting — removes markdown bullets and code blocks but keeps numbered lists
    reply = reply
      .replace(/^[\-\*\•]\s*/gm, "") // remove "- ", "* ", "• "
      .replace(/^#+\s*/gm, "")       // remove markdown headings
      .replace(/```[\s\S]*?```/g, "") // remove ``` code blocks
      .replace(/\n{3,}/g, "\n\n")    // normalize spacing
      .trim();

    updateSession(sessionId, { role: "user", content: message });
    updateSession(sessionId, { role: "assistant", content: reply });

    res.json({ reply });
  } catch (err) {
    console.error("❌ OpenAI API Error:", err.message);
    res.status(500).json({
      error: "AI request failed. Please check your API key or try again."
    });
  }
});


app.post("/suggest", async (req, res) => {
  res.json({ suggestions: "" }); // send empty result
});


//  Start server
app.listen(5000, () =>
  console.log("✅ Backend running at http://localhost:5000")
);
