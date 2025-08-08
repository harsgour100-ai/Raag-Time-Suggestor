# Raag Suggester (Time-based)

A minimal, dependency-free web app that suggests Hindustani raags based on the current time (or a manually selected time).

## Quickstart

- Serve the folder with any static server, for example:
  - Python: `python3 -m http.server 5173` (from this directory)
  - Node: `npx serve -l 5173` (if you have `serve`)
- Open `http://localhost:5173` in your browser.

## Features

- Uses your device time and timezone by default
- Manual time selection
- Visual 24-hour timeline with clickable hours
- Prahar-based windows with commonly accepted mappings

## Notes

- Time-theory assignments vary across gharanas and sources. This app encodes a broadly accepted mapping. You can adjust `data/raagas.json` to fit your preference.
- Night windows wrap around midnight and are handled accordingly.

## Customize

Edit `data/raagas.json` to change windows or add ragas. Fields:

```jsonc
{
  "id": "unique-id",
  "label": "Display Name",
  "startMin": 1080, // minutes since midnight
  "endMin": 1260,   // minutes since midnight (can be < startMin for wrap-around)
  "raagas": ["Yaman", "Puriya"],
  "note": "Optional descriptive note"
}
```