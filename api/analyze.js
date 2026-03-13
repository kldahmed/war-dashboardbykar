module.exports = async function handler(req,res){

const { text } = req.body

const prompt = `
حلل الخبر التالي وارجع JSON فقط:

${text}

النتيجة:

{
country:"",
type:"",
urgency:"",
risk_score:0,
prediction:""
}
`

const response = await fetch("https://api.anthropic.com/v1/messages",{
method:"POST",
headers:{
"x-api-key":process.env.ANTHROPIC_API_KEY,
"anthropic-version":"2023-06-01",
"content-type":"application/json"
},
body:JSON.stringify({
model:"claude-3-5-sonnet-latest",
max_tokens:500,
messages:[
{role:"user",content:prompt}
]
})
})

const data = await response.json()

res.json(data)

}
