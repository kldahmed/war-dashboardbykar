export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const channels = [
  
    
    {
      id: "skynewsarabia",
      name: "سكاي نيوز عربية",
      flag: "🇦🇪",
      mode: "embed",
      youtubeId: "U--OjmpjF5o",
      title: "سكاي نيوز عربية مباشر"
    },
    {
      id: "france24-ar",
      name: "فرانس 24 عربي",
      flag: "🇫🇷",
      mode: "embed",
      youtubeId: "3ursYA8HMeo",
      title: "فرانس 24 عربي مباشر"
    },
    {
      id: "alaraby-news",
      name: "العربي أخبار",
      flag: "🇶🇦",
      mode: "embed",
      youtubeId: "e2RgSa1Wt5o",
      title: "العربي أخبار مباشر"
    },
    {
      id: "bbc-arabic",
      name: "BBC عربي",
      flag: "🇬🇧",
      mode: "embed",
      youtubeId: "O1pGmVtj2Y8",
      title: "BBC عربي مباشر"
    },
    {
      id: "almayadeen",
      name: "الميادين",
      flag: "🇱🇧",
      mode: "embed",
      youtubeId: "jLlb3ryS-HM",
      title: "الميادين مباشر"
    },
    {
      id: "alghad",
      name: "الغد",
      flag: "🇪🇬",
      mode: "embed",
      youtubeId: "4N5jTVWB7vA",
      title: "الغد مباشر"
    },
    {
      id: "trt-arabi",
      name: "TRT عربي",
      flag: "🇹🇷",
      mode: "embed",
      youtubeId: "0YBF1h2oFcM",
      title: "TRT عربي مباشر"
    },
    {
      id: "cnbc-arabia",
      name: "CNBC عربية",
      flag: "🇦🇪",
      mode: "embed",
      youtubeId: "pQSTFsOtrH0",
      title: "CNBC عربية مباشر"
    },
    {
      id: "asharq-news",
      name: "الشرق للأخبار",
      flag: "🇸🇦",
      mode: "embed",
      youtubeId: "f6VpkfV7m4Y",
      title: "الشرق للأخبار مباشر"
    },
    {
      id: "aljadeed",
      name: "الجديد",
      flag: "🇱🇧",
      mode: "embed",
      youtubeId: "Pg2paSZ1byM",
      title: "الجديد مباشر"
    },
    {
      id: "syria-tv",
      name: "تلفزيون سوريا",
      flag: "🇸🇾",
      mode: "embed",
      youtubeId: "ZN0aK3V0ds0",
      title: "تلفزيون سوريا مباشر"
    },
    {
      id: "alrasheed",
      name: "الرشيد",
      flag: "🇮🇶",
      mode: "external",
      externalUrl: "https://www.youtube.com/@alrasheedmedia/live",
      youtubeId: "",
      title: "الرشيد مباشر"
    },
    {
      id: "dijlah",
      name: "دجلة",
      flag: "🇮🇶",
      mode: "external",
      externalUrl: "https://www.youtube.com/@DijlahTV/live",
      youtubeId: "",
      title: "دجلة مباشر"
    }
  ];

  return res.status(200).json({
    channels,
    source: "arabic-live-channels"
  });
}
