const $=s=>document.querySelector(s);
let page="home", selected="all";

function tel(v){return "tel:"+v.replace(/[^\d+]/g,"")}
function wa(v){return "https://wa.me/"+v.replace(/\D/g,"")}

function categories(target){
  target.innerHTML='<button class="cat active" data-cat="all">All</button>'+ALERT_CATEGORIES.map(c=>`<button class="cat" data-cat="${c.id}">${c.name}</button>`).join("");
  target.querySelectorAll(".cat").forEach(b=>b.onclick=()=>{selected=b.dataset.cat;target.querySelectorAll(".cat").forEach(x=>x.classList.toggle("active",x===b));renderAlerts()});
}
function alertCard(a,inactive=false){
  return `<article class="card ${inactive?"inactive":""}"><div class="card-title">${a.title}</div><div class="meta"><span class="badge">${a.category}</span>${a.detail}</div></article>`;
}
function renderAlerts(){
  const filtered=selected==="all"?ALERTS:ALERTS.filter(a=>a.category===selected);
  $("#activeAlerts").innerHTML=filtered.filter(a=>a.status==="active").map(a=>alertCard(a)).join("")||'<div class="empty">No active alerts</div>';
  $("#upcomingAlerts").innerHTML=filtered.filter(a=>a.status==="upcoming").map(a=>alertCard(a)).join("")||'<div class="empty">No upcoming alerts</div>';
  $("#inactiveAlerts").innerHTML=filtered.filter(a=>a.status==="inactive").map(a=>alertCard(a,true)).join("")||'<div class="empty">No inactive alerts</div>';
}
function contactCard(c){
  let href=c.type==="WhatsApp"?wa(c.value):tel(c.value);
  return `<article class="card"><div class="card-title">${c.title}</div><div class="meta">${c.detail}</div><div class="actions"><a class="action" href="${href}">${c.type}</a><span class="action">${c.value}</span></div></article>`;
}
function showReport(){
  $(".content-scroll").innerHTML=`<h2>Report to</h2><div class="actions" style="margin:0 0 10px"><button class="action" id="importBtn">⇧ Import Contacts</button></div><div class="stack">${CONTACTS.filter(c=>c.active).map(contactCard).join("")}</div><h2 class="muted-heading">Inactive</h2><div class="stack">${CONTACTS.filter(c=>!c.active).map(c=>`<article class="card inactive"><div class="card-title">${c.title}</div><div class="meta">${c.detail}</div></article>`).join("")||'<div class="empty">No inactive contacts</div>'}</div>`;
  $("#importBtn").onclick=()=>alert("Prototype: contact import will be enabled in the next version.");
}
function showHome(){
  $(".content-scroll").innerHTML=`<h2>Active alerts</h2><div id="activeAlerts" class="stack"></div><h2>Upcoming / tomorrow</h2><div id="upcomingAlerts" class="stack"></div><h2 class="muted-heading">Inactive</h2><div id="inactiveAlerts" class="stack"></div>`;
  renderAlerts();
}
function showPage(p){
  page=p; selected="all";
  $(".nav.active")?.classList.remove("active"); document.querySelector(`.nav[data-page="${p}"]`).classList.add("active");
  $(".category-strip").innerHTML="";
  if(p==="report") showReport(); else {categories($("#homeCategories"));showHome()}
  $(".content-scroll").scrollTop=0;
}
document.querySelectorAll(".nav").forEach(n=>n.onclick=()=>showPage(n.dataset.page));
$("#locBtn").onclick=()=>{if(navigator.geolocation) navigator.geolocation.getCurrentPosition(pos=>{$("#location").textContent="Location available on device";},()=>alert("Location permission was not granted."));};
$("#updated").textContent=new Date().toLocaleDateString();
categories($("#homeCategories")); renderAlerts();