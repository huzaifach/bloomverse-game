/* BLOOMVERSE — dynamic Order Board: generation, fulfillment, streaks, VIP orders. */
const Orders = {
  uidc: 1,

  init(){
    // seed 3 orders on fresh save
    while (S.save.orders.length < S.data.orders.generator.activeCount) S.save.orders.push(this.generate());
    document.getElementById('btn-reroll').addEventListener('click', () => this.rerollAll());
    this.render();
  },

  pickTemplate(){
    const ren = S.save.stats.lifetimeRenown;
    const avail = S.data.orders.templates.filter(t => t.minRenown <= ren);
    const pool = avail.length ? avail : [S.data.orders.templates[0]];
    // weight toward the hardest unlocked template
    const weights = pool.map((_, i) => 1 + i * 1.5);
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++){ r -= weights[i]; if (r <= 0) return pool[i]; }
    return pool[pool.length - 1];
  },

  generate(){
    const tpl = this.pickTemplate();
    const g = S.data.orders.generator;
    const unlocked = S.unlockedFamilies().filter(f => tpl.families.includes(f.id));
    const fams = unlocked.length ? unlocked : S.unlockedFamilies();
    const nItems = 1 + ((Math.random() * tpl.maxItems) | 0);
    const items = [];
    for (let i = 0; i < nItems; i++){
      const f = fams[(Math.random() * fams.length) | 0];
      const t = 1 + ((Math.random() * Math.min(tpl.tierCap, 6)) | 0);
      const ex = items.find(x => x.f === f.id && x.t === t);
      if (ex) ex.n++;
      else items.push({ f: f.id, t, n: 1 });
    }
    const vip = Math.random() < g.vipChance;
    const mult = vip ? g.vipRewardMult : 1;
    let coins = 0;
    const succM = S.effect('succulentOrderMult', 1) || 1;
    for (const it of items){
      let v = S.tierOf(it.f, it.t).orderValue * it.n;
      if (it.f === 'crystal-succulents') v *= succM; // Crystal Cave room bonus
      coins += v;
    }
    coins = Math.round(coins * tpl.reward.coinsMult * mult);
    const renown = Math.round((tpl.reward.renownMin + Math.random() * (tpl.reward.renownMax - tpl.reward.renownMin)) * mult);
    const dewdrops = Math.round(tpl.reward.dewdrops * mult);
    const seeds = Math.random() < tpl.reward.mysterySeedChance * mult ? 1 : 0;
    const visitors = S.data.orders.visitors;
    return {
      uid: 'o' + (this.uidc++) + Date.now().toString(36),
      visitor: visitors[(Math.random() * visitors.length) | 0],
      items,
      rewards: { coins, renown, dewdrops, seeds },
      vip,
      expiresAt: Date.now() + S.data.orders.generator.rerollMinutes * 60 * 1000
    };
  },

  canFulfill(o){
    return o.items.every(it => S.boardHas(it.f, it.t, it.n));
  },

  fulfill(uid){
    const ix = S.save.orders.findIndex(o => o.uid === uid);
    if (ix < 0) return;
    const o = S.save.orders[ix];
    if (!this.canFulfill(o)){ Audio.sfx('error'); UI.toast('You still need plants for this order.'); return; }
    for (const it of o.items) S.takePlants(it.f, it.t, it.n);
    S.addCoins(o.rewards.coins);
    S.addRenown(o.rewards.renown);
    if (o.rewards.dewdrops) S.addDew(o.rewards.dewdrops);
    if (o.rewards.seeds) S.addSeeds(o.rewards.seeds);
    S.save.orderStreak++;
    S.save.bestStreak = Math.max(S.save.bestStreak, S.save.orderStreak);
    S.save.stats.orders++;
    // streak bonus every 3
    let bonus = '';
    if (S.save.orderStreak % 3 === 0){
      const sb = 50 * (S.save.orderStreak / 3);
      S.addCoins(sb); S.addDew(sb);
      bonus = ` Streak bonus: +${sb} coins & dew!`;
    }
    Audio.sfx(o.vip ? 'fanfare' : 'success');
    UI.banner(`${o.vip ? '👑 VIP Order Complete!' : '📜 Order Complete!'}<br><span style="font-size:15px">+${UI.fmt(o.rewards.coins)} coins · +${o.rewards.renown} renown</span>`);
    UI.toast(`Thanks, ${o.visitor}!${bonus}`);
    S.save.orders.splice(ix, 1);
    document.dispatchEvent(new CustomEvent('bv:order'));
    Board.render();
    this.render();
    UI.refreshHUD();
    Achievements.check();
    Save.write(S.save);
    // fresh order arrives shortly
    setTimeout(() => {
      if (S.save.orders.length < S.data.orders.generator.activeCount){
        S.save.orders.push(this.generate());
        this.render();
        Save.write(S.save);
        UI.toast('A new visitor posted an order 📜');
      }
    }, 4000);
  },

  rerollAll(){
    const cost = S.data.orders.generator.rerollCostCoins;
    if (S.save.coins < cost){ Audio.sfx('error'); UI.toast(`Need ${cost} coins to refresh orders.`); return; }
    UI.confirm('Refresh Orders?', `Replace all 3 orders for ${cost} coins?`, 'Refresh').then(ok => {
      if (!ok) return;
      S.addCoins(-cost);
      S.save.orderStreak = 0;
      S.save.orders = [];
      while (S.save.orders.length < S.data.orders.generator.activeCount) S.save.orders.push(this.generate());
      Audio.sfx('whoosh');
      this.render();
      Save.write(S.save);
    });
  },

  tick(){
    // expire stale orders
    const now = Date.now();
    let changed = false;
    S.save.orders = S.save.orders.filter(o => {
      if (o.expiresAt < now){ changed = true; return false; }
      return true;
    });
    while (S.save.orders.length < S.data.orders.generator.activeCount){
      S.save.orders.push(this.generate()); changed = true;
    }
    if (changed){ this.render(); Save.write(S.save); }
    else this.updateTimers();
  },

  updateTimers(){
    const now = Date.now();
    document.querySelectorAll('.order-card').forEach(card => {
      const o = S.save.orders.find(x => x.uid === card.dataset.uid);
      if (!o) return;
      const t = card.querySelector('.order-timer');
      if (t) t.textContent = 'New orders in ' + Math.max(0, Math.ceil((o.expiresAt - now) / 60000)) + ' min';
      const btn = card.querySelector('.fulfill-btn');
      if (btn) btn.disabled = !this.canFulfill(o);
      card.querySelectorAll('.order-item').forEach(el => {
        const it = o.items.find(x => x.f === el.dataset.f && x.t === parseInt(el.dataset.t, 10));
        if (it) el.classList.toggle('done', S.boardHas(it.f, it.t, it.n));
      });
    });
    const st = document.getElementById('order-streak');
    if (st) st.textContent = '🔥 Streak: ' + S.save.orderStreak;
  },

  render(){
    const list = document.getElementById('order-list');
    list.innerHTML = '';
    document.getElementById('order-streak').textContent = '🔥 Streak: ' + S.save.orderStreak;
    for (const o of S.save.orders){
      const card = document.createElement('div');
      card.className = 'card order-card' + (o.vip ? ' vip' : '');
      card.dataset.uid = o.uid;
      const itemsHtml = o.items.map(it => {
        const t = S.tierOf(it.f, it.t);
        const done = S.boardHas(it.f, it.t, it.n);
        return `<div class="order-item${done ? ' done' : ''}" data-f="${it.f}" data-t="${it.t}">
          <img src="${S.artFor(it.f, it.t)}" draggable="false">${it.n}× ${t.name}</div>`;
      }).join('');
      const rw = o.rewards;
      card.innerHTML = `<div class="order-visitor">${o.visitor} ${o.vip ? '👑' : ''}</div>
        <div style="font-size:12px;color:var(--muted);font-weight:600">wishes for…</div>
        <div class="order-items">${itemsHtml}</div>
        <div class="order-rewards"><span>🪙 ${UI.fmt(rw.coins)}</span><span>⭐ +${rw.renown}</span>
          ${rw.dewdrops ? `<span>💧 ${rw.dewdrops}</span>` : ''}
          ${rw.seeds ? `<span>🌰 +${rw.seeds} seed</span>` : ''}</div>
        <button class="btn fulfill-btn" ${this.canFulfill(o) ? '' : 'disabled'}>Deliver Order</button>
        <div class="order-timer"></div>`;
      card.querySelector('.fulfill-btn').addEventListener('click', () => this.fulfill(o.uid));
      list.appendChild(card);
    }
    this.updateTimers();
  }
};
