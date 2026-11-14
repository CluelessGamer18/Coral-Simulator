# Coral Life Watch

An educational reef game. You play a triggerfish looking after a coral reef through ten years of warming
summers: shade the reef during bleaching heatwaves, build a nest, hide from predators and collect every kind
of coral. Built with React, Vite and Phaser 3.

## Running it

```bash
npm install
npm run dev       # development server with hot reload
npm run build     # production build in dist/
npm run preview   # serve the production build locally
npm run lint
```

Pull requests are linted and built by GitHub Actions (`.github/workflows/ci.yml`).

## How the code is laid out

| Path | What it is |
|---|---|
| `src/App.jsx` | The React shell: title screen, options, HUD, notices and the end screen. Mirrors the game's state from `stats-changed` events. |
| `src/TestGame.jsx` | Creates the Phaser game. Loaded separately from the title screen, and preloaded behind it. |
| `src/scenes/Preloader.js` | Loads the images and sound effects. |
| `src/scenes/Tutorial.js` | The step-by-step tutorial. |
| `src/scenes/TestScene.js` | The main game: climate, stress, the fish, predators. |
| `src/scenes/CoralManager.js` | The kinds of coral, how they are planted and bleached, and the coral collection. |
| `src/scenes/Events.js` | The Cloudy bubbles that shade the reef. |
| `src/scenes/HomeBuilding.js` | Nest building. |
| `src/scenes/BleachingSchedule.js` | Which summers bring a heatwave, and how hot each is. |
| `src/Notices.jsx`, `src/GoalReminder.jsx` | Banners, toasts and the "Survive all 10 years!" card. |

The scene talks to React through `game.events`: `stats-changed`, `reef-warning`, `reef-warning-cleared`,
`random-event`, `predator-appeared`, `predator-left`, `coralInfo`, `goal-reminder`, `tutorial-step` and
`tutorial-praise`.

## Assets

Only game-ready files live in `public/`, because Vite copies all of it into every build. Originals live in
`assets-src/` and are turned into game files by two scripts:

```bash
python3 scripts/build-art.py        # corals and the stress outline (needs Pillow)
bash scripts/build-ocean-sounds.sh  # Ocean Sounds recordings (needs ffmpeg)
```

To add a coral drawing, put the full-size PNG in `assets-src/corals/`, run `build-art.py`, load it in
`Preloader.js` and add its key to a kind's `variants` in `CoralManager.js`. A new entry in `CORAL_KINDS`
becomes a new collectable automatically.

Sound and music credits are in `CREDITS.md`.

Art that the game no longer uses is kept in `assets-src/unused/`.

## Debugging

Add `?debug` to the address (or run `npm run dev`) and the running scene is available in the browser console as
`window.gameScene`.

## Tuning

| What | Where |
|---|---|
| Length of a year and of the game, fish speed, hearts | `src/scenes/gameConfig.js` |
| Stress rates, predator timing and speed | constants at the top of `src/scenes/TestScene.js` |
| Heatwave years and temperatures | `src/scenes/BleachingSchedule.js` |
| Bubble timing and strength | `CONFIG` and `EVENT_CHANGE_RANGES` in `src/scenes/Events.js` |
| Nest piece supply | `src/scenes/HomeBuilding.js` |
