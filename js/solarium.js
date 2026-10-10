/* BLOOMVERSE — the Solarium: idle Dewdrop garden, upgrades, butterfly bubbles. */
const Solarium = {
  UPGRADES: [
    { key: 'sprinkler', name: 'Sprinklers', ico: '💧', desc: '+20% Dewdrop yield per level', max: 5, cost: l => Math.round(150 * Math.pow(3, l)) },
    { key: 'butterflies', name: 'Butterflies', ico: '🦋', desc: 'Each butterfly drops tappable dew bubbles', max: 5, cost: l => Math.round(200 * Math.pow(3, l)) },
    { key: 'pots', name: 'Bigger Pots', ico: '🪴', desc: '+25% Dewdrop yield per level', max: 5, cost: l => Math.round(250 * Math.pow(3, l)) }
  ],
  bubbles: [],
  bubbleTimer: 0,

  init(){ this.render(); },

  render(){
    const rate = S.dewPerSecond();
    document.getElementById('dew-rate').textContent = '💧 ' + rate.toFixed(1) + '/s';
    this.renderMeadow();
    this.renderSlots();
    this.renderUpgrades();
  },

  renderMeadow(){
    const meadow = document.getElementById('butterfly-meadow');
    meadow.querySelectorAll('.butterfly').forEach(b => b.remove());
    const n = S.save.upgrades.butterflies;
    const icons = ['🦋', '🦋', '🦋', '🦋', '🦋'];
    for (let i = 0; i < n; i++){
      const b = document.createElement('div');
      b.className = 'butterfly';
      b.textContent = icons[i % icons.length];
      b.style.left = (8 + Math.random() * 78) + '%';
      b.style.top = (8 + Math.random() * 55) + '%';
      b.style.animationDelay = (Math.random() * 7) + 's';
      meadow.appendChild(b);
    }
    if (n === 0){
      const hint = document.createElement('div');
      hint.className = 'butterfly';
      hint.style.cssText = 'left:50%;top:50%;transform:translate(-50%,-50%);font-size:12px;font-weight:700;color:var(--muted);animation:none;width:100%;text-align:center';
      hint.textContent = 'Buy Butterflies below to fill this meadow';
      meadow.appendChild(hint);
    }
  },

  renderSlots(){
    const wrap = document.getElementById('solarium-slots');
    wrap.innerHTML = '';
    const count = S.solariumSlotCount();
    for (let i = 0; i < 8; i++){
      const slot = document.createElement('div');
      const p = S.save.solarium[i];
      if (i >= count){
        slot.className = 'slot locked';
        slot.innerHTML = '<div style="font-size:22px;opacity:.5">🔒</div>';
        slot.title = 'Unlock the Astral Solarium wing for +2 slots';
      } else if (p){
        slot.className = 'slot filled';
        const t = S.tierOf(p.f, p.t);
        slot.innerHTML = `<img src="${S.artFor(p.f, p.t)}" alt="${t.name}" draggable="false"><span class="slot-x" data-unslot="${i}">✕</span>`;
        slot.title = `${t.name} — ${t.dewPerSec}/s base`;
        slot.addEventListener('click', e => {
          if (e.target.closest('[data-unslot]')){ e.stopPropagation(); this.unslot(i); return; }
          this.slotInfo(i);
        });
      } else {
        slot.className = 'slot';
        slot.innerHTML = '<div style="font-size:22px;opacity:.4">+</div>';
        slot.title = 'Grow a Tier 4+ plant, then move it here from the Garden';
        slot.addEventListener('click', () => {
          Audio.sfx('click');
          UI.toast('Grow a Tier 4+ plant in the Garden, tap it, then "Move to Solarium".');
        });
      }
      wrap.appendChild(slot);
    }
  },

  renderUpgrades(){
    const list = document.getElementById('upgrade-list');
    list.innerHTML = '';
    for (const u of this.UPGRADES){
      const lvl = S.save.upgrades[u.key];
      const maxed = lvl >= u.max;
      const cost = maxed ? 0 : u.cost(lvl);
      const card = document.createElement('div');
      card.className = 'card upgrade-card';
      card.innerHTML = `<div class="u-ico">${u.ico}</div><div class="u-body">
          <div class="u-name">${u.name}</div>
          <div class="u-desc">${u.desc}</div>
          <div class="u-lvl">${maxed ? 'MAX LEVEL' : 'Level ' + lvl + ' → ' + (lvl + 1)}</div>
        </div>`;
      const btn = document.createElement('button');
      btn.className = 'btn btn-small';
      btn.textContent = maxed ? 'MAX' : `💧 ${UI.fmt(cost)}`;
      btn.disabled = maxed || S.save.dewdrops < cost;
      if (!maxed) btn.addEventListener('click', () => this.buyUpgrade(u.key));
      card.appendChild(btn);
      list.appendChild(card);
    }
  },

  buyUpgrade(key){
    const u = this.UPGRADES.find(x => x.key === key);
    const lvl = S.save.upgrades[key];
    if (lvl >= u.max) return;
    const cost = u.cost(lvl);
    if (S.save.dewdrops < cost){ Audio.sfx('error'); UI.toast('Not enough Dewdrops yet.'); return; }
    S.addDew(-cost);
    S.save.upgrades[key]++;
    Audio.sfx('unlock');
    UI.toast(`${u.name} → Level ${lvl + 1}!`);
    if (key === 'butterflies') UI.banner('🦋 A butterfly joins your meadow!');
    this.render();
    UI.refreshHUD();
    Save.write(S.save);
  },

  slotInfo(i){
    const p = S.save.solarium[i];
    if (!p) return;
    Audio.sfx('click');
    const t = S.tierOf(p.f, p.t), f = S.family(p.f);
    const m = UI.modal(`<h2>${t.name}</h2>
      <div class="m-plant"><img src="${S.artFor(p.f, p.t)}"><div>
        <div style="font-weight:800">${f.name} · Tier ${p.t}/8</div>
        <div style="font-size:13px;font-weight:600">Earning Dewdrops passively, even while you're away.</div>
      </div></div>
      <div class="btn-row"><button class="btn btn-soft" id="si-back">Move to Garden</button>
      <button class="btn" id="si-close">Close</button></div>`);
    m.querySelector('#si-close').onclick = () => UI.closeModal();
    m.querySelector('#si-back').onclick = () => { UI.closeModal(); this.unslot(i); };
  },

  unslot(i){
    const p = S.save.solarium[i];
    if (!p) return;
    const cell = S.emptyCell();
    if (cell < 0){ Audio.sfx('error'); UI.toast('Garden is full! Make room first.'); return; }
    S.save.solarium[i] = null;
    S.save.board[cell] = p;
    Audio.sfx('drop');
    UI.toast(`${S.tierOf(p.f, p.t).name} moved back to the Garden.`);
    this.render();
    UI.refreshHUD();
    Save.write(S.save);
  },

  /* ----- butterfly dew bubbles (called from the 1s tick) ----- */
  tick(){
    const lvl = S.save.upgrades.butterflies;
    if (lvl <= 0) return;
    // expire old bubbles
    const now = Date.now();
    this.bubbles = this.bubbles.filter(b => {
      if (now > b.expires){ b.el.remove(); return false; }
      return true;
    });
    this.bubbleTimer++;
    if (this.bubbleTimer >= 25 && this.bubbles.length < Math.min(3, lvl)){
      this.bubbleTimer = 0;
      if (Math.random() < 0.75) this.spawnBubble();
    }
  },

  spawnBubble(){
    const meadow = document.getElementById('butterfly-meadow');
    if (!meadow) return;
    const value = Math.max(25, Math.round(S.dewPerSecond() * 60));
    const el = document.createElement('div');
    el.className = 'dew-bubble';
    el.textContent = '💧';
    el.style.left = (6 + Math.random() * 80) + '%';
    el.style.top = (10 + Math.random() * 50) + '%';
    const id = Math.random().toString(36).slice(2);
    const b = { id, el, value, expires: Date.now() + 45000 };
    el.addEventListener('click', e => { e.stopPropagation(); this.collectBubble(id); });
    meadow.appendChild(el);
    this.bubbles.push(b);
  },

  collectBubble(id){
    const ix = this.bubbles.findIndex(b => b.id === id);
    if (ix < 0) return;
    const b = this.bubbles[ix];
    this.bubbles.splice(ix, 1);
    const r = b.el.getBoundingClientRect();
    b.el.remove();
    S.addDew(b.value);
    Audio.sfx('bubble');
    FX.floatText(r.left + 22, r.top, '+' + UI.fmt(b.value), '#4E8CA3');
    FX.burst(r.left + 22, r.top + 22, 8, { color: '#9FD3E8' });
    Save.write(S.save);
  }
};
