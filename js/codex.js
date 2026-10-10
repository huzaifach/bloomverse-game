/* BLOOMVERSE — Bloompedia: discovery codex for all 4 families. */
const Codex = {
  refresh(){
    const wrap = document.getElementById('codex-families');
    if (!wrap) return;
    wrap.innerHTML = '';
    document.getElementById('codex-pct').textContent = S.codexPct() + '% discovered';
    for (const f of S.data.families){
      const unlocked = S.isFamilyUnlocked(f.id);
      const sec = document.createElement('div');
      sec.className = 'codex-family';
      sec.innerHTML = `<h3>${f.name}</h3><div class="fam-tag">${unlocked ? f.tagline : '🔒 ' + f.tagline}</div>`;
      const grid = document.createElement('div');
      grid.className = 'codex-grid';
      for (let t = 1; t <= 8; t++){
        const known = unlocked && S.save.codex[f.id] && S.save.codex[f.id][t - 1];
        const tile = document.createElement('div');
        tile.className = 'codex-tile' + (known ? '' : ' locked') + (unlocked ? '' : ' fam-locked');
        const td = S.tierOf(f.id, t);
        tile.innerHTML = unlocked
          ? `<img src="${S.artFor(f.id, t)}" draggable="false"><div class="ct-tier">Tier ${t}</div><div class="ct-name">${known ? td.name : '???'}</div>`
          : `<div style="font-size:28px">🔒</div><div class="ct-tier">Tier ${t}</div><div class="ct-name">???</div>`;
        if (known) tile.addEventListener('click', () => this.detail(f.id, t));
        grid.appendChild(tile);
      }
      sec.appendChild(grid);
      wrap.appendChild(sec);
    }
  },

  detail(fid, t){
    Audio.sfx('click');
    const f = S.family(fid), td = S.tierOf(fid, t);
    const m = UI.modal(`<h2>${td.name}</h2>
      <div class="m-plant"><img src="${S.artFor(fid, t)}"><div>
        <div style="font-weight:800">${f.name} · Tier ${t}/8</div>
        <div style="font-size:13px;color:var(--muted);font-weight:600">${td.desc}</div>
      </div></div>
      <div class="stat-grid">
        <div class="stat-cell"><div class="sv">${UI.fmt(td.sellCoins)}</div><div class="sl">sell value</div></div>
        <div class="stat-cell"><div class="sv">${UI.fmt(td.orderValue)}</div><div class="sl">order value</div></div>
        <div class="stat-cell"><div class="sv">${td.dewPerSec}</div><div class="sl">dew / sec</div></div>
        <div class="stat-cell"><div class="sv">${t < 8 ? '✓' : 'MAX'}</div><div class="sl">${t < 8 ? 'can merge' : 'final form'}</div></div>
      </div>
      <button class="btn" id="cx-ok">Close</button>`);
    m.querySelector('#cx-ok').onclick = () => UI.closeModal();
  }
};
