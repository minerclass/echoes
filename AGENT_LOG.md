# Agent Log

Append-only record of automated and agent-assisted changes to this repository.
Newest entry first. No participant data, committee or faculty names, credentials,
or tokens.

---

## 2026-09-15 - Make the game finishable, then make the change visible

**The game could not be completed before this pass.** The walkable surface had a
one-metre hole between the last generated bridge span and the far shore, and the
ending only triggers past 198 m. Every crossing fell and reset the player to 171 m,
which is why no earlier session reached the ending. A 0.10 m hole sat at the near
shore as well. Both were found by probing `supported()` along the corridor rather
than by reading the code.

**The fix was to stop hand-tuning paired numbers.** The chasm edges are now derived
from the outermost spans, and each task is a station that derives its assisted stop
distance from its own interaction radius. That second change also fixes the reported
stall where trail assist rested at 143 m, outside the receiver's interaction range,
with the HUD still reading "Following the trail". Measured margins are 0.71 m to
1.20 m; the test suite requires at least 0.30 m.

**The zigzag was decorative.** A straight walk down x = 0 cleared all seven spans, so
inspecting the bridge had no bearing on crossing it. The spans were moved so no
straight line crosses, which is now asserted.

**The gate no longer requires holding a key.** It is turned by a sustained hold or by
five separate presses. Requiring a continuous hold was an accessibility problem, not
a difficulty worth keeping.

**Scenery now carries the transition instead of announcing it.** One unbroken series
of path-edge markers runs the whole way and changes form with distance, with ragged
offsets so no two transitions line up. Boughs over the trail become cable gantries.
A vertex-coloured sky dome meets the fog at the horizon. A light column stands over
whichever station is the current objective.

**Verified.** 11 tests pass. Both a full assisted playthrough and a full manual
playthrough reached the ending. See `validation.md`, which also states plainly what
was not tested and how the manual run's keys were driven.
