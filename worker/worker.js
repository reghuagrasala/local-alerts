name = "local-alerts-official-feed"
main = "worker.js"
compatibility_date = "2026-09-16"

# Set this only to a documented/permitted normalized JSON/CAP source.
# wrangler secret put SACHET_CAP_URL

# Official alert Worker

Deploy this Worker separately from the Pages/PWA app. Configure `SACHET_CAP_URL` only after confirming a documented/permitted source and its exact format.

The browser should call:
`https://YOUR-WORKER/india-alerts?lat=...&lng=...`

The Worker returns normalized `{items:[...]}` JSON and keeps provider URLs/credentials out of the browser. The supplied starter deliberately does not claim an undocumented SACHET API endpoint.

// Cloudflare Worker starter for an optional official-alert aggregator.
// Keep provider credentials and private feed URLs in Worker secrets.
// Do not invent or scrape undocumented endpoints.
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,OPTIONS","Access-Control-Allow-Headers":"Content-Type","Cache-Control":"public, max-age=300"};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"Content-Type":"application/json"}});

function relevant(item,lat,lng){
  const ilat=Number(item.lat), ilng=Number(item.lon ?? item.lng);
  const radius=Number(item.radiusKm);
  if(Number.isFinite(ilat)&&Number.isFinite(ilng)&&Number.isFinite(radius)){
    const R=6371,dLat=(ilat-lat)*Math.PI/180,dLon=(ilng-lng)*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(lat*Math.PI/180)*Math.cos(ilat*Math.PI/180)*Math.sin(dLon/2)**2;
    const km=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
    return km<=radius;
  }
  return true;
}

export default {
  async fetch(request,env){
    if(request.method==='OPTIONS') return new Response(null,{status:204,headers:cors});
    const u=new URL(request.url);
    if(u.pathname!=='/india-alerts') return json({error:'Use /india-alerts'},404);
    const lat=Number(u.searchParams.get('lat')),lng=Number(u.searchParams.get('lng'));
    if(!Number.isFinite(lat)||!Number.isFinite(lng)) return json({error:'lat and lng are required'},400);

    // Configure only a documented/permitted CAP/JSON source.
    const source=env.SACHET_CAP_URL;
    if(!source) return json({items:[],configured:false,source:'SACHET'});
    try{
      const r=await fetch(source,{headers:{Accept:'application/json, application/xml, text/xml'}});
      if(!r.ok) return json({items:[],configured:true,error:`Provider HTTP ${r.status}`},502);
      const text=await r.text();
      // This starter intentionally accepts normalized JSON only. Add a CAP parser
      // after confirming the exact feed format and terms of the chosen source.
      let data;
      try{data=JSON.parse(text);}catch{return json({items:[],configured:true,error:'Configured source is not normalized JSON; add a permitted CAP parser.'},502);}
      const items=Array.isArray(data)?data:(data.items||data.alerts||[]);
      return json({items:items.filter(x=>relevant(x,lat,lng)).slice(0,20),configured:true,source:'SACHET'});
    }catch(e){return json({items:[],configured:true,error:'Provider request failed'},502);}
  }
};
