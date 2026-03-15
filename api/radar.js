export default async function handler(req,res){

try{

const r = await fetch(
"https://opensky-network.org/api/states/all"
);

const data = await r.json();

const aircraft = (data.states || [])
.filter(a => 
a[5] && 
a[6] && 
a[7] > 5000 &&      // ارتفاع مهم
a[5] > 25 &&        // شرق المتوسط
a[5] < 65 &&        // الخليج
a[6] > 10 &&        // شمال أفريقيا
a[6] < 40           // تركيا
)
.slice(0,80)
.map(a=>({

lat:a[6],
lng:a[5],
callsign:(a[1] || "").trim(),
altitude:a[7]

}));

res.status(200).json({aircraft});

}catch{

res.status(200).json({aircraft:[]});

}

}
