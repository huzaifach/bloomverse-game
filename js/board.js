/* BLOOMVERSE V2 — the Garden: dynamic 4x4→8x8 merge board, instant paid seeding,
   merge combos, Bloom Burst, plant happiness, tap-giggle, board expansion. */
const Board = {
  selected: -1,
  drag: null,
  combo: { n: 0, until: 0 },

  init(){
    this.renderPackets();
    this.render();
    const grid = document.getElementById('grid');
    grid.addEventListener('pointerdown', e => this.onDown(e));
    window.addEventListener('pointermove', e => this.onMove(e), { passive: false });
    window.addEventListener('pointerup', e => this.onUp(e));
    grid.addEventListener('contextmenu', e => e.preventDefault());
  },

  size(){ return S.G().gridSize || 4; },

  /* ---------- rendering ---------- */
  render(){
    const n = this.size();
    const grid = document.getElementById('grid');
    grid.style.setProperty('--n', n);
    document.getElementById('board-wrap').classList.toggle('grove', (S.save.activeGarden || 0) === 1);
    grid.innerHTML = '';
    for (let i = 0; i < n * n; i++){
      const cell = document.createElement('div');
      cell.className = 'cell'; cell.dataset.i = i;
      const p = S.G().board[i];
      if (p){
        cell.classList.add('filled');
        if (p.weed){
          cell.innerHTML = `<div class="weed-plant" data-i="${i}">🌿</div>`;
        } else {
        if (p.hap >= 80) cell.classList.add('joyful');
        const t = S.tierOf(p.f, p.t);
        const delay = (-(i * 0.7) % 3.8).toFixed(2);
        cell.innerHTML = `<div class="plant${p.golden ? ' golden' : ''}" data-i="${i}">
            <img src="${S.artFor(p.f, p.t)}" alt="${t.name}" draggable="false" style="animation-delay:${delay}s">
            <span class="tier-badge">${p.t}</span></div>`;
        }
        if (i === this.selected) cell.classList.add('selected');
      }
      grid.appendChild(cell);
    }
    // subtle merge hints: pulse every twin of the selected plant
    if (this.selected >= 0){
      const s = S.G().board[this.selected];
      if (s && s.t < 8){
        for (let i = 0; i < n * n; i++){
          if (i === this.selected) continue;
          const p = S.G().board[i];
          if (p && !p.weed && p.f === s.f && p.t === s.t){
            const c = grid.children[i];
            if (c) c.classList.add('merge-hint');
          }
        }
      }
    }
    this.renderTopBar();
  },

  renderTopBar(){
    let bar = document.getElementById('garden-level');
    if (!bar){
      bar = document.createElement('div');
      bar.id = 'garden-level';
      const wrap = document.getElementById('board-wrap');
      wrap.insertBefore(bar, wrap.firstChild);
    }
    const burstCost = S.burstCost();
    const canBurst = S.save.coins >= burstCost && this.findMergePair() !== -1;
    const groveOpen = S.isGroveUnlocked();
    const ag = S.save.activeGarden || 0;
    const merges = S.save.stats.merges || 0;
    const xpPct = Math.round((merges % 20) / 20 * 100);
    bar.innerHTML = `<div class="garden-tabs">
        <button class="gtab${ag === 0 ? ' active' : ''}" data-g="0">☀️ Meadow</button>
        <button class="gtab${ag === 1 ? ' active' : ''}" data-g="1" ${groveOpen ? '' : 'disabled'}>🌙 Grove${groveOpen ? '' : ' 🔒'}</button>
      </div>
      <div class="lvl">🌱 Garden Lv ${S.gardenLevel()}<div class="xpbar"><div style="width:${xpPct}%"></div></div></div>
      ${Weather.pillHTML()}
      <button id="bloom-burst" ${canBurst ? '' : 'disabled'}>💥 Burst 🪙${UI.fmt(burstCost)}</button>`;
    bar.querySelectorAll('.gtab').forEach(b => b.onclick = () => S.switchGarden(parseInt(b.dataset.g, 10)));
    const bb = document.getElementById('bloom-burst');
    if (canBurst) bb.onclick = () => this.bloomBurst();
    this.renderExpandBtn();
  },

  renderExpandBtn(){
    let old = document.getElementById('expand-btn');
    if (old) old.remove();
    const n = this.size();
    if (n >= 8) return;
    const ex = S.data.expansions.expansions.find(e => e.size === n + 1);
    if (!ex) return;
    const btn = document.createElement('button');
    btn.id = 'expand-btn';
    btn.className = 'btn btn-gold';
    const c = ex.cost;
    const label = `Expand Garden to ${n + 1}x${n + 1} — 🪙${UI.fmt(c.coins)}${c.dewdrops ? ` + 💧${UI.fmt(c.dewdrops)}` : ''}`;
    btn.textContent = label;
    btn.disabled = S.save.coins < c.coins || (c.dewdrops && S.save.dewdrops < c.dewdrops);
    btn.onclick = () => this.expandGarden(ex);
    document.getElementById('board-wrap').appendChild(btn);
  },

  expandGarden(ex){
    const c = ex.cost;
    if (S.save.coins < c.coins || (c.dewdrops && S.save.dewdrops < c.dewdrops)){
      Audio.sfx('error'); UI.toast('Not enough resources yet — keep growing!'); return;
    }
    S.addCoins(-c.coins);
    if (c.dewdrops) S.addDew(-c.dewdrops);
    const oldN = this.size(), newN = ex.size;
    const oldBoard = S.G().board.slice();
    S.G().board = new Array(newN * newN).fill(null);
    for (let i = 0; i < oldBoard.length; i++) S.G().board[i] = oldBoard[i];
    S.G().gridSize = newN;
    Audio.sfx('fanfare');
    UI.banner(`🌳 Garden expanded to ${newN}x${newN}!`);
    Pip.say(S.data.pip.expansion[(Math.random() * S.data.pip.expansion.length) | 0], 'cheer');
    FX.burst(innerWidth / 2, innerHeight / 2, 30);
    this.selected = -1;
    this.render(); this.renderPackets();
    document.dispatchEvent(new CustomEvent('bv:expand'));
    Milestones.check();
    Save.write(S.save);
  },

  renderPackets(){
    // perf: only rebuild when affordability/tier changes (called every tick)
    const st = S.seedTier();
    const sig = st + '|' + S.data.families.map(f => (S.isFamilyUnlocked(f.id) ? '1' : '0') + (S.save.coins >= S.seedCost(f.id) ? '1' : '0')).join('');
    if (sig === this._packetSig) return;
    this._packetSig = sig;
    const row = document.getElementById('packet-row');
    row.innerHTML = '';
    for (const f of S.data.families){
      const unlocked = S.isFamilyUnlocked(f.id);
      const cost = S.seedCost(f.id);
      const afford = S.save.coins >= cost;
      const el = document.createElement('div');
      el.className = 'packet' + (unlocked ? '' : ' locked') + (unlocked && !afford ? ' cant' : '');
      el.innerHTML = `
        <img src="${S.artFor(f.id, st)}" alt="${f.name}" draggable="false">
        <div class="pname">${f.name}</div>
        ${unlocked ? `<div class="cost">🪙${cost}</div><div class="ptier">Tier ${st}</div>` : `<div class="cost">🔒</div>`}`;
      el.title = unlocked ? `Tap to plant a Tier ${st} instantly — ${cost} coins, no waiting!` : 'Unlock via Haven rooms';
      el.addEventListener('click', () => this.packetTap(f.id));
      row.appendChild(el);
    }
  },

  cellRect(i){
    const el = document.querySelector(`.cell[data-i="${i}"]`);
    if (!el) return { x: innerWidth / 2, y: innerHeight / 2 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  },

  /* ---------- instant paid seeding (no waiting, ever) ---------- */
  packetTap(fid){
    Audio.unlock();
    if (!S.isFamilyUnlocked(fid)){
      Audio.sfx('error');
      UI.toast(`${S.family(fid).name} unlock in the Astral Solarium wing (60 Renown).`);
      return;
    }
    const cost = S.seedCost(fid);
    if (S.save.coins < cost){
      Audio.sfx('error'); UI.toast(`Need ${cost} coins to plant. Fill an order or sell a plant!`);
      return;
    }
    if (S.emptyCell() < 0){
      Audio.sfx('error'); UI.toast('Garden is full! Merge, sell or move plants first.');
      return;
    }
    S.addCoins(-cost);
    const cell = S.emptyCell();
    const ptier = S.seedTier();
    S.G().board[cell] = { f: fid, t: ptier, hap: 20 };
    S.discover(fid, ptier);
    S.save.stats.sprouts++;
    S.bumpSeedStreak(fid);
    Challenge.bump('plant');
    Audio.sfx('sprout');
    this.selected = -1;
    this.render(); this.renderPackets();
    const cellEl = document.querySelector(`.cell[data-i="${cell}"] .plant`);
    if (cellEl) cellEl.classList.add('spawn');
    const r = this.cellRect(cell);
    FX.burst(r.x, r.y, 10, { color: '#8FE063' });
    FX.floatText(r.x, r.y - 24, S.tierOf(fid, ptier).name, '#2E7D32');
    document.dispatchEvent(new CustomEvent('bv:sprout'));
    Milestones.check();
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
      const p = S.G().board[d.from];
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
          const a = S.G().board[d.from], b = S.G().board[to];
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
      if (S.G().board[i]){
        if (S.G().board[i].weed){
          UI.toast('🌿 A weed! Drag two weeds together to clear them.');
          return;
        }
        this.selected = i;
        const cellEl = document.querySelector(`.cell[data-i="${i}"] .plant`);
        if (cellEl){ cellEl.classList.remove('giggle'); void cellEl.offsetWidth; cellEl.classList.add('giggle'); }
        this.render();
      }
    } else if (this.selected === i){
      this.selected = -1;
      this.giggle(i);
      this.plantAction(i);
    } else {
      const from = this.selected;
      this.selected = -1;
      this.resolveDrop(from, i);
    }
  },

  /* ---------- plants are alive: tap → giggle ---------- */
  giggle(i){
    const p = S.G().board[i];
    if (!p) return;
    const now = Date.now();
    if (p._giggleAt && now - p._giggleAt < 2500) return; // don't spam
    p._giggleAt = now;
    p.hap = Math.min(100, (p.hap || 0) + Math.round(10 * S.hapMult()));
    const cellEl = document.querySelector(`.cell[data-i="${i}"] .plant`);
    if (cellEl){
      cellEl.classList.remove('giggle'); void cellEl.offsetWidth; cellEl.classList.add('giggle');
      const bub = document.createElement('div');
      bub.className = 'giggle-bub';
      const fam = S.data.giggles.family[p.f], gen = S.data.giggles.generic;
      const pool = Math.random() < 0.45 && fam ? fam : gen;
      bub.textContent = pool[(Math.random() * pool.length) | 0];
      cellEl.appendChild(bub);
      setTimeout(() => bub.remove(), 1450);
    }
    const r = this.cellRect(i);
    FX.hearts(r.x, r.y - 30);
    Audio.sfx('bubble');
    document.dispatchEvent(new CustomEvent('bv:giggle'));
    if (p.hap >= 80) this.render();
    Save.write(S.save);
  },

  resolveDrop(from, to){
    const a = S.G().board[from], b = S.G().board[to];
    if (!a){ this.render(); return; }
    // weeds: drag two weeds together to clear them
    if (a.weed && b && b.weed){
      S.G().board[from] = null; S.G().board[to] = null;
      S.save.stats.weedsCleared = (S.save.stats.weedsCleared || 0) + 2;
      const reward = Math.round(120 * S.gardenLevel() * Prestige.coinMult());
      S.addCoins(reward);
      FX.burst(innerWidth / 2, innerHeight / 2, 16, { color: '#6BCB77' });
      FX.floatText(innerWidth / 2, innerHeight / 2 - 40, `Weeds cleared! +${UI.fmt(reward)} 🪙`, '#2E7D32');
      Audio.sfx('merge');
      Pip.say('Weeds gone! The garden can breathe again!', 'cheer', 2500);
      this.selected = -1;
      this.render();
      Save.write(S.save);
      return;
    }
    if (!b){
      S.G().board[to] = a; S.G().board[from] = null;
      Audio.sfx('drop');
    } else if (!a.weed && !b.weed && a.f === b.f && a.t === b.t && a.t < 8){
      this.doMerge(from, to);
      return;
    } else {
      S.G().board[to] = a; S.G().board[from] = b;
      Audio.sfx('drop');
    }
    this.render();
    Save.write(S.save);
  },

  doMerge(from, to){
    const a = S.G().board[from];
    const nt = a.t + 1;
    const now = Date.now();
    // combo tracking
    if (now < this.combo.until) this.combo.n++;
    else this.combo.n = 1;
    this.combo.until = now + 4000;
    const comboN = this.combo.n;

    const newHap = Math.min(100, Math.max(a.hap || 0, 40) + Math.round(nt * 4 * S.hapMult()));
    // rainbow rain buff: next N merges are golden
    let golden;
    if ((S.save.boosts.rainbowMerges || 0) > 0){
      golden = true;
      S.save.boosts.rainbowMerges--;
    } else {
      // golden surprise: 3% of merges produce a rare golden plant (3x value)
      golden = Math.random() < 0.03 * Weather.goldenMult() + Prestige.luckBonus();
    }
    S.G().board[to] = { f: a.f, t: nt, hap: newHap, golden: golden || undefined };
    S.G().board[from] = null;
    if (golden){
      S.save.stats.goldenMerges = (S.save.stats.goldenMerges || 0) + 1;
      UI.banner('🌟 GOLDEN PLANT! 🌟<br><span style="font-size:15px">Worth 3× coins!</span>');
      Audio.sfx('fanfare');
      Challenge.bump('golden');
    }
    Challenge.bump('merges');
    Challenge.bump('mergesFam', a.f);
    // neighbors feel the joy
    const n = this.size();
    const fx = to % n, fy = (to / n) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++){
      const nx = fx + dx, ny = fy + dy;
      if (nx < 0 || ny < 0 || nx >= n || ny >= n) continue;
      const q = S.G().board[ny * n + nx];
      if (q) q.hap = Math.min(100, (q.hap || 0) + Math.round(6 * S.hapMult()));
    }

    S.save.stats.merges++;
    S.discover(a.f, nt);
    Audio.sfx('merge', { tier: nt });
    this.render();
    const cellEl = document.querySelector(`.cell[data-i="${to}"] .plant`);
    if (cellEl) cellEl.classList.add('pop');
    const r = this.cellRect(to);
    FX.burst(r.x, r.y, 12 + nt * 3);
    FX.floatText(r.x, r.y - 20, S.tierOf(a.f, nt).name, '#2E7D32');
    if (comboN >= 2){
      const bonus = (comboN - 1) * nt * 3;
      S.addCoins(bonus);
      const tag = document.createElement('div');
      tag.className = 'combo-tag';
      tag.textContent = `COMBO ×${comboN}! +${bonus}`;
      tag.style.left = r.x + 'px'; tag.style.top = (r.y - 60) + 'px';
      document.body.appendChild(tag);
      setTimeout(() => tag.remove(), 850);
      Audio.sfx('coin');
    }
    if (comboN >= 3){
      Pip.say(S.data.pip.big_merge[(Math.random() * S.data.pip.big_merge.length) | 0], 'cheer', 2500);
    } else if (Math.random() < 0.25){
      Pip.say(S.data.pip.merge[(Math.random() * S.data.pip.merge.length) | 0], 'wave', 2200);
    }
    // golden merge surprise (5%)
    if (Math.random() < 0.05){
      const bonus = S.tierOf(a.f, nt).sellCoins;
      S.addCoins(bonus);
      Audio.sfx('coin');
      FX.floatText(r.x, r.y - 52, '+' + UI.fmt(bonus) + ' coins!', '#B9862F');
      UI.banner('✨ Golden Merge! ✨');
    }
    document.dispatchEvent(new CustomEvent('bv:merge'));
    this.renderPackets();
    Milestones.check();
    Achievements.check();
    Save.write(S.save);
  },

  findMergePair(){
    const b = S.G().board;
    const seen = {};
    for (let i = 0; i < b.length; i++){
      const p = b[i];
      if (!p || p.weed || p.t >= 8) continue;
      const k = p.f + ':' + p.t;
      if (seen[k] !== undefined) return [seen[k], i];
      seen[k] = i;
    }
    return -1;
  },

  bloomBurst(){
    if (this.findMergePair() === -1){ UI.toast('No merges available right now.'); return; }
    const cost = S.burstCost();
    if (S.save.coins < cost){ UI.toast('Not enough coins for Bloom Burst!'); Audio.sfx('error'); return; }
    S.addCoins(-cost);
    S.save.stats.bursts = (S.save.stats.bursts || 0) + 1;
    Challenge.bump('bursts');
    Audio.sfx('fanfare');
    UI.banner('💥 BLOOM BURST! 💥');
    Pip.say('WATCH THIS! Everything merges at ONCE!', 'cheer', 3000);
    this._burstWave();
  },

  /* one wave = every currently-mergeable pair, lowest tier first;
     then re-scan: newly formed plants chain into the next wave until nothing merges */
  _burstWave(){
    const b = S.G().board;
    const byKey = {};
    const used = new Set();
    const merges = [];
    for (let i = 0; i < b.length; i++){
      const p = b[i];
      if (!p || p.weed || p.t >= 8 || used.has(i)) continue;
      const k = p.f + ':' + p.t;
      if (byKey[k] !== undefined && !used.has(byKey[k])){
        merges.push([byKey[k], i, p.t]);
        used.add(byKey[k]); used.add(i);
        delete byKey[k];
      } else byKey[k] = i;
    }
    if (!merges.length){ this.render(); this.renderTopBar(); UI.updateBadges(); return; }
    merges.sort((x, y) => x[2] - y[2]); // level 1 first, cascading upward
    merges.forEach(([from, to], ix) => {
      setTimeout(() => {
        const bb = S.G().board;
        const a = bb[from], c = bb[to];
        if (a && c && !a.weed && !c.weed && a.f === c.f && a.t === c.t && a.t < 8) this.doMerge(from, to);
        if (ix === merges.length - 1) setTimeout(() => this._burstWave(), 240);
      }, ix * 140);
    });
  },

  /* ---------- plant action sheet ---------- */
  plantAction(i){
    const p = S.G().board[i];
    if (!p) return;
    const t = S.tierOf(p.f, p.t), f = S.family(p.f);
    const v = S.sellValueOf(p);
    const canSolarium = p.t >= 4 && S.save.solarium.slice(0, S.solariumSlotCount()).some(s => !s);
    const mood = p.hap >= 80 ? '💛 Overjoyed! (+25% sell value)' : p.hap >= 40 ? '😊 Happy' : '😐 Content';
    const m = UI.modal(`<h2>${t.name}</h2>
      <div class="m-plant"><img src="${S.artFor(p.f, p.t)}"><div>
        <div style="font-weight:800">${f.name} · Tier ${p.t}/8</div>
        <div style="font-size:13px;color:var(--muted);font-weight:600">${t.desc}</div>
        <div style="font-size:13px;font-weight:700;margin-top:4px">Mood: ${mood}</div>
        <div style="font-size:13px;font-weight:700">Sells for ${UI.fmt(v)} coins · ${t.dewPerSec}/s in Solarium</div>
      </div></div>
      <div class="btn-row"><button class="btn btn-gold" id="pa-sell">Sell +${UI.fmt(v)}</button></div>
      <div class="btn-row"><button class="btn btn-soft" id="pa-sol" ${canSolarium ? '' : 'disabled'}>Move to Solarium${p.t < 4 ? ' (Tier 4+)' : ''}</button></div>
      <div class="btn-row"><button class="btn btn-soft" id="pa-close">Close</button></div>`);
    m.querySelector('#pa-close').onclick = () => UI.closeModal();
    m.querySelector('#pa-sell').onclick = () => { UI.closeModal(); this.sellPlant(i); };
    const solBtn = m.querySelector('#pa-sol');
    if (canSolarium) solBtn.onclick = () => { UI.closeModal(); this.moveToSolarium(i); };
  },

  sellPlant(i){
    const p = S.G().board[i];
    if (!p) return;
    const v = S.sellValueOf(p);
    if (S.save.boosts.mergeValueMerges > 0) S.save.boosts.mergeValueMerges--;
    S.G().board[i] = null;
    S.addCoins(v);
    Audio.sfx('coin');
    const r = this.cellRect(i);
    FX.floatText(r.x, r.y - 10, '+' + UI.fmt(v), '#B9862F');
    FX.hearts(r.x, r.y - 20);
    this.selected = -1;
    this.render();
    this.renderPackets();
    Save.write(S.save);
  },

  moveToSolarium(i){
    const p = S.G().board[i];
    if (!p) return;
    const slots = S.solariumSlotCount();
    const si = S.save.solarium.slice(0, slots).findIndex(s => !s);
    if (si < 0){ Audio.sfx('error'); UI.toast('Solarium is full! Unlock the Astral Solarium for +2 slots.'); return; }
    S.G().board[i] = null;
    S.save.solarium[si] = p;
    S.save.stats.solariumMoves++;
    Audio.sfx('success');
    const r = this.cellRect(i);
    FX.burst(r.x, r.y, 12, { color: '#7FB3C9' });
    UI.toast(`${S.tierOf(p.f, p.t).name} moved to the Solarium ☀️`);
    document.dispatchEvent(new CustomEvent('bv:solarium'));
    this.selected = -1;
    this.render();
    Milestones.check();
    Achievements.check();
    Save.write(S.save);
  }
};
