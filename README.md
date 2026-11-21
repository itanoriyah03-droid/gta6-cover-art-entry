# Golden Tide Cover Studio

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/itanoriyah03-droid/gta6-cover-art-entry/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard)
[![reward](https://make.fun/badge/gta6-cover-art-01/itanoriyah03-droid/gta6-cover-art-entry/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Your photos become Vice City key art. Golden Tide Cover Studio is an offline
poster studio for the [Make GTA 6 Cover Art](https://make.fun/bounty/gta6-cover-art-01)
bounty: load your own photos (or the built-in sample scenes), fill a six-panel
comic grid, letter the title in striped chrome with a neon script subtitle, and
export a finished cover as a PNG to share — in Wide 1920×1080, Story 1080×1350
or Square 1080×1080, all three at once if you like.

Everything runs on your machine from static files. Photos never leave it, and
the app makes no network request at all.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

Pick a sample photo or upload your own, click a panel to select it, drag to
move its photo, scroll to zoom. Edit the title, script subtitle, press quote
and tagline, pick a grade and a layout, then **Export PNG**.

## What it makes

- **Six-panel comic grid** with a hero close-up, role tags on every panel
  (THE DRIVER, THE BOSS, THE LOOKOUT, THE GETAWAY, THE CAPTAIN, THE HIDEOUT),
  plus two more layouts: **Full Bleed** and **Tilted Snapshots**.
- **Face-aware crops** — portraits carry a face anchor, so the crop keeps the
  face in frame; uploads can be centred on the face with one click.
- **Poster furniture, all of it:** five gold stars and a press quote with a
  VOL. 1 box, striped-chrome title, neon script subtitle, tagline, COMING SOON,
  a billing block, a barcode and a gold BEST CAST seal — plus film grain and a
  vignette so the cover feels printed.
- **Six grades:** Sunset, Neon Nights, Golden Hour, Vice Pink, Teal Dawn, Noir.
- **Three post sizes** in one step: 1920×1080, 1080×1350, 1080×1080.
- **Undo / redo**, per-panel zoom and pan, editable role tags and lettering.

## How it is built

- `app/index.html` + `app/style.css` — the editor shell and studio chrome.
- `app/src/cover.js` — the cover engine: panels, face-aware crops, grades,
  chrome lettering and all the poster furniture, drawn on a 2D canvas. The
  same `drawCover()` paints the live preview, the PNG export and the
  `?shot=cover` scene, so the screenshots show exactly what the app makes.
- `app/src/editor.js` — the editor: photos, panels, lettering, grades,
  layouts, undo/redo, export and the `?shot=` scenes.
- `app/src/samples.js` — the seven sample scenes and their face anchors.
- `app/samples/*.jpg` — original illustrations painted for this studio.
- `app/fonts/` — Noto Sans Display ExtraCondensed Black (title), Noto Serif
  Display Black Italic (script subtitle), Noto Sans (UI), all under the
  SIL Open Font License — see `app/fonts/OFL.txt`.
- `main.ts` — hands the app in: copies `app/` and `screenshots/` to `/output`
  and writes `/output/dossier.json` with the vendored make.fun library.
- `serve.ts` — a tiny static server for local tries.

No Rockstar Games logo, artwork or font is used anywhere. The sample scenes
are original illustrations, not photos of real people.

## Screenshots

`?shot=cover` renders the finished cover full frame in the browser;
`?shot=editor` opens the editor with a sample loaded. `shots.json` lists the
four screenshots: the wide cover first, then the editor, the story cover and
the square cover.

## License

MIT — see LICENSE.
