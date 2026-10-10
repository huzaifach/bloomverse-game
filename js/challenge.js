/* BLOOMVERSE V3 — Pip's Daily Challenge: a fresh goal every day. */
const Challenge = {
  TEMPLATES: [
    { type: 'merges', target: 25, text: n => `Merge ${n} plants` },
    { type: 'mergesFam', fam: 'forest-herbs', target: 12, text: n => `Merge ${n} Forest Herbs` },
    { type: 'mergesFam', fam: 'crystal-succulents', target: 10, text: n => `Merge ${n} Crystal Succulents` },
    { type: 'orders', target: 4, text: n => `Fill ${n} visitor orders` },
    { type: 'bursts', target: 3, text: n => `Use Bloom Burst ${n} times` },
    { type: 'plant', target: 15, text: n => `Plant ${n} sprouts` },
    { type: 'golden', target: 1, text: () => `Grow a golden plant (lucky merges!)` },
  ],

  today(){ return new Date().toISOString().slice(0, 10); },

  current(){
    const c = S.save.challenge || {};
    if (c.date !== this.today()){
      // seeded pick by date
      let h = 0;
      for (const ch of c.date || this.today()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const t = this.TEMPLATES[h % this.TEMPLATES.length];
      const scale = 1 + Math.floor(S.gardenLevel() / 15);
      S.save.challenge = { date: this.today(), type: t.type, fam: t.fam || null,
        target: t.target * (t.type === 'golden' ? 1 : scale), progress: 0, claimed: false };
      Save.write(S.save);
    }
    return S.save.challenge;
  },

  textOf(c){
    const t = this.TEMPLATES.find(x => x.type === c.type && (x.fam || null) === (c.fam || null)) || this.TEMPLATES[0];
    return t.text(c.target);
  },

  bump(type, fam){
    const c = this.current();
    if (c.claimed || c.type !== type) return;
    if (type === 'mergesFam' && c.fam !== fam) return;
    c.progress++;
    if (c.progress >= c.target){
      Audio.sfx('fanfare');
      UI.toast(`🎯 Daily challenge complete! Claim it in the Goals tab!`);
      Pip.say('Daily challenge done! You are amazing!', 'cheer', 3000);
    }
    UI.updateBadges();
    Save.write(S.save);
  },

  reward(){
    const lvl = S.gardenLevel();
    return { coins: 400 * lvl, seeds: 2 + Math.floor(lvl / 10) };
  },

  claim(){
    const c = this.current();
    if (c.claimed || c.progress < c.target) return;
    c.claimed = true;
    const r = this.reward();
    S.addCoins(r.coins); S.addSeeds(r.seeds);
    S.save.stats.challenges = (S.save.stats.challenges || 0) + 1;
    Audio.sfx('fanfare');
    FX.burst(innerWidth / 2, innerHeight * 0.4, 30, { color: '#FFC93C' });
    const m = UI.modal(`<h2>🎯 Challenge Complete!</h2>
      <div class="milestone-art"><img src="assets/plants/pip-cheer.png"></div>
      <p style="text-align:center;font-weight:700">“${this.textOf(c)} — DONE!”<br><span style="color:var(--muted);font-size:13px">— Pip</span></p>
      <div class="reward-big">🪙 ${UI.fmt(r.coins)} coins<br>🌰 ${r.seeds} mystery seeds</div>
      <button class="btn btn-gold" id="ch-ok">Yay!</button>`, false);
    m.querySelector('#ch-ok').onclick = () => { UI.closeModal(); this.renderCard(); Milestones.check(); Save.write(S.save); };
    this.renderCard();
    Milestones.check();
    Save.write(S.save);
  },

  renderCard(){
    const el = document.getElementById('challenge-card');
    if (!el) return;
    const c = this.current();
    const pct = Math.min(100, Math.round(c.progress / c.target * 100));
    const done = c.progress >= c.target;
    el.className = 'card goal-card' + (done && !c.claimed ? ' goal-ready' : '');
    el.innerHTML = `<div class="u-ico">🎯</div><div class="u-body">
      <div class="u-name">Pip's Daily Challenge</div>
      <div class="u-desc">${this.textOf(c)}</div>
      <div class="goal-bar"><div class="goal-fill" style="width:${pct}%"></div></div>
      <div class="goal-num">${c.progress} / ${c.target}</div></div>
      ${done && !c.claimed ? '' : done ? '<div class="owned-tag">✅ Done</div>' : ''}`;
    if (done && !c.claimed){
      const b = document.createElement('button');
      b.className = 'btn btn-small btn-gold'; b.textContent = 'Claim!';
      b.onclick = () => this.claim();
      el.appendChild(b);
    }
  }
};
