/* BLOOMVERSE V3 — Rebirth prestige: trade a finished garden for permanent Sun Medals. */
const Prestige = {
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
          keepPerks = sv.perks || { coin: 0, dew: 0, luck: 0 },
          groveWasOpen = sv.gardens && sv.gardens[1] && !sv.gardens[1].locked,
          keepStats = { lifetimeCoins: sv.stats.lifetimeCoins, lifetimeDew: sv.stats.lifetimeDew,
                        lifetimeRenown: sv.stats.lifetimeRenown, playtimeSec: sv.stats.playtimeSec,
                        orders: sv.stats.orders, challenges: sv.stats.challenges || 0 };
    const fresh = Save.defaults();
    fresh.medals = sv.medals; fresh.prestiges = sv.prestiges;
    fresh.codex = keepCodex; fresh.rooms = keepRooms; fresh.achievements = keepAch;
    fresh.milestones = keepMS; fresh.milestonesReady = keepReady || [];
    fresh.perks = keepPerks;
    if (groveWasOpen) fresh.gardens[1].locked = false;
    fresh.stats = Object.assign(fresh.stats, keepStats);
    fresh.tutorialDone = true;
    S.save = fresh;
    App.richStart();
    Audio.sfx('fanfare');
    FX.burst(innerWidth / 2, innerHeight / 2, 50, { color: '#FFC93C' });
    UI.banner(`🌅 Rebirth complete!<br><span style="font-size:15px">+${n} Sun Medals — now choose a blessing!</span>`);
    Pip.say('A brand new garden! Choose a blessing to grow even stronger!', 'cheer', 5000);
    Board.render(); Board.renderPackets(); Solarium.render(); Orders.init();
    Rooms.render(); Shop.render(); Achievements.render(); this.render();
    UI.refreshHUD(); UI.updateBadges();
    Milestones.check();
    Save.write(S.save);
    setTimeout(() => this.perkChoice(), 800);
  },

  /* choose 1 of 3 permanent blessings after each rebirth */
  perkChoice(){
    const perks = [
      { id: 'coin', ico: '🪙', name: 'Coin Charm', desc: '+5% coin earnings forever' },
      { id: 'dew', ico: '💧', name: 'Dew Charm', desc: '+5% Dewdrop yield forever' },
      { id: 'luck', ico: '🌟', name: 'Luck Charm', desc: '+1% golden plant chance forever' },
    ];
    const m = UI.modal(`<h2>🌟 Choose a Blessing</h2>
      <p style="text-align:center">Your rebirth earned you a permanent blessing. Pick one:</p>
      <div class="perk-row">${perks.map(p =>
        `<button class="card perk-card" data-perk="${p.id}">
          <div style="font-size:30px">${p.ico}</div>
          <div style="font-weight:800">${p.name}</div>
          <div class="u-desc">${p.desc}</div>
        </button>`).join('')}</div>`, false);
    m.querySelectorAll('.perk-card').forEach(b => b.onclick = () => {
      const id = b.dataset.perk;
      S.save.perks[id] = (S.save.perks[id] || 0) + 1;
      UI.closeModal();
      Audio.sfx('fanfare');
      FX.burst(innerWidth / 2, innerHeight * 0.4, 30, { color: '#FFC93C' });
      const names = { coin: 'Coin Charm', dew: 'Dew Charm', luck: 'Luck Charm' };
      UI.toast(`🌟 Blessing gained: ${names[id]}!`);
      Pip.say('A wonderful choice! Your garden grows stronger!', 'cheer', 3500);
      this.render();
      Save.write(S.save);
    });
  },

  coinMult(){ return 1 + 0.08 * (S.save.medals || 0) + 0.05 * ((S.save.perks || {}).coin || 0); },
  dewMult(){ return 1 + 0.08 * (S.save.medals || 0) + 0.05 * ((S.save.perks || {}).dew || 0); },
  luckBonus(){ return 0.01 * ((S.save.perks || {}).luck || 0); },
};
