# Coral Life Watch

An educational reef game. You play a triggerfish looking after a coral reef through ten years of warming
summers: shade the reef during bleaching heatwaves, build a nest, hide from predators and collect every kind
of coral. Built with React, Vite and Phaser 3.

## Running it

```bash
npm install
npm run dev            # development server with hot reload
npm run build          # production build in dist/
npm run preview        # serve the production build locally
npm run lint
npm run format         # format every file with Prettier
npm run format:check   # what CI runs: fails if anything isn't formatted
```

Pull requests are checked by GitHub Actions (`.github/workflows/ci.yml`): formatting, lint and build. The code
style is Prettier's, with the settings in `.prettierrc.json` (4 spaces, double quotes, semicolons, 120 columns);
`.editorconfig` gives editors without Prettier the same basics.

## How the code is laid out

| Path                                                           | What it is                                                                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `src/App.jsx`                                                  | The React shell: title screen, options, HUD, notices and the end screen. Mirrors the game's state from `stats-changed` events. |
| `src/components/`                                              | The React components, one per file, each with its stylesheet of the same name in `src/styles/`.                                |
| `src/components/PhaserGame.jsx`                                | Creates the Phaser game. Loaded separately from the title screen, and preloaded behind it.                                     |
| `src/settings.js`                                              | The player's settings (volumes, keys, Ocean Sounds), saved in the browser.                                                     |
| `src/game/scenes/Preloader.js`                                 | Loads the images and sound effects.                                                                                            |
| `src/game/scenes/Tutorial.js`                                  | The step-by-step tutorial.                                                                                                     |
| `src/game/scenes/ReefScene.js`                                 | The main game: runs the clock, the fish and the camera, and ties the systems below together.                                   |
| `src/game/Climate.js`                                          | Temperature, light, pollution and the reef's stress, and the warnings that go with them.                                       |
| `src/game/CoralReef.js`, `src/game/coralKinds.js`              | How the corals are planted, sway and bleach, and the kinds of coral that make up the collection.                               |
| `src/game/BubbleManager.js`                                    | The Cloudy bubbles that shade the reef.                                                                                        |
| `src/game/NestBuilding.js`                                     | Nest building.                                                                                                                 |
| `src/game/Predators.js`                                        | The groupers that hunt the fish.                                                                                               |
| `src/game/PlayerFish.js`, `Hearts.js`, `Stamina.js`, `Food.js` | The player's fish, its health, sprint and food. Shared by the tutorial and the main game.                                      |
| `src/game/bleachingSchedule.js`                                | Which summers bring a heatwave, and how hot each is.                                                                           |
| `src/game/gameConfig.js`, `src/game/gameEvents.js`             | The numbers, and the event and scene names, that more than one file (React included) has to agree on.                          |
| `src/game/assetKeys.js`                                        | The keys every image and sound is loaded under.                                                                                |

The scene talks to React through `game.events`, with the names in `src/game/gameEvents.js`: `scene-ready`,
`stats-changed`, `reef-warning`, `reef-warning-cleared`, `random-event`, `predator-appeared`, `predator-left`,
`coral-selected`, `goal-reminder`, `tutorial-step`, `tutorial-praise` and `game-problem`.

## Assets

Only game-ready files live in `public/`, because Vite copies all of it into every build. File names are lowercase
`snake_case`, named for what's in them. Originals live in `assets-src/` and are turned into game files by two scripts:

```bash
python3 scripts/build-art.py        # corals and the stress outline (needs Pillow)
bash scripts/build-ocean-sounds.sh  # Ocean Sounds recordings (needs ffmpeg)
```

To add a coral drawing, put the full-size PNG in `assets-src/corals/` (named like `columnar_5.png`), run
`build-art.py` and add its key (`columnar5`) to its kind's `variants` in `src/game/coralKinds.js`; the Preloader loads
every variant. A new entry in `CORAL_KINDS` becomes a new collectable automatically.

Sound and music credits are in `CREDITS.md`. Art that the game no longer uses is kept in `assets-src/unused/`.

## Debugging

Add `?debug` to the address (or run `npm run dev`) and the running scene is available in the browser console as
`window.gameScene`.

## Tuning

| What                                                         | Where                                                     |
| ------------------------------------------------------------ | --------------------------------------------------------- |
| Length of a year and of the game, fish speed, hearts, depths | `src/game/gameConfig.js`                                  |
| Stress rates, warnings and the healthy ranges                | `src/game/Climate.js` and `THRESHOLDS` in `gameConfig.js` |
| Predator timing and speed                                    | the top of `src/game/Predators.js`                        |
| Heatwave years and temperatures                              | `src/game/bleachingSchedule.js`                           |
| Bubble timing and strength                                   | the top of `src/game/BubbleManager.js`                    |
| Nest piece supply                                            | the top of `src/game/NestBuilding.js`                     |
| Food                                                         | the top of `src/game/Food.js`                             |
