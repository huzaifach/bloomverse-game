/* BLOOMVERSE V2 — boot, data loading, offline gains, day/night, main tick. */
const App = {
  saveTimer: 0,

  async boot(){
    try {
      const [families, orders, rooms, achievements, shop, daily, expansions, milestones, pip, giggles] = await Promise.all([
        fetch('data/families.json?v=10').then(r => r.json()),
        fetch('data/orders.json?v=10').then(r => r.json()),
        fetch('data/rooms.json?v=10').then(r => r.json()),
        fetch('data/achievements.json?v=10').then(r => r.json()),
        fetch('data/shop.json?v=10').then(r => r.json()),
        fetch('data/daily.json?v=10').then(r => r.json()),
        fetch('data/expansions.json?v=10').then(r => r.json()),
        fetch('data/milestones.json?v=10').then(r => r.json()),
        fetch('data/pip.json?v=10').then(r => r.json()),
        fetch('data/giggles.json?v=10').then(r => r.json())
      ]);
      S.data = {
        families: families.families,
        orders: orders,
        rooms: rooms.rooms,
        achievements: { items: achievements.achievements },
        shop: { items: shop.items },
        daily: daily,
        expansions: expansions,
        milestones: milestones.milestones,
        pip: pip,
        giggles: giggles
      };
    } catch(e){
      document.body.innerHTML = '<div style="padding:40px;text-align:center;font-family:sans-serif">' +
        '<h2>🌱 Bloomverse could not load its data files.</h2>' +
        '<p>Please serve this folder over HTTP (e.g. <code>npx serve</code>) or open the hosted link.</p></div>';
      return;
    }

    S.save = Save.load();
    for (const f of S.data.families){
      if (!Array.isArray(S.save.codex[f.id])) S.save.codex[f.id] = new Array(8).fill(false);
    }
    // V2 rich start for brand-new gardens
    if (!S.save.createdAt || (Date.now() - S.save.createdAt) < 5000 && S.save.stats.merges === 0 && S.save.stats.sprouts === 0){
      this.richStart();
    }

    const unlockOnce = () => {
      Audio.unlock();
      Audio.setEnabled(S.save.settings.sound, S.save.settings.music);
      if (S.save.settings.music) Audio.startMusic();
    };
    window.addEventListener('pointerdown', unlockOnce, { once: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) Save.write(S.save);
      else Audio.unlock();
    });
    window.addEventListener('beforeunload', () => { S.save.lastSeen = Date.now(); Save.write(S.save); });

    document.body.classList.toggle('reduced-motion', S.save.settings.reducedMotion);
    FX.init();
    FX.setReduced(S.save.settings.reducedMotion);

    UI.init();
    Pip.init();
    Board.init();
    Solarium.init();
    Orders.init();
    Events.init();
    Rooms.render();
    Shop.render();
    Achievements.render();
    Prestige.render();
    UI.refreshHUD();
    UI.refreshSoundIcon();
    UI.updateBadges();
    // V4: Moonlit Grove auto-unlocks at Garden Level 15
    if (S.gardenLevel() >= 15 && S.save.gardens[1].locked){
      S.unlockGrove();
      setTimeout(() => {
        UI.banner('🌙 The Moonlit Grove is open!<br><span style="font-size:15px">A second garden under the stars!</span>');
        Pip.say('A whole new garden! Tap the moon tab to visit it!', 'cheer', 5000);
      }, 6000);
      Milestones.check();
    }

    document.getElementById('btn-daily').addEventListener('click', () => Daily.openManual());
    document.getElementById('btn-share').addEventListener('click', () => Share.share());
    document.getElementById('btn-stats').addEventListener('click', () => Haven.stats());
    document.getElementById('btn-settings').addEventListener('click', () => Settings.open());

    // milestone hooks
    ['bv:merge', 'bv:sprout', 'bv:order', 'bv:solarium', 'bv:hybrid', 'bv:expand'].forEach(ev =>
      document.addEventListener(ev, () => Milestones.check()));

    const isQA = location.search.includes('scenario=qa');
    if (isQA){
      S.save.tutorialDone = true;
      S.save.daily.lastClaim = Daily.dayStr();
    }
    const hadOffline = this.offlineGains();
    if (!isQA) UI.whenModalFree(() => Daily.check());
    Tutorial.start();
    if (!S.save.tutorialDone && !hadOffline){
      setTimeout(() => Pip.say(Pip.line('greeting'), 'wave', 4500), 1200);
    }
    if (isQA) this.seedQAScenario();

    setInterval(() => this.tick(), 1000);
    this.dayNight(true);
    Save.write(S.save);
  },

  /* Brand-new garden: pre-planted pairs so the first merge lands in seconds. */
  richStart(){
    const b = S.G().board;
    b[0] = { f: 'forest-herbs', t: 1, hap: 30 };
    b[1] = { f: 'forest-herbs', t: 1, hap: 30 };
    b[4] = { f: 'crystal-succulents', t: 1, hap: 30 };
    b[5] = { f: 'crystal-succulents', t: 1, hap: 30 };
    b[8] = { f: 'forest-herbs', t: 2, hap: 40 };
    S.discover('forest-herbs', 1);
    S.discover('forest-herbs', 2);
    S.discover('crystal-succulents', 1);
  },

  seedQAScenario(){
    const sv = S.save;
    sv.coins = 5000; sv.dewdrops = 3000; sv.renown = 75; sv.seeds = 5;
    sv.gridSize = 4;
    sv.board = new Array(16).fill(null);
    sv.board[0] = { f: 'forest-herbs', t: 1, hap: 50 }; sv.board[1] = { f: 'forest-herbs', t: 1, hap: 50 };
    sv.board[2] = { f: 'forest-herbs', t: 2, hap: 60 }; sv.board[3] = { f: 'forest-herbs', t: 2, hap: 60 };
    sv.board[4] = { f: 'crystal-succulents', t: 3, hap: 70 }; sv.board[5] = { f: 'forest-herbs', t: 4, hap: 90 };
    sv.board[6] = { f: 'exotic-orchids', t: 1, hap: 30 }; sv.board[7] = { f: 'exotic-orchids', t: 1, hap: 30 };
    sv.solarium[0] = { f: 'forest-herbs', t: 5, hap: 85 }; sv.solarium[1] = { f: 'crystal-succulents', t: 6, hap: 50 };
    sv.upgrades = { sprinkler: 2, butterflies: 2, pots: 1 };
    sv.rooms = ['potting-shed', 'fern-conservatory', 'crystal-cave', 'astral-solarium'];
    sv.tutorialDone = true;
    ['forest-herbs', 'crystal-succulents', 'exotic-orchids'].forEach(fid => {
      for (let t = 1; t <= 4; t++) sv.codex[fid][t - 1] = true;
    });
    sv.orders[0] = { uid: 'qa1', visitor: 'QA Sprite',
      items: [{ f: 'forest-herbs', t: 1, n: 2 }],
      rewards: { coins: 150, renown: 3, dewdrops: 20, seeds: 1 },
      vip: false, expiresAt: Date.now() + 3600000 };
    Save.write(sv);
    Board.render(); Board.renderPackets(); Orders.render();
    Solarium.render(); Codex.refresh(); Rooms.render(); Shop.render();
    UI.refreshHUD();
  },

  offlineGains(){
    const now = Date.now();
    const elapsed = Math.max(0, (now - (S.save.lastSeen || now)) / 1000);
    S.save.lastSeen = now;
    if (elapsed < 120) return false;
    const hasPlants = S.save.solarium.some(Boolean) || S.save.hybrids.some(Boolean);
    if (!hasPlants) return false;
    const rate = S.dewPerSecond();
    if (rate <= 0) return false;
    const capped = Math.min(elapsed, 12 * 3600);
    const gain = Math.floor(rate * capped);
    if (gain < 1) return false;
    S.addDew(gain);
    const hrs = (capped / 3600);
    const when = hrs >= 1 ? hrs.toFixed(1) + 'h' : Math.round(capped / 60) + 'm';
    Audio.sfx('fanfare');
    const m = UI.modal(`<h2>Welcome back! 🌱</h2>
      <div class="milestone-art"><img src="assets/plants/pip-cheer.png" alt="Pip"></div>
      <p style="text-align:center;font-weight:700;font-style:italic">“${Pip.line('welcome_back')}”<br>
      <span style="font-style:normal;color:var(--muted);font-size:13px">— Pip</span></p>
      <p style="text-align:center;font-weight:700">While you were away (${when}),<br>your Solarium gathered:</p>
      <div class="reward-big">💧 +${UI.fmt(gain)} Dewdrops</div>
      <button class="btn btn-gold" id="off-ok">Lovely!</button>`, false);
    m.querySelector('#off-ok').onclick = () => UI.closeModal();
    Save.write(S.save);
    return true;
  },

  /* Day/night: soft night tint + fireflies for emotional depth. */
  dayNight(force){
    const h = new Date().getHours();
    const night = h >= 20 || h < 6;
    const el = document.getElementById('daynight');
    if (el) el.style.opacity = night ? '0.38' : '0';
    this.fireflies(night);
  },

  fireflies(on){
    let layer = document.getElementById('firefly-layer');
    if (on && !layer){
      layer = document.createElement('div');
      layer.id = 'firefly-layer';
      document.body.appendChild(layer);
      for (let i = 0; i < 14; i++){
        const f = document.createElement('div');
        f.className = 'firefly';
        f.style.left = (Math.random() * 100) + 'vw';
        f.style.top = (20 + Math.random() * 70) + 'vh';
        f.style.animationDelay = (Math.random() * 5) + 's';
        layer.appendChild(f);
      }
    } else if (!on && layer){
      layer.remove();
    }
  },

  tick(){
    if (!S.save) return;
    const rate = S.dewPerSecond();
    if (rate > 0){
      S.save.dewdrops = Math.round((S.save.dewdrops + rate) * 100) / 100;
      S.save.stats.lifetimeDew = Math.round((S.save.stats.lifetimeDew + rate) * 100) / 100;
    }
    // V4: plants earn coins idly too
    const crate = S.coinPerSecond();
    if (crate > 0){
      S.save.coins = Math.round((S.save.coins + crate) * 100) / 100;
      S.save.stats.lifetimeCoins = Math.round((S.save.stats.lifetimeCoins + crate) * 100) / 100;
    }
    S.save.stats.playtimeSec++;
    Solarium.tick();
    Orders.tick();
    Events.tick();
    Board.renderPackets();
    const dewEl = document.getElementById('pill-dew');
    if (dewEl) dewEl.innerHTML = UI.ICONS.dew + '<span>' + UI.fmt(S.save.dewdrops) + '</span>';
    // burst button + badges refresh (every ~5s)
    if (S.save.stats.playtimeSec % 5 === 0){ Board.renderTopBar(); UI.updateBadges(); }
    // day/night check every minute
    if (S.save.stats.playtimeSec % 60 === 0) this.dayNight();
    if (++this.saveTimer >= 15){ this.saveTimer = 0; S.save.lastSeen = Date.now(); Save.write(S.save); }
  }
};

document.addEventListener('DOMContentLoaded', () => App.boot());
