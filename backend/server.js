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

console.log("🔑 Loaded key prefix:", process.env.OPENAI_API_KEY?.slice(0,7));

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

app.get("/health", (req,res)=> res.json({status:"ok"}));

app.post("/chat", async (req, res) => {
  const { sessionId="default", message, flow="general" } = req.body;
  const systemPrompt = flows[flow] || flows.general;
  const session = getSession(sessionId);

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...session,
        { role: "user", content: message }
      ]
    });

    const reply = completion.choices[0].message.content;
    updateSession(sessionId, { role:"user", content: message });
    updateSession(sessionId, { role:"assistant", content: reply });
    res.json({ reply });
  } catch(err){
    console.error("❌",err);
    res.status(500).json({error:"AI request failed"});
  }
});

app.post("/suggest", async (req,res)=>{
  try {
    const completion = await client.chat.completions.create({
      model:"gpt-4o-mini",
      messages:[
        {role:"system", content:"Generate 3 proactive insights for a property manager. Format as bullet points."}
      ]
    });
    res.json({ suggestions: completion.choices[0].message.content });
  }catch(err){
    res.status(500).json({error:"Failed"});
  }
});

app.listen(5000, ()=> console.log("✅ Backend at http://localhost:5000"));
