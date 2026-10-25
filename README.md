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
- **Remote AI Control (MCP + Supabase sync)**: Connect your own Claude or ChatGPT to read workouts, create routines, plan your training week, and log sessions.

## Running
No build step. Open `index.html` in a browser, or serve the folder with any static host
(GitHub Pages, Vercel, Netlify, etc.).

Data is stored locally in the browser (`localStorage` + IndexedDB), so each device keeps its own history.

---

## Connect Your AI (Remote MCP Server)

You can connect your own personal AI assistant (Claude on desktop or mobile, ChatGPT) to view your training logs, generate or update routines, plan your week, and log workouts directly.

### 1. One-Time Database Setup (Supabase)
1. Open the SQL Editor in your Supabase project.
2. Paste and run the contents of [`docs/supabase-schema.sql`](docs/supabase-schema.sql).
3. Connect your Supabase project to your Vercel project (via the official Vercel integration or environment variables: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`).

### 2. Connect in the App
1. Open the app on your phone, go to **Profile > Settings**, and find **Connect your AI**.
2. Tap **Connect your AI**. The browser generates a secure random token and registers it with your backend.
3. Copy your personal connector URL (`https://your-domain.vercel.app/api/mcp/<token>`).

### 3. Add to Claude or ChatGPT
- **Claude**: Go to **Settings > Connectors > Add custom connector** and paste your connector URL.
- **ChatGPT**: Go to **Settings > Connected apps > Add MCP** and paste your connector URL.

### Privacy & Offline Safety
- **Service role key never leaves the server:** The browser never touches or knows your Supabase database keys.
- **Photos stay on your phone:** Progress photos are stored strictly in local device storage (IndexedDB) and are never uploaded, synchronized, or readable by the AI.
- **Works offline:** If your phone loses connection or Supabase is unreachable, the app works exactly as before. Any pending changes will sync automatically when back online.
- **Reversible AI updates:** If your AI modifies a routine or plan, the app displays a banner (`Updated by your AI: <what>`) with an instant **Undo** button.
