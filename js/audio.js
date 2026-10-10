/* BLOOMVERSE — zero-asset WebAudio: synth SFX + generative cozy music bed. */
const Audio = {
  ctx: null, master: null, musicBus: null, sfxBus: null,
  soundOn: true, musicOn: true, musicTimer: null, lastPlay: {},

  init(){
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain(); this.master.gain.value = 0.9;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -12; comp.ratio.value = 3; comp.attack.value = 0.003; comp.release.value = 0.15;
      this.master.connect(comp); comp.connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain(); this.sfxBus.gain.value = 0.9; this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain(); this.musicBus.gain.value = 0.35; this.musicBus.connect(this.master);
      // shared noise buffer
      const len = this.ctx.sampleRate * 1;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const ch = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    } catch(e){}
  },

  unlock(){
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state !== 'running'){
      try { this.ctx.resume(); } catch(e){}
    }
  },

  setEnabled(sound, music){
    this.soundOn = sound; this.musicOn = music;
    if (music && this.ctx && this.ctx.state === 'running') this.startMusic();
    else this.stopMusic();
  },

  tone({freq = 880, freq2 = null, type = 'sine', dur = 0.1, vol = 0.15, delay = 0, bus = null}){
    if (!this.ctx || !this.soundOn) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (freq2) o.frequency.exponentialRampToValueAtTime(Math.max(1, freq2), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(bus || this.sfxBus);
    o.start(t0); o.stop(t0 + dur + 0.05);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  },

  noise({from = 400, to = 2400, dur = 0.3, vol = 0.2, delay = 0}){
    if (!this.ctx || !this.soundOn || !this.noiseBuf) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.5;
    f.frequency.setValueAtTime(from, t0);
    f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxBus);
    src.start(t0); src.stop(t0 + dur + 0.05);
    src.onended = () => { src.disconnect(); f.disconnect(); g.disconnect(); };
  },

  gate(name, ms){
    const now = performance.now();
    if (this.lastPlay[name] && now - this.lastPlay[name] < ms) return false;
    this.lastPlay[name] = now; return true;
  },

  sfx(name, opt = {}){
    if (!this.ctx || !this.soundOn) return;
    if (!this.gate(name, 45)) return;
    const j = () => 1 + (Math.random() - 0.5) * 0.12; // pitch jitter ±6%
    switch(name){
      case 'click': this.tone({freq: 1200, type: 'square', dur: 0.03, vol: 0.06}); break;
      case 'sprout': this.tone({freq: 500, freq2: 920, dur: 0.12, vol: 0.14}); break;
      case 'merge': {
        const base = 700 + (opt.tier || 1) * 90;
        this.tone({freq: base, freq2: base * 1.8, dur: 0.12, vol: 0.16});
        this.tone({freq: base * 2, freq2: base * 2.6, dur: 0.1, vol: 0.08, delay: 0.05});
        break;
      }
      case 'coin':
        this.tone({freq: 988 * j(), type: 'square', dur: 0.06, vol: 0.12});
        this.tone({freq: 1319 * j(), type: 'square', dur: 0.09, vol: 0.12, delay: 0.06});
        break;
      case 'success':
        [523, 659, 784, 1047].forEach((f, i) => this.tone({freq: f * j(), type: 'triangle', dur: 0.14, vol: 0.16, delay: i * 0.07}));
        break;
      case 'fanfare':
        [523, 659, 784, 1047].forEach((f, i) => this.tone({freq: f, type: 'triangle', dur: 0.16, vol: 0.2, delay: i * 0.08}));
        [523, 659, 784].forEach(f => this.tone({freq: f, type: 'triangle', dur: 0.8, vol: 0.1, delay: 0.36}));
        break;
      case 'error': this.tone({freq: 220, freq2: 130, type: 'sawtooth', dur: 0.16, vol: 0.1}); break;
      case 'bubble': this.tone({freq: 600 * j(), freq2: 1250, dur: 0.09, vol: 0.14}); break;
      case 'unlock':
        [660, 880, 1100, 1320].forEach((f, i) => this.tone({freq: f, type: 'square', dur: 0.09, vol: 0.1, delay: i * 0.05}));
        break;
      case 'drop': this.tone({freq: 700, freq2: 320, dur: 0.1, vol: 0.1}); break;
      case 'whoosh': this.noise({from: 400, to: 2400, dur: 0.25, vol: 0.14}); break;
      case 'sparkle': this.tone({freq: 1800 * j(), freq2: 2600, dur: 0.12, vol: 0.07}); break;
    }
  },

  /* ----- generative cozy music: soft pentatonic, fixed motifs, gains only ----- */
  startMusic(){
    if (!this.ctx || this.musicTimer || !this.musicOn) return;
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33]; // C major pentatonic-ish
    const motifs = [[0, 2, 4, 2], [4, 5, 4, 2], [2, 0, 2, 4], [5, 4, 2, 0]];
    let step = 0;
    const tick = () => {
      if (!this.musicOn || !this.ctx) return;
      const motif = motifs[Math.floor(step / 8) % motifs.length];
      const note = scale[motif[step % 4]];
      const t0 = this.ctx.currentTime;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'triangle'; o.frequency.value = note * (step % 16 >= 8 ? 0.5 : 1);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
      o.connect(g); g.connect(this.musicBus);
      o.start(t0); o.stop(t0 + 2.4);
      o.onended = () => { o.disconnect(); g.disconnect(); };
      if (step % 16 === 0){ // soft root pad
        const o2 = this.ctx.createOscillator(), g2 = this.ctx.createGain();
        o2.type = 'sine'; o2.frequency.value = 130.81;
        g2.gain.setValueAtTime(0.0001, t0);
        g2.gain.exponentialRampToValueAtTime(0.04, t0 + 1);
        g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 7);
        o2.connect(g2); g2.connect(this.musicBus);
        o2.start(t0); o2.stop(t0 + 7.2);
        o2.onended = () => { o2.disconnect(); g2.disconnect(); };
      }
      step++;
    };
    tick();
    this.musicTimer = setInterval(tick, 2100);
  },

  stopMusic(){
    if (this.musicTimer){ clearInterval(this.musicTimer); this.musicTimer = null; }
  }
};
