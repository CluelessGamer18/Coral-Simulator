# Bug Fix Summary: `muj-bug-fix-bugaloo`

This document covers every commit from `77605a4 timejump-constant-running-update-fix` up to `c7321f5`. Commits are listed oldest first. Each one has three parts:

- **Bug:** what was wrong
- **Fix:** what changed, in a line or two
- **How to test:** steps to confirm the fix

> Run the app with `npm install` (needed once, since a dependency was removed) and then `npm run dev`. Unless a step says otherwise, start each test from a fresh page load and finish the tutorial.

---

## 1. Game kept running after the simulation ended
**Commit:** `77605a4` (timejump-constant-running-update-fix) · `TestScene.js`, `CoralManager.js`

**Bug:**
- After the end screen appeared ("Your Reef Lived!/Died..."), the game behind it kept running. The fish could still move, the camera could still scroll, and bubbles could still be popped.
- Popping a bubble after the end advanced time again, so the year counter went past 10 and more stress data was added to the end charts.
- Corals could still be clicked to earn +10 score after the game was over.
- When the reef died, new bubbles were still spawned because `updateStress()` spawned them before checking the end conditions.

**Fix:** `update()`, `updateStress()`, `handleBubbleCollect()` and the coral click handler now return early when `simEnd` is true. Bubbles are only respawned after every end condition (reef death or `timeJump >= 10`) has been checked.

**How to test:**
- Play until the end screen appears, either by popping bubbles for 10 years or by setting a value in the danger zone to kill the reef.
- Move the mouse around. The fish and the camera should stay still.
- Click a coral. The score should not change and no "+10" should appear.
- Make sure no bubbles are left on screen, and that the timeline marker does not move past 2036.
- Look at the end-screen charts. They should stop at the final year.

---

## 2. Fish speed depended on the monitor's refresh rate
**Commit:** `69d134b` (refresh-rate-improvements) · `TestScene.js`

**Bug:**
- Fish movement, turning, wiggle and camera scrolling were applied as a fixed amount each frame, with values tuned for 60 fps.
- On a 120 Hz or 144 Hz monitor the fish moved and turned about 2× faster. On a slower machine or a 30 fps display it was sluggish.

**Fix:** All movement is scaled by a `frameScale` value based on how long the frame actually took (`delta`). The value is capped at 50 ms so a lag spike or switching back to the tab doesn't teleport the fish.

**How to test:**
- If possible, play on monitors with different refresh rates (60 Hz and 120/144 Hz), or change the display refresh rate in OS settings. The fish should cross the screen in about the same time on each.
- Alternatively, open DevTools, go to Performance, set CPU throttling to 4×–6×, and play. The fish should still cover the same distance per second (it may look choppier).
- Switch to another tab for a few seconds, then come back. The fish should not jump across the screen.

---

## 3. Physics colliders piled up every year, plus a crash on the Canvas renderer
**Commit:** `a81e275` (collider pile up fix) · `TestScene.js`

**Bug:**
- Each time bubbles respawned, `physics.add.overlap(...)` registered new fish-vs-bubble colliders, but the old ones were never removed. They piled up every year, and the physics world kept checking destroyed bubbles every frame.
- `preFX` only exists under WebGL. On the Canvas fallback renderer it is `null`, so `this.guide.preFX.addShadow(...)` and the temp event bubble's colour inversion crashed the scene.

**Fix:** Colliders are now stored in `this.bubbleColliders`, and a new `destroyBubbles()` method destroys them along with the bubbles. `preFX` calls now use optional chaining (`preFX?.`).

**How to test:**
- Play through several years. In the console, run `gameScene.physics.world.colliders.length`. The number should stay the same each year instead of going up.
- To test Canvas, temporarily set `type: Phaser.CANVAS` in the game config (or disable WebGL in the browser). The game should load without errors. The fish will have no shadow and the event bubble will not be inverted.

---

## 4. Fish speed and camera speed were mismatched
**Commit:** `3cf73b4` (change speed to 6.75) · `TestScene.js`

**Bug:** The fish and the camera edge-scroll speed were both 6. After tuning, the fish was raised to 6.75, so the camera needed to match or the fish would outrun it at the screen edges.

**Fix:** Fish speed and `edgeScrollSpeed` are both set to `6.75`, with a comment to keep them equal.

**How to test:**
- Swim to the right edge of the screen and hold there. The camera should scroll at the same pace as the fish, and the fish should not slide off-screen or lag behind.
- Repeat on the left edge.

---

## 5. Two router packages were installed
**Commit:** `1007827` (redundant-dependency-fix) · `package.json`, `About.jsx`, `App.jsx`, `TitleScreen.jsx`, `main.jsx`

**Bug:** Both `react-router` and `react-router-dom` were installed. In v7, `react-router-dom` is only a re-export of `react-router`, so this added an unneeded dependency with a risk of version mismatch.

**Fix:** Removed `react-router-dom`. All imports now come from `react-router`.

**How to test:**
- Run `npm install`, then `npm run dev`.
- From the title screen, open the About page, click Back, then start the game. All navigation should work.
- Run `npm ls react-router-dom`. It should report nothing.

---

## 6. Corals stayed enlarged after hovering
**Commit:** `c4242d5` (coral-leaves no longer being enlarged) · `CoralManager.js`

**Bug:**
- Hovering a coral starts a pulse tween that scales it to 1.05. When the mouse left, the tween was stopped but the scale was not reset, so the coral stayed at whatever size it had reached.
- Hovering quickly in and out started a new pulse each time without stopping the old one, so several pulses could run on the same coral.

**Fix:** Any existing pulse is stopped before a new one starts. On `pointerout` the coral's tint is cleared and its scale is reset to 1.

**How to test:**
- Move the mouse quickly in and out over a coral many times.
- When the mouse leaves, the coral should go back to its normal size and colour. No coral should stay slightly bigger or orange-tinted.

---

## 7. Stress chart leaked Chart.js instances
**Commit:** `dc5ad29` (chartjs-better clean up function) · `StressChart.jsx`

**Bug:**
- The chart was only destroyed at the start of the next rebuild. Nothing cleaned it up when the component unmounted, such as when switching charts or restarting, so Chart.js kept hold of the canvas and its listeners.
- `yRange` was passed as a new `[min, max]` array on every render, so the effect rebuilt the chart on every parent re-render.

**Fix:** The `useEffect` now returns a cleanup function that destroys the chart. The dependencies use the `yMin`/`yMax` numbers instead of the array.

**How to test:**
- Reach the end screen. Switch between Stress, Temperature, Light and Pollution several times, then click Restart Sim and finish another run.
- The charts should render correctly every time, with no "Canvas is already in use" errors in the console.
- Optionally, take a DevTools Memory heap snapshot before and after. The number of `Chart` instances should not keep going up.

---

## 8. `scene-ready` was sent before the scene was ready
**Commit:** `a5e5600` (delete early emit) · `TestScene.js`

**Bug:** `scene-ready` was emitted twice: once at the start of `setupWorld()`, before anything was built, and again at the end of `create()`. React could receive the scene before its values and objects existed.

**Fix:** Removed the early emit, so React is only told about the scene once setup has finished.

**How to test:**
- Reload the game a few times and start it. The UI (dial, timeline, values, settings button) should load with correct starting values, and the console should show no `undefined` errors.

---

## 9. Background music was duplicated on every restart
**Commit:** `21fbfc1` (calling destroy on music objects) · `TestScene.js`

**Bug:** The sound manager belongs to the whole game, not to the scene. `RestartSim()` only stopped the music, so each restart left another sound object behind.

**Fix:** A `SHUTDOWN` listener in `setupAudio()` destroys the background music whenever the scene restarts or stops.

**How to test:**
- Finish a run and click Restart Sim. Do this 3–4 times.
- Only one copy of the music should play, with no overlap or getting louder.
- In the console, run `gameScene.sound.sounds.length` after each restart. The number should not grow.

---

## 10. TestScene refactor (repeated code removed)
**Commit:** `6f8ee36` (big test scene changes) · `TestScene.js`, `SimEndPopUp.jsx`

**Bug:**
- There were four almost identical code blocks for spawning bubbles, an if/else chain for collecting bubbles, and three copies of the temperature/light/pollution threshold logic.
- Because the code was repeated, fixes had to be made in several places and were easy to miss. `returnBubble()` also did not handle the temp event bubble.
- `SimEndPopUp` used loose `==` comparisons.

**Fix:** Bubbles are now spawned from a `BUBBLE_TYPES` table and stored in `this.bubbles[type]`. A single `evaluateThreshold()` function checks the values against a `THRESHOLDS` table. `==` was changed to `===`.

**How to test:** Run a full regression of the bubble and stress behaviour:
- Pop each bubble type (temperature, light, pollution and the inverted temp event). Each should pop with a sound and show the correct popup or notice.
- Cancel a popup. The bubble should come back somewhere else.
- Set safe values (temp 27–29, light 200–1100, pollution 1–3). Stress should stay low.
- Set stressed values (for example temp 26 or 30). The stress dial should go up.
- Set a deadly value (for example temp 24 or less, or 31 or more). The reef should die and the end screen should say "Died...".
- Check that all four end-screen charts still work.

---

## 11. React copied scene values 60 times a second
**Commit:** `05e436a` (animation polling improvements) · `App.jsx`, `TestScene.js`, `CoralManager.js`

**Bug:** `App.jsx` ran a `requestAnimationFrame` loop that copied 8 values from the scene into React state every frame, even when nothing had changed. This caused constant re-renders and wasted CPU.

**Fix:** The scene now emits a `stats-changed` event (`emitStats()`) only when a value actually changes: popping a bubble, applying a value, scoring, freeing the fish, or a restart. React listens for this event instead of polling.

**How to test:**
- Install React DevTools, open the Profiler, turn on "Highlight updates", and play. The UI should only re-render when you pop a bubble, apply or cancel a value, or click a coral, not constantly.
- Check that the values (temp, light, pollution), the stress dial, the timeline marker and the score all still update correctly.
- Restart the sim. All values should reset straight away.

---

## 12. Asset paths broke under a base path or nested route
**Commit:** `a7e75b9` (fix inconsistent asset paths) · many components, `Preloader.js`, new `assetUrl.js`

**Bug:** Asset paths were a mix of `/x.png`, `./x.png` and `x.png`. Paths starting with `/` break when the app is deployed under a sub-path (for example GitHub Pages at `/Coral-Simulator/`), and relative ones break on nested routes such as `/about`.

**Fix:** A new `asset()` helper builds every URL from Vite's `import.meta.env.BASE_URL`. The Phaser preloader uses `load.setPath(BASE_URL + 'assets/')`.

**How to test:**
- In normal dev mode, every image should load: title screen, About page, tutorial images, info display icons, tooltips, bubble popup graphs, coral microscope images and the end-screen arrow.
- To test a sub-path, set `base: '/Coral-Simulator/'` in `vite.config.js` and run `npm run build && npm run preview`. Then check the same screens. The Network tab should show no 404s.
- Open `/about` directly in the address bar. The background image should load.

---

## 13. Missing or meaningless alt text
**Commit:** `fa6880b` (updated alt text) · `App.jsx`, popups, `SimInfoDisplay.jsx`, `SimTutorial.jsx`, `OptionsDialog.jsx`

**Bug:** Many images had no `alt` attribute, or a placeholder like `"Description of the image"`. Icon-only buttons (settings, close "X", minimize "-", expand arrow) had no accessible name, so screen readers read them as "button" or read out the file name.

**Fix:** Images that carry meaning got descriptive alt text (graphs, dial, tooltips, tutorial images, microscope view). Decorative icons got `alt=""`. Icon-only buttons got `aria-label`s.

**How to test:**
- Turn on a screen reader (NVDA, VoiceOver or Orca) and tab through the game UI. The buttons should be read as "Open settings", "Close options", "Minimize results" and "Show results".
- Alternatively, run a Lighthouse Accessibility audit in Chrome DevTools. There should be no "Image elements do not have [alt] attributes" or "Buttons do not have an accessible name" warnings.

---

## 14. Lint errors, and a temp event that froze the fish
**Commit:** `cd79986` (fixing linting errors and warnings) · `App.jsx`, `SimBubblePopUp.jsx`, `TestGame.jsx`, `TestScene.js`, `RangeSlider.jsx`, new `useDialogKeyboard.js`

**Bug:**
- ESLint reported unused variables (`handler`, `bubbleCancelled`, `middle`, `maxSpeed`) and missing hook dependencies.
- Applying or cancelling a bubble went through a chain of React state changes (`setCollision`, `setCancelled`) and a `useEffect` on `bubbleCollision`. The effect was missing dependencies, so it could read stale values.
- The temp event bubble was handled in a React effect that set the collision flag and then cleared it. This briefly froze the fish.
- `TestGame` included `onSceneReady` in its effect, which could destroy and recreate the whole Phaser game.

**Fix:** The bubble popup now calls `onApply(value)` or `onCancel()` directly, and these call into the scene. The temp event is handled inside the scene, which emits a `temp-event` event for React to show the notice, so the fish keeps moving. `TestGame` stores `onSceneReady` in a ref. A `useDialogKeyboard` hook (Escape to close, focus handling) was added for later use.

**How to test:**
- Run `npm run lint`. There should be no errors.
- Pop a temperature bubble, set a value and click Apply. The value should update and the fish should be free to move.
- Pop a bubble and click Cancel. The value should not change, the fish should be free, and the bubble should come back somewhere else.
- Pop the inverted temp event bubble. The temperature should go up by 2 °C (capped at 35), the "Temperature Event" notice should appear, and the fish should keep moving without freezing.

---

## 15. UI showed stale data from the scene
**Commit:** `98dcedf` (render logic reading mutable scenes directly) · `App.jsx`, `TestScene.js`

**Bug:**
- During render, `App.jsx` read values directly from the scene object: `scene.collisionType`, `scene.stressHistory`, `scene.reefDead*`. React doesn't know when these change, so the popup type, the end-screen charts and the "Lived/Died" title could be out of date.
- The history arrays were also changed in place, so React could not tell they had changed.
- The tutorial effect had no dependency array, so it ran after every render.

**Fix:** `getStats()` now also sends `collisionType`, `reefDead` and copies of the history arrays. React stores these in state and renders from that state. The tutorial effect now has dependencies.

**How to test:**
- Pop different bubble types one after another. Each popup should show the correct title, icon and graph for the bubble that was popped.
- Play to the end. The charts should include every year, including the last one.
- Kill the reef with a deadly value. The title should say "Died...". In a run that survives to 2036, it should say "Lived!".
- Click Restart Sim, then finish another run. The charts should only show data from the new run.

---

## 16. Game kept running behind the Options menu
**Commit:** `726e5d3` (game actually pauses when the options menu was open) · `App.jsx`

**Bug:**
- Opening the Options dialog did not pause the game. The fish followed the mouse, the camera scrolled, bubbles could be popped and corals could be clicked behind the dialog.
- Phaser also blocked the arrow keys and Space, so the dialog's sliders could not be used from the keyboard.

**Fix:** While the dialog is open, a `useEffect` pauses the scene and turns off Phaser's global keyboard capture. On close it turns capture back on and resumes the scene, but only if the scene is still paused, so "Return to Title" doesn't fail.

**How to test:**
- Start the game and open Options using the gear button.
- Move the mouse around. The fish, bubble idle animations and camera should all be frozen.
- Click where a coral or bubble is behind the dialog. Nothing should happen.
- Tab to a volume slider and use the arrow keys. It should change value.
- Close the dialog. The game should continue from where it was.
- Open Options again and click "Return to Title". There should be no console errors.

---

## 17. Invisible sidebars blocked clicks near the screen edges
**Commit:** `c7321f5` (removing the translucent sidebars) · `TestScene.js`

**Bug:** Two 100 px wide, almost invisible (`alpha 0.05`) interactive rectangles sat on the left and right edges of the screen. They were left over from the old hover-to-scroll camera, which is disabled. They took pointer input, so corals under them could not be clicked or hovered.

**Fix:** Removed `rectLeft`, `rectRight` and the unused `moveCameraLeft` and `moveCameraRight` flags.

**How to test:**
- Scroll so a coral is right at the left or right edge of the screen.
- Hover it. It should glow and pulse.
- Click it. The info popup should open and the score should go up by 10.
- Look closely at the edges. There should be no faint white bands.

---

## Quick regression checklist
- [ ] `npm install && npm run lint && npm run build` succeeds
- [ ] A full 10-year run ends with "Lived!", the game is fully frozen, and the charts are correct
- [ ] A deadly value ends with "Died...", the game is frozen, and no bubbles are left
- [ ] Restart Sim 3+ times: one music track, values reset, charts only show the new run
- [ ] Options menu pauses the game, and its sliders work with the keyboard
- [ ] Temp event raises the temperature by 2 °C without freezing the fish
- [ ] Corals at the screen edges can be hovered and clicked, and don't stay enlarged
- [ ] The fish moves at the same speed at 60 Hz and 120/144 Hz
