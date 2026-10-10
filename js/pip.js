/* BLOOMVERSE V2 — Pip, the garden-sprite companion. Dialogue, moods, idle chatter. */
const Pip = {
  hideTimer: 0,
  idleTimer: 0,

  init(){
    const el = document.createElement('div');
    el.id = 'pip';
    el.innerHTML = `<div id="pip-bubble"></div><img id="pip-img" src="assets/plants/pip-wave.png" alt="Pip" draggable="false">`;
    document.body.appendChild(el);
    el.addEventListener('click', () => {
      Audio.unlock(); Audio.sfx('bubble');
      this.say(S.data.pip.tap[(Math.random() * S.data.pip.tap.length) | 0], 'wave', 3000);
    });
    this.scheduleIdle();
  },

  art(mood){ return `assets/plants/pip-${mood === 'cheer' ? 'cheer' : 'wave'}.png`; },

  say(text, mood = 'wave', ms = 4000){
    const bub = document.getElementById('pip-bubble');
    const img = document.getElementById('pip-img');
    if (!bub || !img) return;
    img.src = this.art(mood);
    bub.textContent = text;
    bub.classList.add('show');
    clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      bub.classList.remove('show');
      img.src = this.art('wave');
    }, ms);
  },

  line(cat){
    const arr = S.data.pip[cat];
    if (!arr || !arr.length) return '';
    return arr[(Math.random() * arr.length) | 0];
  },

  scheduleIdle(){
    clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      const hour = new Date().getHours();
      const night = hour >= 20 || hour < 6;
      const cat = night && Math.random() < 0.5 ? 'night' : 'idle';
      if (!document.getElementById('modal-root').classList.contains('open')){
        this.say(this.line(cat), 'wave', 4500);
      }
      this.scheduleIdle();
    }, 45000 + Math.random() * 45000);
  }
};
