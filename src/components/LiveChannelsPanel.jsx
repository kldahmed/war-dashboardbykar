import React, { useState } from "react";

const CHANNELS = [
{
id: "aljazeera",
name: "الجزيرة مباشر",
country: "Qatar",
youtube: "https://www.youtube.com/embed/bNyUyrR0PHo"
},

{
id: "skynewsarabia",
name: "سكاي نيوز عربية",
country: "UAE",
youtube: "https://www.youtube.com/embed/8d0qF6V6H1Y"
},

{
id: "france24arabic",
name: "فرانس 24 عربي",
country: "International",
youtube: "https://www.youtube.com/embed/QlTQhQL5M4E"
},

{
id: "bbc",
name: "BBC News",
country: "International",
youtube: "https://www.youtube.com/embed/9Auq9mYxFEE"
},

{
id: "dw",
name: "DW News",
country: "International",
youtube: "https://www.youtube.com/embed/NvqKZHpKs-g"
},

{
id: "trtworld",
name: "TRT World",
country: "International",
youtube: "https://www.youtube.com/embed/Zw4U0p1YfEo"
},

{
id: "euronews",
name: "Euronews",
country: "International",
youtube: "https://www.youtube.com/embed/pykpO5kQJ98"
},

{
id: "cnn",
name: "CNN International",
country: "International",
youtube: "https://www.youtube.com/embed/9hG0qJ3i0x0"
},

{
id: "bloomberg",
name: "Bloomberg",
country: "International",
youtube: "https://www.youtube.com/embed/dp8PhLsUcFE"
},

{
id: "fox",
name: "Fox News",
country: "International",
youtube: "https://www.youtube.com/embed/lAKV7Vq2c2E"
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
