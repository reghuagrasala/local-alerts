// GPS reliability patch for Safari/iPhone.
// This runs after app.js and replaces the location button handler with a
// two-stage request: precise GPS first, then device/network location on timeout.
(function(){
  const btn=document.querySelector("#locBtn");
  const gps=document.querySelector("#gpsStatus");
  const loc=document.querySelector("#location");
  if(!btn||!gps||!loc||!navigator.geolocation)return;

  function setGps(text,cls){gps.className="status "+cls;gps.textContent=text;}
  function showPosition(p){
    const lat=p.coords.latitude,lon=p.coords.longitude,acc=Number(p.coords.accuracy)||0;
    const accuracyText=acc>1000?` · Accuracy ~${Math.round(acc/100)/10} km`:` · Accuracy ~${Math.round(acc)} m`;
    setGps("GPS On","gps-on");
    loc.textContent=`GPS ${lat.toFixed(6)}, ${lon.toFixed(6)}${accuracyText} · finding address…`;
    const u=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1`;
    fetch(u,{headers:{Accept:"application/json"},cache:"no-store"}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(d=>{
      loc.textContent=`${d.display_name||"Address unavailable"} · GPS ${lat.toFixed(6)}, ${lon.toFixed(6)}${accuracyText}`;
    }).catch(()=>{loc.textContent=`GPS ${lat.toFixed(6)}, ${lon.toFixed(6)}${accuracyText} · address service unavailable`;});
  }
  function getLocation(){
    const gpsAllowed=localStorage.getItem("local-alerts-gps")!=="off";
    const dataAllowed=localStorage.getItem("local-alerts-data")!=="off";
    if(!gpsAllowed){setGps("GPS Off","gps-off");loc.textContent="Location access off";return;}
    if(!dataAllowed){setGps("GPS On","gps-on");loc.textContent="Data access off";return;}
    setGps("GPS: Getting…","gps-weak");loc.textContent="Getting precise location…";
    navigator.geolocation.getCurrentPosition(showPosition,err=>{
      if(err&&err.code===1){setGps("GPS Off","gps-off");loc.textContent="GPS permission not granted";return;}
      if(err&&err.code===3){
        setGps("GPS: Retrying…","gps-weak");loc.textContent="Precise GPS is taking longer. Trying device location…";
        navigator.geolocation.getCurrentPosition(showPosition,finalErr=>{
          setGps("GPS Weak","gps-weak");
          loc.textContent=finalErr?.code===1?"GPS permission not granted":"GPS location unavailable — tap the location button to retry";
        },{enableHighAccuracy:false,timeout:60000,maximumAge:30000});
        return;
      }
      setGps("GPS Weak","gps-weak");loc.textContent="GPS location unavailable — tap the location button to retry";
    },{enableHighAccuracy:true,timeout:30000,maximumAge:5000});
  }
  btn.onclick=getLocation;
})();
