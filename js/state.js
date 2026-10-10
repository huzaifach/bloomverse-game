/* BLOOMVERSE — central state + derived game math. No DOM here except via UI hooks. */
const S = {
  data: null,   // {families, orders, rooms, achievements, shop, daily}
  save: null,   // save object (see save.js defaults)

  /* ---------- data lookups ---------- */
  family(id){ return this.data.families.find(f => f.id === id); },
  tierOf(fid, t){ const f = this.family(fid); return f ? f.tiers[t - 1] : null; },
  artFor(fid, t){ const f = this.family(fid); return `assets/plants/${f.artPrefix}-t${t}.png`; },
  room(id){ return this.data.rooms.find(r => r.id === id); },

  unlockedFamilies(){
    return this.data.families.filter(f => {
      if (f.unlock.type === 'start') return true;
      return this.save.rooms.includes(f.unlock.room);
    });
  },
  isFamilyUnlocked(fid){
    const f = this.family(fid);
    return f.unlock.type === 'start' || this.save.rooms.includes(f.unlock.room);
  },

  /* ---------- gardens (V4: Meadow + Moonlit Grove) ---------- */
  G(){
    const gs = this.save.gardens;
    if (gs && gs[this.save.activeGarden || 0]) return gs[this.save.activeGarden || 0];
    return { board: this.save.board, gridSize: this.save.gridSize }; // fallback: pre-V4 saves, tests
  },
  isGroveUnlocked(){
    const g = this.save.gardens;
    if (g && g[1] && !g[1].locked) return true;
    return this.gardenLevel() >= 15;
  },
  unlockGrove(){
    const g = this.save.gardens;
    if (g && g[1] && g[1].locked){
      g[1].locked = false;
      Save.write(this.save);
      return true;
    }
    return false;
  },
  switchGarden(ix){
    if (ix === 1 && !this.isGroveUnlocked()){
      UI.toast('🌙 The Moonlit Grove unlocks at Garden Level 15.');
      return;
    }
    this.save.activeGarden = ix;
    if (ix === 1) this.unlockGrove();
    Board.selected = -1;
    Board.render(); Board.renderPackets(); Board.renderTopBar();
    UI.refreshHUD();
    Save.write(this.save);
  },

  /* ---------- rooms / effects ---------- */
  hasRoom(id){ return this.save.rooms.includes(id); },
  effect(key, def){
    let v = def;
    for (const rid of this.save.rooms){
      const r = this.room(rid);
      if (r && r.effects && r.effects[key] !== undefined) v = r.effects[key];
    }
    return v;
  },

  solariumSlotCount(){ return 6 + (this.effect('solariumSlotsBonus', 0) || 0); },

  /* V4: plants earn coins idly too — a tiny fraction of their sell value */
  coinPerSecond(){
    let r = 0;
    for (const g of (this.save.gardens || [])){
      for (const p of g.board){
        if (!p || p.weed) continue;
        r += this.sellValueOf(p) * 0.0002;
      }
    }
    return r;
  },
  gridSize(){ return S.G().gridSize || 4; },
  gardenLevel(){ return 1 + Math.floor((S.save.stats.merges || 0) / 20); },
  /* V4: bought seeds plant at (highest discovered tier - 5), never below tier 1 */
  seedTier(){
    return Math.max(1, (this.save.stats.maxTier || 1) - 5);
  },
  /* repeat-buy demand: buying the same family's seed again today costs a little more */
  seedStreakMult(fid){
    const st = this.save.seedStreak || {};
    const today = new Date().toISOString().slice(0, 10);
    if (st.date !== today) return 1;
    const n = (st.counts || {})[fid] || 0;
    return Math.pow(1.04, n);
  },
  bumpSeedStreak(fid){
    const today = new Date().toISOString().slice(0, 10);
    const st = this.save.seedStreak || {};
    if (st.date !== today){ st.date = today; st.counts = {}; }
    st.counts = st.counts || {};
    st.counts[fid] = (st.counts[fid] || 0) + 1;
    this.save.seedStreak = st;
  },
  seedCost(fid, tier){
    const t = tier || this.seedTier();
    const sell = this.tierOf(fid, t).sellCoins;
    const mult = this.effect('seedCostMult', 1) || 1;
    let cost = Math.max(1, Math.round(sell * (1 + 0.09 * (this.gardenLevel() - 1)) * mult));
    cost = Math.ceil(cost * this.seedStreakMult(fid)); // ceil so even tiny demand bumps show
    return cost;
  },
  hapMult(){
    const base = this.effect('happinessGainMult', 1) || 1;
    return base * (typeof Weather !== 'undefined' ? Weather.hapMult() : 1);
  },
  sellValueOf(p){
    if (!p) return 0;
    let v = this.tierOf(p.f, p.t).sellCoins;
    if (p.golden) v *= 3;
    if (p.hap >= 80) v = Math.round(v * 1.25);
    if (S.save.boosts.mergeValueMerges > 0) v *= 2;
    v = Math.round(v * (typeof Prestige !== 'undefined' ? Prestige.coinMult() : 1));
    v = Math.round(v * (typeof Weather !== 'undefined' ? Weather.coinMult() : 1));
    return v;
  },
  /* ---------- economy ---------- */
  dewPerSecond(){
    let rate = 0;
    const spr = 1 + 0.20 * this.save.upgrades.sprinkler;
    const pots = 1 + 0.25 * this.save.upgrades.pots;
    const allM = this.effect('allDewMult', 1) || 1;
    const sucM = this.effect('succulentDewMult', 1) || 1;
    for (const p of this.save.solarium){
      if (!p) continue;
      const t = this.tierOf(p.f, p.t);
      let r = t.dewPerSec * spr * pots * allM;
      if (p.golden) r *= 2;
      if (p.hap >= 80) r *= 1.1;
      r *= (typeof Prestige !== 'undefined' ? Prestige.dewMult() : 1);
      r *= (typeof Weather !== 'undefined' ? Weather.dewMult() : 1);
      if (p.f === 'crystal-succulents') r *= sucM;
      rate += r;
    }
    for (const h of this.save.hybrids){
      if (!h) continue;
      rate += h.dewPerSec * allM;
    }
    if (this.save.boosts.dewBoostUntil > Date.now()) rate *= 2;
    return rate;
  },

  /* ---------- currencies (also bump HUD) ---------- */
  addCoins(n){
    this.save.coins = Math.max(0, Math.round((this.save.coins + n) * 100) / 100);
    this.save.stats.lifetimeCoins += Math.max(0, n);
    UI.bumpPill('pill-coins'); UI.refreshHUD();
  },
  addDew(n){
    this.save.dewdrops = Math.max(0, Math.round((this.save.dewdrops + n) * 100) / 100);
    this.save.stats.lifetimeDew += Math.max(0, n);
    UI.bumpPill('pill-dew'); UI.refreshHUD();
  },
  addRenown(n){
    this.save.renown += n;
    this.save.stats.lifetimeRenown += n;
    UI.bumpPill('pill-renown'); UI.refreshHUD();
    Rooms.checkUnlocks();
  },
  addSeeds(n){
    this.save.seeds = Math.max(0, this.save.seeds + n);
    UI.bumpPill('pill-seeds'); UI.refreshHUD();
  },

  /* ---------- board helpers ---------- */
  emptyCell(){ return this.G().board.findIndex(c => !c); },
  boardCount(fid, tier){
    return this.G().board.reduce((n, c) => n + ((c && c.f === fid && c.t === tier) ? 1 : 0), 0);
  },
  boardHas(fid, tier, n){ return this.boardCount(fid, tier) >= n; },

  takePlants(fid, tier, n){
    // removes n matching plants from board (lowest indices first), returns taken count
    let taken = 0;
    const len = this.G().board.length;
    for (let i = 0; i < len && taken < n; i++){
      const c = this.G().board[i];
      if (c && c.f === fid && c.t === tier){ this.G().board[i] = null; taken++; }
    }
    return taken;
  },

  discover(fid, tier){
    const arr = this.save.codex[fid];
    if (arr && !arr[tier - 1]){
      const first = !arr.some(Boolean);
      arr[tier - 1] = true;
      this.save.stats.maxTier = Math.max(this.save.stats.maxTier, tier);
      if (first) UI.toast(`New discovery: ${this.family(fid).name}!`);
      Codex.refresh();
      Achievements.check();
    }
  },

  codexPct(){
    let got = 0, total = 0;
    for (const f of this.data.families){
      for (let i = 0; i < 8; i++){ total++; if (this.save.codex[f.id][i]) got++; }
    }
    return total ? Math.round(got / total * 100) : 0;
  }
};
