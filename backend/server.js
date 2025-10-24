import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import cors from "cors";
import fs from "fs";
import fetch from "node-fetch";
import { flows } from "./flows.js";
import { getSession, updateSession } from "./utils/memory.js";
import { normalizeListings } from "./utils/normalizeData.js";

dotenv.config({ path: "../.env", override: true });

console.log("🔑 Using key:", process.env.OPENAI_API_KEY?.slice(0, 8) + "…");
console.log("🤖 Model:", process.env.MODEL_ID || "gpt-4o-mini");

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const SERP_API_KEY = process.env.SERPAPI_KEY;

// --- Load property dataset for fallback (RAG) ---
const propertyData = JSON.parse(
  fs.readFileSync("./data/properties.json", "utf-8")
);

// --- HEALTH CHECK ---
app.get("/health", (req, res) => res.json({ status: "ok" }));

// --- MAIN CHAT ENDPOINT ---
app.post("/chat", async (req, res) => {
  const { sessionId = "default", message, flow = "general" } = req.body;
  const systemPrompt = flows[flow] || flows.general;
  const session = getSession(sessionId);

  try {
    const completion = await client.chat.completions.create({
      model: process.env.MODEL_ID || "gpt-4o-mini",
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        ...session,
        { role: "user", content: message },
      ],
    });

    const reply = completion.choices[0].message.content.trim();
    updateSession(sessionId, { role: "user", content: message });
    updateSession(sessionId, { role: "assistant", content: reply });

    res.json({ reply });
  } catch (err) {
    console.error("❌ OpenAI error:", err);
    res.status(500).json({ error: "AI request failed" });
  }
});

// --- RAG FALLBACK ENDPOINT ---
app.post("/rag-search", async (req, res) => {
  const { message } = req.body;

  const matches = propertyData.filter((p) =>
    message.toLowerCase().includes(p.city.toLowerCase())
  );

  const context = matches.length
    ? `Available listings:\n${matches
        .map(
          (p) =>
            `• ${p.name} — ${p.type} in ${p.city}, priced at $${p.price}, ${p.units} units.`
        )
        .join("\n")}`
    : "No listings found locally. Summarize general market insights instead.";

  try {
    const completion = await client.chat.completions.create({
      model: process.env.MODEL_ID || "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content:
            "You are Property+, an expert real estate assistant. Use the provided listing context to give factual, concise responses about properties or housing markets.",
        },
        { role: "user", content: `Query: ${message}\n\nContext:\n${context}` },
      ],
    });

    const reply = completion.choices[0].message.content.trim();
    res.json({ reply });
  } catch (err) {
    console.error("❌ RAG error:", err);
    res.status(500).json({ error: "RAG processing failed" });
  }
});

// --- LIVE SEARCH ENDPOINT (via Tavily Search API + normalization) ---
app.post("/live-search", async (req, res) => {
  const { message } = req.body;

  try {
    const tavilyRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query: message,
        max_results: 6,
        include_answer: true,
      }),
    });

    const data = await tavilyRes.json();

    if (!data.results || !data.results.length) {
      console.warn("⚠️ No results from Tavily");
      return res.json({
        reply:
          "I couldn’t find any recent listings for that location. Try specifying a neighborhood or city name (e.g., 'apartments for rent in Mumbai').",
      });
    }

    //  Normalize listings
    const normalized = normalizeListings(data.results);

    // summarize
    const completion = await client.chat.completions.create({
      model: process.env.MODEL_ID || "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content:
            "You are Property+, a professional real estate AI assistant. Based on the structured property listings provided, summarize the top options clearly — mention name, price, location, and type. Keep it concise and professional.",
        },
        {
          role: "user",
          content: JSON.stringify(normalized, null, 2),
        },
      ],
    });

    const reply = completion.choices[0].message.content.trim();
    res.json({ reply });
  } catch (err) {
    console.error("❌ Tavily live search error:", err.message || err);
    res.status(500).json({ error: "Failed to fetch live property data" });
  }
});

// --- INSIGHT SUGGESTIONS ---
app.post("/suggest", async (_req, res) => {
  try {
    const completion = await client.chat.completions.create({
      model: process.env.MODEL_ID || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Just say You can ask me about property listings, market prices, rental units, and occupancy rates in various cities. Provide a few example questions to get users started.",
        },
      ],
    });
    res.json({ suggestions: completion.choices[0].message.content });
  } catch (err) {
    console.error("❌ Suggestion error:", err.message || err);
    res.status(500).json({ error: "Suggestion generation failed" });
  }
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ Backend running at http://localhost:${PORT}`)
);
