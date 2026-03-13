module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  // GET health check
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      route: "/api/claude",
      hasKey: !!process.env.ANTHROPIC_API_KEY,
    });
  }

  // Allow only POST for actual requests
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
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});

    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Missing prompt",
      });
    }

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
            content: prompt,
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
      const block = parsed.content.find((b) => b.type === "text");
      text = block?.text || "";
    }

    return res.status(200).json({
      ok: true,
      text,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.message || "Internal server error",
    });
  }
};
``
