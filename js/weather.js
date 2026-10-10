/* BLOOMVERSE V4 — Weather: every day brings a different sky. */
const Weather = {
  KINDS: {
    sunny:  { ico: '☀️', name: 'Sunny',  desc: '+25% coins from sales & orders' },
    rainy:  { ico: '🌧️', name: 'Rainy',  desc: '+40% Dewdrops' },
    windy:  { ico: '💨', name: 'Windy',  desc: '+50% happiness gains' },
    stormy: { ico: '⛈️', name: 'Stormy', desc: '2× weeds, 2× golden chance' },
  },

  today(){ return new Date().toISOString().slice(0, 10); },

  current(){
    const w = S.save.weather || {};
    if (w.date !== this.today()){
      const kinds = Object.keys(this.KINDS);
      let h = 0;
      for (const ch of this.today()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      w.date = this.today();
      w.kind = kinds[h % kinds.length];
      S.save.weather = w;
      S.save.stats.weathers = S.save.stats.weathers || {};
      S.save.stats.weathers[w.kind] = 1;
      Save.write(S.save);
      setTimeout(() => {
        const k = this.KINDS[w.kind];
        UI.toast(`${k.ico} Today's weather: ${k.name} — ${k.desc}`, 4000);
        Pip.say(`Today is ${k.name.toLowerCase()}! ${k.desc}`, 'wave', 4000);
      }, 4000);
    }
    return w.kind || 'sunny';
  },

  coinMult(){ return this.current() === 'sunny' ? 1.25 : 1; },
  dewMult(){ return this.current() === 'rainy' ? 1.4 : 1; },
  hapMult(){ return this.current() === 'windy' ? 1.5 : 1; },
  goldenMult(){ return this.current() === 'stormy' ? 2 : 1; },
  weedMult(){ return this.current() === 'stormy' ? 2 : 1; },

  pillHTML(){
    const k = this.KINDS[this.current()];
    return `<span class="weather-pill" title="${k.desc}">${k.ico} ${k.name}</span>`;
  }
};
