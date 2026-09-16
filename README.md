# Local Alerts V10

Local Alerts is an independent public-help PWA. It is **not** a Kerala Government website or government service.

## Integrated Travel Companion features
- GPS location watch while the app is active.
- Nearby travel information refreshes hourly or after about 5 km of movement.
- Open-Meteo hourly/local weather forecast with rain/thunderstorm travel cautions.
- Nearby mapped essentials within approximately 3.5 km: hospitals/clinics, police, pharmacies, ATMs, fuel, rail stations and bus stations.
- Factual nearby-support counts only; no crime prediction, personal-safety score, or official safety rating.
- NDMA SACHET is linked directly for official geo-targeted warnings.
- Optional secure Cloudflare Worker endpoint can be configured for normalized official alerts. Provider credentials must stay in Worker secrets.
- Existing USGS/GDACS live alert refresh remains available.
- GPS/Data privacy controls gate location/network use by the app.

## Official feed architecture
Browser: GPS → Local Alerts → optional Cloudflare Worker → agency feeds → normalized alerts.

The Worker included here is a starter. `SACHET_CAP_URL` is deliberately a placeholder and must be replaced only with a permitted, documented CAP/feed URL. No undocumented NDMA endpoint is claimed or embedded.

## Sources
- NDMA SACHET: https://sachet.ndma.gov.in/
- Open-Meteo: https://open-meteo.com/
- OpenStreetMap / Overpass: https://www.openstreetmap.org/
- USGS Earthquakes: https://earthquake.usgs.gov/earthquakes/feed/
- GDACS: https://www.gdacs.org/
- KSDMA: https://sdma.kerala.gov.in/
- IMD: https://mausam.imd.gov.in/
