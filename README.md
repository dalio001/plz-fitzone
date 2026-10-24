# PLZ Train

**PLZ Train** (formerly PLZ FitZone) — a single-file, mobile-first workout tracker (Pure Living Zone).

## Features
- Routines (Push / Pull / Legs presets + custom routines)
- Live workout logging with set types (Normal, Warm-up, Drop, Failure), previous-set lookup, and a rest timer with beep
- Workout history with PR detection (estimated 1RM)
- Exercise library with custom exercises and best est. 1RM
- Profile stats and muscle-group set distribution
- Barbell plate calculator, KG/LBS toggle
- JSON backup / restore

## Running
No build step. Open `index.html` in a browser, or serve the folder with any static host
(GitHub Pages, Vercel, Netlify, etc.).

Data is stored locally in the browser (`localStorage`), so each device keeps its own history —
use **Backup JSON** / **Restore JSON** on the Profile tab to move data between devices.
