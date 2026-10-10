/* BLOOMVERSE V2 — versioned localStorage save. Atomic writes + backup + migrations. */
const Save = {
  KEY: 'bloomverse.save.v2',
  BACKUP_KEY: 'bloomverse.save.v2.bak',
  VERSION: 2,

  defaults(){
    return {
      version: this.VERSION,
      gridSize: 4,
      board: new Array(16).fill(null),
      solarium: new Array(8).fill(null),
      hybrids: [null, null],
      coins: 150, dewdrops: 0, renown: 0, seeds: 2,
      upgrades: { sprinkler: 0, butterflies: 0, pots: 0 },
      rooms: ['potting-shed'],
      codex: {},
      orders: [],
      orderStreak: 0, bestStreak: 0,
      boosts: { dewBoostUntil: 0, mergeValueMerges: 0, rainbowMerges: 0 },
      bloomBurstAt: 0,
      milestones: [],
      milestonesReady: [],
      medals: 0, prestiges: 0,
      challenge: {},
      achievements: [],
      daily: { lastClaim: '', streak: 0 },
      share: { lastShare: '' },
      stats: { merges: 0, orders: 0, sprouts: 0, solariumMoves: 0, maxTier: 0,
               lifetimeCoins: 0, lifetimeDew: 0, lifetimeRenown: 0, playtimeSec: 0,
               bursts: 0, grandOrders: 0, challenges: 0, goldenMerges: 0 },
      tutorialDone: false,
      notifiedRooms: [],
      settings: { sound: true, music: true, reducedMotion: false },
      lastSeen: Date.now(),
      createdAt: Date.now()
    };
  },

  load(){
    const d = this.defaults();
    let raw = null;
    try { raw = localStorage.getItem(this.KEY); } catch(e){}
    if (!raw) return d;
    try {
      const s = JSON.parse(raw);
      const migrated = this.migrate(s);
      return this.mergeDefaults(d, migrated);
    } catch(e){
      try {
        const bak = localStorage.getItem(this.BACKUP_KEY);
        if (bak) return this.mergeDefaults(d, this.migrate(JSON.parse(bak)));
      } catch(e2){}
      return d;
    }
  },

  migrate(s){
    if (!s.version || s.version < 2){ s.version = 2; } // v1 saves are not carried over (full V2 reset)
    return s;
  },

  mergeDefaults(d, s){
    const out = Object.assign({}, d, s);
    out.upgrades = Object.assign({}, d.upgrades, s.upgrades || {});
    out.boosts = Object.assign({}, d.boosts, s.boosts || {});
    out.daily = Object.assign({}, d.daily, s.daily || {});
    out.share = Object.assign({}, d.share, s.share || {});
    out.stats = Object.assign({}, d.stats, s.stats || {});
    out.settings = Object.assign({}, d.settings, s.settings || {});
    const n = (out.gridSize >= 4 && out.gridSize <= 8) ? out.gridSize : 4;
    out.gridSize = n;
    if (!Array.isArray(out.board) || out.board.length !== n * n) out.board = new Array(n * n).fill(null);
    if (!Array.isArray(out.solarium) || out.solarium.length !== 8) out.solarium = d.solarium;
    if (!Array.isArray(out.hybrids) || out.hybrids.length !== 2) out.hybrids = d.hybrids;
    if (!Array.isArray(out.rooms)) out.rooms = d.rooms;
    if (!Array.isArray(out.orders)) out.orders = [];
    if (!Array.isArray(out.achievements)) out.achievements = [];
    if (!Array.isArray(out.milestones)) out.milestones = [];
    if (typeof out.codex !== 'object' || !out.codex) out.codex = {};
    return out;
  },

  write(save){
    try {
      const json = JSON.stringify(save);
      const prev = localStorage.getItem(this.KEY);
      if (prev) { try { localStorage.setItem(this.BACKUP_KEY, prev); } catch(e){} }
      localStorage.setItem(this.KEY + '.tmp', json);
      const verify = localStorage.getItem(this.KEY + '.tmp');
      if (verify === json) localStorage.setItem(this.KEY, json);
      try { localStorage.removeItem(this.KEY + '.tmp'); } catch(e){}
    } catch(e){}
  },

  wipe(){
    try {
      localStorage.removeItem(this.KEY);
      localStorage.removeItem(this.BACKUP_KEY);
      localStorage.removeItem(this.KEY + '.tmp');
    } catch(e){}
  },

  exportString(save){ return btoa(unescape(encodeURIComponent(JSON.stringify(save)))); },
  importString(str){
    const s = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
    if (!s || typeof s !== 'object' || !Array.isArray(s.board)) throw new Error('bad save');
    return this.mergeDefaults(this.defaults(), this.migrate(s));
  }
};
