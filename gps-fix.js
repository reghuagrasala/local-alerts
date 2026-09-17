// GPS reliability patch for Safari/iPhone.
// After a location fix, Local Alerts refreshes the SACHET feed for the
// current locality/district/city and repeats after about 5 km or one hour.
(function(){
  const btn=document.querySelector("#locBtn"),gps=document.querySelector("#gpsStatus"),loc=document.querySelector("#location");
  if(!btn||!gps||!loc||!navigator.geolocation)return;
  const WORKER="https://local-alerts-official-feed.hrcvb7p7r5.workers.dev/india-alerts";
  let lastSachet={lat:null,lon:null,time:0},watch=null;
  function setGps(text,cls){gps.className="status "+cls;gps.textContent=text;}
  function distance(a,b){if(a.lat===null)return Infinity;const R=6371000,r=v=>v*Math.PI/180,dlat=r(b.lat-a.lat),dlon=r(b.lon-a.lon),x=Math.sin(dlat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dlon/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
  async function refreshSachet(lat,lon,address){
    if(localStorage.getItem("local-alerts-data")==="off")return;
    const a=address||{};
    const clean=new URLSearchParams({lat:String(lat),lng:String(lon)});
    if(a.state_district||a.district)clean.set("district",a.state_district||a.district);
    if(a.city||a.town||a.village)clean.set("city",a.city||a.town||a.village);
    if(a.suburb||a.locality)clean.set("locality",a.suburb||a.locality);
    try{const r=await fetch(`${WORKER}?${clean.toString()}`,{cache:"no-store"});if(!r.ok)throw Error();const data=await r.json();if(window.renderSachetTop)window.renderSachetTop(data);if(window.renderOfficialAreaFromSachet)window.renderOfficialAreaFromSachet(data);lastSachet={lat,lon,time:Date.now()};}catch{if(window.renderSachetTop)window.renderSachetTop({error:true,location:{lat,lng:lon}});}
  }
  async function reverseAndRefresh(lat,lon,acc){
    const accuracyText=acc>1000?` · Accuracy ~${Math.round(acc/100)/10} km`:` · Accuracy ~${Math.round(acc)} m`;
    const u=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1`;
    try{const r=await fetch(u,{headers:{Accept:"application/json"},cache:"no-store"});if(!r.ok)throw Error();const d=await r.json();loc.textContent=`${d.display_name||"Address unavailable"} · GPS ${lat.toFixed(6)}, ${lon.toFixed(6)}${accuracyText}`;await refreshSachet(lat,lon,d.address||{});}catch{loc.textContent=`GPS ${lat.toFixed(6)}, ${lon.toFixed(6)}${accuracyText} · address service unavailable`;await refreshSachet(lat,lon,{});}
  }
  function showPosition(p){
    const lat=p.coords.latitude,lon=p.coords.longitude,acc=Number(p.coords.accuracy)||0;
    const accuracyText=acc>1000?` · Accuracy ~${Math.round(acc/100)/10} km`:` · Accuracy ~${Math.round(acc)} m`;
    setGps("GPS On","gps-on");loc.textContent=`GPS ${lat.toFixed(6)}, ${lon.toFixed(6)}${accuracyText} · finding address…`;
    if(typeof currentCoords!=="undefined")currentCoords={lat,lon,accuracy:acc};
    if(typeof maybeRefreshAreaData==="function")maybeRefreshAreaData(lat,lon);
    const moved=distance(lastSachet,{lat,lon});
    if(lastSachet.lat===null||moved>=5000||Date.now()-lastSachet.time>=3600000)reverseAndRefresh(lat,lon,acc);
  }
  function getLocation(){
    const gpsAllowed=localStorage.getItem("local-alerts-gps")!=="off",dataAllowed=localStorage.getItem("local-alerts-data")!=="off";
    if(!gpsAllowed){setGps("GPS Off","gps-off");loc.textContent="Location access off";return;}
    if(!dataAllowed){setGps("GPS On","gps-on");loc.textContent="Data access off";return;}
    setGps("GPS: Getting…","gps-weak");loc.textContent="Getting precise location…";
    navigator.geolocation.getCurrentPosition(showPosition,err=>{
      if(err&&err.code===1){setGps("GPS Off","gps-off");loc.textContent="GPS permission not granted";return;}
      if(err&&err.code===3){setGps("GPS: Retrying…","gps-weak");loc.textContent="Precise GPS is taking longer. Trying device location…";navigator.geolocation.getCurrentPosition(showPosition,finalErr=>{setGps("GPS Weak","gps-weak");loc.textContent=finalErr?.code===1?"GPS permission not granted":"GPS location unavailable — tap the location button to retry";},{enableHighAccuracy:false,timeout:60000,maximumAge:30000});return;}
      setGps("GPS Weak","gps-weak");loc.textContent="GPS location unavailable — tap the location button to retry";
    },{enableHighAccuracy:true,timeout:30000,maximumAge:5000});
  }
  function startTravelWatch(){
    if(watch!==null)navigator.geolocation.clearWatch(watch);
    watch=navigator.geolocation.watchPosition(showPosition,()=>{},{enableHighAccuracy:true,maximumAge:10000,timeout:20000});
  }
  btn.onclick=()=>{getLocation();startTravelWatch();};
  if(navigator.permissions?.query)navigator.permissions.query({name:"geolocation"}).then(p=>{if(p.state==="granted"){getLocation();startTravelWatch();}}).catch(()=>{});
})();
