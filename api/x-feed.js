export default function handler(req, res) {
  const now = Date.now();

  const accounts = [
    {
      account: "WAM News",
      handle: "@wamnews_eng",
      category: "uae",
      lang: "en",
      sourceType: "official",
      verified: true
    },
    {
      account: "Sky News Arabia",
      handle: "@skynewsarabia",
      category: "media",
      lang: "ar",
      sourceType: "media",
      verified: true
    },
    {
      account: "UAE Ministry of Foreign Affairs",
      handle: "@mofauae",
      category: "uae",
      lang: "en",
      sourceType: "official",
      verified: true
    },
    {
      account: "Dubai Media Office",
      handle: "@DXBMediaOffice",
      category: "uae",
      lang: "en",
      sourceType: "official",
      verified: true
    },
    {
      account: "Reuters World",
      handle: "@ReutersWorld",
      category: "world",
      lang: "en",
      sourceType: "media",
      verified: true
    },
    {
      account: "Reuters",
      handle: "@Reuters",
      category: "world",
      lang: "en",
      sourceType: "media",
      verified: true
    },
    {
      account: "BBC Breaking News",
      handle: "@BBCBreaking",
      category: "world",
      lang: "en",
      sourceType: "media",
      verified: true
    },
    {
      account: "BBC World",
      handle: "@BBCWorld",
      category: "world",
      lang: "en",
      sourceType: "media",
      verified: true
    },
    {
      account: "AP News",
      handle: "@AP",
      category: "world",
      lang: "en",
      sourceType: "media",
      verified: true
    },
    {
      account: "Al Jazeera English",
      handle: "@AJEnglish",
      category: "world",
      lang: "en",
      sourceType: "media",
      verified: true
    },
    {
      account: "Al Jazeera Arabic",
      handle: "@AJArabic",
      category: "regional",
      lang: "ar",
      sourceType: "media",
      verified: true
    },
    {
      account: "France 24 English",
      handle: "@France24_en",
      category: "world",
      lang: "en",
      sourceType: "media",
      verified: true
    },
    {
      account: "DW News",
      handle: "@dwnews",
      category: "world",
      lang: "en",
      sourceType: "media",
      verified: true
    },
    {
      account: "Euronews",
      handle: "@euronews",
      category: "world",
      lang: "en",
      sourceType: "media",
      verified: true
    },
    {
      account: "Bloomberg",
      handle: "@Bloomberg",
      category: "economy",
      lang: "en",
      sourceType: "media",
      verified: true
    },
    {
      account: "Khalid Al Ahmed",
      handle: "@khalldahmd",
      category: "analysis",
      lang: "ar",
      sourceType: "official",
      verified: true
    }
  ];

  const seedPosts = [
    {
      id: "x-1",
      account: "Reuters World",
      handle: "@ReutersWorld",
      text: "Oil markets react to rising shipping risk near strategic waterways.",
      translated:
        "أسواق النفط تتفاعل مع ارتفاع مخاطر الملاحة قرب الممرات المائية الاستراتيجية.",
      time: new Date(now - 1000 * 60 * 2).toISOString(),
      url: "https://x.com/ReutersWorld",
      verified: true,
      category: "economy",
      lang: "en",
      sourceType: "media",
      avatar:
        "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
    },
    {
      id: "x-2",
      account: "Sky News Arabia",
      handle: "@skynewsarabia",
      text: "تحركات سياسية واقتصادية جديدة مرتبطة بالتوترات الإقليمية.",
      translated:
        "تحركات سياسية واقتصادية جديدة مرتبطة بالتوترات الإقليمية.",
      time: new Date(now - 1000 * 60 * 7).toISOString(),
      url: "https://x.com/skynewsarabia",
      verified: true,
      category: "politics",
      lang: "ar",
      sourceType: "media",
      avatar:
        "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
    },
    {
      id: "x-3",
      account: "Al Jazeera Arabic",
      handle: "@AJArabic",
      text: "تطورات ميدانية جديدة في المنطقة ومتابعة مستمرة للأحداث.",
      translated:
        "تطورات ميدانية جديدة في المنطقة ومتابعة مستمرة للأحداث.",
      time: new Date(now - 1000 * 60 * 10).toISOString(),
      url: "https://x.com/AJArabic",
      verified: true,
      category: "regional",
      lang: "ar",
      sourceType: "media",
      avatar:
        "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
    },
    {
      id: "x-4",
      account: "UAE Ministry of Foreign Affairs",
      handle: "@mofauae",
      text: "The UAE reiterates the importance of de-escalation and diplomatic dialogue.",
      translated:
        "تؤكد دولة الإمارات مجددًا أهمية خفض التصعيد والحوار الدبلوماسي.",
      time: new Date(now - 1000 * 60 * 14).toISOString(),
      url: "https://x.com/mofauae",
      verified: true,
      category: "uae",
      lang: "en",
      sourceType: "official",
      avatar:
        "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
    },
    {
      id: "x-5",
      account: "Dubai Media Office",
      handle: "@DXBMediaOffice",
      text: "Official updates continue regarding regional developments and travel conditions.",
      translated:
        "تتواصل التحديثات الرسمية بشأن التطورات الإقليمية وظروف السفر.",
      time: new Date(now - 1000 * 60 * 18).toISOString(),
      url: "https://x.com/DXBMediaOffice",
      verified: true,
      category: "uae",
      lang: "en",
      sourceType: "official",
      avatar:
        "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
    },
    {
      id: "x-6",
      account: "WAM News",
      handle: "@wamnews_eng",
      text: "UAE agencies continue monitoring regional developments and humanitarian responses.",
      translated:
        "تواصل الجهات الإماراتية متابعة التطورات الإقليمية والاستجابات الإنسانية.",
      time: new Date(now - 1000 * 60 * 21).toISOString(),
      url: "https://x.com/wamnews_eng",
      verified: true,
      category: "uae",
      lang: "en",
      sourceType: "official",
      avatar:
        "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
    },
    {
      id: "x-7",
      account: "BBC Breaking News",
      handle: "@BBCBreaking",
      text: "Fresh developments emerge around key regional security flashpoints.",
      translated:
        "ظهور تطورات جديدة حول بؤر أمنية إقليمية حساسة.",
      time: new Date(now - 1000 * 60 * 24).toISOString(),
      url: "https://x.com/BBCBreaking",
      verified: true,
      category: "world",
      lang: "en",
      sourceType: "media",
      avatar:
        "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
    },
    {
      id: "x-8",
      account: "AP News",
      handle: "@AP",
      text: "Diplomatic efforts intensify as global leaders push to avoid escalation.",
      translated:
        "تتصاعد الجهود الدبلوماسية مع سعي القادة العالميين لتجنب التصعيد.",
      time: new Date(now - 1000 * 60 * 28).toISOString(),
      url: "https://x.com/AP",
      verified: true,
      category: "world",
      lang: "en",
      sourceType: "media",
      avatar:
        "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
    },
    {
      id: "x-9",
      account: "Euronews",
      handle: "@euronews",
      text: "Energy traders watch shipping routes closely amid regional instability.",
      translated:
        "يراقب متداولو الطاقة طرق الشحن عن كثب وسط حالة عدم الاستقرار الإقليمي.",
      time: new Date(now - 1000 * 60 * 33).toISOString(),
      url: "https://x.com/euronews",
      verified: true,
      category: "economy",
      lang: "en",
      sourceType: "media",
      avatar:
        "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
    },
    {
      id: "x-10",
      account: "Bloomberg",
      handle: "@Bloomberg",
      text: "Markets assess the impact of geopolitical risk on energy and transport.",
      translated:
        "تقيّم الأسواق أثر المخاطر الجيوسياسية على الطاقة والنقل.",
      time: new Date(now - 1000 * 60 * 39).toISOString(),
      url: "https://x.com/Bloomberg",
      verified: true,
      category: "economy",
      lang: "en",
      sourceType: "media",
      avatar:
        "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
    },
    {
      id: "x-11",
      account: "DW News",
      handle: "@dwnews",
      text: "European officials call for restraint and sustained diplomatic communication.",
      translated:
        "يدعو مسؤولون أوروبيون إلى ضبط النفس واستمرار التواصل الدبلوماسي.",
      time: new Date(now - 1000 * 60 * 46).toISOString(),
      url: "https://x.com/dwnews",
      verified: true,
      category: "world",
      lang: "en",
      sourceType: "media",
      avatar:
        "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
    },
    {
      id: "x-12",
      account: "K.A.R",
      handle: "@khalldahmd",
      text: "متابعة وتحليل للتطورات الجيوسياسية والاقتصادية العالمية.",
      translated:
        "متابعة وتحليل للتطورات الجيوسياسية والاقتصادية العالمية.",
      time: new Date(now - 1000 * 60 * 52).toISOString(),
      url: "https://x.com/khalldahmd",
      verified: true,
      category: "analysis",
      lang: "ar",
      sourceType: "official",
      avatar:
        "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
    }
  ];

  res.status(200).json({
    posts: seedPosts,
    accounts,
    updated: new Date().toISOString(),
    note:
      "هذه نسخة منظمة وجاهزة للتوصيل مع مزود API حقيقي أو backend crawler مرخص لاحقًا."
  });
}
