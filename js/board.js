/* BLOOMVERSE — the Potting Table: 5x5 merge board, drag-drop + tap-tap, seed packets. */
const Board = {
  selected: -1,
  drag: null,

  init(){
    this.renderPackets();
    this.render();
    const grid = document.getElementById('grid');
    grid.addEventListener('pointerdown', e => this.onDown(e));
    window.addEventListener('pointermove', e => this.onMove(e), { passive: false });
    window.addEventListener('pointerup', e => this.onUp(e));
    grid.addEventListener('contextmenu', e => e.preventDefault());
  },

  /* ---------- rendering ---------- */
  render(){
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    for (let i = 0; i < 25; i++){
      const cell = document.createElement('div');
      cell.className = 'cell'; cell.dataset.i = i;
      const p = S.save.board[i];
      if (p){
        cell.classList.add('filled');
        const t = S.tierOf(p.f, p.t);
        cell.innerHTML = `<div class="plant" data-i="${i}">
            <img src="${S.artFor(p.f, p.t)}" alt="${t.name}" draggable="false">
            <span class="tier-badge">${p.t}</span></div>`;
        if (i === this.selected) cell.classList.add('selected');
      }
      grid.appendChild(cell);
    }
  },

  renderPackets(){
    const row = document.getElementById('packet-row');
    row.innerHTML = '';
    const now = Date.now();
    for (const f of S.data.families){
      const unlocked = S.isFamilyUnlocked(f.id);
      const el = document.createElement('div');
      el.className = 'packet' + (unlocked ? '' : ' locked');
      const readyAt = S.save.spawners[f.id] || 0;
      const waiting = unlocked && readyAt > now;
      el.innerHTML = `
        <img src="${S.artFor(f.id, 1)}" alt="${f.name}" draggable="false">
        <div class="pname">${f.name}</div>
        ${waiting ? `<div class="cool">${Math.ceil((readyAt - now) / 1000)}s</div>
          <button class="buy" data-buy="${f.id}">⚡${f.instantSproutCoins}</button>` : ''}
        ${!unlocked ? `<div class="cool">🔒</div>` : ''}`;
      el.addEventListener('click', e => {
        const buy = e.target.closest('[data-buy]');
        if (buy){ e.stopPropagation(); this.instantSprout(buy.dataset.buy); return; }
        this.packetTap(f.id);
      });
      row.appendChild(el);
    }
  },

  cellRect(i){
    const el = document.querySelector(`.cell[data-i="${i}"]`);
    if (!el) return { x: innerWidth / 2, y: innerHeight / 2 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  },

  /* ---------- packets ---------- */
  packetTap(fid){
    Audio.unlock();
    if (!S.isFamilyUnlocked(fid)){
      Audio.sfx('error');
      const f = S.family(fid);
      UI.toast(`${f.name} unlock in the Astral Solarium wing (60 Renown).`);
      return;
    }
    const now = Date.now();
    if ((S.save.spawners[fid] || 0) > now){
      const s = Math.ceil((S.save.spawners[fid] - now) / 1000);
      Audio.sfx('click');
      UI.toast(`Seeds resting… ready in ${s}s (or tap ⚡ for instant).`);
      return;
    }
    this.doSprout(fid, false);
  },

  instantSprout(fid){
    Audio.unlock();
    const f = S.family(fid);
    if (S.save.coins < f.instantSproutCoins){
      Audio.sfx('error'); UI.toast(`Need ${f.instantSproutCoins} coins for instant sprout.`);
      return;
    }
    if (S.emptyCell() < 0){
      Audio.sfx('error'); UI.toast('Garden is full! Merge, sell or move plants first.');
      return;
    }
    S.addCoins(-f.instantSproutCoins);
    this.doSprout(fid, true);
  },

  doSprout(fid, instant){
    const cell = S.emptyCell();
    if (cell < 0){ Audio.sfx('error'); UI.toast('Garden is full! Merge, sell or move plants first.'); return; }
    S.save.board[cell] = { f: fid, t: 1 };
    S.save.spawners[fid] = Date.now() + S.spawnerCooldownSec(fid) * 1000;
    S.discover(fid, 1);
    S.save.stats.sprouts++;
    Audio.sfx('sprout');
    this.selected = -1;
    this.render(); this.renderPackets();
    UI.refreshHUD();
    const cellEl = document.querySelector(`.cell[data-i="${cell}"] .plant`);
    if (cellEl) cellEl.classList.add('spawn');
    const r = this.cellRect(cell);
    FX.burst(r.x, r.y, 8, { color: '#8FAE8B' });
    document.dispatchEvent(new CustomEvent('bv:sprout'));
    Achievements.check();
    Save.write(S.save);
  },

  /* ---------- drag & drop ---------- */
  onDown(e){
    const plant = e.target.closest('.plant');
    if (!plant) return;
    Audio.unlock();
    const from = parseInt(plant.dataset.i, 10);
    this.drag = { from, sx: e.clientX, sy: e.clientY, active: false, target: -1, pid: e.pointerId };
  },

  onMove(e){
    const d = this.drag;
    if (!d || e.pointerId !== d.pid) return;
    const dist = Math.hypot(e.clientX - d.sx, e.clientY - d.sy);
    if (!d.active && dist > 12){
      d.active = true;
      const p = S.save.board[d.from];
      const ghost = document.getElementById('drag-ghost');
      ghost.innerHTML = `<img src="${S.artFor(p.f, p.t)}" draggable="false">`;
      ghost.style.display = 'block';
      this.selected = -1;
      const srcCell = document.querySelector(`.cell[data-i="${d.from}"]`);
      if (srcCell) srcCell.style.opacity = '0.35';
    }
    if (d.active){
      e.preventDefault();
      const ghost = document.getElementById('drag-ghost');
      ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
      document.querySelectorAll('.cell.drop-target,.cell.merge-target').forEach(c => c.classList.remove('drop-target', 'merge-target'));
      const under = document.elementFromPoint(e.clientX, e.clientY);
      const cell = under ? under.closest('.cell') : null;
      d.target = -1;
      if (cell){
        const to = parseInt(cell.dataset.i, 10);
        if (to !== d.from){
          d.target = to;
          const a = S.save.board[d.from], b = S.save.board[to];
          if (b && a.f === b.f && a.t === b.t && a.t < 8) cell.classList.add('merge-target');
          else cell.classList.add('drop-target');
        }
      }
    }
  },

  onUp(e){
    const d = this.drag;
    if (!d || e.pointerId !== d.pid) return;
    this.drag = null;
    document.getElementById('drag-ghost').style.display = 'none';
    document.querySelectorAll('.cell').forEach(c => { c.style.opacity = ''; c.classList.remove('drop-target', 'merge-target'); });
    if (d.active){
      if (d.target >= 0) this.resolveDrop(d.from, d.target);
      else this.render();
    } else {
      this.onTap(d.from);
    }
  },

  onTap(i){
    Audio.sfx('click');
    if (this.selected === -1){
      if (S.save.board[i]){ this.selected = i; this.render(); }
    } else if (this.selected === i){
      this.selected = -1; this.render();
      this.plantAction(i);
    } else {
      const from = this.selected;
      this.selected = -1;
      this.resolveDrop(from, i);
    }
  },

  resolveDrop(from, to){
    const a = S.save.board[from], b = S.save.board[to];
    if (!a){ this.render(); return; }
    if (!b){
      S.save.board[to] = a; S.save.board[from] = null;
      Audio.sfx('drop');
    } else if (a.f === b.f && a.t === b.t && a.t < 8){
      this.doMerge(from, to);
      return;
    } else {
      S.save.board[to] = a; S.save.board[from] = b;
      Audio.sfx('drop');
    }
    this.render();
    Save.write(S.save);
  },

  doMerge(from, to){
    const a = S.save.board[from];
    const nt = a.t + 1;
    S.save.board[to] = { f: a.f, t: nt };
    S.save.board[from] = null;
    S.save.stats.merges++;
    S.discover(a.f, nt);
    Audio.sfx('merge', { tier: nt });
    this.render();
    const cellEl = document.querySelector(`.cell[data-i="${to}"] .plant`);
    if (cellEl) cellEl.classList.add('pop');
    const r = this.cellRect(to);
    FX.burst(r.x, r.y, 10 + nt * 2);
    FX.floatText(r.x, r.y - 20, S.tierOf(a.f, nt).name);
    // golden merge surprise (5%)
    if (Math.random() < 0.05){
      const bonus = S.tierOf(a.f, nt).sellCoins;
      S.addCoins(bonus);
      Audio.sfx('coin');
      FX.floatText(r.x, r.y - 52, '+' + UI.fmt(bonus) + ' coins!', '#B9862F');
      UI.banner('✨ Golden Merge! ✨');
    }
    document.dispatchEvent(new CustomEvent('bv:merge'));
    UI.refreshHUD();
    Achievements.check();
    Save.write(S.save);
  },

  /* ---------- plant action sheet ---------- */
  plantAction(i){
    const p = S.save.board[i];
    if (!p) return;
    const t = S.tierOf(p.f, p.t), f = S.family(p.f);
    const canSolarium = p.t >= 4 && S.save.solarium.slice(0, S.solariumSlotCount()).some(s => !s);
    const m = UI.modal(`<h2>${t.name}</h2>
      <div class="m-plant"><img src="${S.artFor(p.f, p.t)}"><div>
        <div style="font-weight:800">${f.name} · Tier ${p.t}/8</div>
        <div style="font-size:13px;color:var(--muted);font-weight:600">${t.desc}</div>
        <div style="font-size:13px;font-weight:700;margin-top:4px">Sells for ${UI.fmt(t.sellCoins)} coins · ${t.dewPerSec}/s in Solarium</div>
      </div></div>
      <div class="btn-row"><button class="btn btn-gold" id="pa-sell">Sell +${UI.fmt(t.sellCoins)}</button></div>
      <div class="btn-row"><button class="btn btn-soft" id="pa-sol" ${canSolarium ? '' : 'disabled'}>Move to Solarium${p.t < 4 ? ' (Tier 4+)' : ''}</button></div>
      <div class="btn-row"><button class="btn btn-soft" id="pa-close">Close</button></div>`);
    m.querySelector('#pa-close').onclick = () => UI.closeModal();
    m.querySelector('#pa-sell').onclick = () => { UI.closeModal(); this.sellPlant(i); };
    const solBtn = m.querySelector('#pa-sol');
    if (canSolarium) solBtn.onclick = () => { UI.closeModal(); this.moveToSolarium(i); };
  },

  sellPlant(i){
    const p = S.save.board[i];
    if (!p) return;
    let v = S.tierOf(p.f, p.t).sellCoins;
    if (S.save.boosts.mergeValueMerges > 0){ v *= 2; S.save.boosts.mergeValueMerges--; }
    S.save.board[i] = null;
    S.addCoins(v);
    Audio.sfx('coin');
    const r = this.cellRect(i);
    FX.floatText(r.x, r.y - 10, '+' + UI.fmt(v), '#B9862F');
    this.selected = -1;
    this.render();
    Save.write(S.save);
  },

  moveToSolarium(i){
    const p = S.save.board[i];
    if (!p) return;
    const slots = S.solariumSlotCount();
    const si = S.save.solarium.slice(0, slots).findIndex(s => !s);
    if (si < 0){ Audio.sfx('error'); UI.toast('Solarium is full! Unlock the Astral Solarium for +2 slots.'); return; }
    S.save.board[i] = null;
    S.save.solarium[si] = p;
    S.save.stats.solariumMoves++;
    Audio.sfx('success');
    const r = this.cellRect(i);
    FX.burst(r.x, r.y, 12, { color: '#7FB3C9' });
    UI.toast(`${S.tierOf(p.f, p.t).name} moved to the Solarium ☀️`);
    document.dispatchEvent(new CustomEvent('bv:solarium'));
    this.selected = -1;
    this.render();
    UI.refreshHUD();
    Achievements.check();
    Save.write(S.save);
  }
};
