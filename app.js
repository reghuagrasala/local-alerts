let page="home",selected="all",gpsAllowed=localStorage.getItem("local-alerts-gps")!=="off",dataAllowed=localStorage.getItem("local-alerts-data")!=="off";
const $=s=>document.querySelector(s);
const tel=v=>"tel:"+String(v).replace(/[^\d+]/g,"");
const sms=v=>"sms:"+String(v).replace(/[^\d+]/g,"");
const wa=v=>"https://wa.me/"+String(v).replace(/\D/g,"");
function privacyButtons(){const g=$("#gpsStatus"),d=$("#dataStatus");g.className="status "+(gpsAllowed?"gps-on":"gps-off");g.textContent=gpsAllowed?"GPS On":"GPS Off";d.className="status "+(dataAllowed?"data-on":"data-off");d.textContent=dataAllowed?"Data On":"Data Off"}
function toggleGPS(){gpsAllowed=!gpsAllowed;localStorage.setItem("local-alerts-gps",gpsAllowed?"on":"off");if(!gpsAllowed){$("#location").textContent="Location access off";}privacyButtons()}
function toggleData(){dataAllowed=!dataAllowed;localStorage.setItem("local-alerts-data",dataAllowed?"on":"off");privacyButtons()}


function nowText(){const d=new Date();$("#datetime").textContent=d.toLocaleDateString(undefined,{weekday:"short",day:"2-digit",month:"short",year:"numeric"})+" · "+d.toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
setInterval(nowText,1000);nowText();

function categoryStrip(){
 const s=$("#categoryStrip");
 s.innerHTML='<button class="cat active" data-cat="all">All</button>'+ALERT_CATEGORIES.map(c=>`<button class="cat" data-cat="${c.id}">${c.name}</button>`).join("");
 s.querySelectorAll(".cat").forEach(b=>b.onclick=()=>{selected=b.dataset.cat;s.querySelectorAll(".cat").forEach(x=>x.classList.toggle("active",x===b));renderHome()});
}
function alertCard(a,inactive=false){
 const dt=a.timestamp?new Date(a.timestamp).toLocaleString():"";
 return `<article class="card ${inactive?"inactive":""}"><div class="card-title">${a.title}</div><div class="meta"><span class="badge">${a.category}</span>${a.detail||""}${dt?`<br>${dt}`:""}</div></article>`;
}
function sortedAlerts(){return (selected==="all"?ALERTS:ALERTS.filter(a=>a.category===selected)).slice().sort((a,b)=>new Date(b.timestamp||0)-new Date(a.timestamp||0))}
function renderHome(){
 $("#categoryStrip").style.display="flex";
 categoryStrip();
 const l=sortedAlerts(),active=l.filter(a=>a.status==="active"),previous=l.filter(a=>a.status==="previous"),inactive=l.filter(a=>a.status==="inactive");
 $("#content").innerHTML=`<h2>Active Alerts</h2><div class="stack">${active.map(a=>alertCard(a)).join("")||'<div class="empty">No active alerts</div>'}</div>
 <h2>Previous Alerts</h2><div class="stack">${previous.map(a=>alertCard(a)).join("")||'<div class="empty">No previous alerts</div>'}</div>
 <h2 class="muted-heading">Inactive Alerts</h2><div class="stack">${inactive.map(a=>alertCard(a,true)).join("")||'<div class="empty">No inactive alerts</div>'}</div>`;
}
function renderAlerts(){
 $("#categoryStrip").style.display="flex";categoryStrip();
 $("#content").innerHTML=`<div class="page-bar"><button class="back" id="alertsBack">‹</button><div class="page-title">Alerts</div></div>
 <div class="stack">${sortedAlerts().map(a=>alertCard(a,a.status==="inactive")).join("")||'<div class="empty">No alert data available</div>'}</div>`;
 $("#alertsBack").onclick=()=>privacyButtons();show("home");
}
function deviceContacts(){try{return JSON.parse(localStorage.getItem("local-alerts-contacts")||"[]")}catch{return[]}}
function contactCard(c){
 let b=[];if(c.phone)b.push(`<a class="action" href="${tel(c.phone)}">☎ Call</a>`);if(c.sms)b.push(`<a class="action" href="${sms(c.sms)}">✉ SMS</a>`);if(c.whatsapp)b.push(`<a class="action" target="_blank" rel="noopener" href="${wa(c.whatsapp)}">💬 WhatsApp</a>`);if(c.email)b.push(`<a class="action" href="mailto:${c.email}">✉ Email</a>`);if(c.website)b.push(`<a class="action" target="_blank" rel="noopener" href="${c.website}">🌐 Website</a>`);
 return `<article class="card"><div class="card-title">${c.name}</div><div class="meta">${c.description||""}</div><div class="actions">${b.join("")||'<span class="meta">No contact method available</span>'}</div></article>`;
}
function renderReport(){
 $("#categoryStrip").style.display="none"; const c=deviceContacts();
 $("#content").innerHTML=`<div class="page-bar"><button class="back" id="reportBack">‹</button><div class="page-title">Report to</div><button class="action import-btn" id="importBtn">⇧ Import Contacts</button><input id="contactFile" type="file" accept=".html,.htm,.json,application/json,text/html" hidden></div>
 <div class="stack">${c.filter(x=>x.active!==false).map(contactCard).join("")||'<div class="empty">No contacts available on this device</div>'}</div>`;
 $("#reportBack").onclick=()=>privacyButtons();show("home");
 $("#importBtn").onclick=()=>$("#contactFile").click();
 $("#contactFile").onchange=async e=>{const f=e.target.files[0];if(!f)return;const text=await f.text();let contacts=[];try{if(f.name.toLowerCase().endsWith(".json"))contacts=JSON.parse(text);else{const doc=new DOMParser().parseFromString(text,"text/html");doc.querySelectorAll("tbody tr").forEach(tr=>{const v=[...tr.querySelectorAll("td")].map(x=>x.textContent.trim());if(v.length>=8&&v[0])contacts.push({name:v[0],description:v[1],phone:v[2],sms:v[3],whatsapp:v[4],email:v[5],website:v[6],active:v[7].toLowerCase()!=="false"});});}}catch{} if(!Array.isArray(contacts)||!contacts.length){alert("No editable contacts found in this file.");return} localStorage.setItem("local-alerts-contacts",JSON.stringify(contacts));renderReport();};
}
function show(p){
 page=p;selected="all";$("#content").scrollTop=0;
 const home=p==="home";
 $("#homeHeader").style.display=home?"flex":"none";
 $("#statusButtons").style.display=home?"grid":"none";
 $("#backBtn")?.remove();
 document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===p));
 if(p==="home")renderHome();else if(p==="alerts")renderAlerts();else renderReport();
}
document.querySelectorAll(".nav").forEach(n=>n.onclick=()=>show(n.dataset.page));

async function locate(){
 const g=$("#gpsStatus");g.className="status gps-on";g.textContent="GPS: Getting…";
 if(!navigator.geolocation){g.className="status gps-off";g.textContent="GPS Off";return}
 navigator.geolocation.getCurrentPosition(async p=>{
  g.className="status gps-on";g.textContent="GPS On";
  const lat=p.coords.latitude,lon=p.coords.longitude;
  $("#location").textContent=`GPS ${lat.toFixed(6)}, ${lon.toFixed(6)} · finding address…`;
  try{
   const u=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
   const r=await fetch(u,{headers:{Accept:"application/json"}});
   if(!r.ok)throw Error();
   const d=await r.json();
   $("#location").textContent=(d.display_name||"Address unavailable")+` · GPS ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  }catch{$("#location").textContent=`GPS ${lat.toFixed(6)}, ${lon.toFixed(6)} · address service unavailable`}
 },()=>{g.className="status gps-off";g.textContent="GPS Off";$("#location").textContent="GPS permission not granted"},{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}
async function checkData(){
 const d=$("#dataStatus");d.textContent="Data: Checking…";
 try{const r=await fetch("./data.js",{cache:"no-store"});if(!r.ok)throw Error();d.className="status data-on";d.textContent=navigator.onLine?"Data On":"Data Cached"}
 catch{d.className="status data-off";d.textContent="Data Off"}
}
$("#locBtn").onclick=()=>gpsAllowed&&locate();$("#gpsStatus").onclick=toggleGPS;$("#dataStatus").onclick=toggleData;
window.addEventListener("online",checkData);window.addEventListener("offline",()=>{let d=$("#dataStatus");d.className="status data-off";d.textContent="Data Off"});
if("serviceWorker"in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
privacyButtons();show("home");