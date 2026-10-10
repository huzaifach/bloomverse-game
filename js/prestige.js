/* BLOOMVERSE V3 — Rebirth prestige: trade a finished garden for permanent Sun Medals. */
const Prestige = {
  coinMult(){ return 1 + 0.08 * (S.save.medals || 0); },
  dewMult(){ return 1 + 0.08 * (S.save.medals || 0); },

  canRebirth(){ return (S.save.stats.maxTier || 0) >= 8; },

  tier8Count(){
    let n = 0;
    for (const f of S.data.families) if (S.save.codex[f.id] && S.save.codex[f.id][7]) n++;
    return n;
  },

  previewMedals(){
    return Math.max(1, Math.floor((S.save.stats.merges || 0) / 150) + this.tier8Count() * 2);
  },

  render(){
    let sec = document.getElementById('prestige-section');
    if (!sec){
      sec = document.createElement('div');
      sec.id = 'prestige-section';
      const haven = document.getElementById('screen-haven');
      haven.insertBefore(sec, haven.firstChild);
    }
    const medals = S.save.medals || 0;
    sec.innerHTML = `<h2 class="section-title">☀️ Rebirth</h2>
      <div class="card">
        <div style="font-weight:800">Sun Medals: ${medals} ☀️</div>
        <div class="u-desc">Each medal: +8% coin earnings, +8% Dewdrops, forever.</div>
        ${this.canRebirth() ? `<div class="u-desc" style="margin-top:6px">Rebirth now → <b>+${this.previewMedals()} medals</b>.
          Resets garden, coins, seeds, upgrades & solarium. Keeps rooms, milestones, medals.</div>
          <button class="btn btn-gold" id="btn-rebirth" style="margin-top:8px">🌅 Rebirth</button>`
        : `<div class="u-desc" style="margin-top:6px">Grow a Tier 8 plant to unlock Rebirth.</div>`}
      </div>`;
    const b = document.getElementById('btn-rebirth');
    if (b) b.onclick = () => this.confirm();
  },

  async confirm(){
    const n = this.previewMedals();
    const ok = await UI.confirm('🌅 Rebirth?',
      `Begin a new garden cycle and gain <b>+${n} Sun Medals</b>?<br>Your garden, coins, seeds, upgrades and solarium will reset. Rooms, milestones and medals stay.`,
      'Rebirth!');
    if (ok) this.doRebirth(n);
  },

  doRebirth(n){
    const sv = S.save;
    sv.medals = (sv.medals || 0) + n;
    sv.prestiges = (sv.prestiges || 0) + 1;
    const keepCodex = sv.codex, keepRooms = sv.rooms, keepAch = sv.achievements,
          keepMS = sv.milestones, keepReady = sv.milestonesReady,
          keepStats = { lifetimeCoins: sv.stats.lifetimeCoins, lifetimeDew: sv.stats.lifetimeDew,
                        lifetimeRenown: sv.stats.lifetimeRenown, playtimeSec: sv.stats.playtimeSec,
                        orders: sv.stats.orders, challenges: sv.stats.challenges || 0 };
    const fresh = Save.defaults();
    fresh.medals = sv.medals; fresh.prestiges = sv.prestiges;
    fresh.codex = keepCodex; fresh.rooms = keepRooms; fresh.achievements = keepAch;
    fresh.milestones = keepMS; fresh.milestonesReady = keepReady || [];
    fresh.stats = Object.assign(fresh.stats, keepStats);
    fresh.tutorialDone = true;
    S.save = fresh;
    App.richStart();
    Audio.sfx('fanfare');
    FX.burst(innerWidth / 2, innerHeight / 2, 50, { color: '#FFC93C' });
    UI.banner(`🌅 Rebirth complete!<br><span style="font-size:15px">+${n} Sun Medals — everything earns more now!</span>`);
    Pip.say('A brand new garden! With all your medals, this one will be legendary!', 'cheer', 5000);
    Board.render(); Board.renderPackets(); Solarium.render(); Orders.init();
    Rooms.render(); Shop.render(); Achievements.render(); this.render();
    UI.refreshHUD(); UI.updateBadges();
    Milestones.check();
    Save.write(S.save);
  }
};
