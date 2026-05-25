# FutureBEEing POI System

A browser-based Point-of-Interest (POI) system for the social theme of the
[FutureBEEing](https://deutschland-nederland.eu/en/projects/futurebeeing/)
Tooling. It lets workshop participants place markers on a shared map of the
Twekkelerveld neighbourhood in Enschede, enrich each marker with text, photos
and annotations, filter the visible records, and export the result for the
planner.

This repository is the prototype handed over to the FutureBEEing tooling team
at Provincie Overijssel at the end of the MSc Spatial Engineering internship
of Rakibun Athid (Faculty ITC, University of Twente, February–May 2026).

---

## What's in this repository

| File / folder              | Purpose                                                                 |
| -------------------------- | ----------------------------------------------------------------------- |
| `index.html`               | The full single-page web application. Open this in a browser to run it. |
| `study_area.geojson`       | Boundary of the Twekkelerveld study area (WGS84). Loaded by the app.    |
| `Twekkelerveld_utm32.gpkg` | GeoPackage version of the study area (EPSG:32632), for desktop GIS use. |
| `*.png`                    | Category icons used by the panel (community garden, lighting, parking, playground, pocket park, shared space). |
| `LICENSE`                  | MIT licence text.                                                       |
| `README.md`                | This file.                                                              |

---

## Quick start (run locally)

You only need Python 3 (already on macOS and most Linux distributions, and a
free download on Windows).

```bash
git clone https://github.com/RakibAthid/Futurebeeing.git
cd Futurebeeing
python3 -m http.server 8000
```

Then open <http://localhost:8000> in a modern browser (Firefox 124+, Chrome
122+, or Safari 17+ have all been tested).

> **Why not just double-click `index.html`?**
> The browser blocks several features the app relies on (geolocation, file
> upload, clipboard) when the page is loaded from `file://`. Serving the
> folder through `http://localhost` solves that.

---

## Use it in a workshop

1. **Place a POI.** Click anywhere inside the Twekkelerveld study area. A
   marker drops at that point and the right-hand panel opens.
2. **Enrich the POI.** Give it a title, pick a category and priority, attach
   one or more photos, add a comment, tag stakeholders.
3. **Annotate a photo.** Click the *Annotate* button on a photo thumbnail to
   draw shapes and add labels on the image.
4. **Filter.** Use the left-hand panel to filter the visible markers by
   category, priority, stakeholder, or free-text search.
5. **Export.** Choose between CSV, Excel, a media ZIP, or a printable PDF
   report.

All data lives in the browser's `localStorage`. Use the *Export* and *Import
state* controls to move a workshop session between devices.

---

## Deployment

The repository is plain static files, so any static host works. The host
organisation uses [Cloudflare Pages](https://pages.cloudflare.com/) connected
to this repository through the standard GitHub integration. Every push to
`main` triggers a rebuild and a deploy to the Cloudflare global edge network.
No server-side runtime is required.

---

## External libraries

Loaded at run time from public CDNs (versions pinned in `index.html`):

- [Leaflet 1.9.4](https://leafletjs.com/) — map rendering
- [JSZip 3.10.1](https://stuk.github.io/jszip/) — ZIP export
- [Inter](https://fonts.google.com/specimen/Inter) — UI typeface (Google Fonts)

Map tiles come from [OpenStreetMap](https://www.openstreetmap.org/copyright)
under the ODbL.

---

## Reference tags

Two tags mark significant points in the project history:

- **`midterm-2026-04`** — the frozen first-prototype build shown to four
  FutureBEEing partners during the moderated usability test in mid-April 2026.
- **`handover-v1`** — the redesigned prototype handed over to the FutureBEEing
  tooling team at the end of the internship.

Both tags are referenced from Appendix C of the internship report.

---

## Roadmap (for the integration step)

The internship handed the prototype over with five recommendations to the
FutureBEEing tooling team:

1. **Real-world validation in Twekkelerveld.** Run a moderated workshop with
   residents (the present internship validated the prototype with project
   partners, not with residents).
2. **Persistent server-side storage.** Add a small REST endpoint that accepts
   the JSON shape used by the prototype, so participants in the same workshop
   see the same map.
3. **Bilingual UI.** Replace the English-with-tooltips approach with a clean
   Dutch / German label switch.
4. **Category-system decision.** Decide between curated default, open-ended
   input, or a hybrid (the prototype defers this choice).
5. **Authorship and stakeholder fields in the PDF report.** Carry the
   `author` and `stakeholders` fields into the printable report so the planner
   sees who flagged what.

---

## Citation

If you use or build on this prototype, please cite:

> Athid, R. (2026). *Design of a Point-of-Interest System for the FutureBEEing
> Tooling: A web-based prototype for the social component of the FutureBEEing
> Tooling*. Internship report, MSc Spatial Engineering, Faculty ITC,
> University of Twente, Enschede.

---

## Licence

Released under the [MIT License](LICENSE). Map tiles © OpenStreetMap
contributors, ODbL.

---

## Contact

- **Author:** Rakibun Athid (ITC, University of Twente)
- **Host supervisor:** Dipl.-Ing. Ulla-Britt Krämer, FutureBEEing project,
  Provincie Overijssel
- **Academic supervisor:** Dr. Mila N. Koeva, Associate Professor and
  Vice-Dean Education, Faculty ITC, University of Twente
