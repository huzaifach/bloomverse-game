/* BLOOMVERSE — achievements with real rewards. */
const Achievements = {
  ICONS: { 'first-sprout': '🌱', 'merger-10': '🪴', 'merger-100': '🌻', 'tier-5': '🌿', 'tier-8': '👑',
    'order-1': '📜', 'order-25': '💌', 'streak-5': '🔥', 'solarium-1': '☀️', 'solarium-full': '🏡',
    'renown-30': '⭐', 'codex-50': '📖' },

  valueOf(type){
    const st = S.save.stats;
    switch(type){
      case 'sprouts': return st.sprouts;
      case 'merges': return st.merges;
      case 'maxTier': return st.maxTier;
      case 'orders': return st.orders;
      case 'bestStreak': return st.bestStreak;
      case 'solariumMoves': return st.solariumMoves;
      case 'solariumFull': {
        const filled = S.save.solarium.slice(0, S.solariumSlotCount()).filter(Boolean).length;
        return filled >= S.solariumSlotCount() ? 1 : 0;
      }
      case 'lifetimeRenown': return st.lifetimeRenown;
      case 'codexPct': return S.codexPct();
      default: return 0;
    }
  },

  check(){
    if (!S.data) return;
    for (const a of S.data.achievements.items){
      if (S.save.achievements.includes(a.id)) continue;
      if (this.valueOf(a.check.type) >= a.check.value){
        S.save.achievements.push(a.id);
        const r = a.reward;
        if (r.coins) S.addCoins(r.coins);
        if (r.dewdrops) S.addDew(r.dewdrops);
        if (r.seeds) S.addSeeds(r.seeds);
        Audio.sfx('fanfare');
        UI.banner(`🏆 ${a.name}<br><span style="font-size:14px">${a.desc}</span>`);
        this.render();
        Save.write(S.save);
      }
    }
  },

  render(){
    const list = document.getElementById('achievement-list');
    if (!list || !S.data) return;
    list.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'card';
    card.style.padding = '6px 14px';
    for (const a of S.data.achievements.items){
      const done = S.save.achievements.includes(a.id);
      const row = document.createElement('div');
      row.className = 'ach-row' + (done ? '' : ' locked');
      const r = a.reward;
      const rtxt = [r.coins ? `🪙${r.coins}` : '', r.dewdrops ? `💧${r.dewdrops}` : '', r.seeds ? `🌰${r.seeds}` : ''].filter(Boolean).join(' ');
      row.innerHTML = `<div class="a-ico">${done ? '🏆' : (this.ICONS[a.id] || '🎯')}</div>
        <div class="a-body"><div class="a-name">${a.name}</div><div class="a-desc">${a.desc} · Reward: ${rtxt}</div></div>
        ${done ? '<div class="a-done">✓</div>' : ''}`;
      card.appendChild(row);
    }
    list.appendChild(card);
  }
};
