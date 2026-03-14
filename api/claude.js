export default async function handler(req, res) {

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed" })
  }

  try {

    const rss = await fetch("https://news.google.com/rss/search?q=middle+east+war&hl=en-US&gl=US&ceid=US:en")
    const xml = await rss.text()

    const headlines = xml
      .split("<title>")
      .slice(2, 12)
      .map(x => x.split("</title>")[0])

    const newsText = headlines.join("\n")

    const ai = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content: `Analyze these news headlines and create a short geopolitical dashboard summary.

Headlines:
${newsText}

Return JSON format:
{
summary:"",
riskLevel:"",
keyEvents:[]
}`
          }
        ]
      })
    })

    const data = await ai.json()

    res.status(200).json({
      headlines,
      analysis: data.content?.[0]?.text || "AI analysis unavailable",
      time: new Date().toISOString()
    })

  } catch (error) {

    res.status(500).json({
      error: "AI processing failed",
      detail: error.message
    })

  }

}
