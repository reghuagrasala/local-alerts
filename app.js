let page="home",selected="all",homeFilter="all";
const $=s=>document.querySelector(s);
const tel=v=>"tel:"+String(v).replace(/[^\d+]/g,"");
const sms=v=>"sms:"+String(v).replace(/[^\d+]/g,"");
const wa=v=>"https://wa.me/"+String(v).replace(/\D/g,"");

function nowText(){
 const d=new Date();
 $("#datetime").textContent=d.toLocaleDateString(undefined,{weekday:"short",day:"2-digit",month:"short",year:"numeric"})+" · "+d.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit",second:"2-digit"});
}
setInterval(nowText,1000); nowText();

function categoryStrip(){
 const s=$("#categoryStrip");
 s.innerHTML='<button class="cat active" data-cat="all">All</button>'+
   ALERT_CATEGORIES.map(c=>`<button class="cat" data-cat="${c.id}">${c.name}</button>`).join("");
 s.querySelectorAll(".cat").forEach(b=>b.onclick=()=>{
   selected=b.dataset.cat;
   s.querySelectorAll(".cat").forEach(x=>x.classList.toggle("active",x===b));
   renderHome();
 });
}

function alertCard(a,inactive=false){
 const old=a.date||a.time||"";
 return `<article class="card ${inactive?"inactive":""}">
 <div class="card-title">${a.title}</div>
 <div class="meta"><span class="badge">${a.category}</span>${a.detail||""}${old?`<br>${old}`:""}</div></article>`;
}

function filteredAlerts(){
 return (selected==="all"?ALERTS:ALERTS.filter(a=>a.category===selected))
   .slice().sort((a,b)=>new Date(b.timestamp||0)-new Date(a.timestamp||0));
}

function renderHome(){
 $("#backBtn").hidden=true;
 categoryStrip();
 const list=filteredAlerts();
 // Home is intentionally stacked: current/active, previous, then inactive.
 const active=list.filter(a=>a.status==="active");
 const previous=list.filter(a=>a.status==="previous");
 const inactive=list.filter(a=>a.status==="inactive");
 $("#content").innerHTML=
 `<h2>Active Alerts</h2><div class="stack">${active.map(a=>alertCard(a)).join("")||'<div class="empty">No active alerts</div>'}</div>
  <h2>Previous Alerts</h2><div class="stack">${previous.map(a=>alertCard(a)).join("")||'<div class="empty">No previous alerts</div>'}</div>
  <h2 class="muted-heading">Inactive Alerts</h2><div class="stack">${inactive.map(a=>alertCard(a,true)).join("")||'<div class="empty">No inactive alerts</div>'}</div>`;
}

function renderAlertsPage(){
 $("#backBtn").hidden=false;
 $("#categoryStrip").innerHTML="";
 const list=filteredAlerts();
 $("#content").innerHTML=
 `<div class="page-head"><div class="page-title">Alerts</div></div>
  <h2>Newest First</h2>
  <div class="stack">${list.map(a=>alertCard(a,a.status==="inactive")).join("")||'<div class="empty">No alert data available</div>'}</div>`;
}

function deviceContacts(){
 try{return JSON.parse(localStorage.getItem("local-alerts-contacts")||"[]")}catch{return[]}
}
function contactCard(c){
 let b=[];
 if(c.phone)b.push(`<a class="action" href="${tel(c.phone)}">☎ Call</a>`);
 if(c.sms)b.push(`<a class="action" href="${sms(c.sms)}">✉ SMS</a>`);
 if(c.whatsapp)b.push(`<a class="action" target="_blank" rel="noopener" href="${wa(c.whatsapp)}">💬 WhatsApp</a>`);
 if(c.email)b.push(`<a class="action" href="mailto:${c.email}">✉ Email</a>`);
 if(c.website)b.push(`<a class="action" target="_blank" rel="noopener" href="${c.website}">🌐 Website</a>`);
 return `<article class="card"><div class="card-title">${c.name}</div><div class="meta">${c.description||""}</div><div class="actions">${b.join("")||'<span class="meta">No contact method available</span>'}</div></article>`;
}
function renderReport(){
 $("#backBtn").hidden=false;
 $("#categoryStrip").innerHTML="";
 const c=deviceContacts();
 $("#content").innerHTML=
 `<div class="page-head"><div class="page-title">Report to</div><button class="action import-btn" id="importBtn">⇧ Import Contacts</button></div>
  <div class="stack">${c.filter(x=>x.active!==false).map(contactCard).join("")||'<div class="empty">No contacts available on this device</div>'}</div>
  <h2 class="muted-heading">Inactive</h2>
  <div class="stack">${c.filter(x=>x.active===false).map(x=>`<article class="card inactive"><div class="card-title">${x.name}</div><div class="meta">${x.description||""}</div></article>`).join("")||'<div class="empty">No inactive contacts</div>'}</div>`;
 $("#importBtn").onclick=()=>alert("Import contacts into this device only. GitHub does not store contact data.");
}

function show(p){
 page=p; selected="all";
 document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===p));
 $("#content").scrollTop=0;
 if(p==="home")renderHome();
 else if(p==="alerts")renderAlertsPage();
 else renderReport();
}
document.querySelectorAll(".nav").forEach(n=>n.onclick=()=>show(n.dataset.page));
$("#backBtn").onclick=()=>show("home");

async function locate(){
 let g=$("#gpsStatus");
 g.className="status gps-on"; g.textContent="GPS: Getting…";
 if(!navigator.geolocation){g.className="status gps-off";g.textContent="GPS Off";return}
 navigator.geolocation.getCurrentPosition(async pos=>{
   g.className="status gps-on";g.textContent="GPS On";
   const lat=pos.coords.latitude,lon=pos.coords.longitude;
   $("#location").textContent=`GPS ${lat.toFixed(6)}, ${lon.toFixed(6)} · finding address…`;
   try{
    const u=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const r=await fetch(u,{headers:{Accept:"application/json"}});
    if(!r.ok)throw Error();
    const d=await r.json();
    $("#location").textContent=(d.display_name||"Address unavailable")+` · GPS ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
   }catch{
    $("#location").textContent=`GPS ${lat.toFixed(6)}, ${lon.toFixed(6)} · address service unavailable`;
   }
 },()=>{
   g.className="status gps-off";g.textContent="GPS Off";
   $("#location").textContent="GPS permission not granted";
 },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}

// Browser pages cannot physically switch the phone's GPS/mobile-data hardware.
// These buttons therefore show the live status and can be tapped to re-check.
// They must not falsely claim that a website has disabled device hardware.
$("#locBtn").onclick=locate;
$("#gpsStatus").onclick=locate;

async function checkData(){
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
$("#dataStatus").onclick=checkData;
window.addEventListener("online",checkData);
window.addEventListener("offline",()=>{let d=$("#dataStatus");d.className="status data-off";d.textContent="Data Off"});

if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
show("home");
