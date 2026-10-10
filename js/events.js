/* BLOOMVERSE V3 — Garden Events: random surprises that break the routine.
   Butterfly Swarm, Rainbow Rain, Weed Invasion, Pip's Surprise. */
const Events = {
  nextAt: 0,

  init(){
    this.nextAt = Date.now() + 90000 + Math.random() * 60000;
  },

  tick(){
    if (!S.save.tutorialDone) return;
    if (Date.now() < this.nextAt) return;
    if (UI.modalOpen) return;
    // higher garden level = wilder garden: events come faster
    const lvl = S.gardenLevel();
    const base = Math.max(60000, 100000 - lvl * 1500);
    this.nextAt = Date.now() + base + Math.random() * base;
    const roll = Math.random();
    if (roll < 0.2) this.butterflySwarm();
    else if (roll < 0.35) this.rainbowRain();
    else if (roll < 0.5) this.weedInvasion();
    else if (roll < 0.62) this.pipsSurprise();
    else if (roll < 0.72) this.meteorShower();
    else if (roll < 0.82) this.frogFriend();
    else if (roll < 0.92) this.doubleRainbow();
    else this.danceParty();
  },

  /* ---- 1. Butterfly Swarm: tap butterflies for dew ---- */
  butterflySwarm(){
    UI.banner('🦋 Butterfly Swarm!<br><span style="font-size:15px">Tap the butterflies!</span>');
    Pip.say('Butterflies! Quick, tap them for Dewdrops!', 'cheer', 4000);
    Audio.sfx('pop');
    const layer = document.getElementById('fx-layer');
    for (let i = 0; i < 8; i++){
      setTimeout(() => {
        const b = document.createElement('div');
        b.className = 'event-butterfly';
        b.textContent = ['🦋', '🦋', '🦋', '🦋', '🦋', '🦋', '🦋', '🦋'][i];
        b.style.left = Math.random() * 80 + 5 + '%';
        b.style.top = '110%';
        b.style.animationDuration = (5 + Math.random() * 3) + 's';
        layer.appendChild(b);
        b.addEventListener('pointerdown', () => {
          const gain = Math.round(50 * S.gardenLevel() * Prestige.dewMult());
          S.addDew(gain);
          FX.floatText(b.getBoundingClientRect().left, b.getBoundingClientRect().top, `+${UI.fmt(gain)} 💧`, '#4FC3F7');
          Audio.sfx('coin');
          b.remove();
        }, { once: true });
        setTimeout(() => b.remove(), 9000);
      }, i * 700);
    }
  },

  /* ---- 2. Rainbow Rain: next 5 merges are golden ---- */
  rainbowRain(){
    S.save.boosts.rainbowMerges = 5;
    S.save.stats.rainbows = (S.save.stats.rainbows || 0) + 1;
    UI.banner('🌈 Rainbow Rain!<br><span style="font-size:15px">Your next 5 merges will be GOLDEN!</span>');
    Pip.say('A rainbow! The next merges will be pure gold!', 'cheer', 4000);
    Audio.sfx('fanfare');
    FX.rainbow();
    Save.write(S.save);
  },

  /* ---- 3. Weed Invasion: clear them for a reward ---- */
  weedInvasion(){
    const b = S.G().board;
    const empty = [];
    for (let i = 0; i < b.length; i++) if (!b[i]) empty.push(i);
    if (empty.length < 4){ this.nextAt = Date.now() + 60000; return; } // board too full, retry later
    const weedCount = Math.min(empty.length, 3 * Weather.weedMult() + (S.gardenLevel() >= 30 ? 2 : 0));
    for (let k = 0; k < weedCount; k++){
      const ix = empty.splice(Math.floor(Math.random() * empty.length), 1)[0];
      b[ix] = { weed: true };
    }
    UI.banner('🌿 Weed Invasion!<br><span style="font-size:15px">Drag two weeds together to clear them!</span>');
    Pip.say('Oh no, weeds! Merge two weeds together to get rid of them!', 'wave', 4000);
    Audio.sfx('error');
    Board.render();
    Save.write(S.save);
  },

  /* ---- 4. Pip's Surprise: a free gift plant ---- */
  pipsSurprise(){
    const b = S.G().board;
    const empty = [];
    for (let i = 0; i < b.length; i++) if (!b[i]) empty.push(i);
    if (!empty.length) return;
    const fams = S.data.families.filter(f => S.isFamilyUnlocked(f.id));
    const f = fams[Math.floor(Math.random() * fams.length)];
    const t = 2 + Math.floor(Math.random() * 3); // tier 2-4
    const ix = empty[Math.floor(Math.random() * empty.length)];
    b[ix] = { f: f.id, t, hap: 90 };
    S.discover(f.id, t);
    UI.banner('🎁 Pip\'s Surprise!<br><span style="font-size:15px">A gift sprouted in your garden!</span>');
    Pip.say('I planted a little surprise for you! You deserve it!', 'cheer', 4000);
    Audio.sfx('plant');
    FX.burst(innerWidth / 2, innerHeight * 0.5, 24, { color: '#FF8FB2' });
    Board.render();
    Save.write(S.save);
  },

  /* ---- 5. Meteor Shower: tap falling meteors for coins ---- */
  meteorShower(){
    UI.banner('🌠 Meteor Shower!<br><span style="font-size:15px">Tap the meteors!</span>');
    Pip.say('Shooting stars! Tap them before they fade!', 'cheer', 4000);
    Audio.sfx('pop');
    const layer = document.getElementById('fx-layer');
    for (let i = 0; i < 6; i++){
      setTimeout(() => {
        const m = document.createElement('div');
        m.className = 'event-butterfly';
        m.textContent = '🌠';
        m.style.left = Math.random() * 80 + 5 + '%';
        m.style.top = '110%';
        m.style.animationDuration = (4 + Math.random() * 2) + 's';
        layer.appendChild(m);
        m.addEventListener('pointerdown', () => {
          const gain = Math.round(80 * S.gardenLevel() * Prestige.coinMult() * Weather.coinMult());
          S.addCoins(gain);
          S.save.stats.meteors = (S.save.stats.meteors || 0) + 1;
          FX.floatText(m.getBoundingClientRect().left, m.getBoundingClientRect().top, `+${UI.fmt(gain)} 🪙`, '#B9862F');
          Audio.sfx('coin');
          m.remove();
        }, { once: true });
        setTimeout(() => m.remove(), 7000);
      }, i * 800);
    }
  },

  /* ---- 6. Frog Friend: eats all weeds ---- */
  frogFriend(){
    const b = S.G().board;
    let n = 0;
    S.save.stats.frogs = (S.save.stats.frogs || 0) + 1;
    for (let i = 0; i < b.length; i++) if (b[i] && b[i].weed){ b[i] = null; n++; }
    if (!n){
      // no weeds: frog leaves a gift instead
      const gain = Math.round(100 * S.gardenLevel() * Prestige.coinMult());
      S.addCoins(gain);
      UI.banner(`🐸 Frog Friend!<br><span style="font-size:15px">No weeds — here's ${UI.fmt(gain)} coins instead!</span>`);
    } else {
      const gain = Math.round(n * 60 * S.gardenLevel() * Prestige.coinMult());
      S.addCoins(gain);
      UI.banner(`🐸 Frog Friend!<br><span style="font-size:15px">Gobbled ${n} weed${n > 1 ? 's' : ''}! +${UI.fmt(gain)} coins!</span>`);
    }
    Pip.say('Ribbit! My frog friend loves weeds!', 'cheer', 4000);
    Audio.sfx('merge');
    FX.burst(innerWidth / 2, innerHeight / 2, 20, { color: '#6BCB77' });
    Board.render();
    Save.write(S.save);
  },

  /* ---- 7. Double Rainbow: next 10 merges are golden ---- */
  doubleRainbow(){
    S.save.boosts.rainbowMerges = 10;
    S.save.stats.rainbows = (S.save.stats.rainbows || 0) + 1;
    UI.banner('🌈🌈 Double Rainbow!<br><span style="font-size:15px">Your next 10 merges will be GOLDEN!</span>');
    Pip.say('A DOUBLE rainbow! This is the luckiest day ever!', 'cheer', 4000);
    Audio.sfx('fanfare');
    FX.rainbow();
    Save.write(S.save);
  },

  /* ---- 8. Dance Party: every plant becomes overjoyed ---- */
  danceParty(){
    let n = 0;
    S.save.stats.parties = (S.save.stats.parties || 0) + 1;
    for (const g of S.save.gardens) for (const p of g.board) if (p && !p.weed){ p.hap = 100; n++; }
    for (const p of S.save.solarium) if (p){ p.hap = 100; n++; }
    UI.banner(`🎉 Dance Party!<br><span style="font-size:15px">${n} plants are overjoyed!</span>`);
    Pip.say('Dance party! Everybody is SO happy!', 'cheer', 4000);
    Audio.sfx('fanfare');
    FX.hearts(innerWidth / 2, innerHeight / 2, 12);
    Board.render();
    Save.write(S.save);
  }
};
