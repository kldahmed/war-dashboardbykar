export default async function handler(req, res) {

  const channels = [

    {
      id: "aj_en",
      name: "Al Jazeera English",
      flag: "🌍",
      youtubeId: "gCNeDWCI0vo"
    },

    {
      id: "fr24_en",
      name: "France 24 English",
      flag: "🇫🇷",
      youtubeId: "Ap-UM1O9RBU"
    },

    {
      id: "dw",
      name: "DW News",
      flag: "🇩🇪",
      youtubeId: "Niq9D7p4Qzw"
    },

    {
      id: "sky",
      name: "Sky News",
      flag: "🇬🇧",
      youtubeId: "9Auq9mYxFEE"
    },

    {
      id: "trt",
      name: "TRT World",
      flag: "🇹🇷",
      youtubeId: "w-Ma8oQLmSM"
    }

  ];

  res.status(200).json({
    channels
  });

}
