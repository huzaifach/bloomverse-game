/* BLOOMVERSE V2 — Milestone Gifts: free rewards for progress (replaces fake monetization). */
const Milestones = {
  statVal(id){
    const sv = S.save;
    switch (id){
      case 'planted': return sv.stats.sprouts || 0;
      case 'merges': return sv.stats.merges || 0;
      case 'orders': return sv.stats.orders || 0;
      case 'maxTier': return sv.stats.maxTier || 0;
      case 'gridSize': return sv.gridSize || 4;
      case 'rooms': return (sv.rooms || []).length;
      case 'hybrids': return (sv.hybrids || []).filter(Boolean).length;
      case 'tier8Count': {
        let n = 0;
        for (const f of S.data.families) if (sv.codex[f.id] && sv.codex[f.id][7]) n++;
        return n;
      }
      default: return 0;
    }
  },

  check(){
    if (!S.data || !Array.isArray(S.data.milestones)) return;
    for (const m of S.data.milestones){
      if (S.save.milestones.includes(m.id)) continue;
      if (this.statVal(m.stat) >= m.target) this.award(m);
    }
  },

  award(m){
    S.save.milestones.push(m.id);
    const r = m.reward || {};
    const parts = [];
    if (r.coins){ S.addCoins(r.coins); parts.push(`🪙 ${UI.fmt(r.coins)} coins`); }
    if (r.dewdrops){ S.addDew(r.dewdrops); parts.push(`💧 ${UI.fmt(r.dewdrops)} Dewdrops`); }
    if (r.seeds){ S.addSeeds(r.seeds); parts.push(`🌰 ${r.seeds} mystery seed${r.seeds > 1 ? 's' : ''}`); }
    Audio.sfx('fanfare');
    FX.burst(innerWidth / 2, innerHeight * 0.4, 36);
    const modal = UI.modal(`<h2>🎁 Milestone: ${m.name}!</h2>
      <div class="milestone-art"><img src="assets/plants/pip-cheer.png" alt="Pip cheering"></div>
      <p style="text-align:center;font-weight:700;font-style:italic">“${m.pip}”<br><span style="font-style:normal;color:var(--muted);font-size:13px">— Pip</span></p>
      <div class="reward-big">${parts.join('<br>')}</div>
      <button class="btn btn-gold" id="ms-claim">Claim Gift!</button>`, false);
    modal.querySelector('#ms-claim').onclick = () => {
      UI.closeModal();
      Pip.say(m.pip, 'cheer', 3500);
      Board.renderPackets();
      Save.write(S.save);
    };
    Save.write(S.save);
  }
};
