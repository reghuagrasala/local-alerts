/* Public alerts only. USER CONTACT DATA IS NOT STORED HERE. */
const ALERT_CATEGORIES=[
{id:"heat",name:"Heat"},{id:"traffic",name:"Traffic"},{id:"roads",name:"Roads"},{id:"railway",name:"Railway"},{id:"fire",name:"Fire"},
{id:"rain",name:"Rain"},{id:"lightning",name:"Lightning"},{id:"flood",name:"Flood"},{id:"landslide",name:"Landslide"},
{id:"coastal",name:"Coastal"},{id:"high-tide",name:"High Tide"},{id:"air",name:"Air Quality"},{id:"uv",name:"UV"},
{id:"health",name:"Health"},{id:"public",name:"Public Notices"},{id:"cyclone",name:"Cyclone"},{id:"earthquake",name:"Earthquake"}];

const ALERTS=[
{title:"High temperature advisory",category:"heat",status:"active",timestamp:"2026-09-11T12:00:00+05:30",detail:"Kerala may see isolated temperatures 3–4°C above normal from 11 Sep through 13 Sep 2026.",source:"KSDMA / IMD",url:"https://sdma.kerala.gov.in/temperature/"},
{title:"Kallakkadal / high-wave warning",category:"high-tide",status:"active",timestamp:"2026-09-11T12:30:00+05:30",detail:"Kerala coast: 0.5–1.2 m high waves and possible sea incursion until 13 Sep 2026 at 23:30.",source:"KSDMA / INCOIS",url:"https://sdma.kerala.gov.in/highwave/"},
{title:"Strong-wind / low-pressure situation",category:"rain",status:"active",timestamp:"2026-09-11T12:30:00+05:30",detail:"A low-pressure area persists over the northwest–central Bay of Bengal and adjoining south Odisha–north Andhra coast; follow official updates.",source:"KSDMA / IMD",url:"https://sdma.kerala.gov.in/?Itemid=151&id=72&option=com_content&view=article"},
{title:"Fishermen warning — Arabian Sea",category:"coastal",status:"previous",timestamp:"2026-09-11T12:30:00+05:30",detail:"Strong winds of 45–55 km/h, occasionally 65 km/h, were forecast for specified Arabian Sea areas from 12–15 Sep.",source:"KSDMA / IMD"},
{title:"No current alert data",category:"public",status:"inactive",timestamp:"2026-09-11T00:00:00+05:30",detail:"Placeholder inactive state for interface verification.",source:"Local Alerts prototype"}
];