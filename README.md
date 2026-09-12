# Local Alerts V7

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
