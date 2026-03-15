export default async function handler(req, res) {

try {

const sources = [

"https://rss.nytimes.com/services/xml/rss/nyt/World.xml",
"https://feeds.bbci.co.uk/news/world/rss.xml",
"https://www.aljazeera.com/xml/rss/all.xml",
"https://www.reutersagency.com/feed/?best-topics=world&post_type=best"
];

let articles = [];

for (const src of sources) {

try {

const r = await fetch(src);
const text = await r.text();

const items = text.match(/<item>(.*?)<\/item>/gs) || [];

items.slice(0,5).forEach((it,i)=>{

const title =
(it.match(/<title>(.*?)<\/title>/)?.[1] || "")
.replace(/<!\[CDATA\[|\]\]>/g,"");

const link =
(it.match(/<link>(.*?)<\/link>/)?.[1] || "");

articles.push({

id: src+"-"+i,
title,
summary: "خبر عالمي مباشر",
source: src,
time: new Date().toISOString(),
urgency: "medium",
category: "regional",
link

});

});

}catch{}

}

res.status(200).json({news:articles.slice(0,20)});

} catch (e) {

res.status(500).json({news:[]});

}

}
