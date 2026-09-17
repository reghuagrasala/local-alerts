// GPS reliability patch for Safari/iPhone.
// Precise location is used for the Local Alerts travel feed. After a GPS fix,
// the app reverse-geocodes once to obtain locality/district/city terms and
// asks the SACHET Worker for alerts relevant to that current location.
(function(){
  const btn=document.querySelector("#locBtn"),gps=document.querySelector("#gpsStatus"),loc=document.querySelector("#location");
  if(!btn||!gps||!loc||!navigator.geolocation)return;
  const WORKER="https://local-alerts-official-feed.hrcvb7p7r5.workers.dev/india-alerts";
  function setGps(text,cls){gps.className="status "+cls;gps.textContent=text;}
  async function refreshSachet(lat,lon,address){
    if(localStorage.getItem("local-alerts-data")==="off")return;
    const a=address||{};
    const terms=[a.state_district,a.district,a.city,a.town,a.village,a.suburb,a.city_district,a.locality].filter(Boolean);
    const q=new URLSearchParams({lat:String(lat),lng:String(lon)});terms.slice(0,6).forEach((v,i)=>q.set(i===0?"district":i===1?"city":i===2?"locality":`term${i}`,v));
    // Worker currently uses district/city/locality; keep the most useful three.
    const clean=new URLSearchParams({lat:String(lat),lng:String(lon)});
    if(a.state_district||a.district)clean.set("district",a.state_district||a.district);
    if(a.city||a.town||a.village)clean.set("city",a.city||a.town||a.village);
    if(a.suburb||a.locality)clean.set("locality",a.suburb||a.locality);
    try{
      const r=await fetch(`${WORKER}?${clean.toString()}`,{cache:"no-store"});
      if(!r.ok)throw Error("SACHET request failed");
      const data=await r.json();
      if(window.renderSachetTop)window.renderSachetTop(data);
      if(window.renderOfficialAreaFromSachet)window.renderOfficialAreaFromSachet(data);
    }catch{
      if(window.renderSachetTop)window.renderSachetTop({error:true,location:{lat, lng:lon}});
    }
  }
  function showPosition(p){
    const lat=p.coords.latitude,lon=p.coords.longitude,acc=Number(p.coords.accuracy)||0;
    const accuracyText=acc>1000?` · Accuracy ~${Math.round(acc/100)/10} km`:` · Accuracy ~${Math.round(acc)} m`;
    setGps("GPS On","gps-on");
    loc.textContent=`GPS ${lat.toFixed(6)}, ${lon.toFixed(6)}${accuracyText} · finding address…`;
    if(typeof currentCoords!=="undefined")currentCoords={lat,lon,accuracy:acc};
    if(typeof maybeRefreshAreaData==="function")maybeRefreshAreaData(lat,lon);
    const u=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1`;
    fetch(u,{headers:{Accept:"application/json"},cache:"no-store"}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{
      loc.textContent=`${d.display_name||"Address unavailable"} · GPS ${lat.toFixed(6)}, ${lon.toFixed(6)}${accuracyText}`;
      refreshSachet(lat,lon,d.address||{});
    }).catch(()=>{
      loc.textContent=`GPS ${lat.toFixed(6)}, ${lon.toFixed(6)}${accuracyText} · address service unavailable`;
      refreshSachet(lat,lon,{});
    });
  }
  function getLocation(){
    const gpsAllowed=localStorage.getItem("local-alerts-gps")!=="off",dataAllowed=localStorage.getItem("local-alerts-data")!=="off";
    if(!gpsAllowed){setGps("GPS Off","gps-off");loc.textContent="Location access off";return;}
    if(!dataAllowed){setGps("GPS On","gps-on");loc.textContent="Data access off";return;}
    setGps("GPS: Getting…","gps-weak");loc.textContent="Getting precise location…";
    navigator.geolocation.getCurrentPosition(showPosition,err=>{
      if(err&&err.code===1){setGps("GPS Off","gps-off");loc.textContent="GPS permission not granted";return;}
      if(err&&err.code===3){
        setGps("GPS: Retrying…","gps-weak");loc.textContent="Precise GPS is taking longer. Trying device location…";
        navigator.geolocation.getCurrentPosition(showPosition,finalErr=>{setGps("GPS Weak","gps-weak");loc.textContent=finalErr?.code===1?"GPS permission not granted":"GPS location unavailable — tap the location button to retry";},{enableHighAccuracy:false,timeout:60000,maximumAge:30000});return;
      }
      setGps("GPS Weak","gps-weak");loc.textContent="GPS location unavailable — tap the location button to retry";
    },{enableHighAccuracy:true,timeout:30000,maximumAge:5000});
  }
  btn.onclick=getLocation;
  // If Safari has already granted location permission, refresh automatically.
  // If permission is still "prompt", do not open a permission dialog on page load.
  if(navigator.permissions?.query){navigator.permissions.query({name:"geolocation"}).then(p=>{if(p.state==="granted")getLocation();}).catch(()=>{});}
})();
