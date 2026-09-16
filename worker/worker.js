// Local Alerts official-alert Worker
// NDMA SACHET publishes India CAP alerts through its RSS service.
// The Kerala RSS URL is publicly referenced as the SACHET Kerala feed.
// The Worker keeps the upstream request server-side and caches the RSS response by ETag.

const SACHET_RSS_URL = "https://sachet.ndma.gov.in/cap_public_website/rss/rss_kerala.xml";
const CACHE_KEY = "https://local-alerts-official-feed.internal/sachet-kerala-rss";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=300"
};

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json; charset=utf-8" }
});

function decodeXml(s = "") {
  return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}
function textOnly(s = "") { return decodeXml(s).replace(/<br\s*\/?>/gi, " ").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }
function tag(block, name) {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return m ? textOnly(m[1]) : "";
}
function categoryFor(title, description) {
  const s = `${title} ${description}`.toLowerCase();
  if (/cyclone|storm|depression|low pressure/.test(s)) return "Cyclone";
  if (/earthquake|seismic/.test(s)) return "Earthquake";
  if (/landslide|mudslide/.test(s)) return "Landslide";
  if (/flood|waterlogging/.test(s)) return "Flood";
  if (/lightning|thunderstorm|thunder storm/.test(s)) return "Lightning";
  if (/heavy rain|rainfall|rain warning|rain/.test(s)) return "Rain";
  if (/high wave|highwave|coastal|rough sea|swell|kallakkadal/.test(s)) return "Coastal";
  if (/heat wave|heatwave|temperature|hot weather/.test(s)) return "Heat";
  if (/fire|forest fire/.test(s)) return "Fire";
  if (/wind|squall|gust/.test(s)) return "Public Notices";
  return "Public Notices";
}
function parseRss(xml) {
  const blocks = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];
  const items = [];
  for (const block of blocks) {
    const title = tag(block, "title"), description = tag(block, "description"), link = tag(block, "link");
    const guid = tag(block, "guid") || link || title, pubDate = tag(block, "pubDate");
    if (!title && !description) continue;
    const parsed = Date.parse(pubDate);
    items.push({ id:`sachet-${guid}`, title:title || "NDMA SACHET alert", description,
      category:categoryFor(title,description), source:"NDMA SACHET", scope:"Kerala", link, pubDate,
      timestamp:Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString() });
  }
  return items.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).slice(0,30);
}
async function fetchCachedRss() {
  const cache = caches.default, key = new Request(CACHE_KEY), cached = await cache.match(key);
  const headers = { "Accept":"application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8", "User-Agent":"Local-Alerts/1.0 (SACHET RSS consumer)" };
  const etag = cached?.headers.get("ETag");
  if (etag) headers["If-None-Match"] = etag;
  const r = await fetch(SACHET_RSS_URL,{headers});
  if (r.status===304 && cached) return {xml:await cached.text(),fromCache:true};
  if (!r.ok) throw new Error(`SACHET HTTP ${r.status}`);
  const xml = await r.text(), stored = new Headers({"Content-Type":"application/xml; charset=utf-8","Cache-Control":"public, max-age=300"});
  const newEtag = r.headers.get("ETag"); if (newEtag) stored.set("ETag",newEtag);
  await cache.put(key,new Response(xml,{status:200,headers:stored}));
  return {xml,fromCache:false};
}
export default { async fetch(request) {
  if (request.method==="OPTIONS") return new Response(null,{status:204,headers:cors});
  const u=new URL(request.url); if (u.pathname!=="/india-alerts") return json({error:"Use /india-alerts"},404);
  const lat=Number(u.searchParams.get("lat")), lng=Number(u.searchParams.get("lng"));
  if (!Number.isFinite(lat)||!Number.isFinite(lng)) return json({error:"lat and lng are required"},400);
  try {
    const feed=await fetchCachedRss();
    return json({items:parseRss(feed.xml),configured:true,source:"NDMA SACHET Kerala RSS",sourceUrl:SACHET_RSS_URL,fetchedAt:new Date().toISOString(),cache:feed.fromCache?"etag-304":"fresh",location:{lat,lng}});
  } catch(e) {
    return json({items:[],configured:true,source:"NDMA SACHET Kerala RSS",error:"Official SACHET Kerala RSS request failed"},502);
  }
}};
