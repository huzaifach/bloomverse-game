/* BLOOMVERSE — daily login rewards, 7-day streak cycle. */
const Daily = {
  dayStr(d = new Date()){
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  },

  check(){
    const today = this.dayStr();
    const dl = S.save.daily;
    if (dl.lastClaim === today) return; // already claimed
    const y = new Date(); y.setDate(y.getDate() - 1);
    dl.streak = (dl.lastClaim === this.dayStr(y)) ? dl.streak + 1 : 1;
    const dayIx = (dl.streak - 1) % 7;
    const reward = S.data.daily.cycle[dayIx];
    dl.lastClaim = today;
    if (reward.reward.coins) S.addCoins(reward.reward.coins);
    if (reward.reward.dewdrops) S.addDew(reward.reward.dewdrops);
    if (reward.reward.seeds) S.addSeeds(reward.reward.seeds);
    Audio.sfx('fanfare');
    const cells = S.data.daily.cycle.map((c, i) => {
      const cls = i === dayIx ? 'today' : (i < dayIx && dl.streak > 7 ? '' : '');
      return `<div class="daily-cell ${i === dayIx ? 'today' : ''}"><div>Day ${c.day}</div><div>${c.label}</div></div>`;
    }).join('');
    const m = UI.modal(`<h2>Daily Reward 🌱</h2>
      <p style="text-align:center;font-weight:700">Day ${dl.streak} streak — welcome back, gardener!</p>
      <div class="daily-grid">${cells}</div>
      <div class="reward-big">You received: ${reward.label}!</div>
      <button class="btn" id="daily-ok">Lovely!</button>`, false);
    m.querySelector('#daily-ok').onclick = () => UI.closeModal();
    Save.write(S.save);
  },

  openManual(){
    // "Daily Reward" button in Haven: shows status / next reward
    Audio.sfx('click');
    const today = this.dayStr();
    const dl = S.save.daily;
    const nextIx = dl.lastClaim === today ? (dl.streak % 7) : ((dl.streak) % 7);
    const next = S.data.daily.cycle[dl.lastClaim === today ? nextIx : (dl.streak % 7)];
    const m = UI.modal(`<h2>Daily Rewards</h2>
      <p style="text-align:center;font-weight:700">${dl.lastClaim === today
        ? `Today's reward claimed! Come back tomorrow for Day ${(dl.streak % 7) + 1}: <b>${S.data.daily.cycle[dl.streak % 7].label}</b>.`
        : `Your next reward: <b>${next.label}</b> (Day ${(dl.streak % 7) + 1}).`}
        <br>Current streak: <b>${dl.streak} day${dl.streak === 1 ? '' : 's'}</b></p>
      <button class="btn" id="dm-ok">Close</button>`);
    m.querySelector('#dm-ok').onclick = () => UI.closeModal();
  }
};
