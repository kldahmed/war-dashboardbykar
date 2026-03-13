module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      route: "/api/claude",
      hasKey: !!process.env.ANTHROPIC_API_KEY,
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed",
      method: req.method,
    });
  }

  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "ANTHROPIC_API_KEY is missing on Vercel",
      });
    }

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : (req.body || {});

    const { prompt, useWebSearch } = body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Missing prompt",
      });
    }

    const finalPrompt = `
أنت محرك بيانات API.
ممنوع أي شرح أو مقدمة أو خاتمة.
ممنوع markdown.
ممنوع code block.
أعد JSON صالح فقط.
إذا طُلبت أخبار أو فيديوهات فأعد Array JSON فقط.
إذا طُلبت إحصائيات التوتر فأعد Object JSON فقط.

الطلب:
${prompt}
    `.trim();

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 1500,
        messages: [
          {
            role: "user",
            content: finalPrompt,
          },
        ],
      }),
    });

    const rawText = await anthropicRes.text();

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = null;
    }

    if (!anthropicRes.ok) {
      return res.status(anthropicRes.status).json({
        ok: false,
        error: parsed?.error?.message || "Anthropic request failed",
        details: parsed || rawText,
      });
    }

    let text = "";
    if (Array.isArray(parsed?.content)) {
      const textBlock = parsed.content.find((b) => b.type === "text");
      text = textBlock?.text?.trim() || "";
    }

    if (!text) {
      return res.status(500).json({
        ok: false,
        error: "Claude returned empty text",
      });
    }

    // نحاول تحويل النص إلى JSON داخل الـ API نفسه
    let json = null;

    try {
      json = JSON.parse(text);
    } catch (_) {
      const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenced?.[1]) {
        try {
          json = JSON.parse(fenced[1].trim());
        } catch (_) {}
      }

      if (!json) {
        const firstBracket = text.indexOf("[");
        const lastBracket = text.lastIndexOf("]");
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          try {
            json = JSON.parse(text.slice(firstBracket, lastBracket + 1));
          } catch (_) {}
        }
      }

      if (!json) {
        const firstBrace = text.indexOf("{");
        const lastBrace = text.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          try {
            json = JSON.parse(text.slice(firstBrace, lastBrace + 1));
          } catch (_) {}
        }
      }
    }

    if (!json) {
      return res.status(500).json({
        ok: false,
        error: "Claude did not return valid JSON",
        text,
      });
    }

    return res.status(200).json({
      ok: true,
      json,
      text: JSON.stringify(json),
      usedWebSearch: !!useWebSearch,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.message || "Internal server error",
    });
  }
};
