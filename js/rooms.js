/* BLOOMVERSE — greenhouse wings (rooms): renown unlocks with real effects. */
const Rooms = {
  ICONS: { 'potting-shed': '🪴', 'fern-conservatory': '🌿', 'crystal-cave': '💎', 'astral-solarium': '🌌' },

  render(){
    const list = document.getElementById('room-list');
    if (!list) return;
    list.innerHTML = '';
    for (const r of S.data.rooms){
      const owned = S.hasRoom(r.id);
      const afford = S.save.renown >= r.renownCost;
      const card = document.createElement('div');
      card.className = 'card room-card' + (owned ? ' owned' : '');
      card.innerHTML = `<div class="r-ico">${this.ICONS[r.id] || '🏡'}</div><div class="r-body">
        <div class="r-name">${r.name}</div>
        <div class="r-desc">${r.flavor}<br><b>${r.desc}</b></div></div>`;
      if (owned){
        const tag = document.createElement('div');
        tag.className = 'owned-tag'; tag.textContent = '✓ Unlocked';
        card.appendChild(tag);
      } else {
        const btn = document.createElement('button');
        btn.className = 'btn btn-small';
        btn.textContent = afford ? `Unlock · ⭐${r.renownCost}` : `⭐ ${S.save.renown}/${r.renownCost}`;
        btn.disabled = !afford;
        if (afford) btn.addEventListener('click', () => this.unlock(r.id));
        card.appendChild(btn);
      }
      list.appendChild(card);
    }
  },

  unlock(id){
    const r = S.room(id);
    if (S.hasRoom(id) || S.save.renown < r.renownCost) return;
    S.save.renown -= r.renownCost;
    S.save.rooms.push(id);
    Audio.sfx('fanfare');
    UI.banner(`🏡 ${r.name} unlocked!`);
    UI.toast(r.desc);
    if (id === 'astral-solarium'){
      UI.toast('✨ Astral Flora seeds are now available!', 3500);
      Board.renderPackets();
      Codex.refresh();
    }
    this.render();
    UI.refreshHUD();
    Solarium.render();
    Save.write(S.save);
  },

  checkUnlocks(){
    // gentle nudge when a new room becomes affordable (once per room)
    S.save.notifiedRooms = S.save.notifiedRooms || [];
    for (const r of S.data.rooms){
      if (!S.hasRoom(r.id) && S.save.renown >= r.renownCost && !S.save.notifiedRooms.includes(r.id)){
        S.save.notifiedRooms.push(r.id);
        Audio.sfx('unlock');
        UI.banner(`🏡 You can unlock: ${r.name}!`);
        Save.write(S.save);
      }
    }
  }
};
