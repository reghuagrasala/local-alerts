// SACHET travel companion layer.
// The official SACHET portal remains authoritative for geo-targeted alerts.
// The Kerala RSS feed is state-wide; Local Alerts filters its published text
// using the current locality/district/city supplied by the GPS reverse lookup.
(function(){
  const SACHET_URL="https://sachet.ndma.gov.in/";
  const SACHET_CAP_FEED_URL="https://sachet.ndma.gov.in/CapFeed";
  const NOTIFY_KEY="local-alerts-sachet-notify";
  const SEEN_KEY="local-alerts-sachet-seen";
  function esc(v){return String(v??"").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[m]));}
  function box(){return document.querySelector("#officialAreaBox");}
  function renderTop(data){
    const status=document.querySelector("#sachetTopStatus"),alerts=document.querySelector("#sachetTopAlerts");if(!status||!alerts)return;
    const items=Array.isArray(data)?data:(data?.items||data?.alerts||[]);
    const terms=data?.locationTerms||[];
    const loc=data?.location;
    const locText=loc?`GPS ${Number(loc.lat).toFixed(5)}, ${Number(loc.lng).toFixed(5)}`:"Current GPS location";
    status.textContent=data?.error?"SACHET feed refresh failed — retrying automatically.":`${locText} · ${items.length} relevant official alert${items.length===1?"":"s"}`;
    if(data?.error){alerts.innerHTML=`<span class="warning">SACHET could not be refreshed right now.</span>`;return;}
    if(!items.length){alerts.innerHTML=`<span>No current SACHET alert matching this location was returned.</span>`;return;}
    alerts.innerHTML=`<strong>Relevant now</strong><ul>${items.slice(0,6).map(x=>`<li><strong>${esc(x.title||"Official alert")}</strong>${x.pubDate?` · <span class="muted">${esc(x.pubDate)}</span>`:""}${x.link?`<br><a target="_blank" rel="noopener noreferrer" href="${esc(x.link)}">Open this alert</a>`:""}</li>`).join("")}</ul>`;
  }
  async function enableLocalNotifications(){if(!("Notification"in window))return alert("This browser does not support notifications.");try{const p=await Notification.requestPermission();localStorage.setItem(NOTIFY_KEY,p);renderNotificationStatus();if(p==="granted")new Notification("Local Alerts",{body:"New SACHET alerts can be notified while Local Alerts is active."});}catch{}}
  function renderNotificationStatus(){const el=document.querySelector("#sachetNotifyStatus");if(!el)return;const p=localStorage.getItem(NOTIFY_KEY)||("Notification"in window?Notification.permission:"unsupported");el.textContent=p==="granted"?"Local notification: On":p==="denied"?"Local notification: Blocked":"Local notification: Off";}
  function notifyNew(items){if(!("Notification"in window)||Notification.permission!=="granted")return;const previous=JSON.parse(localStorage.getItem(SEEN_KEY)||"[]");const ids=items.map(x=>String(x.id||x.guid||x.title||""));const fresh=items.filter(x=>x.id&&!previous.includes(String(x.id)));if(previous.length===0){localStorage.setItem(SEEN_KEY,JSON.stringify(ids.slice(0,50)));return;}fresh.slice(0,3).forEach(x=>new Notification("NDMA SACHET alert",{body:String(x.title||"Official disaster alert"),tag:String(x.id)}));localStorage.setItem(SEEN_KEY,JSON.stringify([...ids,...previous].slice(0,50)));}
  function renderSachet(data){
    renderTop(data);
    const el=box();if(!el)return;
    const items=Array.isArray(data)?data:(data?.items||data?.alerts||[]);
    const source=data?.source||"NDMA SACHET";
    const stamp=data?.fetchedAt?new Date(data.fetchedAt).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"}):"";
    const status=data?.error?`<p class="warning">SACHET feed could not be refreshed.</p>`:"";
    const cards=items.slice(0,8).map(x=>`<li><strong>${esc(x.title||"Official alert")}</strong>${x.description?`<br><span class="muted">${esc(x.description)}</span>`:""}${x.pubDate?`<br><span class="muted">${esc(x.pubDate)}</span>`:""}${x.link?`<br><a target="_blank" rel="noopener noreferrer" href="${esc(x.link)}">Open alert</a>`:""}</li>`).join("");
    el.innerHTML=`<p><strong>NDMA SACHET</strong> · ${esc(source)}${stamp?` · updated ${esc(stamp)}`:""}</p>${status}${cards?`<ul>${cards}</ul>`:"<p>No current location-relevant SACHET alerts returned.</p>"}<p><button id="sachetNotifyBtn" class="action" type="button">Enable Local Alerts notifications</button> <span id="sachetNotifyStatus" class="muted"></span></p>`;
    const b=document.querySelector("#sachetNotifyBtn");if(b)b.onclick=enableLocalNotifications;
    renderNotificationStatus();if(!data?.error)notifyNew(items);
  }
  window.renderOfficialAreaFromSachet=renderSachet;
  window.renderOfficialArea=renderSachet;
  window.renderSachetTop=renderTop;
})();
