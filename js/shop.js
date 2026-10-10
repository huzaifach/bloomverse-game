/* BLOOMVERSE — Seed & Sun Shop. Everything real, in-game currency only. No fake IAP. */
const Shop = {
  render(){
    const list = document.getElementById('shop-list');
    if (!list) return;
    list.innerHTML = '';
    // active boosts banner
    const now = Date.now();
    if (S.save.boosts.dewBoostUntil > now){
      const mins = Math.ceil((S.save.boosts.dewBoostUntil - now) / 60000);
      const b = document.createElement('div');
      b.className = 'card';
      b.innerHTML = `<div style="font-weight:800">☀️ Sunlight Burst active — 2× Dewdrops for ${mins} more min</div>`;
      list.appendChild(b);
    }
    if (S.save.boosts.mergeValueMerges > 0){
      const b = document.createElement('div');
      b.className = 'card';
      b.innerHTML = `<div style="font-weight:800">🪙 Golden Trowel active — ${S.save.boosts.mergeValueMerges} double-value sales left</div>`;
      list.appendChild(b);
    }
    for (const item of S.data.shop.items){
      const card = document.createElement('div');
      card.className = 'card upgrade-card';
      const cur = item.cost.currency === 'coins' ? S.save.coins : S.save.dewdrops;
      const afford = cur >= item.cost.amount;
      const cico = item.cost.currency === 'coins' ? '🪙' : '💧';
      card.innerHTML = `<div class="u-ico">${this.ico(item.id)}</div><div class="u-body">
        <div class="u-name">${item.name}</div><div class="u-desc">${item.desc}</div></div>`;
      const btn = document.createElement('button');
      btn.className = 'btn btn-small';
      btn.textContent = `${cico} ${UI.fmt(item.cost.amount)}`;
      btn.disabled = !afford;
      btn.addEventListener('click', () => this.buy(item.id));
      card.appendChild(btn);
      list.appendChild(card);
    }
  },

  ico(id){
    return { 'sunlight-burst': '☀️', 'joyful-rain': '🌈', 'seed-bundle': '🌰', 'golden-trowel': '🪙' }[id] || '🎁';
  },

  buy(id){
    const item = S.data.shop.items.find(i => i.id === id);
    const bal = item.cost.currency === 'coins' ? S.save.coins : S.save.dewdrops;
    if (bal < item.cost.amount){ Audio.sfx('error'); UI.toast('Not enough ' + item.cost.currency + ' yet.'); return; }
    if (item.cost.currency === 'coins') S.addCoins(-item.cost.amount);
    else S.addDew(-item.cost.amount);
    const e = item.effect;
    if (e.type === 'dewBoost'){
      S.save.boosts.dewBoostUntil = Date.now() + e.durationMin * 60000;
      UI.banner('☀️ Sunlight Burst! 2× Dewdrops for 10 min');
    } else if (e.type === 'joyfulRain'){
      let n = 0;
      for (const p of S.G().board){ if (p){ p.hap = 100; n++; } }
      Board.render();
      FX.burst(innerWidth / 2, innerHeight * 0.4, 30, { color: '#FF6B9D' });
      Pip.say('Wheee! Everyone is SO happy now!', 'cheer', 3000);
      UI.toast(`🌈 Joyful Rain! ${n} plants are overjoyed!`);
    } else if (e.type === 'addSeeds'){
      S.addSeeds(e.count);
      UI.toast(`🌰 +${e.count} Mystery Seeds!`);
    } else if (e.type === 'mergeValueBoost'){
      S.save.boosts.mergeValueMerges = e.merges;
      UI.toast(`🪙 Next ${e.merges} sales earn double coins!`);
    }
    Audio.sfx('unlock');
    this.render();
    UI.refreshHUD();
    Save.write(S.save);
  }
};
