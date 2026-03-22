export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const channels = [

    {
      id: "aljazeera-ar",
      name: "Al Jazeera Arabic",
      flag: "🇶🇦",
      youtubeId: "gCNeDWCI0vo",
      title: "Al Jazeera Arabic Live"
    },

    {
      id: "alarabiya",
      name: "Al Arabiya",
      flag: "🇸🇦",
      youtubeId: "8d0xN7n4Vqk",
      title: "Al Arabiya Live"
    },

    {
      id: "sky-arabia",
      name: "Sky News Arabia",
      flag: "🇦🇪",
      youtubeId: "rjM1lX1E4wA",
      title: "Sky News Arabia Live"
    },

    {
      id: "france24-ar",
      name: "France 24 Arabic",
      flag: "🇫🇷",
      youtubeId: "h3MuIUNCCzI",
      title: "France 24 Arabic Live"
    },

    {
      id: "trt-ar",
      name: "TRT عربي",
      flag: "🇹🇷",
      youtubeId: "8ZsTq8Hc6NQ",
      title: "TRT Arabic Live"
    },

    {
      id: "rt-ar",
      name: "RT Arabic",
      flag: "🇷🇺",
      youtubeId: "4F8d8xq6VQk",
      title: "RT Arabic Live"
    },

    {
      id: "alhadath",
      name: "Al Hadath",
      flag: "🇸🇦",
      youtubeId: "x8M3F5xkGv0",
      title: "Al Hadath Live"
    },

    {
      id: "asharq",
      name: "Asharq News",
      flag: "🇸🇦",
      youtubeId: "y60wDzZt8yg",
      title: "Asharq News Live"
    },

    {
      id: "alghad",
      name: "Alghad TV",
      flag: "🇪🇬",
      youtubeId: "JAzRXBI2nQg",
      title: "Alghad TV Live"
    },

    {
      id: "almamlaka",
      name: "AlMamlaka TV",
      flag: "🇯🇴",
      youtubeId: "pH3D4F3rN2k",
      title: "AlMamlaka Live"
    },

    {
      id: "alikhbariya",
      name: "Al Ekhbariya",
      flag: "🇸🇦",
      youtubeId: "S9b9k8d9S7Q",
      title: "Al Ekhbariya Live"
    },

    {
      id: "dubai-tv",
      name: "Dubai TV",
      flag: "🇦🇪",
      youtubeId: "F6GJ3x4vF6U",
      title: "Dubai TV Live"
    },

    {
      id: "abu-dhabi",
      name: "Abu Dhabi TV",
      flag: "🇦🇪",
      youtubeId: "X7Y9N0K9F8M",
      title: "Abu Dhabi TV Live"
    },

    {
      id: "saudi-channel",
      name: "Saudi TV",
      flag: "🇸🇦",
      youtubeId: "O3DPVlynUM0",
      title: "Saudi TV Live"
    },

    {
      id: "aliraqiya",
      name: "Al Iraqiya",
      flag: "🇮🇶",
      youtubeId: "VY9u3pE0o1E",
      title: "Al Iraqiya Live"
    },

    {
      id: "syria-tv",
      name: "Syria TV",
      flag: "🇸🇾",
      youtubeId: "gqVYc7n5LkE",
      title: "Syria TV Live"
    },

    {
      id: "palestine-tv",
      name: "Palestine TV",
      flag: "🇵🇸",
      youtubeId: "dXqP4Kf0s3g",
      title: "Palestine TV Live"
    },

    {
      id: "alalam",
      name: "Al Alam",
      flag: "🇮🇷",
      youtubeId: "vR6e7p0y9uM",
      title: "Al Alam Live"
    },

    {
      id: "yemen-tv",
      name: "Yemen TV",
      flag: "🇾🇪",
      youtubeId: "h8P0xR9vC8E",
      title: "Yemen TV Live"
    },

    {
      id: "libya-tv",
      name: "Libya TV",
      flag: "🇱🇾",
      youtubeId: "k9V8pF1wM3E",
      title: "Libya TV Live"
    }

  ];

  return res.status(200).json({ channels });

}
