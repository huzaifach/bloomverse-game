/* BLOOMVERSE — settings, save export/import, reset, share, stats. */
const Settings = {
  open(){
    Audio.sfx('click');
    const st = S.save.settings;
    const m = UI.modal(`<h2>Settings</h2>
      <div class="set-row"><span>🔊 Sound effects</span><button class="toggle${st.sound ? ' on' : ''}" id="set-sound"></button></div>
      <div class="set-row"><span>🎵 Music</span><button class="toggle${st.music ? ' on' : ''}" id="set-music"></button></div>
      <div class="set-row"><span>🌿 Reduced motion</span><button class="toggle${st.reducedMotion ? ' on' : ''}" id="set-motion"></button></div>
      <h3 class="section-title">Save Data</h3>
      <div class="btn-row">
        <button class="btn btn-soft btn-small" id="set-export">Export Save</button>
        <button class="btn btn-soft btn-small" id="set-import">Import Save</button>
      </div>
      <div class="btn-row"><button class="btn btn-soft" id="set-reset" style="color:var(--danger)">Reset Greenhouse</button></div>
      <div class="btn-row"><button class="btn btn-soft" id="set-how">❓ How to Play</button></div>
      <div class="btn-row"><button class="btn" id="set-close">Done</button></div>`);
    m.querySelector('#set-close').onclick = () => UI.closeModal();
    m.querySelector('#set-how').onclick = () => { UI.closeModal(); UI.howTo(); };
    m.querySelector('#set-sound').onclick = e => { this.toggleSound(); e.target.classList.toggle('on'); };
    m.querySelector('#set-music').onclick = e => {
      S.save.settings.music = !S.save.settings.music;
      e.target.classList.toggle('on');
      Audio.setEnabled(S.save.settings.sound, S.save.settings.music);
      if (S.save.settings.music){ Audio.unlock(); Audio.startMusic(); }
      Save.write(S.save);
    };
    m.querySelector('#set-motion').onclick = e => {
      S.save.settings.reducedMotion = !S.save.settings.reducedMotion;
      e.target.classList.toggle('on');
      document.body.classList.toggle('reduced-motion', S.save.settings.reducedMotion);
      FX.setReduced(S.save.settings.reducedMotion);
      Save.write(S.save);
    };
    m.querySelector('#set-export').onclick = () => this.exportSave();
    m.querySelector('#set-import').onclick = () => this.importSave();
    m.querySelector('#set-reset').onclick = () => this.resetAll();
  },

  toggleSound(){
    S.save.settings.sound = !S.save.settings.sound;
    Audio.setEnabled(S.save.settings.sound, S.save.settings.music);
    UI.refreshSoundIcon();
    Save.write(S.save);
    if (S.save.settings.sound) Audio.sfx('click');
  },

  exportSave(){
    const str = Save.exportString(S.save);
    const m = UI.modal(`<h2>Export Save</h2>
      <p style="font-weight:600;font-size:14px">Copy this code to back up your greenhouse, or move it to another device:</p>
      <textarea id="import-export" readonly>${str}</textarea>
      <div class="btn-row"><button class="btn btn-soft" id="ex-copy">Copy</button>
      <button class="btn" id="ex-close">Done</button></div>`);
    m.querySelector('#ex-close').onclick = () => UI.closeModal();
    m.querySelector('#ex-copy').onclick = async () => {
      try { await navigator.clipboard.writeText(str); UI.toast('Save code copied!'); }
      catch(e){ m.querySelector('#import-export').select(); UI.toast('Select the text and copy it manually.'); }
    };
  },

  importSave(){
    const m = UI.modal(`<h2>Import Save</h2>
      <p style="font-weight:600;font-size:14px">Paste a save code below. This replaces your current greenhouse!</p>
      <textarea id="import-export" placeholder="Paste save code here…"></textarea>
      <div class="btn-row"><button class="btn btn-soft" id="im-cancel">Cancel</button>
      <button class="btn" id="im-go">Import</button></div>`);
    m.querySelector('#im-cancel').onclick = () => UI.closeModal();
    m.querySelector('#im-go').onclick = async () => {
      const str = m.querySelector('#import-export').value;
      try {
        const s = Save.importString(str);
        const ok = await UI.confirm('Import Save?', 'Your current greenhouse will be replaced.', 'Import');
        if (!ok) return;
        S.save = s;
        Save.write(S.save);
        location.reload();
      } catch(e){ Audio.sfx('error'); UI.toast('That save code looks invalid.'); }
    };
  },

  async resetAll(){
    const ok = await UI.confirm('Reset Greenhouse?', 'ALL progress will be erased. This cannot be undone!', 'Reset Everything');
    if (!ok) return;
    const ok2 = await UI.confirm('Are you really sure?', 'Your plants, coins, rooms — everything goes.', 'Yes, Reset');
    if (!ok2) return;
    Save.wipe();
    location.reload();
  }
};

/* Share-your-Solarium: real Web Share API / clipboard. Reward once per day. */
const Share = {
  async share(){
    Audio.unlock(); Audio.sfx('click');
    const today = Daily.dayStr();
    if (S.save.share.lastShare === today){
      UI.toast('You already shared today — come back tomorrow for another gift!');
      return;
    }
    const filled = S.save.solarium.filter(Boolean).length;
    const text = `🌿 My Bloomverse Solarium has ${filled} magical plants earning Dewdrops while I sleep! Come grow with me.`;
    let shared = false;
    if (navigator.share){
      try { await navigator.share({ title: 'Bloomverse', text, url: location.href }); shared = true; }
      catch(e){ /* user cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(text + ' ' + location.href); UI.toast('Solarium description copied — paste it anywhere!'); shared = true; }
      catch(e){ UI.toast('Sharing is not available on this device.'); }
    }
    if (shared){
      S.save.share.lastShare = today;
      S.addDew(1000);
      S.addSeeds(1);
      Audio.sfx('fanfare');
      UI.banner('🌿 Solarium shared!<br><span style="font-size:15px">+1000 Dewdrops · +1 Mystery Seed</span>');
      Save.write(S.save);
    }
  }
};

/* Greenhouse stats modal */
const Haven = {
  stats(){
    Audio.sfx('click');
    const st = S.save.stats;
    const mins = Math.floor(st.playtimeSec / 60);
    const m = UI.modal(`<h2>Greenhouse Stats</h2>
      <div class="stat-grid">
        <div class="stat-cell"><div class="sv">${st.sprouts}</div><div class="sl">plants sprouted</div></div>
        <div class="stat-cell"><div class="sv">${st.merges}</div><div class="sl">merges</div></div>
        <div class="stat-cell"><div class="sv">${st.orders}</div><div class="sl">orders filled</div></div>
        <div class="stat-cell"><div class="sv">${S.save.bestStreak}</div><div class="sl">best streak</div></div>
        <div class="stat-cell"><div class="sv">${st.maxTier}</div><div class="sl">highest tier</div></div>
        <div class="stat-cell"><div class="sv">${S.codexPct()}%</div><div class="sl">codex found</div></div>
        <div class="stat-cell"><div class="sv">${UI.fmt(st.lifetimeCoins)}</div><div class="sl">coins earned</div></div>
        <div class="stat-cell"><div class="sv">${mins}m</div><div class="sl">time gardening</div></div>
      </div>
      <button class="btn" id="stats-ok">Close</button>`);
    m.querySelector('#stats-ok').onclick = () => UI.closeModal();
  }
};
