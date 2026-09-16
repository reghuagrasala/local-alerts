// Local Alerts official-feed Worker
// Source: NDMA SACHET public India CAP/RSS service.
// Kerala feed is used here because this app is focused on Kerala local alerts.
// The SACHET portal publishes alerts through its RSS feed; this Worker keeps
// the provider fetch server-side and uses ETag caching to reduce repeat load.

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

function xmlDecode(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripHtml(value = "") {
  return xmlDecode(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i");
  const m = block.match(re);
  return m ? xmlDecode(m[1]).trim() : "";
}

function parseRss(xml) {
  const items = [];
  const matches = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) || [];
  for (const block of matches) {
    const title = stripHtml(tag(block, "title"));
    const description = stripHtml(tag(block, "description"));
    const link = stripHtml(tag(block, "link"));
    const pubDate = stripHtml(tag(block, "pubDate"));
    const guid = stripHtml(tag(block, "guid")) || link || title;
    if (!title && !description) continue;

    const sent = Date.parse(pubDate || "");
    const lower = `${title} ${description}`.toLowerCase();
    let category = "Public Notice";
    if (/cyclone|storm|depression|low pressure/.test(lower)) category = "Cyclone";
    else if (/rain|thunderstorm|lightning|heavy rainfall/.test(lower)) category = "Rain";
    else if (/flood|waterlogging/.test(lower)) category = "Flood";
    else if (/landslide|mudslide/.test(lower)) category = "Landslide";
    else if (/heat wave|temperature|hot weather/.test(lower)) category = "Heat";
    else if (/coastal|high wave|rough sea|swell|kallakkadal/.test(lower)) category = "Coastal";
    else if (/earthquake|seismic/.test(lower)) category = "Earthquake";
    else if (/fire|forest fire/.test(lower)) category = "Fire";
    else if (/wind|squall|gust/.test(lower)) category = "Traffic";

    items.push({
      id: `sachet-${guid}`,
      title: title || "NDMA SACHET alert",
      description,
      category,
      source: "NDMA SACHET",
      scope: "Kerala",
      link,
      pubDate,
      timestamp: Number.isFinite(sent) ? new Date(sent).toISOString() : new Date().toISOString()
    });
  }
  return items
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 20);
}

async function getSachetRss() {
  const cache = caches.default;
  const key = new Request(CACHE_KEY);
  const cached = await cache.match(key);
  const headers = {
    Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
    "User-Agent": "Local-Alerts/1.0 (NDMA SACHET RSS consumer)"
  };
  const oldEtag = cached?.headers.get("ETag");
  if (oldEtag) headers["If-None-Match"] = oldEtag;

  const response = await fetch(SACHET_RSS_URL, { headers });
  if (response.status === 304 && cached) {
    return { text: await cached.text(), etag: oldEtag, fromCache: true };
  }
  if (!response.ok) throw new Error(`SACHET HTTP ${response.status}`);

  const text = await response.text();
  const storedHeaders = new Headers({
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=300"
  });
  const etag = response.headers.get("ETag");
  if (etag) storedHeaders.set("ETag", etag);
  await cache.put(key, new Response(text, { status: 200, headers: storedHeaders }));
  return { text, etag, fromCache: false };
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const u = new URL(request.url);
    if (u.pathname !== "/india-alerts") return json({ error: "Use /india-alerts" }, 404);

    const lat = Number(u.searchParams.get("lat"));
    const lng = Number(u.searchParams.get("lng"));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return json({ error: "lat and lng are required" }, 400);
    }

    try {
      const feed = await getSachetRss();
      const items = parseRss(feed.text);
      return json({
        items,
        configured: true,
        source: "NDMA SACHET Kerala RSS",
        sourceUrl: SACHET_RSS_URL,
        fetchedAt: new Date().toISOString(),
        cache: feed.fromCache ? "etag-304" : "fresh",
        location: { lat, lng }
      });
    } catch (e) {
      return json({
        items: [],
        configured: true,
        source: "NDMA SACHET Kerala RSS",
        error: "Official SACHET feed request failed"
      }, 502);
    }
  }
};
