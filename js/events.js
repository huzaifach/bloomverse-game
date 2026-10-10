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
    this.nextAt = Date.now() + 100000 + Math.random() * 90000;
    const roll = Math.random();
    if (roll < 0.3) this.butterflySwarm();
    else if (roll < 0.55) this.rainbowRain();
    else if (roll < 0.8) this.weedInvasion();
    else this.pipsSurprise();
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
    UI.banner('🌈 Rainbow Rain!<br><span style="font-size:15px">Your next 5 merges will be GOLDEN!</span>');
    Pip.say('A rainbow! The next merges will be pure gold!', 'cheer', 4000);
    Audio.sfx('fanfare');
    FX.rainbow();
    Save.write(S.save);
  },

  /* ---- 3. Weed Invasion: clear them for a reward ---- */
  weedInvasion(){
    const b = S.save.board;
    const empty = [];
    for (let i = 0; i < b.length; i++) if (!b[i]) empty.push(i);
    if (empty.length < 4){ this.nextAt = Date.now() + 60000; return; } // board too full, retry later
    for (let k = 0; k < 3 && empty.length; k++){
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
    const b = S.save.board;
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
  }
};
