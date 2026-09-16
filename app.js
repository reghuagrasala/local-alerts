let page="home",
selected="all",
gpsAllowed=localStorage.getItem("local-alerts-gps")!=="off",
dataAllowed=localStorage.getItem("local-alerts-data")!=="off";

const $=s=>document.querySelector(s);
const tel=v=>"tel:"+String(v).replace(/[^\d+]/g,"");
const sms=v=>"sms:"+String(v).replace(/[^\d+]/g,"");
const wa=v=>"https://wa.me/"+String(v).replace(/\D/g,"");

function privacyButtons(){
  const g=$("#gpsStatus"),d=$("#dataStatus");
  g.className="status "+(gpsAllowed?"gps-on":"gps-off");
  g.textContent=gpsAllowed?"GPS On":"GPS Off";
  d.className="status "+(dataAllowed?"data-on":"data-off");
  d.textContent=dataAllowed?"Data On":"Data Off";
}

function toggleGPS(){
  gpsAllowed=!gpsAllowed;
  localStorage.setItem("local-alerts-gps",gpsAllowed?"on":"off");
  if(!gpsAllowed){
    stopLocationWatch();
    $("#location").textContent="Location access off";
  }else{
    $("#location").textContent="Location not available";
  }
  privacyButtons();
  if(gpsAllowed&&dataAllowed)startLocationWatch();
}

function toggleData(){
  dataAllowed=!dataAllowed;
  localStorage.setItem("local-alerts-data",dataAllowed?"on":"off");
  if(!dataAllowed && page==="home"){
    $("#location").textContent=gpsAllowed?"Data access off":"Location access off";
  }
  privacyButtons();
  if(dataAllowed){
    checkData();
    startHourlyRefresh();
  }else if(liveRefreshTimer){
    clearInterval(liveRefreshTimer);
    liveRefreshTimer=null;
    stopLocationWatch();
  }
  if(dataAllowed&&gpsAllowed)startLocationWatch();
}

function nowText(){
  $("#datetime").textContent=
    new Date().toLocaleDateString(undefined,{weekday:"short",day:"2-digit",month:"short",year:"numeric"})+
    " · "+
    new Date().toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit",second:"2-digit"});
}
setInterval(nowText,1000);
nowText();

function categoryStrip(){
  const s=$("#categoryStrip");
  s.innerHTML='<button class="cat active" data-cat="all">All</button>'+
    ALERT_CATEGORIES.map(c=>`<button class="cat" data-cat="${c.id}">${c.name}</button>`).join("");
  s.querySelectorAll(".cat").forEach(b=>b.onclick=()=>{
    selected=b.dataset.cat;
    s.querySelectorAll(".cat").forEach(x=>x.classList.toggle("active",x===b));
    if(page==="home") renderHome();
    else if(page==="alerts") renderAlerts();
  });
}

function esc(v){
  return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
}

function alertCard(a,inactive=false){
  const dt=a.timestamp?new Date(a.timestamp).toLocaleString():"";
  const source=a.source?esc(a.source):"Official source";
  const link=a.url
    ? `<a class="action" target="_blank" rel="noopener noreferrer" href="${esc(a.url)}">🌐 Official alert</a>`
    : "";
  return `<article class="card ${inactive?"inactive":""}">
    <div class="card-title">${esc(a.title)}</div>
    <div class="meta"><span class="badge">${esc(a.category)}</span>${esc(a.detail)}${dt?`<br>${esc(dt)}`:""}${a.source?`<br>Source: ${source}`:""}</div>
    ${link?`<div class="actions">${link}</div>`:""}
  </article>`;
}

function sortedAlerts(){
  return (selected==="all"?ALERTS:ALERTS.filter(a=>a.category===selected))
    .slice().sort((a,b)=>new Date(b.timestamp||0)-new Date(a.timestamp||0));
}

const OFFICIAL_SOURCES=[
  {name:"KSDMA Warnings",url:"https://sdma.kerala.gov.in/?Itemid=151&id=72&option=com_content&view=article"},
  {name:"IMD Kerala Warnings",url:"https://mausam.imd.gov.in/imd_latest/contents/subdivisionwise-warning_mc.php?id=4"},
  {name:"KSDMA Weather",url:"https://sdma.kerala.gov.in/weather/"},
  {name:"INCOIS / High Waves",url:"https://sdma.kerala.gov.in/highwave/"},
  {name:"USGS Earthquakes",url:"https://earthquake.usgs.gov/earthquakes/feed/"},
  {name:"GDACS Disasters",url:"https://www.gdacs.org/"},
  {name:"Open-Meteo Weather",url:"https://open-meteo.com/"},
];

let liveRefreshTimer=null;
let liveRefreshInProgress=false;

// Travel Companion features integrated from the supplied project.
const TRAVEL_CONFIG={
  refreshIntervalMs:60*60*1000,
  moveThresholdM:5000,
  poiRadiusM:3500,
  officialAlertsEndpoint:"" // Optional Cloudflare Worker endpoint; keep provider keys server-side.
};
let watchId=null;
let lastAreaRefresh=0;
let lastAreaLocation=null;
let currentCoords=null;

function distanceMeters(lat1,lon1,lat2,lon2){
  const R=6371000,toRad=v=>v*Math.PI/180,dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1);
  const a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function weatherText(code){return ({0:"Clear sky",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",45:"Fog",48:"Rime fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",71:"Light snow",73:"Snow",75:"Heavy snow",80:"Rain showers",81:"Rain showers",82:"Violent showers",95:"Thunderstorm",96:"Thunderstorm with hail",99:"Thunderstorm with heavy hail"})[code]||`Weather code ${code}`;}
function setTravelBox(id,html){const el=$(id);if(el)el.innerHTML=html;}
async function fetchWeather(lat,lon){
  const fields="temperature_2m,apparent_temperature,precipitation,precipitation_probability,weather_code,wind_speed_10m";
  const u=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=${fields}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&forecast_days=3&timezone=auto`;
  const r=await fetch(u,{cache:"no-store"});if(!r.ok)throw Error("Weather request failed");return r.json();
}
function renderWeather(data){
  if(!data?.current||!data?.hourly){setTravelBox("weatherBox","Weather data could not be loaded.");return;}
  const c=data.current,now=Date.now();let i=data.hourly.time.findIndex(t=>new Date(t).getTime()>=now);if(i<0)i=0;
  const hours=data.hourly.time.slice(i,i+6).map((t,j)=>{const n=i+j;return `<li><strong>${new Date(t).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</strong>: ${data.hourly.temperature_2m[n]}°C, rain ${data.hourly.precipitation_probability[n]??"–"}%, ${weatherText(data.hourly.weather_code[n])}</li>`}).join("");
  const caution=data.hourly.precipitation_probability.slice(i,i+6).some(x=>x>=70)||[65,82,95,96,99].includes(c.weather_code);
  setTravelBox("weatherBox",`<p><strong>Now:</strong> ${c.temperature_2m}°C (feels ${c.apparent_temperature}°C), ${weatherText(c.weather_code)}, wind ${c.wind_speed_10m} km/h.</p>${caution?'<p class="warning">Travel caution: rain or thunderstorms may affect local movement. Check official alerts before travelling.</p>':""}<p><strong>Next 6 hours</strong></p><ul>${hours}</ul>`);
}
async function fetchPOIs(lat,lon){
  const q=`[out:json][timeout:20];(nwr["amenity"~"^(hospital|clinic|police|pharmacy|atm|fuel)$"](around:${TRAVEL_CONFIG.poiRadiusM},${lat},${lon});nwr["railway"="station"](around:${TRAVEL_CONFIG.poiRadiusM},${lat},${lon});nwr["amenity"="bus_station"](around:${TRAVEL_CONFIG.poiRadiusM},${lat},${lon}););out center tags;`;
  const r=await fetch("https://overpass-api.de/api/interpreter",{method:"POST",headers:{"Content-Type":"text/plain;charset=UTF-8"},body:q});if(!r.ok)throw Error("POI request failed");const j=await r.json();return j.elements||[];
}
function poiCoords(p){return {lat:p.lat??p.center?.lat,lng:p.lon??p.center?.lon};}
function renderPOIs(pois){
  const g={hospital:[],police:[],pharmacy:[],atm:[],fuel:[],station:[],bus:[]};
  pois.forEach(p=>{const t=p.tags||{},c=poiCoords(p);if(!Number.isFinite(c.lat)||!Number.isFinite(c.lng))return;let k="";if(t.amenity==="hospital"||t.amenity==="clinic")k="hospital";else if(t.amenity==="police")k="police";else if(t.amenity==="pharmacy")k="pharmacy";else if(t.amenity==="atm")k="atm";else if(t.amenity==="fuel")k="fuel";else if(t.railway==="station")k="station";else if(t.amenity==="bus_station")k="bus";if(k&&g[k].length<4)g[k].push({name:t.name||"Unnamed place",c});});
  const labels={hospital:"Hospitals / clinics",police:"Police",pharmacy:"Pharmacies",atm:"ATMs",fuel:"Fuel",station:"Rail stations",bus:"Bus stations"};
  let html="";Object.entries(g).forEach(([k,items])=>{if(items.length)html+=`<p><strong>${labels[k]}</strong></p><ul>${items.map(x=>`<li><a target="_blank" rel="noopener noreferrer" href="https://www.google.com/maps?q=${x.c.lat},${x.c.lng}">${esc(x.name)}</a></li>`).join("")}</ul>`;});
  setTravelBox("poiBox",html||"No mapped essential places found within approximately 3.5 km.");
  setTravelBox("supportBox",`<p><strong>Nearby mapped support</strong></p><p>${g.police.length} police · ${g.hospital.length} hospital/clinic · ${g.pharmacy.length} pharmacy · ${g.atm.length} ATM · ${g.fuel.length} fuel · ${g.station.length} rail · ${g.bus.length} bus.</p><p class="muted">This is a factual nearby-service count from OpenStreetMap. It is not a crime, risk, or official safety score.</p>`);
}
async function fetchOfficialAlerts(lat,lon){
  if(!TRAVEL_CONFIG.officialAlertsEndpoint)return null;
  const joiner=TRAVEL_CONFIG.officialAlertsEndpoint.includes("?")?"&":"?";
  const r=await fetch(`${TRAVEL_CONFIG.officialAlertsEndpoint}${joiner}lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lon)}`,{cache:"no-store"});if(!r.ok)throw Error("Official alerts request failed");return r.json();
}
function renderOfficialArea(data){
  if(!data){setTravelBox("officialAreaBox",`No secure official feed is configured in this build. <a target="_blank" rel="noopener noreferrer" href="https://sachet.ndma.gov.in/">Open NDMA SACHET</a> for current official geo-targeted warnings.`);return;}
  const items=Array.isArray(data)?data:(data.items||data.alerts||[]);
  setTravelBox("officialAreaBox",items.length?`<ul>${items.slice(0,10).map(x=>`<li><strong>${esc(x.title||"Official alert")}</strong>${x.description?`<br><span class="muted">${esc(x.description)}</span>`:""}${x.url?`<br><a target="_blank" rel="noopener noreferrer" href="${esc(x.url)}">Open source</a>`:""}</li>`).join("")}</ul>`:"No current official alerts returned.");
}
async function refreshAreaData(lat,lon,manual=false){
  if(!dataAllowed)return;lastAreaRefresh=Date.now();lastAreaLocation={lat,lon};
  setTravelBox("areaStatus",manual?"Refreshing nearby travel information…":"Updating nearby travel information…");
  const results=await Promise.allSettled([fetchWeather(lat,lon),fetchPOIs(lat,lon),fetchOfficialAlerts(lat,lon)]);
  renderWeather(results[0].status==="fulfilled"?results[0].value:null);
  renderPOIs(results[1].status==="fulfilled"?results[1].value:[]);
  renderOfficialArea(results[2].status==="fulfilled"?results[2].value:null);
  const stamp=new Date().toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"});
  setTravelBox("areaStatus",`Updated ${stamp}${manual?" · manual refresh":""}. Auto-refreshes hourly or after about 5 km movement.`);
}
function maybeRefreshAreaData(lat,lon){
  const moved=lastAreaLocation?distanceMeters(lat,lon,lastAreaLocation.lat,lastAreaLocation.lng):Infinity;
  if(!lastAreaLocation||Date.now()-lastAreaRefresh>=TRAVEL_CONFIG.refreshIntervalMs||moved>=TRAVEL_CONFIG.moveThresholdM)refreshAreaData(lat,lon);
}
function startLocationWatch(){
  if(!gpsAllowed||!dataAllowed||!navigator.geolocation)return;
  if(watchId!==null)navigator.geolocation.clearWatch(watchId);
  watchId=navigator.geolocation.watchPosition(pos=>{
    currentCoords={lat:pos.coords.latitude,lon:pos.coords.longitude,accuracy:pos.coords.accuracy};
    maybeRefreshAreaData(currentCoords.lat,currentCoords.lon);
  },()=>{}, {enableHighAccuracy:true,maximumAge:10000,timeout:20000});
}
function stopLocationWatch(){if(watchId!==null)navigator.geolocation.clearWatch(watchId);watchId=null;}

function saveLiveAlerts(extra){
  const base=Array.isArray(ALERTS)?ALERTS:[];
  const staticAlerts=base.filter(a=>!a.live);
  const merged=[...staticAlerts,...extra];
  ALERTS.splice(0,ALERTS.length,...merged);
}

async function fetchLiveEarthquakes(){
  const url="https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson";
  const r=await fetch(url,{cache:"no-store"});
  if(!r.ok) throw Error("USGS");
  const j=await r.json();
  return (j.features||[]).filter(f=>{
    const c=f.geometry?.coordinates||[];
    const lon=Number(c[0]),lat=Number(c[1]);
    return lat>=5 && lat<=38 && lon>=66 && lon<=100;
  }).slice(0,12).map(f=>{
    const p=f.properties||{};
    const mag=Number(p.mag);
    const t=p.time?new Date(p.time).toISOString():"";
    return {
      title:`Earthquake M${Number.isFinite(mag)?mag.toFixed(1):"?"} — ${p.place||"India region"}`,
      category:"earthquake",
      status:"active",
      timestamp:t,
      detail:`USGS real-time earthquake feed. ${p.place||""}`,
      source:"USGS",
      url:p.url||"https://earthquake.usgs.gov/earthquakes/feed/",
      live:true
    };
  });
}

async function fetchLiveGDACS(){
  const now=new Date(), from=new Date(now.getTime()-7*86400000);
  const iso=d=>d.toISOString().slice(0,10);
  const url=`https://www.gdacs.org/gdacsapi/api/Events/geteventlist/SEARCH?eventlist=EQ;TC;FL&fromdate=${iso(from)}&todate=${iso(now)}&alertlevel=orange;red`;
  const r=await fetch(url,{cache:"no-store"});
  if(!r.ok) throw Error("GDACS");
  const j=await r.json();
  const list=Array.isArray(j)?j:(j.features||j.items||j.data||[]);
  return list.slice(0,20).map(e=>{
    const p=e.properties||e;
    const type=String(p.eventtype||p.eventType||p.type||"").toUpperCase();
    const category=type.includes("TC")||type.includes("CYCLONE")?"cyclone":
                   type.includes("FL")||type.includes("FLOOD")?"flood":"earthquake";
    const title=p.name||p.eventname||p.eventName||"GDACS disaster alert";
    const stamp=p.todate||p.fromdate||p.date||p.eventdate||"";
    return {
      title,
      category,
      status:"active",
      timestamp:stamp,
      detail:`GDACS ${p.alertlevel||p.alertLevel||"alert"} event.`,
      source:"GDACS",
      url:"https://www.gdacs.org/",
      live:true
    };
  });
}

async function refreshLiveAlerts(){
  if(liveRefreshInProgress || !dataAllowed) return;
  liveRefreshInProgress=true;
  try{
    const results=await Promise.allSettled([fetchLiveEarthquakes(),fetchLiveGDACS()]);
    const extras=[];
    results.forEach(x=>{if(x.status==="fulfilled")extras.push(...x.value)});
    if(extras.length){
      saveLiveAlerts(extras);
      if(page==="home")renderHome();
      if(page==="alerts")renderAlerts();
    }
    const stamp=new Date().toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"});
    const d=$("#dataStatus");
    if(dataAllowed){
      d.className="status data-on";
      d.textContent=`Data On · ${stamp}`;
    }
  }finally{
    liveRefreshInProgress=false;
  }
}

function startHourlyRefresh(){
  if(liveRefreshTimer) clearInterval(liveRefreshTimer);
  liveRefreshTimer=setInterval(refreshLiveAlerts,60*60*1000);
  refreshLiveAlerts();
}

function renderHome(){
  page="home";
  $("#categoryStrip").style.display="flex";
  categoryStrip();
  const l=sortedAlerts(),
    active=l.filter(a=>a.status==="active"),
    previous=l.filter(a=>a.status==="previous"),
    inactive=l.filter(a=>a.status==="inactive");
  $("#content").innerHTML=
    `<h2>Active Alerts</h2><div class="stack">${active.map(a=>alertCard(a)).join("")||'<div class="empty">No active alerts</div>'}</div>
     <h2>Previous Alerts</h2><div class="stack">${previous.map(a=>alertCard(a)).join("")||'<div class="empty">No previous alerts</div>'}</div>
     <h2 class="muted-heading">Inactive Alerts</h2><div class="stack">${inactive.map(a=>alertCard(a,true)).join("")||'<div class="empty">No inactive alerts</div>'}</div>
     <h2>Official travel alerts</h2><article class="card"><div id="officialAreaBox" class="meta">Open SACHET for official India geo-targeted warnings.</div><div class="actions"><a class="action" target="_blank" rel="noopener noreferrer" href="https://sachet.ndma.gov.in/">🌐 NDMA SACHET</a></div></article>
     <h2>Weather</h2><article class="card"><div id="weatherBox" class="meta">Tap the GPS button to load local hourly weather.</div></article>
     <h2>Nearby travel essentials</h2><article class="card"><div id="supportBox" class="meta">Nearby mapped support will appear after location is available.</div><div id="poiBox" class="meta">Hospitals, police, pharmacies, ATMs, fuel, rail and bus locations will appear here.</div></article>
     <p id="areaStatus" class="muted area-status">Location-aware travel information refreshes hourly or after about 5 km movement.</p>`;
}

function renderAlerts(){
  page="alerts";
  $("#categoryStrip").style.display="flex";
  categoryStrip();
  $("#content").innerHTML=
    `<div class="page-bar"><button class="back" id="alertsBack" type="button" aria-label="Back">‹</button><div class="page-title">Alerts</div></div>
     <div class="actions official-sources">${OFFICIAL_SOURCES.map(s=>`<a class="action" target="_blank" rel="noopener noreferrer" href="${s.url}">🌐 ${esc(s.name)}</a>`).join("")}</div>
     <div class="stack">${sortedAlerts().map(a=>alertCard(a,a.status==="inactive")).join("")||'<div class="empty">No alert data available</div>'}</div>`;
  $("#alertsBack").onclick=()=>show("home");
}

function deviceContacts(){
  try{
    const saved=JSON.parse(localStorage.getItem("local-alerts-contacts")||"null");
    if(Array.isArray(saved) && saved.length) return saved;
  }catch{}
  return Array.isArray(window.PUBLIC_CONTACTS)?window.PUBLIC_CONTACTS:[];
}

function contactCard(c){
  let b=[];
  if(c.phone)b.push(`<a class="action" href="${tel(c.phone)}">☎ Call</a>`);
  if(c.sms)b.push(`<a class="action" href="${sms(c.sms)}">✉ SMS</a>`);
  if(c.whatsapp)b.push(`<a class="action" target="_blank" rel="noopener noreferrer" href="${wa(c.whatsapp)}">💬 WhatsApp</a>`);
  if(c.email)b.push(`<a class="action" href="mailto:${esc(c.email)}">✉ Email</a>`);
  if(c.website)b.push(`<a class="action" target="_blank" rel="noopener noreferrer" href="${esc(c.website)}">🌐 Website</a>`);
  return `<article class="card">
    <div class="card-title">${esc(c.name)}</div>
    <div class="meta">${esc(c.description||"")}</div>
    <div class="actions">${b.join("")||'<span class="meta">No contact method available</span>'}</div>
  </article>`;
}

function renderReport(){
  page="report";
  $("#categoryStrip").style.display="none";
  const c=deviceContacts();
  $("#content").innerHTML=
    `<div class="page-bar">
      <button class="back" id="reportBack" type="button" aria-label="Back">‹</button>
      <div class="page-title">Report to</div>
    </div>
    <div class="stack">${c.filter(x=>x.active!==false).map(contactCard).join("")||'<div class="empty">No contacts available</div>'}</div>`;
  $("#reportBack").onclick=()=>show("home");
}

function show(p){
  page=p;
  selected="all";
  $("#content").scrollTop=0;
  const home=p==="home";
  $("#homeHeader").style.display=home?"flex":"none";
  $("#statusButtons").style.display=home?"grid":"none";
  document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===p));
  if(p==="home")renderHome();
  else if(p==="alerts")renderAlerts();
  else if(p==="report")renderReport();
}

document.querySelectorAll(".nav").forEach(n=>{
  n.addEventListener("click",e=>{
    e.preventDefault();
    show(n.dataset.page);
  });
});

async function locate(){
  if(!gpsAllowed){
    stopLocationWatch();
    $("#location").textContent="Location access off";
    privacyButtons();
    return;
  }
  if(!dataAllowed){
    $("#location").textContent="Data access off";
    privacyButtons();
    return;
  }
  const g=$("#gpsStatus");
  g.className="status gps-on";
  g.textContent="GPS: Getting…";
  if(!navigator.geolocation){
    g.className="status gps-off";
    g.textContent="GPS Off";
    $("#location").textContent="Location is not supported";
    return;
  }
  navigator.geolocation.getCurrentPosition(async p=>{
    if(!gpsAllowed || !dataAllowed){
      $("#location").textContent=!gpsAllowed?"Location access off":"Data access off";
      privacyButtons();
      return;
    }
    g.className="status gps-on";
    g.textContent="GPS On";
    const lat=p.coords.latitude,lon=p.coords.longitude;
    currentCoords={lat,lon,accuracy:Number(p.coords.accuracy)||0};
    maybeRefreshAreaData(lat,lon);
    startLocationWatch();
    const acc=Number(p.coords.accuracy)||0;
    const accuracyText=acc>1000
      ? ` · Approximate accuracy ~${Math.round(acc/1000*10)/10} km`
      : ` · Accuracy ~${Math.round(acc)} m`;
    $("#location").textContent=`GPS ${lat.toFixed(6)}, ${lon.toFixed(6)}${accuracyText} · finding address…`;
    try{
      const u=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1`;
      const r=await fetch(u,{headers:{Accept:"application/json"}});
      if(!r.ok)throw Error();
      const d=await r.json();
      const name=d.display_name||"Address unavailable";
      $("#location").textContent=`${name} · GPS ${lat.toFixed(6)}, ${lon.toFixed(6)}${accuracyText}`;
    }catch{
      $("#location").textContent=`GPS ${lat.toFixed(6)}, ${lon.toFixed(6)}${accuracyText} · address service unavailable`;
    }
  },err=>{
    g.className="status gps-off";
    g.textContent="GPS Off";
    const msg=err && err.code===1
      ?"GPS permission not granted"
      :err && err.code===3
        ?"GPS location timed out"
        :"GPS location unavailable";
    $("#location").textContent=msg;
  },{
    enableHighAccuracy:true,
    timeout:15000,
    maximumAge:0
  });
}

async function checkData(){
  if(!dataAllowed){
    const d=$("#dataStatus");
    d.className="status data-off";
    d.textContent="Data Off";
    return;
  }
  const d=$("#dataStatus");
  d.textContent="Data: Checking…";
  try{
    const r=await fetch("./data.js",{cache:"no-store"});
    if(!r.ok)throw Error();
    d.className="status data-on";
    d.textContent=navigator.onLine?"Data On":"Data Cached";
  }catch{
    d.className="status data-off";
    d.textContent="Data Off";
  }
}

$("#locBtn").onclick=()=>locate();
$("#gpsStatus").onclick=toggleGPS;
$("#dataStatus").onclick=toggleData;
window.addEventListener("online",()=>{if(dataAllowed)checkData()});
window.addEventListener("offline",()=>{
  const d=$("#dataStatus");
  if(dataAllowed){
    d.className="status data-off";
    d.textContent="Data Weak";
  }
});

if("serviceWorker"in navigator){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("./sw.js").catch(()=>{});
  });
}

privacyButtons();
show("home");
if(dataAllowed){
  checkData();
  startHourlyRefresh();
  if(gpsAllowed)startLocationWatch();
}
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible" && dataAllowed){
    refreshLiveAlerts();
    if(currentCoords)maybeRefreshAreaData(currentCoords.lat,currentCoords.lon);
  }
});
window.addEventListener("pageshow",()=>{
  if(dataAllowed){
    refreshLiveAlerts();
    if(currentCoords)maybeRefreshAreaData(currentCoords.lat,currentCoords.lon);
  }
});
