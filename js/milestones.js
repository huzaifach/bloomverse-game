/* BLOOMVERSE V3 — Goals: visible milestone track, claimable gifts. */
const Milestones = {
  statVal(id){
    const sv = S.save, st = sv.stats;
    switch (id){
      case 'planted': return st.sprouts || 0;
      case 'merges': return st.merges || 0;
      case 'orders': return st.orders || 0;
      case 'maxTier': return st.maxTier || 0;
      case 'gridSize': return sv.gridSize || 4;
      case 'rooms': return (sv.rooms || []).length;
      case 'hybrids': return (sv.hybrids || []).filter(Boolean).length;
      case 'golden': return st.goldenMerges || 0;
      case 'grandOrders': return st.grandOrders || 0;
      case 'prestiges': return sv.prestiges || 0;
      case 'challenges': return st.challenges || 0;
      case 'lifetimeDew': return Math.floor(st.lifetimeDew || 0);
      case 'lifetimeCoins': return Math.floor(st.lifetimeCoins || 0);
      case 'gardenLevel': return S.gardenLevel();
      case 'bursts': return st.bursts || 0;
      case 'weeds': return st.weedsCleared || 0;
      case 'meteors': return st.meteors || 0;
      case 'frogs': return st.frogs || 0;
      case 'parties': return st.parties || 0;
      case 'rainbows': return st.rainbows || 0;
      case 'perks': { const p = sv.perks || {}; return (p.coin || 0) + (p.dew || 0) + (p.luck || 0); }
      case 'grove': return (sv.gardens && sv.gardens[1] && !sv.gardens[1].locked) ? 1 : 0;
      case 'groveMax': return (sv.gardens && sv.gardens[1] && sv.gardens[1].gridSize >= 8) ? 1 : 0;
      case 'weathers': return Object.keys(st.weathers || {}).length;
      case 'ember8': case 'tidal8': case 'storm8': case 'honey8': {
        const fid = { ember8: 'ember-blooms', tidal8: 'tidal-kelps', storm8: 'storm-petals', honey8: 'honey-blooms' }[id];
        return (sv.codex[fid] && sv.codex[fid][7]) ? 1 : 0;
      }
      case 'joyful': {
        let n = 0;
        for (const g of (S.save.gardens || [])) for (const p of g.board) if (p && p.hap >= 80) n++;
        for (const p of sv.solarium) if (p && p.hap >= 80) n++;
        return n;
      }
      case 'tier8Count': {
        let n = 0;
        for (const f of S.data.families) if (sv.codex[f.id] && sv.codex[f.id][7]) n++;
        return n;
      }
      default: return 0;
    }
  },

  /* Earn → goes to "ready" (toast + badge). Claim → celebration + rewards. */
  check(){
    if (!S.data || !Array.isArray(S.data.milestones)) return;
    let newOnes = 0;
    for (const m of S.data.milestones){
      if (S.save.milestones.includes(m.id)) continue;
      if ((S.save.milestonesReady || []).includes(m.id)) continue;
      if (this.statVal(m.stat) >= m.target){
        S.save.milestonesReady.push(m.id);
        newOnes++;
      }
    }
    if (newOnes > 0){
      Audio.sfx('fanfare');
      UI.toast(`🎯 ${newOnes} milestone${newOnes > 1 ? 's' : ''} ready to claim! Check the Goals tab!`);
      Pip.say('You earned a reward! Claim it in the Goals tab!', 'cheer', 3500);
      UI.updateBadges();
      Save.write(S.save);
    }
  },

  claim(id){
    const m = S.data.milestones.find(x => x.id === id);
    if (!m) return;
    const ix = S.save.milestonesReady.indexOf(id);
    if (ix < 0) return;
    S.save.milestonesReady.splice(ix, 1);
    S.save.milestones.push(id);
    const r = m.reward || {};
    const parts = [];
    if (r.coins){ S.addCoins(r.coins); parts.push(`🪙 ${UI.fmt(r.coins)} coins`); }
    if (r.dewdrops){ S.addDew(r.dewdrops); parts.push(`💧 ${UI.fmt(r.dewdrops)} Dewdrops`); }
    if (r.seeds){ S.addSeeds(r.seeds); parts.push(`🌰 ${r.seeds} mystery seed${r.seeds > 1 ? 's' : ''}`); }
    Audio.sfx('fanfare');
    FX.burst(innerWidth / 2, innerHeight * 0.4, 36);
    const modal = UI.modal(`<h2>🎁 ${m.name}!</h2>
      <div class="milestone-art"><img src="assets/plants/pip-cheer.png" alt="Pip cheering"></div>
      <p style="text-align:center;font-weight:700;font-style:italic">“${m.pip}”<br><span style="font-style:normal;color:var(--muted);font-size:13px">— Pip</span></p>
      <div class="reward-big">${parts.join('<br>')}</div>
      <button class="btn btn-gold" id="ms-claim">Yay!</button>`, false);
    modal.querySelector('#ms-claim').onclick = () => {
      UI.closeModal();
      this.render();
      Save.write(S.save);
    };
    this.render();
    UI.updateBadges();
    Save.write(S.save);
  },

  progress(m){
    const v = this.statVal(m.stat);
    return { v, pct: Math.min(100, Math.round(v / m.target * 100)) };
  },

  render(){
    const wrap = document.getElementById('goals-list');
    if (!wrap) return;
    wrap.innerHTML = '';
    // daily challenge card on top
    const ch = document.createElement('div');
    ch.id = 'challenge-card';
    wrap.appendChild(ch);
    Challenge.renderCard();
    const ready = [], prog = [], done = [];
    for (const m of S.data.milestones){
      if (S.save.milestones.includes(m.id)) done.push(m);
      else if ((S.save.milestonesReady || []).includes(m.id)) ready.push(m);
      else prog.push(m);
    }
    const sec = (title, list, fn) => {
      if (!list.length) return;
      const h = document.createElement('h3');
      h.className = 'section-title'; h.textContent = title;
      wrap.appendChild(h);
      list.forEach(m => wrap.appendChild(fn(m)));
    };
    sec(`🎁 Ready to claim (${ready.length})`, ready, m => {
      const d = document.createElement('div');
      d.className = 'card goal-card goal-ready';
      d.innerHTML = `<div class="u-ico">🎁</div><div class="u-body">
        <div class="u-name">${m.name}</div><div class="u-desc">${m.desc}</div></div>`;
      const b = document.createElement('button');
      b.className = 'btn btn-small btn-gold'; b.textContent = 'Claim!';
      b.onclick = () => this.claim(m.id);
      d.appendChild(b);
      return d;
    });
    sec('🌱 In progress', prog, m => {
      const p = this.progress(m);
      const d = document.createElement('div');
      d.className = 'card goal-card';
      d.innerHTML = `<div class="u-ico">🎯</div><div class="u-body">
        <div class="u-name">${m.name}</div><div class="u-desc">${m.desc}</div>
        <div class="goal-bar"><div class="goal-fill" style="width:${p.pct}%"></div></div>
        <div class="goal-num">${UI.fmt(p.v)} / ${UI.fmt(m.target)}</div></div>`;
      return d;
    });
    sec(`✅ Completed (${done.length})`, done, m => {
      const d = document.createElement('div');
      d.className = 'card goal-card goal-done';
      d.innerHTML = `<div class="u-ico">✅</div><div class="u-body">
        <div class="u-name">${m.name}</div><div class="u-desc">${m.desc}</div></div>`;
      return d;
    });
  }
};
