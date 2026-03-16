import React, { useState } from "react";

const CHANNELS = [
  {
    id: "aljazeera",
    name: "الجزيرة مباشر",
    country: "Qatar",
    type: "embed",
    youtubeId: "bNyUyrR0PHo",
    externalUrl: "https://www.youtube.com/@aljazeeraarabic/live"
  },
  {
    id: "skynewsarabia",
    name: "سكاي نيوز عربية",
    country: "UAE",
    type: "external",
    externalUrl: "https://www.youtube.com/@skynewsarabia/live"
  },
  {
    id: "france24arabic",
    name: "فرانس 24 بالعربي",
    country: "International",
    type: "external",
    externalUrl: "https://www.youtube.com/@FRANCE24Arabic/live"
  },
  {
    id: "bbc",
    name: "BBC News",
    country: "International",
    type: "external",
    externalUrl: "https://www.youtube.com/@BBCNews/live"
  },
  {
    id: "dw",
    name: "DW News",
    country: "International",
    type: "external",
    externalUrl: "https://www.youtube.com/@dwnews/live"
  }
];

export default function LiveChannelsPanel(){

const [active,setActive] = useState(CHANNELS[0]);

return(

<div style={{
display:"grid",
gridTemplateColumns:"300px 1fr",
gap:"20px",
maxWidth:"1400px",
margin:"0 auto"
}}>

<div>
<h2 style={{marginBottom:"15px"}}>القنوات المباشرة</h2>

{CHANNELS.map(ch=>(
<div
key={ch.id}
onClick={()=>setActive(ch)}
style={{
padding:"15px",
marginBottom:"10px",
cursor:"pointer",
border:"1px solid #1e3a5f",
borderRadius:"10px",
background:active.id===ch.id?"#12263d":"#0e1a2b"
}}
>
<strong>{ch.name}</strong>
<div style={{fontSize:"12px",opacity:0.7}}>
{ch.country}
</div>
</div>
))}

</div>

<div style={{
background:"#000",
borderRadius:"10px",
overflow:"hidden"
}}>

<iframe
title={active.name}
src={active.youtube}
width="100%"
height="500"
allow="autoplay; encrypted-media"
allowFullScreen
style={{border:"none"}}
/>

</div>

</div>

)

}
