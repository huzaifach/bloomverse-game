/* BLOOMVERSE V2 — 5-step guided onboarding, voiced by Pip. Skippable, first run only. */
const Tutorial = {
  step: 0,
  steps: [
    { tab: 'board', el: '#packet-row', pip: 'greeting', text: 'Tap a seed packet to plant INSTANTLY — it just costs a few coins, no waiting!', event: 'bv:sprout' },
    { tab: 'board', el: '#grid', pip: 'merge', text: 'Plant one more, then DRAG a plant onto its twin to MERGE! Watch their happy faces!', event: 'bv:merge' },
    { tab: 'board', el: '#grid', pip: 'tap', text: 'Tap any plant — they LOVE attention and they giggle! Go on, tap one!', event: 'bv:giggle', button: 'So cute!' },
    { tab: 'orders', el: '#order-list', pip: 'order_done', text: 'Magical visitors post orders here. Fill them for coins, gifts and mystery seeds!', button: 'Got it!' },
    { tab: 'board', el: '#garden-level', pip: 'big_merge', text: 'See the glowing Bloom Burst button? It merges EVERYTHING at once! A gift for you — check your garden!', event: 'bv:solarium', gift: true, button: "Let's grow!" },
  ],

  start(){
    if (S.save.tutorialDone) return;
    this.step = 0;
    this.giftGiven = false;
    document.getElementById('tutorial-root').classList.add('open');
    // Pip introduces herself first
    setTimeout(() => Pip.say(Pip.line('greeting'), 'wave', 3500), 600);
    this.show();
    this.boundHandler = e => this.onEvent(e);
    ['bv:sprout', 'bv:merge', 'bv:giggle', 'bv:order', 'bv:solarium'].forEach(ev => document.addEventListener(ev, this.boundHandler));
  },

  onEvent(){
    const st = this.steps[this.step];
    if (st && st.event){ this.next(); }
  },

  show(){
    const st = this.steps[this.step];
    if (!st){ this.finish(); return; }
    if (st.gift) this.giveGift();
    Pip.say(st.text, 'wave', 6000);
    UI.switchTab(st.tab);
    setTimeout(() => {
      const root = document.getElementById('tutorial-root');
      root.innerHTML = '';
      const target = document.querySelector(st.el);
      if (!target){ this.next(); return; }
      const r = target.getBoundingClientRect();
      const spot = document.createElement('div');
      spot.className = 'tut-spot';
      spot.style.left = (r.left - 6) + 'px'; spot.style.top = (r.top - 6) + 'px';
      spot.style.width = (r.width + 12) + 'px'; spot.style.height = (r.height + 12) + 'px';
      const tip = document.createElement('div');
      tip.className = 'tut-tip';
      tip.innerHTML = `<div>🧚 <b>Pip:</b> ${st.text}</div>
        <div style="display:flex;gap:8px;margin-top:8px"><button class="btn btn-small" id="tut-skip" style="flex:1">Skip</button>
        ${st.button ? `<button class="btn btn-small" id="tut-next" style="flex:2">${st.button}</button>` : ''}</div>`;
      const below = r.bottom + 200 < innerHeight;
      tip.style.left = Math.max(12, Math.min(innerWidth - 272, r.left)) + 'px';
      tip.style.top = below ? (r.bottom + 14) + 'px' : Math.max(12, r.top - 200) + 'px';
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
      S.save.board[cell] = { f: 'forest-herbs', t: 4, hap: 60 };
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
    ['bv:sprout', 'bv:merge', 'bv:giggle', 'bv:order', 'bv:solarium'].forEach(ev => document.removeEventListener(ev, this.boundHandler));
    document.getElementById('tutorial-root').classList.remove('open');
    document.getElementById('tutorial-root').innerHTML = '';
    if (!S.save.tutorialDone){
      S.save.tutorialDone = true;
      S.addCoins(100);
      UI.banner('🌱 Tutorial complete!<br><span style="font-size:15px">+100 coins — happy growing!</span>');
      Pip.say('You did AMAZING! This garden is going to be legendary!', 'cheer', 5000);
      Audio.sfx('fanfare');
      Save.write(S.save);
    }
  }
};
