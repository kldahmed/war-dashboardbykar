export default async function handler(req,res){

try{

const r = await fetch(
"https://opensky-network.org/api/states/all"
);

const data = await r.json();

const aircraft = (data.states || []).slice(0,50).map(a=>({

lat:a[6],
lng:a[5],
callsign:a[1],
altitude:a[7]

}));

res.status(200).json({aircraft});

}catch{

res.status(200).json({aircraft:[]});

}

}
