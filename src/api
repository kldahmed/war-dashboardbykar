// api/claude.js — Vercel Serverless Function
// ضعه في مجلد /api في مشروعك على Vercel
// المتصفح يستدعي /api/claude بدلاً من api.anthropic.com مباشرة

export default async function handler(req, res) {
// فقط POST
if (req.method !== “POST”) {
return res.status(405).json({ error: “Method not allowed” });
}

// CORS headers
res.setHeader(“Access-Control-Allow-Origin”, “*”);
res.setHeader(“Access-Control-Allow-Methods”, “POST, OPTIONS”);
res.setHeader(“Access-Control-Allow-Headers”, “Content-Type”);

if (req.method === “OPTIONS”) {
return res.status(200).end();
}

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
return res.status(500).json({ error: “ANTHROPIC_API_KEY not set in environment variables” });
}

try {
const { prompt, useWebSearch } = req.body;

```
if (!prompt) {
  return res.status(400).json({ error: "prompt is required" });
}

const body = {
  model: "claude-sonnet-4-5",
  max_tokens: 1500,
  messages: [{ role: "user", content: prompt }],
};

// أضف web_search إذا طُلب
if (useWebSearch) {
  body.tools = [{ type: "web_search_20250305", name: "web_search" }];
}

const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": API_KEY,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify(body),
});

if (!response.ok) {
  const errText = await response.text();
  return res.status(response.status).json({ error: errText });
}

const data = await response.json();

// استخرج النص من الرد
let text = "";
if (data.content) {
  for (const block of data.content) {
    if (block.type === "text") {
      text = block.text;
      break;
    }
  }
}

return res.status(200).json({ text });
```

} catch (err) {
console.error(“Claude proxy error:”, err);
return res.status(500).json({ error: err.message });
}
}
