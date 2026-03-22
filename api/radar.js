function applyApiHeaders(res, methods = "GET, OPTIONS") {
	res.setHeader("Content-Type", "application/json; charset=utf-8");
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", methods);
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req,res){

applyApiHeaders(res);
if (req.method === "OPTIONS") return res.status(200).end();
if (req.method !== "GET") {
return res.status(405).json({ error: "Method not allowed" });
}

try{

const r = await fetch(
"https://opensky-network.org/api/states/all"
);

if (!r.ok) {
return res.status(200).json({ aircraft: [] });
}

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
