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
- Interactive Samay Chakra (circular time wheel)
- Raag details modal with aroha/avaroha, vadi/samvadi, and YouTube search links

## Notes

- Time-theory assignments vary across gharanas and sources. This app encodes a broadly accepted mapping. You can adjust `data/raagas.json` to fit your preference.
- Night windows wrap around midnight and are handled accordingly.
- YouTube links open curated search results so they remain stable; you can replace them with specific video URLs you prefer.

## Customize

Edit `data/raagas.json` to change windows or add ragas. Fields for the details map:

```jsonc
"details": {
  "Yaman": {
    "thaat": "Kalyan",
    "vadi": "Ga",
    "samvadi": "Ni",
    "aroha": "Ni Re Ga Ma# Pa Dha Ni Sa",
    "avaroha": "Sa Ni Dha Pa Ma# Ga Re Sa",
    "description": "Short note about the raag",
    "links": [{ "label": "Search: Yaman Rashid Khan", "url": "https://www.youtube.com/results?search_query=raag+yaman+rashid+khan" }]
  }
}
```