export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const channels = [
{
  id: "aljazeera-mubasher",
  name: "الجزيرة مباشر",
  flag: "🇶🇦",
  mode: "external",
  externalUrl: "https://www.youtube.com/@AlJazeeraMubasher/live",
  youtubeId: "",
  title: "Al Jazeera Mubasher Live"
}
    {
      id: "aljazeera-mubasher",
      name: "Al Jazeera Mubasher",
      flag: "🇶🇦",
      mode: "external",
      externalUrl: "https://www.youtube.com/channel/UCCv1Pd24oPErw5S7zJWltnQ/live",
      title: "البث الحي لقناة الجزيرة مباشر"
    },
    {
      id: "alarabiya",
      name: "Al Arabiya",
      flag: "🇸🇦",
      mode: "embed",
      youtubeId: "n7eQejkXbnM",
      title: "العربية مباشر"
    },
    {
      id: "alhadath",
      name: "Al Hadath",
      flag: "🇸🇦",
      mode: "embed",
      youtubeId: "xWXpl7azI8k",
      title: "الحدث مباشر"
    },
    {
      id: "skynewsarabia",
      name: "Sky News Arabia",
      flag: "🇦🇪",
      mode: "embed",
      youtubeId: "U--OjmpjF5o",
      title: "سكاي نيوز عربية مباشر"
    },
    {
      id: "france24-ar",
      name: "France 24 Arabic",
      flag: "🇫🇷",
      mode: "embed",
      youtubeId: "3ursYA8HMeo",
      title: "فرانس 24 عربي مباشر"
    },
    {
      id: "alaraby-news",
      name: "Alaraby TV News",
      flag: "🇶🇦",
      mode: "embed",
      youtubeId: "e2RgSa1Wt5o",
      title: "العربي أخبار مباشر"
    },
    {
      id: "bbc-arabic",
      name: "BBC News Arabic",
      flag: "🇬🇧",
      mode: "embed",
      youtubeId: "O1pGmVtj2Y8",
      title: "BBC عربي مباشر"
    },
    {
      id: "almayadeen",
      name: "Al Mayadeen Live",
      flag: "🇱🇧",
      mode: "embed",
      youtubeId: "jLlb3ryS-HM",
      title: "الميادين مباشر"
    },
    {
      id: "alghad",
      name: "Alghad TV",
      flag: "🇪🇬",
      mode: "embed",
      youtubeId: "4N5jTVWB7vA",
      title: "قناة الغد مباشر"
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
      name: "CNBC Arabia",
      flag: "🇦🇪",
      mode: "embed",
      youtubeId: "pQSTFsOtrH0",
      title: "CNBC Arabia مباشر"
    },
    {
      id: "syria-ikhbariyah",
      name: "Alikhbariah Syria",
      flag: "🇸🇾",
      mode: "embed",
      youtubeId: "h57b676emP8",
      title: "الإخبارية السورية مباشر"
    },
    {
      id: "jordan-tv",
      name: "Jordan TV",
      flag: "🇯🇴",
      mode: "embed",
      youtubeId: "CclSsWpp2to",
      title: "التلفزيون الأردني مباشر"
    },
    {
      id: "asharq-news",
      name: "Asharq News",
      flag: "🇸🇦",
      mode: "embed",
      youtubeId: "f6VpkfV7m4Y",
      title: "الشرق للأخبار مباشر"
    },
    {
      id: "alarabiya-business",
      name: "Al Arabiya Business",
      flag: "🇸🇦",
      mode: "embed",
      youtubeId: "rXnG4eiVVdM",
      title: "العربية Business مباشر"
    },
    {
      id: "aljadeed",
      name: "Al Jadeed",
      flag: "🇱🇧",
      mode: "embed",
      youtubeId: "Pg2paSZ1byM",
      title: "الجديد مباشر"
    },
    {
      id: "syria-tv",
      name: "Syria TV",
      flag: "🇸🇾",
      mode: "embed",
      youtubeId: "ZN0aK3V0ds0",
      title: "تلفزيون سوريا مباشر"
    },
    {
      id: "alrasheed",
      name: "Al Rasheed",
      flag: "🇮🇶",
      mode: "external",
      externalUrl: "https://www.youtube.com/alrasheedmedia/streams",
      title: "الرشيد - صفحة البث"
    },
    {
      id: "dijlah",
      name: "Dijlah TV",
      flag: "🇮🇶",
      mode: "external",
      externalUrl: "https://www.youtube.com/%40DijlahTV",
      title: "دجلة - صفحة القناة"
    }
  ];

  return res.status(200).json({
    channels,
    source: "verified-arabic-live-mix"
  });
}
