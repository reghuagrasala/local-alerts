# Official alert Worker

Deploy this Worker separately from the Pages/PWA app. Configure `SACHET_CAP_URL` only after confirming a documented/permitted source and its exact format.

The browser should call:
`https://YOUR-WORKER/india-alerts?lat=...&lng=...`

The Worker returns normalized `{items:[...]}` JSON and keeps provider URLs/credentials out of the browser. The supplied starter deliberately does not claim an undocumented SACHET API endpoint.
