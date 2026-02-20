# FutureBee POI MVP (Twekkelerveld)

A tiny, workshop-friendly **Point of Interest / Tagging** prototype:

- Click on the map → create a POI (tag + comment + urgency)
- The POI auto-grabs **context** (near green / water / cycle / roads)
- It suggests a few **solution templates**
- Users pick a solution + add notes
- Later: capture feedback to improve suggestions

## Data (Twekkelerveld)

This build tries to load **real context layers** for Twekkelerveld from **OpenStreetMap** via **Overpass API**.

If Overpass is unavailable (offline / rate limit), it falls back to small bundled demo GeoJSON in `data/*.geojson`.

## Images

`data/image_bank.json` contains example visuals (Wikimedia Commons) + small local icons.
Replace them with your own photo bank whenever it’s ready.

## Run

Open `index.html` (or serve the folder with any static server).
