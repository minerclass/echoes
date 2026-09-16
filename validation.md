# Validation

Checked September 15, 2026, in one Chromium-based browser on Windows 11. This records what was actually exercised, how, and what was not.

## Defects found and fixed

**The game could not be finished.** The walkable surface had a one-metre hole at s = 195.00 to 195.95, between the last generated span and the far shore, and a 0.10 m hole at the near shore. The ending only triggers past 198 m, so every crossing fell and reset the player to 171 m. Probing `supported()` along the corridor confirmed both gaps before any change was made. The chasm edges are now derived from the outermost spans rather than written separately, and `session.test.cjs` asserts a continuous surface from shore to shore.

**Trail assist could stop outside the range it was walking toward.** Approach points and interaction radii were separate hand-tuned numbers. At the receiver the approach sat at s = 144.4, the interaction was centred at 146 and required a distance under 3, and assistance stopped 1.6 units out, which left the player outside the radius with the HUD still reading "Following the trail". Each task is now a station whose assisted stop distance is derived from its own interaction radius. Measured margins run from 0.71 m to 1.20 m, and a regression test requires at least 0.30 m for every station.

**The zigzag taught nothing.** A straight walk down x = 0 cleared all seven spans, so the inspection step had no bearing on the crossing. The spans were moved so that no straight line crosses, which a test now asserts.

**The gate could not be operated without holding a key.** It is now turned by a sustained hold or by five separate presses, which reach the same place. Both paths are tested and both were used in play.

## Automated checks

- `node --check` passes on `game.js`, `scenery.js`, and `world-data.js`.
- `node --test session.test.cjs`: 11 tests, all passing. They cover recall order, carried-object matching, decoy spans carrying no weight, interpolated continuity along every leg of the crossing, the shore-to-shore surface, the absence of any straight crossing, both gate paths and the lever winding back, assisted stop distances against interaction radii, approach points staying on walkable ground, and a clean session reset.
- Run with Node 24.11.1.

## Played through, start to finish

**Assisted run.** Completed from the opening dialog to the ending. The three echo stones were walked in order with no misstep, both carvings were lifted and placed, the radio was tuned with the on-screen dial buttons and transmitted, the gate was turned with five presses, the quiet signal was carried to the receiver, the fabricator was started and inspected, and assistance crossed the bridge and triggered the ending. Assistance came to rest inside the interaction range at every station, including the receiver at 144 m where it previously stalled.

**Manual run.** Completed from a fresh start to the ending using movement and action keys only, with no assistance and no state edited. The echo sequence was walked by hand, including backing off before crossing so the middle stone was not clipped. Carvings were carried, the radio dial was turned by holding E for 2.2 s, the gate by one continuous 1.5 s hold. The bridge was crossed span by span with diagonal movement and no falls, and the ending opened at 198 m.

How the keys were driven matters for reading this. The automation available here completes a key press and release inside a single animation frame, so no input is ever held across a frame, and 60 rapid presses of E moved the gate lever not at all. The manual run therefore dispatched `keydown` and `keyup` to the page's own window listeners with real elapsed time between them, which exercises the same handlers, the same `keys` set, and the same movement, collision, stage-gate, and support code that a keyboard drives. What it does not establish is feel: the pacing, camera comfort, and whether the timings suit a human hand are unverified and want a person at the keyboard.

**Ending, reflection, replay.** A 93-character reflection containing w, a, s, d, e, f, q and spaces typed into the field verbatim with no shortcut captured and no movement. "Save reflection" produced a 631-byte text file containing all five stage summaries and the typed reflection. The preview browser writes downloads without applying the `download` filename attribute, so the file landed with a generated name rather than `echoes-reflection.txt`; the filename itself is unverified. "Walk again" reset the stage to 01/05, the progress to 0/3, the trail to 3 m, the reflection field to empty, trail assist to off, the tuner to hidden, and closed every dialog.

## Interface and failure paths

- Frame timing over 300 consecutive frames while walking, with the tower field already in frustum: mean 8.33 ms, median 8.40 ms, 95th percentile 9.40 ms, worst 11.10 ms, about 120 fps. That is one machine and one GPU. No low-end device was measured.
- At 390 × 844 the document width equals the viewport width, so there is no horizontal overflow. The four movement buttons first measured 43 px because flex shrink was pulling them under their stated 44 px minimum; with that corrected every control in the touch pad measures at least 44 × 44.
- Pause opens, puts focus inside the dialog on "Continue walking", and resumes correctly. Reduce motion toggles and the game runs without console errors in both states.
- This browser reports `prefers-reduced-motion: reduce`, so the low-motion path was the default throughout. The animated path was switched on deliberately and also ran clean, but it had less exposure.
- WebGL loss was forced through `WEBGL_lose_context`. The render loop stops, open dialogs close, the alert is what remains on screen, and focus moves to the fallback link. The fallback at `archive-v1/index.html` was opened and loaded without console errors.
- No console errors at any point. The only console output is the upstream Three.js deprecation warning for the non-module build.
- Every asset reference in `index.html` is relative, so the game will resolve from a subdirectory. This was served from a site root; a deployed subpath has not been exercised.

## Not verified

- Play on a physical touch device. Touch buttons were confirmed present and correctly wired at phone width, but no real finger input was tested.
- Screen reader output. The live regions, roles, and labels are in place and were not read with assistive technology.
- Colour contrast was not measured against the rendered 3D background, which changes as the player moves.
- Safari, Firefox, and mobile browsers. One Chromium engine only.
- Audio output, including the speech synthesis line after transmitting.
- Any claim about learning. This is a teaching prototype. It has had no learner testing and measures no outcomes.
