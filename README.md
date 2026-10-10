# BLOOMVERSE: The Botanical Haven 🌿

A cozy idle merge game. Restore a magical withered greenhouse by sprouting, merging,
and cross-caring for plants across **4 families × 8 tiers** (32 bespoke storybook plants).

## Play
- **Garden (Potting Table):** 5×5 merge board. Tap seed packets to sprout Tier 1 plants,
  drag identical plants together to evolve them (Tiers 1–8). Sell, fill orders, or move
  elders to the Solarium so the board never jams.
- **Order Board:** magical visitors request plant combos. Deliver for coins, Dewdrops,
  mystery seeds and Renown. VIP orders, streak bonuses, 30-min refresh.
- **Solarium:** Tier 4+ plants earn passive Dewdrops — even while you're away (offline gains).
  Upgrade sprinklers, butterflies (tappable dew bubbles!) and bigger pots.
- **Bloompedia:** discover all 32 plants. Locked families tease what's ahead.
- **Greenhouse Wings:** spend Renown on 4 wings — Fern Conservatory (faster seeds),
  Crystal Cave (succulent power), Astral Solarium (+2 slots, unlocks Astral Flora).
- **Extras:** 12 achievements, 7-day daily rewards, Seed & Sun shop (100% in-game currency,
  no fake purchases), share-your-solarium, tutorial, stats, save export/import,
  synthesized sound + generative music.

## Run locally
Any static server, e.g.:
```
npx serve .
# or
python3 -m http.server 8000
```
then open http://localhost:8000/

## Add new plants (no code changes)
1. Drop 8 transparent 128×128 PNGs in `assets/plants/` named `<prefix>-t1.png … <prefix>-t8.png`
2. Add a family block in `data/families.json` (copy an existing one)
3. Done — packets, codex, orders and shop pick it up automatically.

## Tech
Vanilla JS + DOM (no engine, no build step). WebAudio synth SFX + generative music.
Versioned localStorage save with offline-earnings timestamp.

## Dev tools
- `?scenario=qa` — seeds a rich test state (plants, currencies, rooms, upgrades) for
  UI testing. Dev tool only; not part of gameplay.

Made with 🌿 by Muse for Huzaifa.
