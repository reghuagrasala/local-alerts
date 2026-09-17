// Compact Home-screen location companion.
(function(){
  const $=s=>document.querySelector(s), R=3500, WORKER="https://local-alerts-official-feed.hrcvb7p7r5.workers.dev/india-alerts";
  const esc=v=>String(v??"").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[m]));
  const enabled=()=>localStorage.getItem("local-alerts-data")!=="off"&&localStorage.getItem("local-alerts-gps")!=="off";
  async function update(lat,lon){
    if(!enabled())return;
    const s=$("#supportTop"),e=$("#essentialsTop"),ev=$("#eventsTop"),st=$("#travelTopStatus");
    if(s)s.innerHTML="<strong>Local support</strong>Checking nearby mapped services…";
    try{
      const q=`[out:json][timeout:20];(nwr["amenity"~"^(hospital|clinic|police|pharmacy|atm|fuel)$"](around:${R},${lat},${lon});nwr["railway"="station"](around:${R},${lat},${lon});nwr["amenity"="bus_station"](around:${R},${lat},${lon}););out center tags;`;
      const r=await fetch("https://overpass-api.de/api/interpreter",{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},body:q});
      if(!r.ok)throw Error();
      const a=(await r.json()).elements||[],g={police:0,medical:0,pharmacy:0,atm:0,fuel:0,rail:0,bus:0},names=[];
      for(const p of a){const t=p.tags||{},k=t.amenity;if(k==="police")g.police++;else if(k==="hospital"||k==="clinic")g.medical++;else if(k==="pharmacy")g.pharmacy++;else if(k==="atm")g.atm++;else if(k==="fuel")g.fuel++;else if(t.railway==="station")g.rail++;else if(k==="bus_station")g.bus++;if(t.name&&names.length<8)names.push(t.name);}
      if(s)s.innerHTML=`<strong>Local support</strong>${g.police} police · ${g.medical} medical<br><span class="muted">Not a crime or official safety score.</span>`;
      if(e)e.innerHTML=`<strong>Essentials · ~3.5 km</strong>${g.pharmacy} pharmacies · ${g.atm} ATMs · ${g.fuel} fuel · ${g.rail} rail · ${g.bus} bus`;
      if(ev){const q1=encodeURIComponent(`events festivals near ${lat.toFixed(3)},${lon.toFixed(3)} today`),q2=encodeURIComponent(`local news near ${lat.toFixed(3)},${lon.toFixed(3)} today`);ev.innerHTML=`<a target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${q1}">Events &amp; festivals</a><a target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${q2}">Local news</a>`;}
      if(st)st.textContent=`Location-specific services · ${new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})} · mapped data, not an official safety assessment.`;
    }catch{if(s)s.innerHTML="<strong>Local support</strong>Nearby service data temporarily unavailable.";}
  }
  function start(){if(!enabled()||!navigator.geolocation)return;navigator.geolocation.getCurrentPosition(p=>update(p.coords.latitude,p.coords.longitude),()=>{},{enableHighAccuracy:true,maximumAge:10000,timeout:20000});}
  window.LocalTopCompanion={update,start};
  start();
  window.addEventListener("online",start);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")start();});
})();
