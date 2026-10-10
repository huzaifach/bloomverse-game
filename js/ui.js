/* BLOOMVERSE — HUD, tabs, modals, toasts, formatting. */
const UI = {
  ICONS: {
    coin: '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" fill="#E8B64C" stroke="#B9862F" stroke-width="2"/><circle cx="12" cy="12" r="4.5" fill="#F6DE9C"/></svg>',
    dew: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2.5C12 2.5 5.5 11 5.5 15a6.5 6.5 0 0 0 13 0C18.5 11 12 2.5 12 2.5Z" fill="#7FB3C9" stroke="#4E8CA3" stroke-width="2"/><ellipse cx="9.5" cy="14.5" rx="1.6" ry="2.4" fill="#DFF2FA"/></svg>',
    renown: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" fill="#D98E6A" stroke="#A85F3C" stroke-width="1.6" stroke-linejoin="round"/></svg>',
    seed: '<svg viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="13" rx="6" ry="8" fill="#8A6F55" stroke="#6B4F3A" stroke-width="2" transform="rotate(20 12 13)"/><path d="M12 5c0-2 1-3.5 3-4" stroke="#6E8F6A" stroke-width="2" stroke-linecap="round"/></svg>',
    soundOn: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="#8A6F55"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" stroke="#8A6F55" stroke-width="2" stroke-linecap="round"/></svg>',
    soundOff: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="#A68B6B"/><path d="M16 9l6 6M22 9l-6 6" stroke="#A68B6B" stroke-width="2" stroke-linecap="round"/></svg>'
  },

  init(){
    document.querySelectorAll('#tabs .tab').forEach(t => {
      t.addEventListener('click', () => { Audio.unlock(); Audio.sfx('click'); this.switchTab(t.dataset.screen); });
    });
    document.getElementById('btn-sound').addEventListener('click', () => Settings.toggleSound());
    document.getElementById('pill-coins').addEventListener('click', () => this.switchTab('haven'));
    document.getElementById('pill-dew').addEventListener('click', () => this.switchTab('solarium'));
    document.getElementById('pill-renown').addEventListener('click', () => this.switchTab('haven'));
    document.getElementById('pill-seeds').addEventListener('click', () => Seeds.useDialog());
    this.refreshSoundIcon();
  },

  switchTab(name){
    document.querySelectorAll('#tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.screen === name));
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
    window.scrollTo(0, 0);
    if (name === 'solarium') Solarium.render();
    if (name === 'orders') Orders.render();
    if (name === 'goals') Milestones.render();
    if (name === 'haven'){ Rooms.render(); Shop.render(); Achievements.render(); Prestige.render(); }
    if (name === 'board') Board.render();
  },

  fmt(n){
    if (n === undefined || n === null || isNaN(n)) return '0';
    n = Math.floor(n * 10) / 10;
    if (n < 1000) return (n % 1 === 0) ? String(n) : n.toFixed(1);
    const units = ['k', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
    let u = -1, v = n;
    while (v >= 1000 && u < units.length - 1){ v /= 1000; u++; }
    const str = v >= 100 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, '');
    return str + units[u];
  },

  refreshHUD(){
    const sv = S.save;
    const crate = S.coinPerSecond();
    const coinEl = document.getElementById('pill-coins');
    coinEl.innerHTML = this.ICONS.coin + '<span>' + this.fmt(sv.coins) + '</span>';
    coinEl.title = 'Coins' + (crate > 0 ? ` (+${crate.toFixed(1)}/s idle)` : '');
    const rate = S.dewPerSecond();
    const dewEl = document.getElementById('pill-dew');
    dewEl.innerHTML = this.ICONS.dew + '<span>' + this.fmt(sv.dewdrops) + '</span>';
    dewEl.title = 'Dewdrops (' + rate.toFixed(1) + '/s)';
    document.getElementById('pill-renown').innerHTML = this.ICONS.renown + '<span>' + this.fmt(sv.renown) + '</span>';
    document.getElementById('pill-seeds').innerHTML = this.ICONS.seed + '<span>' + sv.seeds + '</span>';
  },

  bumpPill(id){
    const el = document.getElementById(id);
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
  },

  /* Number badges on tabs: show the player where action is waiting. */
  updateBadges(){
    const set = (screen, n) => {
      const tab = document.querySelector(`#tabs .tab[data-screen="${screen}"]`);
      if (!tab) return;
      let b = tab.querySelector('.tab-badge');
      if (n > 0){
        if (!b){ b = document.createElement('span'); b.className = 'tab-badge'; tab.appendChild(b); }
        b.textContent = n > 9 ? '9+' : n;
      } else if (b) b.remove();
    };
    // garden: mergeable pairs waiting
    let pairs = 0;
    try {
      const seen = {}, b = S.G().board;
      for (let i = 0; i < b.length; i++){
        const p = b[i];
        if (!p || p.t >= 8) continue;
        const k = p.f + ':' + p.t;
        if (seen[k] !== undefined){ pairs++; delete seen[k]; }
        else seen[k] = i;
      }
    } catch(e){}
    set('board', pairs);
    // orders: fulfillable right now
    let ready = 0;
    try { ready = (S.save.orders || []).filter(o => Orders.canFulfill(o)).length; } catch(e){}
    set('orders', ready);
    // solarium: tappable dew bubbles
    let bub = 0;
    try { bub = (Solarium.bubbles || []).length; } catch(e){}
    set('solarium', bub);
    // haven: daily reward unclaimed
    let daily = 0;
    try { daily = (Daily.dayStr() !== (S.save.daily.lastClaim || '')) ? 1 : 0; } catch(e){}
    set('haven', daily);
    // goals: claimable milestones + completable daily challenge
    let gr = 0;
    try {
      gr = (S.save.milestonesReady || []).length;
      const ch = S.save.challenge || {};
      if (ch.date && ch.progress >= ch.target && !ch.claimed) gr++;
    } catch(e){}
    set('goals', gr);
    const gp = document.getElementById('goals-pct');
    if (gp){
      const total = (S.data.milestones || []).length;
      const done = (S.save.milestones || []).length;
      gp.textContent = total ? `${done}/${total} claimed` : '';
    }
  },

  refreshSoundIcon(){
    document.getElementById('btn-sound').innerHTML = S.save.settings.sound ? this.ICONS.soundOn : this.ICONS.soundOff;
  },

  toast(msg, ms = 2600){
    const root = document.getElementById('toast-root');
    while (root.children.length >= 3) root.firstChild.remove();
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, ms);
  },

  banner(html, ms = 2200){
    const root = document.getElementById('banner-root');
    root.innerHTML = '';
    const el = document.createElement('div');
    el.className = 'banner'; el.innerHTML = html;
    root.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 420); }, ms);
  },

  modalQueue: [],

  whenModalFree(fn){
    const root = document.getElementById('modal-root');
    if (root.classList.contains('open')) this.modalQueue.push(fn);
    else fn();
  },

  modal(html, dismiss = true){
    const root = document.getElementById('modal-root');
    root.innerHTML = '<div class="modal">' + html + '</div>';
    root.classList.add('open');
    this.modalOpen = true;
    if (dismiss){
      root.onclick = e => { if (e.target === root) this.closeModal(); };
    } else root.onclick = null;
    return root.querySelector('.modal');
  },

  closeModal(){
    const root = document.getElementById('modal-root');
    root.classList.remove('open'); root.innerHTML = '';
    this.modalOpen = false;
    const fn = this.modalQueue.shift();
    if (fn) setTimeout(fn, 200);
  },

  confirm(title, text, okLabel = 'Confirm'){
    return new Promise(resolve => {
      const m = this.modal(`<h2>${title}</h2><p style="text-align:center;font-weight:600">${text}</p>
        <div class="btn-row"><button class="btn btn-soft" id="cf-no">Cancel</button>
        <button class="btn" id="cf-yes">${okLabel}</button></div>`, false);
      m.querySelector('#cf-no').onclick = () => { this.closeModal(); resolve(false); };
      m.querySelector('#cf-yes').onclick = () => { this.closeModal(); resolve(true); };
    });
  },

  howTo(){
    Audio.sfx('click');
    const m = this.modal(`<h2>How to Play</h2>
      <div style="font-weight:600;line-height:1.65;font-size:14px">
      <p>🌱 <b>Sprout:</b> tap a seed packet to plant instantly — it costs a few coins, no waiting!</p>
      <p>🪴 <b>Merge:</b> drag two identical plants together to evolve them (Tiers 1–8). Merges in a row build COMBOS!</p>
      <p>💥 <b>Bloom Burst:</b> the glowing button merges everything on the board at once.</p>
      <p>💗 <b>Plants are alive:</b> tap them — they giggle! Happy plants (💛) sell for +25%.</p>
      <p>🧚 <b>Pip:</b> your fairy companion. She celebrates every milestone with free gifts!</p>
      <p>🔮 <b>Hybrid Lab:</b> cross-breed two Tier 5+ plants of different families (Astral Solarium).</p>
      <p>🌳 <b>Expand:</b> grow your garden from 4x4 all the way to 8x8!</p>
      <p>📜 <b>Orders:</b> magical visitors request plants. Fill orders for coins, renown &amp; mystery seeds.</p>
      <p>☀️ <b>Solarium:</b> move Tier 4+ plants here to earn Dewdrops — even while you're away.</p>
      <p>🏡 <b>Wings:</b> spend Renown to unlock greenhouse wings with real powers.</p>
      <p>📖 <b>Bloompedia:</b> discover all 32 plants across 4 families.</p>
      <p>💡 Stuck with a full board? Sell plants, fill orders, or move elders to the Solarium.</p>
      </div>
      <button class="btn" id="how-ok" style="margin-top:8px">Let's Grow!</button>`);
    m.querySelector('#how-ok').onclick = () => this.closeModal();
  }
};

/* Mystery seeds */
const Seeds = {
  useDialog(){
    Audio.sfx('click');
    const n = S.save.seeds;
    const m = UI.modal(`<h2>Mystery Seeds</h2>
      <p style="text-align:center;font-weight:700">You have <b>${n}</b> mystery seed${n === 1 ? '' : 's'}.<br>
      Each sprouts a surprise plant (Tier 1–3).</p>
      <div class="btn-row"><button class="btn btn-soft" id="ms-close">Close</button>
      <button class="btn" id="ms-plant" ${n <= 0 ? 'disabled' : ''}>Plant One</button></div>`);
    m.querySelector('#ms-close').onclick = () => UI.closeModal();
    m.querySelector('#ms-plant').onclick = () => { UI.closeModal(); this.plantOne(); };
  },

  plantOne(){
    if (S.save.seeds <= 0){ UI.toast('No mystery seeds left — earn them from orders!'); return; }
    const cell = S.emptyCell();
    if (cell < 0){ Audio.sfx('error'); UI.toast('Garden is full! Merge, sell or move plants first.'); return; }
    const fams = S.unlockedFamilies();
    const f = fams[(Math.random() * fams.length) | 0];
    const t = 1 + ((Math.random() * 3) | 0);
    S.save.seeds--;
    S.G().board[cell] = { f: f.id, t };
    S.discover(f.id, t);
    S.save.stats.sprouts++;
    Challenge.bump('plant');
    Audio.sfx('sprout');
    Board.render();
    UI.refreshHUD();
    document.dispatchEvent(new CustomEvent('bv:sprout'));
    Achievements.check();
    Save.write(S.save);
    const r = Board.cellRect(cell);
    FX.burst(r.x, r.y, 10);
    UI.toast(`A wild ${S.tierOf(f.id, t).name} appears!`);
  }
};
