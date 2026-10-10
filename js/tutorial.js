/* BLOOMVERSE — 5-step guided onboarding. Skippable, first run only. */
const Tutorial = {
  step: 0,
  steps: [
    { tab: 'board', el: '#packet-row', text: 'Welcome to Bloomverse! 🌱 Tap a seed packet to sprout your first plant.', event: 'bv:sprout' },
    { tab: 'board', el: '#grid', text: 'Sprout one more, then DRAG one plant onto its twin to merge them! ✨', event: 'bv:merge' },
    { tab: 'orders', el: '#order-list', text: 'Magical visitors post orders here. Deliver plants to earn coins, renown & mystery seeds! 📜', button: 'Got it!' },
    { tab: 'board', el: '#grid', text: 'A gift! 🎁 Tap the Moonpetal Herb, then move it to the Solarium for passive Dewdrops ☀️', event: 'bv:solarium', gift: true },
  ],

  start(){
    if (S.save.tutorialDone) return;
    this.step = 0;
    document.getElementById('tutorial-root').classList.add('open');
    this.show();
    this.boundHandler = e => this.onEvent(e);
    ['bv:sprout', 'bv:merge', 'bv:order', 'bv:solarium'].forEach(ev => document.addEventListener(ev, this.boundHandler));
  },

  onEvent(){
    const st = this.steps[this.step];
    if (st && st.event){ this.next(); }
  },

  show(){
    const st = this.steps[this.step];
    if (!st){ this.finish(); return; }
    if (st.gift) this.giveGift();
    UI.switchTab(st.tab);
    // wait a frame for tab switch, then position
    setTimeout(() => {
      const root = document.getElementById('tutorial-root');
      root.innerHTML = '';
      const target = document.querySelector(st.el);
      if (!target){ this.next(); return; }
      const r = target.getBoundingClientRect();
      const spot = document.createElement('div');
      spot.className = 'tut-spot';
      spot.style.left = (r.left - 6) + 'px'; spot.style.top = (r.top - 6 + window.scrollY * 0) + 'px';
      spot.style.width = (r.width + 12) + 'px'; spot.style.height = (r.height + 12) + 'px';
      // note: root is position:fixed, rect is viewport-relative — good
      const tip = document.createElement('div');
      tip.className = 'tut-tip';
      tip.innerHTML = `<div>${st.text}</div>
        <div style="display:flex;gap:8px"><button class="btn btn-small" id="tut-skip" style="flex:1">Skip</button>
        ${st.button ? `<button class="btn btn-small" id="tut-next" style="flex:2">${st.button}</button>` : ''}</div>`;
      // place tip below spot, or above if no room
      const below = r.bottom + 170 < innerHeight;
      tip.style.left = Math.max(12, Math.min(innerWidth - 272, r.left)) + 'px';
      tip.style.top = below ? (r.bottom + 14) + 'px' : Math.max(12, r.top - 170) + 'px';
      root.appendChild(spot); root.appendChild(tip);
      tip.querySelector('#tut-skip').onclick = () => this.finish();
      const nx = tip.querySelector('#tut-next');
      if (nx) nx.onclick = () => this.next();
    }, 120);
  },

  giveGift(){
    const cell = S.emptyCell();
    if (cell >= 0 && !this.giftGiven){
      this.giftGiven = true;
      S.save.board[cell] = { f: 'forest-herbs', t: 4 };
      S.discover('forest-herbs', 4);
      Board.render();
      Save.write(S.save);
    }
  },

  next(){
    this.step++;
    Audio.sfx('click');
    this.show();
  },

  finish(){
    ['bv:sprout', 'bv:merge', 'bv:order', 'bv:solarium'].forEach(ev => document.removeEventListener(ev, this.boundHandler));
    document.getElementById('tutorial-root').classList.remove('open');
    document.getElementById('tutorial-root').innerHTML = '';
    if (!S.save.tutorialDone){
      S.save.tutorialDone = true;
      S.addCoins(100);
      UI.banner('🌱 Tutorial complete!<br><span style="font-size:15px">+100 coins — happy growing!</span>');
      Audio.sfx('fanfare');
      Save.write(S.save);
    }
  }
};
