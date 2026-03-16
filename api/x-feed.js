export default function handler(req, res) {
  const posts = [

{
  id: "x-1",
  account: "Reuters World",
  handle: "@ReutersWorld",
  text: "Oil markets react to rising shipping risk near strategic waterways.",
  translated: "أسواق النفط تتفاعل مع ارتفاع مخاطر الملاحة قرب الممرات الاستراتيجية.",
  time: new Date().toISOString(),
  url: "https://x.com/ReutersWorld",
  verified: true,
  category: "economy",
  lang: "en",
  sourceType: "media",
  avatar: "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
},

{
  id: "x-2",
  account: "Al Jazeera Arabic",
  handle: "@AJArabic",
  text: "تطورات ميدانية جديدة في المنطقة.",
  translated: "تطورات ميدانية جديدة في المنطقة.",
  time: new Date().toISOString(),
  url: "https://x.com/AJArabic",
  verified: true,
  category: "regional",
  lang: "ar",
  sourceType: "media",
  avatar: "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
},

{
  id: "x-3",
  account: "Sky News Arabia",
  handle: "@skynewsarabia",
  text: "تحركات سياسية واقتصادية جديدة مرتبطة بالتوترات الإقليمية.",
  translated: "تحركات سياسية واقتصادية جديدة مرتبطة بالتوترات الإقليمية.",
  time: new Date().toISOString(),
  url: "https://x.com/skynewsarabia",
  verified: true,
  category: "politics",
  lang: "ar",
  sourceType: "media",
  avatar: "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
},

{
  id: "x-4",
  account: "K.A.R",
  handle: "@khalldahmd",
  text: "متابعة وتحليل للتطورات الجيوسياسية والاقتصادية العالمية.",
  translated: "متابعة وتحليل للتطورات الجيوسياسية والاقتصادية العالمية.",
  time: new Date().toISOString(),
  url: "https://x.com/khalldahmd",
  verified: true,
  category: "analysis",
  lang: "ar",
  sourceType: "official",
  avatar: "https://abs.twimg.com/sticky/default_profile_images/default_profile_400x400.png"
}

];

  res.status(200).json({
    posts,
    updated: new Date().toISOString()
  });
}
