/* BLOOMVERSE — boot, data loading, offline gains, main tick. */
const App = {
  saveTimer: 0,

  async boot(){
    try {
      const [families, orders, rooms, achievements, shop, daily] = await Promise.all([
        fetch('data/families.json').then(r => r.json()),
        fetch('data/orders.json').then(r => r.json()),
        fetch('data/rooms.json').then(r => r.json()),
        fetch('data/achievements.json').then(r => r.json()),
        fetch('data/shop.json').then(r => r.json()),
        fetch('data/daily.json').then(r => r.json())
      ]);
      S.data = { families, orders, rooms, achievements, shop, daily };
    } catch(e){
      document.body.innerHTML = '<div style="padding:40px;text-align:center;font-family:sans-serif">' +
        '<h2>🌱 Bloomverse could not load its data files.</h2>' +
        '<p>Please serve this folder over HTTP (e.g. <code>npx serve</code>) or open the hosted link.</p></div>';
      return;
    }

    S.save = Save.load();
    // ensure codex keys exist for every family
    for (const f of S.data.families){
      if (!Array.isArray(S.save.codex[f.id])) S.save.codex[f.id] = new Array(8).fill(false);
    }

    // audio unlock on first gesture (mobile autoplay policy)
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
    Board.init();
    Solarium.init();
    Orders.init();
    Codex.refresh();
    Rooms.render();
    Shop.render();
    Achievements.render();
    UI.refreshHUD();
    UI.refreshSoundIcon();

    // haven buttons
    document.getElementById('btn-daily').addEventListener('click', () => Daily.openManual());
    document.getElementById('btn-share').addEventListener('click', () => Share.share());
    document.getElementById('btn-stats').addEventListener('click', () => Haven.stats());
    document.getElementById('btn-settings').addEventListener('click', () => Settings.open());

    this.offlineGains();
    UI.whenModalFree(() => Daily.check());
    Tutorial.start();

    // Dev/QA hook (documented in README): ?scenario=qa seeds a rich test state.
    if (location.search.includes('scenario=qa')) this.seedQAScenario();

    setInterval(() => this.tick(), 1000);
    Save.write(S.save);
  },

  /* Seeds a rich state for UI testing. Dev tool only — not part of gameplay. */
  seedQAScenario(){
    const sv = S.save;
    sv.coins = 5000; sv.dewdrops = 3000; sv.renown = 75; sv.seeds = 5;
    sv.board[0] = { f: 'forest-herbs', t: 1 }; sv.board[1] = { f: 'forest-herbs', t: 1 };
    sv.board[2] = { f: 'forest-herbs', t: 2 }; sv.board[3] = { f: 'forest-herbs', t: 2 };
    sv.board[4] = { f: 'crystal-succulents', t: 3 }; sv.board[5] = { f: 'crystal-succulents', t: 4 };
    sv.board[6] = { f: 'exotic-orchids', t: 1 }; sv.board[7] = { f: 'exotic-orchids', t: 1 };
    sv.board[8] = { f: 'forest-herbs', t: 4 };
    sv.solarium[0] = { f: 'forest-herbs', t: 5 }; sv.solarium[1] = { f: 'crystal-succulents', t: 6 };
    sv.upgrades = { sprinkler: 2, butterflies: 2, pots: 1 };
    sv.rooms = ['potting-shed', 'fern-conservatory', 'crystal-cave'];
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
    if (elapsed < 120) return;
    const hasPlants = S.save.solarium.some(Boolean);
    if (!hasPlants) return;
    const rate = S.dewPerSecond();
    if (rate <= 0) return;
    const capped = Math.min(elapsed, 12 * 3600);
    const gain = Math.floor(rate * capped);
    if (gain < 1) return;
    S.addDew(gain);
    const hrs = (capped / 3600);
    const when = hrs >= 1 ? hrs.toFixed(1) + 'h' : Math.round(capped / 60) + 'm';
    Audio.sfx('fanfare');
    const m = UI.modal(`<h2>Welcome back! 🌱</h2>
      <p style="text-align:center;font-weight:700">While you were away (${when}),<br>your Solarium gathered:</p>
      <div class="reward-big">💧 +${UI.fmt(gain)} Dewdrops</div>
      <button class="btn" id="off-ok">Lovely!</button>`, false);
    m.querySelector('#off-ok').onclick = () => UI.closeModal();
    Save.write(S.save);
  },

  tick(){
    if (!S.save) return;
    // economy
    const rate = S.dewPerSecond();
    if (rate > 0){
      S.save.dewdrops = Math.round((S.save.dewdrops + rate) * 100) / 100;
      S.save.stats.lifetimeDew = Math.round((S.save.stats.lifetimeDew + rate) * 100) / 100;
    }
    S.save.stats.playtimeSec++;
    Solarium.tick();
    Orders.tick();
    Board.renderPackets();
    // HUD dew pill updates each second (cheap text update)
    const dewEl = document.getElementById('pill-dew');
    if (dewEl) dewEl.innerHTML = UI.ICONS.dew + '<span>' + UI.fmt(S.save.dewdrops) + '</span>';
    // autosave every 15s
    if (++this.saveTimer >= 15){ this.saveTimer = 0; S.save.lastSeen = Date.now(); Save.write(S.save); }
  }
};

document.addEventListener('DOMContentLoaded', () => App.boot());
