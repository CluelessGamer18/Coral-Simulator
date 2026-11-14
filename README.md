# Coral Life Watch

An educational reef game. You play a triggerfish looking after a coral reef through ten years of warming
summers: shade and cool the reef during heatwaves, graze algae and replant coral in the winters, plug a leaking
pipe, build a nest, hide from predators and collect every kind of coral. Built with React, Vite and Phaser 3.

It plays with a keyboard, a mouse or a touch screen, and the Options menu has an accessibility section (text
size, reduced motion, colour-blind colours, a relaxed pace).

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
| `src/App.jsx` | The React shell: title screen, options, the layout around the game, notices and the report card. |
| `src/Hud.jsx` | The HUD: two rails beside the game on wide windows, one bar above it on narrow ones. |
| `src/Notices.jsx`, `src/GoalReminder.jsx` | Banners (including the card that opens each year), toasts and the "Survive all 10 years!" card. |
| `src/ReportCard.jsx`, `src/ReportCharts.jsx` | The end-of-game report card and its charts. |
| `src/TitleScreen/` | The title screen and the Options dialog. |
| `src/TouchControls.jsx` | On-screen Q and E buttons for touch screens. |
| `src/settings.js` | Accessibility and pace settings, tutorial-done flag and best result, saved in the browser. |
| `src/TestGame.jsx` | Creates the Phaser game. Loaded separately from the title screen, and preloaded behind it. |
| `src/scenes/Preloader.js` | Loads the images and sound effects, then starts the tutorial (first time) or the game. |
| `src/scenes/Tutorial.js` | Four short lessons: swim, eat, build, hide. |
| `src/scenes/TestScene.js` | The main game: the fish, predators, the year's rhythm, and what React is told. |
| `src/scenes/reefModel.js` | The climate and heat stress as plain functions with no drawing, so a script can play whole games. |
| `src/scenes/Objectives.js` | The six chapters and each year's goals. |
| `src/scenes/CoralManager.js` | The kinds of coral, how each bleaches, starves and is replanted, and the coral collection. |
| `src/scenes/Events.js` | Cloudy, Cool Current and Hot Plume bubbles. |
| `src/scenes/WinterJobs.js` | Grazing algae, eating coral-eating snails, replanting fragments, plugging the pipe. |
| `src/scenes/HomeBuilding.js` | Nest building, and carrying things with Q. |
| `src/scenes/EdgeIndicators.js` | Arrows at the edge of the view pointing at things off screen. |
| `src/scenes/PointerControls.js` | Swimming with a mouse or finger, and the on-screen keys. |
| `src/scenes/BleachingSchedule.js` | Which summers bring a heatwave, and how hot each is. |

The scene talks to React through `game.events`: `stats-changed`, `reef-warning`, `reef-warning-cleared`,
`random-event`, `predator-appeared`, `predator-left`, `coralInfo`, `goal-reminder`, `tutorial-step` and
`tutorial-praise`.

## How the reef behaves

The rules follow reef science where the game can:

- Heat stress builds with how hot the water is and for how long, like the "degree heating weeks" scientists use.
- Heat is the cause; bright light makes it worse. Shade slows bleaching and cooler water stops it.
- Table and branching corals bleach and die first; the pillar coral lasts longest.
- A fully bleached coral is starving, and dies only if it stays that way too long, so the reef dies a few
  colonies at a time. The game is lost if fewer than one coral in five is left.
- Nutrient pollution makes heat stress build faster and slows recovery.
- A winter gives back a fixed amount of stress, so a bad summer carries into the next.
- After bleaching, algae and coral-eating snails move in on weakened coral; grazing and predation help it recover.
- Broken fragments of living coral can settle and grow into new colonies.

Plugging the pipe is the one job that belongs to people on a real reef (treating sewage on land), and the game
says so.

## Assets

Only game-ready files live in `public/`, because Vite copies all of it into every build. Originals live in
`assets-src/` and are turned into game files by two scripts:

```bash
python3 scripts/build-art.py        # corals (needs Pillow)
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
| How fast stress builds and recovers, light and pollution | constants at the top of `src/scenes/reefModel.js` |
| Heatwave years and temperatures | `src/scenes/BleachingSchedule.js` |
| Chapters and each year's goals | `src/scenes/Objectives.js` |
| How sensitive each kind of coral is | `CORAL_KINDS` in `src/scenes/CoralManager.js` |
| Bubble timing and strength | constants at the top of `src/scenes/Events.js` |
| Winter jobs and the pipe | constants at the top of `src/scenes/WinterJobs.js` |
| Predator timing and speed | constants at the top of `src/scenes/TestScene.js` |
| Nest piece supply | `src/scenes/HomeBuilding.js` |
| Colours and text sizes | `src/styles/index.css` |

Balance was tuned by playing thousands of games with `reefModel.js` alone in Node: doing nothing loses the reef
around year 9, two bubbles a summer scrapes through, and steady play that also plugs the pipe keeps most of it.
