module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
    const API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "ANTHROPIC_API_KEY is missing"
      });
    }

    const body =
      typeof req.body === "string"
        ? JSON.parse(req.body || "{}")
        : (req.body || {});

    const {
      title = "",
      summary = "",
      source = "",
      time = "",
      category = ""
    } = body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        ok: false,
        error: "title is required"
      });
    }

    const prompt = `
أنت محلل استخباري متخصص في تقييم الأخبار العسكرية والسياسية والاقتصادية في الشرق الأوسط.

حلل الخبر التالي تحليلاً احترافياً، ثم أعد JSON فقط بدون أي شرح إضافي أو Markdown أو نص خارج JSON.

الخبر:
العنوان: ${title}
الملخص: ${summary}
المصدر: ${source}
الوقت: ${time}
التصنيف الحالي: ${category}

المطلوب:
1) استنتج نوع الحدث بدقة.
2) استنتج الأطراف الفاعلة المذكورة أو الضمنية.
3) استنتج المواقع الجغرافية المذكورة.
4) أعط درجة خطر من 0 إلى 100.
5) أعط درجة ثقة من 0 إلى 100.
6) لخص الخبر بالعربية في سطر واضح.
7) اشرح لماذا هذا الخبر مهم بالعربية.
8) قدم السيناريو المرجح التالي بالعربية.
9) استخرج كلمات مفتاحية مهمة.
10) صنف نطاق التأثير: local أو regional أو global.
11) صنف الحساسية الزمنية: immediate أو short_term أو medium_term.

أعد النتيجة بهذا الشكل فقط:
{
  "type": "military | political | economic | diplomatic | security | humanitarian | mixed",
  "event_type": "airstrike | missile | drone | interception | clashes | military_movement | statement | sanctions | diplomacy | maritime | explosion | humanitarian | general",
  "category": "military | politics | economy | regional | all",
  "actors": ["..."],
  "locations": ["..."],
  "risk_score": 0,
  "confidence": 0,
  "impact": "local | regional | global",
  "time_sensitivity": "immediate | short_term | medium_term",
  "ai_summary_ar": "...",
  "why_important_ar": "...",
  "next_scenario_ar": "...",
  "keywords": ["...", "...", "..."]
}

قواعد صارمة:
- أعد JSON فقط.
- لا تكتب ملاحظات.
- لا تضع علامات تنسيق.
- إذا لم توجد جهة أو موقع، أعد مصفوفة فارغة.
- اجعل النصوص العربية مختصرة وواضحة.
- يجب أن تكون risk_score و confidence أرقاماً صحيحة من 0 إلى 100.
`.trim();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 900,
        temperature: 0.2,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const raw = await anthropicRes.text();
    let parsed = null;

    try {
      parsed = JSON.parse(raw);
    } catch (_) {}

    if (!anthropicRes.ok) {
      return res.status(anthropicRes.status).json({
        ok: false,
        error: parsed?.error?.message || "Anthropic request failed"
      });
    }

    const textBlock = parsed?.content?.find((b) => b.type === "text");
    const text = textBlock?.text?.trim() || "";

    let json = null;

    try {
      json = JSON.parse(text);
    } catch (_) {
      const firstBrace = text.indexOf("{");
      const lastBrace = text.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        try {
          json = JSON.parse(text.slice(firstBrace, lastBrace + 1));
        } catch (_) {}
      }
    }

    if (!json || typeof json !== "object") {
      return res.status(500).json({
        ok: false,
        error: "Claude did not return valid JSON"
      });
    }

    const analysis = {
      type: safeEnum(
        json.type,
        ["military", "political", "economic", "diplomatic", "security", "humanitarian", "mixed"],
        "mixed"
      ),
      event_type: safeEnum(
        json.event_type,
        [
          "airstrike",
          "missile",
          "drone",
          "interception",
          "clashes",
          "military_movement",
          "statement",
          "sanctions",
          "diplomacy",
          "maritime",
          "explosion",
          "humanitarian",
          "general"
        ],
        "general"
      ),
      category: safeEnum(
        json.category,
        ["military", "politics", "economy", "regional", "all"],
        "all"
      ),
      actors: safeStringArray(json.actors),
      locations: safeStringArray(json.locations),
      risk_score: safeScore(json.risk_score),
      confidence: safeScore(json.confidence),
      impact: safeEnum(json.impact, ["local", "regional", "global"], "regional"),
      time_sensitivity: safeEnum(
        json.time_sensitivity,
        ["immediate", "short_term", "medium_term"],
        "short_term"
      ),
      ai_summary_ar: safeText(json.ai_summary_ar, "لا يوجد ملخص تحليلي."),
      why_important_ar: safeText(json.why_important_ar, "لا توجد أهمية محددة."),
      next_scenario_ar: safeText(json.next_scenario_ar, "لا يوجد سيناريو مرجح واضح."),
      keywords: safeStringArray(json.keywords).slice(0, 8)
    };

    return res.status(200).json({
      ok: true,
      analysis
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error?.name === "AbortError"
        ? "AI request timeout"
        : (error?.message || "Internal server error")
    });
  }
};

function safeText(value, fallback = "") {
  if (typeof value !== "string") return fallback;
  const v = value.trim();
  return v || fallback;
}

function safeStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean)
    .slice(0, 10);
}

function safeScore(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, Math.round(num)));
}

function safeEnum(value, allowed = [], fallback = "") {
  const v = typeof value === "string" ? value.trim() : "";
  return allowed.includes(v) ? v : fallback;
}
