# Local Alerts V9

- Current KSDMA/IMD-derived sample alerts are included for interface verification.
- User contacts are not stored in GitHub.
- `contacts.html` is an editable, empty device-contact template.
- Report to → Import Contacts opens the device file picker (on iPhone this can select a file from Files).
- Imported contacts are saved to device local storage only.
- GPS and Data buttons are app privacy controls: Off prevents Local Alerts from using the respective access until turned on again.
- Alerts and Report to remain full-screen pages with Back buttons.
- This is not a Kerala Government website or government service.


## V7 fixes
- Alerts and Report to bottom-navigation buttons open correctly.
- Back buttons on Alerts and Report to return correctly to Home.
- Alert cards include official external alert links where supplied in data.js.
- GPS Off prevents all geolocation calls.
- Data Off prevents location/network operations controlled by the app.
- GPS accuracy is displayed; approximate/low-accuracy positions are not presented as precise.
- Service-worker cache is versioned to V7 and uses network-first fetching so updated deployments are not trapped on an old cached V6 app.


## V8 additions
- Hourly live refresh while the app is running, plus refresh on app resume/visibility.
- Live earthquake data from the USGS real-time GeoJSON feed for the India region.
- GDACS orange/red earthquake, cyclone and flood events are attempted on each refresh when the browser permits the request.
- Official source links for KSDMA, IMD Kerala, INCOIS/KSDMA high-wave information, USGS, GDACS and Open-Meteo.
- Alerts page remains internally scrollable as the list grows.
- Public emergency/contact directory is available immediately in Report to; imported device contacts still override it and remain local-only.
- `contacts.html` is now populated with editable public contacts from official India/Kerala sources.
- Browser/PWA background execution is controlled by iOS/browser; the app therefore also refreshes whenever it is opened or brought back to the foreground.


## Contact master files
- `contacts.html` contains all 37 public contacts and is editable.
- `public-contacts.js` contains the same 37 public contacts and is used by the app so Report to is populated on first opening.
- Imported device contacts remain local to the device and are not written back to GitHub.


## V9
- Report to no longer has an Import Contacts button or device file-import logic.
- Report to is populated automatically from `public-contacts.js`.
- `contacts.html` remains the editable master file containing the same 37 public contacts.
