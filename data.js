/* EDIT THIS FILE ONLY to update alert/contact data. */
const ALERT_CATEGORIES = [
  {id:"rain",name:"Rain"},
  {id:"lightning",name:"Lightning"},
  {id:"flood",name:"Flood"},
  {id:"landslide",name:"Landslide"},
  {id:"coastal",name:"Coastal"},
  {id:"cyclone",name:"Cyclone"},
  {id:"heat",name:"Heat"},
  {id:"uv",name:"UV"},
  {id:"air",name:"Air quality"},
  {id:"traffic",name:"Traffic"},
  {id:"roads",name:"Roads"},
  {id:"railway",name:"Railway"},
  {id:"fire",name:"Fire"},
  {id:"earthquake",name:"Earthquake"},
  {id:"health",name:"Health"},
  {id:"public",name:"Public notices"}
];

const ALERTS = [
  {title:"Prototype — no live warning loaded",category:"public",status:"upcoming",detail:"Connect official feeds in a later version. This prototype does not claim live alert data."}
];

const CONTACTS = [
  {title:"112 Emergency",category:"Emergency",type:"Call",value:"112",detail:"Single emergency number",active:true},
  {title:"Cyber Crime / Financial Fraud",category:"Cyber",type:"Call",value:"1930",detail:"National cybercrime helpline",active:true},
  {title:"RailMadad / Railway assistance",category:"Railway",type:"Call",value:"139",detail:"Railway enquiry, complaints and assistance",active:true},
  {title:"RPF Security",category:"Railway",type:"Call",value:"182",detail:"Railway security helpline",active:true},
  {title:"Highway Alert / Accident",category:"Kerala Police",type:"Call",value:"9846100100",detail:"Kerala Highway Police assistance",active:true},
  {title:"Kerala Police Railway Alert",category:"Kerala Police",type:"Call",value:"9846200100",detail:"Railway alert contact",active:true},
  {title:"Kerala Police Message Centre",category:"Kerala Police",type:"Call",value:"9497900000",detail:"Police message centre",active:true},
  {title:"Yodhavu — Anti Narcotic",category:"Kerala Police",type:"WhatsApp",value:"9995966666",detail:"Report drug use / supply",active:true},
  {title:"Subhayatra — Traffic violations",category:"Kerala Police",type:"WhatsApp",value:"9747001099",detail:"Traffic violation reporting",active:true},
  {title:"Vigilance & Anti-Corruption Bureau",category:"Vigilance",type:"Call",value:"1064",detail:"Toll-free vigilance helpline",active:true},
  {title:"VACB WhatsApp",category:"Vigilance",type:"WhatsApp",value:"9447789100",detail:"Vigilance reporting",active:true},
  {title:"Online blackmail / morphing / fraud",category:"Cyber",type:"WhatsApp",value:"9497980900",detail:"Kerala Police reporting contact",active:true},
  {title:"Thrissur Traffic Police",category:"Local Police",type:"Call",value:"9497980586",detail:"Thrissur Traffic Police Station",active:true},
  {title:"Thrissur City Cyber Police",category:"Local Police",type:"Call",value:"9497981174",detail:"Thrissur City Cyber Police Station",active:true},
  {title:"Viyyur Police Station",category:"Local Police",type:"Call",value:"9497980570",detail:"Viyyur Police Station",active:true},
  {title:"Mathilakam Police Station",category:"Local Police",type:"Call",value:"9497980549",detail:"Mathilakam Police Station",active:true},
  {title:"Kozhikode City Traffic Police",category:"Local Police",type:"Call",value:"9497987176",detail:"Kozhikode City Traffic Police",active:true}
];