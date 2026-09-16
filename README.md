# Echoes: From forest to signal

A short 3D first-person walk through five media environments. The player starts in a grove and ends in a cyber landscape, crossing one continuous piece of ground. Walter Ong's primary orality, literacy, and secondary orality lead into two environments proposed by Micah Miner: algorithmic secondary orality and tertiary algorithmicity.

The walk takes roughly five to eight minutes. There is no timer, no score, and no way to lose. This is a teaching prototype for review, not a finished course object.

## Play

Open `index.html` in a current desktop browser. Everything runs locally. No build step, account, install, or network service is involved, and nothing is downloaded at runtime.

To serve it locally instead:

```bash
node serve.cjs
```

Then open <http://127.0.0.1:4178>. The server binds to loopback only and serves this folder.

### Controls

| Input | Action |
| --- | --- |
| W A S D | Move |
| Drag, or Mouse look from the pause screen | Look |
| Space | Jump |
| E | Handle the object in front of you. Some things are turned by holding or by pressing repeatedly |
| Q / E | Turn the radio dial while you are at the console |
| F, or click | Pulse. At the radio it transmits; at the generated bridge it inspects |
| Esc | Pause |

On-screen buttons cover the same actions for touch and pointer use. Trail assist walks toward the next task while leaving the objects and decisions to the player, and any movement key takes control back immediately.

## The five environments

Each one asks for a different kind of physical work rather than a different button.

1. **Primary orality.** Listen to a three-part rhythm and walk it back through space as circle, triangle, diamond. Step out of order and the sequence restarts. The pattern can be replayed as often as you like, but it only counts when you carry it with your body.
2. **Literacy.** Lift a carved shape, carry it across the garden, and set it on the plinth that matches. A mark that stays put can be revisited and compared, which is the whole point of the place.
3. **Secondary orality.** Stand at a console and turn a dial until two visible waveforms line up, then transmit. Lamps in the distant houses answer in the order the wave reaches them.
4. **Algorithmic secondary orality.** Turn a circulation gate, which takes a sustained hold or several presses rather than one click. The stream spreads as the lever sweeps. A quiet human contribution that the old routing buried can then be carried to the receiver.
5. **Tertiary algorithmicity.** Start a fabricator, which produces a convincing bridge over a gap. Pulse to reveal which spans have foundations and which do not, then cross the supported ones. Unsupported spans drop you onto the near shore with the inspection still available.

The landscape carries the change rather than announcing it. Cairns beside the path become carved posts, posts become masts, masts become light. Boughs leaning over the trail become the gantries that carry cable across it. Trees keep growing among the towers all the way to the end. The transitions are ragged on purpose so no two of them line up.

## Conceptual grounding

**Established.** Ong distinguished primary orality, literacy, and secondary orality, and treated the orality of electronic media as something that depends on writing and print rather than replacing them. See Walter J. Ong, *Orality and Literacy: The Technologizing of the Word* (Methuen, 1982), and Walter J. Ong, "Orality-Literacy Studies and the Unity of the Human Race," [*Oral Tradition* 2, no. 1 (1987)](https://journal.oraltradition.org/wp-content/uploads/files/articles/2i/24_ong.pdf). That link was checked against the journal's own issue index and the file's metadata and resolves to the published article. Go to the source for Ong's argument rather than relying on this game's compression of it.

**Proposed by Micah Miner.** Algorithmic secondary orality, tertiary algorithmicity, and pedagogical friction are Miner's contributions and are presented here as proposals, not as established terms in the field.

The distinction the last two environments turn on is what becomes algorithmic. In algorithmic secondary orality the contributions are still human and the system decides whose contribution circulates. In tertiary algorithmicity the system produces the symbolic content as well as ranking it. The fourth and fifth tasks are built to make that difference something you handle rather than something you read.

Pedagogical friction is the productive resistance that learning requires. Its noetic, rhetorical, and existential dimensions are learner-facing and analytically separable but entangled in practice. Infrastructural friction is the conditioning base beneath them, not a fourth dimension alongside them. In this game the final task keeps inspection and judgment with the player, while the access supports stay available the whole way. Awkward controls, hidden interaction ranges, and unreadable cues are usability defects, not productive friction, and they are treated here as bugs.

## What this does not claim

- These are overlapping environments that coexist, not a ladder of cultures, intelligence, or progress. The walk from forest to signal is a teaching metaphor.
- The first task illustrates one narrow mnemonic mechanism. It is not a reconstruction of an oral culture.
- The bridge is hand-authored. Nothing in this game calls a model service, and the fabricator is a scripted teaching example rather than live generation.
- Finishing the walk demonstrates nothing about durable learning. The game does not measure learning outcomes, does not evidence any dissertation claim, and reports no participant findings.
- No participant, student, or staff data is used, collected, or transmitted. The closing reflection stays in the page unless the player saves it to their own machine.

## Accessibility

Trail assist handles navigation for players who do not want to drive a first-person camera, and using it carries no penalty. The circulation gate accepts repeated presses as well as a sustained hold, so it does not require holding a key down. Every sound cue has a visible equivalent, and sound is off by default. A reduce-motion setting is in the pause screen and follows the system preference at startup. Shapes distinguish the interactive objects, so colour is never the only signal. Touch and pointer buttons mirror the keyboard actions.

`validation.md` records what was tested, how, and what remains unverified.

## Implementation

Static HTML, CSS, and JavaScript. No build step and no framework.

| File | Responsibility |
| --- | --- |
| `index.html` | Canvas, HUD, radio panel, dialogs, reflection field |
| `styles.css` | Layout, stage accents, responsive and reduced-motion rules |
| `game.js` | Movement, assistance, interactions, sound, stage progression, UI |
| `scenery.js` | Procedural geometry, palette ramp, lighting, animation |
| `world-data.js` | Stage text, station geometry, bridge support, task state |
| `session.test.cjs` | Regression tests for the task state and the walkable geometry |
| `serve.cjs` | Loopback preview server with an explicit file allowlist |
| `vendor/` | Three.js runtime and its MIT license |
| `archive-v1/` | Earlier 2D version, used as the fallback when WebGL is unavailable |

Geometry comes from one place. Each task is a station that carries its own position, interaction radius, and the distance at which assisted walking should stop, and the stop distance is derived from the radius. The chasm edges are derived from the outermost bridge spans. Both arrangements exist so that a hand-edited number cannot leave assistance resting outside the range it was walking toward, or leave a hole between the bridge and the shore. `session.test.cjs` asserts both.

`vendor/three.min.js` is Three.js 0.160.1, vendored locally with its license in `vendor/three-license.txt`. It emits an upstream deprecation warning for the non-module build. The scene loads and renders; moving to an ES module build is a possible future cleanup and would mean updating the imports, the server allowlist, and these instructions together.

### Checks

```bash
node --check game.js
node --check scenery.js
node --check world-data.js
node --test session.test.cjs
```

All asset references are relative, so the game works from a subdirectory as well as from a site root.

## License and attribution

Three.js is included under the MIT License; see `vendor/three-license.txt`. The game code, text, and procedural scenery are Micah Miner's.
