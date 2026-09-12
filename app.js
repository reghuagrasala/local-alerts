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
    $("#location").textContent="Location access off";
  }else{
    $("#location").textContent="Location not available";
  }
  privacyButtons();
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
  }
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
     <h2 class="muted-heading">Inactive Alerts</h2><div class="stack">${inactive.map(a=>alertCard(a,true)).join("")||'<div class="empty">No inactive alerts</div>'}</div>`;
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
    if(Array.isArray(saved)) return saved;
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
      <button class="action import-btn" id="importBtn" type="button">⇧ Import Contacts</button>
      <input id="contactFile" type="file" accept=".html,.htm,.json,application/json,text/html" hidden>
    </div>
    <div class="stack">${c.filter(x=>x.active!==false).map(contactCard).join("")||'<div class="empty">No contacts available on this device</div>'}</div>`;
  $("#reportBack").onclick=()=>show("home");
  $("#importBtn").onclick=()=>$("#contactFile").click();
  $("#contactFile").onchange=async e=>{
    const f=e.target.files[0];
    if(!f)return;
    const text=await f.text();
    let contacts=[];
    try{
      if(f.name.toLowerCase().endsWith(".json")){
        contacts=JSON.parse(text);
      }else{
        const doc=new DOMParser().parseFromString(text,"text/html");
        doc.querySelectorAll("tbody tr").forEach(tr=>{
          const v=[...tr.querySelectorAll("td")].map(x=>x.textContent.trim());
          if(v.length>=8&&v[0])contacts.push({
            name:v[0],description:v[1],phone:v[2],sms:v[3],
            whatsapp:v[4],email:v[5],website:v[6],
            active:v[7].toLowerCase()!=="false"
          });
        });
      }
    }catch{}
    if(!Array.isArray(contacts)||!contacts.length){
      alert("No editable contacts found in this file.");
      return;
    }
    localStorage.setItem("local-alerts-contacts",JSON.stringify(contacts));
    renderReport();
  };
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
}
document.addEventListener("visibilitychange",()=>{
  if(document.visibilityState==="visible" && dataAllowed) refreshLiveAlerts();
});
window.addEventListener("pageshow",()=>{
  if(dataAllowed) refreshLiveAlerts();
});
