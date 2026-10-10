/* BLOOMVERSE V2 — the Solarium: idle Dewdrop garden, decorative pots, upgrades,
   butterfly bubbles, and the Hybrid Lab (cross-breeding). */
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
    this.renderHybridZone();
    this.renderSlots();
    this.renderUpgrades();
  },

  renderMeadow(){
    const meadow = document.getElementById('butterfly-meadow');
    meadow.querySelectorAll('.butterfly').forEach(b => b.remove());
    const n = S.save.upgrades.butterflies;
    for (let i = 0; i < n; i++){
      const b = document.createElement('div');
      b.className = 'butterfly';
      b.textContent = '🦋';
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

  /* ---------- Hybrid Lab (cross-breeding) ---------- */
  renderHybridZone(){
    let zone = document.getElementById('hybrid-zone');
    if (!zone){
      zone = document.createElement('div');
      zone.id = 'hybrid-zone';
      zone.className = 'hybrid-zone';
      document.getElementById('solarium-slots').before(zone);
    }
    zone.innerHTML = '';
    if (!S.hasRoom('astral-solarium')) return;
    const title = document.createElement('h3');
    title.className = 'section-title';
    title.textContent = '🔮 Hybrid Lab — cross-breed two Tier 5+ plants of different families!';
    zone.appendChild(title);
    const ped = document.createElement('div');
    ped.className = 'hybrid-ped';
    S.save.hybrids.forEach((h, i) => {
      const slot = document.createElement('div');
      slot.className = 'hybrid-slot';
      if (h){
        slot.innerHTML = `<img src="${S.artFor(h.baseF, h.baseT)}" style="filter:hue-rotate(${h.hue}deg)" alt="${h.name}">
          <div style="font-weight:800">${h.name}</div>
          <div>💧 ${h.dewPerSec.toFixed(1)}/s</div>`;
        slot.title = `A cross-breed of ${h.parents.join(' × ')}`;
      } else {
        slot.innerHTML = `<div style="font-size:26px">💜</div><div>Empty pedestal</div>
          <button class="btn btn-small" style="margin-top:6px" id="hyb-btn-${i}">Fuse Plants</button>`;
      }
      ped.appendChild(slot);
    });
    zone.appendChild(ped);
    S.save.hybrids.forEach((h, i) => {
      if (!h){
        const b = document.getElementById(`hyb-btn-${i}`);
        if (b) b.onclick = () => this.fuseDialog(i);
      }
    });
  },

  eligibleParents(){
    const out = [];
    S.save.board.forEach((p, i) => {
      if (p && p.t >= 5) out.push({ i, p });
    });
    return out;
  },

  fuseDialog(slotIx){
    const elig = this.eligibleParents();
    if (elig.length < 2){
      Audio.sfx('error');
      UI.toast('You need two Tier 5+ plants in the Garden to cross-breed.');
      return;
    }
    const fams = [...new Set(elig.map(e => e.p.f))];
    if (fams.length < 2){
      Audio.sfx('error');
      UI.toast('Parents must be from two DIFFERENT families!');
      return;
    }
    const list = elig.map(e => {
      const t = S.tierOf(e.p.f, e.p.t);
      return `<label class="order-item" style="cursor:pointer"><input type="checkbox" data-pick="${e.i}" style="width:18px;height:18px">
        <img src="${S.artFor(e.p.f, e.p.t)}"><span>${t.name} (T${e.p.t})</span></label>`;
    }).join('');
    const m = UI.modal(`<h2>🔮 Choose Two Parents</h2>
      <p style="text-align:center;font-weight:600">Two Tier 5+ plants from <b>different families</b>.<br>They'll become one magical hybrid!</p>
      <div class="order-items">${list}</div>
      <div class="btn-row"><button class="btn btn-soft" id="hyb-cancel">Cancel</button>
      <button class="btn" id="hyb-fuse">Fuse! 💜</button></div>`);
    m.querySelector('#hyb-cancel').onclick = () => UI.closeModal();
    m.querySelector('#hyb-fuse').onclick = () => {
      const picks = [...m.querySelectorAll('[data-pick]:checked')].map(c => parseInt(c.dataset.pick, 10));
      if (picks.length !== 2){ UI.toast('Pick exactly two plants!'); return; }
      const a = S.save.board[picks[0]], b = S.save.board[picks[1]];
      if (!a || !b || a.f === b.f){ UI.toast('Parents must be from two different families!'); return; }
      UI.closeModal();
      this.doFuse(slotIx, picks[0], picks[1]);
    };
  },

  doFuse(slotIx, ia, ib){
    const a = S.save.board[ia], b = S.save.board[ib];
    if (!a || !b) return;
    const ta = S.tierOf(a.f, a.t), tb = S.tierOf(b.f, b.t);
    const dew = Math.round(((ta.dewPerSec + tb.dewPerSec) * 1.5) * 10) / 10;
    const hue = (Math.random() * 360) | 0;
    const names = ['Prismatic Fusion', 'Starbloom Hybrid', 'Rainbow Cross', 'Twilight Bloom', 'Aurora Sprout'];
    const h = {
      name: names[(Math.random() * names.length) | 0],
      baseF: a.f, baseT: Math.min(a.t, b.t), hue, dewPerSec: dew,
      parents: [ta.name, tb.name], bornAt: Date.now()
    };
    S.save.board[ia] = null; S.save.board[ib] = null;
    S.save.hybrids[slotIx] = h;
    Audio.sfx('fanfare');
    FX.burst(innerWidth / 2, innerHeight * 0.35, 40, { color: '#C77DFF' });
    UI.banner(`💜 A wild ${h.name} is born! 💜`);
    Pip.say(S.data.pip.hybrid[(Math.random() * S.data.pip.hybrid.length) | 0], 'cheer', 4000);
    UI.toast(`${h.name} earns 💧${dew}/s on its pedestal!`);
    document.dispatchEvent(new CustomEvent('bv:hybrid'));
    this.render();
    UI.refreshHUD();
    Board.render();
    Milestones.check();
    Achievements.check();
    Save.write(S.save);
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
        slot.innerHTML = `<div class="pot"></div>
          <img class="plant-img" src="${S.artFor(p.f, p.t)}" alt="${t.name}" draggable="false">
          <span class="slot-x" data-unslot="${i}">✕</span>`;
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
