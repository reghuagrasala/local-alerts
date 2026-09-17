// SACHET travel companion layer.
// The official SACHET portal remains authoritative for geo-targeted alerts.
// The Kerala RSS feed is state-wide; this layer never presents it as a CAP geofence.
(function(){
  const SACHET_URL="https://sachet.ndma.gov.in/";
  const SACHET_CAP_FEED_URL="https://sachet.ndma.gov.in/CapFeed";
  const NOTIFY_KEY="local-alerts-sachet-notify";
  const SEEN_KEY="local-alerts-sachet-seen";
  function esc(v){return String(v??"").replace(/[&<>\"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[m]));}
  function box(){return document.querySelector("#officialAreaBox");}
  async function enableLocalNotifications(){if(!("Notification"in window))return alert("This browser does not support notifications.");try{const p=await Notification.requestPermission();localStorage.setItem(NOTIFY_KEY,p);renderNotificationStatus();if(p==="granted")new Notification("Local Alerts",{body:"New SACHET alerts can be notified while Local Alerts is active."});}catch{}}
  function renderNotificationStatus(){const el=document.querySelector("#sachetNotifyStatus");if(!el)return;const p=localStorage.getItem(NOTIFY_KEY)||("Notification"in window?Notification.permission:"unsupported");el.textContent=p==="granted"?"Local notification: On":p==="denied"?"Local notification: Blocked":"Local notification: Off";}
  function notifyNew(items){if(!("Notification"in window)||Notification.permission!=="granted")return;const previous=JSON.parse(localStorage.getItem(SEEN_KEY)||"[]");const ids=items.map(x=>String(x.id||x.guid||x.title||""));const fresh=items.filter(x=>x.id&&!previous.includes(String(x.id)));if(previous.length===0){localStorage.setItem(SEEN_KEY,JSON.stringify(ids.slice(0,50)));return;}fresh.slice(0,3).forEach(x=>new Notification("NDMA SACHET alert",{body:String(x.title||"Official disaster alert"),tag:String(x.id)}));localStorage.setItem(SEEN_KEY,JSON.stringify([...ids,...previous].slice(0,50)));}
  function locationLabel(data){const c=data?.location;if(!c)return "Current location";return `Current location · ${Number(c.lat).toFixed(4)}, ${Number(c.lng).toFixed(4)}`;}
  function renderSachet(data){
    const el=box();if(!el)return;
    const items=Array.isArray(data)?data:(data?.items||data?.alerts||[]);
    const source=data?.source||"NDMA SACHET";
    const stamp=data?.fetchedAt?new Date(data.fetchedAt).toLocaleTimeString(undefined,{hour:"2-digit",minute:"2-digit"}):"";
    const status=data?.error?`<p class="warning">SACHET feed could not be refreshed. The official portal remains available below.</p>`:"";
    const cards=items.slice(0,8).map(x=>`<li><strong>${esc(x.title||"Official alert")}</strong>${x.description?`<br><span class="muted">${esc(x.description)}</span>`:""}${x.pubDate?`<br><span class="muted">${esc(x.pubDate)}</span>`:""}${x.link?`<br><a target="_blank" rel="noopener noreferrer" href="${esc(x.link)}">Open alert</a>`:""}</li>`).join("");
    el.innerHTML=`<p><strong>NDMA SACHET</strong> · ${esc(source)}${stamp?` · updated ${esc(stamp)}`:""}</p><p class="muted">${locationLabel(data)}</p><p class="muted">The Kerala RSS feed is state-wide. It is refreshed using your current GPS position, but the RSS items are not claimed to be location-geofenced.</p>${status}${cards?`<ul>${cards}</ul>`:"<p>No current Kerala SACHET alerts returned.</p>"}<p><a class="action" target="_blank" rel="noopener noreferrer" href="${SACHET_URL}">Open official SACHET</a></p><p><a class="action" target="_blank" rel="noopener noreferrer" href="${SACHET_CAP_FEED_URL}">Open SACHET RSS Feed</a></p><p><button id="sachetNotifyBtn" class="action" type="button">Enable Local Alerts notifications</button> <span id="sachetNotifyStatus" class="muted"></span></p>`;
    const b=document.querySelector("#sachetNotifyBtn");if(b)b.onclick=enableLocalNotifications;
    renderNotificationStatus();if(!data?.error)notifyNew(items);
  }
  window.renderOfficialAreaFromSachet=renderSachet;
  window.renderOfficialArea=renderSachet;
})();
